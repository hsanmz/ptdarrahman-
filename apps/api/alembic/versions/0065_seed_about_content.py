"""Seed About page blocks and register the CMS permission.

Revision ID: 0065
Revises: 0064
"""

import json
from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "0065"
down_revision: str | None = "0064"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_NAME = "about_content"


SEED_ROWS = [
    (
        "about-hero",
        "hero",
        0,
        {
            "page_title": "Tentang Kami",
            "badge": "PROFIL INSTITUSI",
            "kicker": "Iman, ilmu, dan karya",
            "title": "Pendidikan yang menyiapkan hati dan masa depan.",
            "subtitle": "Kami memadukan pembinaan Al-Qur'an dengan teknologi, bahasa, dan kepemimpinan dalam keseharian santri yang terarah.",
            "image": "/images/pak-eko.jpg",
            "image_alt": "Eko Santoso, Ketua Yayasan Generasi Cerdas Akhlak Mulia",
            "image_name": "Eko Santoso",
            "image_role": "Ketua Yayasan Generasi Cerdas Akhlak Mulia",
            "cta_label": "Kenali perjalanan kami",
            "cta_href": "#perjalanan",
            "secondary_cta_label": "Pendaftaran PPDB",
        },
    ),
    (
        "about-story-heading",
        "story-heading",
        0,
        {
            "eyebrow": "Perjalanan kami",
            "title": "Bertumbuh dengan arah yang jelas.",
            "body": "Dari keyakinan sederhana, lahir ikhtiar pendidikan yang terus disempurnakan bersama keluarga besar pesantren.",
        },
    ),
    (
        "about-story-01",
        "story",
        1,
        {
            "kicker": "BAGIAN 01",
            "title": "Siapa Pak Eko?",
            "body": [
                "Eko Santoso adalah Ketua Yayasan Generasi Cerdas Akhlak Mulia, lembaga yang menaungi kegiatan pendidikan Ar Rahman Islamic Center, termasuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.",
                "Bersama pengurus yayasan, beliau mengawal arah kelembagaan agar seluruh lini pendidikan tetap berpijak pada nilai Al-Qur'an, akhlak mulia, dan orientasi keunggulan.",
            ],
        },
    ),
    (
        "about-story-02",
        "story",
        2,
        {
            "kicker": "BAGIAN 02",
            "title": "Kenapa PTD Dibangun?",
            "body": [
                "PTD lahir dari satu keyakinan yang tumbuh sejak 2021: generasi muslim yang kuat hafalannya juga harus cakap menghadapi era digital.",
                "Dari kelompok belajar tahfidz kecil di kawasan Kalimalang, keyakinan itu berkembang menjadi keputusan melembaga: membangun pesantren yang menempatkan Al-Qur'an sebagai fondasi dan teknologi sebagai bekal masa depan.",
            ],
        },
    ),
    (
        "about-story-03",
        "story",
        3,
        {
            "kicker": "BAGIAN 03",
            "title": "Bagaimana Sistemnya?",
            "body": [
                "Kurikulum terpadu memadukan hafalan Al-Qur'an, ilmu keislaman, sains digital, bahasa, dan pembinaan kepemimpinan dalam satu keseharian santri.",
                "Irama hafalan menjadi denyut utama hari santri, sementara kelas digital dan pembinaan karakter menyertainya tanpa saling meniadakan.",
            ],
        },
    ),
    (
        "about-story-04",
        "story",
        4,
        {
            "kicker": "BAGIAN 04",
            "title": "Tujuan PTD Dibuat?",
            "body": [
                "Tujuan terbesar PTD bukan sekadar menghadirkan hafidz atau programmer, melainkan mencetak generasi Rahmatan lil 'Alamin yang berakhlak dan membawa manfaat.",
                "Setiap santri dibekali kekuatan ganda: kemuliaan hafalan untuk hidup yang terarah dan kompetensi digital untuk kemandirian serta kontribusi di dunia nyata.",
            ],
        },
    ),
    (
        "about-vision",
        "vision",
        0,
        {
            "eyebrow": "Visi",
            "title": "Menjadi lembaga pendidikan terbaik bagi generasi Islam.",
            "body": "Kami menumbuhkan generasi yang berakhlak mulia, kuat hafalannya, menguasai teknologi, dan berjiwa mandiri.",
        },
    ),
    (
        "about-mission",
        "mission",
        0,
        {
            "eyebrow": "Misi",
            "title": "Arah yang kami kerjakan setiap hari.",
            "items": [
                "Menciptakan lingkungan belajar yang islami, bersih, nyaman, dan bersahabat.",
                "Memadukan tahfidz, ilmu keislaman, sains, teknologi, bahasa, dan kepemimpinan.",
                "Membentuk generasi yang beradab, kompeten, dan mampu memberi kontribusi nyata.",
            ],
        },
    ),
    (
        "about-values-heading",
        "values-heading",
        0,
        {
            "eyebrow": "Nilai inti",
            "title": "Karakter sebelum prestasi.",
            "body": "Kompetensi akan bertumbuh kuat ketika dibangun di atas adab, amanah, dan kepedulian.",
        },
    ),
    (
        "about-value-quran",
        "value",
        1,
        {
            "icon": "book-open",
            "title": "Al-Qur'an sebagai fondasi",
            "description": "Hafalan, pemahaman, dan adab menjadi dasar setiap proses pendidikan.",
        },
    ),
    (
        "about-value-digital",
        "value",
        2,
        {
            "icon": "cpu",
            "title": "Cakap di dunia digital",
            "description": "Santri dibekali keterampilan teknologi yang relevan dan bertanggung jawab.",
        },
    ),
    (
        "about-value-character",
        "value",
        3,
        {
            "icon": "heart",
            "title": "Akhlak dalam keseharian",
            "description": "Karakter baik dibentuk lewat kebiasaan, keteladanan, dan kehidupan bersama.",
        },
    ),
    (
        "about-value-trust",
        "value",
        4,
        {
            "icon": "shield-check",
            "title": "Amanah dan mandiri",
            "description": "Kejujuran, disiplin, dan keberanian mengambil tanggung jawab ditumbuhkan bertahap.",
        },
    ),
    (
        "about-student-profile",
        "student-profile",
        0,
        {
            "eyebrow": "Profil santri",
            "title": "Bekal untuk menjadi pembawa manfaat.",
            "icon": "users",
            "items": [
                "Bertaqwa dan berakhlak mulia",
                "Kuat dalam hafalan dan pemahaman Al-Qur'an",
                "Mampu berkomunikasi dan bekerja sama",
                "Terampil menggunakan teknologi secara bijak",
                "Percaya diri, disiplin, dan mandiri",
                "Siap membawa manfaat bagi masyarakat",
            ],
        },
    ),
    (
        "about-leadership-heading",
        "leadership-heading",
        0,
        {
            "eyebrow": "Struktur organisasi",
            "title": "Susunan Pengurus",
            "body": "Kepemimpinan lembaga dalam dua naungan: yayasan dan Islamic Center.",
            "link_label": "Lihat Semua Guru & Staff",
            "link_href": "/staff",
        },
    ),
    (
        "about-cta",
        "cta",
        0,
        {
            "eyebrow": "Langkah berikutnya",
            "title": "Mari kenalkan pendidikan terbaik untuk putra Anda.",
            "body": "Hubungi panitia atau mulai pendaftaran melalui portal resmi PTDARRAHMAN.",
            "button_label": "Mulai pendaftaran",
        },
    ),
]


def _table(bind: sa.engine.Connection, name: str) -> sa.Table:
    return sa.Table(name, sa.MetaData(), autoload_with=bind)


def _seed_about(bind: sa.engine.Connection) -> None:
    if TABLE_NAME not in sa.inspect(bind).get_table_names():
        return
    table = _table(bind, TABLE_NAME)
    count = bind.execute(sa.select(sa.func.count()).select_from(table)).scalar()
    if count:
        return

    now = datetime.now()
    bind.execute(
        table.insert(),
        [
            {
                "id": row_id,
                "section": section,
                "order": order,
                "content": json.dumps(content, ensure_ascii=False),
                "created_at": now,
                "updated_at": now,
            }
            for row_id, section, order, content in SEED_ROWS
        ],
    )


def _ensure_page_permission(bind: sa.engine.Connection) -> None:
    tables = set(sa.inspect(bind).get_table_names())
    if "pages" not in tables or "modules" not in tables:
        return
    modules = _table(bind, "modules")
    pages = _table(bind, "pages")
    module = bind.execute(
        sa.select(modules.c.id).where(modules.c.key == "companyprofile")
    ).first()
    if not module:
        return

    key = "about"
    existing = bind.execute(
        sa.select(pages.c.id).where(
            pages.c.module_id == module.id, pages.c.key == key
        )
    ).first()
    values = {
        "label": "Tentang Kami",
        "icon": "Info",
        "sort_order": 42,
        "has_crud": True,
        "updated_at": datetime.now(),
    }
    if existing:
        bind.execute(pages.update().where(pages.c.id == existing.id).values(**values))
    else:
        bind.execute(
            pages.insert().values(
                id=str(uuid4()),
                module_id=module.id,
                key=key,
                created_at=datetime.now(),
                **values,
            )
        )


def upgrade() -> None:
    bind = op.get_bind()
    _seed_about(bind)
    _ensure_page_permission(bind)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "pages" in tables and "modules" in tables:
        modules = _table(bind, "modules")
        pages = _table(bind, "pages")
        module = bind.execute(
            sa.select(modules.c.id).where(modules.c.key == "companyprofile")
        ).first()
        if module:
            bind.execute(
                pages.delete().where(
                    pages.c.module_id == module.id, pages.c.key == "about"
                )
            )
