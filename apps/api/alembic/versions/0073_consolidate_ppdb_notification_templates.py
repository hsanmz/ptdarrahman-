"""Consolidate duplicate PPDB payment-expiry notifications.

Revision ID: 0073
Revises: 0072
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "0073"
down_revision: str | None = "0072"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM notification_templates "
            "WHERE event_key IN ('account_created', 'wave_closed_pending_payment')"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE notification_templates SET label = :label, "
            "email_subject = :subject, body = :body, updated_at = :updated "
            "WHERE event_key = 'payment_expired'"
        ),
        {
            "label": "Pembayaran Formulir Kedaluwarsa",
            "subject": "Pembayaran Formulir Kedaluwarsa",
            "body": (
                "Halo {nama_peserta},\n\n"
                "Tagihan pembayaran formulir Anda telah kedaluwarsa dan "
                "dibatalkan. Tagihan ini tidak dapat dibayar lagi. Silakan "
                "mendaftar kembali jika gelombang berikutnya tersedia.\n\n"
                "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan "
                "Digital Ar-Rahman"
            ),
            "updated": datetime.utcnow(),
        },
    )
    existing_broadcast = bind.execute(
        sa.text(
            "SELECT id FROM notification_templates "
            "WHERE event_key = 'selection_session_broadcast'"
        )
    ).first()
    if not existing_broadcast:
        now = datetime.utcnow()
        bind.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) "
                "VALUES (:id, :event_key, :label, 'whatsapp', NULL, :body, TRUE, "
                ":created_at, :updated_at)"
            ),
            {
                "id": str(uuid4()),
                "event_key": "selection_session_broadcast",
                "label": "Informasi Tambahan Sesi Seleksi",
                "body": (
                    "Halo {nama_peserta},\n\n"
                    "Informasi untuk sesi {session_name}:\n{custom_message}\n\n"
                    "Terima kasih,\nPanitia PPDB PTDARRAHMAN"
                ),
                "created_at": now,
                "updated_at": now,
            },
        )


def downgrade() -> None:
    # Deleted duplicate templates are intentionally not recreated: their
    # separate event paths have been consolidated into payment_expired.
    pass
