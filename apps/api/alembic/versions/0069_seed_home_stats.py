"""Seed homepage statistics into the editable About preview block.

Revision ID: 0069
Revises: 0068
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0069"
down_revision: str | None = "0068"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULT_STATS = {
    "stat_1_value": 350,
    "stat_1_suffix": "+",
    "stat_1_label": "Santri Aktif",
    "stat_2_value": 40,
    "stat_2_suffix": "+",
    "stat_2_label": "Guru & Staff",
    "stat_3_value": 30,
    "stat_3_suffix": " Juz",
    "stat_3_label": "Hafalan Al-Quran",
    "stat_4_value": 15,
    "stat_4_suffix": "+",
    "stat_4_label": "Ekstrakurikuler",
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "about_content" not in inspector.get_table_names():
        return

    about = sa.Table("about_content", sa.MetaData(), autoload_with=bind)
    row = bind.execute(
        sa.select(about.c.id, about.c.content).where(about.c.section == "home-preview")
    ).mappings().first()
    if not row:
        return

    raw_content = row["content"]
    try:
        content = json.loads(raw_content) if isinstance(raw_content, str) else dict(raw_content or {})
    except (TypeError, ValueError):
        content = {}

    changed = False
    for key, value in DEFAULT_STATS.items():
        if key not in content or content[key] in (None, ""):
            content[key] = value
            changed = True

    if changed:
        bind.execute(
            about.update()
            .where(about.c.id == row["id"])
            .values(content=json.dumps(content, ensure_ascii=False), updated_at=datetime.now())
        )


def downgrade() -> None:
    bind = op.get_bind()
    if "about_content" not in sa.inspect(bind).get_table_names():
        return
    about = sa.Table("about_content", sa.MetaData(), autoload_with=bind)
    row = bind.execute(
        sa.select(about.c.id, about.c.content).where(about.c.section == "home-preview")
    ).mappings().first()
    if not row:
        return

    try:
        content = json.loads(row["content"] or "{}")
    except (TypeError, ValueError):
        return
    for key in DEFAULT_STATS:
        content.pop(key, None)
    bind.execute(
        about.update()
        .where(about.c.id == row["id"])
        .values(content=json.dumps(content, ensure_ascii=False), updated_at=datetime.now())
    )
