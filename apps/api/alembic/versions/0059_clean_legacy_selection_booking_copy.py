"""Clean legacy 1:1 booking-era copy from RBAC page label and hero slide.

Revision ID: 0059
Revises: 0057
"""

import json
from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa

from alembic import op

revision: str = "0059"
down_revision: str | None = "0058"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Label halaman RBAC warisan era "Take Session" (disemai migrasi 0043). Kunci
# halaman `sessions` tetap dipakai sebagai gate halaman Jadwal Seleksi; hanya
# labelnya yang diperbarui.
PAGE_KEY = "sessions"
PAGE_LABEL_LEGACY = "Session 1:1"
PAGE_LABEL_CURRENT = "Jadwal Seleksi"

# Frasa slide hero beranda warisan (disemai migrasi 0045): alur lama "ujian
# TIU berbasis Safe Exam Browser + penjadwalan uji Tahfidz 1:1" diganti sesuai
# alur terpadu saat ini (CBT Akademik & Psikologi + jadwal seleksi yang
# ditetapkan panitia). Frasa diganti menyeluruh hanya pada baris yang masih
# memuat frasa itu, sehingga slide yang sudah diedit panitia tidak tersentuh.
LEGACY_PHRASES = (
    ("ujian TIU berbasis Safe Exam Browser", "ujian CBT Akademik & Psikologi"),
    (
        "penjadwalan uji Tahfidz 1:1",
        "jadwal seleksi Tahfidz dan Wawancara dari panitia",
    ),
)


def _replace_copy(text: str, mapping: tuple[str, str]) -> str:
    for old, new in mapping:
        if old in text:
            text = text.replace(old, new)
    return text


def _table_names(conn: sa.Connection) -> set[str]:
    return set(sa.inspect(conn).get_table_names())


def upgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    if "pages" in tables:
        conn.execute(
            sa.text(
                "UPDATE pages SET label = :label, updated_at = :updated_at "
                "WHERE `key` = :page_key AND label = :legacy_label"
            ),
            {
                "label": PAGE_LABEL_CURRENT,
                "updated_at": datetime.now(),
                "page_key": PAGE_KEY,
                "legacy_label": PAGE_LABEL_LEGACY,
            },
        )

    if "hero_slides" in tables:
        rows = conn.execute(sa.text("SELECT id, content FROM hero_slides")).all()
        for row_id, content in rows:
            if not content:
                continue
            try:
                parsed = json.loads(content)
            except (TypeError, ValueError):
                continue
            if not isinstance(parsed, dict):
                continue
            subtitle = parsed.get("subtitle")
            if not subtitle or not any(old in subtitle for old, _ in LEGACY_PHRASES):
                continue
            parsed["subtitle"] = _replace_copy(subtitle, LEGACY_PHRASES)
            conn.execute(
                sa.text(
                    "UPDATE hero_slides SET content = :content, "
                    "updated_at = :updated_at WHERE id = :row_id"
                ),
                {
                    "content": json.dumps(parsed, ensure_ascii=False),
                    "updated_at": datetime.now(),
                    "row_id": row_id,
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    if "pages" in tables:
        conn.execute(
            sa.text(
                "UPDATE pages SET label = :label, updated_at = :updated_at "
                "WHERE `key` = :page_key AND label = :current_label"
            ),
            {
                "label": PAGE_LABEL_LEGACY,
                "updated_at": datetime.now(),
                "page_key": PAGE_KEY,
                "current_label": PAGE_LABEL_CURRENT,
            },
        )

    if "hero_slides" in tables:
        rows = conn.execute(sa.text("SELECT id, content FROM hero_slides")).all()
        reverse = tuple((new, old) for old, new in LEGACY_PHRASES)
        for row_id, content in rows:
            if not content:
                continue
            try:
                parsed = json.loads(content)
            except (TypeError, ValueError):
                continue
            if not isinstance(parsed, dict):
                continue
            subtitle = parsed.get("subtitle")
            if not subtitle or not any(new in subtitle for new, _ in reverse):
                continue
            parsed["subtitle"] = _replace_copy(subtitle, reverse)
            conn.execute(
                sa.text(
                    "UPDATE hero_slides SET content = :content, "
                    "updated_at = :updated_at WHERE id = :row_id"
                ),
                {
                    "content": json.dumps(parsed, ensure_ascii=False),
                    "updated_at": datetime.now(),
                    "row_id": row_id,
                },
            )
