"""Create the structured CMS table for the About page.

Revision ID: 0064
Revises: 0063
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0064"
down_revision: str | None = "0063"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_NAME = "about_content"


def upgrade() -> None:
    bind = op.get_bind()
    if TABLE_NAME in sa.inspect(bind).get_table_names():
        return

    op.create_table(
        TABLE_NAME,
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("section", sa.String(length=50), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if TABLE_NAME in sa.inspect(bind).get_table_names():
        op.drop_table(TABLE_NAME)
