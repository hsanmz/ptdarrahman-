"""Remove SKD artifacts and align PPDB notification templates.

Revision ID: 0056
Revises: 0055
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0056"
down_revision: str | None = "0055"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LOA_EVENT_KEY = "loa_signed"
LOA_LABEL = "LoA Ditandatangani — PPDB Selesai"
LOA_BODY = (
    "✅ *LOA BERHASIL DITANDATANGANI*\n\n"
    "Halo *{nama_peserta}*, LoA Anda telah ditandatangani oleh orang tua/wali. "
    "Alur pendaftaran PPDB Anda telah selesai. Silakan simpan LoA pada dashboard: "
    "{link_aplikasi}"
)
DOCS_EVENT_KEY = "reminder_upload_docs_h3"
DOCS_LABEL = "Pengingat Submit Dokumen H+3"
DOCS_BODY = (
    "🔔 *PENGINGAT SUBMIT DOKUMEN*\n\n"
    "Halo *{nama_peserta}*, pembayaran formulir Anda telah berhasil, tetapi Anda "
    "belum submit dokumen apa pun. Silakan submit dokumen melalui dashboard: "
    "{link_aplikasi}"
)


def _upsert_template(event_key: str, label: str, body: str, template_id: str) -> None:
    conn = op.get_bind()
    existing = conn.execute(
        sa.text("SELECT id FROM notification_templates WHERE event_key = :event_key"),
        {"event_key": event_key},
    ).first()
    values = {"event_key": event_key, "label": label, "body": body}
    if existing:
        conn.execute(
            sa.text(
                "UPDATE notification_templates SET label = :label, channel = 'whatsapp', "
                "email_subject = NULL, body = :body, is_active = 1, "
                "updated_at = CURRENT_TIMESTAMP WHERE event_key = :event_key"
            ),
            values,
        )
    else:
        conn.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) VALUES (:id, :event_key, :label, 'whatsapp', "
                "NULL, :body, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {**values, "id": template_id},
        )


def upgrade() -> None:
    conn = op.get_bind()
    _upsert_template(
        LOA_EVENT_KEY,
        LOA_LABEL,
        LOA_BODY,
        "notiftmpl-0056-loa-signed",
    )
    _upsert_template(
        DOCS_EVENT_KEY,
        DOCS_LABEL,
        DOCS_BODY,
        "notiftmpl-0056-docs-h3",
    )

    # Remove the retired event and any stale template that still describes SKD.
    conn.execute(
        sa.text(
            "DELETE FROM notification_templates WHERE event_key <> :keep_key "
            "AND (LOWER(event_key) LIKE '%skd%' OR LOWER(label) LIKE '%skd%' "
            "OR LOWER(body) LIKE '%skd%')"
        ),
        {"keep_key": LOA_EVENT_KEY},
    )

    inspector = sa.inspect(conn)
    if inspector.has_table("pages"):
        columns = {column["name"] for column in inspector.get_columns("pages")}
        if {"key", "label"}.issubset(columns):
            pages = sa.Table("pages", sa.MetaData(), autoload_with=conn)
            conn.execute(
                pages.update()
                .where(
                    pages.c.key == "pengumuman",
                    sa.func.lower(pages.c.label).like("%skd%"),
                )
                .values(label="Preview LoA")
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM notification_templates WHERE event_key = :event_key"),
        {"event_key": LOA_EVENT_KEY},
    )
