import asyncio
import json
import logging
import os
import random
import string
import uuid
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError

from src.core.notif_service import send_notification, send_notifications
from src.core.security import hash_password
from src.models.auth import User
from src.models.ppdb import (
    PPDBApplicant,
    PPDBPaymentTransaction,
    PPDBPeriod,
    PPDBPeriodFeeItem,
    PPDBWave,
    PPDBWaveFeeDiscount,
)
from src.modules.ppdb.schemas import (
    ApplicantAdminCreate,
    ApplicantAdminUpdate,
    ApplicantProfileUpdate,
    ApplicantRegister,
    PeriodCreate,
    PeriodFeeItemCreate,
    PeriodFeeItemUpdate,
    PeriodUpdate,
    WaveCreate,
    WaveFeeDiscountUpdate,
    WaveUpdate,
)
from src.repositories.ppdb_repository import PPDBRepository
from src.repositories.ppdb_scope import get_active_period, get_active_period_info

WIB = ZoneInfo("Asia/Jakarta")

logger = logging.getLogger("ptdarrahman.ppdb")

# ── Dokumen persyaratan seragam ─────────────────────────────────────────────
# Seluruh pendaftar mengunggah daftar berkas wajib yang sama.
BASE_DOCUMENTS: list[dict[str, Any]] = [
    {
        "name": "NISN",
        "description": "Kartu atau bukti cetak NISN resmi.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Kartu Keluarga (KK)",
        "description": "Bukti susunan keluarga dan NIK.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Akta Kelahiran",
        "description": "Bukti kelahiran calon santri/siswa.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Pas Foto",
        "description": "Pas foto terbaru calon siswa (3x4 atau 4x6).",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "KTP Orang Tua/Wali",
        "description": "KTP orang tua atau wali calon santri.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Rapor Terakhir",
        "description": "Scan/foto rapor terakhir (semester terakhir) dari sekolah "
        "asal.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Surat Keterangan Sehat",
        "description": "Surat keterangan sehat dari dokter/puskesmas.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Surat Berkelakuan Baik",
        "description": "Surat keterangan berkelakuan baik dari sekolah asal.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Sertifikat Penghargaan (jika ada)",
        "description": "Sertifikat prestasi/penghargaan (opsional).",
        "required": False,
        "category": "wajib",
    },
]


def get_document_specs() -> list[dict[str, Any]]:
    """Daftar dokumen persyaratan yang berlaku untuk semua pendaftar."""
    return [dict(d) for d in BASE_DOCUMENTS]


def get_required_documents() -> list[str]:
    """Daftar nama dokumen yang wajib diunggah sebelum submit."""
    return [d["name"] for d in BASE_DOCUMENTS]


def get_all_allowed_documents() -> list[str]:
    """Daftar semua jenis dokumen yang diizinkan untuk diunggah."""
    return [d["name"] for d in BASE_DOCUMENTS]


# Status tempat pendaftar boleh mengunggah/kirim dokumen.
_DOCUMENT_UPLOAD_STATUSES = {"document_uploaded_pending", "document_rejected"}


class PPDBService:
    def __init__(self, repository: PPDBRepository):
        self.repository = repository

    # -------------------------------------------------------------------------
    # Periods
    # -------------------------------------------------------------------------
    def get_periods(self, page: int, per_page: int, search: str) -> dict[str, Any]:
        data, total = self.repository.get_periods_paginated(search, page, per_page)
        return {"data": data, "total": total}

    def get_all_periods(self):
        periods = self.repository.get_all_periods()
        return [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "academic_year": p.academic_year,
            }
            for p in periods
        ]

    def get_period_by_id(self, period_id: str) -> dict[str, Any]:
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Not found")

        waves = self.repository.get_waves_by_period(period_id)

        # map to dict
        p_dict = {c.name: getattr(period, c.name) for c in period.__table__.columns}
        p_dict["waves"] = waves
        return p_dict

    def create_period(self, body: PeriodCreate):
        period = PPDBPeriod(
            id=f"period-{uuid.uuid4()}",
            name=body.name,
            academic_year=body.academic_year,
            description=body.description,
            wa_group_link=body.wa_group_link,
            head_of_committee=body.head_of_committee,
            form_fee=body.form_fee,
            minimum_dp=body.minimum_dp,
            status="inactive",
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.create_period(period)
        return {c.name: getattr(period, c.name) for c in period.__table__.columns}

    def update_period(self, period_id: str, body: PeriodUpdate):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Not found")

        provided = body.model_dump(exclude_unset=True)
        if not provided:
            raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")
        if provided.get("name") is not None:
            period.name = provided["name"]
        if provided.get("academic_year") is not None:
            period.academic_year = provided["academic_year"]
        if "description" in provided:
            period.description = provided["description"]
        if "wa_group_link" in provided:
            period.wa_group_link = provided["wa_group_link"]
        if "head_of_committee" in provided:
            period.head_of_committee = provided["head_of_committee"]
        if "form_fee" in provided and provided["form_fee"] is not None:
            period.form_fee = provided["form_fee"]
        if "minimum_dp" in provided and provided["minimum_dp"] is not None:
            period.minimum_dp = provided["minimum_dp"]
        period.updated_at = datetime.now(WIB)

        self.repository.update_period(period)
        return {c.name: getattr(period, c.name) for c in period.__table__.columns}

    def activate_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        self.repository.activate_period(period_id)
        return {"success": True}

    def deactivate_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        self.repository.deactivate_period(period_id)
        return {"success": True}

    def delete_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if period:
            if self.repository.count_applicants_in_period(period_id) > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Periode memiliki pendaftar dan tidak bisa dihapus",
                )
            self.repository.delete_period(period)
        return {"success": True}

    # -------------------------------------------------------------------------
    # Waves
    # -------------------------------------------------------------------------
    # -------------------------------------------------------------------------
    # Period fee items (Komponen Biaya Master per Periode)
    # -------------------------------------------------------------------------
    def get_period_fee_items(self, period_id: str) -> dict[str, Any]:
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        items = self.repository.get_period_fee_items(period_id)
        return {
            "items": [
                {c.name: getattr(item, c.name) for c in item.__table__.columns}
                for item in items
            ]
        }

    def create_period_fee_item(self, period_id: str, body: PeriodFeeItemCreate):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        item = PPDBPeriodFeeItem(
            id=str(uuid.uuid4()),
            period_id=period_id,
            name=body.name,
            nominal=body.nominal,
            description=body.description,
            order_index=body.order_index,
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.create_period_fee_item(item)
        return {c.name: getattr(item, c.name) for c in item.__table__.columns}

    def update_period_fee_item(
        self, period_id: str, item_id: str, body: PeriodFeeItemUpdate
    ):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        item = self.repository.get_period_fee_item(item_id)
        if not item or item.period_id != period_id:
            raise HTTPException(status_code=404, detail="Item biaya tidak ditemukan")

        provided = body.model_dump(exclude_unset=True)
        if not provided:
            raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")
        for field in ("name", "nominal", "description", "order_index"):
            if field in provided and provided[field] is not None:
                setattr(item, field, provided[field])
        item.updated_at = datetime.now(WIB)
        self.repository.update_period_fee_item(item)
        return {c.name: getattr(item, c.name) for c in item.__table__.columns}

    def delete_period_fee_item(self, period_id: str, item_id: str):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        item = self.repository.get_period_fee_item(item_id)
        if not item or item.period_id != period_id:
            raise HTTPException(status_code=404, detail="Item biaya tidak ditemukan")
        self.repository.delete_period_fee_item(item)
        return {"success": True}

    def get_waves(self, period_id: str | None = None):
        waves = self.repository.get_waves(period_id)
        result = []
        for w in waves:
            item = {c.name: getattr(w, c.name) for c in w.__table__.columns}
            item["filled"] = self.repository.count_paid_form_payments_in_wave(w.id)
            result.append(item)
        return result

    def get_all_waves(self):
        waves = self.repository.get_waves()
        return [
            {c.name: getattr(w, c.name) for c in w.__table__.columns} for w in waves
        ]

    def get_active_wave_public(self) -> dict[str, Any]:
        wave = self.repository.get_active_wave()
        if not wave:
            return {"active": False}

        # `academic_year` & `name` periode lived di tabel induk, jadi wave saja
        # tidak cukup untuk situs publik yang menampilkan "Tahun Ajaran ...".
        period = self.repository.get_period_by_id(wave.period_id)
        today = datetime.now(WIB).date()
        paid_count = self.repository.count_paid_form_payments_in_wave(wave.id)
        has_schedule = bool(wave.registration_start_date and wave.registration_end_date)
        before_open = has_schedule and today < wave.registration_start_date
        after_close = has_schedule and today > wave.registration_end_date
        quota_reached = wave.quota <= 0 or paid_count >= wave.quota
        registration_open = (
            period is not None
            and period.status == "active"
            and has_schedule
            and not before_open
            and not after_close
            and not quota_reached
        )

        return {
            # Public `active` means ready and currently accepting registrations.
            "active": registration_open,
            "registration_open": registration_open,
            "registration_status": (
                "schedule_incomplete"
                if not has_schedule
                else "not_started"
                if before_open
                else "closed"
                if after_close
                else "quota_reached"
                if quota_reached
                else "open"
            ),
            "id": wave.id,
            "name": wave.name,
            "period_id": wave.period_id,
            "period_name": period.name if period else None,
            "academic_year": period.academic_year if period else None,
            "quota": wave.quota,
            "paid_count": paid_count,
            "registration_start_date": wave.registration_start_date,
            "registration_end_date": wave.registration_end_date,
        }

    def get_wave_by_id(self, wave_id: str) -> dict[str, Any]:
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Not found")
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def create_wave(self, body: WaveCreate):
        period = self.repository.get_period_by_id(body.period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        max_num = self.repository.get_max_wave_number(body.period_id)
        wave_number = max_num + 1

        wave = PPDBWave(
            id=f"wave-{uuid.uuid4()}",
            period_id=body.period_id,
            wave_number=wave_number,
            name=body.name,
            registration_start_date=body.registration_start_date,
            registration_end_date=body.registration_end_date,
            quota=body.quota,
            early_discount_quota=body.early_discount_quota,
            status="inactive",
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.create_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def update_wave(self, wave_id: str, body: WaveUpdate):
        from datetime import date as date_type

        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Not found")

        provided = body.model_dump(exclude_unset=True)
        if not provided:
            raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")

        def _as_date(value, fallback):
            if value is None:
                value = fallback
            if isinstance(value, datetime):
                return value.date()
            if isinstance(value, date_type):
                return value
            if value is None:
                return None
            return date_type.fromisoformat(str(value))

        effective = {
            "registration_start_date": _as_date(
                provided.get("registration_start_date"),
                wave.registration_start_date,
            ),
            "registration_end_date": _as_date(
                provided.get("registration_end_date"), wave.registration_end_date
            ),
        }
        if (
            effective["registration_end_date"] is not None
            and effective["registration_start_date"] is not None
            and effective["registration_end_date"]
            < effective["registration_start_date"]
        ):
            raise HTTPException(
                status_code=400,
                detail="Tanggal akhir pendaftaran tidak boleh sebelum tanggal mulai",
            )

        effective_quota = provided.get("quota", wave.quota)
        effective_early_discount_quota = provided.get(
            "early_discount_quota", wave.early_discount_quota or 0
        )
        if effective_early_discount_quota > effective_quota:
            raise HTTPException(
                status_code=400,
                detail="Jumlah diskon pendaftar awal tidak boleh melebihi kuota",
            )

        for field in (
            "name",
            "registration_start_date",
            "registration_end_date",
            "quota",
            "early_discount_quota",
        ):
            if field in provided and provided[field] is not None:
                setattr(wave, field, provided[field])
        wave.updated_at = datetime.now(WIB)

        self.repository.update_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def activate_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Wave not found")

        period = self.repository.get_period_by_id(wave.period_id)
        if not period or period.status != "active":
            raise HTTPException(status_code=400, detail="Periode belum aktif")

        self.repository.activate_wave(wave_id, wave.period_id)
        return {"success": True}

    def deactivate_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        self.repository.deactivate_wave(wave_id)
        return {"success": True}

    def delete_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if wave:
            if self.repository.count_applicants_in_wave(wave_id) > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Gelombang memiliki pendaftar dan tidak bisa dihapus",
                )
            self.repository.delete_wave(wave)
        return {"success": True}

    # -------------------------------------------------------------------------
    # Diskon gelombang atas master komponen biaya periode
    # -------------------------------------------------------------------------
    def get_wave_fee_items(self, wave_id: str) -> dict[str, Any]:
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        period_items = self.repository.get_period_fee_items(wave.period_id)
        if period_items:
            discounts = {
                d.fee_item_id: d
                for d in self.repository.get_wave_fee_discounts(wave_id)
            }
            item_data = []
            for item in period_items:
                d = discounts.get(item.id)
                item_data.append(
                    {
                        "id": item.id,
                        "wave_id": wave_id,
                        "period_id": wave.period_id,
                        "name": item.name,
                        "nominal": int(item.nominal),
                        "description": item.description,
                        "order_index": item.order_index,
                        "discount_type": d.discount_type if d else None,
                        "discount_value": int(d.discount_value)
                        if d and d.discount_value
                        else 0,
                        "early_discount_type": d.early_discount_type if d else None,
                        "early_discount_value": int(d.early_discount_value)
                        if d and d.early_discount_value
                        else 0,
                        "is_period_item": True,
                        "has_bills": False,
                    }
                )
            return {
                "items": item_data,
                "is_period_based": True,
                "period_id": wave.period_id,
                "early_discount_quota": wave.early_discount_quota or 0,
            }
        items = self.repository.get_fee_items_by_wave(wave_id)
        item_data = []
        for item in items:
            serialized = {c.name: getattr(item, c.name) for c in item.__table__.columns}
            serialized["has_bills"] = False
            item_data.append(serialized)
        return {
            "items": item_data,
        }

    def update_wave_fee_discount(
        self, wave_id: str, fee_item_id: str, body: WaveFeeDiscountUpdate
    ) -> dict[str, Any]:
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        if body.early_discount_type and not wave.early_discount_quota:
            raise HTTPException(
                status_code=400,
                detail="Kuota diskon pendaftar awal belum diatur pada gelombang ini",
            )
        period_item = self.repository.get_period_fee_item(fee_item_id)
        if not period_item or period_item.period_id != wave.period_id:
            raise HTTPException(
                status_code=404,
                detail="Komponen biaya periode tidak ditemukan",
            )
        now = datetime.now(WIB)
        discount = self.repository.get_wave_fee_discount(wave_id, fee_item_id)
        if discount is None:
            discount = PPDBWaveFeeDiscount(
                id=str(uuid.uuid4()),
                wave_id=wave_id,
                fee_item_id=fee_item_id,
                created_at=now,
                updated_at=now,
            )
        discount.discount_type = body.discount_type
        discount.discount_value = body.discount_value
        discount.early_discount_type = body.early_discount_type
        discount.early_discount_value = body.early_discount_value
        discount.updated_at = now
        discount = self.repository.save_wave_fee_discount(discount)
        return {c.name: getattr(discount, c.name) for c in discount.__table__.columns}

    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------
    def generate_random_password(self, length: int = 8) -> str:
        return "".join(
            random.choice(string.ascii_letters + string.digits) for _ in range(length)
        )

    def _serialize_health_history(self, body: ApplicantRegister) -> str | None:
        health_form = getattr(body, "health_form", None)
        if health_form is not None:
            return str(json.dumps(health_form.model_dump(), ensure_ascii=False))
        if getattr(body, "disease_history", None):
            return str(body.disease_history)
        items = body.disease_history_items or []
        notes = body.disease_history_notes
        if not items and not notes:
            return None
        parts: list[str] = []
        for item in items:
            text = f"{item.question}: {item.answer}"
            if item.notes:
                text += f" ({item.notes})"
            parts.append(text)
        if notes:
            parts.append(f"Catatan tambahan: {notes}")
        return "; ".join(parts)

    def _serialize_health_history_admin(self, body: Any) -> str | None:
        health_form = getattr(body, "health_form", None)
        if health_form is not None:
            return str(json.dumps(health_form.model_dump(), ensure_ascii=False))
        if getattr(body, "disease_history", None):
            return str(body.disease_history)
        items = getattr(body, "disease_history_items", None) or []
        notes = getattr(body, "disease_history_notes", None)
        if not items and not notes:
            return None
        parts: list[str] = []
        for item in items:
            text = f"{item.question}: {item.answer}"
            if getattr(item, "notes", None):
                text += f" ({item.notes})"
            parts.append(text)
        if notes:
            parts.append(f"Catatan tambahan: {notes}")
        return "; ".join(parts)

    def generate_unique_username(self, full_name: str) -> str:
        base = (
            "".join(c for c in full_name.split(" ")[0].lower() if c.isalnum()) or "user"
        )
        for _ in range(10):
            candidate = (
                f"{base}{''.join(random.choice(string.digits) for _ in range(4))}"
            )
            if not self.repository.get_user_by_username(candidate):
                return candidate
        return f"{base}{uuid.uuid4().hex[:8]}"

    def register_applicant(self, body: ApplicantRegister) -> dict[str, Any]:
        # Formulir Identifikasi Kesehatan (pengganti Medcheck) wajib diisi
        # pendaftar dan divalidasi ulang di server (lihat HealthIdentificationForm).
        if body.health_form is None:
            raise HTTPException(
                status_code=422,
                detail="Formulir Identifikasi Kesehatan wajib diisi sebelum mendaftar.",
            )

        wave = self.repository.get_active_wave()
        if not wave:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran saat ini sedang ditutup atau belum dibuka.",
            )

        period = self.repository.get_period_by_id(wave.period_id)
        if not period or period.status != "active":
            raise HTTPException(
                status_code=400,
                detail="Periode pendaftaran belum aktif.",
            )

        today = datetime.now(WIB).date()
        if not wave.registration_start_date or not wave.registration_end_date:
            raise HTTPException(
                status_code=400,
                detail="Jadwal pendaftaran gelombang belum lengkap.",
            )
        if today < wave.registration_start_date:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran gelombang ini belum dibuka.",
            )
        if today > wave.registration_end_date:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran gelombang ini sudah ditutup.",
            )
        paid_count = self.repository.count_paid_form_payments_in_wave(wave.id)
        if wave.quota <= 0 or paid_count >= wave.quota:
            raise HTTPException(
                status_code=400,
                detail="Kuota pendaftaran gelombang ini sudah penuh.",
            )

        if self.repository.get_applicant_by_email_active(body.email):
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
            )

        if self.repository.get_user_by_email(body.email):
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. "
                "Hubungi panitia jika ingin mendaftar ulang.",
            )

        raw_password = self.generate_random_password()
        username = self.generate_unique_username(body.full_name)
        role_id = self.repository.get_role_id_by_name("Pendaftar")

        now = datetime.now(WIB)
        # Sesuai aturan bisnis PPDB: Batas akhir pembayaran formulir adalah
        # penutupan pendaftaran gelombang
        if wave.registration_end_date:
            payment_deadline = datetime(
                wave.registration_end_date.year,
                wave.registration_end_date.month,
                wave.registration_end_date.day,
                23,
                59,
                59,
            )
        elif wave.end_date:
            payment_deadline = datetime(
                wave.end_date.year,
                wave.end_date.month,
                wave.end_date.day,
                23,
                59,
                59,
            )
        else:
            payment_deadline_wib = datetime.now(ZoneInfo("Asia/Jakarta")) + timedelta(
                days=7
            )
            payment_deadline = payment_deadline_wib.replace(tzinfo=None)

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=hash_password(raw_password),
            email=body.email,
            full_name=body.full_name,
            user_type="applicant",
            role_id=role_id,
            created_at=now,
            updated_at=now,
        )

        applicant = PPDBApplicant(
            id=f"applicant-{uuid.uuid4()}",
            wave_id=wave.id,
            user_id=user.id,
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            address=body.address,
            province=body.province,
            city=body.city,
            district=body.district,
            village=body.village,
            postal_code=body.postal_code,
            gender=body.gender,
            birth_place=body.birth_place,
            birth_date=body.birth_date,
            nisn=body.nisn,
            nik=body.nik,
            parent_name=(
                body.parent_name
                or body.father_name
                or body.guardian_name
                or body.mother_name
            ),
            father_name=body.father_name,
            father_job=body.father_job,
            father_phone=body.father_phone,
            mother_name=body.mother_name,
            mother_job=body.mother_job,
            mother_phone=body.mother_phone,
            guardian_name=body.guardian_name,
            guardian_job=body.guardian_job,
            parent_phone=body.parent_phone or body.father_phone or body.mother_phone,
            parent_income=body.parent_income,
            parent_email=body.parent_email,
            previous_school=body.previous_school,
            graduation_year=body.graduation_year,
            disease_history=self._serialize_health_history(body),
            status="pending_payment",
            payment_status="pending",
            payment_deadline=payment_deadline,
            created_at=now,
            updated_at=now,
        )

        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="qris",
            # Biaya formulir adalah master tingkat periode (satu nilai untuk
            # seluruh gelombang).
            amount=int(period.form_fee or 0),
            status="pending",
            created_at=now,
            updated_at=now,
        )

        try:
            user, applicant = self.repository.create_user_and_applicant(
                user, applicant, transaction
            )
        except IntegrityError:
            logger.exception(
                "Duplicate on register: email=%s username=%s", body.email, username
            )
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
            )

        from src.core.config import settings

        try:
            # Kirim satu event registrasi dari template kanonikal PPDB.
            wave_end = wave.end_date
            tanggal_tutup = (
                wave_end.strftime("%d %B %Y") if wave_end else "sesuai jadwal"
            )
            send_notifications(
                [
                    (
                        "registration_account_created",
                        {
                            "username": user.username,
                            "nama_peserta": user.full_name,
                            "password": raw_password,
                            "nama_sekolah": "Pesantren Tahfidz Qur'an dan Digital "
                            "Ar-Rahman",
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                            "tanggal_tutup_gelombang": tanggal_tutup,
                        },
                    ),
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                },
                applicant_row={
                    "id": applicant.id,
                    "full_name": applicant.full_name,
                    "phone": applicant.phone,
                },
            )
        except Exception:
            logger.exception("send_notifications failed after registration; continuing")

        return {
            "success": True,
            "message": "Pendaftaran berhasil",
            "applicant_id": applicant.id,
            "credentials": {"username": username, "password": raw_password},
        }

    # -------------------------------------------------------------------------
    # Applicants & Dashboard
    # -------------------------------------------------------------------------
    def get_applicants(
        self,
        page: int,
        per_page: int,
        search: str,
        wave_id: str | None,
        status: str | None,
        period_id: str | None = None,
        payment_status: str | None = None,
        sort: str | None = None,
    ):
        """Daftar pendaftar.

        Default: SEMUA pendaftar dari seluruh periode & gelombang (dipakai
        Superadmin). Setiap baris membawa ``period_name`` + ``wave_name`` sebagai
        label asal. Filter ``period_id``/``wave_id`` bersifat opsional untuk
        mempersempit tampilan.

        ``period_id = "active"`` membatasi ke PERIODE aktif (semua gelombang di
        dalamnya) — inilah scope halaman operasional admin PPDB. Bila tidak ada
        periode aktif, hasilnya kosong. ``wave_id = "active"`` dipertahankan
        untuk kompatibilitas (hanya gelombang aktif).
        """
        resolved_wave_id = wave_id
        if wave_id == "active":
            active_wave = self.repository.get_active_wave()
            resolved_wave_id = active_wave.id if active_wave else "__none__"

        resolved_period_id = period_id
        if period_id == "active":
            active_period = get_active_period(self.repository.db)
            resolved_period_id = active_period.id if active_period else "__none__"

        data, total = self.repository.get_applicants_paginated(
            resolved_wave_id,
            search,
            status,
            page,
            per_page,
            period_id=resolved_period_id,
            payment_status=payment_status,
            sort=sort,
        )

        active_wave = self.repository.get_active_wave()
        active_wave_info = (
            {"id": active_wave.id, "name": active_wave.name} if active_wave else None
        )
        return {
            "data": data,
            "total": total,
            "active_wave": active_wave_info,
            "active_period": get_active_period_info(self.repository.db),
            "scope": {
                "wave_id": resolved_wave_id if resolved_wave_id != "__none__" else None,
                "period_id": (
                    resolved_period_id if resolved_period_id != "__none__" else None
                ),
            },
        }

    def get_applicant(self, applicant_id: str) -> dict[str, Any]:
        detail = self.repository.get_applicant_detail(applicant_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        return detail

    def create_applicant(self, body: ApplicantAdminCreate) -> dict[str, Any]:
        """Buat pendaftar dari Superadmin (CRUD).

        Konsep password tetap sama seperti pendaftaran publik: username & password
        dibuat otomatis oleh sistem, tidak bisa ditentukan admin dan tidak pernah
        bisa dibaca ulang. Password hanya dikembalikan SEKALI di respons ini lalu
        dikirim via WhatsApp. Untuk mengganti password, pakai
        ``reset_applicant_password``.
        """
        wave = self.repository.get_wave_by_id(body.wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")

        period = self.repository.get_period_by_id(wave.period_id)

        if self.repository.get_applicant_by_email_active(body.email):
            raise HTTPException(
                status_code=400, detail="Email sudah terdaftar pada pendaftar lain."
            )
        if self.repository.get_user_by_email(body.email):
            raise HTTPException(
                status_code=400, detail="Email sudah dipakai akun lain."
            )

        raw_password = self.generate_random_password()
        from src.core.security import validate_password

        validate_password(raw_password)

        username = self.generate_unique_username(body.full_name)
        role_id = self.repository.get_role_id_by_name("Pendaftar")

        now = datetime.now(WIB)
        if wave.registration_end_date:
            payment_deadline = datetime(
                wave.registration_end_date.year,
                wave.registration_end_date.month,
                wave.registration_end_date.day,
                23,
                59,
                59,
            )
        elif wave.end_date:
            payment_deadline = datetime(
                wave.end_date.year,
                wave.end_date.month,
                wave.end_date.day,
                23,
                59,
                59,
            )
        else:
            payment_deadline = datetime.now(ZoneInfo("Asia/Jakarta")).replace(
                tzinfo=None
            ) + timedelta(days=7)

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=hash_password(raw_password),
            email=body.email,
            full_name=body.full_name,
            user_type="applicant",
            role_id=role_id,
            created_at=now,
            updated_at=now,
        )

        applicant = PPDBApplicant(
            id=f"applicant-{uuid.uuid4()}",
            wave_id=wave.id,
            user_id=user.id,
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            address=body.address,
            province=body.province,
            city=body.city,
            district=body.district,
            village=body.village,
            postal_code=body.postal_code,
            gender=body.gender,
            birth_place=body.birth_place,
            birth_date=body.birth_date,
            nisn=body.nisn,
            nik=body.nik,
            parent_name=(
                body.parent_name
                or body.father_name
                or body.guardian_name
                or body.mother_name
            ),
            father_name=body.father_name,
            father_job=body.father_job,
            father_phone=body.father_phone,
            mother_name=body.mother_name,
            mother_job=body.mother_job,
            mother_phone=body.mother_phone,
            guardian_name=body.guardian_name,
            guardian_job=body.guardian_job,
            parent_phone=body.parent_phone or body.father_phone or body.mother_phone,
            parent_income=body.parent_income,
            parent_email=body.parent_email,
            previous_school=body.previous_school,
            graduation_year=body.graduation_year,
            disease_history=self._serialize_health_history_admin(body),
            status="pending_payment",
            payment_status="pending",
            payment_deadline=payment_deadline,
            created_at=now,
            updated_at=now,
        )

        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="qris",
            # Biaya formulir adalah master tingkat periode (satu nilai untuk
            # seluruh gelombang).
            amount=int(period.form_fee or 0) if period else 0,
            status="pending",
            created_at=now,
            updated_at=now,
        )

        try:
            self.repository.create_user_and_applicant(user, applicant, transaction)
        except IntegrityError:
            logger.exception(
                "Duplicate on admin create: email=%s username=%s", body.email, username
            )
            raise HTTPException(
                status_code=400, detail="Email sudah terdaftar. Gunakan email lain."
            )

        self._notify_credentials(user, applicant, raw_password)

        return {
            "success": True,
            "message": "Pendaftar berhasil dibuat",
            "applicant_id": applicant.id,
            "credentials": {"username": username, "password": raw_password},
        }

    def update_applicant(
        self, applicant_id: str, body: ApplicantAdminUpdate
    ) -> dict[str, Any]:
        """Update data pendaftar dari Superadmin.

        Password TIDAK bisa diubah lewat sini Ã¢â‚¬â€ tetap memakai
        ``reset_applicant_password`` supaya konsep kredensial tidak berubah.
        """
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        data = body.model_dump(exclude_unset=True)
        if not data:
            return {
                "success": True,
                "message": "Tidak ada perubahan",
                "applicant": self.get_applicant(applicant_id),
            }

        wave_id = data.pop("wave_id", None)
        if wave_id:
            wave = self.repository.get_wave_by_id(wave_id)
            if not wave:
                raise HTTPException(
                    status_code=404, detail="Gelombang tujuan tidak ditemukan"
                )
            applicant.wave_id = wave.id

        email = data.get("email")
        if email and email.lower() != (applicant.email or "").lower():
            clash = self.repository.get_applicant_by_email_active(email)
            if clash and clash.id != applicant.id:
                raise HTTPException(
                    status_code=400,
                    detail="Email sudah dipakai pendaftar lain.",
                )
            if self.repository.get_user_by_email(email):
                raise HTTPException(
                    status_code=400, detail="Email sudah dipakai akun lain."
                )
            # Email akun login ikut disesuaikan agar tetap sinkron.
            if applicant.user_id:
                user = self.repository.get_user_by_id(applicant.user_id)
                if user:
                    user.email = email
                    user.updated_at = datetime.now(WIB)

        full_name = data.get("full_name")
        if full_name and applicant.user_id:
            user = self.repository.get_user_by_id(applicant.user_id)
            if user:
                user.full_name = full_name
                user.updated_at = datetime.now(WIB)

        for key, value in data.items():
            if hasattr(applicant, key):
                setattr(applicant, key, value)

        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        return {
            "success": True,
            "message": "Data pendaftar berhasil diperbarui",
            "applicant": self.get_applicant(applicant_id),
        }

    def delete_applicant(self, applicant_id: str) -> dict[str, Any]:
        """Hapus permanen pendaftar + akun login + seluruh data turunannya."""
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        full_name = applicant.full_name
        # Kumpulkan path berkas SEBELUM baris DB dihapus.
        files = self.repository.get_applicant_document_files(applicant_id)
        self.repository.delete_applicant_permanent(applicant)

        # Berkas fisik dihapus setelah transaksi DB selesai. `delete_upload`
        # sudah menangani local / cloudinary / db:// beserta error-nya.
        from src.core.uploads import delete_upload

        for storage_path in files:
            delete_upload(storage_path)

        logger.info(
            "Applicant permanently deleted: id=%s name=%s files_purged=%d",
            applicant_id,
            full_name,
            len(files),
        )
        return {
            "success": True,
            "message": (
                f"Pendaftar {full_name} beserta seluruh datanya dihapus permanen."
            ),
        }

    def _notify_credentials(
        self, user: User, applicant: PPDBApplicant, raw_password: str
    ) -> None:
        """Kirim kredensial via WhatsApp setelah pendaftar dibuat oleh admin."""
        from src.core.config import settings

        try:
            wave = (
                self.repository.get_wave_by_id(applicant.wave_id)
                if applicant.wave_id
                else None
            )
            tanggal_tutup = (
                wave.end_date.strftime("%d %B %Y")
                if wave and wave.end_date
                else "sesuai jadwal"
            )
            send_notifications(
                [
                    (
                        "registration_account_created",
                        {
                            "username": user.username,
                            "nama_peserta": user.full_name,
                            "password": raw_password,
                            "nama_sekolah": "Pesantren Tahfidz Qur'an dan Digital "
                            "Ar-Rahman",
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                            "tanggal_tutup_gelombang": tanggal_tutup,
                        },
                    ),
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                },
                applicant_row={
                    "id": applicant.id,
                    "full_name": applicant.full_name,
                    "phone": applicant.phone,
                },
            )
        except Exception:
            logger.exception("send_notifications failed after create; continuing")

    def reset_applicant_password(
        self, applicant_id: str, new_password: str
    ) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        if not applicant.user_id:
            raise HTTPException(
                status_code=400, detail="Akun login pendaftar tidak ditemukan"
            )

        new_password = (new_password or "").strip()
        if not new_password:
            return {"changed": False, "message": "Password tidak diubah (field kosong)"}

        from src.core.security import validate_password

        validate_password(new_password)

        user = self.repository.get_user_by_id(applicant.user_id)
        if not user:
            raise HTTPException(
                status_code=400, detail="Akun login pendaftar tidak ditemukan"
            )

        self.repository.update_user_password(user, hash_password(new_password))

        from src.core.config import settings

        try:
            send_notifications(
                [
                    (
                        "password_reset",
                        {
                            "password": new_password,
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                        },
                    )
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                },
                applicant_row={
                    "id": applicant.id,
                    "full_name": applicant.full_name,
                    # Sama seperti create: nomor WA wajib disertakan agar
                    # notifikasi password_reset benar-benar terkirim.
                    "phone": applicant.phone,
                },
            )
        except Exception:
            logger.exception("send password_reset notification failed; continuing")

        return {
            "changed": True,
            "message": "Password berhasil direset",
            "username": user.username,
            "password": new_password,
        }

    # -------------------------------------------------------------------------
    # Dokumen Pendaftar
    # -------------------------------------------------------------------------
    def _get_current_applicant(self, user: dict[str, Any]) -> PPDBApplicant:
        applicant = self.repository.get_applicant_by_user_id(user["id"])
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        return applicant

    def get_my_documents(self, user_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        specs = get_document_specs()
        return {
            "data": self.repository.get_applicant_documents(applicant.id),
            "required_documents": specs,
        }

    async def upload_document(
        self, user: dict[str, Any], doc_type: str, file: UploadFile
    ) -> dict[str, Any]:
        import uuid

        from src.core.uploads import delete_upload, upload_file

        applicant = await asyncio.to_thread(self._get_current_applicant, user)
        if applicant.status not in _DOCUMENT_UPLOAD_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Dokumen sedang dalam proses verifikasi, tidak dapat diunggah",
            )

        doc_type = (doc_type or "").strip()
        allowed = get_all_allowed_documents()
        if doc_type not in allowed:
            valid_list = ", ".join(allowed)
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Jenis dokumen '{doc_type}' tidak valid. "
                    f"Jenis yang diizinkan: {valid_list}"
                ),
            )

        file_id = str(uuid.uuid4())
        upload = await upload_file(file, file_id)
        old_paths = await asyncio.to_thread(
            self.repository.replace_applicant_document,
            applicant_id=applicant.id,
            doc_type=doc_type,
            upload=upload,
            file_id=file_id,
            uploaded_by=user["id"],
            now=datetime.now(WIB),
        )
        for path in old_paths:
            await asyncio.to_thread(delete_upload, path)

        docs = await asyncio.to_thread(
            self.repository.get_applicant_documents, applicant.id
        )
        document = next((d for d in docs if d["doc_type"] == doc_type), None)
        return {"message": "Dokumen berhasil diunggah", "document": document}

    def submit_documents(
        self, user: dict[str, Any], payload: Any = None
    ) -> dict[str, Any]:
        applicant = self._get_current_applicant(user)
        if applicant.status not in _DOCUMENT_UPLOAD_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Dokumen sedang dalam proses verifikasi",
            )

        docs = self.repository.get_applicant_documents(applicant.id)
        uploaded_types = {d["doc_type"] for d in docs}
        mandatory = get_required_documents()
        missing = [name for name in mandatory if name not in uploaded_types]

        deferred = (
            bool(getattr(payload, "deferred_commitment", False)) if payload else False
        )
        deferred_note = getattr(payload, "deferred_note", None) if payload else None

        CORE_REQUIRED = {
            "NISN",
            "Kartu Keluarga (KK)",
            "Akta Kelahiran",
            "Pas Foto",
            "KTP Orang Tua/Wali",
        }
        missing_core = [name for name in missing if name in CORE_REQUIRED]

        if missing:
            if deferred:
                if missing_core:
                    missing_core_list = ", ".join(missing_core)
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Berkas pokok identitas wajib diunggah sebelum submit: "
                            f"{missing_core_list}"
                        ),
                    )
                missing_reports = [
                    name for name in missing if name not in CORE_REQUIRED
                ]
                missing_reports_str = ", ".join(missing_reports)
                note = (
                    deferred_note
                    or "Komitmen berkas menyusul saat daftar ulang: "
                    f"{missing_reports_str}"
                )
                applicant.rejection_reason = f"[BERKAS MENYUSUL]: {note}"
            else:
                missing_list = ", ".join(missing)
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Lengkapi seluruh berkas persyaratan "
                        f"sebelum submit. Berkas belum diunggah: {missing_list}"
                    ),
                )
        else:
            if applicant.rejection_reason and applicant.rejection_reason.startswith(
                "[BERKAS MENYUSUL]"
            ):
                applicant.rejection_reason = None

        applicant.status = "document_uploaded"
        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        if applicant.user_id:
            try:
                from src.core.config import settings

                send_notification(
                    "documents_submitted",
                    applicant.user_id,
                    {
                        "link_aplikasi": (
                            f"{settings.ppdb_frontend_url}" "/applicant/dokumen"
                        ),
                    },
                )
            except Exception:
                logger.exception(
                    "Could not queue document submission confirmation for applicant %s",
                    applicant.id,
                )

        return {
            "status": "document_uploaded",
            "message": "Dokumen dikirim untuk verifikasi",
        }

    def get_applicant_documents_admin(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        return {"data": self.repository.get_applicant_documents(applicant.id)}

    def verify_applicant_documents(
        self, applicant_id: str, status: str, rejection_reason: str | None
    ) -> dict[str, Any]:
        from src.core.config import settings

        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        if status not in ("document_approved", "document_rejected"):
            raise HTTPException(status_code=400, detail="Status verifikasi tidak valid")
        if status == "document_rejected" and not (rejection_reason or "").strip():
            raise HTTPException(status_code=400, detail="Alasan penolakan wajib diisi")

        applicant.status = "selection" if status == "document_approved" else status
        applicant.rejection_reason = (
            rejection_reason.strip() if rejection_reason else None
        )
        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        try:
            if status == "document_rejected":
                # Spec baru: document_rejected_revision
                send_notification(
                    "document_rejected_revision",
                    applicant.user_id,
                    {
                        "alasan_penolakan": applicant.rejection_reason or "",
                        "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                    },
                )
            elif status == "document_approved":
                from src.services.selection_stage_service import SelectionStageService

                stage_svc = SelectionStageService(self.repository.db)
                stage_sent = stage_svc.dispatch_stage_1_to_applicant(
                    applicant.id, applicant.wave_id
                )
                if not stage_sent:
                    # Jadwal belum dibuat atau batch sudah melewati batas cutoff H-1
                    # Pendaftar berstatus 'Menunggu Jadwal Seleksi'
                    send_notifications(
                        [
                            (
                                "document_approved",
                                {
                                    "link_aplikasi": (
                                        f"{settings.ppdb_frontend_url}" "/dashboard"
                                    ),
                                },
                            )
                        ],
                        applicant.user_id,
                    )
        except Exception:
            logger.exception("send document notification failed; continuing")

        return {
            "status": status,
            "full_name": applicant.full_name,
            "message": (
                "Dokumen disetujui"
                if status == "document_approved"
                else "Dokumen ditolak"
            ),
        }

    def get_dashboard_stats(self) -> dict[str, Any]:
        active_wave = self.repository.get_active_wave()
        active_period_name = self.repository.get_active_period_name()

        if not active_wave:
            return {
                "active_wave": None,
                "active_period_name": active_period_name,
                "applicants": {
                    "total": 0,
                    "document_uploaded": 0,
                    "document_uploaded_pending": 0,
                    "document_rejected": 0,
                    "selection": 0,
                    "passed": 0,
                    "conditional": 0,
                    "waitlist": 0,
                    "failed": 0,
                    "expired": 0,
                },
                "payments": {
                    "pending": 0,
                    "success": 0,
                    "failed": 0,
                    "expired": 0,
                    "cancelled": 0,
                    "by_method": {},
                },
                "trend": [],
            }

        grouped = self.repository.count_applicants_by_status_in_wave(active_wave.id)

        def g(key: str) -> int:
            return grouped.get(key, 0)

        payments_by_status = self.repository.count_payments_by_status_in_wave(
            active_wave.id
        )

        def p(key: str) -> int:
            return payments_by_status.get(key, 0)

        return {
            "active_wave": {"id": active_wave.id, "name": active_wave.name},
            "active_period_name": active_period_name,
            "applicants": {
                "total": self.repository.count_applicants_in_wave(active_wave.id),
                "document_uploaded": g("document_uploaded"),
                "document_uploaded_pending": g("document_uploaded_pending"),
                "document_rejected": g("document_rejected"),
                "selection": g("selection"),
                "passed": g("passed"),
                "conditional": g("conditional"),
                "waitlist": g("waitlist"),
                "failed": g("failed"),
                "expired": g("expired"),
            },
            "payments": {
                "pending": p("pending"),
                "success": p("success"),
                "failed": p("failed"),
                "expired": p("expired"),
                "cancelled": p("cancelled"),
                "by_method": self.repository.count_payments_by_method_in_wave(
                    active_wave.id
                ),
            },
            "trend": self.repository.get_registration_trend(active_wave.id),
        }

    def soft_delete_expired_applicants(self) -> dict[str, Any]:
        now = datetime.now(ZoneInfo("Asia/Jakarta"))
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")

        applicants = self.repository.get_expired_pending_applicants(now_str)
        if not applicants:
            return {"deleted": 0}

        self.repository.soft_delete_applicants(applicants, now_str)

        # payment_expired: tidak ada padanan di spec baru, tetap dikirim
        # karena user perlu tahu akun mereka kedaluwarsa.
        for app in applicants:
            send_notifications([("payment_expired", {})], app.user_id)

        return {"deleted": len(applicants), "applicant_ids": [a.id for a in applicants]}

    def run_reminders(self) -> dict[str, Any]:
        """
        Cron harian Ã¢â‚¬â€ digantikan oleh endpoint-endpoint baru:
          - payment_reminder_monday  Ã¢â€ â€™ POST
            /notifications/cron/payment-reminder-monday
          - reminder_upload_docs_h3  Ã¢â€ â€™ belum ada cron khusus, TODO
          - reminder_exam_1hour      Ã¢â€ â€™ belum ada cron khusus, TODO
          - selection_reminder_*     Ã¢â€ â€™ dihapus, tidak ada padanan di spec baru

        Fungsi ini dipertahankan agar endpoint cron lama tidak error 500,
        tapi tidak mengirim notifikasi apapun lagi Ã¢â‚¬â€ semua sudah dipindah ke
        endpoint baru yang lebih granular.
        """
        return {
            "success": True,
            "migrated": True,
            "message": "Reminder system migrated to new endpoints",
        }

    def get_applicant_transcript(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        from sqlalchemy import select

        from src.models.selection import (
            SelectionCategory,
            SelectionCriteria,
            SelectionResult,
            SelectionScore,
        )

        scores_rows = self.repository.db.execute(
            select(
                SelectionScore.score,
                SelectionCriteria.name.label("criteria_name"),
                SelectionCriteria.weight,
                SelectionCategory.name.label("category_name"),
                SelectionCategory.id.label("category_id"),
            )
            .join(SelectionCriteria, SelectionScore.criteria_id == SelectionCriteria.id)
            .join(
                SelectionCategory, SelectionCriteria.category_id == SelectionCategory.id
            )
            .where(SelectionScore.applicant_id == applicant_id)
            .order_by(SelectionCategory.name.asc(), SelectionCriteria.name.asc())
        ).all()

        categories_map: dict[str, dict[str, Any]] = {}
        for row in scores_rows:
            cat_name = row.category_name
            if cat_name not in categories_map:
                categories_map[cat_name] = {
                    "category_name": cat_name,
                    "criteria": [],
                }
            categories_map[cat_name]["criteria"].append(
                {
                    "criteria_name": row.criteria_name,
                    "weight": row.weight,
                    "score": row.score,
                }
            )

        sel_res = (
            self.repository.db.execute(
                select(SelectionResult).where(
                    SelectionResult.applicant_id == applicant_id
                )
            )
            .scalars()
            .first()
        )

        # Hasil ujian CBT Akademik & Psikologi dari attempt pendaftar.
        from sqlalchemy import and_

        from src.models.cbt import ExamAttempt, ExamSchedule

        app_row = self.repository.db.get(PPDBApplicant, applicant_id)
        cbt_rows = self.repository.db.execute(
            select(
                ExamSchedule.category,
                ExamAttempt.status,
                ExamAttempt.score,
                ExamAttempt.started_at,
                ExamAttempt.finished_at,
                ExamAttempt.violations_count,
                ExamSchedule.id.label("schedule_id"),
                ExamSchedule.name.label("schedule_name"),
                ExamSchedule.batch_name,
                ExamSchedule.session_date,
                ExamSchedule.start_time,
                ExamSchedule.end_time,
                ExamSchedule.mode,
            )
            .outerjoin(
                ExamAttempt,
                and_(
                    ExamAttempt.schedule_id == ExamSchedule.id,
                    ExamAttempt.applicant_id == applicant_id,
                ),
            )
            .where(
                ExamSchedule.wave_id == app_row.wave_id if app_row else None,
                ExamSchedule.category.in_(("akademik", "psikologi")),
            )
            .order_by(ExamSchedule.session_date.asc())
        ).all()

        cbt_results: dict[str, dict[str, Any] | None] = {
            "akademik": None,
            "psikologi": None,
        }
        for row in cbt_rows:
            if row.status is None:
                continue
            category = row.category
            # Bila ada beberapa attempt, yang selesai diberi bobot lebih tinggi.
            current = cbt_results.get(category)
            candidate = {
                "schedule_id": row.schedule_id,
                "schedule_name": row.schedule_name,
                "batch_name": row.batch_name,
                "session_date": row.session_date.isoformat()
                if row.session_date
                else None,
                "start_time": row.start_time,
                "end_time": row.end_time,
                "mode": row.mode,
                "attempt_status": row.status,
                "score": row.score,
                "started_at": row.started_at.isoformat() if row.started_at else None,
                "finished_at": row.finished_at.isoformat() if row.finished_at else None,
                "violations_count": row.violations_count,
            }
            prefer_completed = current is None or (
                current.get("attempt_status") != "completed"
                and candidate["attempt_status"] == "completed"
            )
            if prefer_completed:
                cbt_results[category] = candidate

        # Kelengkapan nilai — kunci apakah keputusan hasil pendaftaran boleh ditetapkan.
        from src.services.selection_service import selection_score_gaps

        app_obj = app_row
        missing_scores = (
            selection_score_gaps(self.repository.db, app_obj) if app_obj else []
        )

        for k, v in list(applicant.items()):
            if isinstance(v, datetime | date):
                applicant[k] = v.isoformat() if hasattr(v, "isoformat") else str(v)
            elif hasattr(v, "__str__") and type(v).__name__ in ("Decimal", "UUID"):
                applicant[k] = str(v)

        result_notes = None
        if sel_res:
            result_notes = {
                "akademik": sel_res.notes_akademik,
                "psikologi": sel_res.notes_psikologi,
                "tahfidz": sel_res.notes_tahfidz,
                "wawancara": sel_res.notes_wawancara,
            }

        return {
            "applicant": applicant,
            "categories": list(categories_map.values()),
            "cbt_results": cbt_results,
            "result_notes": result_notes,
            "evaluator_notes": sel_res.notes if sel_res else None,
            "graduation_status": sel_res.graduation_status
            if sel_res
            else applicant.get("status"),
            "missing_scores": missing_scores,
            "scores_complete": not missing_scores,
            "issued_at": datetime.now(WIB).isoformat(),
        }

    def _calculate_loa_fee_items(
        self, wave: Any, applicant: dict[str, Any]
    ) -> list[dict[str, Any]]:
        wave_id = wave.id if wave else None
        period_id = wave.period_id if wave else applicant.get("period_id")
        period_items = (
            self.repository.get_period_fee_items(period_id) if period_id else []
        )
        if period_items:
            discounts = {
                d.fee_item_id: d
                for d in (
                    self.repository.get_wave_fee_discounts(wave_id) if wave_id else []
                )
            }
            fee_items = []
            for item in period_items:
                d = discounts.get(item.id)
                discount_amount = 0
                discount_desc = ""
                # Early bird hanya untuk pendaftar yang slotnya sah: flag
                # ditandai saat pembayaran formulir sukses (X pembayar awal),
                # bukan untuk semua pendaftar di gelombang.
                if (
                    d
                    and d.early_discount_type
                    and d.early_discount_value
                    and wave
                    and wave.early_discount_quota
                    and applicant.get("early_discount_eligible")
                ):
                    if d.early_discount_type == "percent":
                        discount_amount = int(
                            item.nominal * (d.early_discount_value / 100)
                        )
                        discount_desc = f"Diskon Early Bird {d.early_discount_value}%"
                    else:
                        discount_amount = int(d.early_discount_value)
                        discount_desc = (
                            f"Diskon Early Bird Rp {d.early_discount_value:,}"
                        )
                elif d and d.discount_type and d.discount_value:
                    if d.discount_type == "percent":
                        discount_amount = int(item.nominal * (d.discount_value / 100))
                        discount_desc = f"Diskon Gelombang {d.discount_value}%"
                    else:
                        discount_amount = int(d.discount_value)
                        discount_desc = f"Diskon Gelombang Rp {d.discount_value:,}"

                net_nominal = max(0, int(item.nominal - discount_amount))
                fee_items.append(
                    {
                        "id": item.id,
                        "name": item.name,
                        "nominal": net_nominal,
                        "standard_nominal": int(item.nominal),
                        "discount_nominal": discount_amount,
                        "discount_description": discount_desc,
                        "description": item.description
                        or "Biaya komponen pendidikan resmi PPDB.",
                    }
                )
            return fee_items

        # Tanpa master komponen biaya pada periode: kembalikan daftar kosong.
        # LoA menampilkan keterangan "belum dikonfigurasi" alih-alih angka
        # template yang tidak keluar dari konfigurasi panitia.
        return []

    def get_applicant_loa(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        app_obj = self.repository.db.get(PPDBApplicant, applicant_id)
        now = datetime.now(WIB)

        # Pastikan nomor registrasi terisi unik baku
        reg_no = applicant.get("registration_number")
        if not reg_no and app_obj:
            c_date = (app_obj.created_at or now).strftime("%d%m%y")
            clean_id = (
                "".join(c for c in app_obj.id if c.isalnum())[-5:].upper().zfill(5)
            )
            reg_no = f"REG-{c_date}{clean_id}"
            app_obj.registration_number = reg_no
            self.repository.db.commit()
            applicant["registration_number"] = reg_no

        from src.models.ppdb import PPDBPeriod, PPDBWave

        # Ambil data periode aktif / induk
        period_id = applicant.get("period_id")
        period = self.repository.db.get(PPDBPeriod, period_id) if period_id else None

        academic_year = (
            period.academic_year if period and period.academic_year else "2026 / 2027"
        )
        admission_officer = (
            period.head_of_committee if period and period.head_of_committee else None
        ) or "Ust. Wijaya Kurnia, M.Pd."
        wa_group_link = period.wa_group_link if period and period.wa_group_link else ""

        # Ambil data gelombang
        wave_id = applicant.get("wave_id")
        wave = self.repository.db.get(PPDBWave, wave_id) if wave_id else None
        wave_name = wave.name if wave else (applicant.get("wave_name") or "Gelombang 1")
        # Minimal DP adalah master tingkat periode (dicantumkan pada LoA).
        minimum_dp = int(period.minimum_dp) if period and period.minimum_dp else 5000000

        # Rincian biaya pendidikan: master komponen periode + diskon gelombang.
        fee_items = self._calculate_loa_fee_items(wave, applicant)

        total_fee = sum(item["nominal"] for item in fee_items)

        months_id = {
            1: "Januari",
            2: "Februari",
            3: "Maret",
            4: "April",
            5: "Mei",
            6: "Juni",
            7: "Juli",
            8: "Agustus",
            9: "September",
            10: "Oktober",
            11: "November",
            12: "Desember",
        }

        # Tenggat waktu Opsi A (Lunas): 6 bulan setelah diterima / ttd
        base_date = (
            app_obj.loa_signed_at
            if app_obj and app_obj.loa_signed_at
            else (app_obj.updated_at if app_obj and app_obj.updated_at else now)
        )
        y = base_date.year + (base_date.month + 6 - 1) // 12
        m = (base_date.month + 6 - 1) % 12 + 1
        d = min(base_date.day, 28)
        deadline_dt = datetime(y, m, d, 23, 59, 59)
        deadline_str = f"{d} {months_id[m]} {y}"

        letter_date_str = (
            f"{base_date.day} {months_id[base_date.month]} {base_date.year}"
        )

        # Payment Method Info
        FIXED_LOA_CLAUSE = (
            "Seluruh dana yang telah dibayarkan tidak dapat dikembalikan."
        )
        letter_number = (
            f"LoA/PPDB/{base_date.year}/{reg_no or applicant_id[:8].upper()}"
        )

        loa_signed_at_raw = applicant.get("loa_signed_at")
        loa_signed_at_iso = (
            loa_signed_at_raw.isoformat() if loa_signed_at_raw is not None else None
        )

        return {
            "letter_number": letter_number,
            "registration_number": reg_no,
            "academic_year": academic_year,
            "admission_officer": admission_officer,
            "director_name": "Ust. Dr. H. Abdurrahman, M.A.",
            "location": "Bekasi",
            "date_str": letter_date_str,
            "applicant": applicant,
            "fee_items": fee_items,
            "total_fee": total_fee,
            "minimum_dp": minimum_dp,
            # Label subsidi/diskon hanya ketika setidaknya satu komponen
            # benar-benar terpotong; tanpa diskon, baris itu tidak tampil.
            "discount_name": (
                f"Potongan Biaya Pembangunan (Early Bird {wave_name})"
                if any(item.get("discount_nominal") for item in fee_items)
                else None
            ),
            "deadline_lunas": deadline_str,
            "deadline_lunas_iso": deadline_dt.isoformat(),
            "fixed_clause": FIXED_LOA_CLAUSE,
            "is_graduated": applicant.get("status") == "passed",
            "is_loa_signed": bool(applicant.get("is_loa_signed")),
            "loa_signed_at": loa_signed_at_iso,
            "loa_signer_name": applicant.get("loa_signer_name"),
            "loa_signer_relation": applicant.get("loa_signer_relation")
            or "Orang Tua / Wali",
            "loa_signature_data": applicant.get("loa_signature_data"),
            "loa_signature_token": applicant.get("loa_signature_token"),
            "payment_method": "Transfer Bank / Rekening Resmi PTDARRAHMAN (Di Luar "
            "Aplikasi)",
            "payment_channel": "Kantor Bendahara Pesantren & Rekening Resmi "
            "PTDARRAHMAN",
            "va_bank": "Bank Syariah Indonesia (BSI)",
            "va_number": "Nomor Rekening Resmi PTDARRAHMAN (Hubungi Panitia)",
            "whatsapp_group_link": wa_group_link,
            "content": (
                "SURAT PENERIMAAN SANTRI BARU (LETTER OF ACCEPTANCE)\n\n"
                "Selamat! Anda telah dinyatakan LULUS seleksi dan dinyatakan "
                "DITERIMA sebagai santri / peserta didik baru Pesantren "
                f"Tahfidz Qur'an dan Digital Ar-Rahman dalam Academic Year "
                f"{academic_year}."
            ),
            "issued_at": now.isoformat(),
        }

    def sign_applicant_loa(self, applicant_id: str, body: Any) -> dict[str, Any]:
        from src.core.config import settings

        app = self.repository.db.get(PPDBApplicant, applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        if app.status != "passed":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Hanya pendaftar yang telah dinyatakan LULUS yang dapat "
                    "menandatangani LoA."
                ),
            )

        already_signed = bool(app.is_loa_signed)
        now = datetime.now(WIB)
        if not app.registration_number:
            c_date = (app.created_at or now).strftime("%d%m%y")
            clean_id = "".join(c for c in app.id if c.isalnum())[-5:].upper().zfill(5)
            app.registration_number = f"REG-{c_date}{clean_id}"

        app.is_loa_signed = True
        app.loa_signed_at = now
        app.loa_signer_name = body.signer_name.strip()
        app.loa_signer_relation = body.signer_relation.strip()
        app.loa_signature_data = body.signature_data.strip()
        if not app.loa_signature_token:
            app.loa_signature_token = uuid.uuid4().hex
        app.updated_at = now

        self.repository.db.commit()
        self.repository.db.refresh(app)

        if not already_signed:
            try:
                send_notification(
                    "loa_signed",
                    app.user_id,
                    {
                        "link_aplikasi": (
                            f"{settings.ppdb_frontend_url}" "/applicant/pengumuman"
                        ),
                    },
                )
            except Exception:
                logger.exception(
                    "Failed to enqueue loa_signed for applicant %s; continuing",
                    app.id,
                )

        return {
            "status": "success",
            "message": (
                "Letter of Acceptance berhasil ditandatangani secara digital "
                "oleh orang tua / wali."
            ),
            "registration_number": app.registration_number,
            "loa_signature_token": app.loa_signature_token,
            "loa_signed_at": app.loa_signed_at.isoformat(),
        }

    def get_signed_loa_applicants(
        self,
        search: str | None = None,
        page: int = 1,
        per_page: int = 10,
    ) -> dict[str, Any]:
        import sqlalchemy as sa

        from src.models.auth import User
        from src.models.ppdb import PPDBPeriod, PPDBWave

        # Halaman operasional admin hanya menampilkan penerima LoA dari periode
        # aktif. Tanpa periode aktif, tidak ada data (bukan lintas periode).
        active_period = get_active_period_info(self.repository.db)
        if not active_period:
            return {
                "data": [],
                "total": 0,
                "grand_total": 0,
                "signed_count": 0,
                "pending_count": 0,
                "page": page,
                "per_page": per_page,
                "active_period": None,
            }

        query = (
            self.repository.db.query(
                PPDBApplicant,
                PPDBWave.name.label("wave_name"),
                PPDBPeriod.name.label("period_name"),
                User.username,
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .outerjoin(PPDBPeriod, PPDBWave.period_id == PPDBPeriod.id)
            .outerjoin(User, PPDBApplicant.user_id == User.id)
            # Semua pendaftar yang dinyatakan LULUS telah menerima LoA, baik yang
            # sudah menandatangani maupun yang masih menunggu tanda tangan.
            .filter(
                PPDBApplicant.status == "passed",
                PPDBWave.period_id == active_period["id"],
            )
        )

        # Ringkasan global (tanpa filter pencarian)
        signed_count = query.filter(PPDBApplicant.is_loa_signed.is_(True)).count()
        grand_total = query.count()
        pending_count = grand_total - signed_count

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                sa.or_(
                    PPDBApplicant.full_name.ilike(s),
                    PPDBApplicant.registration_number.ilike(s),
                    PPDBApplicant.nisn.ilike(s),
                    PPDBApplicant.loa_signer_name.ilike(s),
                )
            )

        total = query.count()
        rows = (
            query.order_by(
                PPDBApplicant.is_loa_signed.desc(),
                PPDBApplicant.loa_signed_at.desc(),
                PPDBApplicant.updated_at.desc(),
            )
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        data = []
        for app, wave_name, period_name, username in rows:
            data.append(
                {
                    "id": app.id,
                    "full_name": app.full_name,
                    "registration_number": app.registration_number,
                    "nisn": app.nisn or app.nik or "-",
                    "previous_school": app.previous_school,
                    "wave_name": wave_name,
                    "period_name": period_name,
                    "username": username,
                    "is_loa_signed": app.is_loa_signed,
                    "loa_signed_at": app.loa_signed_at.isoformat()
                    if app.loa_signed_at
                    else None,
                    "loa_signer_name": app.loa_signer_name,
                    "loa_signer_relation": app.loa_signer_relation,
                    "loa_signature_token": app.loa_signature_token,
                }
            )
        return {
            "data": data,
            "total": total,
            "grand_total": grand_total,
            "signed_count": signed_count,
            "pending_count": pending_count,
            "page": page,
            "per_page": per_page,
            "active_period": active_period,
        }

    def get_loa_by_registration_or_id(self, identifier: str) -> dict[str, Any]:
        import sqlalchemy as sa

        app = (
            self.repository.db.query(PPDBApplicant)
            .filter(
                sa.or_(
                    PPDBApplicant.id == identifier,
                    PPDBApplicant.registration_number == identifier,
                    PPDBApplicant.loa_signature_token == identifier,
                )
            )
            .first()
        )
        if not app:
            raise HTTPException(status_code=404, detail="Dokumen LoA tidak ditemukan")
        return self.get_applicant_loa(app.id)

    def get_archive_applicants(
        self,
        period_id: str | None,
        wave_id: str | None,
        search: str | None,
        status: str | None,
        page: int,
        per_page: int,
    ) -> dict[str, Any]:
        """Pencarian lintas periode dan gelombang khusus arsip."""
        rows, total = self.repository.get_applicants_paginated(
            wave_id=wave_id,
            search=search or "",
            status=status,
            page=page,
            per_page=per_page,
            period_id=period_id,
            payment_status=None,
        )
        return {
            "data": rows,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    def get_applicant_dossier(
        self,
        applicant_id: str,
        admin_user: dict[str, Any],
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        docs = self.repository.get_applicant_documents(applicant_id)
        transcript = self.get_applicant_transcript(applicant_id)
        loa = self.get_applicant_loa(applicant_id)
        form_payments = (
            self.repository.db.query(PPDBPaymentTransaction)
            .filter(PPDBPaymentTransaction.applicant_id == applicant_id)
            .order_by(PPDBPaymentTransaction.created_at.desc())
            .all()
        )

        from src.models.auth import AuditLog

        dossier_full_name = applicant.get("full_name")
        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=admin_user.get("id"),
            user_username=admin_user.get("username"),
            action="view_dossier",
            entity_type="ppdb_dossier",
            entity_id=applicant_id,
            changes=(f"Melihat dossier pendaftar {dossier_full_name} ({applicant_id})"),
            ip_address=ip_address,
            created_at=datetime.now(WIB),
        )
        self.repository.db.add(audit)
        self.repository.db.commit()

        raw_health = applicant.get("disease_history") or ""
        if raw_health.startswith("{"):
            try:
                applicant["health_profile"] = json.loads(raw_health)
            except Exception:
                applicant["health_profile"] = None
        else:
            applicant["health_profile"] = None

        return {
            "applicant": applicant,
            "documents": docs,
            "transcript": transcript,
            "loa": loa,
            "payments": {
                "form_payments": [
                    {
                        "id": p.id,
                        "invoice_number": p.invoice_number,
                        "amount": p.amount,
                        "status": p.status,
                        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                        "payment_method": p.payment_method,
                    }
                    for p in form_payments
                ],
            },
            "accessed_at": datetime.now(WIB).isoformat(),
        }

    def export_applicant_dossier_zip(
        self,
        applicant_id: str,
        admin_user: dict[str, Any],
        ip_address: str | None = None,
    ) -> tuple[bytes, str]:
        dossier = self.get_applicant_dossier(applicant_id, admin_user, ip_address)
        applicant = dossier["applicant"]

        import io
        import json
        import zipfile

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            summary_json = json.dumps(dossier, indent=2, default=str)
            zf.writestr("ringkasan_dossier.json", summary_json)

            raw_health = applicant.get("disease_history") or ""
            health_lines = [
                "FORMULIR IDENTIFIKASI KESEHATAN (PENGGANTI MEDCHECK)",
                "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman",
                "----------------------------------------",
                f"Nama Pendaftar: {applicant.get('full_name')}",
                f"NISN: {applicant.get('nisn') or '-'}",
                f"Waktu Pendaftaran: {applicant.get('created_at') or '-'}",
                "----------------------------------------",
            ]
            if raw_health.startswith("{"):
                try:
                    hdata = json.loads(raw_health)
                    chronic_txt = "Tidak"
                    if hdata.get("chronic_disease"):
                        chronic_desc = hdata.get("chronic_disease_description") or ""
                        chronic_txt = f"Ya ({chronic_desc})"
                    health_lines.append(f"1. Riwayat Penyakit Kronis: {chronic_txt}")
                    conds = ", ".join(hdata.get("diagnosed_conditions") or [])
                    if hdata.get("diagnosed_conditions_other"):
                        conds += (
                            f" (Lainnya: {hdata.get('diagnosed_conditions_other')})"
                        )
                    if hdata.get("diagnosed_conditions_description"):
                        cond_desc = hdata.get("diagnosed_conditions_description")
                        conds += f" - Keterangan: {cond_desc}"
                    health_lines.append(
                        f"2. Kondisi yang Pernah Didiagnosis: {conds or 'Tidak ada'}"
                    )

                    allergies_txt = "Tidak"
                    if hdata.get("allergies"):
                        atypes = ", ".join(hdata.get("allergy_types") or [])
                        if hdata.get("allergy_other"):
                            atypes += f" (Lainnya: {hdata.get('allergy_other')})"
                        if hdata.get("allergy_description"):
                            atypes += (
                                f" - Keterangan: {hdata.get('allergy_description')}"
                            )
                        allergies_txt = f"Ya ({atypes})"
                    health_lines.append(f"3. Alergi: {allergies_txt}")

                    med_txt = "Tidak"
                    if hdata.get("regular_medication"):
                        med_desc = hdata.get("regular_medication_description") or ""
                        med_txt = f"Ya ({med_desc})"
                    health_lines.append(
                        f"4. Sedang Menjalani Pengobatan Rutin: {med_txt}"
                    )
                    physical_txt = "Tidak"
                    if hdata.get("physical_limitation"):
                        limit_desc = hdata.get("physical_limitation_description") or ""
                        physical_txt = f"Ya ({limit_desc})"
                    health_lines.append(
                        f"5. Kondisi Kesehatan / Keterbatasan Fisik: {physical_txt}"
                    )
                    hosp_txt = "Tidak"
                    if hdata.get("hospitalization_history"):
                        hosp_desc = (
                            hdata.get("hospitalization_history_description") or ""
                        )
                        hosp_txt = f"Ya ({hosp_desc})"
                    health_lines.append(
                        f"6. Rawat Inap / Operasi (2 Tahun Terakhir): {hosp_txt}"
                    )
                    special_txt = "Tidak"
                    if hdata.get("special_needs"):
                        special_desc = hdata.get("special_needs_description") or ""
                        special_txt = f"Ya ({special_desc})"
                    health_lines.append(
                        f"7. Kebutuhan Khusus Saat Belajar: {special_txt}"
                    )
                    health_lines.append("----------------------------------------")
                    health_lines.append("KONTAK DARURAT:")
                    health_lines.append(
                        f"Nama: {hdata.get('emergency_contact_name') or '-'}"
                    )
                    health_lines.append(
                        f"Hubungan: {hdata.get('emergency_contact_relation') or '-'}"
                    )
                    health_lines.append(
                        f"Nomor Telepon: {hdata.get('emergency_contact_phone') or '-'}"
                    )
                    health_lines.append("----------------------------------------")
                    declaration_txt = "Belum Disetujui"
                    if hdata.get("health_declaration_confirmed"):
                        declaration_txt = "Telah Disetujui"
                    health_lines.append(f"Pernyataan Kebenaran Data: {declaration_txt}")
                except Exception:
                    health_lines.append(f"Catatan Riwayat Kesehatan: {raw_health}")
            else:
                health_lines.append(
                    f"Catatan Riwayat Penyakit / Kesehatan: {raw_health or '-'}"
                )
            zf.writestr(
                "formulir_identifikasi_kesehatan.txt", "\n".join(health_lines) + "\n"
            )

            transcript = dossier.get("transcript") or {}
            evaluator_notes = transcript.get("evaluator_notes", "-")
            result_notes = transcript.get("result_notes") or {}
            note_lines = []
            for comp_key, comp_label in (
                ("akademik", "Ujian Akademik (CBT)"),
                ("psikologi", "Ujian Psikologi (CBT)"),
                ("tahfidz", "Ujian Tahfidz"),
                ("wawancara", "Ujian Wawancara"),
            ):
                note_val = (result_notes.get(comp_key) or "").strip()
                if note_val:
                    note_lines.append(f"Catatan {comp_label}: {note_val}")
            transcript_txt = (
                f"TRANSKRIP HASIL SELEKSI PPDB\n"
                f"Pesantren Tahfidz Qur'an dan Digital Ar-Rahman\n"
                f"----------------------------------------\n"
                f"Nama: {applicant.get('full_name')}\n"
                f"NISN: {applicant.get('nisn') or '-'}\n"
                f"Gelombang: {applicant.get('wave_name')}\n"
                f"Periode: {applicant.get('period_name')}\n"
                f"Status: {applicant.get('status')}\n\n"
                "Catatan per Komponen Seleksi:\n"
                f"{chr(10).join(note_lines) or '-'}\n\n"
                f"Catatan Evaluator (Keputusan Akhir): {evaluator_notes}\n"
            )
            zf.writestr("transkrip_nilai.txt", transcript_txt)

            loa_txt = (
                f"{dossier['loa'].get('content', '')}\n\n"
                f"Ketentuan: {dossier['loa'].get('fixed_clause', '')}\n"
            )
            zf.writestr("surat_penerimaan_loa.txt", loa_txt)

            docs = self.repository.get_documents_by_applicant(applicant_id)
            for d in docs:
                ext = (
                    d.original_name.split(".")[-1] if "." in d.original_name else "dat"
                )
                filename = f"dokumen_asli/{d.doc_type}_{d.id[:8]}.{ext}"
                if d.data:
                    zf.writestr(filename, d.data)
                elif d.storage_path and os.path.exists(d.storage_path):
                    with open(d.storage_path, "rb") as f:
                        zf.writestr(filename, f.read())
                else:
                    zf.writestr(f"{filename}.url.txt", f"URL Unduhan: {d.public_url}")

        from src.models.auth import AuditLog

        zip_full_name = applicant.get("full_name")
        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=admin_user.get("id"),
            user_username=admin_user.get("username"),
            action="download_dossier_zip",
            entity_type="ppdb_dossier",
            entity_id=applicant_id,
            changes=(
                f"Mengunduh ZIP dossier pendaftar {zip_full_name} ({applicant_id})"
            ),
            ip_address=ip_address,
            created_at=datetime.now(WIB),
        )
        self.repository.db.add(audit)
        self.repository.db.commit()

        buffer.seek(0)
        zip_name = applicant.get("full_name", "pendaftar").replace(" ", "_")
        zip_filename = f"dossier_{zip_name}_{applicant_id[:8]}.zip"
        return buffer.getvalue(), zip_filename

    def get_my_applicant_profile(self, user_id: str) -> dict[str, Any]:
        """Ambil data lengkap formulir pendaftar untuk halaman Profile."""
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftar tidak ditemukan"
            )

        detail = self.repository.get_applicant_detail(applicant.id)
        if not detail:
            raise HTTPException(
                status_code=404, detail="Detail pendaftar tidak ditemukan"
            )

        user = self.repository.get_user_by_id(user_id)
        if user:
            detail["avatar_url"] = user.avatar_url or ""

        # Aturan bisnis: setelah lulus tes / LoA terbit, formulir dikunci
        is_locked = bool(applicant.status == "passed")
        detail["is_locked"] = is_locked
        detail["lock_reason"] = (
            "Data formulir pendaftaran sudah dikunci dan tidak dapat diubah "
            "karena Anda telah dinyatakan lulus seleksi dan Surat "
            "Penerimaan (LoA) telah diterbitkan."
            if is_locked
            else None
        )
        return {"applicant": detail}

    def update_my_applicant_profile(
        self, user_id: str, body: ApplicantProfileUpdate
    ) -> dict[str, Any]:
        """Pembaruan data formulir pendaftaran oleh calon santri.

        Dapat diubah selama proses seleksi berlangsung hingga pendaftar dinyatakan
        lulus seleksi (Surat Penerimaan / LoA terbit). Setelah LoA terbit, data dikunci.
        """
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftar tidak ditemukan"
            )

        # Aturan bisnis: setelah lulus tes / LoA terbit, tidak bisa ubah data formulir
        if applicant.status == "passed":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Data formulir pendaftaran sudah dikunci dan tidak dapat "
                    "diubah karena Anda telah dinyatakan lulus seleksi dan "
                    "Surat Penerimaan (LoA) telah diterbitkan."
                ),
            )

        data = body.model_dump(exclude_unset=True)
        if not data:
            return {
                "success": True,
                "message": "Tidak ada perubahan",
                "applicant": self.get_my_applicant_profile(user_id)["applicant"],
            }

        original_phone = applicant.phone or ""
        for key, value in data.items():
            if hasattr(applicant, key):
                setattr(applicant, key, value)

        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        # Sinkronkan perubahan nama atau nomor WA ke tabel akun login (users)
        user = self.repository.get_user_by_id(user_id)
        if user:
            if "full_name" in data and data["full_name"]:
                user.full_name = data["full_name"]
            if "phone" in data and data["phone"]:
                user.phone = data["phone"]
            user.updated_at = datetime.now(WIB)
            self.repository.db.commit()
            from src.core.cache import invalidate_user_cache

            invalidate_user_cache(user_id)

            if applicant.phone and applicant.phone != original_phone:
                try:
                    send_notifications([("account_updated", {})], user_id)
                except Exception:
                    logger.exception(
                        "Could not queue applicant phone change notification"
                    )

        return {
            "success": True,
            "message": "Data formulir pendaftaran berhasil diperbarui",
            "applicant": self.get_my_applicant_profile(user_id)["applicant"],
        }
