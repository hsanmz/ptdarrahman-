"""Remove obsolete required-document wording from payment success template.

Revision ID: 0057
Revises: 0056
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0057"
down_revision: str | None = "0056"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BODY = (
    "✅ *Pembayaran Formulir Berhasil!*\n\n"
    "Halo *{nama_peserta}*, pembayaran formulir Anda telah kami terima. "
    "Silakan submit dokumen melalui dashboard agar dapat ditinjau panitia: "
    "{link_aplikasi}"
)


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE notification_templates SET body = :body, channel = 'whatsapp', "
            "email_subject = NULL, is_active = 1, updated_at = CURRENT_TIMESTAMP "
            "WHERE event_key = 'payment_success_formulir'"
        ),
        {"body": BODY},
    )


def downgrade() -> None:
    pass
