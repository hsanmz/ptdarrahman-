from sqlalchemy import create_engine, text
from src.core.config import settings
import uuid, json, hashlib, base64, struct

eng = create_engine(settings.database_url)
conn = eng.connect()

# Check current state
r = conn.execute(text("SELECT COUNT(*) FROM gallery_items"))
print(f"Current gallery items: {r.fetchone()[0]}")

# Parse mega links
links = [
    ("x6IkxDZZ", "3Trwo01oDgR2bpJeLpP6kyQQn44kEtasV6MEs5YLSSk", "Upacara Bendera", "Kegiatan Pesantren"),
    ("w7YgTQRZ", "XWfNknjE0j6fozgrnai-aQWYCNIi7QqlLqVGBDwEBVE", "Halaqoh", "Kegiatan Tahfidz & Al-Qur'an"),
    ("NvZVAZTY", "I2wu6PIHLHPaFDj1fdR95TnXnddYBaXjAKb--VP4RBM", "Podcast", "Kegiatan Santri"),
    ("IiRgTDAQ", "ZF6fqhbLCrfJ4ymxWUSyy1E3aADrfCRdRBavVhd1WH8", "Photo Bersama", "Dokumentasi Umum"),
    ("kmxECChA", "C2qCCqGyJ4svL27uSLfAJsqQL3GvJuxqJ6A_1fO0AQ0", "Belajar Bersama Ujian Tulis PTD", "Kegiatan Akademik"),
    ("lvB2TI5T", "2oZ_qzVaEwgwkPwZxhwX6xmo_uUCkvNpjbQPMkIOhWA", "Kunjungi Masjid Istiqlal", "Kunjungan & Studi Banding"),
    ("42wVVLCZ", "5G4bbiqROTmNXHnIQ6wAfhczE7_8hakD4ggxPhYTw-0", "Pemanasan Olahraga", "Olahraga & Kebugaran"),
    ("I3AURJba", "TlD-LL7tZvN6_PCZ9W0GZlG3k34lq8dpdTzLuBtO84Y", "Upacara Bendera", "Kegiatan Pesantren"),
    ("B653kDbS", "9X2KVHfoRESt43MQ3lg-8ii2Ma-ga1eNCrLF9VCu6eU", "Pemanasan Persiapan Training (TA)", "Olahraga & Kebugaran"),
    ("9io1AKwB", "xyEBDJwIGU1048bAN4xLwTv6s98oxVhxsSH85Auxmbs", "Futsal", "Olahraga & Kebugaran"),
    ("UmxwCToD", "9ILUc8GqQhCsaSeU6PQtMfF1XBdNFjt2ocxK29h3v14", "Muhadhoroh Pekanan", "Kegiatan Keagamaan"),
    ("Q24V0TBT", "BM8L4bmuMJC5Ak30I9sa2LTSyy5CFKtv_QVd5bP4Rd8", "Lomba MHQ dan Ceramah", "Perlombaan & Prestasi"),
    ("hiIjDTDJ", "7aJoKbd2ofDLZ96aKMSislKlqqEROfkWMTfaDdtJGl4", "Lomba MHQ dan Ceramah", "Perlombaan & Prestasi"),
    ("Fqh0XS5Q", "R9DcDTfvXyeYTgviJ3aPqMlgDt4C9YALoyRpcoW0m4I", "Pembacaan Kitab Hadisul Sholihin", "Kegiatan Tahfidz & Al-Qur'an"),
    ("d3BFjLzB", "6E6zQVYPUGiM9ftgiOlDPZH12gqi56FlMbD8DOQPdzE", "Muhadasah Mingguan", "Kegiatan Keagamaan"),
    ("0jZ10IwK", "toopETSdMRJhlvnCc-zqHMtzIcgH15GU5zwxl49J4L8", "Bermain Bola Bersama", "Olahraga & Kebugaran"),
    ("47QwxARC", "xQyv4jRbjeOmEkYwZnchCA6wOi8nb4qYIbWlshnWHxE", "Berenang Bersama Santri", "Olahraga & Kebugaran"),
    ("1u5QlYoY", "7g2rla1So1DzTBMNhrfv8XdFfIa2NAib2sU9w6Nlg7M", "Belajar Bersama", "Kegiatan Akademik"),
    ("Z652jQaZ", "mOTL1iCXboY9LbKAqcoL92xh99FE546xGXI8ZavkKc4", "Belajar Bersama PTD Arrahman", "Kegiatan Akademik"),
    ("MypTBY5D", "ETRyJ44SaZxRbQ7GOtJBJ_zLGQaJO0FelKbzuFLLqBE", "Agenda Doa Bersama", "Kegiatan Keagamaan"),
    ("ZnhDQKLB", "ejyv33O2m364vh7xVbcFGIxkFC_heb33tPOpOgHhml4", "Khotmul Quran Keliling", "Kegiatan Tahfidz & Al-Qur'an"),
    ("h7oQ1JpC", "jd_fvnnITt5yld_Sy7zLqhfHGuGXQQ1rvBAtAGyfw8I", "Lomba Espeto9 MHQ dan Story Telling", "Perlombaan & Prestasi"),
    ("Bi5y0RjJ", "l4tNY9y7SXtosgR1Mh197uad8UXHQ7CicLiu3hqyvAI", "Persiapan Agenda Berbagi Ilmu (Mengenal B.Arab Lebih Dekat)", "Kegiatan Sekolah"),
    ("c7YhGYAL", "YNEp21x4Tyu2heDWtEIbM1SmtLsFYGe5w1ed6ZazBeA", "Menyimak Pembawa Acara Berbagi Ilmu (Mengenal B.Arab Lebih Dekat)", "Kegiatan Sekolah"),
    ("h2IGGbLD", "1g8LXdgdnnfFzBp6lNPTwuVdgd7FTe7B9CI9Prz_WLo", "Pembacaan Kitab Hadist Harian", "Kegiatan Tahfidz & Al-Qur'an"),
    ("kvhGxKDC", "Z2XDbXBJ7pH1BVGzfLv8d9xuA2bfrDSko1V2Lre_EiU", "Photo Bersama Persiapan Ujian Tahfidz", "Kegiatan Pesantren"),
    ("425TjK6a", "OcQzz2NlaW36J48nJRoq3pPlZAaUHM0Pzm8xX9g72Qo", "Ifthar Jama'i Bersama Wali Santri", "Kehidupan Asrama"),
    ("cj4mHQII", "iKr6cbBQwsKc9VYGiSHlQEllu0rGeHFFao8VOWo7DWI", "Photo di Kereta Kunjungan ke Kota Tua", "Kunjungan & Studi Banding"),
    ("A2B3UTiT", "IiDd7FLIkgBWPQcbMKs2oqfhl0udeqSVjAKa0R52XhY", "Photo Bersama di Kota Tua", "Kunjungan & Studi Banding"),
    ("c6ZXwIzb", "skv6K8vhdWAHlh5wJ3ZJ8B5jl9jrXQmKu_9KmetKCig", "Penghargaan Juara 2 Story Telling PTD", "Perlombaan & Prestasi"),
    ("g65nwSaQ", "SNs87YT0VClYNjzt22mwAIayv-uSo9e0YJ4J6f3k3wY", "Penghargaan Juara 2 Nasyid PTD", "Perlombaan & Prestasi"),
    ("IvIjGCQS", "6y9BZWHisEWyTSUk18F6MVlFctHqnssPMi3mDw6cWSI", "Penghargaan Juara 3 Nasyid PTD", "Perlombaan & Prestasi"),
    ("w7hSjKpa", "n9nhozwFuKMtP1-YhomTpGma0xcQjz9WmNKwY9eZZXM", "Istirahat Selepas Futsal", "Olahraga & Kebugaran"),
    ("NzZRAZYA", "4kqxOGGwL0l-4GcQZ2OgtwAGWOx8DIaW_h5BLfSmDrs", "Muhadhoroh Mingguan", "Kegiatan Keagamaan"),
    ("YiRwDAoZ", "2O_OGHBMVn_yzs4v2AKeLDges7zOGTVDKBVlOFRwc4c", "Upacara Memperingati Hari Raya 17 Agustus 1945", "Acara & Perayaan"),
    ("Y6ZwHQiZ", "7lmJgtIxd8gYzas8k5lJcFxjHhxtkhD8cEvvYnJML8o", "Upacara Memperingati Hari Raya 17 Agustus 1945", "Acara & Perayaan"),
    ("VugRhS6Y", "El446NhcfUcm6hOWg1-kVZii0uetWlbS1bonuPnwksE", "Penghargaan Lomba 17 Agustus 1945", "Acara & Perayaan"),
    ("x2QVCIrJ", "H4CZZpA4bsJPTAGVd2BV0cl5UD-BAIGT0eA6-d6laIg", "Pemberangkatan Menuju Lomba Espeto9", "Perlombaan & Prestasi"),
    ("MnAwUJBJ", "v6K0Z5N7MO0YUw7d8cqEdCIi29EfICga_hT81nadb9c", "Muhadhoroh Mingguan", "Kegiatan Keagamaan"),
    ("c6w30BrD", "odbQZ2_KeKXdRYuMvzMKvZaBAujWL1CZUStRCkbY1Ug", "Pelaksanaan Ujian UTS", "Kegiatan Akademik"),
    ("smYAnbaa", "mIK2NJ93IYgYx23wqLgGOTBil8oYxs_spxZ4X9cJ4Lg", "Pelaksanaan Ujian UTS", "Kegiatan Akademik"),
    ("o3okHSJD", "9hu89LO5fp9UQgk4AkI9o7ObDlyhkHuRTmriuoLwQN0", "Pelaksanaan Ujian UTS", "Kegiatan Akademik"),
    ("1iJwwaLS", "CVXIL6qw4mRrTxDkgYZJ2yXqVSb9-UP_txSTYDK7aec", "Nasihat Dari Ketua Yayasan (Pak Eko)", "Kegiatan Organisasi"),
    ("ImxTiZKJ", "4CFl84s-9S6gPQqPDWwrAWJ2qJ6Wk5giAYIeTrMbWDU", "Photo Bersama Dengan Ust. Khorul Anam", "Dokumentasi Umum"),
    ("wioxgSrY", "im2BcaO6Bu84WJQ6wjAJxbIUdtBVFZcSy39O8L9qDYk", "Photo Bersama Dengan Ust. Khorul Anam", "Dokumentasi Umum"),
    ("Ezpn3ISK", "LU37CnXUSJ4GGfrsQnNeYzVlaryTb3oiHkDRfIyn0Zw", "Upacara Bendera", "Kegiatan Pesantren"),
    ("ViBTibzI", "QnqOv5wgXKEXyBenqEfgQWHu64Qx5a6HzEQh8-T4h0Y", "Upacara Bendera", "Kegiatan Pesantren"),
]

print(f"\nTotal links: {len(links)}")
print("\nNote: These are Mega.nz links (encrypted). Cannot be used directly as image URLs.")
print("Please download the images first, then use the admin panel to upload them.\n")

# Show what we would insert (with placeholder URLs)
for i, (file_id, key, title, category) in enumerate(links):
    placeholder = f"https://placeholder.com/gallery/{i+1}"
    print(f"{i+1:2d}. {title:60s} | {category}")

print("\nTo fill these with real images, please:")
print("1. Download all images from the Mega links")
print("2. Save them in one folder (e.g. C:\\Users\\farre\\Downloads\\gallery_photos)")
print("3. Run: python insert_gallery_from_folder.py <folder_path>")
print("   (This will upload via /companyprofile/upload and insert into DB)")

conn.close()
