"""Tab CRUD "Struktur Organisasi" (leadership_members) untuk halaman About.

Revision ID: 0058
Revises: 0057
Create Date: 2026-10-27

Membuat tabel `leadership_members` — CMS khusus susunan pengurus halaman
Tentang Kami (TERPISAH dari tabel `staff` yang berisi Guru & Staff), mengisi
19 anggota resmi dua kelompok pengurus (Yayasan Generasi Cerdas Akhlak Mulia
7 orang + Ar Rahman Islamic Center 12 orang), dan mendaftarkan halaman
permission `leadership` (module `companyprofile`) supaya tab baru bisa
di-grant dari Superadmin ke admin non-superadmin.

Seed hanya jalan saat tabel masih kosong; tabel yang sudah berisi suntingan
panitia tidak disentuh. Pendaftaran halaman permission memakai upsert aman.
"""

import json
from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "0058"
down_revision: str | None = "0057"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_NAME = "leadership_members"

# Kelompok Yayasan Generasi Cerdas Akhlak Mulia (urutan resmi panitia).
YAYASAN_MEMBERS = [
    ("Indra Setiawan", "Pembina"),
    ("Tri Indra Basoeki", "Pembina"),
    ("Rini Widiastuti Rahayu", "Pengawas"),
    ("Eko Santoso", "Ketua"),
    ("Chandra Sari Nugraheni", "Bendahara"),
    ("Noor Kartika Muliawati", "Sekretaris"),
    ("Rachmania Kurniawati", "Sekretaris"),
]

# Kelompok Ar Rahman Islamic Center (urutan resmi panitia). Jabatan PTD
# mengikuti standar naming: Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
ISLAMIC_CENTER_MEMBERS = [
    ("Chandra Sari Nugraheni", "President Director"),
    ("Fathya Irsalina M", "AVP Performance Management"),
    ("Mira Susanti", "AVP Internal Auditor"),
    ("Leo Latul Agusta", "Director of Education Center"),
    ("Ahmad Mahfud", "Director of Support & Development"),
    ("Dewi Nareswari", "Vice President of Branding & Development"),
    ("Dahniar", "Vice President of Finance & Support"),
    ("Ruswandri", "Head of Lembaga Pengelolaan Ziswaf"),
    ("Silvi Laeli Kodaria", "Head of Sekolah Alam Qurani Ar Rahman"),
    (
        "Ziyad Khairy",
        "Head of Pesantren Tahfidz Qur'an dan Digital Ar-Rahman",
    ),
    ("Ahmad Khaeruddin", "Head of Lembaga Pendidikan Al Quran"),
    ("Susilawati", "Head of Lembaga Pembinaan Masyarakat"),
]


def _table_names(bind: sa.engine.Connection) -> set[str]:
    return set(sa.inspect(bind).get_table_names())


def _table(bind: sa.engine.Connection, name: str) -> sa.Table:
    return sa.Table(name, sa.MetaData(), autoload_with=bind)


def _create_leadership_table() -> None:
    """Bentuk kolom identik dengan `LeadershipMember` di src/models/content.py.

    `order` NOT NULL tanpa server_default — penulisan generik router mengirim
    nilai default lewat `COLUMN_DEFAULTS`, sama seperti programs/testimonials.
    """

    op.create_table(
        TABLE_NAME,
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("board", sa.String(length=50), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def _seed_leadership(bind: sa.engine.Connection) -> None:
    if TABLE_NAME not in _table_names(bind):
        return
    table = _table(bind, TABLE_NAME)
    if bind.execute(sa.select(sa.func.count()).select_from(table)).scalar():
        return


    members: list[tuple[str, str]] = [
        *[(name, position) for name, position in YAYASAN_MEMBERS],
        *[(name, position) for name, position in ISLAMIC_CENTER_MEMBERS],
    ]
    now = datetime.now()
    for index, (name, position) in enumerate(members):
        board = "yayasan" if index < len(YAYASAN_MEMBERS) else "islamic-center"
        rank = index + 1 if index < len(YAYASAN_MEMBERS) else index - len(YAYASAN_MEMBERS) + 1
        bind.execute(
            table.insert().values(
                id=f"leadership-{index + 1:02d}",
                board=board,
                order=rank,
                content=json.dumps(
                    {"name": name, "position": position}, ensure_ascii=False
                ),
                created_at=now,
                updated_at=now,
            )
        )


def _ensure_leadership_page(bind: sa.engine.Connection) -> None:
    """Daftarkan halaman permission `leadership` agar bisa di-grant Superadmin."""
    tables = _table_names(bind)
    if "pages" not in tables or "modules" not in tables:
        return

    modules = _table(bind, "modules")
    pages = _table(bind, "pages")
    module = bind.execute(
        sa.select(modules.c.id).where(modules.c.key == "companyprofile")
    ).first()
    if not module:
        return

    now = datetime.now()
    key, label, icon, sort_order = (
        "leadership",
        "Struktur Organisasi",
        "Network",
        45,  # di antara Staff (40) dan Prestasi (50) pada urutan kanan admin.
    )
    existing = bind.execute(
        sa.select(pages.c.id).where(
            pages.c.module_id == module.id, pages.c.key == key
        )
    ).first()
    values = {
        "label": label,
        "icon": icon,
        "sort_order": sort_order,
        "has_crud": True,
        "updated_at": now,
    }
    if existing:
        bind.execute(pages.update().where(pages.c.id == existing.id).values(**values))
    else:
        bind.execute(
            pages.insert().values(
                id=str(uuid4()),
                module_id=module.id,
                key=key,
                created_at=now,
                **values,
            )
        )


def upgrade() -> None:
    bind = op.get_bind()
    existing = _table_names(bind)
    if TABLE_NAME not in existing:
        _create_leadership_table()
    else:
        # Jaring pengaman DB lama: tabel mungkin sudah dibuat manual atau lewat
        # `Base.metadata.create_all` sebelum migrasi dijalankan.
        inspector = sa.inspect(bind)
        cols = {c["name"] for c in inspector.get_columns(TABLE_NAME)}
        if "order" not in cols:
            op.add_column(
                TABLE_NAME,
                sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
            )
            op.alter_column(TABLE_NAME, "order", server_default=None)

    _seed_leadership(bind)
    _ensure_leadership_page(bind)


def downgrade() -> None:
    bind = op.get_bind()
    existing = _table_names(bind)
    if TABLE_NAME in existing:
        op.drop_table(TABLE_NAME)

    if "pages" in existing and "modules" in existing:
        modules = _table(bind, "modules")
        pages = _table(bind, "pages")
        module = bind.execute(
            sa.select(modules.c.id).where(modules.c.key == "companyprofile")
        ).first()
        if module:
            bind.execute(
                pages.delete().where(
                    pages.c.module_id == module.id, pages.c.key == "leadership"
                )
            )
