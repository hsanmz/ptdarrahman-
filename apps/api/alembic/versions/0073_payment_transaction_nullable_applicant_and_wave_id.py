"""Allow nullable applicant_id and add wave_id to ppdb_payment_transactions

Revision ID: 0073
Revises: 0072
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0073"
down_revision: str | None = "0072"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "ppdb_payment_transactions" not in existing_tables:
        return

    cols = {c["name"] for c in inspector.get_columns("ppdb_payment_transactions")}

    # 1. Tambah wave_id jika belum ada
    if "wave_id" not in cols:
        if bind.dialect.name == "sqlite":
            with op.batch_alter_table("ppdb_payment_transactions") as batch:
                batch.add_column(
                    sa.Column(
                        "wave_id",
                        sa.String(50),
                        sa.ForeignKey("ppdb_waves.id", ondelete="SET NULL"),
                        nullable=True,
                    )
                )
        else:
            op.add_column(
                "ppdb_payment_transactions",
                sa.Column("wave_id", sa.String(50), nullable=True),
            )
            op.create_index(
                "ix_ppdb_payment_transactions_wave_id",
                "ppdb_payment_transactions",
                ["wave_id"],
            )

    # 2. Backfill wave_id dari applicant untuk transaksi yang sudah ada
    if "ppdb_applicants" in existing_tables:
        try:
            if bind.dialect.name == "mysql":
                bind.execute(
                    sa.text(
                        "UPDATE ppdb_payment_transactions t "
                        "JOIN ppdb_applicants a ON t.applicant_id = a.id "
                        "SET t.wave_id = a.wave_id "
                        "WHERE t.wave_id IS NULL AND t.applicant_id IS NOT NULL"
                    )
                )
            else:
                bind.execute(
                    sa.text(
                        "UPDATE ppdb_payment_transactions "
                        "SET wave_id = (SELECT wave_id FROM ppdb_applicants "
                        "WHERE ppdb_applicants.id = "
                        "ppdb_payment_transactions.applicant_id) "
                        "WHERE wave_id IS NULL AND applicant_id IS NOT NULL"
                    )
                )
        except Exception:
            pass

    # 3. Ubah applicant_id menjadi nullable & ondelete="SET NULL"
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("ppdb_payment_transactions") as batch:
            batch.alter_column(
                "applicant_id",
                type_=sa.String(64),
                nullable=True,
            )
    elif bind.dialect.name == "mysql":
        # Drop foreign key lama
        fks = inspector.get_foreign_keys("ppdb_payment_transactions")
        for fk in fks:
            if fk.get(
                "referred_table"
            ) == "ppdb_applicants" and "applicant_id" in fk.get(
                "constrained_columns", []
            ):
                fk_name = fk["name"]
                op.execute(
                    sa.text(
                        f"ALTER TABLE ppdb_payment_transactions "
                        f"DROP FOREIGN KEY `{fk_name}`"
                    )
                )

        # Ubah column menjadi nullable
        op.alter_column(
            "ppdb_payment_transactions",
            "applicant_id",
            type_=sa.String(64),
            nullable=True,
        )

        # Re-create FK dengan ondelete="SET NULL"
        op.create_foreign_key(
            "fk_ppdb_payment_transactions_applicant_id",
            "ppdb_payment_transactions",
            "ppdb_applicants",
            ["applicant_id"],
            ["id"],
            ondelete="SET NULL",
        )

        # Buat FK wave_id jika belum ada
        wave_fks = [
            fk
            for fk in inspector.get_foreign_keys("ppdb_payment_transactions")
            if fk.get("referred_table") == "ppdb_waves"
            and "wave_id" in fk.get("constrained_columns", [])
        ]
        if not wave_fks and "ppdb_waves" in existing_tables:
            op.create_foreign_key(
                "fk_ppdb_payment_transactions_wave_id",
                "ppdb_payment_transactions",
                "ppdb_waves",
                ["wave_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    pass
