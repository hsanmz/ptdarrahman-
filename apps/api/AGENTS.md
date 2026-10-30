# Core API Backend — PTDARRAHMAN

Dokumen ini memberikan panduan arsitektur, konvensi kode, modul, dan aturan bisnis backend Core API untuk agen AI dan developer.
*Untuk arsitektur sistem monorepo, topologi jaringan, dan alur request lengkap, rujuk ke [README.md](../../README.md).*
*Untuk panduan desain antarmuka, warna, dan cetak dokumen A4, rujuk ke [DESIGN.md](../../DESIGN.md).*

---

## 🛠️ Tech Stack & Ekosistem
- **Framework:** FastAPI (Python 3.12)
- **Database ORM:** SQLAlchemy 2.0 (Declarative Base, MySQL via `pymysql`)
- **Migrasi Database:** Alembic (`alembic upgrade head`)
- **Data Validation & Settings:** Pydantic v2 & `pydantic-settings`
- **Cache & Message Broker:** Redis (`redis-py` / `aioredis` untuk task queue notifikasi WhatsApp)
- **HTTP Client:** `httpx` (komunikasi dengan Pakasir v2, WhatsApp bridge, dll.)
- **Testing:** `pytest` dengan fixture database transaksi rollback (`tests/conftest.py`)

---

## 🏛️ Arsitektur Aplikasi (Layered Pattern)

Backend menggunakan pola berlapis (*Separation of Concerns*):

```
apps/api/src/
├── main.py                     # Entrypoint FastAPI, CORS, lifespans, router mounting
├── core/                       # Infrastruktur & konfigurasi global
│   ├── config.py               # Pydantic Settings (env variables)
│   ├── database.py             # SQLAlchemy engine, get_db, Base, audit_log
│   ├── dependencies.py         # Auth guards, token decoding, RBAC checks
│   ├── events.py               # Distributed SSE hub (Redis pub/sub + in-memory fallback)
│   ├── pakasir.py              # Official client integration Pakasir API v2
│   ├── rate_limit.py           # In-memory / Redis rate limiting
│   ├── scheduler.py            # Background scheduler (pembersihan sesi & reminder cron)
│   ├── security.py             # Password hashing (bcrypt) & JWT token encoding/cookies
│   ├── session_meta.py         # Ekstraksi metadata sesi (browser, OS, device, IP)
│   └── uploads.py              # File upload handling (local disk & Cloudinary)
├── models/                     # Definisi SQLAlchemy ORM Models
│   ├── auth.py                 # User, Role, Module, Page, UserPagePermission, RefreshToken, AuditLog
│   ├── ppdb.py                 # PPDBPeriod, PPDBWave, PPDBApplicant, FileUpload, PPDBPaymentTransaction, NotificationTemplate, NotificationLog, PPDBPeriodFeeItem, PPDBWaveFeeDiscount, PPDBWaveFeeItem
│   ├── selection.py            # SelectionSession (batch_name), SelectionResult (interview_parent_session_id, batch_name, current_stage), SelectionCategory, SelectionCriteria, SelectionScore
│   ├── cbt.py                  # ExamBank, ExamQuestion, ExamOption, ExamSchedule (batch_name), ExamAttempt, ExamAnswer
│   └── content.py              # NewsArticle, Program, Facility, Staff, GalleryItem, Testimonial, Achievement, SiteSetting, SocialLink, ContactInfo
├── repositories/               # Data Access Object (Query DB mentah & filtering)
│   ├── auth_repository.py
│   ├── ppdb_repository.py
│   ├── payment_repository.py
│   ├── selection_repository.py
│   └── user_repository.py
├── services/                   # Business Logic Layer (validasi bisnis, alur seleksi & formulir)
│   ├── auth_service.py
│   ├── ppdb_service.py
│   ├── payment_service.py
│   ├── selection_service.py
│   ├── selection_stage_service.py # Batch selection grouping, H-1 cutoff, consolidated WA notifications & exam reminders
│   └── user_service.py
└── modules/                    # API Routers & Pydantic Schemas
    ├── auth/                   # POST /auth/login, /me, /refresh, /logout, /sessions
    ├── search/                 # GET /search/global (pencarian modular terpadu lintas entitas)
    ├── cbt/                    # Bank soal CBT (akademik & psikologi), jadwal ujian massal, live monitoring, exam engine API
    ├── payment/                # Pakasir v2 QRIS formulir, webhook, kuitansi resmi
    ├── ppdb/                   # Pendaftaran, profil mandiri, dokumen, periode & fee items, gelombang & diskon, arsip
    ├── selection/              # Seleksi Tahfidz & Wawancara Terpadu, rubrik, penilaian evaluator, reschedule massal
    ├── superadmin/             # Stats dashboard, audit trail, user & role management
    ├── companyprofile/         # Public CMS & admin CRUD (news, programs, settings)
    └── whatsapp/               # Status koneksi & QR code bridge WA service
```

---

## 🔐 Autentikasi & Otorisasi

1. **Cookie-Based Auth:**
   - Token JWT (`access_token` dan `refresh_token`) dikirimkan melalui **HTTP-Only Secure Cookies** dengan atribut `SameSite=Lax` (atau `None` jika cross-domain HTTPS).
   - Request dari browser menyertakan cookie otomatis (`credentials: 'include'`).
   - Endpoint `/auth/refresh` menyegarkan cookie token tanpa login ulang.
2. **Role-Based Access Control (RBAC):**
   - Diperiksa melalui dependency di `src/core/dependencies.py`:
     - `get_current_user`: Memvalidasi user aktif dari cookie.
     - `require_module_access(module, access_level)`: Memastikan izin modul (`none` < `dashboard` < `read` < `crud`).
     - `require_ppdb_admin`: Memastikan akses manajemen PPDB level CRUD.
     - `require_ppdb_read`: Memastikan akses pembacaan data PPDB level READ.
3. **Manajemen Sesi Perangkat & Revokasi:**
   - Metadata sesi (perangkat, browser, OS, alamat IP) diekstrak otomatis melalui `src/core/session_meta.py`.
   - Sesi dicatat dalam tabel `user_sessions`. Endpoint manajemen sesi:
     - `GET /auth/sessions`: Menampilkan seluruh sesi aktif akun.
     - `DELETE /auth/sessions/{id}`: Mencabut sesi login perangkat tertentu.
     - `DELETE /auth/sessions/others`: Mencabut seluruh sesi perangkat lain kecuali yang sedang aktif.

---

## 🔍 Modul Pencarian Global (`src/modules/search/`)

- **Endpoint Terpadu (`GET /search/global`):**
  - Menerima parameter `q` (query teks), `limit`, dan `category`.
  - Melakukan pencarian terindeks lintas entitas: calon santri (`applicants`), artikel berita (`news`), program pendidikan (`programs`), fasilitas, staf, akun pengguna (`users`), dan log aktivitas (`audit_logs`).
  - Hasil difilter sesuai dengan hak akses (RBAC) pengguna yang sedang login.

---

## 💻 Modul CBT & Seleksi Terpadu (`src/modules/cbt/` & `src/services/selection_stage_service.py`)

- **Bank Soal & Kategori Ujian:**
  - `ExamBank` dikelola per periode ajaran untuk dua kategori seleksi: `akademik` dan `psikologi`.
  - Format soal: Pilihan Ganda (Single Choice MCQ A-E) dengan pilihan jawaban (`ExamOption`), kunci jawaban (`is_correct`), dan bobot poin per butir (`ExamQuestion`).
  - Mendukung download template CSV (`GET /cbt/banks/template/{category}`), import bank soal via file CSV/JSON atau tautan publikasi CSV Google Sheets (`POST /cbt/banks/import`, batas 5 MB & 500 soal; Google Forms ditolak dan diarahkan ke Sheets).
  - CRUD pasca-import: `PUT /cbt/banks/{id}` (data bank), `POST /cbt/banks/{id}/questions`, `PUT/DELETE /cbt/banks/{id}/questions/{qid}` (butir soal, opsi A-E, kunci, poin). Respons `GET /cbt/banks/{id}` menyertakan `in_use`.
  - Bank Soal yang sudah dipakai Jadwal Ujian dikunci penuh (edit meta maupun butir soal ditolak) untuk menjaga integritas nilai peserta; hapus/pindahkan jadwalnya dulu.
- **Jadwal Ujian Massal & PIN Akses:**
  - Ujian CBT dijadwalkan massal per gelombang dan batch (`ExamSchedule`), dilengkapi PIN sesi/access token unik (misal: `AKAD-8921`).
  - Mode ujian fleksibel: tatap muka di lab komputer pesantren (`offline`) atau virtual conference (`online`).
- **Pengerjaan & Anti-Kecurangan (Anti-Cheating):**
  - Autentikasi pengerjaan via `POST /cbt/verify-access/{schedule_id}` (memvalidasi password akun pendaftar + PIN sesi ujian, gelombang, dan status berkas; pendaftar baru hanya dapat masuk dalam jendela waktu sesi `session_date`+`start_time` s.d. `end_time` WIB — percobaan yang sudah berjalan tetap boleh masuk kembali).
  - Lembar soal dan state jawaban tersimpan diambil via `GET /cbt/exam-sheet/{schedule_id}`.
  - Autosave instan per klik pilihan jawaban pendaftar via `POST /cbt/save-answer/{schedule_id}`.
  - Deteksi perpindahan tab/jendela atau keluar layar lebih dari 5 detik (`POST /cbt/violation/{schedule_id}`; penutupan/refresh tab juga dilaporkan best-effort via `keepalive`). Pelanggaran otomatis `locked` — pembukaan hanya lewat unfreeze panitia: ujian peserta direset dari soal pertama (jawaban dihapus, timer penuh) dan peserta wajib konfirmasi ulang password + PIN di gerbang ujian.
  - Sinkronisasi timer pengerjaan via `POST /cbt/timer/{schedule_id}`.
  - Pemantauan real-time panitia via `GET /cbt/schedules/{id}/monitoring` dengan fitur buka kunci peserta (`POST /cbt/schedules/{id}/unfreeze/{applicant_id}`).
  - Auto-grading langsung saat ujian diselesaikan (`POST /cbt/finish/{schedule_id}`) atau saat durasi timer habis.
- **Orkestrasi Seleksi Batch & Pengingat WhatsApp:**
  - Penjadwalan seleksi dikelompokkan per batch/kloter dengan cutoff pendaftaran H-1 (24 jam sebelum ujian batch pertama dimulai).
  - Pendaftar yang berkasnya tervalidasi setelah batas cutoff otomatis dijadwalkan ke batch berikutnya.
  - Automated WhatsApp reminder terintegrasi via BullMQ: H-2, H-1, dan 1 jam sebelum jadwal seleksi dimulai.

---

## 💳 Modul Pembayaran & Integrasi Pakasir v2

- **Client Pakasir (`src/core/pakasir.py`):**
  - Menggunakan spesifikasi Pakasir API v2.
  - Normalisasi respons flat JSON (`status`, `data`, `order_id`, `amount`, `payment_method`).
- **Endpoint Utama (`src/modules/payment/router.py`):**
  - `POST /payment/create-qris`: Membuat invoice dinamis QRIS untuk biaya formulir pendaftaran (`payment_type="form"`).
  - `POST /payment/webhook` & `POST /payment/webhook/pak-kasir`: Webhook pembayaran atomik & idempoten. Divalidasi dengan header `X-Secret` dan pencocokan nominal.
  - `GET /payment/receipt/{id}` & `GET /payment/public-receipt/{id}`: Menampilkan data kuitansi resmi yang diamankan dengan HMAC token.
- **Background Scheduler (`src/core/scheduler.py`):**
  - Menjalankan cron internal untuk pembersihan berkala sesi dan refresh token yang kedaluwarsa, pengingat pembayaran formulir setiap Senin, pengingat dokumen H+3, dan pengingat seleksi H-2, H-1, 1 jam sebelum ujian.

---

## 📋 Modul PPDB & Portal Mandiri

- **Profil Mandiri Pendaftar (`GET /ppdb/applicants/me` & `PUT /ppdb/applicants/me`):**
  - Mengambil data formulir lengkap serta mengizinkan pembaruan mandiri data pendaftar (biodata santri, kontak, data orang tua/wali, kuesioner kesehatan).
  - Pembatasan: pembaruan dinonaktifkan permanen (`is_locked = true`) setelah pendaftar menandatangani dokumen LoA resmi.
- **Letter of Acceptance (LoA):**
  - Admin menerbitkan LoA untuk pendaftar yang lulus seleksi.
  - Pendaftar menandatangani LoA digital bersama orang tua sebagai tanda penerimaan resmi (`POST /ppdb/applicants/me/sign-loa`). Penandatanganan LoA ini merupakan tahap akhir pendaftaran (alur selesai).
  - Verifikasi publik dapat diakses via `/ppdb/loa/{registration_or_id}` atau route frontend `/loa/:registrationNo`.
- **Arsip & Dossier Pendaftar:**
  - Lintas periode & gelombang hanya dapat diakses melalui `GET /ppdb/archive/applicants`.
  - Detail dossier lengkap: `GET /ppdb/archive/applicants/{id}/dossier`.
  - Ekspor berkas ZIP: `GET /ppdb/archive/applicants/{id}/dossier/zip` (mencatat IP admin pemohon ke dalam `audit_log`).

---

## ⚠️ Aturan Bisnis Wajib (Non-Negotiable)

1. **Bebas Jenjang & Bebas Jalur Pendidikan:**
   - Tidak ada model/field jenjang (`SMP`, `SMK`) maupun pemilihan jalur. Seluruh calon santri menempuh alur terpadu yang seragam.
2. **Kuesioner Kesehatan (10 Pertanyaan Baku):**
   - Validasi ketat pada saat pendaftaran di `src/modules/ppdb/router.py`: pertanyaan Ya/Tidak harus menyertakan keterangan jika "Ya", kontak darurat harus lengkap, dan pernyataan wajib disetujui (`True`).
3. **Periode & Gelombang Tunggal:**
   - Hanya boleh ada 1 periode aktif secara global, dan maksimal 1 gelombang aktif per periode.
   - Pendaftar otomatis ditautkan ke gelombang aktif saat ini; pendaftar tidak memilih gelombang.
4. **Master Biaya Periode & Diskonasi Gelombang:**
   - Master komponen biaya masuk / biaya pendidikan (uang pangkal, SPP, seragam, dll.) dikelola di level Periode (`PPDBPeriodFeeItem`).
   - Biaya formulir (`PPDBPeriod.form_fee`) dan minimal DP (`PPDBPeriod.minimum_dp`) adalah master tingkat Periode — dulu tersimpan pada `PPDBWave` dan kini dihapus dari gelombang.
   - Gelombang hanya mengatur diskon per komponen biaya (`PPDBWaveFeeDiscount`), bukan membuat item biaya baru dari nol.
   - Penyetoran biaya pendidikan dilakukan **di luar aplikasi** (transfer manual rekening resmi PTDARRAHMAN / tunai di kantor bendahara). Sistem backend tidak menyediakan endpoint QRIS untuk biaya tahap 2 di portal pendaftar; QRIS hanya untuk biaya formulir dari `form_fee` periode.
   - Slot "X pendaftar awal" dikualifikasikan per pendaftar (`PPDBApplicant.early_discount_eligible`): ditandai `PaymentService._assign_early_bird_slot` saat webhook settle (hitungan diambil sebelum transaksi masuk success), di-backfill migrasi 0061, dan otomatis diterapkan pada rincian potongan LoA bagi santri yang berhak. Tidak ada tagihan tahap 2 maupun modul cicilan individual.
5. **Standar Penulisan Nama Institusi (PTDARRAHMAN):**
   - Nama resmi lengkap backend: **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (tetap utuh, jangan diubah).
   - Singkatan institusi/rekening/footer: **`PTDARRAHMAN`**.
   - ❌ **Dilarang keras memakai frasa:** `Yayasan Pesantren Ar-Rahman` atau `Pesantren Ar-Rahman` (tanpa lanjutan tahfidz). Wajib diganti ke `PTDARRAHMAN`.

---

## 🚀 Perintah Pengembangan & Testing

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
