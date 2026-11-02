#!/usr/bin/env python3
"""Seed / update news articles for PTD Ar‑Rahman.

Run after activating the project environment (virtualenv or ``uv``):

    cd apps/api
    uv run python -m src.scripts.seed_news

The script is idempotent – it will insert missing articles and update the
existing ones (matched by the generated ``slug``).  The ``content`` column
stores a JSON string with ``title`` and ``body`` so the frontend can render
the article.
"""

import json
import sys
import hashlib
import re
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

# Ensure the repository root is on the import path when the script is run
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.models.content import NewsArticle  # noqa: E402
from src.core.database import get_engine  # noqa: E402

# ---------------------------------------------------------------------------
# Helper to generate a deterministic slug from the title (lowercase, hyphens)
# ---------------------------------------------------------------------------
def slugify(title: str) -> str:
    # Simple slug: lowercase, replace non‑alnum with hyphen, strip excess hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    # Ensure uniqueness – add a short hash if needed (optional)
    return slug


def news_identity(title: str) -> str:
    """Match legacy seed titles with their later imported article variants."""
    text = title.lower()
    compact = re.sub(r"[^a-z0-9]+", "", text)
    if "sharing session" in text and "gojek" in text and "next" in text:
        return "event-sharing-session-gojek-nextjs"
    if "porseni" in text and "semangat juang" in text:
        return "event-porseni-semangat-juang"
    if "ramadhan" in text and (
        "gerakan lingkungan" in text
        or "bersihkan pesantren" in text
        or "ukhuwah" in text
    ):
        return "event-ramadhan-kebersamaan-santri"
    return compact


def parse_content(value: str | None) -> dict:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}

# ---------------------------------------------------------------------------
# News data to be inserted / updated (image URL, title, body)
# ---------------------------------------------------------------------------
NEWS_ITEMS = [
    {
        "image": "https://webbackend.arrahmanic.org/storage/posts/t8idWMDX2JDprjytRu9tCET1vAMlOpds88w1PzTx.jpg",
        "title": "Seminar Keislaman: Ustaz Ahmad Kainama Kupas Kristologi dan Perbandingan Agama",
        "body": """BEKASI - Kajian Kristologi diadakan di Pesantren Tahfidz dan Digital (PTD) pada Hari Minggu (10/3/2025) tepatnya di mushola gedung gedung Pesantren Tahfidz dan Digital (PTD), Jatimulya,Tambun Selatan, Kota Bekasi.\n\nTempat ini menjadi wadah bagi para santri dan ustadz untuk memperdalam ilmu agama serta berdiskusi tentang berbagai topik keislaman.\n\nKajian kali ini menghadirkan Ustadz Ahmad Kainama, seorang pendakwah yang aktif dalam diskusi lintas agama, khususnya di bidang Kristologi dan perbandingan agama. Dalam ceramahnya, beliau membahas Kristologi dari perspektif Islam guna meningkatkan pemahaman umat Muslim terhadap ajaran agama lain serta mencegah mereka dari pengaruh yang dapat menyebabkan perpindahan keyakinan (murtad).\n\nKajian berlangsung dengan penuh antusias. Para santri dan ustad tampak fokus mendengarkan penjelasan dari Ustadz Ahmad Kainama. Beberapa santri mencatat poin-poin penting, sementara yang lain sesekali mengajukan pertanyaan untuk memperjelas pemahaman. Suasana menjadi semakin menarik saat Ustadz Kainama memberikan contoh-contoh nyata dalam kehidupan sehari-hari yang berkaitan dengan perbandingan agama. Diskusi berjalan dengan penuh semangat namun tetap dalam suasana santun dan ilmiah.\n\nKristologi penting untuk dipelajari oleh umat Islam karena beberapa alasan:\n\n- Memperkuat Pemahaman Agama – Dengan memahami ajaran agama lain, umat Islam bisa lebih yakin terhadap keyakinannya sendiri.\n- Memudahkan Dakwah – Pengetahuan tentang Kristologi membantu umat Islam dalam menyampaikan dakwah dengan lebih baik, terutama dalam diskusi dengan pemeluk Kristen.\n- Mencegah Kesalahpahaman – Memahami dasar ajaran Kristen membantu menghindari kesalahpahaman dalam perbandingan agama.\n- Menjaga Keimanan – Dengan mengetahui konsep agama lain, umat Islam tidak mudah terpengaruh atau tergoda untuk berpindah keyakinan.\n\nKajian ini menjadi langkah penting dalam memperkuat keimanan serta meningkatkan wawasan santri dan jamaah dalam memahami ajaran Islam dan agama lain.""",
    },
    {
        "image": "https://webbackend.arrahmanic.org/storage/posts/ATZokVGOucW8UiBgBRDOTanvHK13qY0jrHzRhsrQ.jpg",
        "title": "Upacara HUT Kemerdekaan ke-80 di PTD Arrahman",
        "body": """BEKASI – Peringatan Hari Ulang Tahun (HUT) Kemerdekaan Republik Indonesia ke-80 berlangsung khidmat dan penuh semangat di Pesantren Tahfidz dan Digital (PTD) Arrahman pada Minggu (17/08/2025). Upacara detik-detik proklamasi digelar mulai pukul 08:00 hingga 09:00 WIB dengan suasana tertib dan penuh penghormatan.\n\nBapak Arpen, Direktur Pendidikan PTD Arrahman, bertindak sebagai Pembina Upacara didampingi oleh seluruh Dewan Asatidz. Jalannya upacara dipimpin oleh Hudazifah Ali Miftah, yang dipercaya sebagai Pemimpin Upacara bersama para santri lain yang mengemban tugas masing-masing.\n\nDalam amanatnya, Pembina Upacara menyampaikan rasa syukur atas nikmat kemerdekaan yang diperjuangkan para pahlawan bangsa. Beliau menegaskan bahwa salah satu wujud nyata dari kemerdekaan adalah kebebasan dalam beragama.\n\n“Sebagai warga Indonesia, kita patut bersyukur karena memiliki kebebasan dalam menjalankan ajaran agama. Kebebasan ini adalah amanah yang harus dijaga, bukan hanya untuk diri sendiri, tetapi juga demi kerukunan bangsa. Kemerdekaan harus kita isi dengan hal-hal yang bermanfaat, menjaga persatuan, dan menguatkan nilai keislaman,” tuturnya.\n\nSetelah upacara, rangkaian acara dilanjutkan dengan pidato tiga bahasa (Bahasa Indonesia, Bahasa Arab, dan Bahasa Inggris) yang disampaikan oleh perwakilan santri. Kegiatan ini menjadi ajang untuk melatih keberanian, kemampuan komunikasi, sekaligus menunjukkan semangat santri dalam menguasai bahasa dunia.\n\nAcara kemudian berlanjut dengan presentasi progres pengembangan project web oleh tim santri yang mengikuti lomba. Dalam kesempatan tersebut, mereka memaparkan hasil kerja dan inovasi yang telah dicapai sebagai bentuk kontribusi nyata dalam bidang teknologi.\n\nSeluruh peserta kemudian bersama-sama mengikuti doa bersama untuk mendoakan para pahlawan bangsa, keberkahan bagi negeri, serta kemajuan pesantren.\n\nSebagai penutup, suasana kembali meriah dengan digelarnya berbagai lomba kemerdekaan yang diikuti oleh para santri. Keceriaan, kekompakan, dan semangat kebersamaan mewarnai akhir acara, menjadikan peringatan HUT RI ke-80 di PTD Arrahman tidak hanya khidmat, tetapi juga penuh makna dan inspirasi.""",
    },
    {
        "image": "https://webbackend.arrahmanic.org/storage/posts/BezTw4HF4lyumoRlvhj8fXNPTlGYCmy3U59ymwP1.jpg",
        "title": "PTD Ar Rahman Gelar Lomba HUT RI ke-80",
        "body": """BEKASI – Dalam rangka memeriahkan Hari Ulang Tahun (HUT) Kemerdekaan Republik Indonesia ke-80, Pesantren Tahfidz dan Digital (PTD) Ar Rahman menggelar serangkaian perlombaan seru yang diikuti oleh seluruh santri. Kegiatan ini berlangsung pada Ahad (17/08/2025) dengan penuh antusias dan keceriaan.\n\nTerdapat beragam perlombaan yang dipertandingkan, mulai dari lomba tradisional hingga lomba kreatif, di antaranya balap kardus, estafet sarung, tarik sarung, memakai baju tampa menjatuhkan balon , tampar balon tutup mata . Semua santri bersemangat mengikuti jalannya perlombaan, terlihat dari sorak-sorai dan tawa yang menghiasi suasana pesantren sejak pagi hari.\n\nPerlombaan diawali dengan lomba balap karung yang langsung mengundang gelak tawa penonton, diikuti dengan makan kerupuk yang selalu menjadi lomba favorit di setiap perayaan kemerdekaan. Suasana semakin meriah saat perlombaan tarik tambang digelar, di mana kekompakan dan semangat gotong royong benar-benar diuji.\n\nAcara berlangsung dari pagi hingga sore hari dengan jeda istirahat dan sholat berjamaah. Tidak hanya sekadar bermain dan berkompetisi, melalui perlombaan ini para santri belajar arti kebersamaan, sportivitas, dan kerja sama tim.\n\n“Kami berharap perlombaan ini dapat menjadi ajang kebersamaan, meningkatkan semangat nasionalisme, serta menjadikan momentum kemerdekaan sebagai pengingat bahwa perjuangan butuh kekompakan dan semangat pantang menyerah,” ujar salah satu ustadz yang turut mendampingi kegiatan.\n\nDengan penuh keceriaan, kegiatan perlombaan HUT RI ke-80 PTD Ar Rahman ditutup dengan doa bersama dan pembagian hadiah bagi para pemenang lomba.""",
    },
    {
        "image": "https://webbackend.arrahmanic.org/storage/posts/FOTesK9LtJ3rG9UjZRpyFFTRaokHNVrRmS2UGWt8.jpg",
        "title": "Sharing Session PTD Arrahman Hadirkan Senior Engineer Gojek, Kupas Tuntas Next.js",
        "body": """Bekasi – Pesantren Tahfidz dan Digital (PTD) Arrahman kembali menggelar kegiatan Sharing Session yang penuh inspirasi pada Ahad (14/09/2025). Kali ini, acara menghadirkan Mas Hendiri Sudianto, seorang profesional berpengalaman dari Gojek yang telah berkarya selama 9 tahun di perusahaan teknologi ternama tersebut.\n\nDalam kesempatan ini, Mas Hendiri membawakan materi seputar Next.js, framework modern berbasis React yang banyak digunakan dalam pengembangan aplikasi web berskala besar. Ia menjelaskan konsep dasar, best practice, hingga tips praktis yang bisa diterapkan langsung oleh para santri.\n\n“Next.js itu bukan sekadar framework, tapi fondasi penting untuk membangun aplikasi web yang cepat, efisien, dan scalable. Penguasaan framework ini akan membuka peluang besar di dunia kerja teknologi,” ungkap Mas Hendiri dalam sesi presentasinya.\n\nAntusiasme peserta terlihat dari banyaknya pertanyaan yang muncul, mulai dari cara optimasi performa website hingga integrasi Next.js dengan API. Mas Hendiri pun menjawab dengan lugas, sembari membagikan pengalaman nyata selama hampir satu dekade di Gojek.\n\nKegiatan ini menjadi momen berharga bagi santri PTD Arrahman untuk belajar langsung dari praktisi industri. Selain menambah wawasan tentang teknologi terkini, acara ini juga memotivasi peserta agar terus mengasah kemampuan coding dan siap menghadapi tantangan dunia digital.\n\nSharing Session ditutup dengan sesi foto bersama serta pesan motivasi dari Mas Hendiri agar para santri tidak takut untuk mencoba dan terus berinovasi.""",
    },
    {
        "image": "https://webbackend.arrahmanic.org/storage/posts/wt1ZWCPtapJxmpARdm9QifHpC0c8lynN6UESaV97.jpg",
        "title": "Santri PTD Ar Rahman Tunjukkan Semangat Juang di PORSENI PONTREN 2025 Kabupaten Bekasi",
        "body": """BEKASI – Pesantren Tahfidz dan Digital (PTD) Ar Rahman kembali menunjukkan semangatnya dalam ajang Pekan Olahraga dan Seni Pondok Pesantren (PORSENI PONTREN) Tahun 2025 tingkat Kabupaten Bekasi yang digelar pada Kamis (16/10/2025) di Pesantren Darul Azhar, Kecamatan Setu, Bekasi.\n\nKegiatan tahunan ini diikuti oleh sekitar 73 Pondok Pesantren se‑Kabupaten Bekasi, yang turut memeriahkan berbagai cabang perlombaan hasil kolaborasi antara Forum Pondok Pesantren (FPP) dan Pemerintah Kabupaten Bekasi. Lebih dari 2100 santri menjadi peserta utama dalam beragam kegiatan olahraga dan seni yang digelar.\n\nTahun ini, terdapat sembilan cabang perlombaan yang dipertandingkan, di antaranya futsal, badminton, tenis meja, voli, pidato (bahasa Arab, bahasa Inggris, dan bahasa Indonesia), hadroh, serta kaligrafi.\n\nPTD Ar Rahman mengirimkan wakil terbaiknya untuk mengikuti enam cabang lomba, yaitu badminton, futsal, kaligrafi, tenis meja, serta pidato bahasa Arab, bahasa Inggris, dan bahasa Indonesia.\n\nMeskipun hanya diwakili oleh beberapa santri dalam setiap cabang lomba, 19 santri PTD Ar Rahman tetap hadir ke lokasi perlombaan sebagai bentuk dukungan dan semangat kebersamaan kepada rekan‑rekan mereka yang tengah bertanding.\n\n“Harapan kami, dengan ikut sertanya PTD dalam kegiatan PORSENI ini dapat menambah motivasi santri untuk terus melatih kemampuan, semangat juang, dan memberikan yang terbaik bagi pesantren,” ujar Ustadz Nur, salah satu pembimbing PTD Ar Rahman.\n\n“Menang atau kalah bukan hal utama, yang terpenting adalah pengalaman dan pembelajaran berharga yang didapat oleh para santri,” tambahnya.\n\nLebih dari sekadar ajang perlombaan, PORSENI menjadi wadah bagi santri untuk membangun karakter, menanamkan sportivitas, serta menumbuhkan rasa cinta terhadap pesantren dan ilmu.\n\nSemangat para santri PTD Ar Rahman bukan hanya untuk membawa pulang piala, tapi juga membawa pulang pelajaran tentang perjuangan, kebersamaan, dan keikhlasan dalam setiap langkah.""",
    },
    {
        "image": "https://webbackend.arrahmanic.org/storage/posts/MUdyERwyKU5FmT5tP0O7p1b6EA0yrAbPZWBK883k.png",
        "title": "Menjemput Keberkahan Ramadhan, Santri PTD Ar Rahman Gotong Royong Bersihkan Pesantren",
        "body": """Bekasi – Menyambut datangnya bulan Ramadhan, Pesantren Tahfidz dan Digital (PTD) Ar Rahman mengadakan kegiatan bersih‑bersih lingkungan pesantren. Kegiatan bertajuk Gerakan Lingkungan Indah (GLI) ini berlangsung pada Kamis (27/02/2025) ba’da shalat Dhuha, melibatkan para santri dan dewan asatidz.\n\nFokus utama kegiatan ini adalah membersihkan area yang rawan kotor, seperti toilet, ruang makan, ruang tamu, kamar tidur, ruang kelas, hingga dapur. Para santri dibagi ke dalam empat kelompok dengan tugas yang telah ditentukan.\n\nKelompok pertama bertugas membersihkan area rooftop pesantren. Selanjutnya, kelompok kedua bertanggung jawab atas kebersihan lantai tiga, termasuk tempat wudhu, ruang kelas, musholla, hingga ruang programming.\n\nSementara itu, kelompok ketiga di lantai dua difokuskan pada kebersihan ruang podcast, kamar santri, dan aula. Di lantai satu, kelompok terakhir bertugas membersihkan kamar mandi, kantin, ruang tamu, teras depan, serta ruang makan santri.\n\nPartisipasi aktif para santri dan ustadz dalam kegiatan ini mencerminkan kekompakan serta semangat gotong royong dalam menjaga kebersihan lingkungan pesantren. Dengan adanya Gerakan Lingkungan Indah (GLI), diharapkan suasana pesantren menjadi lebih nyaman dan kondusif dalam menyambut ibadah di bulan suci Ramadhan.""",
    },
]

# ---------------------------------------------------------------------------
def upsert_news(session: Session, item: dict) -> None:
    """Insert a new ``NewsArticle`` or update an existing one.

    Matching is performed on the generated slug and known event identity, so
    running the importer cannot recreate the legacy duplicate rows.
    """
    slug = slugify(item["title"])
    # Look for an existing record with the same slug first.
    existing = session.query(NewsArticle).filter(NewsArticle.slug == slug).first()
    if existing is None:
        incoming_identity = news_identity(item["title"])
        for candidate in session.query(NewsArticle).all():
            candidate_title = parse_content(candidate.content).get("title")
            if isinstance(candidate_title, str) and news_identity(candidate_title) == incoming_identity:
                existing = candidate
                break

    incoming_content = {"title": item["title"], "body": item["body"]}
    if existing:
        current_content = parse_content(existing.content)
        merged_content = dict(current_content)
        for key, value in incoming_content.items():
            current = merged_content.get(key)
            if not current or (isinstance(value, str) and len(value) > len(str(current))):
                merged_content[key] = value
        existing.image = item["image"] or existing.image
        if not existing.category or existing.category == "news":
            existing.category = "news"
        existing.content = json.dumps(merged_content, ensure_ascii=False)
        session.add(existing)
    else:
        now = datetime.utcnow()
        news = NewsArticle(
            id=str(uuid.uuid4()),
            slug=slug,
            image=item["image"],
            category="news",
            date="",
            gallery=None,
            content=content,
            created_at=now,
            updated_at=now,
        )
        session.add(news)

# ---------------------------------------------------------------------------
def main() -> None:
    engine = get_engine()
    with Session(engine) as session:
        for item in NEWS_ITEMS:
            upsert_news(session, item)
        session.commit()
        print("News articles upserted successfully.")

if __name__ == "__main__":
    main()
