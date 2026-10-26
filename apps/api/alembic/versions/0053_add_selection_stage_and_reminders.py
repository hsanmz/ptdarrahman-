# mypy: ignore-errors
"""Add stage tracking to selection_results and exam schedules, and seed H-2 & H-1 reminder templates.

Revision ID: 0053
Revises: 0052
Create Date: 2026-10-26
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0053"
down_revision: str | None = "0052"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    columns = [c["name"] for c in insp.get_columns(table)]
    return column in columns


def _table_exists(table: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return table in insp.get_table_names()


def upgrade() -> None:
    conn = op.get_bind()

    if _table_exists("ppdb_exam_schedules"):
        if not _column_exists("ppdb_exam_schedules", "batch_name"):
            op.add_column(
                "ppdb_exam_schedules",
                sa.Column("batch_name", sa.String(50), nullable=True),
            )

    if _table_exists("selection_results"):
        if not _column_exists("selection_results", "batch_name"):
            op.add_column(
                "selection_results",
                sa.Column("batch_name", sa.String(50), nullable=True, index=True),
            )
        if not _column_exists("selection_results", "current_stage"):
            op.add_column(
                "selection_results",
                sa.Column("current_stage", sa.Integer(), nullable=False, server_default="0"),
            )
        if not _column_exists("selection_results", "last_stage_sent_at"):
            op.add_column(
                "selection_results",
                sa.Column("last_stage_sent_at", sa.DateTime(), nullable=True),
            )

    # Seed reminder_exam_h2 & reminder_exam_h1 templates if missing
    if _table_exists("notification_templates"):
        templates = [
            (
                "notiftmpl-1021-reminder-exam-h2",
                "reminder_exam_h2",
                "Pengingat Jadwal Seleksi H-2",
                "whatsapp",
                "🔔 *PENGINGAT JADWAL SELEKSI (H-2)*\n\nHalo *{nama_peserta}*,\nMengingatkan kembali bahwa Ujian/Seleksi *{nama_ujian}* Anda akan dilaksanakan dalam *2 hari lagi*:\n\n📆 Tanggal: *{tanggal}*\n⏰ Waktu: *{waktu}*\n📍 Lokasi/Link: *{lokasi_atau_link}*\n\nMohon persiapkan diri dan perangkat Anda dengan baik. Informasi detail dapat dilihat di: {link_aplikasi}",
            ),
            (
                "notiftmpl-1022-reminder-exam-h1",
                "reminder_exam_h1",
                "Pengingat Jadwal Seleksi H-1 (Besok)",
                "whatsapp",
                "🔔 *PENGINGAT JADWAL SELEKSI (H-1 / BESOK)*\n\nHalo *{nama_peserta}*,\nBesok adalah hari pelaksanaan Ujian/Seleksi *{nama_ujian}* Anda:\n\n📆 Tanggal: *{tanggal}*\n⏰ Waktu: *{waktu}*\n📍 Lokasi/Link: *{lokasi_atau_link}*\n\nHarap hadir/bergabung 15 menit sebelum waktu yang ditentukan. Semoga diberikan kelancaran dan kemudahan!",
            ),
        ]

        for tid, ek, label, ch, body in templates:
            exists = conn.execute(
                sa.text("SELECT 1 FROM notification_templates WHERE event_key = :ek"),
                {"ek": ek},
            ).first()
            if not exists:
                conn.execute(
                    sa.text(
                        "INSERT INTO notification_templates "
                        "(id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at) "
                        "VALUES (:id, :ek, :lb, :ch, NULL, :bd, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                    ),
                    {"id": tid, "ek": ek, "lb": label, "ch": ch, "bd": body},
                )


def downgrade() -> None:
    if _table_exists("selection_results"):
        if _column_exists("selection_results", "last_stage_sent_at"):
            op.drop_column("selection_results", "last_stage_sent_at")
        if _column_exists("selection_results", "current_stage"):
            op.drop_column("selection_results", "current_stage")
        if _column_exists("selection_results", "batch_name"):
            op.drop_column("selection_results", "batch_name")

    if _table_exists("ppdb_exam_schedules"):
        if _column_exists("ppdb_exam_schedules", "batch_name"):
            op.drop_column("ppdb_exam_schedules", "batch_name")
