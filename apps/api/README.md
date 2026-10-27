<div align="center">
  <h1>⚙️ Core API Backend</h1>
  <p><strong>Mesin Utama Penggerak Sistem Terpadu</strong></p>

  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
</div>

---

Aplikasi ini adalah **backend utama** untuk seluruh ekosistem Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Menangani seluruh transaksi dan logika bisnis untuk Company Profile, PPDB, dan Superadmin.

## 🚀 Peran & Tanggung Jawab (Fitur Inti)

- 🔐 **Otorisasi Terpusat & Keamanan:** Sistem RBAC (Role-Based Access Control) berbasis HTTP-only Cookie JWT untuk Pendaftar, Admin PPDB, Penguji/Pewawancara, dan Superadmin.
- 🛡️ **Pelacakan Sesi & Keamanan Multi-Perangkat:** Deteksi metadata login (browser, OS, device, IP) dengan kemampuan pemantauan sesi aktif dan pemutusan sesi jarak jauh (*remote session revocation*).
- 🔍 **Pencarian Global Terpadu (`/search/global`):** Pencarian modular cepat lintas pendaftar, berita, program, fasilitas, staf, akun pengguna, dan log aktivitas audit sesuai level RBAC.
- 🚦 **Transaksi PPDB & Gelombang (Atomik):** Mengatur validasi periode tunggal, alokasi gelombang otomatis, master komponen biaya periode, diskonasi gelombang, kuota pembayaran formulir, dan pembatalan otomatis invoice pending saat kuota terpenuhi.
- 💻 **Modul CBT Mandiri & Anti-Cheating:** Bank Soal Akademik & Psikologi per periode, penjadwalan ujian CBT massal per batch/kloter dengan cutoff pendaftaran H-1, anti-cheating tab switch > 5 detik, autosave instan jawaban, dan live monitoring pengawas dengan tombol unfreeze peserta.
- 👤 **Profil Mandiri Pendaftar (`/ppdb/applicants/me`):** Pembacaan dan pembaruan mandiri data pendaftar dan kuesioner kesehatan dengan penguncian otomatis (`is_locked = true`) pasca-penandatanganan LoA resmi.
- 💳 **Integrasi Payment Gateway Pakasir API v2:**
  - Pembuatan QRIS dinamis untuk pembayaran formulir pendaftaran.
  - Webhook 1 Pintu terverifikasi dengan header `X-Secret` dan idempotency guard.
  - Penerbitan kuitansi resmi bertanda tangan digital (HMAC signed token) untuk verifikasi publik (`/payment/public-receipt/{id}`).
  - Background scheduler untuk pengingat pembayaran Senin, pengingat submit dokumen H+3, dan pengingat seleksi H-2, H-1, 1 jam sebelum ujian via WhatsApp.
- 📜 **Penerbitan LoA Digital & Arsip Dossier:**
  - Penerbitan LoA resmi beserta alur tanda tangan digital orang tua yang menuntaskan alur pendaftaran santri.
  - Pencarian arsip dossier lintas periode/gelombang dan ekspor bundle ZIP (biodata, berkas lampiran) dengan catatan audit IP address.
- 📡 **Message Broker:** Memicu *event* Redis (notifikasi akun, pembayaran sukses, pengingat dokumen H+3, konfirmasi jadwal sesi, pengingat hari Senin, reminder ujian) yang dieksekusi oleh microservice `apps/whatsapp`.

## 📦 Menjalankan secara Lokal (Non-Docker)

Sangat disarankan menjalankan API ini menggunakan Docker atau skrip `./setup.sh docker`. Namun, untuk sekadar *local debugging*:

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
> - Saat dijalankan via Docker Compose, port container dipetakan ke host di `http://localhost:8080`. Dokumentasi interaktif Scalar tersedia di `/scalar`.

## 🐳 Deployment (Sangat Disarankan)

Kami merekomendasikan Docker WSL2 dengan dukungan mode NAT untuk *name resolution* yang andal.

```bash
# Dari root directory
docker compose up -d --build api
```

## 📚 Bacaan Lebih Lanjut
- 🤖 [**Panduan Arsitektur Backend (AGENTS.md)**](AGENTS.md) — Struktur layer (Router, Service, Repository), model database, modul CBT, dan konvensi coding backend.
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) — Aturan bisnis periode, kuota, rubrik, dan formulir kesehatan.
- 🐳 [**Panduan Docker Setup**](../../docs/DOCKER_SETUP.md) — Konfigurasi runbook Docker WSL2.

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
