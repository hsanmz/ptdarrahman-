"""
Upload gallery images from a local folder and insert into DB.

Usage:
    python insert_gallery_from_folder.py <folder_path>
"""
import sys, os, json, asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.core.config import settings
from sqlalchemy import create_engine, text
import httpx


# Ordered list of (title, category) matching the Mega links order
GALLERY_DATA = [
    ("Upacara Bendera", "Kegiatan Pesantren"),
    ("Halaqoh", "Kegiatan Tahfidz & Al-Qur'an"),
    ("Podcast", "Kegiatan Santri"),
    ("Photo Bersama", "Dokumentasi Umum"),
    ("Belajar Bersama Ujian Tulis PTD", "Kegiatan Akademik"),
    ("Kunjungi Masjid Istiqlal", "Kunjungan & Studi Banding"),
    ("Pemanasan Olahraga", "Olahraga & Kebugaran"),
    ("Upacara Bendera", "Kegiatan Pesantren"),
    ("Pemanasan Persiapan Training (TA)", "Olahraga & Kebugaran"),
    ("Futsal", "Olahraga & Kebugaran"),
    ("Muhadhoroh Pekanan", "Kegiatan Keagamaan"),
    ("Lomba MHQ dan Ceramah", "Perlombaan & Prestasi"),
    ("Lomba MHQ dan Ceramah", "Perlombaan & Prestasi"),
    ("Pembacaan Kitab Hadisul Sholihin", "Kegiatan Tahfidz & Al-Qur'an"),
    ("Muhadasah Mingguan", "Kegiatan Keagamaan"),
    ("Bermain Bola Bersama", "Olahraga & Kebugaran"),
    ("Berenang Bersama Santri", "Olahraga & Kebugaran"),
    ("Belajar Bersama", "Kegiatan Akademik"),
    ("Belajar Bersama PTD Arrahman", "Kegiatan Akademik"),
    ("Agenda Doa Bersama", "Kegiatan Keagamaan"),
    ("Khotmul Quran Keliling", "Kegiatan Tahfidz & Al-Qur'an"),
    ("Lomba Espeto9 MHQ dan Story Telling", "Perlombaan & Prestasi"),
    ("Persiapan Agenda Berbagi Ilmu", "Kegiatan Sekolah"),
    ("Menyimak Pembawa Acara Berbagi Ilmu", "Kegiatan Sekolah"),
    ("Pembacaan Kitab Hadist Harian", "Kegiatan Tahfidz & Al-Qur'an"),
    ("Photo Bersama Persiapan Ujian Tahfidz", "Kegiatan Pesantren"),
    ("Iftar Jama'i Bersama Wali Santri", "Kehidupan Asrama"),
    ("Photo di Kereta Kunjungan ke Kota Tua", "Kunjungan & Studi Banding"),
    ("Photo Bersama di Kota Tua", "Kunjungan & Studi Banding"),
    ("Penghargaan Juara 2 Story Telling PTD", "Perlombaan & Prestasi"),
    ("Penghargaan Juara 2 Nasyid PTD", "Perlombaan & Prestasi"),
    ("Penghargaan Juara 3 Nasyid PTD", "Perlombaan & Prestasi"),
    ("Istirahat Selepas Futsal", "Olahraga & Kebugaran"),
    ("Muhadhoroh Mingguan", "Kegiatan Keagamaan"),
    ("Upacara Memperingati Hari Raya 17 Agustus 1945", "Acara & Perayaan"),
    ("Upacara Memperingati Hari Raya 17 Agustus 1945", "Acara & Perayaan"),
    ("Penghargaan Lomba 17 Agustus 1945", "Acara & Perayaan"),
    ("Pemberangkatan Menuju Lomba Espeto9", "Perlombaan & Prestasi"),
    ("Muhadhoroh Mingguan", "Kegiatan Keagamaan"),
    ("Pelaksanaan Ujian UTS", "Kegiatan Akademik"),
    ("Pelaksanaan Ujian UTS", "Kegiatan Akademik"),
    ("Pelaksanaan Ujian UTS", "Kegiatan Akademik"),
    ("Nasihat Dari Ketua Yayasan (Pak Eko)", "Kegiatan Organisasi"),
    ("Photo Bersama Dengan Ust. Khorul Anam", "Dokumentasi Umum"),
    ("Photo Bersama Dengan Ust. Khorul Anam", "Dokumentasi Umum"),
    ("Upacara Bendera", "Kegiatan Pesantren"),
    ("Upacara Bendera", "Kegiatan Pesantren"),
]


def main():
    if len(sys.argv) < 2:
        print("Usage: python insert_gallery_from_folder.py <folder_path>")
        sys.exit(1)

    folder = Path(sys.argv[1]).resolve()
    if not folder.is_dir():
        print(f"Error: {folder} is not a directory")
        sys.exit(1)

    # Find image files
    extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
    files = sorted([f for f in folder.iterdir() if f.suffix.lower() in extensions])

    if not files:
        print(f"No image files found in {folder}")
        sys.exit(1)

    print(f"Found {len(files)} image(s) in {folder}")
    print(f"Expected {len(GALLERY_DATA)} entries in data list")
    limit = min(len(files), len(GALLERY_DATA))
    print(f"Will process {limit} files\n")

    async def run():
        async with httpx.AsyncClient(base_url="http://localhost:8000", follow_redirects=True, timeout=60) as c:
            # Login
            r = await c.post("/companyprofile/auth/login", json={
                "username": "superadmin",
                "password": "SuperAdmin123!.",
            })
            r.raise_for_status()
            print(f"Login OK (cookies: {len(c.cookies)} jars)")

            # Connect to DB
            eng = create_engine(settings.database_url)
            conn = eng.connect()
            conn.execute(text("DELETE FROM gallery_items"))
            conn.commit()
            print("Cleared existing gallery items")

            count = 0
            for i in range(limit):
                fpath = files[i]
                title, category = GALLERY_DATA[i]
                print(f"[{i+1:2d}/{limit}] Uploading: {fpath.name} -> {category}", end=" ", flush=True)
                try:
                    ext = fpath.suffix.lower()
                    upload_ext = ".jpg" if ext in (".jpeg", ".jpg") else ext
                    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                            "webp": "image/webp", "gif": "image/gif", "bmp": "image/bmp"}.get(upload_ext.lstrip("."), "image/jpeg")
                    r2 = await c.post("/companyprofile/upload", files={
                        "file": (f"gallery_{i+1}{upload_ext}", fpath.read_bytes(), mime)
                    })
                    r2.raise_for_status()
                    data = r2.json()
                    url = data.get("url", "")
                    if not url:
                        print("SKIP (no url)")
                        continue
                    # Insert into DB
                    import uuid
                    rid = str(uuid.uuid4())
                    conn.execute(
                        text("INSERT INTO gallery_items (id, image, category, content, created_at, updated_at) VALUES (:id, :image, :category, :content, NOW(), NOW())"),
                        {
                            "id": rid,
                            "image": url,
                            "category": category,
                            "content": json.dumps({"title": title}, ensure_ascii=False),
                        },
                    )
                    conn.commit()
                    print(f"OK -> {url}")
                    count += 1
                except Exception as e:
                    print(f"ERROR: {e}")

            conn.close()

            # Verify
            eng2 = create_engine(settings.database_url)
            conn2 = eng2.connect()
            r3 = conn2.execute(text("SELECT COUNT(*) FROM gallery_items"))
            total = r3.fetchone()[0]
            conn2.close()

            print(f"\nDone! Inserted {count} gallery items, total in DB: {total}")

    asyncio.run(run())


if __name__ == "__main__":
    main()
