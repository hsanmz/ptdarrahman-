# mypy: ignore-errors
"""Add batch_name to selection_sessions and interview_parent_session_id to selection_results.

Revision ID: 0052
Revises: 0051
Create Date: 2026-10-26
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0052"
down_revision: str | None = "0051"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    columns = [c["name"] for c in insp.get_columns(table)]
    return column in columns


def upgrade() -> None:
    if not _column_exists("selection_sessions", "batch_name"):
        op.add_column(
            "selection_sessions",
            sa.Column("batch_name", sa.String(50), nullable=True),
        )

    if not _column_exists("selection_results", "interview_parent_session_id"):
        op.add_column(
            "selection_results",
            sa.Column("interview_parent_session_id", sa.String(36), nullable=True, index=True),
        )


def downgrade() -> None:
    if _column_exists("selection_results", "interview_parent_session_id"):
        op.drop_column("selection_results", "interview_parent_session_id")

    if _column_exists("selection_sessions", "batch_name"):
        op.drop_column("selection_sessions", "batch_name")
