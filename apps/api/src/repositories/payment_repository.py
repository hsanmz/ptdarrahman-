from datetime import datetime
from typing import Any, cast
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.models.ppdb import (
    PPDBApplicant,
    PPDBPaymentTransaction,
    PPDBPeriod,
    PPDBWave,
)

WIB = ZoneInfo("Asia/Jakarta")


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_active_wave_id(self) -> str | None:
        # Gelombang hanya dianggap aktif bila periode induknya juga aktif.
        stmt = (
            select(PPDBWave.id)
            .join(PPDBPeriod, PPDBPeriod.id == PPDBWave.period_id)
            .where(PPDBWave.status == "active", PPDBPeriod.status == "active")
            .limit(1)
        )
        return cast(str | None, self.db.scalars(stmt).first())

    def get_active_wave_info(self) -> dict[str, str] | None:
        stmt = (
            select(PPDBWave)
            .join(PPDBPeriod, PPDBPeriod.id == PPDBWave.period_id)
            .where(PPDBWave.status == "active", PPDBPeriod.status == "active")
            .limit(1)
        )
        wave = self.db.scalars(stmt).first()
        return {"id": wave.id, "name": wave.name} if wave else None

    def get_transactions(
        self, period_id: str, status: str | None, limit: int, offset: int
    ) -> tuple[list[Any], int]:
        """Transaksi formulir dari seluruh gelombang dalam satu periode aktif."""
        stmt = (
            select(
                PPDBPaymentTransaction,
                PPDBApplicant.full_name.label("applicant_name"),
                PPDBApplicant.email.label("applicant_email"),
                PPDBWave.name.label("wave_name"),
            )
            .join(
                PPDBApplicant, PPDBPaymentTransaction.applicant_id == PPDBApplicant.id
            )
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .where(PPDBWave.period_id == period_id)
        )

        count_stmt = (
            select(func.count())
            .select_from(PPDBPaymentTransaction)
            .join(
                PPDBApplicant, PPDBPaymentTransaction.applicant_id == PPDBApplicant.id
            )
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .where(PPDBWave.period_id == period_id)
        )

        if status:
            stmt = stmt.where(PPDBPaymentTransaction.status == status)
            count_stmt = count_stmt.where(PPDBPaymentTransaction.status == status)

        stmt = (
            stmt.order_by(PPDBPaymentTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        total = self.db.scalar(count_stmt) or 0
        rows = self.db.execute(stmt).all()

        result = []
        for r in rows:
            tx = r.PPDBPaymentTransaction
            tx_dict = {
                "id": tx.id,
                "applicant_id": tx.applicant_id,
                "method": tx.method,
                "amount": tx.amount,
                "status": tx.status,
                "external_id": tx.external_id,
                "gateway_payload": tx.gateway_payload,
                "failure_reason": tx.failure_reason,
                "proof_url": tx.proof_url,
                "confirmed_by": tx.confirmed_by,
                "confirmed_at": tx.confirmed_at,
                "notes": tx.notes,
                "created_at": tx.created_at,
                "updated_at": tx.updated_at,
                "applicant_name": r.applicant_name,
                "applicant_email": r.applicant_email,
                "wave_name": r.wave_name,
            }
            result.append(tx_dict)

        return result, total

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(PPDBApplicant.user_id == user_id)
        return cast(PPDBApplicant | None, self.db.scalars(stmt).first())

    def get_latest_transaction_by_applicant_id(
        self, applicant_id: str
    ) -> PPDBPaymentTransaction | None:
        stmt = (
            select(PPDBPaymentTransaction)
            .where(PPDBPaymentTransaction.applicant_id == applicant_id)
            .order_by(PPDBPaymentTransaction.created_at.desc())
            .limit(1)
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def get_transaction_by_id(
        self, transaction_id: str
    ) -> PPDBPaymentTransaction | None:
        stmt = select(PPDBPaymentTransaction).where(
            PPDBPaymentTransaction.id == transaction_id
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def get_transaction_by_external_id(
        self, external_id: str
    ) -> PPDBPaymentTransaction | None:
        stmt = select(PPDBPaymentTransaction).where(
            PPDBPaymentTransaction.external_id == external_id
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def count_paid_form_payments_in_wave(self, wave_id: str) -> int:
        stmt = (
            select(func.count(func.distinct(PPDBPaymentTransaction.applicant_id)))
            .join(
                PPDBApplicant,
                PPDBApplicant.id == PPDBPaymentTransaction.applicant_id,
            )
            .where(
                PPDBApplicant.wave_id == wave_id,
                PPDBPaymentTransaction.status == "success",
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def update_transaction(self, transaction: PPDBPaymentTransaction):
        transaction.updated_at = datetime.now(WIB)
        self.db.add(transaction)
        self.db.flush()
        self.db.commit()

    def save_transaction(self, transaction: PPDBPaymentTransaction):
        transaction.updated_at = datetime.now(WIB)
        self.db.add(transaction)
        self.db.flush()
        self.db.commit()

    def update_applicant(self, applicant: PPDBApplicant):
        applicant.updated_at = datetime.now(WIB)
        self.db.add(applicant)
        self.db.flush()
        self.db.commit()

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        """
        Ambil applicant by ID — HANYA yang belum soft-deleted.
        Filter deleted_at IS NULL mencegah admin mengkonfirmasi pembayaran
        untuk akun expired (IDOR via soft-delete bypass).
        """
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.id == applicant_id,
            PPDBApplicant.deleted_at.is_(None),
        )
        return cast(PPDBApplicant | None, self.db.scalars(stmt).first())

    def get_wave_by_id(self, wave_id: str) -> PPDBWave | None:
        stmt = select(PPDBWave).where(PPDBWave.id == wave_id)
        return cast(PPDBWave | None, self.db.scalars(stmt).first())

    def get_transaction_by_order_id(
        self, order_id: str
    ) -> PPDBPaymentTransaction | None:
        stmt = select(PPDBPaymentTransaction).where(
            or_(
                PPDBPaymentTransaction.order_id == order_id,
                PPDBPaymentTransaction.external_id == order_id,
                PPDBPaymentTransaction.id == order_id,
            )
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def get_transaction_by_txn_id(self, txn_id: str) -> PPDBPaymentTransaction | None:
        stmt = select(PPDBPaymentTransaction).where(
            PPDBPaymentTransaction.txn_id == txn_id
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def get_active_transaction(
        self, applicant_id: str, payment_type: str | None = None
    ) -> PPDBPaymentTransaction | None:
        """Transaksi terbuka terakhir (pending / pending_verification)."""
        stmt = select(PPDBPaymentTransaction).where(
            PPDBPaymentTransaction.applicant_id == applicant_id,
            PPDBPaymentTransaction.status.in_(("pending", "pending_verification")),
        )
        if payment_type:
            stmt = stmt.where(PPDBPaymentTransaction.payment_type == payment_type)
        stmt = stmt.order_by(PPDBPaymentTransaction.created_at.desc()).limit(1)
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def get_applicant_transactions(
        self, applicant_id: str
    ) -> list[PPDBPaymentTransaction]:
        stmt = (
            select(PPDBPaymentTransaction)
            .where(PPDBPaymentTransaction.applicant_id == applicant_id)
            .order_by(PPDBPaymentTransaction.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())
