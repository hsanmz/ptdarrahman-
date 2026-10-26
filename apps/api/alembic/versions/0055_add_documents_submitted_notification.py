"""Add a confirmation when PPDB documents are submitted for review.

Revision ID: 0055
Revises: 0054
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0055"
down_revision: str | None = "0054"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EVENT_KEY = "documents_submitted"
LABEL = "Dokumen Dikirim untuk Verifikasi"
BODY = (
    "📩 *DOKUMEN BERHASIL DIKIRIM*\n\n"
    "Halo *{nama_peserta}*, dokumen Anda sudah dikirim untuk ditinjau panitia. "
    "Pantau status dan informasi revisi melalui dashboard: {link_aplikasi}"
)


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        sa.text("SELECT id FROM notification_templates WHERE event_key = :event_key"),
        {"event_key": EVENT_KEY},
    ).first()
    if exists:
        conn.execute(
            sa.text(
                "UPDATE notification_templates SET label = :label, channel = 'whatsapp', "
                "email_subject = NULL, body = :body, is_active = 1, "
                "updated_at = CURRENT_TIMESTAMP WHERE event_key = :event_key"
            ),
            {"event_key": EVENT_KEY, "label": LABEL, "body": BODY},
        )
    else:
        conn.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) VALUES "
                "('notiftmpl-0055-documents-submitted', :event_key, :label, "
                "'whatsapp', NULL, :body, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {"event_key": EVENT_KEY, "label": LABEL, "body": BODY},
        )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM notification_templates WHERE event_key = :event_key"),
        {"event_key": EVENT_KEY},
    )
