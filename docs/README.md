# Indeks Dokumentasi — PPDB & Company Profile Ar-Rahman

Selamat datang di direktori dokumentasi teknis dan operasional **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**.

---

## 📌 Dokumen Utama Monorepo

| Dokumen | Lokasi | Fokus Utama |
|---|---|---|
| **System Design & Monorepo** | [`../README.md`](../README.md) | **Rancangan Sistem Teknis (System Design)**: Arsitektur monorepo, topologi Docker, request lifecycle, auth cookies HTTP-only, alur pendaftar tuntas pada penandatanganan LoA, payment gateway Pakasir v2, WhatsApp BullMQ, dan skema database relasional. |
| **Sistem Desain Visual & UI/UX** | [`../DESIGN.md`](../DESIGN.md) | **Desain Antarmuka (UI/UX Design System)**: Filosofi visual Islami & digital, token warna (Ivory, Obsidian, Emerald, Gold), tipografi (Playfair Display, Inter, Amiri), elevasi & bayangan, animasi `.ease-brand-pill`, komponen shared `@repo/ui`, dan standar cetak A4 baku. |
| **Panduan AI Agent** | [`../AGENTS.md`](../AGENTS.md) | Aturan pengkodean AI agent, batasan arsitektur, konvensi repository, dan penjaga integritas bisnis. |
| **Skrip Setup Otomatis** | [`../setup.sh`](../setup.sh) | Inisialisasi cepat monorepo satu perintah (`./setup.sh docker` & `./setup.sh local`). |

> [!IMPORTANT]
> **Pembedaan Konseptual:**
> - **System Design** terletak di [`README.md`](../README.md) — mencakup arsitektur teknis, database, endpoint, container, dan logika backend.
> - **Design System** terletak di [`DESIGN.md`](../DESIGN.md) — mencakup estetika antarmuka, warna semantik, tipografi, komponen UI, dan pengalaman pengguna.

---

## 📑 Daftar Dokumen Teknis & Panduan (`/docs`)

### 1. Kebutuhan & Logika Bisnis
- **[`REQUIREMENTS.md`](REQUIREMENTS.md)**: Spesifikasi aturan bisnis PPDB (periode tunggal, gelombang tunggal, bebas jenjang & bebas jalur, kuota atomik, penutupan otomatis, 10 pertanyaan kuesioner kesehatan, sistem ujian CBT Akademik & Psikologi, seleksi Tahfidz & Wawancara terpadu, `is_locked`, dan manajemen dossier arsip).
- **[`QA-TESTING-REPORT.md`](QA-TESTING-REPORT.md)**: Laporan resmi pengujian menyeluruh (End-to-End Testing & QA Audit) 100% Passed (245 Passed, 1 XFAIL, 0 Failed) mencakup pengujian alur penuh siklus PPDB dari registrasi hingga penandatanganan LoA dan audit berkas arsip.

### 2. Infrastruktur & Deployment
- **[`DOCKER_SETUP.md`](DOCKER_SETUP.md)**: Panduan langkah-demi-langkah deployment lokal di lingkungan Windows WSL2 & Docker Compose.
- **[`DOCKER_PRODUCTION.md`](DOCKER_PRODUCTION.md)**: Panduan setup production VPS Ubuntu dengan Nginx Reverse Proxy, SSL Let's Encrypt, firewall, dan keamanan HTTP headers.

### 3. Integrasi Khusus & Fitur
- **[`HERO_3D_GLOBE.md`](HERO_3D_GLOBE.md)**: Arsitektur kanvas 3D Three.js pada landing page, optimasi render bundle, dan penanganan model procedural/GLB.
- **[`CMS_COMPANY_PROFILE_MODAL.md`](CMS_COMPANY_PROFILE_MODAL.md)**: Spesifikasi modal & formulir CRUD CMS Company Profile.
- **[`notifikasi-code-1790904241894.md`](notifikasi-code-1790904241894.md)**: Spesifikasi template dan trigger event notifikasi WhatsApp otomatis via BullMQ.

### 4. Diagram Alur Operasional (ASCII Workflows)
- **[`pendaftar-code-1790812852070.txt`](pendaftar-code-1790812852070.txt)**: Alur lengkap tahapan calon santri dari pendaftaran hingga penandatanganan LoA resmi.
- **[`admin-code-1790812960259.txt`](admin-code-1790812960259.txt)**: Alur kerja operasional panitia verifikasi dokumen, monitoring CBT, seleksi Tahfidz, wawancara, dan LoA.
- **[`backoffice-code-1790813618837.txt`](backoffice-code-1790813618837.txt)**: Alur konfigurasi master periode, biaya, gelombang, bank soal CBT, dan rubrik penilaian.

---

## 🏛️ Panduan Agent per Aplikasi

- [**apps/api/AGENTS.md**](../apps/api/AGENTS.md): Panduan backend Core API (FastAPI, SQLAlchemy 2.0, Alembic, Pakasir v2, Repositories).
- [**apps/ppdb/AGENTS.md**](../apps/ppdb/AGENTS.md): Panduan portal pendaftar mandiri dan backoffice admin PPDB (React 19 + Vite 8).
- [**apps/superadmin/AGENTS.md**](../apps/superadmin/AGENTS.md): Panduan panel Superadmin (RBAC, semantic search, user & role audit).
- [**apps/companyprofile/AGENTS.md**](../apps/companyprofile/AGENTS.md): Panduan portal Company Profile publik dan CMS (Next.js 16).
