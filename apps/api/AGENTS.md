# Core API Backend â€” PTDARRAHMAN

Dokumen ini memberikan panduan arsitektur, konvensi kode, modul, dan aturan bisnis backend Core API untuk agen AI dan developer.
*Untuk arsitektur sistem monorepo, topologi jaringan, dan alur request lengkap, rujuk ke [README.md](../../README.md).*
*Untuk panduan desain antarmuka, warna, dan cetak dokumen A4, rujuk ke [DESIGN.md](../../DESIGN.md).*

---

## ðŸ› ï¸ Tech Stack & Ekosistem
- **Framework:** FastAPI (Python 3.12)
- **Database ORM:** SQLAlchemy 2.0 (Declarative Base, MySQL via `pymysql`)
- **Migrasi Database:** Alembic (`alembic upgrade head`)
- **Data Validation & Settings:** Pydantic v2 & `pydantic-settings`
- **Cache & Message Broker:** Redis (`redis-py` / `aioredis` untuk task queue notifikasi WhatsApp)
- **HTTP Client:** `httpx` (komunikasi dengan Pakasir v2, WhatsApp bridge, dll.)
- **Testing:** `pytest` dengan fixture database transaksi rollback (`tests/conftest.py`)

---

## ðŸ›ï¸ Arsitektur Aplikasi (Layered Pattern)

Backend menggunakan pola berlapis (*Separation of Concerns*):

```
apps/api/src/
â”œâ”€â”€ main.py                     # Entrypoint FastAPI, CORS, lifespans, router mounting
â”œâ”€â”€ core/                       # Infrastruktur & konfigurasi global
â”‚   â”œâ”€â”€ config.py               # Pydantic Settings (env variables)
â”‚   â”œâ”€â”€ database.py             # SQLAlchemy engine, get_db, Base, audit_log
â”‚   â”œâ”€â”€ dependencies.py         # Auth guards, token decoding, RBAC checks
â”‚   â”œâ”€â”€ pakasir.py              # Official client integration Pakasir API v2
â”‚   â”œâ”€â”€ rate_limit.py           # In-memory / Redis rate limiting
â”‚   â”œâ”€â”€ scheduler.py            # Background scheduler (pembersihan sesi kedaluwarsa berkala)
â”‚   â”œâ”€â”€ security.py             # Password hashing (bcrypt) & JWT token encoding/cookies
â”‚   â”œâ”€â”€ session_meta.py         # Ekstraksi metadata sesi (browser, OS, device, IP)
â”‚   â””â”€â”€ uploads.py              # File upload handling (local disk & Cloudinary)
â”œâ”€â”€ models/                     # Definisi SQLAlchemy ORM Models
â”‚   â”œâ”€â”€ auth.py                 # User, Role, UserSession, UserModulePermission, UserPagePermission
â”‚   â”œâ”€â”€ ppdb.py                 # PPDBPeriod, PPDBWave, PPDBApplicant, PPDBDocument, PPDBHealthQuestionnaire, PPDBPeriodFeeItem, PPDBWaveFeeDiscount
â”‚   â”œâ”€â”€ selection.py            # SelectionCategory, SelectionCriteria, SelectionSession, SelectionScore
â”‚   â”œâ”€â”€ cbt.py                  # ExamBank, ExamQuestion, ExamOption, ExamSchedule, ExamAttempt, ExamAnswer
â”‚   â”œâ”€â”€ payment.py              # PPDBPaymentTransaction
â”‚   â”œâ”€â”€ content.py              # SiteSetting, News, Programs, Facilities, dll.
â”‚   â”œâ”€â”€ notification.py         # NotificationLog, NotificationTemplate
â”œâ”€â”€ repositories/               # Data Access Object (Query DB mentah & filtering)
â”‚   â”œâ”€â”€ ppdb_repository.py
â”‚   â”œâ”€â”€ payment_repository.py
â”‚   â”œâ”€â”€ selection_repository.py
â”‚   â””â”€â”€ user_repository.py
â”œâ”€â”€ services/                   # Business Logic Layer (validasi bisnis, alur seleksi & formulir)
â”‚   â”œâ”€â”€ ppdb_service.py
â”‚   â”œâ”€â”€ payment_service.py
â”‚   â”œâ”€â”€ selection_service.py
â”‚   â”œâ”€â”€ selection_stage_service.py # Batch selection grouping, H-1 cutoff, consolidated WA notifications & exam reminders
â”‚   â”œâ”€â”€ auth_service.py
â”‚   â””â”€â”€ user_service.py
â””â”€â”€ modules/                    # API Routers & Pydantic Schemas
    â”œâ”€â”€ auth/                   # POST /companyprofile/auth/login, /me, /refresh, /logout, /sessions
    â”œâ”€â”€ search/                 # GET /search/global (pencarian modular terpadu lintas entitas)
    â”œâ”€â”€ cbt/                    # Bank soal CBT (akademik & psikologi), jadwal ujian massal, live monitoring, exam room API
    â”œâ”€â”€ payment/                # Pakasir v2 QRIS formulir, webhook, kuitansi resmi
    â”œâ”€â”€ selection/              # Seleksi Tahfidz & Wawancara Terpadu, rubrik, penilaian evaluator, reschedule massal
    â”œâ”€â”€ superadmin/             # Stats dashboard, audit trail, user & role management
    â”œâ”€â”€ companyprofile/         # Public CMS & admin CRUD (news, programs, settings)
    â””â”€â”€ whatsapp/               # Status koneksi & QR code bridge WA service
```

---

## ðŸ” Autentikasi & Otorisasi

1. **Cookie-Based Auth:**
   - Token JWT (`access_token` dan `refresh_token`) dikirimkan melalui **HTTP-Only Secure Cookies** dengan atribut `SameSite=Lax` (atau `None` jika cross-domain HTTPS).
   - Request dari browser menyertakan cookie otomatis (`credentials: 'include'`).
   - Endpoint `/companyprofile/auth/refresh` menyegarkan cookie token tanpa login ulang.
2. **Role-Based Access Control (RBAC):**
   - Diperiksa melalui dependency di `src/core/dependencies.py`:
     - `get_current_user`: Memvalidasi user aktif dari cookie.
     - `require_module_access(module, access_level)`: Memastikan izin modul (`none` < `dashboard` < `read` < `crud`).
     - `require_ppdb_admin`: Memastikan akses manajemen PPDB level CRUD.
     - `require_ppdb_read`: Memastikan akses pembacaan data PPDB level READ.
3. **Manajemen Sesi Perangkat & Revokasi:**
   - Metadata sesi (perangkat, browser, OS, alamat IP) diekstrak otomatis melalui `src/core/session_meta.py`.
   - Sesi dicatat dalam tabel `user_sessions`. Endpoint manajemen sesi:
     - `GET /companyprofile/auth/sessions`: Menampilkan seluruh sesi aktif akun.
     - `DELETE /companyprofile/auth/sessions/{id}`: Mencabut sesi login perangkat tertentu.
     - `POST /companyprofile/auth/sessions/revoke-others`: Mencabut seluruh sesi perangkat lain kecuali yang sedang aktif.

---

## ðŸ” Modul Pencarian Global (`src/modules/search/`)

- **Endpoint Terpadu (`GET /search/global`):**
  - Menerima parameter `q` (query teks), `limit`, dan `category`.
  - Melakukan pencarian terindeks lintas entitas: calon santri (`applicants`), artikel berita (`news`), program pendidikan (`programs`), fasilitas, staf, akun pengguna (`users`), dan log aktivitas (`audit_logs`).
  - Hasil difilter sesuai dengan hak akses (RBAC) pengguna yang sedang login.

---

## ðŸ’» Modul CBT & Seleksi Terpadu (`src/modules/cbt/` & `src/services/selection_stage_service.py`)

- **Bank Soal & Kategori Ujian:**
  - `ExamBank` dikelola per periode ajaran untuk dua kategori seleksi: `akademik` dan `psikologi`.
  - Format soal: Pilihan Ganda (Single Choice MCQ) dengan pilihan jawaban A s/d E (`ExamOption`), kunci jawaban (`is_correct`), dan bobot poin per butir (`ExamQuestion`).
  - Mendukung import bank soal massal via CSV/JSON (`POST /cbt/banks/import`).
- **Jadwal Ujian Massal & PIN Akses:**
  - Ujian CBT dijadwalkan massal per gelombang dan batch (`ExamSchedule`), dilengkapi PIN sesi/access token unik (misal: `AKAD-8921`).
  - Mode ujian fleksibel: tatap muka di lab komputer pesantren (`offline`) atau virtual conference (`online`).
- **Pengerjaan & Anti-Kecurangan (Anti-Cheating):**
  - Autentikasi pengerjaan via `POST /cbt/exam/auth` (memvalidasi password akun pendaftar + PIN sesi ujian).
  - Autosave instan per klik pilihan jawaban pendaftar via `POST /cbt/exam/answer`.
  - Deteksi perpindahan tab/jendela keluar layar lebih dari 5 detik (`POST /cbt/exam/violation`). Pelanggaran berulang otomatis mengunci status pengerjaan pendaftar (`locked`).
  - Pemantauan real-time panitia via `GET /cbt/schedules/{id}/monitoring` dengan fitur buka kunci peserta (`POST /cbt/schedules/{id}/unfreeze`).
  - Auto-grading langsung saat ujian diselesaikan (`POST /cbt/exam/submit`) atau saat durasi timer habis.
- **Orkestrasi Seleksi Batch & Pengingat WhatsApp:**
  - Penjadwalan seleksi dikelompokkan per batch/kloter dengan cutoff pendaftaran H-1 (24 jam sebelum ujian batch pertama dimulai).
  - Pendaftar yang berkasnya tervalidasi setelah batas cutoff otomatis dijadwalkan ke batch berikutnya.
  - Automated WhatsApp reminder terintegrasi via BullMQ: H-2, H-1, dan 1 jam sebelum jadwal seleksi dimulai.

---

## ðŸ’³ Modul Pembayaran & Integrasi Pakasir v2

- **Client Pakasir (`src/core/pakasir.py`):**
  - Menggunakan spesifikasi Pakasir API v2.
  - Normalisasi respons flat JSON (`status`, `data`, `order_id`, `amount`, `payment_method`).
- **Endpoint Utama (`src/modules/payment/router.py`):**
  - `POST /payment/create-qris`: Membuat invoice dinamis QRIS untuk biaya formulir pendaftaran.
  - `POST /payment/webhook` & `POST /payment/webhook/pak-kasir`: Webhook pembayaran atomik & idempoten. Divalidasi dengan header `X-Secret` dan pencocokan nominal.
  - `GET /payment/receipt/{id}` & `GET /payment/public-receipt/{id}`: Menampilkan data kuitansi resmi yang diamankan dengan HMAC token.
- **Background Scheduler (`src/core/scheduler.py`):**
  - Menjalankan cron internal untuk pembersihan berkala sesi dan refresh token yang kedaluwarsa.

---


- **Profil Mandiri Pendaftar (`GET /ppdb/applicants/me` & `PUT /ppdb/applicants/me`):**
  - Mengambil data formulir lengkap serta mengizinkan pembaruan mandiri data pendaftar (biodata santri, kontak, data orang tua/wali, kuesioner kesehatan).
  - Pembatasan: pembaruan dinonaktifkan (`is_locked`) jika pendaftar sudah menandatangani dokumen LoA resmi atau dikunci panitia.
- **Letter of Acceptance (LoA):**
  - Admin menerbitkan LoA untuk pendaftar yang lulus (`/ppdb/pengumuman`).
  - Pendaftar menandatangani LoA digital bersama orang tua sebagai tanda penerimaan resmi (`POST /ppdb/applicants/me/sign-loa`). Penandatanganan LoA ini merupakan tahap akhir pendaftaran (alur selesai).
  - Verifikasi publik dapat diakses via `/ppdb/loa/{registration_or_id}`.
- **Arsip & Dossier Pendaftar:**
  - Lintas periode & gelombang hanya dapat diakses melalui `GET /ppdb/archive/applicants`.
  - Detail dossier lengkap: `GET /ppdb/archive/applicants/{id}/dossier`.
  - Ekspor berkas ZIP: `GET /ppdb/archive/applicants/{id}/dossier/zip` (mencatat IP admin pemohon ke dalam `audit_log`).

---

## âš ï¸ Aturan Bisnis Wajib (Non-Negotiable)

1. **Tanpa Jenjang Pendidikan:**
   - Tidak ada model/field jenjang (`SMP`, `SMK`). Jangan menambahkan parameter atau validasi jenjang pada endpoint pendaftaran, gelombang, maupun laporan.
2. **Kuesioner Kesehatan (10 Pertanyaan):**
   - Validasi ketat pada saat pendaftaran di `src/modules/ppdb/router.py`: pertanyaan Ya/Tidak harus menyertakan keterangan jika "Ya", kontak darurat harus lengkap, dan pernyataan wajib disetujui (`True`).
3. **Periode & Gelombang Tunggal:**
   - Hanya boleh ada 1 periode aktif secara global, dan maksimal 1 gelombang aktif per periode.
   - Pendaftar otomatis ditautkan ke gelombang aktif saat ini; pendaftar tidak memilih gelombang.
4. **Master Biaya Periode & Diskonasi Gelombang:**
   - Master komponen biaya masuk / biaya pendidikan (uang pangkal, SPP, seragam, dll.) dikelola di level Periode (`PPDBPeriodFeeItem`).
   - Gelombang hanya mengatur diskon per komponen biaya (`PPDBWaveFeeDiscount`), bukan membuat item biaya baru dari nol.
   - Penyetoran biaya pendidikan dilakukan **di luar aplikasi** (transfer manual rekening resmi PTDARRAHMAN / tunai di kantor bendahara). Sistem backend tidak menyediakan endpoint QRIS untuk biaya tahap 2.
5. **Standar Penulisan Nama Institusi (PTDARRAHMAN):**
   - Nama resmi lengkap backend: **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (tetap utuh, jangan diubah).
   - Singkatan institusi/rekening/footer: **`PTDARRAHMAN`**.
   - âŒ **Dilarang keras memakai frasa:** `Yayasan Pesantren Ar-Rahman` atau `Pesantren Ar-Rahman` (tanpa lanjutan tahfidz). Wajib diganti ke `PTDARRAHMAN`.

---

## ðŸš€ Perintah Pengembangan & Testing

```bash
# Masuk ke direktori backend
cd apps/api

# Aktifkan virtual environment
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows

# Jalankan migrasi database
alembic upgrade head

# Jalankan server FastAPI lokal (port 8000)
uvicorn src.main:app --reload --port 8000

# Jalankan unit & integration tests
pytest
```
