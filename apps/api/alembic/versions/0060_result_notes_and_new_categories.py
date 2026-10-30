"""Catatan hasil per seleksi + kategori hasil baru (bersyarat & cadangan).

Revision ID: 0060
Revises: 0058
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0060"
down_revision: str | None = "0059"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NOTE_COLUMNS = (
    "notes_akademik",
    "notes_psikologi",
    "notes_tahfidz",
    "notes_wawancara",
)

TEMPLATES = (
    (
        "registration_result_conditional",
        "Hasil Pendaftaran: Diterima Bersyarat",
        "📋 *HASIL PENDAFTARAN: DITERIMA BERSYARAT*\n\n"
        "Halo *{nama_peserta}*, berdasarkan keputusan panitia PPDB "
        "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman, hasil pendaftaran "
        "Anda saat ini *DITERIMA BERSYARAT*.\n\n"
        "Catatan panitia: {catatan}\n\n"
        "Silakan hubungi panitia untuk penjelasan syarat berkelanjutan dan "
        "pantau laman Hasil Pendaftaran: {link_aplikasi}",
    ),
    (
        "registration_result_waitlist",
        "Hasil Pendaftaran: Cadangan",
        "📌 *HASIL PENDAFTARAN: CADANGAN*\n\n"
        "Halo *{nama_peserta}*, berdasarkan keputusan panitia PPDB "
        "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman, Anda masuk "
        "dalam daftar *CADANGAN*.\n\n"
        "Catatan panitia: {catatan}\n\n"
        "Status bisa naik menjadi Diterima apabila terjadi kuota; "
        "pantau laman Hasil Pendaftaran: {link_aplikasi}",
    ),
)


def _upsert_template(event_key: str, label: str, body: str) -> None:
    conn = op.get_bind()
    existing = conn.execute(
        sa.text("SELECT id FROM notification_templates WHERE event_key = :event_key"),
        {"event_key": event_key},
    ).first()
    if existing:
        conn.execute(
            sa.text(
                "UPDATE notification_templates "
                "SET label = :label, channel = 'whatsapp', email_subject = NULL, "
                "body = :body, is_active = 1, "
                "updated_at = CURRENT_TIMESTAMP WHERE event_key = :event_key"
            ),
            {"event_key": event_key, "label": label, "body": body},
        )
    else:
        conn.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) VALUES "
                "(:id, :event_key, :label, 'whatsapp', NULL, :body, 1, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": f"notiftmpl-0059-{event_key}",
                "event_key": event_key,
                "label": label,
                "body": body,
            },
        )


def upgrade() -> None:
    for column in NOTE_COLUMNS:
        op.add_column(
            "selection_results",
            sa.Column(column, sa.Text(), nullable=True),
        )

    for event_key, label, body in TEMPLATES:
        _upsert_template(event_key, label, body)


def downgrade() -> None:
    op.execute(
        "DELETE FROM notification_templates WHERE event_key IN "
        "('registration_result_conditional', 'registration_result_waitlist')"
    )
    for column in reversed(NOTE_COLUMNS):
        op.drop_column("selection_results", column)
