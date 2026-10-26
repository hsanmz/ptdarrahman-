<div align="center">
  <h1>ðŸ›¡ï¸ Superadmin</h1>
  <p><strong>Panel Manajemen Pengguna, Hak Akses & Operasional Platform</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Aplikasi frontend berbasis **Vite + React + TypeScript** yang berfungsi sebagai panel administrasi eksklusif untuk **Superadmin** di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

Di panel ini, **Superadmin** mengelola akun pengguna, matriks hak akses/role (RBAC), memantau log aktivitas, serta mengelola koneksi WhatsApp gateway.

## âœ¨ Fitur Utama

- ðŸ“Š **Dashboard:** Statistik total pengguna aktif, distribusi role, dan aktivitas sistem.
- ðŸ‘¥ **Users:** CRUD akun staf/admin, penetapan role, dan izin halaman per user.
- ðŸ›¡ï¸ **Roles & Permissions:** Konfigurasi role sistem dan penugasan izin modul (`companyprofile` dan `ppdb`) dengan level akses (`none` < `dashboard` < `read` < `crud`).
- ðŸŽ“ **Pendaftar:** Tinjauan daftar seluruh pendaftar PPDB dan kemampuan reset kata sandi akun pendaftar.
- ðŸ•˜ **Aktivitas:** Jejak audit (*audit trail*) aktivitas pengguna dan admin.
- ðŸ”” **Notifikasi:** Melihat riwayat pengiriman notifikasi dan mengirim notifikasi kustom ke nomor tujuan.
- ðŸ“± **WhatsApp Bridge:** Memantau status koneksi bot WhatsApp, scan QR code otorisasi, dan tes koneksi.
- ðŸ§  **Semantic Search & Quick Action (`Ctrl+K`):** Pencarian semantik cerdas bertenaga pemrosesan bahasa alami di header dashboard untuk mencari menu, data pendaftar, pintasan, dan eksekusi aksi navigasi cepat.
- ðŸ‘¤ **Profil & Manajemen Sesi:** Memperbarui profil personal superadmin (avatar editor, nama, dan kata sandi), serta memantau dan mencabut sesi perangkat aktif dari jarak jauh.


## ðŸ› ï¸ Stack Teknologi

- **Framework:** React 19, Vite 8, React Router v7
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v3, Radix UI primitives, Lucide React
- **Koneksi API:** Berkomunikasi dengan [`apps/api`](../api/README.md) via HTTP-only Cookies (`credentials: 'include'`)

## ðŸ“¦ Menjalankan secara Lokal

Aplikasi ini masuk ke dalam ekosistem `pnpm workspace`. Buka terminal di root repository:

```bash
# Menjalankan development server
pnpm --filter superadmin dev
```

> **Informasi Port:**
> - Baik dijalankan secara lokal (`pnpm --filter superadmin dev`) maupun melalui Docker Compose (preview), Superadmin berjalan pada port `http://localhost:5173`.

## ðŸ“š Bacaan Lebih Lanjut
- ðŸ¤– [**Panduan Panel Superadmin (AGENTS.md)**](AGENTS.md) â€” Arsitektur teknis, guarded routes, dan otorisasi cookie.
- ðŸ“– [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) â€” Aturan bisnis menyeluruh ekosistem PPDB.

---
â¬…ï¸ [Kembali ke Halaman Utama](../../README.md)
