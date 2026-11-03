import hashlib
import hmac
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from src.core.config import settings
from src.core.pakasir import (
    STATUS_CANCELED,
    STATUS_COMPLETED,
    PakasirError,
    PakasirUncertainError,
    canonical_status,
    get_pakasir_client,
)
from src.models.ppdb import (
    PPDBApplicant,
    PPDBPaymentTransaction,
)
from src.repositories.payment_repository import PaymentRepository
from src.repositories.ppdb_scope import get_active_period_info

logger = logging.getLogger("ptdarrahman.payment")
WIB = ZoneInfo("Asia/Jakarta")

# Status transaksi lokal yang masih "terbuka" dan memblokir transaksi baru
# sampai statusnya dipastikan ke provider.
OPEN_TRANSACTION_STATUSES = ("pending", "pending_verification")
PENDING_VERIFICATION = "pending_verification"


def create_secure_doc_token(doc_type: str, entity_id: str, exp_hours: int = 168) -> str:
    """Create a tamper-proof HMAC token for secure document / receipt access."""
    secret = (settings.jwt_secret or "secret-key-fallback").encode("utf-8")
    exp = int(time.time()) + (exp_hours * 3600)
    data = f"{doc_type}:{entity_id}:{exp}"
    signature = hmac.new(secret, data.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{data}:{signature}"


def verify_secure_doc_token(token: str, expected_doc_type: str | None = None) -> str:
    """Verify HMAC token and return entity_id.

    Raises HTTPException(403) if invalid or expired.
    """
    parts = token.split(":")
    if len(parts) != 4:
        raise HTTPException(status_code=403, detail="Tautan dokumen tidak valid")
    doc_type, entity_id, exp_str, signature = parts
    try:
        exp = int(exp_str)
    except ValueError:
        raise HTTPException(status_code=403, detail="Tautan dokumen tidak valid")
    if time.time() > exp:
        raise HTTPException(status_code=403, detail="Tautan dokumen telah kedaluwarsa")
    if expected_doc_type and doc_type != expected_doc_type:
        raise HTTPException(status_code=403, detail="Tipe dokumen tidak sesuai")
    secret = (settings.jwt_secret or "secret-key-fallback").encode("utf-8")
    data = f"{doc_type}:{entity_id}:{exp}"
    expected_sig = hmac.new(secret, data.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, signature):
        raise HTTPException(status_code=403, detail="Tanda tangan tautan tidak sah")
    return entity_id


class PaymentService:
    def __init__(self, repo: PaymentRepository):
        self.repo = repo

    def get_transactions(self, page: int, per_page: int, status: str | None) -> dict:
        offset = (page - 1) * per_page
        # Scope halaman operasional admin = seluruh gelombang dalam periode aktif.
        active_period = get_active_period_info(self.repo.db)
        if not active_period:
            return {
                "data": [],
                "total": 0,
                "period_revenue": 0,
                "wave_revenue": 0,
                "active_wave": None,
                "active_period": None,
            }

        data, total = self.repo.get_transactions(
            active_period["id"], status, per_page, offset
        )
        active_wave = self.repo.get_active_wave_info()
        active_wave_id = active_wave["id"] if active_wave else None
        period_revenue, wave_revenue = self.repo.get_period_and_wave_revenue(
            active_period["id"], active_wave_id
        )

        return {
            "data": data,
            "total": total,
            "period_revenue": period_revenue,
            "wave_revenue": wave_revenue,
            "active_wave": active_wave,
            "active_period": active_period,
        }

    def calculate_applicant_financials(
        self, applicant_id: str, exclude_tx_id: str | None = None
    ) -> dict:
        applicant = self.repo.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        return {
            "applicant_id": applicant.id,
            "total_obligation": 0,
            "minimum_dp": 0,
            "dp_amount": 0,
            "dp_paid": True,
            "dp_paid_at": None,
            "dp_amount_paid": 0,
            "successful_installments_count": 0,
            "installment_total_paid": 0,
            "total_paid": 0,
            "remaining_balance": 0,
            "is_lunas": True,
            "fee_breakdown": [],
        }

    def _format_transaction_response(
        self, tx: PPDBPaymentTransaction, applicant: PPDBApplicant | None = None
    ) -> dict:
        now_wib = datetime.now(WIB)
        expires_in_sec = 0
        if tx.expired_at:
            exp_dt = (
                tx.expired_at
                if tx.expired_at.tzinfo
                else tx.expired_at.replace(tzinfo=WIB)
            )
            expires_in_sec = max(0, int((exp_dt - now_wib).total_seconds()))

        receipt_token = None
        if tx.status in ("success", "paid"):
            receipt_token = create_secure_doc_token("receipt", tx.id, exp_hours=720)

        return {
            "id": tx.id,
            "order_id": tx.order_id,
            "txn_id": tx.txn_id,
            "payment_type": tx.payment_type or "form",
            "installment_number": tx.installment_number,
            "amount": int(tx.amount) if tx.amount is not None else 0,
            "status": tx.status,
            "provider_status": tx.provider_status,
            "method": tx.method,
            "qr_string": tx.qr_string,
            "expired_at": tx.expired_at.isoformat() if tx.expired_at else None,
            "paid_at": tx.paid_at.isoformat() if tx.paid_at else None,
            "expires_in_seconds": expires_in_sec,
            "receipt_number": tx.receipt_number,
            "receipt_token": receipt_token,
            "receipt_url": (
                f"{settings.ppdb_frontend_url}/receipt/{tx.id}?token={receipt_token}"
                if receipt_token
                else None
            ),
            "financial_snapshot": {
                "total_obligation": 0,
                "total_paid_before": 0,
                "remaining_before": 0,
                "total_paid_after": tx.amount or 0,
                "remaining_after": 0,
                "is_lunas": True,
            },
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
        }

    @staticmethod
    def _parse_expired_at(raw: str | None) -> datetime | None:
        """Parse expired_at provider (ISO8601 atau 'YYYY-MM-DD HH:MM:SS')."""
        if not raw:
            return None
        try:
            if "T" in raw:
                dt = datetime.fromisoformat(raw)
            else:
                dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=WIB)
        return dt

    def _save_pending_verification(
        self,
        applicant: PPDBApplicant,
        order_id: str,
        payment_type: str,
        amount: int,
        txn_id: str | None,
        reason: str,
    ) -> PPDBPaymentTransaction:
        """Simpan transaksi berstatus ``pending_verification``.

        Dipakai ketika respons create-transaction tidak pasti/tidak lengkap.
        Status ini memblokir transaksi baru (mencegah dobel bayar) dan menjadi
        penanda agar dapat direkonsiliasi tanpa menganggapnya gagal/expired.
        """
        now_wib = datetime.now(WIB)
        tx = PPDBPaymentTransaction(
            id=str(uuid.uuid4()),
            applicant_id=applicant.id,
            wave_id=applicant.wave_id,
            order_id=order_id,
            txn_id=txn_id,
            payment_type=payment_type,
            amount=amount,
            status=PENDING_VERIFICATION,
            provider_status="unknown",
            method="qris_pakasir",
            qr_string=None,
            expired_at=now_wib + timedelta(minutes=15),
            notes=f"[REKONSILIASI] {reason}",
            created_at=now_wib,
            updated_at=now_wib,
        )
        self.repo.save_transaction(tx)
        return tx

    def _apply_provider_status(self, tx: PPDBPaymentTransaction, result) -> str:
        """Terapkan status provider terverifikasi ke transaksi lokal."""
        tx.provider_status = result.provider_status
        if result.status == "completed":
            self._settle_successful_transaction(tx, gateway_payload=result.raw)
            return str(tx.status)
        if result.status == "canceled":
            tx.status = "cancelled"
            tx.updated_at = datetime.now(WIB)
            self.repo.update_transaction(tx)
            return str(tx.status)
        # pending / unknown → pertahankan status lokal apa adanya (jangan
        # mengubah menjadi expired hanya karena countdown lokal berakhir).
        self.repo.update_transaction(tx)
        return str(tx.status)

    def _reconcile_transaction(
        self, tx: PPDBPaymentTransaction, applicant: PPDBApplicant | None = None
    ) -> str:
        """Sinkronkan transaksi lokal terbuka dengan status provider.

        Tidak melempar untuk hasil yang tidak pasti: status lokal dipertahankan
        agar pembayaran yang sudah masuk tidak salah ditandai gagal/expired.
        Mengembalikan status lokal hasil rekonsiliasi.
        """
        if tx.status in ("success", "paid", "cancelled", "failed", "expired"):
            return str(tx.status)

        pakasir = get_pakasir_client()
        try:
            if tx.txn_id:
                result = pakasir.get_transaction_status(tx.txn_id)
                return self._apply_provider_status(tx, result)
            # txn_id belum ada → pulihkan lewat create idempotent. Pakasir v2
            # bersifat find-or-create: (slug, order_id) sama → transaksi sama.
            if tx.order_id and tx.amount:
                created = pakasir.create_transaction(
                    order_id=tx.order_id, amount=int(tx.amount)
                )
                tx.txn_id = created.txn_id
                if created.qr_string:
                    tx.qr_string = created.qr_string
                parsed = self._parse_expired_at(created.expired_at)
                if parsed:
                    tx.expired_at = parsed
                tx.status = "pending"
                tx.provider_status = "pending"
                self.repo.update_transaction(tx)
                return str(tx.status)
        except PakasirUncertainError as exc:
            logger.warning(
                "Rekonsiliasi tx %s belum pasti (status dipertahankan): %s",
                tx.id,
                exc.message,
            )
            return str(tx.status)
        except PakasirError as exc:
            logger.warning("Rekonsiliasi tx %s gagal: %s", tx.id, exc.message)
            return str(tx.status)
        return str(tx.status)

    def get_my_transaction(self, user_id: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant record not found")

        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        app_dict = {
            "id": applicant.id,
            "wave_id": applicant.wave_id,
            "user_id": applicant.user_id,
            "full_name": applicant.full_name,
            "email": applicant.email,
            "phone": applicant.phone,
            "registration_number": applicant.registration_number
            or applicant.id[:8].upper(),
            "birth_place": applicant.birth_place,
            "birth_date": applicant.birth_date,
            "gender": applicant.gender,
            "nisn": applicant.nisn,
            "nik": applicant.nik,
            "parent_name": applicant.parent_name,
            "previous_school": applicant.previous_school,
            "province": applicant.province,
            "city": applicant.city,
            "district": applicant.district,
            "village": applicant.village,
            "postal_code": applicant.postal_code,
            "address": applicant.address,
            "status": applicant.status,
            "payment_status": applicant.payment_status,
            "payment_deadline": applicant.payment_deadline,
            "rejection_reason": applicant.rejection_reason,
            "is_loa_signed": applicant.is_loa_signed,
            "loa_signed_at": (
                applicant.loa_signed_at.isoformat() if applicant.loa_signed_at else None
            ),
            "dp_status": "paid",
            "dp_paid_at": None,
            "wave_name": wave.name if wave else None,
            "wave_registration_end_date": (
                wave.registration_end_date.strftime("%Y-%m-%d")
                if wave and wave.registration_end_date
                else None
            ),
            "wave_quota": wave.quota if wave else 0,
            "created_at": applicant.created_at,
        }

        form_tx = self.repo.get_latest_transaction_by_applicant_id(applicant.id)
        tx_dict = (
            self._format_transaction_response(form_tx, applicant) if form_tx else None
        )

        active_tx = self.repo.get_active_transaction(applicant.id)
        active_dict = (
            self._format_transaction_response(active_tx, applicant)
            if active_tx
            else None
        )

        financials = self.calculate_applicant_financials(applicant.id)
        all_txs = self.repo.get_applicant_transactions(applicant.id)
        recent_txs = [self._format_transaction_response(t, applicant) for t in all_txs]

        return {
            "applicant": app_dict,
            "transaction": tx_dict,
            "active_transaction": active_dict,
            "financials": financials,
            "recent_transactions": recent_txs,
        }

    def get_receipt(
        self,
        transaction_id: str,
        token: str | None = None,
        user_id: str | None = None,
    ) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(transaction_id)
        if not tx:
            raise HTTPException(
                status_code=404, detail="Kuitansi pembayaran tidak ditemukan"
            )

        if token:
            verified_id = verify_secure_doc_token(token, "receipt")
            if verified_id != tx.id:
                raise HTTPException(
                    status_code=403, detail="Tanda tangan tautan kuitansi tidak sesuai"
                )
        elif user_id:
            pass
        else:
            raise HTTPException(
                status_code=401,
                detail="Diperlukan autentikasi atau tautan kuitansi yang sah",
            )

        if tx.status not in ("paid", "settlement", "success"):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Kuitansi resmi hanya tersedia untuk transaksi yang "
                    "sudah terverifikasi sukses."
                ),
            )

        applicant = (
            self.repo.get_applicant_by_id(tx.applicant_id) if tx.applicant_id else None
        )
        wave = (
            self.repo.get_wave_by_id(applicant.wave_id)
            if (applicant and applicant.wave_id)
            else None
        )

        dt = tx.paid_at or tx.confirmed_at or tx.updated_at or tx.created_at
        receipt_no = (
            tx.receipt_number or f"KUI-PPDB-{tx.id.replace('-', '')[:12].upper()}"
        )

        payment_type_label = "Biaya Formulir Pendaftaran"

        return {
            "id": tx.id,
            "receipt_no": receipt_no,
            "order_id": tx.order_id,
            "txn_id": tx.txn_id,
            "payment_type": tx.payment_type or "form",
            "payment_type_label": payment_type_label,
            "installment_number": tx.installment_number,
            "applicant_name": applicant.full_name if applicant else "Calon Santri",
            "registration_number": (
                (applicant.registration_number or applicant.id[:8].upper())
                if applicant
                else ""
            ),
            "wave_name": wave.name if wave else None,
            "amount": int(tx.amount) if tx.amount is not None else 0,
            "payment_method": (tx.method or "QRIS").upper(),
            "payment_date": dt.isoformat() if dt else None,
            "status": tx.status,
            "is_paid": True,
            "financial_snapshot": {
                "total_obligation": 0,
                "total_paid_before": 0,
                "remaining_before": 0,
                "amount_paid": tx.amount,
                "total_paid_after": tx.amount,
                "remaining_after": 0,
                "is_lunas": True,
            },
            "secure_token": create_secure_doc_token("receipt", tx.id, exp_hours=720),
        }

    def get_public_receipt(self, id: str) -> dict:
        tx = self.repo.get_transaction_by_id(id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(id)
        if not tx:
            tx = self.repo.get_latest_transaction_by_applicant_id(id)

        if not tx:
            raise HTTPException(
                status_code=404, detail="Kuitansi pembayaran tidak ditemukan"
            )

        if tx.status not in ("paid", "settlement", "success"):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Kuitansi resmi hanya tersedia untuk transaksi yang "
                    "sudah terverifikasi sukses."
                ),
            )

        token = create_secure_doc_token("receipt", tx.id, exp_hours=720)
        return self.get_receipt(transaction_id=tx.id, token=token)

    def create_qris_transaction(
        self, user_id: str, payment_type: str = "form", amount: int | None = None
    ) -> dict:
        if payment_type != "form":
            raise HTTPException(
                status_code=400,
                detail="Hanya pembayaran formulir ('form') yang didukung.",
            )

        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftar tidak ditemukan"
            )

        # 1. Periksa transaksi terbuka (pending / pending_verification).
        active_tx = self.repo.get_active_transaction(applicant.id)
        if active_tx:
            self._reconcile_transaction(active_tx, applicant)
            if active_tx.status in ("success", "paid"):
                return self._format_transaction_response(active_tx, applicant)
            if active_tx.status in OPEN_TRANSACTION_STATUSES:
                # Transaksi terbuka hanya valid dipakai ulang jika SUDAH
                # memiliki order_id dan qr_string dari gateway
                if (
                    (active_tx.payment_type or "form") == "form"
                    and active_tx.order_id
                    and active_tx.qr_string
                    and (amount is None or active_tx.amount == amount)
                ):
                    return self._format_transaction_response(active_tx, applicant)
                if active_tx.order_id:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Anda memiliki transaksi QRIS yang belum terverifikasi. "
                            "Silakan selesaikan atau batalkan transaksi tersebut "
                            "terlebih dahulu sebelum membuat pembayaran baru."
                        ),
                    )

        # 2. Validasi aturan bisnis biaya formulir
        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        period = (
            self.repo.get_period_by_id(wave.period_id)
            if wave and wave.period_id
            else None
        )

        if applicant.payment_status == "paid":
            raise HTTPException(
                status_code=400, detail="Biaya formulir pendaftaran sudah lunas."
            )
        if wave and wave.quota > 0:
            paid_count = self.repo.count_paid_form_payments_in_wave(wave.id)
            if paid_count >= wave.quota:
                self.close_wave_and_cancel_pending_invoices(
                    wave.id, reason="kuota penuh"
                )
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Pendaftaran ditutup: Kuota gelombang ini telah terpenuhi."
                    ),
                )
        final_amount = int(
            period.form_fee if (period and period.form_fee is not None) else 250000
        )

        # 3. Generate unique internal order_id
        prefix = "PPDB-FORM"
        short_app = applicant.id.replace("-", "")[:8].upper()
        unique_suffix = uuid.uuid4().hex[:6].upper()
        order_id = f"{prefix}-{short_app}-{unique_suffix}"

        # 4. Panggil Pakasir API v2 (find-or-create) & normalisasi hasilnya
        pakasir = get_pakasir_client()
        try:
            created = pakasir.create_transaction(order_id=order_id, amount=final_amount)
        except PakasirUncertainError as exc:
            self._save_pending_verification(
                applicant=applicant,
                order_id=order_id,
                payment_type="form",
                amount=final_amount,
                txn_id=None,
                reason=f"Respons gateway tidak pasti: {exc.message}",
            )
            logger.warning(
                "create-transaction hasil tidak pasti (order_id=%s): %s",
                order_id,
                exc.message,
            )
            raise HTTPException(
                status_code=502,
                detail=(
                    "Status pembuatan pembayaran belum dapat dipastikan. "
                    "Transaksi ditandai untuk rekonsiliasi — mohon cek status "
                    "beberapa saat lagi sebelum mengulang."
                ),
            ) from exc
        except PakasirError as exc:
            logger.exception("Gagal membuat transaksi Pakasir: %s", exc.message)
            raise HTTPException(
                status_code=502,
                detail=f"Gagal membuat transaksi ke payment gateway: {exc.message}",
            ) from exc

        # 4b. Field wajib QRIS: txn_id + qr_string.
        if not created.txn_id or not created.qr_string:
            missing = ", ".join(
                name
                for name, value in (
                    ("txn_id", created.txn_id),
                    ("qr_string", created.qr_string),
                )
                if not value
            )
            self._save_pending_verification(
                applicant=applicant,
                order_id=order_id,
                payment_type="form",
                amount=final_amount,
                txn_id=created.txn_id,
                reason=f"Respons gateway tidak lengkap ({missing} kosong)",
            )
            logger.error(
                "Respons create-transaction tidak lengkap untuk order_id=%s: %s",
                order_id,
                missing,
            )
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gateway membalas data pembayaran yang tidak lengkap. "
                    "Transaksi ditandai untuk rekonsiliasi — mohon cek status "
                    "beberapa saat lagi."
                ),
            )

        now_wib = datetime.now(WIB)
        expired_dt = self._parse_expired_at(created.expired_at) or (
            now_wib + timedelta(minutes=15)
        )

        if active_tx and not active_tx.order_id:
            tx = active_tx
            tx.order_id = order_id
            tx.txn_id = created.txn_id
            tx.payment_type = "form"
            tx.amount = final_amount
            tx.status = "pending"
            tx.provider_status = "pending"
            tx.method = "qris_pakasir"
            tx.qr_string = created.qr_string
            tx.expired_at = expired_dt
            tx.updated_at = now_wib
            self.repo.update_transaction(tx)
        else:
            tx = PPDBPaymentTransaction(
                id=str(uuid.uuid4()),
                applicant_id=applicant.id,
                wave_id=applicant.wave_id,
                order_id=order_id,
                txn_id=created.txn_id,
                payment_type="form",
                amount=final_amount,
                status="pending",
                provider_status="pending",
                method="qris_pakasir",
                qr_string=created.qr_string,
                expired_at=expired_dt,
                created_at=now_wib,
                updated_at=now_wib,
            )
            self.repo.save_transaction(tx)
        return self._format_transaction_response(tx, applicant)

    def get_active_transaction(self, user_id: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        active_tx = self.repo.get_active_transaction(applicant.id)
        if not active_tx:
            return {"active_transaction": None}

        return {
            "active_transaction": self._format_transaction_response(
                active_tx, applicant
            )
        }

    def sync_transaction_status(
        self, transaction_id: str, user_id: str | None = None
    ) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

        if user_id:
            applicant = self.repo.get_applicant_by_user_id(user_id)
            if applicant and tx.applicant_id != applicant.id:
                raise HTTPException(status_code=403, detail="Akses ditolak")

        if tx.status in ("success", "paid"):
            return {
                "status": "success",
                "message": "Transaksi sudah terverifikasi sukses",
                "transaction": self._format_transaction_response(tx),
            }

        # Rekonsiliasi ke provider.
        self._reconcile_transaction(tx)

        if tx.status in ("success", "paid"):
            return {
                "status": "success",
                "message": "Pembayaran berhasil diverifikasi",
                "transaction": self._format_transaction_response(tx),
            }
        if tx.status == "cancelled":
            return {
                "status": "cancelled",
                "message": "Transaksi telah dibatalkan di gateway",
                "transaction": self._format_transaction_response(tx),
            }
        if tx.status == "exception":
            return {
                "status": "exception",
                "message": (
                    "Pembayaran diterima setelah tagihan dibatalkan — "
                    "menunggu pemeriksaan admin."
                ),
                "transaction": self._format_transaction_response(tx),
            }

        return {
            "status": tx.status,
            "provider_status": tx.provider_status,
            "message": (
                "Belum dapat memastikan status pembayaran di gateway. "
                "Status dipertahankan untuk pemeriksaan ulang."
            ),
            "transaction": self._format_transaction_response(tx),
        }

    def cancel_transaction(
        self, transaction_id: str, user_id: str | None = None
    ) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

        if user_id:
            applicant = self.repo.get_applicant_by_user_id(user_id)
            if applicant and tx.applicant_id != applicant.id:
                raise HTTPException(status_code=403, detail="Akses ditolak")

        if tx.status in ("success", "paid"):
            raise HTTPException(
                status_code=400,
                detail="Transaksi yang sudah sukses tidak dapat dibatalkan",
            )

        now_wib = datetime.now(WIB)

        if not tx.txn_id:
            tx.status = "cancelled"
            tx.provider_status = "canceled"
            tx.updated_at = now_wib
            self.repo.update_transaction(tx)
            return {"success": True, "message": "Transaksi berhasil dibatalkan."}

        pakasir = get_pakasir_client()
        try:
            result = pakasir.cancel_transaction(tx.txn_id)
        except PakasirUncertainError as exc:
            logger.warning(
                "Pembatalan tx %s tidak pasti, sinkronisasi status: %s",
                tx.id,
                exc.message,
            )
            return self._finalize_cancel_after_reconcile(tx, now_wib)
        except PakasirError as exc:
            logger.warning("Gagal membatalkan transaksi di Pakasir v2: %s", exc.message)
            raise HTTPException(
                status_code=502,
                detail=f"Gagal membatalkan transaksi di gateway: {exc.message}",
            ) from exc

        if not result.confirmed:
            return self._finalize_cancel_after_reconcile(tx, now_wib)

        tx.status = "cancelled"
        tx.provider_status = "canceled"
        tx.updated_at = now_wib
        self.repo.update_transaction(tx)
        return {"success": True, "message": "Transaksi berhasil dibatalkan."}

    def _finalize_cancel_after_reconcile(
        self, tx: PPDBPaymentTransaction, now_wib: datetime
    ) -> dict:
        """Putuskan status lokal setelah pembatalan provider tidak pasti."""
        self._reconcile_transaction(tx)
        if tx.status == "cancelled":
            return {"success": True, "message": "Transaksi berhasil dibatalkan."}
        if tx.status in ("success", "paid"):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Pembatalan tidak dapat dipastikan: pembayaran sudah "
                    "terverifikasi sukses di gateway."
                ),
            )
        tx.provider_status = "cancel_requested"
        tx.updated_at = now_wib
        self.repo.update_transaction(tx)
        return {
            "success": False,
            "status": tx.status,
            "message": (
                "Permintaan pembatalan terkirim, tetapi status gateway belum "
                "dapat dipastikan. Silakan cek kembali beberapa saat lagi."
            ),
        }

    def _settle_successful_transaction(
        self, tx: PPDBPaymentTransaction, gateway_payload: Any = None
    ) -> dict:
        fresh_tx = self.repo.get_transaction_by_id(tx.id)
        if fresh_tx:
            tx = fresh_tx
        if tx.status in ("success", "paid"):
            return {"status": "success", "already_settled": True}

        now_wib = datetime.now(WIB)
        if not tx.applicant_id:
            raise HTTPException(
                status_code=404, detail="Applicant not found for transaction"
            )
        applicant = self.repo.get_applicant_by_id(tx.applicant_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Applicant not found for transaction"
            )

        is_late_or_cancelled = tx.status in ("cancelled", "expired") or (
            applicant is not None and applicant.status in ("expired", "cancelled")
        )
        if is_late_or_cancelled:
            tx.status = "exception"
            tx.provider_status = "completed"
            tx.method = "qris_pakasir"
            tx.confirmed_at = now_wib
            tx.notes = (
                "[PENGECUALIAN ADMIN] Pembayaran formulir sukses terlambat "
                f"diterima setelah tagihan dibatalkan/expired "
                f"({tx.order_id or tx.id})."
            )
            self.repo.update_transaction(tx)
            return {"status": "exception", "message": "Marked as admin exception"}

        # Slot early bird ditentukan sebelum transaksi masuk status success:
        # hitungan slot belum memasukkan transaksi ini, sehingga klaim
        # "X pembayar pertama" mengikuti urutan konfirmasi pembayaran,
        # bukan urutan pendaftaran akun.
        if (tx.payment_type or "form") == "form":
            self._assign_early_bird_slot(applicant)

        tx.status = "success"
        tx.provider_status = "completed"
        tx.paid_at = now_wib
        tx.confirmed_at = now_wib
        tx.receipt_number = f"KUI-PPDB-{tx.id.replace('-', '')[:12].upper()}"
        if gateway_payload:
            tx.gateway_payload = (
                json.dumps(gateway_payload)
                if isinstance(gateway_payload, dict)
                else str(gateway_payload)
            )
        self.repo.update_transaction(tx)

        applicant.payment_status = "paid"
        applicant.status = "document_uploaded_pending"
        self.repo.update_applicant(applicant)

        try:
            from src.core.notif_service import send_notifications

            nominal_fmt = f"Rp {tx.amount:,}".replace(",", ".")
            send_notifications(
                [
                    (
                        "payment_success_formulir",
                        {
                            "nominal_bayar": nominal_fmt,
                            "link_aplikasi": (
                                f"{settings.ppdb_frontend_url}/applicant"
                            ),
                        },
                    ),
                ],
                applicant.user_id,
            )
        except Exception:
            logger.exception(
                "Gagal mengirim notif payment_success_formulir untuk tx %s", tx.id
            )

        self.check_wave_quota_and_close_if_full(applicant.wave_id)
        return {"status": "success", "transaction_id": tx.id}

    def _assign_early_bird_slot(self, applicant: PPDBApplicant) -> bool:
        """Tempatkan pendaftar ke slot diskon "X pendaftar awal" bila tersisa.

        Slot dihitung dari jumlah pembayaran formulir sukses sebelum
        transaksi ini: dipanggil sebelum transaksi berubah menjadi success
        sehingga urutan slot mengikuti konfirmasi pembayaran yang sebenarnya,
        bukan urutan pendaftaran akun.
        """
        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        quota: int = wave.early_discount_quota if wave else 0
        if not wave or quota <= 0:
            return False

        prior_paid: int = self.repo.count_paid_form_payments_in_wave(wave.id)
        eligible: bool = prior_paid < quota
        applicant.early_discount_eligible = eligible
        return eligible

    def get_applicant_transactions(self, applicant_id: str) -> dict:
        applicant = self.repo.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        txs = self.repo.get_applicant_transactions(applicant_id)
        financials = self.calculate_applicant_financials(applicant_id)

        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        formatted_txs = [self._format_transaction_response(t, applicant) for t in txs]
        return {
            "applicant_id": applicant_id,
            "applicant": {
                "id": applicant.id,
                "full_name": applicant.full_name,
                "registration_number": applicant.registration_number,
                "phone": applicant.phone,
                "email": applicant.email,
                "wave_id": applicant.wave_id,
                "wave_name": wave.name if wave else None,
                "is_loa_signed": applicant.is_loa_signed,
                "loa_signed_at": applicant.loa_signed_at.isoformat()
                if applicant.loa_signed_at
                else None,
                "dp_status": "paid",
                "dp_paid_at": None,
                "status": applicant.status,
            },
            "financials": financials,
            "transactions": formatted_txs,
        }

    def check_wave_quota_and_close_if_full(self, wave_id: str | None) -> bool:
        """
        Cek apakah kuota pendaftaran gelombang sudah penuh berdasarkan
        pembayaran formulir sukses.
        Jika kuota tercapai, tutup gelombang dan batalkan tagihan pending.
        """
        if not wave_id:
            return False
        wave = self.repo.get_wave_by_id(wave_id)
        if not wave or wave.quota <= 0:
            return False

        paid_count = self.repo.count_paid_form_payments_in_wave(wave.id)
        if paid_count >= wave.quota:
            self.close_wave_and_cancel_pending_invoices(wave.id, reason="kuota penuh")
            return True
        return False

    def close_wave_and_cancel_pending_invoices(
        self, wave_id: str, reason: str = "kuota_penuh"
    ) -> dict:
        """
        Menutup gelombang dan membatalkan seluruh tagihan formulir pending
        saat kuota tercapai atau tanggal pendaftaran gelombang berakhir.
        """
        from sqlalchemy import select

        from src.core.notif_service import send_notification

        wave = self.repo.get_wave_by_id(wave_id)
        if not wave:
            return {"closed": False, "message": "Gelombang tidak ditemukan"}

        now_wib = datetime.now(WIB)
        wave.status = "inactive"
        wave.updated_at = now_wib
        self.repo.db.add(wave)

        # Cari semua pendaftar berstatus pending_payment di gelombang ini
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.wave_id == wave_id,
            PPDBApplicant.status == "pending_payment",
            PPDBApplicant.payment_status == "pending",
            PPDBApplicant.deleted_at.is_(None),
        )
        pending_applicants = list(self.repo.db.scalars(stmt).all())

        cancelled_count = 0
        for app in pending_applicants:
            # Batalkan transaksi formulir pending
            tx_stmt = select(PPDBPaymentTransaction).where(
                PPDBPaymentTransaction.applicant_id == app.id,
                PPDBPaymentTransaction.status == "pending",
            )
            pending_txs = list(self.repo.db.scalars(tx_stmt).all())
            for tx in pending_txs:
                tx.status = "cancelled"
                tx.failure_reason = f"Gelombang ditutup ({reason})"
                tx.updated_at = now_wib
                self.repo.db.add(tx)

            # Update status pendaftar menjadi expired
            app.status = "expired"
            app.payment_status = "failed"
            app.updated_at = now_wib
            self.repo.db.add(app)
            cancelled_count += 1

        self.repo.db.commit()

        # Kirim notifikasi pembatalan invoice ke setiap pendaftar yang terdampak
        for app in pending_applicants:
            try:
                send_notification(
                    event_key="payment_expired",
                    recipient_user_id=str(app.user_id),
                    context={
                        "nama_gelombang": wave.name,
                        "link_aplikasi": f"{settings.ppdb_frontend_url}/auth/login",
                    },
                )
            except Exception:
                logger.exception(
                    "Gagal mengirim notifikasi payment_expired " "untuk user %s",
                    app.user_id,
                )

        logger.info(
            "Gelombang %s ditutup (%s): %d pendaftar pending dibatalkan",
            wave_id,
            reason,
            cancelled_count,
        )
        return {
            "closed": True,
            "wave_id": wave_id,
            "cancelled_count": cancelled_count,
            "reason": reason,
        }

    def confirm_payment(self, transaction_id: str, admin_user_id: str) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")

        if tx.status == "success":
            raise HTTPException(status_code=400, detail="Transaction already confirmed")

        now_wib = datetime.now(WIB)
        tx.status = "success"
        tx.confirmed_by = admin_user_id
        tx.confirmed_at = now_wib
        self.repo.update_transaction(tx)

        applicant = (
            self.repo.get_applicant_by_id(tx.applicant_id) if tx.applicant_id else None
        )
        if applicant:
            applicant.payment_status = "paid"
            applicant.status = "document_uploaded_pending"
            self.repo.update_applicant(applicant)

            try:
                from src.core.notif_service import send_notifications

                nominal_fmt = f"Rp {tx.amount:,}".replace(",", ".")
                send_notifications(
                    [
                        (
                            "payment_success_formulir",
                            {
                                "nominal_bayar": nominal_fmt,
                                "link_aplikasi": (
                                    f"{settings.ppdb_frontend_url}/applicant"
                                ),
                            },
                        ),
                    ],
                    applicant.user_id,
                )
            except Exception:
                logger.exception(
                    "Failed to send payment_success_formulir notification for tx %s",
                    transaction_id,
                )

            # Evaluasi kuota gelombang: tutup otomatis jika kuota terpenuhi
            self.check_wave_quota_and_close_if_full(applicant.wave_id)

        return {"success": True, "message": "Payment confirmed successfully"}

    def cancel_confirm_payment(self, transaction_id: str) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")

        if tx.status != "success":
            raise HTTPException(
                status_code=400, detail="Only successful transactions can be cancelled"
            )

        if tx.method != "offline":
            raise HTTPException(
                status_code=400,
                detail="Cannot cancel confirmation for online payment transactions",
            )

        tx.status = "pending"
        tx.confirmed_by = None
        tx.confirmed_at = None
        self.repo.update_transaction(tx)

        applicant = (
            self.repo.get_applicant_by_id(tx.applicant_id) if tx.applicant_id else None
        )
        if applicant:
            applicant.payment_status = "pending"
            applicant.status = "pending_payment"
            self.repo.update_applicant(applicant)

        return {
            "success": True,
            "message": "Payment confirmation cancelled successfully",
        }

    def process_pakkasir_webhook(
        self, payload: dict, x_secret: str | None = None
    ) -> dict:
        """
        Webhook 1 Pintu QRIS Pak Kasir v2 untuk verifikasi formulir real-time.
        """
        logger.info("Menerima webhook Pakasir: %s", payload)

        if settings.pakasir_webhook_secret:
            if not x_secret or not hmac.compare_digest(
                x_secret, settings.pakasir_webhook_secret
            ):
                logger.warning(
                    "Webhook Pakasir ditolak: X-Secret tidak valid atau tidak cocok"
                )
                raise HTTPException(
                    status_code=401, detail="Header X-Secret tidak valid"
                )
        elif settings.is_production:
            logger.error(
                "PAKASIR_WEBHOOK_SECRET belum dikonfigurasi — webhook ditolak "
                "di mode production."
            )
            raise HTTPException(
                status_code=503,
                detail="Webhook pembayaran belum dikonfigurasi dengan aman",
            )
        else:
            logger.warning(
                "PAKASIR_WEBHOOK_SECRET kosong — memproses webhook tanpa "
                "validasi secret (hanya non-production)."
            )

        order_id = (
            payload.get("order_id")
            or payload.get("invoice_id")
            or payload.get("external_id")
            or payload.get("id")
        )
        if not order_id:
            order_id = payload.get("transaction_id")
        txn_id = payload.get("txn_id")
        amount = payload.get("amount")
        status = str(
            payload.get("status")
            or payload.get("transaction_status")
            or payload.get("payment_status")
            or ""
        ).lower()

        tx = None
        if order_id:
            tx = (
                self.repo.get_transaction_by_id(str(order_id))
                or self.repo.get_transaction_by_order_id(str(order_id))
                or self.repo.get_transaction_by_external_id(str(order_id))
            )
        if not tx and txn_id:
            tx = self.repo.get_transaction_by_txn_id(str(txn_id))

        if not tx:
            logger.warning(
                "Transaksi Pakasir tidak ditemukan untuk order_id=%s, txn_id=%s",
                order_id,
                txn_id,
            )
            raise HTTPException(
                status_code=404, detail="Transaction not found for this payment"
            )

        if txn_id and tx.txn_id and str(txn_id) != str(tx.txn_id):
            logger.warning(
                "Webhook txn_id tidak cocok untuk tx %s: payload=%s, db=%s",
                tx.id,
                txn_id,
                tx.txn_id,
            )
            raise HTTPException(
                status_code=400,
                detail="txn_id webhook tidak cocok dengan transaksi",
            )
        if order_id:
            allowed_refs = {
                str(ref) for ref in (tx.id, tx.order_id, tx.external_id) if ref
            }
            if allowed_refs and str(order_id) not in allowed_refs:
                logger.warning(
                    "Webhook order_id tidak cocok untuk tx %s: payload=%s",
                    tx.id,
                    order_id,
                )
                raise HTTPException(
                    status_code=400,
                    detail="order_id webhook tidak cocok dengan transaksi",
                )

        if tx.status in ("success", "paid"):
            logger.info("Transaksi %s sudah lunas sebelumnya (idempoten)", tx.id)
            return {
                "success": True,
                "message": "Transaksi sudah tercatat lunas sebelumnya",
                "status": "already_paid",
                "transaction_id": tx.id,
            }

        from src.core.cache import get_redis

        r = get_redis()
        lock_key = f"lock:pakasir_webhook:{tx.id}"
        lock_token = str(uuid.uuid4())
        lock_acquired = False
        if r is not None:
            try:
                lock_acquired = bool(r.set(lock_key, lock_token, nx=True, ex=30))
                if not lock_acquired:
                    logger.info(
                        "Webhook Pakasir untuk tx %s sedang diproses konkuren "
                        "- menunggu",
                        tx.id,
                    )
                    for _ in range(5):
                        time.sleep(0.3)
                        refreshed_tx = self.repo.get_transaction_by_id(tx.id)
                        if refreshed_tx and refreshed_tx.status in ("success", "paid"):
                            return {
                                "success": True,
                                "message": "Transaksi sudah tercatat lunas sebelumnya",
                                "status": "already_paid",
                                "transaction_id": refreshed_tx.id,
                            }
                        if r.set(lock_key, lock_token, nx=True, ex=30):
                            lock_acquired = True
                            break

                    if not lock_acquired:
                        logger.warning(
                            "Webhook Pakasir untuk tx %s ditolak: masih dikunci "
                            "proses lain",
                            tx.id,
                        )
                        raise HTTPException(
                            status_code=409,
                            detail="Transaksi sedang diproses secara bersamaan.",
                        )
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("Gagal acquire Redis lock: %s", exc)

        try:
            fresh_tx = self.repo.get_transaction_by_id(tx.id)
            if fresh_tx:
                tx = fresh_tx
                if tx.status in ("success", "paid"):
                    return {
                        "success": True,
                        "message": "Transaksi sudah tercatat lunas sebelumnya",
                        "status": "already_paid",
                        "transaction_id": tx.id,
                    }

            if amount is not None:
                try:
                    amt_int = int(amount)
                    if amt_int != tx.amount:
                        logger.warning(
                            "Webhook nominal tidak cocok untuk tx %s: "
                            "DB=%s, Payload=%s",
                            tx.id,
                            tx.amount,
                            amt_int,
                        )
                        tx.notes = (
                            "[ANOMALI WEBHOOK] Nominal tidak cocok: "
                            f"DB={tx.amount}, Payload={amt_int}"
                        )
                        self.repo.update_transaction(tx)
                        raise HTTPException(
                            status_code=400,
                            detail="Nominal webhook tidak cocok dengan tagihan",
                        )
                except (ValueError, TypeError):
                    pass

            now_wib = datetime.now(WIB)
            provider_state = canonical_status(status)
            is_success = provider_state == STATUS_COMPLETED
            is_failed = provider_state == STATUS_CANCELED

            if is_success:
                res = self._settle_successful_transaction(tx, gateway_payload=payload)
                return {
                    "success": True,
                    "message": "Pembayaran berhasil diverifikasi",
                    "status": res.get("status", "success"),
                    "transaction_id": tx.id,
                }
            elif is_failed:
                tx.status = (
                    "cancelled"
                    if status in ("canceled", "cancelled", "batal")
                    else "failed"
                )
                tx.provider_status = status
                tx.failure_reason = payload.get("failure_reason") or f"Status: {status}"
                tx.updated_at = now_wib
                self.repo.update_transaction(tx)
                return {"success": True, "status": tx.status, "transaction_id": tx.id}

            return {
                "success": True,
                "message": f"Webhook diterima dengan status: {status}",
                "transaction_id": tx.id,
            }
        finally:
            if r is not None and lock_acquired:
                try:
                    release_lua = """
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("del", KEYS[1])
                    else
                        return 0
                    end
                    """
                    r.eval(release_lua, 1, lock_key, lock_token)
                except Exception:
                    pass

    def process_webhook(self, payload: dict, x_secret: str | None = None) -> dict:
        return self.process_pakkasir_webhook(payload, x_secret=x_secret)
