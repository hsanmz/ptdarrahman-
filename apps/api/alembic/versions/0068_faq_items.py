"""Add dynamic FAQ content for the company profile website.

Revision ID: 0068
Revises: 0067
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "0068"
down_revision: str | None = "0067"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "faq_items" not in inspector.get_table_names():
        op.create_table(
            "faq_items",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("question", sa.Text(), nullable=False),
            sa.Column("answer", sa.Text(), nullable=False),
            sa.Column("category", sa.String(100), nullable=True),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        inspector = sa.inspect(bind)
    if (
        "pages" not in inspector.get_table_names()
        or "modules" not in inspector.get_table_names()
    ):
        return
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    modules = sa.Table("modules", sa.MetaData(), autoload_with=bind)
    module_id = bind.execute(
        sa.select(modules.c.id).where(modules.c.key == "companyprofile")
    ).scalar()
    if not module_id:
        return
    exists = bind.execute(
        sa.select(pages.c.id).where(
            pages.c.module_id == module_id,
            pages.c.key == "faq",
        )
    ).first()
    if exists:
        return
    now = datetime.now()
    bind.execute(
        pages.insert().values(
            id=str(uuid4()),
            module_id=module_id,
            key="faq",
            label="FAQ",
            icon="HelpCircle",
            sort_order=45,
            has_crud=True,
            created_at=now,
            updated_at=now,
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    if (
        "pages" in sa.inspect(bind).get_table_names()
        and "modules" in sa.inspect(bind).get_table_names()
    ):
        pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
        modules = sa.Table("modules", sa.MetaData(), autoload_with=bind)
        module_id = bind.execute(
            sa.select(modules.c.id).where(modules.c.key == "companyprofile")
        ).scalar()
        if module_id:
            bind.execute(
                sa.delete(pages).where(
                    pages.c.module_id == module_id, pages.c.key == "faq"
                )
            )
    # The table may have been created by SQLAlchemy metadata.create_all before
    # this revision ran. Preserve that pre-existing table and its contents.
