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

Selamat datang di monorepo Sistem Terpadu **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**. Repository ini menaungi seluruh ekosistem digital institusi â€” mulai dari website publik (Company Profile), portal seleksi mandiri santri, backoffice PPDB, hingga panel superadmin dan layanan notifikasi WhatsApp.

---

## ðŸ“‘ Daftar Isi

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

## ðŸ—ï¸ Arsitektur Monorepo

Project ini menggunakan arsitektur modular **pnpm workspace** yang diorkestrasi oleh **Turborepo**. Masing-masing aplikasi saling terisolasi namun terhubung melalui Core API pusat dan jaringan internal Docker.

| Aplikasi | Path | Tech Stack | Peran |
|---|---|---|---|
| ðŸŽ“ **PPDB** | [`apps/ppdb`](apps/ppdb/README.md) | React 19, Vite 8, TypeScript | Portal santri + Backoffice PPDB |
| ðŸ›¡ï¸ **Superadmin** | [`apps/superadmin`](apps/superadmin/README.md) | React 19, Vite 8, TypeScript | Panel manajemen platform & RBAC |
| ðŸŒ **Company Profile** | [`apps/companyprofile`](apps/companyprofile/README.md) | Next.js 16, Tailwind v4 | Website publik & portal login terpusat |
| âš™ï¸ **Core API** | [`apps/api`](apps/api/README.md) | FastAPI, Python 3.12, MySQL, Redis | Backend REST API monolithic |
| ðŸ“± **WA Gateway** | [`apps/whatsapp`](apps/whatsapp/README.md) | Node.js, BullMQ, Express | Service notifikasi WhatsApp mandiri |
| ðŸ§© **Shared UI** | `packages/ui` | React, TypeScript | Komponen UI bersama (profile, session, dll.) |
| ðŸ”§ **TS Config** | `packages/typescript-config` | TypeScript | Konfigurasi TypeScript terpusat |

> **Catatan:** `apps/whatsapp` adalah service mandiri berbasis Node.js â€” **bukan** bagian dari pnpm workspace. Dikelola dan di-build secara independen.

---

## ðŸ› ï¸ Tech Stack per Aplikasi

### ðŸŽ“ apps/ppdb â€” Portal Santri & Backoffice
| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 |
| Bahasa | TypeScript |
| State/Data | TanStack Query v5, Zustand |
| Routing | React Router v7 |
| UI | Tailwind CSS v4, Radix UI |
| PDF/Print | Print engine kustom A4 (`utils/export*`) |
| Auth | HTTP-only Cookie JWT (via Core API) |


**Fitur Backoffice:** Manajemen gelombang & master biaya, verifikasi berkas, Bank Soal CBT (Akademik & Psikologi), penjadwalan ujian CBT massal & live monitoring peserta, sesi 1:1 Tahfidz & Wawancara (Santri & Ortu), rekapitulasi penilaian seleksi gabungan, review & penerbitan LoA, cetak dokumen resmi, arsip dossier ZIP.

### ðŸ›¡ï¸ apps/superadmin â€” Panel Superadmin
| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 |
| Bahasa | TypeScript |
| Pencarian | Semantic search `Ctrl+K` |
| Auth | HTTP-only Cookie JWT (via Core API) |

**Fitur:** Manajemen akun staf/admin, matriks RBAC per modul, audit trail log aktivitas, broadcast notifikasi, monitoring bot WhatsApp, pemantauan sesi login aktif multi-perangkat.

### ðŸŒ apps/companyprofile â€” Website Publik
| Kategori | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| 3D | Three.js (Hero Globe) |
| CMS | Admin panel internal |

**Fitur:** Website publik pesantren, program pendidikan, berita, fasilitas, galeri, hero 3D interaktif, portal login terpusat untuk semua role.

### âš™ï¸ apps/api â€” Core API Backend
| Kategori | Teknologi |
|---|---|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Database | MySQL 8 |
| Cache/Queue | Redis 7 |
| Auth | JWT (HTTP-only Cookie), RBAC |
| Payment | Pakasir API v2 |
| Storage | Cloudinary |
| Scheduler | APScheduler (session & wave maintenance) |

**Fitur:** REST API monolithic, autentikasi & otorisasi, payment gateway QRIS formulir, webhook payment, pencarian global, generator dokumen resmi.

### ðŸ“± apps/whatsapp â€” WA Gateway
| Kategori | Teknologi |
|---|---|
| Runtime | Node.js |
| Queue | BullMQ + Redis |
| WA Client | whatsapp-web.js + Chromium |

**Fitur:** Penerima task dari Core API via Redis queue, pengirim notifikasi otomatis (pembayaran formulir, booking sesi, grup WA), standalone service.

---

## ðŸ”¬ System Design

> **Arsitektur Sistem Teknis & Alur Operasional Monorepo PPDB Ar-Rahman**
> Bagian ini memuat rancangan sistem teknis menyeluruh (System Design) dari ekosistem digital Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Untuk panduan antarmuka visual, palet warna, tipografi, dan komponen UI, rujuk ke [DESIGN.md](DESIGN.md).

---

### 1. Diagram Arsitektur Sistem

Ekosistem mengadopsi pola arsitektur **Monolith Berorientasi Layanan (Service-Oriented Modular Monolith)** dengan microservice mandiri untuk otomatisasi WhatsApp:

```
[ Klien Pengguna ]
  â”‚  (Desktop, Smartphone, Safe Exam Browser)
  â–¼
[ Nginx Reverse Proxy / Port Publik :80, :443 ]
  â”‚
  â”œâ”€â”€â–º :3000 â”€â”€â–º container: companyprofile (Next.js 16 SSR / App Router)
  â”‚
  â”œâ”€â”€â–º :5173 â”€â”€â–º container: superadmin    (React 19 SPA, Vite preview / Nginx static)
  â”‚
  â”œâ”€â”€â–º :5174 â”€â”€â–º container: ppdb          (React 19 SPA, Vite preview / Nginx static)
  â”‚
  â””â”€â”€â–º :8080 â”€â”€â–º container: api           (FastAPI / Uvicorn Python 3.12)
          (Host :8000)   â”‚
                         â”œâ”€â”€â–º MySQL 8 Database (Relational Store & ACID Transactions)
                         â”‚
                         â”œâ”€â”€â–º Redis 7 In-Memory Broker
                         â”‚     â”œâ”€â”€ DB 0: JWT Session Store & Rate Limiter
                         â”‚     â”œâ”€â”€ DB 1: BullMQ Job Queue (Notifikasi WhatsApp)
                         â”‚     â””â”€â”€ DB 2: Shared Application Cache
                         â”‚
                         â””â”€â”€â–º :3100 (Internal Only) â”€â”€â–º container: whatsapp
                                                          â”œâ”€â”€ BullMQ Worker (Node.js)
                                                          â””â”€â”€ Chromium (whatsapp-web.js)
```

**Alur Akses Jaringan:**
- Port publik frontend (`:3000`, `:5173`, `:5174`) dan API (`:8080` di Docker / `:8000` di Dev Host) dapat diakses klien.
- Port microservice WhatsApp (`:3100`) **hanya dapat diakses melalui jaringan internal Docker (`127.0.0.1:3100` / bridge network)**, terisolasi dari akses publik luar.

---

### 2. Infrastruktur Docker & Resource Limits

Semua layanan diorkestrasi via Docker Compose (`docker-compose.yml` untuk dev/staging, `docker-compose.prod.yml` untuk VPS production) dengan alokasi batas memori eksplisit:

| Container | Image / Base | Port Internal | Port Host | `mem_limit` | Peran Utama |
|---|---|---|---|---|---|
| `companyprofile` | Node.js 20-alpine (Next.js) | 3000 | 3000 | 512 MB | Website publik & portal login terpusat |
| `superadmin` | Node.js 20-alpine (Vite preview) | 5173 | 5173 | 512 MB | Panel kendali Superadmin & RBAC |
| `ppdb` | Node.js 20-alpine (Vite preview) | 5174 | 5174 | 512 MB | Portal santri & Backoffice PPDB |
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
redis (healthy) â”€â”€â–º api (healthy) â”€â”€â–º frontend (companyprofile, ppdb, superadmin)
                                 â””â”€â”€â–º whatsapp (healthy)
```

---

### 3. Autentikasi, Sesi & RBAC Detail

#### Mekanisme Token Cookie HTTP-Only
Aplikasi mengabaikan penyimpanan token di `localStorage` demi perlindungan terhadap serangan Cross-Site Scripting (XSS).

```
[ Klien Browser ]                                    [ Core API ]
        â”‚                                                  â”‚
        â”‚â”€â”€â”€ POST /companyprofile/auth/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚
        â”‚    (username/email, password)                    â”‚ (Validasi bcrypt hash)
        â”‚                                                  â”‚
        â”‚â—„â”€â”€ Set-Cookie: access_token (HttpOnly, Secure) â”€â”€â”‚
        â”‚    Set-Cookie: refresh_token (HttpOnly, Secure)  â”‚
        â”‚    Response: { user_id, role, permissions }      â”‚ (Catat sesi di DB user_sessions)
        â”‚                                                  â”‚
        â”‚                                                  â”‚
  (Setiap Request Biasa)                                   â”‚
        â”‚â”€â”€â”€ GET /api/v1/... (credentials: 'include') â”€â”€â”€â”€â–ºâ”‚
        â”‚    (Cookie access_token terkirim otomatis)       â”‚ (Validasi JWT & cek status user)
        â”‚â—„â”€â”€ HTTP 200 OK (Data Response) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
        â”‚                                                  â”‚
        â”‚                                                  â”‚
  (Token Expired 401)                                      â”‚
        â”‚â”€â”€â”€ Request APi (401 Unauthorized) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚
        â”‚                                                  â”‚
        â”‚â”€â”€â”€ POST /companyprofile/auth/refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚ (Gunakan refresh_token)
        â”‚â—„â”€â”€ Set-Cookie: access_token baru â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
        â”‚â”€â”€â”€ Ulangi Request Semula (Auto-Retry) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚
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
- Pengguna maupun Superadmin dapat mencabut sesi tertentu dari jarak jauh (`DELETE /companyprofile/auth/sessions/{id}`).
- Tersedia fitur darurat pencabutan seluruh sesi lain (`DELETE /companyprofile/auth/sessions/revoke-others`) jika terindikasi kebocoran kredensial.

---

### 4. Pipeline Tahap Calon Santri

Calon santri melalui tahapan seleksi terstruktur dengan alur yang berujung pada penandatanganan LoA:

```
 1. REGISTRASI AKUN (Wizard 6 Bagian)
    POST /ppdb/register
    â€¢ Identitas Santri â€¢ Data Ortu/Wali Lengkap â€¢ Kontak (Email & WA)
    â€¢ Domisili â€¢ Kuesioner Kesehatan (10 Soal) â€¢ Persetujuan
    â””â”€â”€â–º Auto-link ke satu-satunya gelombang aktif
            â”‚
            â–¼
 2. BAYAR FORMULIR (Pakasir v2 QRIS)
    POST /ppdb/payment/create-invoice â”€â”€â–º Scan QRIS
    Webhook Pakasir v2 â”€â”€â–º Konfirmasi Pembayaran
    â””â”€â”€â–º Kuota berkurang atomik; Kuitansi resmi terbit (/kuitansi/:id)
            â”‚
            â–¼
 3. UNGGAH DOKUMEN
    POST /ppdb/documents/upload
    â€¢ Seluruh berkas wajib: NISN, KK, Akta Kelahiran, Pas Foto, KTP Orang Tua/Wali, 4 Rapor Terakhir
    â””â”€â”€â–º Panitia verifikasi berkas di Backoffice (/admin/verifikasi-dokumen)
            â”‚
            â–¼
 4. UJIAN SELEKSI CBT & SESI 1:1 TAHFIDZ
    â€¢ Ujian CBT Akademik & Psikologi (/exam/:scheduleId)
      - Verifikasi PIN sesi, timer countdown, autosave per opsi
      - Anti-cheating (deteksi tab switch > 5 detik otomatis lock)
      - Live monitoring & unfreeze peserta di backoffice
    â€¢ Sesi 1:1 Tahfidz Al-Qur'an (POST /ppdb/sessions/tahfidz/book)
      - Pilih jadwal penguji, mode online Zoom / tatap muka
            â”‚
            â–¼
 5. SESI WAWANCARA (SANTRI & ORANG TUA/WALI)
    POST /ppdb/sessions/interview/book
    â€¢ Wawancara Calon Santri (motivasi, adab, kesiapan asrama)
    â€¢ Wawancara Orang Tua/Wali (komitmen & keselarasan visi)
    â€¢ Pengingat WhatsApp otomatis terjadwal: H-2, H-1, dan 1 jam sebelum ujian
            â”‚
            â–¼
 6. PENGUMUMAN KELULUSAN & LoA DIGITAL (Alur Selesai)
    POST /ppdb/applicants/me/sign-loa
    â€¢ Panitia rilis status kelulusan di backoffice
    â€¢ Pendaftar & wali santri menandatangani LoA digital secara resmi
    â””â”€â”€â–º is_locked = true (Seluruh data formulir & kesehatan terkunci permanen)
    â””â”€â”€â–º LoA dapat diverifikasi publik (/loa/:registrationNo)
    â””â”€â”€â–º Alur PPDB selesai resmi pada penandatanganan LoA
            â”‚
            â–¼
    â€¢ Terbit otomatis pasca penandatanganan LoA
    â€¢ Format nomor registrasi unik resmi: REG-{YYYYMMDD}-{XXXX}
    â””â”€â”€â–º Tautan eksklusif bergabung ke Grup WhatsApp Resmi Santri Baru
            â”‚
            â–¼
 8. PROFIL MANDIRI & KEAMANAN
    PUT /ppdb/applicants/me
    â€¢ Tinjau berkas pendaftaran & kesehatan (read-only karena is_locked = true)
    â€¢ Penggantian kata sandi & avatar profil
    â””â”€â”€â–º Manajemen dan audit sesi login perangkat aktif
```

---

### 5. Arsitektur Pembayaran Pakasir API v2

Sistem pembayaran mengintegrasikan gerbang pembayaran resmi **Pakasir API v2** dengan perlindungan idempotensi satu pintu:

```
[ Pendaftar ]                 [ Core API ]                [ Pakasir API v2 ]
      â”‚                             â”‚                            â”‚
      â”‚â”€â”€â”€ Klik "Bayar Formulir" â”€â”€â–ºâ”‚                            â”‚
      â”‚                             â”‚â”€â”€â”€ POST /api/v2/invoice â”€â”€â–ºâ”‚
      â”‚                             â”‚    (order_id, amount)      â”‚
      â”‚                             â”‚â—„â”€â”€ Response QRIS payload â”€â”€â”‚
      â”‚â—„â”€â”€ Tampilkan QR Code â”€â”€â”€â”€â”€â”€â”€â”‚                            â”‚
      â”‚                             â”‚                            â”‚
 (Pendaftar Scan & Bayar via m-Banking / e-Wallet)               â”‚
      â”‚                                                          â”‚
      â”‚                                                          â”‚â”€â”€â”€ Webhook Notifikasi â”€â”€â”
      â”‚                                                          â”‚    POST /payment/webhookâ”‚
      â”‚                                                          â”‚    (Header: X-Secret)   â”‚
      â”‚                             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
      â”‚                             â–¼
      â”‚                     [ Webhook Handler API ]
      â”‚                     â”œâ”€â”€ 1. Validasi header X-Secret
      â”‚                     â”œâ”€â”€ 2. Pencocokan nominal tagihan (exact match)
      â”‚                     â”œâ”€â”€ 3. Idempotency Check (skip jika invoice sudah PAID)
      â”‚                     â”œâ”€â”€ 4. Pengurangan kuota gelombang secara atomik di DB
      â”‚                     â”‚       â”‚
      â”‚                     â”‚       â”œâ”€â”€ Kuota Habis?
      â”‚                     â”‚       â”‚    â”œâ”€â”€ Auto-close gelombang pendaftaran
      â”‚                     â”‚       â”‚    â”œâ”€â”€ Batalkan seluruh invoice formulir pending
      â”‚                     â”‚       â”‚    â”œâ”€â”€ Kirim WA blast pemberitahuan penutupan
      â”‚                     â”‚       â”‚    â””â”€â”€ Hentikan jadwal pengingat Senin
      â”‚                     â”‚       â””â”€â”€ Kuota Masih Ada â”€â”€â–º Lanjut proses
      â”‚                     â”œâ”€â”€ 5. Update status invoice â”€â”€â–º PAID
      â”‚                     â”œâ”€â”€ 6. Terbitkan Kuitansi Resmi bertanda tangan HMAC
      â”‚                     â””â”€â”€ 7. Enqueue notifikasi WA â”€â”€â–º Redis DB 1 â”€â”€â–º BullMQ
      â”‚
      â–¼
[ Kuitansi Publik ] â—„â”€â”€ GET /kuitansi/:id (Dapat diakses publik tanpa login via QR)
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
   â”‚
   â”‚ Operasi event (Invoice terbit, Pembayaran sukses, LoA, Jadwal sesi)
   â–¼
[ Enqueue Job via aioredis ]
   â”‚ Queue Name: 'wa-notifications'
   â–¼
[ Redis Instance (DB 1) ]
   â”‚
   â–¼ (BLPOP / Worker Consumer)
[ WhatsApp Microservice (apps/whatsapp) ]
   â”œâ”€â”€ BullMQ Job Worker (Concurrency: 1)
   â”œâ”€â”€ Anti-flood Rate Limiting (Jeda acak 2-5 detik antar pesan)
   â”œâ”€â”€ Headless Chromium Instance (whatsapp-web.js)
   â””â”€â”€ Eksekusi Kirim Pesan / Kirim File Dokumen
          â”‚
          â”œâ”€â”€ Sukses â”€â”€â–º Catat riwayat di tabel notification_logs
          â””â”€â”€ Gagal  â”€â”€â–º Retry eksposensial (maksimal 3 kali) â”€â”€â–º Dead Letter Queue
```

---

### 7. Arsitektur Database & Domain Models

Struktur data relasional dikelompokkan secara terpisah berdasarkan domain bisnis di `apps/api/src/models/`:

```
apps/api/src/models/
â”œâ”€â”€ auth.py          # User, Role, UserSession, UserModulePermission, UserPagePermission
â”œâ”€â”€ ppdb.py          # PPDBPeriod, PPDBWave, PPDBApplicant, PPDBDocument, PPDBHealthQuestionnaire, PPDBPeriodFeeItem, PPDBWaveFeeDiscount
â”œâ”€â”€ selection.py     # SelectionCategory, SelectionCriteria, SelectionSession, SelectionScore
â”œâ”€â”€ cbt.py           # ExamBank, ExamQuestion, ExamOption, ExamSchedule, ExamAttempt, ExamAnswer
â”œâ”€â”€ payment.py       # PPDBPaymentTransaction
â”œâ”€â”€ content.py       # SiteSetting, News, Programs, Facilities, Staff, Galleries, Testimonials
â”œâ”€â”€ notification.py  # NotificationLog, NotificationTemplate
```

#### Entitas & Relasi Inti:
1. **`PPDBPeriod` (1) â”€â”€â”€< (N) `PPDBWave`:** Periode menaungi gelombang. Hanya 1 periode dan 1 gelombang yang boleh berstatus aktif (`is_active = true`) dalam satu waktu secara global.
2. **`PPDBWave` (1) â”€â”€â”€< (N) `PPDBApplicant`:** Pendaftar otomatis terikat pada satu-satunya gelombang yang aktif saat registrasi.
3. **`PPDBApplicant` (1) â”€â”€â”€ (1) `PPDBHealthQuestionnaire`:** Relasi 1:1 data kuesioner kesehatan 10 pertanyaan baku.
4. **`PPDBApplicant` (1) â”€â”€â”€< (N) `PPDBPaymentTransaction`:** Transaksi pembayaran formulir pendaftar.

#### Konvensi Migrasi Skema:
Semua perubahan skema database wajib melalui berkas migrasi Alembic (`apps/api/alembic/versions/`). **Dilarang keras mengeksekusi perintah DDL (`ALTER TABLE`) langsung di database produksi.**

---

### 8. Aturan Bisnis Kritis (Business Invariants)

Aturan-aturan berikut adalah pilar integritas sistem yang wajib dipatuhi di backend maupun frontend:

1. **Bebas Jenjang Pendidikan (Zero Education-Level Bias):**
   - Sistem **sama sekali tidak mengenal** pemilihan jenjang pendidikan (`SMP`, `SMK`, dll.).
   - Tidak ada dropdown, filter, atau field isian jenjang di seluruh formulir registrasi, dashboard pendaftar, konfigurasi gelombang, maupun halaman publik.
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
6. **Arsip Terpusat di `/admin/arsip`:**
   - Filter lintas periode dan gelombang **hanya tersedia di halaman Arsip/Cari Pendaftar (`/admin/arsip`)**.
   - Menyediakan unduhan berkas individual dan paket arsip dossier ZIP lengkap (`GET /ppdb/archive/applicants/{id}/dossier/zip`) yang diaudit dengan alamat IP admin.
7. **Master Komponen Biaya di Periode & Pembayaran di Luar Aplikasi:**
   - Seluruh komponen biaya masuk / biaya pendidikan (uang pangkal, SPP, seragam, dll.) dikonfigurasi di level Periode (`ppdb_period_fee_items`), bukan di gelombang.
   - Gelombang hanya mengonfigurasi diskonasi (`ppdb_wave_fee_discounts`) terhadap master komponen periode.
   - Pembayaran biaya pendidikan dilakukan **di luar aplikasi** (transfer rekening resmi PTDARRAHMAN / tunai bendahara pesantren). Sistem PPDB tidak memfasilitasi transaksi online tahap 2; informasi biaya disajikan transparan pada Surat Penerimaan (LoA) resmi calon santri.
8. **Standar Penulisan Nama Institusi (Naming Convention):**
   - Nama resmi lembaga utuh: **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (atau huruf kapital Kop: **`PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN`**). Jangan diubah atau dipotong.
   - Singkatan entitas & rekening resmi: **`PTDARRAHMAN`** (atau **`PTD ARRAHMAN`**).
   - âŒ **Dilarang keras menggunakan frasa:** `Yayasan Pesantren Ar-Rahman` atau `Pesantren Ar-Rahman` (sebutan tunggal tanpa lanjutan tahfidz & digital). Jika ditemukan, wajib diganti ke `PTDARRAHMAN`.

---

### 9. Integrasi Eksternal

| Layanan Eksternal | Protokol | Arah Komunikasi | Peran & Penggunaan |
|---|---|---|---|
| **Pakasir API v2** | HTTPS REST | Dua Arah (Outbound API call & Inbound Webhook) | Pembuatan QRIS formulir, verifikasi notifikasi pembayaran, refund |
| **Cloudinary** | HTTPS REST | Outbound (Core API â”€â”€â–º Cloudinary) | Media storage untuk avatar pendaftar, foto staf, galeri, dan aset CMS |
| **WhatsApp (whatsapp-web.js)** | Redis Queue | Internal Monorepo | Core API enqueue ke BullMQ â”€â”€â–º WhatsApp Microservice kirim pesan |

---

## ðŸ“„ Dokumen Resmi & Ekspor Cetak

Sistem menyediakan engine ekspor A4 resmi (`apps/ppdb/src/utils/export*`):

| Dokumen | Fungsi Export | Isi |
|---|---|---|
| **Formulir Pendaftaran** | `exportApplicantForm` | Data diri, riwayat sekolah, keluarga, kuesioner kesehatan + stempel digital |
| **Lembar Penilaian** | `exportAssessment` | Nilai Tahfidz & Wawancara berbobot |
| **Kuitansi Pembayaran** | `exportReceipt` | Nominal, tanggal, stempel digital, QR verifikasi HMAC |
| **Surat Penerimaan (LoA)** | `exportLoa` | Klausul non-refundable, TTD digital orang tua + panitia, QR verifikasi |

---

## ðŸŒ Rute Verifikasi Publik (Tanpa Login)

Untuk memudahkan verifikasi keabsahan dokumen secara langsung via pemindaian QR code fisik atau digital:

- ðŸ§¾ **Kuitansi Pembayaran Resmi:** `/kuitansi/:id` atau `/receipt/:id`
  Diberi segel keamanan token HMAC â€” dapat diakses siapa saja tanpa login.
- ðŸ“œ **Surat Penerimaan Resmi (LoA):** `/loa/:registrationNo`
  Memverifikasi status kelulusan santri dan keaslian dokumen LoA.

---

## ðŸŽ¨ UI/UX Design System

> **PENTING: Desain Antarmuka (Visual Design) berbeda dengan Arsitektur Sistem (System Design).**
> Dokumen ini berfokus pada estetika, warna, tipografi, dan pengalaman pengguna Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Rincian lengkap dapat dipelajari di [**DESIGN.md**](DESIGN.md).

Ringkasan Visual Identity Ar-Rahman:
- **Filosofi Visual:** Perpaduan Keagungan Islam (*Islamic Serenity*) dan Modernitas Digital (*Digital Precision*).
- **Warna Pokok:** Latar Gading (*Warm Ivory* `#F7F5F0`), Teks Obsidian (`#1A1A1A`), Hijau Zamrud Institusi (`#1A6B47`), Emas Tahfidz (`#D4A853`), dan Biru Telegram (`#2AABEE`).
- **Tipografi:** *Playfair Display* (Hero Brand Utama), *Inter / DM Sans* (Body & UI), *Amiri* (Ayat Al-Qur'an), dan *Inter Monospace* (Nomor Registrasi & Token).
- **Micro-Interactions & Motion:** Kurva transisi kustom `.ease-brand-pill` (`cubic-bezier(0.22, 1, 0.36, 1)` durasi 400ms) untuk navbar mengambang dan efek glassmorphism.
- **Komponen UI Bersama:** Terisolasi di `packages/ui` (`@repo/ui`) menggunakan primitif Radix UI dan Tailwind CSS.
- **Dynamic Branding:** Logo, favicon, dan teks institusi wajib diambil dinamis dari `settingsService.getLogo()` â€” dilarang melakukan hardcode gambar logo statis.

Untuk spesifikasi detail token CSS, rasio kontras WCAG AA, dan tata letak A4 resmi, buka [**DESIGN.md**](DESIGN.md).

---

## ðŸ“š Referensi Dokumen

| Dokumen | Path | Keterangan |
|---|---|---|
| **Panduan Desain UI/UX** | [`DESIGN.md`](DESIGN.md) | Sistem Desain, token warna, tipografi, elevasi, dan standar visual |
| Aturan Bisnis & Requirements | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Logika utama: periode, kuota atomik, LoA, rubrik, bebas-jenjang, kesehatan |
| Docker Runbook (WSL2 Lokal) | [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) | Panduan deployment lokal langkah-per-langkah |
| Docker Runbook (Production VPS) | [`docs/DOCKER_PRODUCTION.md`](docs/DOCKER_PRODUCTION.md) | Setup VPS Linux dengan Nginx + Let's Encrypt |
| Notifikasi WhatsApp | [`docs/notifikasi-code-1790904241894.md`](docs/notifikasi-code-1790904241894.md) | Template & event notifikasi WhatsApp |
| Hero 3D Globe | [`docs/HERO_3D_GLOBE.md`](docs/HERO_3D_GLOBE.md) | Arsitektur Three.js, aset, dan optimasi bundle |
| Skrip & Tooling | [`scripts/README.md`](scripts/README.md) | Sinkronisasi Windows-WSL, normalisasi LF, utilitas debug |
| **Panduan Agent (root)** | [`AGENTS.md`](AGENTS.md) | Aturan coding & konvensi lintas project |
| Panduan Agent API | [`apps/api/AGENTS.md`](apps/api/AGENTS.md) | Arsitektur backend (FastAPI, Alembic, Pakasir v2, Repositories) |
| Panduan Agent PPDB | [`apps/ppdb/AGENTS.md`](apps/ppdb/AGENTS.md) | Arsitektur frontend PPDB (rute tahapan, modal, backoffice) |
| Panduan Agent Superadmin | [`apps/superadmin/AGENTS.md`](apps/superadmin/AGENTS.md) | Arsitektur panel Superadmin |
| Panduan Agent Company Profile | [`apps/companyprofile/AGENTS.md`](apps/companyprofile/AGENTS.md) | Arsitektur portal Company Profile & auth cookies |

---

## ðŸš€ Quick Start

### Opsi 1: Docker di WSL2 (Sangat Direkomendasikan)

Ikuti runbook lengkap di [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md):

1. Pastikan berada di direktori ext4 WSL (`/home/<user>/project-ppdb`) â€” jangan di `/mnt/c/`.
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
| Core API | `http://<ip-wsl>:8080` |

### Opsi 2: Local Vite Dev (Host Dev)

Untuk pengembangan UI secara cepat tanpa Docker:

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
  <i>Dikembangkan dengan ðŸ’» untuk generasi Qur'ani masa depan.</i>
</div>
