"""Create the editable homepage About preview block.

Revision ID: 0067
Revises: 0066
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import datetime
import sqlalchemy as sa
from alembic import op

revision: str = "0067"
down_revision: str | None = "0066"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULT_IMAGES = [
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop",
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "about_content" not in inspector.get_table_names():
        return

    about = sa.Table("about_content", sa.MetaData(), autoload_with=bind)
    exists = bind.execute(
        sa.select(about.c.id).where(about.c.section == "home-preview")
    ).first()
    if exists:
        return

    about_text = None
    if "site_settings" in inspector.get_table_names():
        settings = sa.Table("site_settings", sa.MetaData(), autoload_with=bind)
        about_text = bind.execute(
            sa.select(settings.c.value).where(settings.c.key == "about_text")
        ).scalar()

    content = {
        "badge": "SIAPA KAMI",
        "title": "Lima Tahun Melahirkan Generasi Unggul",
        "body": about_text or (
            "Sejak 2021, Ar-Rahman telah menjadi pelopor model pendidikan unik "
            "yang mengintegrasikan kebijaksanaan abadi Al-Quran dengan teknologi "
            "digital mutakhir. Kami tidak hanya mengajar — kami menginspirasi "
            "generasi pemimpin yang kokoh secara spiritual dan kompetitif secara global."
        ),
        "image_1": DEFAULT_IMAGES[0],
        "image_2": DEFAULT_IMAGES[1],
        "image_3": DEFAULT_IMAGES[2],
        "image_4": DEFAULT_IMAGES[3],
        "value_1_icon": "book-open",
        "value_1_title": "Al-Quran Utama",
        "value_1_description": "Al-Quran menjadi fondasi setiap proses pendidikan.",
        "value_2_icon": "cpu",
        "value_2_title": "Berbasis Teknologi",
        "value_2_description": "Santri dibekali keterampilan teknologi yang relevan.",
        "value_3_icon": "heart",
        "value_3_title": "Berbasis Karakter",
        "value_3_description": "Akhlak dan karakter dibentuk dalam keseharian santri.",
    }
    now = datetime.now()
    bind.execute(
        about.insert().values(
            id="about-home-preview",
            section="home-preview",
            order=0,
            content=json.dumps(content, ensure_ascii=False),
            created_at=now,
            updated_at=now,
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "about_content" not in sa.inspect(bind).get_table_names():
        return
    about = sa.table("about_content", sa.column("id", sa.String()))
    bind.execute(sa.delete(about).where(about.c.id == "about-home-preview"))
