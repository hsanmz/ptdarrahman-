<div align="center">
  <h1>âš™ï¸ Core API Backend</h1>
  <p><strong>Mesin Utama Penggerak Sistem Terpadu</strong></p>

  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
</div>

---

Aplikasi ini adalah **backend utama** untuk seluruh ekosistem Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Menangani seluruh transaksi dan logika bisnis untuk Company Profile, PPDB, dan Superadmin.

## ðŸš€ Peran & Tanggung Jawab (Fitur Inti)

- ðŸ” **Otorisasi Terpusat & Keamanan:** Sistem RBAC (Role-Based Access Control) berbasis HTTP-only Cookie JWT untuk Pendaftar, Admin PPDB, Penguji/Pewawancara, dan Superadmin.
- ðŸ›¡ï¸ **Pelacakan Sesi & Keamanan Multi-Perangkat:** Deteksi metadata login (browser, OS, device, IP) dengan kemampuan pemantauan sesi aktif dan pemutusan sesi jarak jauh (*remote session revocation*).
- ðŸ” **Pencarian Global Terpadu (`/search/global`):** Pencarian modular cepat lintas pendaftar, berita, program, fasilitas, staf, akun pengguna, dan log aktivitas audit sesuai level RBAC.
- ðŸš¦ **Transaksi PPDB & Gelombang (Atomik):** Mengatur validasi periode tunggal, alokasi gelombang otomatis, kuota pendaftaran, dan pembatalan otomatis invoice pending saat kuota terpenuhi.
- ðŸ‘¤ **Profil Mandiri Pendaftar (`/ppdb/applicants/me`):** Pembacaan dan pembaruan mandiri data pendaftar dan kuesioner kesehatan dengan penguncian otomatis pasca-kelulusan.
- ðŸ’³ **Integrasi Payment Gateway Pakasir API v2:**
  - Pembuatan QRIS dinamis untuk pembayaran formulir dan pembayaran Tahap 2 (DP & cicilan).
  - Webhook 1 Pintu terverifikasi dengan header `X-Secret` dan idempotency guard.
  - Penerbitan kuitansi resmi bertanda tangan digital (HMAC signed token) untuk verifikasi publik (`/payment/public-receipt/{id}`).
  - Background scheduler untuk pengingat jatuh tempo cicilan (H-3) via WhatsApp.
  - Penerbitan LoA resmi beserta fitur tanda tangan digital orang tua.
  - Pencarian arsip dossier lintas periode/gelombang dan ekspor bundle ZIP (biodata, PDF ringkasan, berkas lampiran) dengan catatan audit IP address.
- ðŸ“¡ **Message Broker:** Memicu *event* Redis (notifikasi akun, kuota habis, konfirmasi sesi, pengingat hari Senin) yang dieksekusi oleh microservice `apps/whatsapp`.

## ðŸ“¦ Menjalankan secara Lokal (Non-Docker)

Sangat disarankan menjalankan API ini menggunakan Docker. Namun, untuk sekadar *local debugging*:

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # (.venv\Scripts\activate untuk Windows)

pip install -r requirements.txt

# 1. Jalankan migrasi database ke versi terbaru
alembic upgrade head

# 2. Menjalankan uvicorn server (port 8000)
uvicorn src.main:app --reload --port 8000
```
*(Catatan: Sesuaikan file `.env` ke host database MySQL dan Redis Anda).*

> **Informasi Port:**
> - Saat dijalankan secara lokal manual (non-Docker), backend FastAPI berjalan di `http://localhost:8000`.
> - Saat dijalankan via Docker Compose, port container dipetakan ke host di `http://localhost:8080`.

## ðŸ³ Deployment (Sangat Disarankan)

Kami merekomendasikan Docker WSL2 dengan dukungan mode NAT untuk *name resolution* yang andal.

```bash
# Dari root directory
docker compose up -d --build api
```

## ðŸ“š Bacaan Lebih Lanjut
- ðŸ¤– [**Panduan Arsitektur Backend (AGENTS.md)**](AGENTS.md) â€” Struktur layer (Router, Service, Repository), model database, dan konvensi coding backend.
- ðŸ“– [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) â€” Aturan bisnis periode, kuota, rubrik, dan formulir kesehatan.
- ðŸ³ [**Panduan Docker Setup**](../../docs/DOCKER_SETUP.md) â€” Konfigurasi runbook Docker WSL2.

---
â¬…ï¸ [Kembali ke Halaman Utama](../../README.md)
