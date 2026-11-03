"""Seed official gallery items for PTDARRAHMAN company profile.

Revision ID: 0072
Revises: 0071
Create Date: 2026-11-03
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0072"
down_revision: str | None = "0071"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_NAME = "gallery_items"

GALLERY_SEEDS = [
    {
        "id": "gallery-kit-01-kampus",
        "category": "Fasilitas & Lingkungan",
        "image": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Lingkungan Kampus Hijau & Nyaman",
            "desc": (
                "Kawasan kampus PTDARRAHMAN yang asri dan tenang di Mangunjaya, Tambun Selatan, "
                "dirancang khusus mendukung konsentrasi santri dalam menghafal Al-Qur'an dan "
                "eksplorasi teknologi digital."
            ),
        },
    },
    {
        "id": "gallery-kit-02-tahfidz",
        "category": "Kegiatan Tahfidz & Al-Qur'an",
        "image": "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Halaqah Tahfidz & Setoran Ziyadah",
            "desc": (
                "Suasana khidmat halaqah Al-Qur'an ba'da Subuh dan Ashar, di mana santri menyetorkan "
                "hafalan baru (ziyadah) serta muroja'ah berjenjang dengan bimbingan langsung "
                "asatidz hafizh bersanad."
            ),
        },
    },
    {
        "id": "gallery-kit-03-lab-komputer",
        "category": "Kegiatan Akademik",
        "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Praktikum Laboratorium Komputer & Rekayasa Perangkat Lunak",
            "desc": (
                "Santri mendalami ilmu rekayasa teknologi informasi, pengkodean (coding), "
                "dasar AI, dan literasi digital modern di laboratorium komputer berstandar industri."
            ),
        },
    },
    {
        "id": "gallery-kit-04-olahraga",
        "category": "Olahraga & Kebugaran",
        "image": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Pembinaan Kebugaran Jasmani & Olahraga Santri",
            "desc": (
                "Aktivitas olahraga rutin santri untuk menjaga stamina fisik, kebugaran jasmani, "
                "dan sportivitas agar senantiasa bersemangat dalam menempuh pendidikan terpadu."
            ),
        },
    },
    {
        "id": "gallery-kit-05-halaman-pesantren",
        "category": "Kegiatan Pesantren",
        "image": "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Aktivitas Harian & Kebersamaan Pesantren",
            "desc": (
                "Keseharian santri di lingkungan pesantren yang sarat nilai kedisiplinan, "
                "kemandirian, dan ukhuwah islamiyah antar santri dari berbagai daerah di Indonesia."
            ),
        },
    },
    {
        "id": "gallery-kit-06-kebersamaan-santri",
        "category": "Kegiatan Santri",
        "image": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Sharing Session & Diskusi Interaktif",
            "desc": (
                "Sesi diskusi dan berbagi wawasan teknologi serta kepemimpinan bersama para "
                "praktisi industri digital dan alumni pengajar inspiratif."
            ),
        },
    },
    {
        "id": "gallery-kit-07-seni-kaligrafi",
        "category": "Seni & Kreativitas",
        "image": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Kreativitas Seni Kaligrafi Arab & Desain Grafis",
            "desc": (
                "Pengembangan bakat seni santri yang menggabungkan keindahan khat kaligrafi Islam "
                "tradisional dengan keterampilan desain grafis modern."
            ),
        },
    },
    {
        "id": "gallery-kit-08-kelas-akademik",
        "category": "Kegiatan Akademik",
        "image": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Pembelajaran Kelas Interaktif Berbasis Sains & Kurikulum Nasional",
            "desc": (
                "Proses belajar mengajar mata pelajaran umum dan sains berbasis kurikulum nasional "
                "yang disajikan secara interaktif dan aplikatif."
            ),
        },
    },
    {
        "id": "gallery-kit-09-acara-pesantren",
        "category": "Acara & Perayaan",
        "image": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Peringatan Hari Besar Islam & Silaturahmi Akbar",
            "desc": (
                "Peringatan hari besar Islam, tabligh akbar, serta silaturahmi berkala antara santri, "
                "asatidz, dan wali santri untuk mempererat ikatan kekeluargaan pesantren."
            ),
        },
    },
    {
        "id": "gallery-kit-10-wisuda",
        "category": "Wisuda & Kelulusan",
        "image": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Prosesi Wisuda Akbar & Khotmul Qur'an Santri",
            "desc": (
                "Momen pelepasan dan apresiasi kelulusan bagi santri yang berhasil menuntaskan "
                "program 6 tahun, tuntas hafidz 30 juz mutqin, dan menguasai rekayasa teknologi."
            ),
        },
    },
    {
        "id": "gallery-kit-11-keagamaan",
        "category": "Kegiatan Keagamaan",
        "image": "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Sholat Berjamaah & Bimbingan Ibadah Yaumiyah",
            "desc": (
                "Pembiasaan sholat fardhu lima waktu berjamaah di masjid, sholat dhuha, "
                "qiyamul lail, dan bimbingan fiqih ibadah sehari-hari untuk membentuk akhlak mulia."
            ),
        },
    },
    {
        "id": "gallery-kit-12-ekstrakurikuler",
        "category": "Kegiatan Ekstrakurikuler",
        "image": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop",
        "content": {
            "title": "Eksplorasi Robotika & Internet of Things (IoT)",
            "desc": (
                "Kegiatan ekstrakurikuler teknologi di mana santri merakit sirkuit elektronika, "
                "memprogram mikrokontroler, dan mengembangkan proyek IoT sederhana."
            ),
        },
    },
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE_NAME not in inspector.get_table_names():
        return

    table = sa.Table(TABLE_NAME, sa.MetaData(), autoload_with=bind)
    now = datetime.now()

    for item in GALLERY_SEEDS:
        existing = bind.execute(
            sa.select(table.c.id).where(table.c.id == item["id"])
        ).first()

        content_json = json.dumps(item["content"], ensure_ascii=False)

        if not existing:
            bind.execute(
                table.insert().values(
                    id=item["id"],
                    image=item["image"],
                    category=item["category"],
                    content=content_json,
                    created_at=now,
                    updated_at=now,
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE_NAME not in inspector.get_table_names():
        return

    table = sa.Table(TABLE_NAME, sa.MetaData(), autoload_with=bind)
    seed_ids = [item["id"] for item in GALLERY_SEEDS]
    bind.execute(table.delete().where(table.c.id.in_(seed_ids)))
