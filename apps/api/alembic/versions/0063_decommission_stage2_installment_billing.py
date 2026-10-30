"""Decommission Stage 2 installment billing system.

Permanently removes legacy Tagihan Tahap 2 tables (ppdb_stage2_bills,
ppdb_applicant_discounts), associated page permissions (pembayaran-tahap2,
stage2-pembayaran), and legacy stage 2 notification remnants.

Revision ID: 0063
Revises: 0062
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0063"
down_revision: str | None = "0062"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_names(conn: sa.Connection) -> set[str]:
    return set(sa.inspect(conn).get_table_names())


def upgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    # 1. Drop ppdb_stage2_bills if exists
    if "ppdb_stage2_bills" in tables:
        inspector = sa.inspect(conn)
        fks = inspector.get_foreign_keys("ppdb_stage2_bills")
        for fk in fks:
            fk_name = fk.get("name")
            if fk_name:
                try:
                    with op.batch_alter_table("ppdb_stage2_bills") as batch:
                        batch.drop_constraint(fk_name, type_="foreignkey")
                except Exception:
                    pass
        op.drop_table("ppdb_stage2_bills")

    # 2. Drop ppdb_applicant_discounts if exists
    if "ppdb_applicant_discounts" in tables:
        inspector = sa.inspect(conn)
        fks = inspector.get_foreign_keys("ppdb_applicant_discounts")
        for fk in fks:
            fk_name = fk.get("name")
            if fk_name:
                try:
                    with op.batch_alter_table("ppdb_applicant_discounts") as batch:
                        batch.drop_constraint(fk_name, type_="foreignkey")
                except Exception:
                    pass
        op.drop_table("ppdb_applicant_discounts")

    # 3. Clean up legacy page permissions
    legacy_page_names = ("pembayaran-tahap2", "stage2-pembayaran")
    try:
        conn.execute(
            sa.text(
                """
                DELETE FROM user_page_permissions
                WHERE page_id IN (
                    SELECT id FROM pages WHERE name IN :page_names
                )
                """
            ).bindparams(sa.bindparam("page_names", value=legacy_page_names, expanding=True))
        )
    except Exception:
        pass

    try:
        conn.execute(
            sa.text(
                """
                DELETE FROM role_page_permissions
                WHERE page_id IN (
                    SELECT id FROM pages WHERE name IN :page_names
                )
                """
            ).bindparams(sa.bindparam("page_names", value=legacy_page_names, expanding=True))
        )
    except Exception:
        pass

    try:
        conn.execute(
            sa.text(
                """
                DELETE FROM pages
                WHERE name IN :page_names
                """
            ).bindparams(sa.bindparam("page_names", value=legacy_page_names, expanding=True))
        )
    except Exception:
        pass

    # 4. Clean up any leftover notification templates
    legacy_events = (
        "stage2_installment_success",
        "reminder_installment",
        "dp_payment_reminder",
        "dp_payment_success",
    )
    try:
        conn.execute(
            sa.text(
                """
                DELETE FROM notification_templates
                WHERE event_key IN :event_keys
                """
            ).bindparams(sa.bindparam("event_keys", value=legacy_events, expanding=True))
        )
    except Exception:
        pass


def downgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    # Re-create ppdb_applicant_discounts if missing
    if "ppdb_applicant_discounts" not in tables:
        op.create_table(
            "ppdb_applicant_discounts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("applicant_id", sa.String(64), nullable=False),
            sa.Column("fee_item_id", sa.String(36), nullable=False),
            sa.Column("discount_type", sa.String(10), nullable=True),
            sa.Column("discount_value", sa.Float(), nullable=True),
            sa.Column("discount_amount", sa.BigInteger(), server_default="0", nullable=False),
            sa.Column("final_amount", sa.BigInteger(), server_default="0", nullable=False),
            sa.Column("installment_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    # Re-create ppdb_stage2_bills if missing
    if "ppdb_stage2_bills" not in tables:
        op.create_table(
            "ppdb_stage2_bills",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("applicant_id", sa.String(64), nullable=False),
            sa.Column("fee_item_id", sa.String(36), nullable=False),
            sa.Column("discount_id", sa.String(36), nullable=True),
            sa.Column("installment_number", sa.Integer(), server_default="0", nullable=False),
            sa.Column("amount", sa.BigInteger(), server_default="0", nullable=False),
            sa.Column("due_date", sa.Date(), nullable=True),
            sa.Column("status", sa.String(20), server_default="pending", nullable=False),
            sa.Column("proof_url", sa.Text(), nullable=True),
            sa.Column("confirmed_by", sa.String(36), nullable=True),
            sa.Column("confirmed_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
