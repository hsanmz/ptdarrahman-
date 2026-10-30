"""Migrasi lengkap 0046: buat tabel core_values + tambahkan kolom badge ke
hero_slides + tambah setting keys untuk label statistik & hero badge.

Revision ID: 0046
Revises: 0045
Create Date: 2026-10-22

Menggabungkan 0046, 0046b, 0046c menjadi satu migrasi linear agar tidak
menciptakan multiple heads di Alembic.
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0046"
down_revision: str | None = "0045"
branch_labels: str | None = None
depends_on: str | None = None

TABLE_CORE_VALUES = "core_values"

_CATEGORIES = [
    ("quran-centered", "Berpusat Al-Quran", "Al-Quran sebagai fondasi utama pendidikan dan pembentukan karakter", "book-quran"),
    ("tech-innovation", "Inovasi Teknologi", "Menguasai teknologi digital terkini untuk masa depan", "laptop-code"),
    ("global-perspective", "Perspektif Global", "Berwawasan internasional dengan akar budaya yang kuat", "globe"),
    ("character-first", "Karakter Utama", "Akhlak mulia sebagai prioritas sebelum kecerdasan", "heart"),
    ("excellence-oriented", "Orientasi Unggul", "Budaya keunggulan dalam setiap aspek kehidupan", "trophy"),
    ("integrity-rooted", "Berakar Integritas", "Kejujuran dan amanah sebagai nilai hidup", "shield"),
]

NEW_SETTINGS = [
    ("stat_students_label", "Santri Aktif"),
    ("stat_staff_label", "Guru & Staff"),
    ("stat_juz_label", "Hafalan Al-Quran"),
    ("stat_extracurricular_label", "Ekstrakurikuler"),
    ("hero_badge_text", "Penghargaan Nasional"),
    ("hero_badge_year", "2024"),
]


def upgrade() -> None:
    # 1. Tambah kolom badge ke hero_slides
    op.add_column("hero_slides", sa.Column("badge_text", sa.String(100), nullable=True, server_default=None))
    op.add_column("hero_slides", sa.Column("badge_year", sa.String(10), nullable=True, server_default=None))
    op.execute("UPDATE hero_slides SET badge_text = 'Penghargaan Nasional', badge_year = NULL WHERE badge_text IS NULL")

    # 2. Buat tabel core_values + seed
    op.create_table(
        TABLE_CORE_VALUES,
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category_id", sa.String(50), nullable=False, unique=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("icon", sa.String(50), nullable=False, server_default="sparkles"),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    from uuid import uuid4
    from datetime import datetime
    now = datetime.utcnow()
    for idx, (cat_id, title, desc, icon) in enumerate(_CATEGORIES):
        uid = str(uuid4())
        op.execute(
            f"INSERT INTO {TABLE_CORE_VALUES}"
            f" (id, category_id, title, description, icon, `order`, created_at, updated_at)"
            f" VALUES ('{uid}', '{cat_id}', '{title}', '{desc}', '{icon}', {idx}, '{now.isoformat()}', '{now.isoformat()}')"
        )

    # 3. Tambah setting keys baru
    for key, value in NEW_SETTINGS:
        op.execute(
            f"INSERT INTO site_settings (key, value, created_at, updated_at)"
            f" SELECT '{key}', '{value}', datetime('now'), datetime('now')"
            f" WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = '{key}')"
        )


def downgrade() -> None:
    # 1. Hapus setting keys
    for key, _ in NEW_SETTINGS:
        op.execute(sa.text(f"DELETE FROM site_settings WHERE key = :k").bindparams(k=key))

    # 2. Hapus tabel core_values
    op.drop_table(TABLE_CORE_VALUES)

    # 3. Hapus kolom badge hero_slides
    op.drop_column("hero_slides", "badge_text")
    op.drop_column("hero_slides", "badge_year")
