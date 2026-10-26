<div align="center">
  <h1>ðŸŽ“ PPDB Frontend</h1>
  <p><strong>Aplikasi Portal Pendaftaran Peserta Didik Baru & Backoffice PPDB</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Aplikasi frontend berbasis **Vite + React + TypeScript** untuk sistem Penerimaan Peserta Didik Baru (PPDB) di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Aplikasi ini menyatukan portal mandiri calon santri/wali murid dengan panel operasional panitia PPDB.

## âœ¨ Fitur & Layanan Utama

### ðŸ‘¨â€ðŸŽ“ Portal Calon Santri (Pendaftar)
- ðŸ“ **Registrasi Bertahap:** 6 tahapan form (Biodata Santri, Data Orang Tua/Wali, Kontak, Domisili, Kuesioner Kesehatan 10 pertanyaan, dan Persetujuan).
- ðŸ’³ **Pembayaran Biaya Formulir:** Terintegrasi QRIS dinamis Pakasir v2 dengan timer otomatis dan penerbitan kuitansi resmi.
- ðŸ“ **Unggah Dokumen:** Pengunggahan berkas persyaratan wajib seragam (NISN, KK, Akta Kelahiran, Pas Foto, KTP Orang Tua/Wali, dan 4 Rapor Terakhir).
- ðŸ“… **Booking Sesi 1:1:** Pemilihan jadwal mandiri untuk Ujian Tahfidz dan Wawancara bersama penguji.
- ðŸ“œ **Kelulusan & Tanda Tangan LoA:** Preview Letter of Acceptance (LoA) resmi dan pembubuhan tanda tangan digital orang tua.
- ðŸ’° **Pembayaran Tahap 2 (DP & Cicilan):** Pembayaran DP via QRIS, simulasi/pengaturan skema cicilan biaya pendidikan, dan pengunggahan bukti pembayaran.
- ðŸ‘¤ **Profil Mandiri & Keamanan Sesi:** Peninjauan dan pembaruan data formulir pendaftaran serta kuesioner kesehatan secara mandiri di `/applicant/profile`, editor foto avatar, ganti kata sandi, dan pemantauan sesi login aktif.

### ðŸ›¡ï¸ Backoffice Admin PPDB (`/admin/*`)
- ðŸ“Š **Monitoring Pendaftar:** Pelacakan status berkas, verifikasi dokumen, dan kuesioner kesehatan.
- â±ï¸ **Manajemen Gelombang & Periode:** Penjadwalan, kuota pembayaran otomatis, dan diskon pendaftar awal.
- ðŸ“ **Pengaturan Rubrik Penilaian:** Konfigurasi kriteria evaluasi dan bobot rubrik (Tahfidz dan Wawancara).
- ðŸŽ™ï¸ **Penjadwalan 1:1:** Manajemen slot penguji Tahfidz dan pewawancara.
- âš–ï¸ **Penilaian & LoA:** Input skor evaluator, penentuan status kelulusan, dan review LoA pendaftar.
- ðŸ’³ **Monitoring Keuangan & Detail Cicilan (`/admin/pembayaran-tahap2/:id`):** Pemantauan pembayaran formulir serta buku besar detail per pendaftar (status DP, skema cicilan, jatuh tempo termin, dan riwayat kuitansi).
- ðŸ—„ï¸ **Arsip Dossier:** Pencarian data dossier lengkap lintas periode dan gelombang, serta ekspor bundle ZIP satu-klik dengan log audit.

### ðŸŒ Rute Verifikasi Publik (Tanpa Login)
- ðŸ§¾ `/kuitansi/:id` & `/receipt/:id`: Verifikasi keaslian bukti bayar kuitansi resmi.
- ðŸ“œ `/loa/:registrationNo`: Verifikasi keaslian surat penerimaan LoA santri.

## ðŸ› ï¸ Stack Teknologi

- **Framework:** React 19, Vite 8, React Router v7
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v3, Radix UI primitives, Lucide React
- **Koneksi API:** Berkomunikasi dengan [`apps/api`](../api/README.md) via HTTP-only Cookies (`credentials: 'include'`)

## ðŸ“¦ Menjalankan secara Lokal

Buka terminal di root repository:

```bash
# Instalasi dependensi workspace
pnpm install

# Menjalankan development server PPDB
pnpm --filter ppdb dev
```

> **Informasi Port:**
> - Baik dijalankan secara lokal (`pnpm --filter ppdb dev`) maupun melalui Docker Compose (produksi/preview), PPDB berjalan pada port `http://localhost:5174`.
> - Jika menggunakan Docker untuk API backend, pastikan `VITE_API_URL` diarahkan ke `http://localhost:8080` atau IP WSL Anda.

## ðŸ“š Bacaan Lebih Lanjut
- ðŸ¤– [**Panduan Frontend PPDB (AGENTS.md)**](AGENTS.md) â€” Rincian lengkap rute tahapan pendaftar, rute admin, dan arsitektur komponen.
- ðŸ“– [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) â€” Aturan bisnis periode, kuota, rubrik penilaian, dan formulir kesehatan.

---
â¬…ï¸ [Kembali ke Halaman Utama](../../README.md)
