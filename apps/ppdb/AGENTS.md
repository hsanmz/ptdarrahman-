# PPDB Frontend App (PTDARRAHMAN)

Aplikasi frontend Penerimaan Peserta Didik Baru (PPDB) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Melayani calon santri/wali murid (registrasi, ujian seleksi terpadu & wawancara, pembayaran formulir QRIS Pakasir v2, dan penetapan hasil kelulusan / penandatanganan LoA digital) serta backoffice admin PPDB.

## Tech Stack
- **Framework:** React 19 + Vite 8
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3.4, `class-variance-authority`, `clsx`, `tailwind-merge`
- **UI Components:** Radix UI primitives (`@radix-ui/react-*`), custom components di `src/components/ui/`, Lucide React untuk icons
- **State & Data:** `@tanstack/react-query` v5, Zustand
- **Routing:** React Router v7 (`react-router-dom`)
- **Build & Deploy:** Dibangun dengan `tsc -b && vite build`

## Architecture & State Management
- **API Client (`src/api/client.ts`):**
  - Custom `fetch` wrapper (`apiFetch`) dengan parsing error JSON aman.
  - Berbasis cookie (`credentials: 'include'`); tidak ada token otentikasi di localStorage/header. Refresh token otomatis via `/auth/refresh` (atau `/companyprofile/auth/refresh`) saat 401.
  - `API_BASE` berasal dari `VITE_API_URL` (fallback kosong → same origin / dev proxy).
- **Services (`src/services/`):**
  - Modular API calls: `authService`, `ppdbService`, `applicantService`, `paymentService`, `notificationService`, `settingsService`, `cbtService`.
- **Global Contexts (`src/contexts/`):**
  - `AuthContext`: Mengelola state pendaftar/admin, login/logout, dan permission. Auto-refresh `/auth/me` tiap 30 detik untuk mendeteksi perubahan status atau izin.

## Routes & Pages (`src/pages/`)
### 1. Public Routes
- `/` (`LandingPage`): Beranda publik PPDB.
- `/register` (`RegisterPage`): Formulir pendaftaran calon santri bertahap (6 bagian: Identitas, Orang Tua, Kontak, Domisili, Identifikasi Kesehatan 10 soal, Pernyataan).
- `/globe` (`GlobeDemoPage`): Halaman demo 3D globe.
- `/auth/login` (`LoginPage`): Halaman login terpusat untuk pendaftar dan admin PPDB.
- `/applicant/login`: Alias redirect ke `/auth/login`.
- `/kuitansi/:id` & `/receipt/:id` (`PublicReceiptPage`): Halaman verifikasi publik kuitansi pembayaran resmi formulir (dengan QR code dan signature HMAC).
- `/loa/:registrationNo` (`PublicLoaPage`): Halaman verifikasi publik Surat Penerimaan (LoA) resmi calon santri.

### 2. Applicant Protected Routes (`role="applicant"`, `requirePaid={true}`)
- `/checkout` (`CheckoutPage`): Halaman paywall biaya formulir (dibuka jika `payment_status != paid`).
- `/applicant` (`ApplicantDashboardPage`): Dashboard utama pendaftar yang memuat timeline tahapan dan rangkuman status.
- `/applicant/kuitansi` (`ApplicantReceiptPage`): Riwayat dan rincian kuitansi pembayaran resmi formulir.
- `/applicant/dokumen` (`ApplicantDocumentsPage`): Unggah dokumen wajib persyaratan (NISN, KK, Akte, Pas Foto, KTP Orang Tua/Wali, 4 Rapor Terakhir).
- `/applicant/tes-seleksi` (`TesSeleksiPage`): Portal seleksi pendaftar terpadu — kartu ujian CBT Akademik, CBT Psikologi (dengan PIN sesi), dan jadwal Seleksi Tahfidz.
- `/applicant/wawancara` (`WawancaraPage`): Jadwal dan rekapitulasi hasil Wawancara Terpadu Calon Santri dan Orang Tua/Wali.
- `/exam/:scheduleId` (`CbtExamPage`): Ruang ujian CBT online/offline terisolasi (timer countdown, autosave jawaban per opsi, anti-kecurangan tab switch > 5 detik, auto-submit).
- `/applicant/pengumuman` (`ResultStagePage`): Pengumuman hasil kelulusan, preview LoA resmi, dan pembubuhan tanda tangan digital orang tua/wali (penutup alur PPDB, `is_locked = true`).
- `/applicant/profile` (`ApplicantProfilePage`): Profil mandiri calon santri (tinjau/edit formulir pendaftaran, kuesioner kesehatan, ganti password, avatar editor, dan manajemen sesi login perangkat aktif).
- `/applicant/kartu-ujian` (`ExamCardPage`): Unduh kartu ujian/identitas pendaftar.

### 3. Admin Protected Routes (`role="admin"`, wrapped in `AdminLayout`)
- `/admin/dashboard` (`AdminDashboardPage`): Statistik pendaftar, tren registrasi, panel perlu perhatian, dan status standby gelombang.
- `/admin/data-pendaftar` (`DataPendaftarPage`): Ringkasan dan tabel pendaftar aktif (gelombang aktif).
- `/admin/verifikasi-dokumen` (`VerifikasiDokumenPage`): Daftar pendaftar untuk verifikasi berkas persyaratan.
- `/admin/verifikasi-dokumen/:id` (`VerifikasiDokumenDetailPage`): Detail verifikasi berkas dan kuesioner kesehatan per pendaftar (dua kolom dengan DocTrigger).
- `/admin/pembayaran-formulir` (`PembayaranFormulirPage`): Monitoring invoice formulir dan integrasi Pakasir v2.
- `/admin/kuitansi/:id` (`AdminReceiptPage`): Detail dan cetak kuitansi resmi pembayaran formulir.
- `/admin/jadwal-seleksi/akademik` (`JadwalUjianPage`, `category="akademik"`): Manajemen jadwal ujian CBT Akademik per gelombang/batch.
- `/admin/jadwal-seleksi/psikologi` (`JadwalUjianPage`, `category="psikologi"`): Manajemen jadwal ujian CBT Psikologi per gelombang/batch.
- `/admin/jadwal-seleksi/tahfidz` (`JadwalTahfidzPage`): Manajemen jadwal ujian seleksi Tahfidz Al-Qur'an per gelombang/batch.
- `/admin/jadwal-seleksi/tahfidz/:sessionId` (`TahfidzSessionDetailPage`): Detail sesi ujian Tahfidz.
- `/admin/jadwal-seleksi/wawancara` (`JadwalWawancaraPage`): Manajemen jadwal wawancara terpadu calon santri dan orang tua/wali dalam satu waktu.
- `/admin/jadwal-seleksi/wawancara/:sessionId` (`WawancaraSessionDetailPage`): Detail sesi wawancara.
- `/admin/sessions/:sessionType/evaluasi/:sessionId` (`SessionEvaluationPage`): Form penilaian rubrik evaluator dua kolom.
- `/admin/monitoring/:category/:scheduleId` (`PemantauanUjianPage`): Live real-time monitoring ujian CBT (status peserta, sisa waktu, deteksi pelanggaran, dan modal unfreeze peserta).
- `/admin/bank-soal/akademik` (`BankSoalPage`, `category="akademik"`): Kelola Bank Soal CBT Akademik (MCQ A-E, kunci jawaban, alokasi poin, durasi). Tampilan Card/List; klik kartu/baris membuka halaman detail (hapus bank hanya di halaman detail).
- `/admin/bank-soal/psikologi` (`BankSoalPage`, `category="psikologi"`): Kelola Bank Soal CBT Psikologi. Tampilan Card/List + pencarian; klik kartu/baris membuka halaman detail.
- `/admin/bank-soal/detail/:bankId` (`BankSoalDetailPage`): Detail Bank Soal — edit data bank (judul, deskripsi, durasi) dengan tombol simpan eksplisit, editor butir soal (tambah/ubah/hapus dengan opsi A-E, kunci, poin) + pencarian & paginasi, serta modal Bagikan Akses Ujian (link `/exam/:scheduleId` + PIN per jadwal pemakai bank) dan zona hapus bank. Bank yang sudah dipakai Jadwal Ujian dikunci (`in_use`).
- `/admin/penilaian` (`PenilaianPage`): Rekapitulasi nilai akhir gabungan (Akademik, Psikologi, Tahfidz, Wawancara) dan penetapan keputusan kelulusan.
- `/admin/review-loa` (`ReviewLoaPage`): Monitoring seluruh penerima LoA resmi (lulus), status tanda tangan digital orang tua & santri, dan unduh berkas LoA.
- `/admin/periods` (`PeriodsPage`): Manajemen periode, master komponen biaya (`PeriodFeeItemsModal`), gelombang pendaftaran, dan diskonasi (`WavesSheet`).
- `/admin/rubrik` & `/admin/selection` (`SelectionPage`): Konfigurasi kriteria dan bobot rubrik penilaian seleksi.
- `/admin/arsip` (`ArsipPendaftarPage`): Pencarian arsip lintas periode/gelombang (klik baris pendaftar langsung membuka halaman detail arsip berkas).
- `/admin/arsip/:id` (`ArsipDossierDetailPage`): Halaman detail berkas arsip & dossier pendaftar dengan 2 panel independent scroll: panel kiri pratinjau seluruh berkas (Formulir, Dokumen Upload terverifikasi, Lembar Penilaian, dan LoA dalam 1x scroll vertikal kontinu) dan panel kanan (atas: pusat unduhan ZIP/PDF/PNG/Cetak, bawah: navigator daftar berkas aktif).
- `/admin/notifications` (`NotificationsPage`): Riwayat pengiriman dan template notifikasi WhatsApp.
- `/admin/profile` (`AdminProfilePage`): Pengaturan profil admin, ganti password, avatar editor, dan manajemen sesi login multi-perangkat.

### 4. Error Pages
- `/403` (`ForbiddenPage`): Akses ditolak.
- `*` (`NotFoundPage`): Halaman tidak ditemukan.

---

## 💡 Komponen Modal, Dokumen & Fitur Spesial
- **`PeriodFeeItemsModal`**: Modal manajemen master komponen biaya pendidikan per periode (tambah, edit, hapus, dan total nominal standar).
- **`WavesSheet`**: Sheet drawer pengelolaan gelombang pendaftaran dan diskonasi per komponen biaya (Diskon Reguler, Diskon Early Bird, dan Simulasi Hitung Biaya).
- **`OfficialReceiptModal` & `OfficialReceiptCard`**: Modal dan kartu kuitansi resmi lengkap dengan stempel digital dan verifikasi QR HMAC token.
- **`QrisPaymentModal`**: Dialog QRIS dinamis Pakasir v2 dengan timer kedaluwarsa, panduan bayar, dan pengecekan status otomatis.
- **`ApplicantLoAModal` & `LoaOfficialDocument`**: Tampilan Surat Penerimaan Resmi (LoA) dengan klausul non-refundable, QR verifikasi, dan kanvas tanda tangan digital orang tua.
- **`ApplicantFormDocument`**: Dokumen formulir pendaftaran santri baku A4 lengkap dengan identifikasi kesehatan.
- **`OfficialAssessmentSheet`**: Lembar penilaian evaluator ujian Tahfidz dan Wawancara berbobot resmi.
- **`DeviceSessionsCard` & `AvatarEditor`**: Manajemen sesi login perangkat aktif dan editor foto profil (crop & zoom).
- **`LoaResultStep`**: Komponen tahapan kelulusan dan penandatanganan LoA digital sebagai penutup alur pendaftaran santri.
- **`ApplicantDossierModal`**: Modal dossier lengkap pendaftar untuk halaman Arsip — biodata, dokumen, sesi, nilai, dan LoA.
- **`HealthIdentificationViewer`**: Komponen viewer data kuesioner kesehatan 10 pertanyaan — hanya diakses admin di detail/dossier pendaftar.

---

## 🖨️ Pipeline Ekspor & Dokumen Cetak Resmi (`src/utils/`)
- **`exportApplicantForm.ts`**: Ekspor cetak formulir pendaftaran calon santri baru format baku A4.
- **`exportAssessment.ts`**: Ekspor cetak lembar penilaian seleksi evaluator (Tahfidz, Wawancara).
- **`exportLoa.ts`**: Ekspor cetak Surat Penerimaan Resmi (LoA) pendaftar berstempel & bertanda tangan digital.
- **`exportReceipt.ts`**: Ekspor cetak tanda terima kuitansi resmi pembayaran formulir ber-HMAC QR.
- **`exportDocUtils.ts`**: Utilitas printing engine (iframe printing, layout envelope styling, font injection).

---

## 📋 Aturan Bisnis & Ruang Lingkup Sistem

1. **Status Ruang Lingkup:**
   - Konfigurasi backoffice admin dan tahapan seleksi pendaftar (dokumen, seleksi CBT & Tahfidz, wawancara terpadu, dan penerbitan/penandatanganan LoA resmi) aktif dalam sistem. Alur pendaftaran tuntas pada penandatanganan LoA.
2. **Tanpa Pemilihan Jenjang & Tanpa Jalur:**
   - Sistem tidak mengenal jenjang (`SMP`, `SMK`) maupun pemilihan jalur. Tidak ada kolom/input jenjang atau jalur di registrasi pendaftar maupun pengaturan gelombang.
3. **Kuesioner Identifikasi Kesehatan (10 Soal):**
   - Menggantikan Medcheck, diisi saat registrasi, tersimpan sebagai data profil sensitif yang hanya dapat dilihat di detail/dossier admin.
4. **Pembayaran Formulir, Master Biaya Periode & Diskonasi Gelombang:**
   - Biaya formulir (`ppdb_periods.form_fee`) dan minimal DP biaya pendidikan (`ppdb_periods.minimum_dp`) adalah master tingkat **Periode** — semua gelombang di bawahnya memakai nilai yang sama. Kuota gelombang dan diskon pendaftar awal dihitung dari pembayaran formulir sukses via QRIS dinamis Pakasir v2.
   - Kelayakan diskon pendaftar awal per pendaftar (`early_discount_eligible`) ditandai backend saat formulir sukses (sesuai kuota gelombang), dan LoA hanya menerapkan potongan early bird bila flag itu aktif.
   - Seluruh komponen biaya masuk / biaya pendidikan dikonfigurasi di level Periode (`ppdb_period_fee_items`), sedangkan gelombang hanya mengatur diskonasi (`ppdb_wave_fee_discounts`): Diskon Reguler dan Diskon Early Bird.
   - Biaya pendidikan disajikan transparan pada LoA resmi. Penyetoran biaya dilakukan **di luar aplikasi** (transfer rekening resmi PTDARRAHMAN / tunai di kantor bendahara pesantren).
   - **Di dalam portal PPDB tidak ada pembayaran online tahap 2.** Alur pendaftaran tuntas saat penandatanganan LoA.
5. **Standar Penulisan Nama Institusi (PTDARRAHMAN):**
   - Kop dokumen A4 & ucapan formal: **`PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN`** / **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (tetap utuh, jangan ditambahi kata baru).
   - Rincian transfer bank, kantor bendahara, footer LoA/kuitansi/kartu: **`PTDARRAHMAN`**.
   - ❌ **Dilarang keras memakai kata:** `Yayasan Pesantren Ar-Rahman` atau `Pesantren Ar-Rahman` (tanpa lanjutan tahfidz). Wajib diganti ke `PTDARRAHMAN`.
6. **Pola DocTrigger (BookOpen CTA):**
   - Setiap halaman admin backoffice wajib menyediakan tombol dokumentasi kontekstual (`<DocTrigger docKey="..." variant="light" />`) via prop `docKey` di `PageHeaderCard` atau langsung di header inline.

---

## 🎨 Dynamic Branding & Design System
- **Panduan Desain UI/UX:** Rujuk ke [**DESIGN.md**](../../DESIGN.md) untuk pedoman warna (Warm Ivory `#F7F5F0`, Islamic Emerald `#1A6B47`, Regal Gold `#D4A853`), tipografi (Playfair Display & Inter), animasi (`.ease-brand-pill`), dan format cetak A4 baku.
- **System Design:** Rujuk ke [**README.md**](../../README.md) untuk diagram arsitektur teknis, alur pendaftar, webhook payment, dan spesifikasi container.
- **No Static Logo:** Logo institusi selalu diambil dinamis via `settingsService.getLogo()` (GET `/companyprofile/settings/logo`).
- **Live Updates:** Perubahan aset brand langsung terefleksi via Server-Sent Events (SSE) `/companyprofile/events`.
- **`PageLoader` & `Skeleton`:** Loader animasi dual SVG arc spinner tanpa aset gambar statis.

---

## 💻 Build & Run
- `npm run dev` — Menjalankan Vite dev server lokal (port default `5174`, selaras dengan Docker preview).
- `npm run build` — Type-checking (`tsc -b`) & build production (`vite build`).
- `npm run preview` — Menjalankan preview hasil build.
- `npm run lint` — Menjalankan ESLint.
