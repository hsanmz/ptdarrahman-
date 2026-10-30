"""Migrasi lengkap 0046: gabungkan drop dead tables/columns + buat core_values + badge hero_slides.

Revision ID: 0046
Revises: 0045
Create Date: 2026-10-23

Menggabungkan:
- 0046_add_core_values_and_hero_badge.py
- 0046_drop_dead_tables_and_columns.py

agar tidak menciptakan multiple heads di Alembic.
"""

from collections.abc import Sequence

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


def _table_exists(name: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return name in insp.get_table_names()


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return False
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    # ── Bagian 1: Drop dead tables & columns (dari 0046_drop_dead_tables_and_columns) ──
    if _table_exists("rate_limits"):
        op.drop_table("rate_limits")

    if _table_exists("tiu_results"):
        op.drop_table("tiu_results")

    if _column_exists("ppdb_waves", "start_date"):
        op.drop_column("ppdb_waves", "start_date")

    if _column_exists("ppdb_waves", "end_date"):
        op.drop_column("ppdb_waves", "end_date")

    if _column_exists("users", "profile"):
        op.drop_column("users", "profile")

    if _table_exists("pages"):
        op.execute(
            sa.text(
                "DELETE FROM pages WHERE `key` IN "
                "('mou', 'diskonasi', 'applicants', 'document-settings')"
            )
        )

    # ── Bagian 2: Core values + hero badge (dari 0046_add_core_values_and_hero_badge) ──
    # 1. Tambah kolom badge ke hero_slides (hanya jika belum ada)
    if not _column_exists("hero_slides", "badge_text"):
        op.add_column("hero_slides", sa.Column("badge_text", sa.String(100), nullable=True, server_default=None))
    if not _column_exists("hero_slides", "badge_year"):
        op.add_column("hero_slides", sa.Column("badge_year", sa.String(10), nullable=True, server_default=None))
    # Set default badge on rows that don't have one
    op.execute("UPDATE hero_slides SET badge_text = 'Penghargaan Nasional' WHERE badge_text IS NULL OR badge_text = ''")

    # 2. Buat tabel core_values + seed (hanya jika belum ada)
    if not _table_exists(TABLE_CORE_VALUES):
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
            sa.text(
                f"INSERT IGNORE INTO site_settings (`key`, value, created_at, updated_at)"
                f" VALUES (:k, :v, NOW(), NOW())"
            ).bindparams(k=key, v=value)
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

    # 4. Re-add columns (drop bagian)
    if not _column_exists("users", "profile"):
        op.add_column("users", sa.Column("profile", sa.Text(), nullable=True))

    if not _column_exists("ppdb_waves", "start_date"):
        op.add_column("ppdb_waves", sa.Column("start_date", sa.Date(), nullable=True))

    if not _column_exists("ppdb_waves", "end_date"):
        op.add_column("ppdb_waves", sa.Column("end_date", sa.Date(), nullable=True))

    if not _table_exists("rate_limits"):
        op.create_table(
            "rate_limits",
            sa.Column("key", sa.String(255), primary_key=True),
            sa.Column("timestamp", sa.BigInteger(), primary_key=True),
        )

    if not _table_exists("tiu_results"):
        op.create_table(
            "tiu_results",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "applicant_id",
                sa.String(64),
                sa.ForeignKey("ppdb_applicants.id", ondelete="CASCADE"),
                unique=True,
            ),
            sa.Column("attempt_id", sa.String(64), unique=True, nullable=True),
            sa.Column("idempotency_key", sa.String(200), unique=True, nullable=False),
            sa.Column("score", sa.Float(), nullable=False),
            sa.Column("completed_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
