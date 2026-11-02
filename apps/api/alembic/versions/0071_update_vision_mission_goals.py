"""Update vision, mission, and seed official goals for PTDARRAHMAN.

Revision ID: 0071
Revises: 0070
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "0071"
down_revision: str | None = "0070"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_NAME = "about_content"

OFFICIAL_VISION_CONTENT = {
    "eyebrow": "Visi",
    "title": "Visi & Misi",
    "body": (
        "Menjadi Lembaga Pendidikan Terbaik bagi generasi Islam dengan memberikan "
        "penghayatan dan bekal hidup agar dapat berkembang menjadi generasi Islam yang "
        "berakhlak mulia, berkepribadian kuat, memiliki kompetensi hafizh Al-Quran dan IT "
        "serta berjiwa mandiri..."
    ),
}

OFFICIAL_MISSION_CONTENT = {
    "eyebrow": "Misi",
    "title": "MISI KAMI",
    "items": [
        "Menciptakan lingkungan islami, bersih, dan nyaman",
        "Membina akidah lurus, akhlak mulia, dan pribadi tangguh",
        "Mencetak generasi penerus yang hafal Al-Qur'an",
        "Menguasai kecakapan bidang informasi dan teknologi",
    ],
}

OFFICIAL_GOALS_CONTENT = {
    "eyebrow": "Tujuan",
    "title": "TUJUAN KAMI",
    "items": [
        "Membangun peradaban Islam mulia di muka bumi",
        "Menumbuhkan kecintaan pada Allah dan Rasul-Nya",
        "Meningkatkan mutu umat melalui teknologi mutakhir",
        "Mencetak para pemimpin muslim dan penggerak dakwah",
    ],
}


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if TABLE_NAME not in insp.get_table_names():
        return

    now = datetime.utcnow()
    table = sa.table(
        TABLE_NAME,
        sa.column("id", sa.String),
        sa.column("section", sa.String),
        sa.column("order", sa.Integer),
        sa.column("content", sa.Text),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )

    # 1. Update Visi
    bind.execute(
        table.update()
        .where(table.c.section == "vision")
        .values(
            content=json.dumps(OFFICIAL_VISION_CONTENT, ensure_ascii=False),
            updated_at=now,
        )
    )

    # 2. Update Misi
    bind.execute(
        table.update()
        .where(table.c.section == "mission")
        .values(
            content=json.dumps(OFFICIAL_MISSION_CONTENT, ensure_ascii=False),
            updated_at=now,
        )
    )

    # 3. Insert or Update Goals
    existing_goals = bind.execute(
        sa.select(table.c.id).where(table.c.section == "goals")
    ).fetchone()

    if existing_goals:
        bind.execute(
            table.update()
            .where(table.c.section == "goals")
            .values(
                content=json.dumps(OFFICIAL_GOALS_CONTENT, ensure_ascii=False),
                updated_at=now,
            )
        )
    else:
        bind.execute(
            table.insert().values(
                id="about-goals",
                section="goals",
                order=0,
                content=json.dumps(OFFICIAL_GOALS_CONTENT, ensure_ascii=False),
                created_at=now,
                updated_at=now,
            )
        )


def downgrade() -> None:
    pass
