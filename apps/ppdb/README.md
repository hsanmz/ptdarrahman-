<div align="center">
  <h1>🎓 PPDB Frontend</h1>
  <p><strong>Aplikasi Portal Pendaftaran Peserta Didik Baru & Backoffice PPDB</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Aplikasi frontend berbasis **Vite + React + TypeScript** untuk sistem Penerimaan Peserta Didik Baru (PPDB) di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Aplikasi ini menyatukan portal mandiri calon santri/wali murid dengan panel operasional panitia PPDB.

## ✨ Fitur & Layanan Utama

### 👨‍🎓 Portal Calon Santri (Pendaftar)
- 📝 **Registrasi Bertahap:** 6 tahapan form wizard (Biodata Santri, Data Orang Tua/Wali Lengkap, Kontak, Domisili, Kuesioner Kesehatan 10 pertanyaan baku, dan Persetujuan). Bebas jenjang dan bebas jalur seleksi.
- 💳 **Pembayaran Biaya Formulir:** Terintegrasi QRIS dinamis Pakasir v2 dengan timer otomatis dan penerbitan kuitansi resmi berstempel HMAC.
- 📁 **Unggah Dokumen:** Pengunggahan berkas persyaratan wajib seragam (NISN, KK, Akta Kelahiran, Pas Foto, KTP Orang Tua/Wali, dan 4 Rapor Terakhir).
- 💻 **Ujian Seleksi CBT & Tahfidz:** Akses ke portal tes seleksi (`/applicant/tes-seleksi`) dan ruang ujian mandiri (`/exam/:scheduleId`) lengkap dengan timer, autosave, anti-cheating monitor, dan sesi Tahfidz Al-Qur'an.
- 🤝 **Wawancara Terpadu:** Jadwal wawancara calon santri dan orang tua/wali dalam satu waktu bersamaan (`/applicant/wawancara`).
- 📜 **Pengumuman Kelulusan & Tanda Tangan LoA:** Preview Letter of Acceptance (LoA) resmi dan pembubuhan tanda tangan digital orang tua/wali (`/applicant/pengumuman`). Menuntaskan alur PPDB (`is_locked = true`), menerbitkan nomor registrasi resmi, dan membuka akses tautan grup WhatsApp resmi santri baru.
- 👤 **Profil Mandiri & Keamanan Sesi:** Peninjauan dan pembaruan data formulir pendaftaran serta kuesioner kesehatan secara mandiri di `/applicant/profile` (selama belum locked), editor foto avatar, ganti kata sandi, dan pemantauan sesi login aktif multi-perangkat.

### 🛡️ Backoffice Admin PPDB (`/admin/*`)
- 📊 **Monitoring Pendaftar:** Pelacakan status pendaftar aktif, verifikasi dokumen berkas, dan pembacaan kuesioner kesehatan sensitif.
- ⏱️ **Manajemen Gelombang & Periode:** Penjadwalan periode, kuota pembayaran sukses atomik, master komponen biaya periode (`PeriodFeeItemsModal`), dan diskonasi gelombang (`WavesSheet`).
- 📋 **Pengaturan Rubrik Penilaian:** Konfigurasi kriteria evaluasi dan bobot rubrik (Tahfidz dan Wawancara Terpadu).
- 💻 **Bank Soal & Jadwal CBT Massal:** Kelola Bank Soal CBT Akademik & Psikologi (MCQ A-E, kunci jawaban, template CSV & import), serta penjadwalan ujian CBT massal per batch dengan cutoff H-1.
- 👁️ **Live Monitoring Ujian Real-Time:** Konsol pengawasan live pengerjaan ujian CBT (`/admin/monitoring/:category/:scheduleId`), status pengerjaan, pelanggaran keluar layar > 5 detik, dan modal unfreeze peserta.
- 🎙️ **Penjadwalan Tahfidz & Wawancara:** Manajemen slot jadwal penguji Tahfidz dan pewawancara terpadu.
- ⚖️ **Penilaian & Review LoA:** Form penilaian evaluator dua kolom, rekapitulasi nilai seleksi gabungan, penentuan kelulusan, dan monitoring tanda tangan LoA pendaftar.
- 💳 **Monitoring Keuangan Formulir:** Pemantauan transaksi pembayaran formulir via webhook Pakasir v2, kuitansi resmi bertanda tangan digital HMAC.
- 🗄️ **Arsip Dossier:** Pencarian data dossier lengkap lintas periode dan gelombang, serta ekspor bundle ZIP satu-klik dengan log audit alamat IP admin.

### 🌐 Rute Verifikasi Publik (Tanpa Login)
- 🧾 `/kuitansi/:id` & `/receipt/:id`: Verifikasi keaslian bukti bayar kuitansi resmi via QR code.
- 📜 `/loa/:registrationNo`: Verifikasi keaslian surat penerimaan LoA santri via QR code.

## 🛠️ Stack Teknologi

- **Framework:** React 19, Vite 8, React Router v7
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v3.4, Radix UI primitives, Lucide React
- **State & Data:** TanStack Query v5, Zustand
- **Koneksi API:** Berkomunikasi dengan [`apps/api`](../api/README.md) via HTTP-only Cookies (`credentials: 'include'`)

## 📦 Menjalankan secara Lokal

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

## 📚 Bacaan Lebih Lanjut
- 🤖 [**Panduan Frontend PPDB (AGENTS.md)**](AGENTS.md) — Rincian lengkap rute tahapan pendaftar, rute admin, modul CBT, dan arsitektur komponen.
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) — Aturan bisnis periode, kuota, rubrik penilaian, dan formulir kesehatan.

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
