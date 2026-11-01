<div align="center">
  <img src="https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png" alt="Ar-Rahman Logo" width="120" />
  <h1>Sistem PPDB dan Company Profile PTDARRAHMAN</h1>
  <p><strong>Company Profile & Portal Terpadu PPDB (Penerimaan Peserta Didik Baru)</strong></p>

  [![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
  [![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Python](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![TypeScript](https://img.shields.io/badge/React_Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://vitejs.dev/)

</div>

---

Selamat datang di monorepo Sistem Terpadu **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**. Repository ini menaungi seluruh ekosistem digital institusi — mulai dari website publik (Company Profile), portal seleksi mandiri santri, backoffice PPDB, hingga panel superadmin dan layanan notifikasi WhatsApp.

---

## 📑 Daftar Isi

1. [Arsitektur Monorepo](#-arsitektur-monorepo)
2. [Tech Stack per Aplikasi](#-tech-stack-per-aplikasi)
3. [System Design](#-system-design)
   - [Diagram Arsitektur Sistem](#1-diagram-arsitektur-sistem)
   - [Infrastruktur Docker & Resource Limits](#2-infrastruktur-docker--resource-limits)
   - [Autentikasi, Sesi & RBAC Detail](#3-autentikasi-sesi--rbac-detail)
   - [Pipeline Tahap Calon Santri](#4-pipeline-tahap-calon-santri)
   - [Arsitektur Pembayaran Pakasir API v2](#5-arsitektur-pembayaran-pakasir-api-v2)
   - [Arsitektur WhatsApp Microservice & BullMQ](#6-arsitektur-whatsapp-microservice--bullmq)
   - [Arsitektur Database & Domain Models](#7-arsitektur-database--domain-models)
   - [Aturan Bisnis Kritis (Business Invariants)](#8-aturan-bisnis-kritis-business-invariants)
   - [Integrasi Eksternal](#9-integrasi-eksternal)
4. [Dokumen Resmi & Ekspor Cetak](#-dokumen-resmi--ekspor-cetak)
5. [Rute Verifikasi Publik (Tanpa Login)](#-rute-verifikasi-publik-tanpa-login)
6. [UI/UX Design System](#-uiux-design-system)
7. [Referensi Dokumen](#-referensi-dokumen)
8. [Quick Start](#-quick-start)

---

## 🏗️ Arsitektur Monorepo

Project ini menggunakan arsitektur modular **pnpm workspace** yang diorkestrasi oleh **Turborepo**. Masing-masing aplikasi saling terisolasi namun terhubung melalui Core API pusat dan jaringan internal Docker.

| Aplikasi | Path | Tech Stack | Peran |
|---|---|---|---|
| 🎓 **PPDB** | [`apps/ppdb`](apps/ppdb/README.md) | React 19, Vite 8, TypeScript, Tailwind v3.4 | Portal santri + Backoffice PPDB |
| 🛡️ **Superadmin** | [`apps/superadmin`](apps/superadmin/README.md) | React 19, Vite 8, TypeScript, Tailwind v3.4 | Panel manajemen platform & RBAC |
| 🌐 **Company Profile** | [`apps/companyprofile`](apps/companyprofile/README.md) | Next.js 16, Tailwind v4, Three.js | Website publik & portal login terpusat |
| ⚙️ **Core API** | [`apps/api`](apps/api/README.md) | FastAPI, Python 3.12, MySQL 8, Redis 7 | Backend REST API monolithic |
| 📱 **WA Gateway** | [`apps/whatsapp`](apps/whatsapp/README.md) | Node.js, BullMQ, Express, Puppeteer | Service notifikasi WhatsApp mandiri |
| 🧩 **Shared UI** | `packages/ui` | React 19, TypeScript, Tailwind | Komponen UI bersama (profile, session, dialog) |
| 🔧 **TS Config** | `packages/typescript-config` | TypeScript | Konfigurasi TypeScript terpusat |

> **Catatan:** `apps/whatsapp` adalah service mandiri berbasis Node.js — **bukan** bagian dari pnpm workspace. Dikelola dan di-build secara independen.

---

## 🛠️ Tech Stack per Aplikasi

### 🎓 apps/ppdb — Portal Santri & Backoffice
| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 |
| Bahasa | TypeScript |
| State/Data | TanStack Query v5, Zustand |
| Routing | React Router v7 |
| UI | Tailwind CSS v3.4, Radix UI |
| PDF/Print | Print engine kustom A4 (`utils/export*`) |
| Auth | HTTP-only Cookie JWT (via Core API) |

**Fitur Backoffice:** Manajemen gelombang & master biaya, verifikasi berkas, Bank Soal CBT (Akademik & Psikologi), penjadwalan ujian CBT massal & live monitoring peserta, seleksi Tahfidz & Wawancara terpadu (Santri & Ortu), rekapitulasi penilaian seleksi gabungan, review & penerbitan LoA, cetak dokumen resmi, arsip dossier detail (`/admin/arsip/:id`) dengan viewer 4 berkas resmi kontinu & unduhan paket ZIP.

### 🛡️ apps/superadmin — Panel Superadmin
| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 |
| Bahasa | TypeScript |
| Styling | Tailwind CSS v3.4 |
| Pencarian | Semantic search `Ctrl+K` |
| Auth | HTTP-only Cookie JWT (via Core API) |

**Fitur:** Manajemen akun staf/admin, matriks RBAC per modul, audit trail log aktivitas, broadcast notifikasi, monitoring bot WhatsApp, pemantauan sesi login aktif multi-perangkat.

### 🌐 apps/companyprofile — Website Publik
| Kategori | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + Turbopack |
| Styling | Tailwind CSS v4 |
| 3D | Three.js (Hero Globe) |
| CMS | Admin panel internal (11 tab CRUD) |

**Fitur:** Website publik pesantren, program pendidikan dinamis, berita, fasilitas, galeri, hero 3D interaktif, portal login terpusat untuk semua role.

### ⚙️ apps/api — Core API Backend
| Kategori | Teknologi |
|---|---|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Database | MySQL 8 |
| Cache/Queue | Redis 7 |
| Auth | JWT (HTTP-only Cookie), RBAC |
| Payment | Pakasir API v2 |
| Storage | Cloudinary & Local disk |
| Scheduler | APScheduler (session & reminder maintenance) |

**Fitur:** REST API monolithic, modul CBT mandiri & live monitoring anti-cheating, payment gateway QRIS formulir, webhook payment idempoten, pencarian global terpadu, generator dokumen resmi.

### 📱 apps/whatsapp — WA Gateway
| Kategori | Teknologi |
|---|---|
| Runtime | Node.js |
| Queue | BullMQ + Redis |
| WA Client | whatsapp-web.js + Chromium |

**Fitur:** Penerima task dari Core API via Redis queue, pengirim notifikasi otomatis (pembayaran formulir, jadwal seleksi, grup WA, pengingat ujian H-2/H-1/1 jam), standalone service.

---

## 🔬 System Design

> **Arsitektur Sistem Teknis & Alur Operasional Monorepo PPDB PTDARRAHMAN**
> Bagian ini memuat rancangan sistem teknis menyeluruh (System Design) dari ekosistem digital Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Untuk panduan antarmuka visual, palet warna, tipografi, dan komponen UI, rujuk ke [DESIGN.md](DESIGN.md).

---

### 1. Diagram Arsitektur Sistem

Ekosistem mengadopsi pola arsitektur **Monolith Berorientasi Layanan (Service-Oriented Modular Monolith)** dengan microservice mandiri untuk otomatisasi WhatsApp:

```
[ Klien Pengguna ]
  │  (Desktop, Smartphone, Tablet)
  ▼
[ Nginx Reverse Proxy / Port Publik :80, :443 ]
  │
  ├──► :3000 ──► container: companyprofile (Next.js 16 SSR / App Router)
  │
  ├──► :5173 ──► container: superadmin    (React 19 SPA, Vite preview / Nginx static)
  │
  ├──► :5174 ──► container: ppdb          (React 19 SPA, Vite preview / Nginx static)
  │
  └──► :8080 ──► container: api           (FastAPI / Uvicorn Python 3.12)
          (Host :8000)   │
                         ├──► MySQL 8 Database (Relational Store & ACID Transactions)
                         │
                         ├──► Redis 7 In-Memory Broker
                         │     ├── DB 0: JWT Session Store & Rate Limiter
                         │     ├── DB 1: BullMQ Job Queue (Notifikasi WhatsApp)
                         │     └── DB 2: Shared Application Cache
                         │
                         └──► :3100 (Internal Only) ──► container: whatsapp
                                                          ├── BullMQ Worker (Node.js)
                                                          └── Chromium (whatsapp-web.js)
```

**Alur Akses Jaringan:**
- Port publik frontend (`:3000`, `:5173`, `:5174`) dan API (`:8080` di Docker / `:8000` di Dev Host) dapat diakses klien.
- Port microservice WhatsApp (`:3100`) **hanya dapat diakses melalui jaringan internal Docker (`127.0.0.1:3100` / bridge network)**, terisolasi dari akses publik luar.

---

### 2. Infrastruktur Docker & Resource Limits

Semua layanan diorkestrasi via Docker Compose (`docker-compose.yml` untuk dev/staging, `docker-compose.prod.yml` untuk VPS production) dengan alokasi batas memori eksplisit:

| Container | Image / Base | Port Internal | Port Host | `mem_limit` | Peran Utama |
|---|---|---|---|---|---|
| `frontend` | Node.js 20-alpine (pnpm) | 3000, 5173, 5174 | 3000, 5173, 5174 | 1536 MB | Menyajikan UI companyprofile, superadmin, & ppdb |
| `api` | Python 3.12-slim (FastAPI) | 8000 | 8080 (dev: 8000) | 512 MB | Backend REST API monolithic |
| `whatsapp` | Node.js 20 + Chromium | 3100 | 127.0.0.1:3100 | 768 MB (`shm_size: 256MB`) | WhatsApp Gateway via BullMQ consumer |
| `redis` | Redis 7-alpine | 6379 | internal | 256 MB (`maxmemory: 192MB`) | Cache, JWT Session, & Message Queue |
| `mysql` | MySQL 8.0 | 3306 | internal / cloud | Remote / Dedicated | Penyimpanan data relasional utama |

#### Named Volumes & Persistensi Data:
- `uploads_data`: Menyimpan berkas unggahan pendaftar (dokumen persyaratan, foto, dsb.)
- `redis_data`: Persistensi snapshot disk data antrian Redis
- `wa_session`: Direktori sesi otentikasi Chromium WhatsApp Web agar tidak perlu re-scan QR setiap restart
- `wa_logs`: Berkas log aktivitas pengiriman pesan WhatsApp

#### Health Check & Dependency Chain:
```
redis (healthy) ──► api (healthy) ──► frontend (companyprofile, ppdb, superadmin)
                                 └──► whatsapp (healthy)
```

---

### 3. Autentikasi, Sesi & RBAC Detail

#### Mekanisme Token Cookie HTTP-Only
Aplikasi mengabaikan penyimpanan token di `localStorage` demi perlindungan terhadap serangan Cross-Site Scripting (XSS).

```
[ Klien Browser ]                                    [ Core API ]
        │                                                  │
        │─── POST /auth/login ────────────────────────────►│
        │    (username/email, password)                    │ (Validasi bcrypt hash)
        │                                                  │
        │◄── Set-Cookie: access_token (HttpOnly, Secure) ──│
        │    Set-Cookie: refresh_token (HttpOnly, Secure)  │
        │    Response: { user_id, role, permissions }      │ (Catat sesi di DB user_sessions)
        │                                                  │
        │                                                  │
  (Setiap Request Biasa)                                   │
        │─── GET /api/v1/... (credentials: 'include') ────►│
        │    (Cookie access_token terkirim otomatis)       │ (Validasi JWT & cek status user)
        │◄── HTTP 200 OK (Data Response) ──────────────────│
        │                                                  │
        │                                                  │
  (Token Expired 401)                                      │
        │─── Request API (401 Unauthorized) ──────────────►│
        │                                                  │
        │─── POST /auth/refresh ──────────────────────────►│ (Gunakan refresh_token)
        │◄── Set-Cookie: access_token baru ────────────────│
        │─── Ulangi Request Semula (Auto-Retry) ──────────►│
```

#### Hierarki RBAC (Role-Based Access Control)
Tingkat izin hak akses tersusun secara berjenjang dari yang paling ketat ke paling longgar:

```
none < dashboard < read < crud
```

- `none`: Modul tertutup sepenuhnya bagi user.
- `dashboard`: Pengguna hanya berhak melihat statistik agregat / ringkasan.
- `read`: Pengguna dapat membaca data detail, namun tidak dapat melakukan perubahan.
- `crud`: Pengguna memiliki hak penuh untuk membuat, memperbarui, dan menghapus data modul.

#### Tipe Pengguna & Cakupan Akses:
- `applicant`: Akses portal mandiri santri (`/applicant/*`).
- `admin`: Akses backoffice panitia PPDB (`/admin/*`).
- `website_admin`: Akses CMS konten publik Company Profile (`/admin/dashboard`).
- `superadmin`: Akses kendali penuh lintas semua modul, audit log, konfigurasi sistem, dan manajemen akun staf.

#### Pelacakan Sesi Aktif Multi-Perangkat (Multi-Device Session Management):
- Setiap login mencatat metadata perangkat di tabel `user_sessions`: nama perangkat, browser, OS, alamat IP klien, dan waktu interaksi terakhir (*last_active*).
- Pengguna maupun Superadmin dapat mencabut sesi tertentu dari jarak jauh (`DELETE /auth/sessions/{id}`).
- Tersedia fitur darurat pencabutan seluruh sesi lain (`DELETE /auth/sessions/others`) jika terindikasi kebocoran kredensial.

---

### 4. Pipeline Tahap Calon Santri

Calon santri melalui tahapan seleksi terstruktur dengan alur yang berujung tuntas pada penandatanganan LoA:

```
 1. REGISTRASI AKUN (Wizard 6 Bagian)
    POST /ppdb/register
    • Identitas Santri • Data Ortu/Wali Lengkap • Kontak (Email & WA)
    • Domisili • Kuesioner Kesehatan (10 Soal) • Persetujuan
    └──► Auto-link ke satu-satunya gelombang aktif
            │
            ▼
 2. BAYAR FORMULIR (Pakasir v2 QRIS)
    POST /payment/create-qris ──► Scan QRIS
    Webhook Pakasir v2 ──► Konfirmasi Pembayaran
    └──► Kuota berkurang atomik; Kuitansi resmi terbit (/kuitansi/:id)
            │
            ▼
 3. UNGGAH DOKUMEN
    POST /ppdb/documents/upload & POST /ppdb/documents/submit
    • Berkas wajib: NISN, KK, Akta Kelahiran, Pas Foto, KTP Orang Tua/Wali, 4 Rapor Terakhir
    └──► Panitia verifikasi berkas di Backoffice (/admin/verifikasi-dokumen)
            │
            ▼
 4. UJIAN SELEKSI CBT & SESI TAHFIDZ
    • Ujian CBT Akademik & Psikologi (/exam/:scheduleId)
      - Verifikasi PIN sesi, timer countdown, autosave per opsi
      - Anti-cheating (deteksi tab switch > 5 detik otomatis lock)
      - Live monitoring & unfreeze peserta di backoffice
    • Sesi Seleksi Tahfidz Al-Qur'an (/applicant/tes-seleksi)
      - Jadwal batch otomatis panitia, mode online Zoom / tatap muka
            │
            ▼
 5. SESI WAWANCARA TERPADU (SANTRI & ORANG TUA/WALI)
    • Wawancara Terpadu (/applicant/wawancara)
      - Sesi wawancara santri (motivasi, adab, kesiapan asrama)
      - Sesi wawancara orang tua/wali (komitmen & keselarasan visi)
      - Pengingat WhatsApp otomatis terjadwal: H-2, H-1, dan 1 jam sebelum ujian
            │
            ▼
 6. PENGUMUMAN KELULUSAN & LoA DIGITAL (Alur Selesai)
    POST /ppdb/applicants/me/sign-loa
    • Panitia rilis status kelulusan di backoffice
    • Pendaftar & orang tua/wali menandatangani LoA digital secara resmi
    └──► is_locked = true (Seluruh data formulir & kesehatan terkunci permanen)
    └──► LoA dapat diverifikasi publik (/loa/:registrationNo)
    └──► Alur pendaftaran PPDB tuntas pada penandatanganan LoA
            │
            ▼
 7. PENERBITAN NOMOR REGISTRASI & GRUP WA
    • Terbit otomatis pasca penandatanganan LoA
    • Format nomor registrasi unik resmi: REG-{YYYYMMDD}-{XXXX}
    └──► Tautan eksklusif bergabung ke Grup WhatsApp Resmi Santri Baru
            │
            ▼
 8. PROFIL MANDIRI & KEAMANAN
    PUT /ppdb/applicants/me
    • Tinjau berkas pendaftaran & kesehatan (read-only karena is_locked = true)
    • Penggantian kata sandi & avatar profil
    └──► Manajemen dan audit sesi login perangkat aktif
```

---

### 5. Arsitektur Pembayaran Pakasir API v2

Sistem pembayaran mengintegrasikan gerbang pembayaran resmi **Pakasir API v2** dengan perlindungan idempotensi satu pintu:

```
[ Pendaftar ]                 [ Core API ]                [ Pakasir API v2 ]
      │                             │                            │
      │─── Klik "Bayar Formulir" ──►│                            │
      │                             │─── POST /api/v2/invoice ──►│
      │                             │    (order_id, amount)      │
      │                             │◄── Response QRIS payload ──│
      │◄── Tampilkan QR Code ───────│                            │
      │                             │                            │
 (Pendaftar Scan & Bayar via m-Banking / e-Wallet)               │
      │                                                          │
      │                                                          │─── Webhook Notifikasi ──┐
      │                                                          │    POST /payment/webhook│
      │                                                          │    (Header: X-Secret)   │
      │                             ┌────────────────────────────┴─────────────────────────┘
      │                             ▼
      │                     [ Webhook Handler API ]
      │                     ├── 1. Validasi header X-Secret
      │                     ├── 2. Pencocokan nominal tagihan (exact match)
      │                     ├── 3. Idempotency Check (skip jika invoice sudah PAID)
      │                     ├── 4. Pengurangan kuota gelombang secara atomik di DB
      │                     │       │
      │                     │       ├── Kuota Habis?
      │                     │       │    ├── Auto-close gelombang pendaftaran
      │                     │       │    ├── Batalkan seluruh invoice formulir pending
      │                     │       │    ├── Kirim WA blast pemberitahuan penutupan
      │                     │       │    └── Hentikan jadwal pengingat Senin
      │                     │       └── Kuota Masih Ada ──► Lanjut proses
      │                     ├── 5. Update status invoice ──► PAID
      │                     ├── 6. Terbitkan Kuitansi Resmi bertanda tangan HMAC
      │                     └── 7. Enqueue notifikasi WA ──► Redis DB 1 ──► BullMQ
      │
      ▼
[ Kuitansi Publik ] ◄── GET /kuitansi/:id (Dapat diakses publik tanpa login via QR)
```

#### Penanganan Transaksi Terlambat (`late_payment_exception`):
Jika webhook pembayaran sukses tiba dari Pakasir **setelah** tagihan dibatalkan karena kuota gelombang telah habis:
1. Sistem **tidak** menolak pembayaran dan **tidak** memindahkan pendaftar secara otomatis ke gelombang lain.
2. Sistem menandai transaksi dengan status `late_payment_exception`.
3. Insiden masuk ke dashboard panitia untuk penanganan manual administratif (penambahan kuota darurat atau proses pengembalian dana resmi).

---

### 6. Arsitektur WhatsApp Microservice & BullMQ

Notifikasi WhatsApp diproses secara asynchronous menggunakan pola antrian pesan terdistribusi:

```
[ Core API (FastAPI) ]
   │
   │ Operasi event (Invoice terbit, Pembayaran sukses, LoA, Jadwal sesi)
   ▼
[ Enqueue Job via aioredis ]
   │ Queue Name: 'wa-notifications'
   ▼
[ Redis Instance (DB 1) ]
   │
   ▼ (BLPOP / Worker Consumer)
[ WhatsApp Microservice (apps/whatsapp) ]
   ├── BullMQ Job Worker (Concurrency: 1)
   ├── Anti-flood Rate Limiting (Jeda acak 2-5 detik antar pesan)
   ├── Headless Chromium Instance (whatsapp-web.js)
   └── Eksekusi Kirim Pesan / Kirim File Dokumen
          │
          ├── Sukses ──► Catat riwayat di tabel notification_logs
          └── Gagal  ──► Retry eksponensial (maksimal 3 kali) ──► Dead Letter Queue
```

---

### 7. Arsitektur Database & Domain Models

Struktur data relasional dikelompokkan secara terpisah berdasarkan domain bisnis di `apps/api/src/models/`:

```
apps/api/src/models/
├── auth.py          # User, Role, Module, Page, UserPagePermission, RefreshToken, AuditLog
├── ppdb.py          # PPDBPeriod, PPDBWave, PPDBApplicant, FileUpload, PPDBPaymentTransaction, NotificationTemplate, NotificationLog, PPDBPeriodFeeItem, PPDBWaveFeeDiscount, PPDBWaveFeeItem
├── selection.py     # SelectionSession, SelectionResult, SelectionCategory, SelectionCriteria, SelectionScore
├── cbt.py           # ExamBank, ExamQuestion, ExamOption, ExamSchedule, ExamAttempt, ExamAnswer
└── content.py       # NewsArticle, Program, Facility, Staff, GalleryItem, Testimonial, Achievement, SiteSetting, SocialLink, ContactInfo
```

#### Entitas & Relasi Inti:
1. **`PPDBPeriod` (1) ───< (N) `PPDBWave`:** Periode menaungi gelombang. Hanya 1 periode dan 1 gelombang yang boleh berstatus aktif dalam satu waktu secara global.
2. **`PPDBWave` (1) ───< (N) `PPDBApplicant`:** Pendaftar otomatis terikat pada satu-satunya gelombang yang aktif saat registrasi.
3. **`PPDBApplicant` (1) ───< (N) `PPDBPaymentTransaction`:** Transaksi pembayaran formulir pendaftar (satu-satunya transaksi pembayaran online di portal PPDB).
4. **`PPDBPeriodFeeItem` / `PPDBWaveFeeDiscount`:** Master komponen biaya didefinisikan di level periode, diskon diatur per gelombang. Hasil kalkulasi biaya disajikan transparan pada LoA santri lulus (pembayaran biaya pendidikan dilakukan di luar aplikasi). Sistem tagihan cicilan / tahap 2 lama telah di-decommission secara permanen.

#### Konvensi Migrasi Skema:
Semua perubahan skema database wajib melalui berkas migrasi Alembic (`apps/api/alembic/versions/`). **Dilarang keras mengeksekusi perintah DDL (`ALTER TABLE`) langsung di database produksi.**

---

### 8. Aturan Bisnis Kritis (Business Invariants)

Aturan-aturan berikut adalah pilar integritas sistem yang wajib dipatuhi di backend maupun frontend:

1. **Bebas Jenjang & Bebas Jalur Pendidikan:**
   - Sistem **sama sekali tidak mengenal** pemilihan jenjang pendidikan (`SMP`, `SMK`, dll.) dan tidak mengenal pemilihan jalur pendaftaran.
   - Tidak ada dropdown, filter, atau field isian jenjang/jalur di seluruh formulir registrasi, dashboard pendaftar, konfigurasi gelombang, maupun halaman publik.
2. **Periode & Gelombang Tunggal:**
   - Hanya boleh ada **satu periode aktif** secara global. Mengaktifkan periode lain otomatis menonaktifkan periode sebelumnya dan gelombang di dalamnya.
   - Hanya boleh ada **satu gelombang aktif** per periode. Mengaktifkan gelombang lain otomatis menonaktifkan gelombang aktif sebelumnya.
   - Pendaftar tidak memilih gelombang; sistem otomatis menautkannya ke gelombang aktif satu-satunya.
3. **Kuota Atomik & Penutupan Otomatis:**
   - Kuota dan diskon pendaftar awal dihitung dari transaksi pembayaran formulir yang **sukses terkonfirmasi** (bukan dari pendaftaran akun).
   - Saat kuota terpenuhi: gelombang langsung ditutup otomatis, tagihan formulir pending dibatalkan, dan WA reminder dihentikan.
4. **Kuesioner Kesehatan (Pengganti Medcheck):**
   - Diisi mandiri oleh pendaftar saat registrasi (10 soal baku + kontak darurat + pernyataan).
   - Bersifat sensitif: hanya dapat dibuka oleh admin berizin pada dossier pendaftar dan setiap akses tercatat dalam log audit.
5. **Kunci Formulir Pasca-LoA (`is_locked = true`):**
   - Begitu LoA resmi ditandatangani oleh pendaftar dan wali santri, seluruh data profil dan kuesioner kesehatan dikunci permanen (`is_locked = true`) dan alur pendaftaran selesai.
6. **Arsip Terpusat di `/admin/arsip` & Halaman Dossier (`/admin/arsip/:id`):**
   - Filter lintas periode dan gelombang **hanya tersedia di halaman Arsip/Cari Pendaftar (`/admin/arsip`)**.
   - Klik baris santri membuka **Halaman Detail Dossier (`/admin/arsip/:id`)** dua kolom:
     * **Panel Kiri:** Pratinjau kontinu 4 dokumen resmi baku (Formulir Pendaftaran & Kesehatan A4, Berkas Upload, Transkrip Penilaian/Nilai CBT A4, dan LoA Resmi A4).
     * **Panel Kanan:** Navigator dokumen, cetak dokumen PDF langsung, dan **Unduh Paket Dossier ZIP Lengkap** (`GET /ppdb/archive/applicants/{id}/dossier/zip`).
   - Setiap pembukaan dan pengunduhan berkas dossier diaudit secara ketat dengan mencatat alamat IP admin ke `audit_logs`.
7. **Master Komponen Biaya di Periode & Pembayaran di Luar Aplikasi:**
   - Seluruh komponen biaya masuk / biaya pendidikan (uang pangkal, SPP, seragam, dll.) dikonfigurasi di level Periode (`ppdb_period_fee_items`), bukan di gelombang.
   - Gelombang hanya mengonfigurasi diskonasi (`ppdb_wave_fee_discounts`) terhadap master komponen periode.
   - Pembayaran biaya pendidikan dilakukan **di luar aplikasi** (transfer rekening resmi PTDARRAHMAN / tunai bendahara pesantren). Sistem PPDB tidak memfasilitasi transaksi online tahap 2; informasi biaya disajikan transparan pada Surat Penerimaan (LoA) resmi calon santri.
8. **Standar Penulisan Nama Institusi (Naming Convention):**
   - Nama resmi lembaga utuh: **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (atau huruf kapital Kop: **`PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN`**). Jangan diubah atau dipotong.
   - Singkatan entitas & rekening resmi: **`PTDARRAHMAN`** (atau **`PTD ARRAHMAN`**).
   - ❌ **Dilarang keras menggunakan frasa:** `Yayasan Pesantren Ar-Rahman` atau `Pesantren Ar-Rahman` (sebutan tunggal tanpa lanjutan tahfidz & digital). Jika ditemukan, wajib diganti ke `PTDARRAHMAN`.

---

### 9. Integrasi Eksternal

| Layanan Eksternal | Protokol | Arah Komunikasi | Peran & Penggunaan |
|---|---|---|---|
| **Pakasir API v2** | HTTPS REST | Dua Arah (Outbound API call & Inbound Webhook) | Pembuatan QRIS formulir, verifikasi notifikasi pembayaran, kuitansi HMAC |
| **Cloudinary** | HTTPS REST | Outbound (Core API ──► Cloudinary) | Media storage untuk avatar pendaftar, foto staf, galeri, dan aset CMS |
| **WhatsApp (whatsapp-web.js)** | Redis Queue | Internal Monorepo | Core API enqueue ke BullMQ ──► WhatsApp Microservice kirim pesan |

---

## 📄 Dokumen Resmi & Ekspor Cetak

Sistem menyediakan engine ekspor A4 resmi (`apps/ppdb/src/utils/export*`):

| Dokumen | Fungsi Export | Isi |
|---|---|---|
| **Formulir Pendaftaran** | `exportApplicantForm` | Data diri, riwayat sekolah, keluarga, kuesioner kesehatan + stempel digital |
| **Lembar Penilaian** | `exportAssessment` | Nilai Tahfidz & Wawancara berbobot |
| **Kuitansi Pembayaran** | `exportReceipt` | Nominal, tanggal, stempel digital, QR verifikasi HMAC |
| **Surat Penerimaan (LoA)** | `exportLoa` | Klausul non-refundable, TTD digital orang tua + panitia, QR verifikasi |

---

## 🌐 Rute Verifikasi Publik (Tanpa Login)

Untuk memudahkan verifikasi keabsahan dokumen secara langsung via pemindaian QR code fisik atau digital:

- 🧾 **Kuitansi Pembayaran Resmi:** `/kuitansi/:id` atau `/receipt/:id`
  Diberi segel keamanan token HMAC — dapat diakses siapa saja tanpa login.
- 📜 **Surat Penerimaan Resmi (LoA):** `/loa/:registrationNo`
  Memverifikasi status kelulusan santri dan keaslian dokumen LoA.

---

## 🎨 UI/UX Design System

> **PENTING: Desain Antarmuka (Visual Design) berbeda dengan Arsitektur Sistem (System Design).**
> Dokumen ini berfokus pada estetika, warna, tipografi, dan pengalaman pengguna Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Rincian lengkap dapat dipelajari di [**DESIGN.md**](DESIGN.md).

Ringkasan Visual Identity Ar-Rahman:
- **Filosofi Visual:** Perpaduan Keagungan Islam (*Islamic Serenity*) dan Modernitas Digital (*Digital Precision*).
- **Warna Pokok:** Latar Gading (*Warm Ivory* `#F7F5F0`), Teks Obsidian (`#1A1A1A`), Hijau Zamrud Institusi (`#1A6B47`), Emas Tahfidz (`#D4A853`), dan Biru Telegram (`#2AABEE`).
- **Tipografi:** *Playfair Display* (Hero Brand Utama), *Inter / DM Sans* (Body & UI), *Amiri* (Ayat Al-Qur'an), dan *Inter Monospace* (Nomor Registrasi & Token).
- **Micro-Interactions & Motion:** Kurva transisi kustom `.ease-brand-pill` (`cubic-bezier(0.22, 1, 0.36, 1)` durasi 400ms) untuk navbar mengambang dan efek glassmorphism.
- **Komponen UI Bersama:** Terisolasi di `packages/ui` (`@repo/ui`) menggunakan primitif Radix UI dan Tailwind CSS.
- **Dynamic Branding:** Logo, favicon, dan teks institusi wajib diambil dinamis dari `settingsService.getLogo()` — dilarang melakukan hardcode gambar logo statis.

---

## 📚 Referensi Dokumen

| Dokumen | Path | Keterangan |
|---|---|---|
| **Panduan Desain UI/UX** | [`DESIGN.md`](DESIGN.md) | Sistem Desain, token warna, tipografi, elevasi, dan standar visual |
| Aturan Bisnis & Requirements | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Logika utama: periode, kuota atomik, LoA, rubrik, bebas-jenjang, kesehatan |
| **Laporan QA & E2E Testing** | [`docs/QA-TESTING-REPORT.md`](docs/QA-TESTING-REPORT.md) | Laporan pengujian alur penuh PPDB 100% Passed (245 Passed, 1 XFAIL, 0 Failed) |
| Docker Runbook (WSL2 Lokal) | [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) | Panduan deployment lokal langkah-per-langkah |
| Docker Runbook (Production VPS) | [`docs/DOCKER_PRODUCTION.md`](docs/DOCKER_PRODUCTION.md) | Setup VPS Linux dengan Nginx + Let's Encrypt |
| Notifikasi WhatsApp | [`docs/notifikasi-code-1790904241894.md`](docs/notifikasi-code-1790904241894.md) | Template & event notifikasi WhatsApp |
| Hero 3D Globe | [`docs/HERO_3D_GLOBE.md`](docs/HERO_3D_GLOBE.md) | Arsitektur Three.js, aset, dan optimasi bundle |
| Skrip & Tooling | [`scripts/README.md`](scripts/README.md) | Sinkronisasi Windows-WSL, normalisasi LF, utilitas debug |
| Skrip Setup Otomatis | [`setup.sh`](setup.sh) | Skrip inisialisasi satu perintah (`./setup.sh docker` & `./setup.sh local`) |
| **Panduan Agent (root)** | [`AGENTS.md`](AGENTS.md) | Aturan coding & konvensi lintas project |
| Panduan Agent API | [`apps/api/AGENTS.md`](apps/api/AGENTS.md) | Arsitektur backend (FastAPI, Alembic, Pakasir v2, Repositories) |
| Panduan Agent PPDB | [`apps/ppdb/AGENTS.md`](apps/ppdb/AGENTS.md) | Arsitektur frontend PPDB (rute tahapan, modal, backoffice) |
| Panduan Agent Superadmin | [`apps/superadmin/AGENTS.md`](apps/superadmin/AGENTS.md) | Arsitektur panel Superadmin |
| Panduan Agent Company Profile | [`apps/companyprofile/AGENTS.md`](apps/companyprofile/AGENTS.md) | Arsitektur portal Company Profile & auth cookies |

---

## 🚀 Quick Start

### Opsi 1: Skrip Otomatis Sekali Jalan (Multi-Platform & Multi-CLI) — Direkomendasikan

Repository dilengkapi skrip setup otomatis universal yang **otomatis mendeteksi folder kerja**, memeriksa dependensi prasyarat, menyiapkan file `.env`, meng-generate secret acak yang aman, dan menjalankan stack:

#### 🐧 Linux (Semua Distro: Ubuntu, Debian, Arch, Fedora, Alpine) & 🍏 macOS:
```bash
# Full stack via Docker Compose
./setup.sh docker

# ATAU Local Dev langsung di host (Vite + FastAPI)
./setup.sh local
```

#### 🪟 Windows (PowerShell / Windows Terminal / CMD):
```powershell
# Full stack via Docker Compose
.\setup.ps1 docker

# ATAU Local Dev langsung di host
.\setup.ps1 local
```

> **Catatan Portabilitas:**
> - Skrip secara dinamis mendeteksi lokasi direktori repo di mana pun di-clone tanpa ada absolute path yang di-hardcode.
> - Menggunakan Docker Named Volumes (`uploads_data`, `redis_data`, `wa_session`, `wa_logs`), sehingga tidak terikat pada struktur path folder host pengguna.
> - Kunci rahasia JWT, Cron, dan WhatsApp API otomatis dibuat & disinkronkan antar-service tanpa menimpa konfigurasi yang sudah ada.

### Opsi 2: Docker di WSL2 (Manual)

Ikuti runbook lengkap di [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md):

1. Pastikan berada di direktori ext4 WSL (`/home/<user>/project-ppdb`) — jangan di `/mnt/c/`.
2. Siapkan file `.env` di masing-masing aplikasi (`apps/api/.env`, `apps/whatsapp/.env`).
3. Jalankan Docker Compose:
```bash
docker compose up -d --build
```

Setelah semua container berstatus *healthy*, layanan dapat diakses:

| Layanan | URL |
|---|---|
| Company Profile | `http://<ip-wsl>:3000` |
| Panel Superadmin | `http://<ip-wsl>:5173` |
| Portal PPDB | `http://<ip-wsl>:5174` |
| Core API | `http://<ip-wsl>:8080` (docs: `/scalar`) |

### Opsi 3: Local Dev (Host Dev Manual)

Untuk pengembangan antarmuka secara cepat tanpa Docker:

```bash
# Instal seluruh dependensi monorepo
pnpm install

# Jalankan seluruh frontend secara serentak via Turborepo
pnpm dev
```

> **Alokasi Port Dev Lokal:**
> | Layanan | Port |
> |---|---|
> | Company Profile | `http://localhost:3000` |
> | Portal PPDB | `http://localhost:5174` |
> | Panel Superadmin | `http://localhost:5173` |
> | Core API (non-Docker) | `http://localhost:8000` |

---

<div align="center">
  <i>Dikembangkan dengan ❤️ untuk generasi Qur'ani masa depan.</i>
</div>
