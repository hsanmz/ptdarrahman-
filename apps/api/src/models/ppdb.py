from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class PPDBPeriod(Base):
    __tablename__ = "ppdb_periods"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    academic_year: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    wa_group_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    head_of_committee: Mapped[str | None] = mapped_column(String(150), nullable=True)
    # Biaya formulir dibayar via QRIS saat pendaftaran — satu nilai untuk
    # seluruh gelombang di bawah periode ini (master di level periode).
    form_fee: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    # Minimal uang muka (DP) biaya pendidikan yang dicantumkan pada LoA.
    minimum_dp: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWave(Base):
    """Gelombang pendaftaran: jadwal & kuota.

    Gelombang tidak lagi menyimpan komponen biaya, biaya formulir, maupun
    minimal DP — semuanya tingkat periode. Yang tersisa hanya data diskon
    per komponen biaya periode (``PPDBWaveFeeDiscount``).
    """

    __tablename__ = "ppdb_waves"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    period_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE")
    )
    wave_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    registration_start_date: Mapped[date | None] = mapped_column(Date)
    registration_end_date: Mapped[date | None] = mapped_column(Date)
    quota: Mapped[int] = mapped_column(Integer, default=0)
    early_discount_quota: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBApplicant(Base):
    __tablename__ = "ppdb_applicants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(50), ForeignKey("ppdb_waves.id"))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE")
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    birth_place: Mapped[str | None] = mapped_column(String(100))
    birth_date: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(10))
    nisn: Mapped[str | None] = mapped_column(String(50))
    nik: Mapped[str | None] = mapped_column(String(50))
    parent_name: Mapped[str | None] = mapped_column(String(255))
    father_name: Mapped[str | None] = mapped_column(String(150))
    father_job: Mapped[str | None] = mapped_column(String(100))
    father_phone: Mapped[str | None] = mapped_column(String(20))
    mother_name: Mapped[str | None] = mapped_column(String(150))
    mother_job: Mapped[str | None] = mapped_column(String(100))
    mother_phone: Mapped[str | None] = mapped_column(String(20))
    guardian_name: Mapped[str | None] = mapped_column(String(150))
    guardian_job: Mapped[str | None] = mapped_column(String(100))
    parent_phone: Mapped[str | None] = mapped_column(String(20))
    parent_income: Mapped[str | None] = mapped_column(String(100))
    parent_email: Mapped[str | None] = mapped_column(String(100))
    previous_school: Mapped[str | None] = mapped_column(String(255))
    graduation_year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    province: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    village: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    disease_history: Mapped[str | None] = mapped_column(Text)
    # status alur pendaftaran: pending_payment | paid | document_uploaded |
    #   document_approved | document_rejected | selection | passed | failed | expired
    status: Mapped[str] = mapped_column(String(50), default="pending_payment")
    # ── Payment tracking ──────────────────────────────────────────────────────
    # payment_status: pending | paid | failed | expired
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    # Batas waktu bayar = created_at + 7 hari (diisi saat register)
    payment_deadline: Mapped[datetime | None] = mapped_column(DateTime)
    # ── Soft Delete (Hari ke-8 belum bayar → cron job set deleted_at) ────────
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    # Alasan penolakan dokumen (diisi admin saat verifikasi; NULL saat
    # belum/sudah disetujui)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    registration_number: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True
    )
    is_loa_signed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    loa_signed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    loa_signer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    loa_signer_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    loa_signature_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    loa_signature_token: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    # ── Early bird (diskon X pendaftar awal) ─────────────────────────────────
    # Ditandai atomik saat pembayaran formulir sukses: slot dihitung dari
    # massa transaksinya sendiri, sehingga hanya X pembayar formulir pertama
    # di gelombang yang mendapat True. LoA dan diskonasi membaca flag ini.
    early_discount_eligible: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    # ── DP status ────────────────────────────────────────────────────────────
    # dp_status: pending | paid
    dp_status: Mapped[str] = mapped_column(String(20), default="pending")
    dp_paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE")
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[str | None] = mapped_column(String(500))
    entity_type: Mapped[str | None] = mapped_column(String(50))
    entity_id: Mapped[str | None] = mapped_column(String(50))
    data: Mapped[bytes | None] = mapped_column(
        LargeBinary(length=16777215), deferred=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# PPDB Payment Transactions (Formulir Pendaftaran)
# ─────────────────────────────────────────────────────────────────────────────


class PPDBPaymentTransaction(Base):
    """Rekam jejak setiap transaksi pembayaran formulir PPDB.

    Satu applicant bisa punya lebih dari 1 baris (misal bayar gagal lalu retry).
    Status transaksi:
      pending  → transaksi dibuat, belum ada konfirmasi
      success  → dikonfirmasi (manual admin ATAU webhook PG)
      failed   → PG callback FAILED / DENIED
      expired  → PG callback EXPIRED / tidak dikonfirmasi admin dalam batas waktu
      cancelled → dibatalkan oleh user / admin
    """

    __tablename__ = "ppdb_payment_transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    method: Mapped[str] = mapped_column(String(20), default="offline")
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    external_id: Mapped[str | None] = mapped_column(String(100))
    order_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    txn_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    payment_type: Mapped[str] = mapped_column(String(30), default="form")
    installment_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    qr_string: Mapped[str | None] = mapped_column(Text, nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_obligation: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_paid_before: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remaining_before: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_paid_after: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remaining_after: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    receipt_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gateway_payload: Mapped[str | None] = mapped_column(Text)
    failure_reason: Mapped[str | None] = mapped_column(Text)
    proof_url: Mapped[str | None] = mapped_column(Text)
    confirmed_by: Mapped[str | None] = mapped_column(String(36))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# Notification Templates & Logs
# ─────────────────────────────────────────────────────────────────────────────


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="both")
    email_subject: Mapped[str | None] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    template_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("notification_templates.id", ondelete="SET NULL")
    )
    event_key: Mapped[str] = mapped_column(String(50), nullable=False)
    recipient_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    recipient_name: Mapped[str | None] = mapped_column(String(255))
    recipient_email: Mapped[str | None] = mapped_column(String(100))
    recipient_phone: Mapped[str | None] = mapped_column(String(20))
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    subject_sent: Mapped[str | None] = mapped_column(String(255))
    body_sent: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    error_message: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# Komponen Biaya Periode & Diskon Gelombang
# ─────────────────────────────────────────────────────────────────────────────


class PPDBPeriodFeeItem(Base):
    """Komponen biaya pendidikan/masuk resmi per periode PPDB.

    Mencakup uang pangkal, seragam, SPP, dan komponen lain. Komponen biaya
    didefinisikan satu kali pada level Periode dan berlaku untuk semua gelombang.
    """

    __tablename__ = "ppdb_period_fee_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    period_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWaveFeeDiscount(Base):
    """Konfigurasi diskon per gelombang untuk komponen biaya periode.

    Gelombang hanya mengatur diskon (reguler & pendaftar awal) terhadap
    komponen biaya periode induk.
    """

    __tablename__ = "ppdb_wave_fee_discounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_waves.id", ondelete="CASCADE"), nullable=False
    )
    fee_item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ppdb_period_fee_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    discount_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    discount_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    early_discount_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    early_discount_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWaveFeeItem(Base):
    """Legacy backward-compat: item biaya gelombang."""

    __tablename__ = "ppdb_wave_fee_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_waves.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    discount_type: Mapped[str | None] = mapped_column(String(10))
    discount_value: Mapped[float | None] = mapped_column(Float)
    discount_scope: Mapped[str] = mapped_column(
        String(10), default="all", nullable=False
    )
    early_discount_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    early_discount_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBApplicantDiscount(Base):
    __tablename__ = "ppdb_applicant_discounts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    fee_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_period_fee_items.id", ondelete="CASCADE")
    )
    discount_type: Mapped[str | None] = mapped_column(String(10))
    discount_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    final_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    installment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBStage2Bill(Base):
    __tablename__ = "ppdb_stage2_bills"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    fee_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_period_fee_items.id")
    )
    discount_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ppdb_applicant_discounts.id", ondelete="SET NULL")
    )
    installment_number: Mapped[int] = mapped_column(Integer, default=0)
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    proof_url: Mapped[str | None] = mapped_column(Text)
    confirmed_by: Mapped[str | None] = mapped_column(String(36))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
