"""
Upload gallery images from 'photo data geleri' folder by matching filenames to titles.
Each photo is matched by keyword in its filename to the expected gallery title.
"""
import sys, os, json, asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.core.config import settings
from sqlalchemy import create_engine, text
import httpx


# Keyword -> (title, category) mapping
# First match wins; order matters for disambiguation
MATCHES = [
    ("pemberangkatan",      ("Pemberangkatan Menuju Lomba Espeto9",        "Perlombaan & Prestasi")),
    ("pesiapan ujian tahfidz", ("Photo Bersama Persiapan Ujian Tahfidz",   "Kegiatan Pesantren")),
    ("muhadhoroh mingguan",  ("Muhadhoroh Mingguan",                        "Kegiatan Keagamaan")),
    ("muhadasah",            ("Muhadasah Mingguan",                         "Kegiatan Keagamaan")),
    ("muhadoroh",            ("Muhadhoroh Mingguan",                        "Kegiatan Keagamaan")),
    ("podcast",              ("Podcast",                                    "Kegiatan Santri")),
    ("khotmul",              ("Khotmul Quran Keliling",                     "Kegiatan Tahfidz & Al-Qur'an")),
    ("lomba muhsinin",       ("Lomba MHQ dan Ceramah",                      "Perlombaan & Prestasi")),
    ("pengikuti spect",     ("Lomba Espeto9 MHQ dan Story Telling",        "Perlombaan & Prestasi")),
    ("especto",             ("Lomba Espeto9 MHQ dan Story Telling",        "Perlombaan & Prestasi")),
    ("seminar lugho",        ("Persiapan Agenda Berbagi Ilmu",              "Kegiatan Sekolah")),
    ("menyimak seminar",     ("Menyimak Pembawa Acara Berbagi Ilmu",        "Kegiatan Sekolah")),
    ("nasihat",            ("Nasihat Dari Ketua Yayasan (Pak Eko)",       "Kegiatan Organisasi")),
    ("pemanasan",            ("Pemanasan Olahraga",                         "Olahraga & Kebugaran")),
    ("pembacaan kitab",      ("Pembacaan Kitab Hadist Harian",              "Kegiatan Tahfidz & Al-Qur'an")),
    ("agenda menulis",       ("Pembacaan Kitab Hadisul Sholihin",           "Kegiatan Tahfidz & Al-Qur'an")),
    ("penghargaan lomba 17", ("Penghargaan Lomba 17 Agustus 1945",          "Acara & Perayaan")),
    ("penghargaan lomba",    ("Penghargaan Juara 2 Story Telling PTD",      "Perlombaan & Prestasi")),
    ("foto bersama ust",     ("Photo Bersama Dengan Ust. Khorul Anam",      "Dokumentasi Umum")),
    ("foto bersama ustan",   ("Photo Bersama Dengan Ust. Khorul Anam",      "Dokumentasi Umum")),
    ("foto di depan museum", ("Photo Bersama di Kota Tua",                  "Kunjungan & Studi Banding")),
    ("foto di masjid istiqlal", ("Kunjungi Masjid Istiqlal",                "Kunjungan & Studi Banding")),
    ("foto krl",             ("Photo di Kereta Kunjungan ke Kota Tua",      "Kunjungan & Studi Banding")),
    ("photo di depan museum",("Photo Bersama di Kota Tua",                  "Kunjungan & Studi Banding")),
    ("photo di masjid istiqlal",("Kunjungi Masjid Istiqlal",                "Kunjungan & Studi Banding")),
    ("photo krl kunjungan",  ("Photo di Kereta Kunjungan ke Kota Tua",      "Kunjungan & Studi Banding")),
    ("photo agenda olahraga",("Photo Bersama",                              "Dokumentasi Umum")),
    ("photo sbelum",         ("Photo Bersama Persiapan Ujian Tahfidz",      "Kegiatan Pesantren")),
    ("iftor",                ("Iftar Jama'i Bersama Wali Santri",           "Kehidupan Asrama")),
    ("upacara bendera",      ("Upacara Bendera",                            "Kegiatan Pesantren")),
    ("upacara",              ("Upacara Bendera",                            "Kegiatan Pesantren")),
    ("upacar",               ("Upacara Bendera",                            "Kegiatan Pesantren")),
    ("upcara",               ("Upacara Bendera",                            "Kegiatan Pesantren")),
    ("halaqoh",              ("Halaqoh",                                    "Kegiatan Tahfidz & Al-Qur'an")),
    ("belajar bersama",      ("Belajar Bersama",                            "Kegiatan Akademik")),
    ("photo bersama",        ("Photo Bersama",                              "Dokumentasi Umum")),
    ("doa bersama",          ("Agenda Doa Bersama",                         "Kegiatan Keagamaan")),
    ("agenda berenang",      ("Berenang Bersama Santri",                    "Olahraga & Kebugaran")),
    ("futsal",               ("Futsal",                                     "Olahraga & Kebugaran")),
    ("istirahat",            ("Istirahat Selepas Futsal",                   "Olahraga & Kebugaran")),
    ("ujian uts",            ("Pelaksanaan Ujian UTS",                      "Kegiatan Akademik")),
    ("pemberian alquran",    ("Pemberian Al-Quran",                         "Kegiatan Pesantren")),
    ("ta 1",                 ("Pemanasan Persiapan Training (TA)",          "Olahraga & Kebugaran")),
    ("dsc_",                 ("Pemanasan Persiapan Training (TA)",          "Olahraga & Kebugaran")),
    ("img-",                 ("Photo Bersama",                              "Dokumentasi Umum")),
]


def classify(filename: str, folder_name: str = ""):
    combined = f"{folder_name}/{filename}".lower().replace(".jpg", "").replace(".jpeg", "").replace(".JPG", "")
    for keyword, (title, category) in MATCHES:
        if keyword in combined:
            return title, category
    return None, None


def main():
    folder = Path(r"C:\Users\farre\Downloads\photo data geleri")
    if not folder.is_dir():
        print(f"Error: {folder} not found")
        sys.exit(1)

    # Collect all image files recursively, sorted by name
    extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
    files = sorted([f for f in folder.rglob("*") if f.is_file() and f.suffix.lower() in extensions])

    print(f"Found {len(files)} image(s) in {folder}")

    # Classify each file
    classified = []
    unmatched = []
    for fpath in files:
        folder_name = fpath.parent.name
        title, category = classify(fpath.name, folder_name)
        if title:
            classified.append((fpath, title, category))
        else:
            unmatched.append(fpath.name)

    print(f"Classified: {len(classified)}, Unmatched: {len(unmatched)}")
    if unmatched:
        print("Unmatched files:", unmatched)

    async def run():
        async with httpx.AsyncClient(base_url="http://localhost:8000", follow_redirects=True, timeout=60) as c:
            r = await c.post("/companyprofile/auth/login", json={
                "username": "superadmin",
                "password": "SuperAdmin123!.",
            })
            r.raise_for_status()
            print(f"Login OK")

            eng = create_engine(settings.database_url)
            conn = eng.connect()
            conn.execute(text("DELETE FROM gallery_items"))
            conn.commit()
            print("Cleared existing gallery items")

            count = 0
            for i, (fpath, title, category) in enumerate(classified):
                print(f"[{i+1:3d}/{len(classified)}] {fpath.name} -> {category}", end=" ", flush=True)
                try:
                    upload_ext = ".jpg" if fpath.suffix.lower() in (".jpeg", ".jpg") else fpath.suffix.lower()
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
                    print(f"OK")
                    count += 1
                except Exception as e:
                    print(f"ERROR: {e}")

            conn.close()

            eng2 = create_engine(settings.database_url)
            conn2 = eng2.connect()
            r3 = conn2.execute(text("SELECT COUNT(*) FROM gallery_items"))
            total = r3.fetchone()[0]
            conn2.close()

            print(f"\nDone! Inserted {count}/{len(classified)} gallery items, total in DB: {total}")

    asyncio.run(run())


if __name__ == "__main__":
    main()
