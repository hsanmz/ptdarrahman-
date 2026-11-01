# Panduan Agent — PPDB PTDARRAHMAN

> Dokumen ini adalah panduan utama bagi AI agent yang bekerja di monorepo ini. Gunakan sebagai referensi pertama sebelum membaca kode. Selalu prioritaskan dokumen di `docs/` sebagai acuan aturan bisnis terbaru — jangan menerapkan flow lama dari arsip kode atau README lama tanpa konfirmasi.

---

## 📑 Daftar Isi

1. [Status Kebutuhan Produk](#status-kebutuhan-produk)
2. [Ruang Lingkup Sistem](#ruang-lingkup-sistem)
3. [Alur Tahap Pendaftar](#alur-tahap-pendaftar)
4. [Aturan Bisnis Kritis](#aturan-bisnis-kritis)
5. [Arsitektur Database & Model](#arsitektur-database--model)
6. [Konvensi Pengkodean](#konvensi-pengkodean)
7. [Endpoint Kritis](#endpoint-kritis)
8. [Integrasi External](#integrasi-external)
9. [Dokumen Resmi & Ekspor Cetak](#dokumen-resmi--ekspor-cetak)
10. [Pencarian & Manajemen Sesi](#pencarian--manajemen-sesi)
11. [Rute Publik Tanpa Login](#rute-publik-tanpa-login)
12. [Acuan Dokumen Repository](#acuan-dokumen-repository)
13. [Aturan Kerja & Konvensi](#aturan-kerja--konvensi)

---

## Status Kebutuhan Produk

Sistem PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman menaungi **Konfigurasi Backoffice Panitia** dan **Portal Tahapan Mandiri Calon Santri (Pendaftar)**. Gunakan dokumen spesifikasi terbaru dalam `docs/` sebagai acuan kebutuhan utama. Jangan menerapkan flow lama dari kode arsip atau README lama tanpa konfirmasi.

---

## Ruang Lingkup Sistem

### 1. Konfigurasi Backoffice Panitia

Admin/Panitia menyiapkan komponen operasional sebelum pendaftaran dibuka:

- **Periode:** nama periode, tahun ajaran, master komponen biaya pendidikan (uang pangkal, SPP, seragam, matrikulasi, dll.), biaya formulir (QRIS pendaftaran), dan minimal DP biaya pendidikan — berlaku standar untuk seluruh gelombang di bawahnya.
- **Gelombang:** tanggal buka/tutup, kuota pendaftar, kuota diskon pendaftar awal, dan diskonasi per komponen biaya master (diskon reguler dan diskon pendaftar awal). Gelombang tidak menyimpan komponen biaya, biaya formulir, maupun minimal DP.
- **Template dan LoA:** generate dan preview LoA sebelum publish serta klausul dana formulir tidak dapat dikembalikan (*non-refundable*).
- **Rubrik Penilaian:** kriteria, bobot, dan formulir evaluator Tahfidz serta Wawancara.
- **Bank Soal CBT (Akademik & Psikologi):** kelola bank soal per periode, kategori akademik dan psikologi, daftar soal pilihan ganda (MCQ A-E), kunci jawaban, bobot poin, dan durasi pengerjaan.
- **Jadwal Seleksi CBT Massal:** penjadwalan ujian CBT per gelombang dan kloter/batch, PIN akses/session token, mode ujian online (Zoom) atau offline (Lab CBT).
- **Pemantauan Ujian Real-Time:** pengawasan pengerjaan live (status peserta, sisa waktu, deteksi keluar tab/pelanggaran, auto-submit saat habis waktu, dan unfreeze peserta).
- **Jadwal Seleksi Tahfidz:** penjadwalan ujian tahfidz massal per gelombang & batch untuk seluruh pendaftar, penguji, mode online/offline, tautan Zoom atau lokasi tatap muka.
- **Jadwal Wawancara (Santri & Ortu/Wali):** penjadwalan terpadu satu waktu untuk wawancara calon santri dan orang tua/wali santri (komitmen pendidikan & kesiapan santri).
- **Batching & Cutoff H-1:** pengelompokan jadwal seleksi per batch/kloter dengan cutoff pendaftaran 24 jam sebelum ujian batch dimulai, serta sistem automated reminder WhatsApp H-2, H-1, dan 1 jam sebelum ujian.

---

## Alur Tahap Pendaftar

Pendaftar melewati tahapan pendaftaran secara berurutan dan terstruktur, yang **berakhir tuntas pada penandatanganan LoA**:

| # | Tahap | Aksi Kunci | Endpoint Terkait |
|---|---|---|---|
| 1 | **Pendaftaran Akun (6 Bagian)** | Identitas Santri, Data Ortu/Wali Lengkap, Kontak, Domisili, Kuesioner Kesehatan (10 soal), Pernyataan | `POST /ppdb/register` |
| 2 | **Bayar Formulir (Pakasir v2)** | QRIS dinamis → kuota berkurang atomik → kuitansi resmi ber-HMAC terbit | `POST /payment/create-qris` |
| 3 | **Upload Dokumen** | NISN, KK, Akte, Pas Foto, KTP Orang Tua/Wali, 4 Rapor Terakhir (diverifikasi panitia di backoffice) | `POST /ppdb/documents/upload` |
| 4 | **Ujian Seleksi (Akademik, Psikologi, Tahfidz)** | Akses ujian seleksi terpadu CBT & Tahfidz sesuai jadwal batch yang ditentukan otomatis | `POST /cbt/verify-access/{schedule_id}`, `POST /cbt/finish/{schedule_id}`, `GET /selection/applicants/me/sessions` |
| 5 | **Wawancara Terpadu (Santri & Ortu)** | Wawancara terpadu calon santri dan orang tua/wali dalam satu jadwal bersamaan | `GET /selection/applicants/me/sessions` |
| 6 | **Pengumuman + LoA Digital** | Panitia rilis hasil kelulusan seleksi terpadu → pendaftar unduh LoA → tanda tangan digital santri & orang tua (Alur PPDB Tuntas, `is_locked = true`) | `POST /ppdb/applicants/me/sign-loa` |
| 7 | **Nomor Registrasi & Grup WA** | Nomor registrasi resmi terbit pasca-LoA (`REG-{YYYYMMDD}-{XXXX}`) & akses tautan grup WhatsApp resmi santri baru | `GET /ppdb/applicants/me` |
| 8 | **Profil Mandiri & Keamanan** | Update profil & kuesioner kesehatan (selama belum locked), kelola avatar, ganti password, pantau sesi login perangkat aktif | `PUT /ppdb/applicants/me` |

> **is_locked:** Setelah LoA resmi terbit dan ditandatangani, flag `is_locked = true` dikunci permanen. Pendaftar tidak dapat mengubah data formulir atau kuesioner kesehatan setelah status ini. Alur PPDB telah tuntas.

---

## Aturan Bisnis Kritis

### Periode & Gelombang Tunggal

- **Periode Tunggal:** Hanya satu periode aktif secara global. Mengaktifkan periode lain menonaktifkan periode dan gelombang sebelumnya.
- **Gelombang Tunggal:** Dalam satu periode hanya boleh ada satu gelombang aktif. Mengaktifkan gelombang lain menggantikan gelombang aktif sebelumnya.
- **Penautan Otomatis:** Pendaftar otomatis masuk ke gelombang aktif satu-satunya — tidak ada pilihan manual.

### Master Biaya Periode & Diskonasi Gelombang

- **Master Biaya di Periode:** Seluruh master komponen biaya masuk / biaya pendidikan (uang pangkal, SPP, seragam, dll.) dikonfigurasi di level Periode (`ppdb_period_fee_items`). Setiap gelombang dalam periode otomatis mewarisi komponen biaya standar yang sama. Biaya formulir (`ppdb_periods.form_fee`) dan minimal DP (`ppdb_periods.minimum_dp`) juga master tingkat Periode, bukan per gelombang.
- **Gelombang Cukup Diskonasi:** Gelombang (`ppdb_waves`) tidak membuat komponen biaya dari nol, melainkan hanya mengatur diskonasi per komponen biaya periode (`ppdb_wave_fee_discounts`): Diskon Reguler (persen/nominal), Diskon Pendaftar Awal (Early Bird persen/nominal), serta kuota diskon pendaftar awal (`early_discount_quota`).
- **Biaya Pendidikan Sebagai Informasi:** Biaya pendidikan dihitung dan disajikan secara transparan sebagai rincian resmi pada Letter of Acceptance (LoA) calon santri yang lulus.
- **Pembayaran di Luar Aplikasi:** Penyetoran biaya pendidikan dilakukan **di luar aplikasi** (transfer rekening resmi PTDARRAHMAN / tunai ke kantor bendahara pesantren). Di dalam portal PPDB pendaftar **tidak ada** pembayaran online tahap 2, dan alur pendaftaran tuntas saat penandatanganan LoA.

### Kuota Atomik & Penutupan Otomatis

- Kuota dan diskon X pendaftar awal dihitung dari pembayaran formulir yang **sukses** (bukan dari pendaftaran akun). Slotnya kualifikasi per pendaftar: flag `ppdb_applicants.early_discount_eligible` ditandai saat webhook mengonfirmasi bayar formulir sukses; LoA dan halaman Diskonasi membaca flag ini, bukan memberi early bird ke seluruh gelombang.
- Saat kuota tercapai: gelombang ditutup otomatis, invoice pending dibatalkan, dan WA reminder dihentikan.
- **Pengecualian pembayaran terlambat:** jika webhook sukses tiba setelah kuota habis dan invoice dibatalkan → tandai sebagai *exception* (`late_payment_exception`) untuk pemeriksaan admin. **Jangan** memindahkan pendaftar ke gelombang lain secara otomatis.

### Bebas Jenjang & Bebas Jalur Pendidikan

- Sistem **tidak mengenal** daftar jenjang pendidikan (`SMP`, `SMK`, dll.) dan tidak mengenal jalur pendaftaran (tanpa pemilihan jalur; seluruh calon santri menempuh seleksi terpadu seragam).
- Tidak ada pemilihan jenjang atau jalur di mana pun: formulir registrasi, dashboard pendaftar, konfigurasi gelombang, maupun halaman publik.
- Pendaftar tidak dapat memilih, mengisi, atau mengubah jenjang dan jalur.
- **Jangan** menambah field/whitelist jenjang atau jalur baru di backend maupun UI.
- Jika jenjang perlu dicantumkan di dokumen resmi LoA, perlakukan sebagai atribut tetap institusi dari satu konfigurasi tingkat sekolah — **bukan input pengguna**.

### Kuesioner Kesehatan (Pengganti Medcheck)

- Diisi sendiri oleh pendaftar saat registrasi awal di `/register` — **bukan** oleh petugas medis.
- Struktur **10 pertanyaan baku:** riwayat penyakit kronis, diagnosis kondisi tertentu, alergi, pengobatan rutin, keterbatasan fisik, riwayat rawat inap (2 tahun terakhir), kebutuhan khusus belajar, nama kontak darurat, hubungan kontak darurat, nomor telepon darurat.
- Pertanyaan Ya/Tidak membuka kolom keterangan kondisional. Keterangan pada jawaban "Tidak" dikosongkan dan tidak dikirim.
- Validasi kelengkapan dijalankan ulang di backend saat pendaftaran.
- Data kesehatan bersifat **sensitif**: hanya dapat dibuka oleh admin pada detail/dossier pendaftar dengan catatan audit.
- Pendaftar dapat memperbarui kuesioner di `/applicant/profile` selama `is_locked = false`.

### Arsip & Dossier

- Filter pencarian lintas periode dan gelombang **hanya ada** di halaman `/admin/arsip` — tidak ditambahkan ke tabel operasional lain.
- Klik baris santri membuka **Halaman Detail Dossier (`/admin/arsip/:id` - `ArsipDossierDetailPage`)**:
  - Menyajikan pratinjau kontinu 4 dokumen resmi: (1) Formulir Pendaftaran & Kesehatan A4, (2) Berkas Upload Terverifikasi, (3) Lembar Penilaian & Transkrip Nilai A4 (skor CBT Akademik & Psikologi dari `notes_akademik` & `notes_psikologi`, Tahfidz, Wawancara), dan (4) LoA Resmi A4 ber-QR HMAC & tanda tangan digital.
  - Pusat unduhan berkas: cetak PDF per lembar dokumen dan paket bundle ZIP satu-klik (`GET /ppdb/archive/applicants/{id}/dossier/zip`).
- Akses dossier dibatasi izin khusus (`require_ppdb_admin`) dan setiap pembukaan berkas/unduhan mencatat log audit bersama alamat IP admin.

### Standar Penulisan Nama Institusi & Entitas (Naming Convention)

Wajib dipatuhi oleh seluruh developer dan AI agent di semua aplikasi (`apps/api`, `apps/ppdb`, `apps/companyprofile`, `apps/superadmin`, `packages/*`, dan `docs/`):

1. **Nama Resmi Lembaga (Utuh & Baku):**
   - Gunakan selalu: **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (atau huruf kapital penuh pada Kop dokumen: **`PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN`**).
   - **JANGAN** pernah mengubah, memotong, atau menambahkan kata baru di depan/belakang nama resmi ini (misal: *jangan* menulis `PTDARRAHMAN (Pesantren Tahfidz Qur'an dan Digital Ar-Rahman)`). Jika ada nama lengkap ini di kode atau dokumen, biarkan tetap utuh apa adanya.
2. **Singkatan / Nama Entitas Pendek:**
   - Gunakan selalu: **`PTDARRAHMAN`** (atau **`PTD ARRAHMAN`** / **`PTD Ar-Rahman`**).
   - Digunakan untuk:
     - Branding aplikasi & judul tab (contoh: *Superadmin Panel - PTDARRAHMAN*, *PPDB PTDARRAHMAN*).
     - Rincian kanal pembayaran resmi di luar aplikasi: *Rekening Resmi PTDARRAHMAN*, *Kantor Administrasi & Bendahara PTDARRAHMAN*.
     - Footer surat & watermark sistem: *Letter of Acceptance (LoA) Resmi - PTDARRAHMAN*, *Sistem Resmi PPDB PTDARRAHMAN*.
     - Penyebutan singkat profil: *PTDARRAHMAN*.
3. **KATA YANG DILARANG KERAS DIGUNAKAN:**
   - ❌ **DILARANG** menulis: **`Yayasan Pesantren Ar-Rahman`** atau **`Yayasan Pesantren Ar Rahman`**.
   - ❌ **DILARANG** menulis: **`Pesantren Ar-Rahman`** atau **`Pesantren Ar Rahman`** sebagai sebutan entitas mandiri tanpa kelanjutan *Tahfidz Qur'an dan Digital*.
   - Jika menemukan kata-kata terlarang di atas pada kode lama atau template teks, wajib diganti menjadi **`PTDARRAHMAN`**.

---

## Arsitektur Database & Model

Model SQLAlchemy dikelompokkan per domain di `apps/api/src/models/`:

| File Model | Domain | Tabel Utama |
|---|---|---|
| `auth.py` | Autentikasi & Pengguna | `users`, `roles`, `modules`, `pages`, `user_page_permissions`, `audit_logs`, `refresh_tokens` |
| `ppdb.py` | PPDB Inti | `ppdb_periods`, `ppdb_waves`, `ppdb_applicants`, `file_uploads`, `ppdb_payment_transactions`, `notification_templates`, `notification_logs`, `ppdb_period_fee_items`, `ppdb_wave_fee_discounts`, `ppdb_wave_fee_items` (legacy) |
| `selection.py` | Seleksi & Wawancara | `selection_sessions` (dengan `batch_name`), `selection_results` (dengan `interview_parent_session_id`, `batch_name`, `current_stage`), `selection_categories`, `selection_criteria`, `selection_scores` |
| `cbt.py` | Ujian CBT (Akademik & Psikologi) | `ppdb_exam_banks`, `ppdb_exam_questions`, `ppdb_exam_options`, `ppdb_exam_schedules` (dengan `batch_name`), `ppdb_exam_attempts`, `ppdb_exam_answers` |
| `content.py` | CMS Company Profile | `news_articles`, `programs`, `facilities`, `staff`, `gallery_items`, `testimonials`, `achievements`, `site_settings`, `social_links`, `contact_info` |

**Konvensi migrasi:** Gunakan Alembic (`apps/api/alembic/`). Setiap perubahan skema harus melalui file migrasi — **jangan** `ALTER TABLE` langsung ke database produksi.

---

## Konvensi Pengkodean

### Backend (FastAPI — `apps/api/`)

Arsitektur berlapis (layered architecture):

```
Router (src/modules/ atau src/routers/)
  └──► Service (src/services/)
         └──► Repository (src/repositories/)
                └──► SQLAlchemy Model / Redis / External API
```

| Lapisan | Lokasi | Tanggung Jawab |
|---|---|---|
| **Router** | `src/modules/` | Validasi request (Pydantic), otorisasi, panggil service, format response |
| **Service** | `src/services/` | Logika bisnis, orkestrasi antar-repository, transaksi DB |
| **Repository** | `src/repositories/` | Query database, tidak boleh ada logika bisnis |
| **Core** | `src/core/` | Klien eksternal: `pakasir.py`, `cloudinary.py`, `scheduler.py`, `security.py`, `events.py` |
| **Models** | `src/models/` | Definisi SQLAlchemy ORM |
| **Schemas** | `src/modules/*/schemas.py` | Pydantic request/response schema |

**Aturan:**
- Router **tidak boleh** memanggil repository secara langsung — harus melalui service.
- Service **tidak boleh** mengimport router atau schema response secara langsung.
- Repository **tidak boleh** mengandung logika bisnis — hanya query data.
- Semua dependency injection menggunakan `Depends()` FastAPI.

### Frontend (React — `apps/ppdb/`, `apps/superadmin/`)

```
Page Component (src/pages/)
  └──► Feature Component (src/components/<feature>/)
         └──► API Hook (src/hooks/ atau src/services/)
                └──► API Client (src/api/client.ts atau src/lib/api.ts)
```

- Gunakan TanStack Query untuk data fetching dinamis.
- State global dengan Zustand / Context API; state lokal dengan `useState`/`useReducer`.
- Komponen UI bersama berada di `packages/ui` — import dari `@repo/ui/...`.

---

## Endpoint Kritis

### Autentikasi
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/auth/login` (atau `/companyprofile/auth/login`) | Login, set HTTP-only Cookie JWT |
| `POST` | `/auth/logout` | Hapus cookie & revoke sesi |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/sessions` | Daftar sesi aktif pengguna |
| `DELETE` | `/auth/sessions/{session_id}` | Revoke sesi spesifik |
| `DELETE` | `/auth/sessions/others` | Revoke semua sesi lain |

### Pendaftaran PPDB
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/ppdb/register` | Registrasi akun pendaftar baru (6 section) |
| `GET` | `/ppdb/applicants/me` | Data pendaftar yang sedang login |
| `PUT` | `/ppdb/applicants/me` | Update profil & kuesioner kesehatan (selama `is_locked = false`) |
| `POST` | `/ppdb/applicants/me/sign-loa` | Tanda tangan digital LoA (Alur pendaftaran tuntas, kunci `is_locked = true`) |

### Dokumen
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/ppdb/documents/upload` | Upload dokumen persyaratan |
| `POST` | `/ppdb/documents/submit` | Finalisasi submit dokumen ke panitia |

### Seleksi & Wawancara
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/selection/sessions` | Daftar jadwal sesi seleksi & wawancara per gelombang |
| `POST` | `/selection/sessions` | Buat jadwal sesi seleksi atau wawancara massal baru |
| `GET` | `/selection/sessions/{id}/evaluation` | Lembar evaluasi rubrik pendaftar di sesi |
| `POST` | `/selection/applicants/{id}/move-session` | Pindah sesi pendaftar (reschedule) & kirim WA notifikasi baru |
| `GET` | `/selection/applicants/me/sessions` | Jadwal sesi seleksi & wawancara pendaftar yang login |
| `GET` | `/selection/results` | Rekapitulasi hasil penilaian seleksi |
| `POST` | `/selection/results` | Simpan evaluasi nilai rubrik |

### CBT (Akademik & Psikologi)
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/cbt/banks` | Daftar bank soal per kategori (`akademik`/`psikologi`) |
| `GET` | `/cbt/banks/template/{category}` | Download template CSV bank soal |
| `POST` | `/cbt/banks/import` | Import file bank soal (MCQ pilihan ganda A-E) |
| `GET` | `/cbt/schedules` | Daftar jadwal ujian CBT massal per gelombang |
| `POST` | `/cbt/schedules` | Buat jadwal ujian CBT per gelombang & batch |
| `GET` | `/cbt/schedules/{id}/monitoring` | Live monitoring ujian (status peserta, sisa waktu, pelanggaran) |
| `POST` | `/cbt/schedules/{id}/unfreeze/{applicant_id}` | Buka kunci peserta ujian yang ter-lock |
| `POST` | `/cbt/schedules/{id}/move-candidate/{applicant_id}` | Reschedule peserta CBT ke batch/jadwal lain |
| `POST` | `/cbt/verify-access/{schedule_id}` | Gerbang autentikasi CBT (Password akun + PIN sesi) |
| `GET` | `/cbt/exam-sheet/{schedule_id}` | Ambil lembar soal CBT peserta |
| `POST` | `/cbt/save-answer/{schedule_id}` | Autosave jawaban per klik opsi |
| `POST` | `/cbt/violation/{schedule_id}` | Lapor pelanggaran tab switch > 5 detik |
| `POST` | `/cbt/timer/{schedule_id}` | Sinkronisasi sisa waktu ujian peserta |
| `POST` | `/cbt/finish/{schedule_id}` | Selesai ujian & auto-grading skor akhir |
| `GET` | `/cbt/status/{schedule_id}` | Status pengerjaan ujian peserta |

### Payment (Formulir)
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/payment/create-qris` | Buat invoice formulir, generate QRIS Pakasir |
| `POST` | `/payment/webhook` | Terima webhook Pakasir v2 |
| `POST` | `/payment/webhook/pak-kasir` | Endpoint webhook 1 Pintu Pakasir |
| `GET` | `/payment/receipt/{id}` | Kuitansi pembayaran formulir (internal/user) |
| `GET` | `/payment/public-receipt/{id}` | Kuitansi publik (verifikasi QR HMAC) |

### Admin Backoffice
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/ppdb/waves` | Daftar gelombang |
| `POST` | `/ppdb/waves` | Buat gelombang baru |
| `PUT` | `/ppdb/waves/{id}/activate` | Aktifkan gelombang (tunggal per periode) |
| `GET` | `/ppdb/applicants` | Daftar pendaftar (gelombang aktif) |
| `GET` | `/ppdb/applicants/{id}` | Detail pendaftar |
| `PUT` | `/ppdb/documents/{id}/verify` | Verifikasi dokumen pendaftar |
| `GET` | `/ppdb/archive/applicants` | Arsip pendaftar lintas periode & gelombang |
| `GET` | `/ppdb/archive/applicants/{id}/dossier` | Detail dossier pendaftar |
| `GET` | `/ppdb/archive/applicants/{id}/dossier/zip` | Download paket bundle ZIP berkas pendaftar |
| `GET` | `/ppdb/periods/{id}/fee-items` | Daftar master komponen biaya periode |
| `POST` | `/ppdb/periods/{id}/fee-items` | Tambah master komponen biaya periode |
| `PUT` | `/ppdb/periods/{id}/fee-items/{item_id}` | Update master komponen biaya periode |
| `DELETE` | `/ppdb/periods/{id}/fee-items/{item_id}` | Hapus master komponen biaya periode |
| `PUT` | `/ppdb/waves/{id}/fee-discounts/{fee_item_id}` | Update diskon komponen biaya pada gelombang |

### Pencarian & Superadmin
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/search/global` | Pencarian global terpadu lintas modul |
| `GET` | `/companyprofile/settings` | Konfigurasi global sistem |
| `PUT` | `/companyprofile/settings` | Update konfigurasi global |

### Verifikasi Publik
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/kuitansi/:id` & `/receipt/:id` | Verifikasi kuitansi via QR (publik) |
| `GET` | `/loa/:registrationNo` | Verifikasi LoA via QR (publik) |

---

## Integrasi External

### 💳 Pakasir API v2
- **File:** `apps/api/src/core/pakasir.py` & `src/services/payment_service.py`
- **QRIS Dinamis:** Pembayaran formulir men-generate QRIS baru dengan batas waktu kedaluwarsa.
- **Webhook 1 Pintu:** `POST /payment/webhook` dan `POST /payment/webhook/pak-kasir`
  - Validasi header `X-Secret`
  - Pencocokan nominal
  - Idempotency check — mencegah duplikasi saldo/kuota
- **Kuitansi:** Pembayaran formulir yang terkonfirmasi menerbitkan kuitansi bertanda tangan HMAC.

### 🖼️ Cloudinary
- **File:** `apps/api/src/core/cloudinary.py`
- **Digunakan untuk:** Upload & serve gambar avatar pendaftar, logo institusi, foto staf, galeri, dan aset CMS.
- **Dynamic branding:** Logo dan favicon diambil dinamis via `settingsService.getLogo()` — **jangan** hardcode path statis.

### 📱 WhatsApp (whatsapp-web.js)
- **Arsitektur:** Core API enqueue job ke Redis → BullMQ consumer di `apps/whatsapp` → `whatsapp-web.js` kirim pesan.
- **Event notifikasi:** Pembayaran formulir sukses, pengingat bayar formulir Senin, pengingat submit dokumen H+3, jadwal seleksi & wawancara terbit/berubah, pengingat ujian H-2/H-1/1 jam, pengumuman hasil kelulusan, dan konfirmasi LoA signed.
- **Port internal:** `:3100` — tidak dipublikasikan ke host, hanya diakses dari jaringan Docker internal (`127.0.0.1:3100`).
- **Spesifikasi template:** `docs/notifikasi-code-1790904241894.md`

### ⏰ Scheduler Maintenance
- **File:** `apps/api/src/core/scheduler.py`
- **Tugas:** Pembersihan token kedaluwarsa dan sesi ter-revoke secara berkala setiap jam, pengingat pembayaran Senin pukul 08.00 WIB, pengingat dokumen H+3 pukul 08.00 WIB, serta pengingat ujian H-2, H-1, dan 1 jam sebelum mulai.

---

## Dokumen Resmi & Ekspor Cetak

Sistem menerapkan format cetak dan ekspor resmi A4 baku (`apps/ppdb/src/utils/export*`):

| Dokumen | Fungsi | Isi |
|---|---|---|
| **Formulir Pendaftaran** | `exportApplicantForm` | Data diri, riwayat sekolah, keluarga, kuesioner kesehatan + stempel digital |
| **Lembar Penilaian Evaluator** | `exportAssessment` | Nilai Tahfidz & Wawancara berbobot |
| **Kuitansi Resmi Pembayaran** | `exportReceipt` | Nominal formulir, tanggal, stempel digital, QR verifikasi HMAC |
| **Surat Penerimaan (LoA)** | `exportLoa` | TTD digital orang tua + panitia, QR verifikasi, status tuntas penerimaan |

---

## Pencarian & Manajemen Sesi

### Pencarian Terpadu
- **Core API (`GET /search/global`):** Endpoint pencarian modular lintas entitas — pendaftar, berita, program, staf, pengguna sistem, dan log aktivitas.
- **Superadmin Semantic Engine (`Ctrl+K`):** Dialog pencarian semantik cerdas untuk navigasi cepat halaman, pencarian data pendaftar, dan eksekusi tindakan instan.

### Manajemen Sesi Multi-Perangkat
- Terpasang pada seluruh profil pengguna (Pendaftar, Admin PPDB, Admin Web, dan Superadmin) melalui paket bersama `@repo/ui/profile`.
- Melacak sesi login aktif: perangkat, browser, OS, alamat IP, waktu interaksi terakhir.
- Menyediakan fungsi pemutusan sesi jarak jauh (*remote session revoke*) dan pencabutan seluruh sesi lain saat terjadi aktivitas mencurigakan.

---

## Rute Publik Tanpa Login

- `/kuitansi/:id` & `/receipt/:id` — Verifikasi keaslian kuitansi pembayaran resmi via QR code.
- `/loa/:registrationNo` — Verifikasi keaslian Surat Penerimaan (LoA) calon santri resmi via QR code.

---

## Acuan Dokumen Repository

| Dokumen | Path | Keterangan |
|---|---|---|
| **System Design & Monorepo** | `README.md` | Arsitektur teknis lengkap (System Design), alur request, database, dan Docker |
| **Sistem Desain UI/UX** | `DESIGN.md` | Panduan desain visual, palet warna, tipografi, token, komponen, dan A4 print |
| Aturan Bisnis & Requirements | `docs/REQUIREMENTS.md` | Spesifikasi aturan bisnis dan logika utama |
| Laporan QA & E2E Testing | `docs/QA-TESTING-REPORT.md` | Laporan pengujian alur penuh PPDB 100% Passed (245 Passed, 1 XFAIL, 0 Failed) |
| Docker Runbook Lokal | `docs/DOCKER_SETUP.md` | Deployment lokal WSL2 & Docker langkah per langkah |
| Docker Runbook Production | `docs/DOCKER_PRODUCTION.md` | Panduan deployment VPS Ubuntu & Nginx Reverse Proxy |
| Hero 3D Globe | `docs/HERO_3D_GLOBE.md` | Arsitektur Three.js dan optimasi bundle |
| Notifikasi WhatsApp | `docs/notifikasi-code-1790904241894.md` | Template dan event notifikasi WhatsApp |
| Skrip & Tooling | `scripts/README.md` | Sinkronisasi Windows-WSL, normalisasi LF, tooling debug |
| Skrip Setup Otomatis | `setup.sh` | One-command setup (`./setup.sh docker` & `./setup.sh local`) |
| Panduan Agent API | `apps/api/AGENTS.md` | Arsitektur backend (FastAPI, Alembic, Pakasir v2, Repositories) |
| Panduan Agent PPDB | `apps/ppdb/AGENTS.md` | Arsitektur frontend PPDB (rute tahapan mandiri & backoffice) |
| Panduan Agent Superadmin | `apps/superadmin/AGENTS.md` | Arsitektur panel Superadmin |
| Panduan Agent Company Profile | `apps/companyprofile/AGENTS.md` | Arsitektur portal Company Profile & auth cookies |

---

## Aturan Kerja & Konvensi

- **Dynamic branding:** Logo dan favicon diambil dinamis dari API `settingsService.getLogo()` — **jangan** hardcode path logo statis.
- **Secret & Kredensial:** Simpan di file `.env` lokal masing-masing aplikasi. **Jangan pernah** commit file secret ke Git.
- **Git:** Jangan commit atau membuat branch baru kecuali diminta secara eksplisit oleh user.
- **Jenjang & Jalur:** Jangan menambah field atau logika jenjang pendidikan atau jalur di mana pun (lihat [Bebas Jenjang & Bebas Jalur Pendidikan](#bebas-jenjang--bebas-jalur-pendidikan)).
- **Standar Naming:** Jangan gunakan kata `Yayasan Pesantren Ar-Rahman` atau `Pesantren Ar-Rahman` (tanpa lanjutan tahfidz). Selalu gunakan `PTDARRAHMAN` untuk singkatan entitas/rekening, dan `Pesantren Tahfidz Qur'an dan Digital Ar-Rahman` untuk nama lengkap institusi.
- **Arsip:** Filter lintas periode/gelombang hanya di `/admin/arsip` — jangan spread ke tabel operasional lain.

### Keselarasan Port

| Lingkungan | App | Port |
|---|---|---|
| **Docker Compose** | Company Profile | `:3000` |
| **Docker Compose** | Superadmin | `:5173` |
| **Docker Compose** | PPDB | `:5174` |
| **Docker Compose** | Core API | `:8080` |
| **Docker Compose** | WhatsApp (internal) | `:3100` |
| **Local Vite Dev** | Company Profile | `:3000` |
| **Local Vite Dev** | Superadmin | `:5173` |
| **Local Vite Dev** | PPDB | `:5174` |
| **Local Vite Dev** | Core API | `:8000` |
