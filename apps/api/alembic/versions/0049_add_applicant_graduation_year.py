# mypy: ignore-errors
"""Add graduation_year to ppdb_applicants table.

Revision ID: 0049
Revises: 0048
Create Date: 2026-10-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0049"
down_revision: str | None = "0048"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return False
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("ppdb_applicants", "graduation_year"):
        op.add_column(
            "ppdb_applicants",
            sa.Column("graduation_year", sa.String(10), nullable=True),
        )


def downgrade() -> None:
    if _column_exists("ppdb_applicants", "graduation_year"):
        op.drop_column("ppdb_applicants", "graduation_year")
