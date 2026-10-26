# mypy: ignore-errors
"""Remove TIU artifacts and the registration path feature.

The TIU (Tes Intelegensi Umum) flow and the per-applicant
``registration_path`` selection are removed entirely from the product:

- drop ``ppdb_tiu_attempts`` (SEB attempt tickets)
- drop ``tiu_results`` (legacy automatic TIU scores, if still present)
- drop ``ppdb_applicants.registration_path``
- drop ``ppdb_waves.allowed_paths``
- delete TIU notification templates and reseed ``document_approved``
- delete the ``tiu-settings`` RBAC page (cascade removes page permissions)
- delete ``site_settings`` rows with ``ppdb_tiu_%`` keys

Revision ID: 0048
Revises: 0047
Create Date: 2026-10-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

# ruff: noqa: E501

from alembic import op

revision: str = "0048"
down_revision: str | None = "0047"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TIU_TEMPLATE_EVENTS = (
    "document_approved_non_tiu",
    "tiu_exam_instructions",
    "tiu_result_ready",
)

SITE_SETTING_KEYS = [
    "ppdb_tiu_google_form_url",
    "ppdb_tiu_duration_minutes",
    "ppdb_tiu_webhook_secret",
    "ppdb_tiu_sync_status",
    "ppdb_tiu_sync_at",
    "ppdb_tiu_sync_error",
    "ppdb_tiu_sync_question_count",
]

# Event pengganti yang dipicu service setelah verifikasi dokumen sukses.
DOCUMENT_APPROVED_TEMPLATE = (
    "notiftmpl-1006-doc-approved",
    "document_approved",
    "Dokumen Disetujui",
    "whatsapp",
    None,
    "✅ *Dokumen Disetujui!*\n\nHalo *{nama_peserta}*,\nAlhamdulillah, seluruh dokumen persyaratan Anda telah *valid dan disetujui*.\n\n📌 *Langkah Selanjutnya:*\nAnda sudah bisa memilih jadwal ujian. Silakan login ke *{link_aplikasi}* dan lakukan *Take Session* untuk *Ujian Tahfidz* sekarang.",
)

# Data restore untuk downgrade (dari 0023), sehingga rollback tetap konsisten.
RESTORED_TIU_TEMPLATES = [
    (
        "notiftmpl-1006-doc-approved-non-tiu",
        "document_approved_non_tiu",
        "Dokumen Disetujui (Jalur Bukan TIU)",
        "whatsapp",
        None,
        "✅ *Dokumen Disetujui!*\n\nHalo *{nama_peserta}*,\nAlhamdulillah, seluruh dokumen persyaratan Anda telah *valid dan disetujui*.\n\n📌 *Langkah Selanjutnya:*\nAnda sudah bisa memilih jadwal ujian. Silakan login ke *{link_aplikasi}* dan lakukan *Take Session* untuk *Ujian Tahfidz* sekarang.",
    ),
    (
        "notiftmpl-1007-tiu-exam-instructions",
        "tiu_exam_instructions",
        "Instruksi Ujian TIU (Jalur TIU)",
        "whatsapp",
        None,
        "✅ *Dokumen Disetujui!*\n\nHalo *{nama_peserta}*,\nAlhamdulillah, dokumen persyaratan Anda telah *valid*.\n\n📝 *Langkah Selanjutnya:*\nSebagai pendaftar jalur TIU, Anda perlu mengerjakan tes satu kali di aplikasi PPDB menggunakan Safe Exam Browser (SEB) pada komputer desktop/laptop Windows atau macOS. Google Form tidak dibuka oleh peserta. Silakan baca panduan instalasi dan penggunaan SEB di *{link_panduan_seb}*, lalu masuk ke dashboard untuk memulai tes.",
    ),
    (
        "notiftmpl-1008-tiu-result-ready",
        "tiu_result_ready",
        "Hasil TIU Tersedia (Webhook Apps Script)",
        "whatsapp",
        None,
        "✅ *HASIL TES TIU TERSEDIA*\n\nHalo *{nama_peserta}*, hasil tes TIU Anda sudah masuk ke sistem.\n\nNilai: *{nilai_tiu}*\n\nSilakan login ke aplikasi PPDB untuk melihat hasil dan tahapan berikutnya: *{link_aplikasi}*",
    ),
]


def _table_exists(name: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return name in insp.get_table_names()


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return False
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    # 1. Drop TIU tables (tiu_results was already dropped in 0046, guard anyway)
    if _table_exists("ppdb_tiu_attempts"):
        op.drop_table("ppdb_tiu_attempts")

    if _table_exists("tiu_results"):
        op.drop_table("tiu_results")

    # 2. Drop the registration-path feature columns
    if _column_exists("ppdb_applicants", "registration_path"):
        op.drop_column("ppdb_applicants", "registration_path")

    if _column_exists("ppdb_waves", "allowed_paths"):
        op.drop_column("ppdb_waves", "allowed_paths")

    # 3. Swap TIU notification templates for the unified document_approved
    conn = op.get_bind()
    for event_key in TIU_TEMPLATE_EVENTS:
        conn.execute(
            text("DELETE FROM notification_templates WHERE event_key = :ek"),
            {"ek": event_key},
        )

    template_id, event_key, label, channel, email_subject, body = (
        DOCUMENT_APPROVED_TEMPLATE
    )
    existing = conn.execute(
        text("SELECT 1 FROM notification_templates WHERE event_key = :ek"),
        {"ek": event_key},
    ).first()
    if not existing:
        conn.execute(
            text(
                "INSERT INTO notification_templates"
                " (id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at)"
                " VALUES (:id, :ek, :lb, :ch, :es, :bd, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": template_id,
                "ek": event_key,
                "lb": label,
                "ch": channel,
                "es": email_subject,
                "bd": body,
            },
        )

    # 4. Remove the global TIU settings page (permissions cascade ondelete)
    if _table_exists("pages"):
        page_ids = conn.execute(
            text("SELECT id FROM pages WHERE `key` = 'tiu-settings'")
        ).fetchall()
        if page_ids:
            if _table_exists("user_page_permissions"):
                for (page_id,) in page_ids:
                    conn.execute(
                        text(
                            "DELETE FROM user_page_permissions WHERE page_id = :pid"
                        ),
                        {"pid": page_id},
                    )
            conn.execute(text("DELETE FROM pages WHERE `key` = 'tiu-settings'"))

    # 5. Remove TIU site settings
    for key in SITE_SETTING_KEYS:
        conn.execute(
            text("DELETE FROM site_settings WHERE `key` = :k"),
            {"k": key},
        )


def downgrade() -> None:
    """Rollback darurat: pulihkan tipe data, kolom, dan template minimal."""
    if not _table_exists("ppdb_tiu_attempts"):
        op.create_table(
            "ppdb_tiu_attempts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "applicant_id",
                sa.String(64),
                sa.ForeignKey("ppdb_applicants.id", ondelete="CASCADE"),
            ),
            sa.Column("token", sa.String(100), nullable=False, unique=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index(
            "ix_ppdb_tiu_attempts_token", "ppdb_tiu_attempts", ["token"], unique=True
        )

    if not _column_exists("ppdb_applicants", "registration_path"):
        op.add_column(
            "ppdb_applicants",
            sa.Column(
                "registration_path",
                sa.String(32),
                nullable=False,
                server_default="reguler",
            ),
        )

    if not _column_exists("ppdb_waves", "allowed_paths"):
        op.add_column(
            "ppdb_waves",
            sa.Column("allowed_paths", sa.String(255), nullable=True),
        )

    conn = op.get_bind()
    if _table_exists("notification_templates"):
        for tid, event_key, label, channel, email_subject, body in RESTORED_TIU_TEMPLATES:
            exists = conn.execute(
                text("SELECT 1 FROM notification_templates WHERE event_key = :ek"),
                {"ek": event_key},
            ).first()
            if not exists:
                conn.execute(
                    text(
                        "INSERT INTO notification_templates"
                        " (id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at)"
                        " VALUES (:id, :ek, :lb, :ch, :es, :bd, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                    ),
                    {
                        "id": tid,
                        "ek": event_key,
                        "lb": label,
                        "ch": channel,
                        "es": email_subject,
                        "bd": body,
                    },
                )
