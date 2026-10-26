# Requirement & Business Logic PPDB

> **Versi:** 1.5.0
> **Tanggal Terakhir Diperbarui:** 26 Oktober 2026
>
> Dokumen ini memuat aturan bisnis utama untuk sistem Penerimaan Peserta Didik Baru (PPDB) Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
> - Untuk arsitektur sistem, topologi kontainer, alur pembayaran, dan diagram teknis (System Design), rujuk ke [**README.md**](../README.md).
> - Untuk panduan antarmuka, warna semantik, tipografi, dan token UI/UX, rujuk ke [**DESIGN.md**](../DESIGN.md).

---

## Alur Konfigurasi Admin (Backoffice)
Admin menyiapkan komponen berikut dari dashboard backoffice sebelum pendaftaran dibuka:
1. **Periode & Master Komponen Biaya** â€” nama periode, tahun ajaran, dan master komponen biaya pendidikan (uang pangkal, SPP, seragam, matrikulasi, dll.) yang berlaku standar untuk seluruh gelombang.
2. **Gelombang pendaftaran** â€” tanggal buka/tutup, harga formulir, kuota pendaftar, diskon untuk X pendaftar pertama formulir, dan diskonasi per komponen biaya master (diskon reguler & diskon early bird).
4. **Rubrik penilaian** â€” kriteria, bobot, dan formulir evaluator untuk Tahfidz dan wawancara.
5. **Bank Soal & Jadwal CBT (Akademik & Psikologi)** â€” pembuatan bank soal per periode untuk kategori Akademik dan Psikologi (pilihan ganda MCQ A-E, kunci jawaban, alokasi poin, durasi), serta penjadwalan ujian CBT massal per gelombang/batch lengkap dengan PIN sesi/access token.
6. **Session 1:1 Tahfidz** â€” jadwal, penguji, mode online/offline, serta tautan Zoom atau lokasi tatap muka.
7. **Session 1:1 Wawancara (Santri & Orang Tua/Wali)** â€” jadwal terpisah untuk wawancara calon santri dan wawancara orang tua/wali santri, pewawancara, mode online/offline, serta tautan Zoom atau lokasi tatap muka.
8. **Pemantauan Ujian Real-Time** â€” konsol live monitoring ujian CBT untuk memantau status peserta, sisa waktu, deteksi pelanggaran, dan modal unfreeze peserta.

Pendaftaran publik dibuka ketika ada gelombang aktif di periode aktif, jadwal pendaftaran sudah masuk, dan kuota pembayaran formulir belum penuh. Template LoA bukan prasyarat pendaftaran dibuka.

---

## Periode, Gelombang & Komponen Biaya

- **Master Biaya di Periode:** Seluruh master komponen biaya masuk / biaya pendidikan (uang pangkal, SPP, seragam, matrikulasi, dsb.) dikonfigurasi di tingkat Periode (`ppdb_period_fee_items`). Setiap gelombang dalam periode otomatis mewarisi komponen biaya standar yang seragam tanpa perlu input ulang.
- **Diskonasi di Gelombang:** Gelombang (`ppdb_waves`) tidak membuat komponen biaya dari nol, melainkan cukup mengatur diskon per komponen biaya periode (`ppdb_wave_fee_discounts`):
  - **Diskon Reguler:** Persentase (%) atau Nominal Rupiah (Rp).
  - **Diskon Pendaftar Awal (Early Bird):** Dihitung dari sisa biaya setelah diskon reguler untuk X pendaftar awal.
- **Biaya Pendidikan Sebagai Informasi Resmi:** Biaya pendidikan dihitung dan disajikan secara transparan sebagai rincian resmi pada Letter of Acceptance (LoA) calon santri yang lulus seleksi.
- **Penyetoran di Luar Aplikasi:** Pembayaran biaya pendidikan dilakukan **di luar aplikasi** (transfer manual ke rekening resmi PTDARRAHMAN / tunai ke bendahara pesantren). Di dalam sistem PPDB **tidak ada** pembayaran online tahap 2, dan alur pendaftaran mandiri calon santri tuntas pada penandatanganan LoA.
- **Hanya satu periode yang aktif secara global.** Mengaktifkan periode menonaktifkan periode lain beserta gelombang di luar periode itu; menonaktifkan periode menonaktifkan gelombang di dalamnya.
- **Setiap periode hanya boleh memiliki satu gelombang aktif.** Gelombang hanya bisa aktif jika periode induknya aktif. Mengaktifkan gelombang baru menggantikan gelombang aktif sebelumnya.
- Jumlah gelombang per periode fleksibel tanpa batas tetap.
- Calon santri otomatis masuk ke gelombang aktif di periode aktif dan **tidak memilih gelombang sendiri**.
- Kuota dan diskon untuk X pendaftar awal dihitung berdasarkan **pembayaran formulir yang berhasil**. Ketika kuota tercapai, pendaftaran dan gelombang ditutup otomatis, tagihan formulir pending dibatalkan, dan pengingat Senin dihentikan.

---

## Tanpa Pemilihan Jenjang Pendidikan

- Sistem **tidak mengenal daftar jenjang pendidikan** (`SMP`, `SMK`, atau nilai lain) dan **tidak menyediakan pemilihan jenjang di mana pun**: tidak di formulir pendaftaran, tidak di dashboard pendaftar, tidak di konfigurasi gelombang, dan tidak di halaman publik. Pendaftar tidak memilih, tidak mengisi, dan tidak dapat mengubah jenjang.
- Sistem bebas jenjang dan bebas jalur pendaftaran (tanpa pemilihan jalur, seluruh pendaftar mengikuti skema terpadu yang sama).
- Field/kolom jenjang dan jalur yang sudah ada di implementasi lama adalah sisa flow lama: perlakukan sebagai artefak tidak aktif, jangan jadikan sumber kebenaran, dan jangan tambahkan UI atau endpoint baru yang bergantung padanya.

---

## Standar Penulisan Nama Institusi & Entitas (Naming Convention)

Untuk menjaga konsistensi komunikasi resmi dan dokumen sah di seluruh platform:

1. **Nama Resmi Baku Institusi:**
   - Bentuk resmi: **`Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`** (atau huruf kapital penuh pada Kop dokumen: **`PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN`**).
   - Nama resmi ini **tidak boleh diubah, disingkat, atau ditambahi** frasa baru (seperti *PTDARRAHMAN (Pesantren Tahfidz Qur'an dan Digital Ar-Rahman)*). Biarkan teks baku tersebut tetap utuh.
2. **Singkatan / Nama Entitas Pengenal:**
   - Gunakan selalu: **`PTDARRAHMAN`** (atau **`PTD ARRAHMAN`** / **`PTD Ar-Rahman`**).
   - Digunakan untuk:
     - Branding aplikasi & judul tab portal (*Superadmin Panel - PTDARRAHMAN*, *PPDB PTDARRAHMAN*).
     - Rincian kanal penyetoran biaya pendidikan: *Rekening Resmi PTDARRAHMAN*, *Kantor Administrasi & Bendahara PTDARRAHMAN*.
     - Footer surat & watermark dokumen sah: *Letter of Acceptance (LoA) Resmi - PTDARRAHMAN*, *Sistem Resmi PPDB PTDARRAHMAN*.
     - Penyebutan singkat profil institusi: *PTDARRAHMAN*.
3. **Kata yang Dilarang Digunakan:**
   - âŒ **DILARANG** menulis: **`Yayasan Pesantren Ar-Rahman`** atau **`Yayasan Pesantren Ar Rahman`**.
   - âŒ **DILARANG** menulis: **`Pesantren Ar-Rahman`** atau **`Pesantren Ar Rahman`** (sebagai sebutan entitas tunggal tanpa kelanjutan *Tahfidz Qur'an dan Digital*).
   - Jika ditemukan pada kode lama atau template, wajib diganti menjadi **`PTDARRAHMAN`**.

---

## Struktur Formulir Pendaftaran Publik

Sistem menggunakan formulir pendaftaran bertahap (wizard) dengan 6 bagian (section) utama:

1. **Identitas Calon Murid**: Data pribadi santri dan asal sekolah.
2. **Data Orang Tua/Wali**: Data lengkap meliputi Nama, Pekerjaan, dan Nomor WA untuk Ayah dan Ibu. Data Wali bersifat opsional. Terdapat juga input Email Orang Tua/Wali dan Penghasilan Per Bulan.
3. **Kontak**: Email dan Nomor WA pendaftar. Sistem wajib meminta pengguna memverifikasi data ini kembali karena digunakan untuk pengiriman kredensial.
4. **Domisili**: Alamat lengkap, Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa, dan Kode Pos.
5. **Identifikasi Kesehatan**: Kuesioner riwayat kesehatan yang menggantikan fungsi medcheck (berlabel "Identifikasi Kesehatan").
6. **Pernyataan & Persetujuan**: Konfirmasi akhir dengan 4 persetujuan (checkbox) yang wajib dicentang sebelum tombol *submit* aktif.

Data orang tua/wali yang terkumpul pada langkah ini wajib disinkronisasi tampilannya di seluruh *dashboard* operasional (Admin, Superadmin, dan profil Pendaftar) secara lengkap, bukan hanya direduksi menjadi satu baris `parent_name`.

---

## Formulir Identifikasi Kesehatan (Pengganti Medcheck)

Formulir ini menggantikan Medcheck. Diisi sendiri oleh pendaftar pada formulir pendaftaran (bukan oleh petugas medis), dan hasilnya disimpan sebagai data profil kesehatan pendaftar yang dapat dibuka admin pada halaman detail/dossier pendaftar.

Struktur 10 pertanyaan baku:
1. **Riwayat penyakit kronis** â€” Ya / Tidak. Jika **Ya**, isi kolom keterangan (sebutkan penyakitnya).
2. **Pernah didiagnosis kondisi tertentu** â€” checkbox: Asma, Diabetes, Epilepsi, Penyakit jantung, Hipertensi, TBC, Lainnya. Opsi "Lainnya" punya isian bebas. Tersedia kolom keterangan untuk menjelaskan pilihan.
3. **Alergi** â€” Ya / Tidak. Jika **Ya**, pilih jenis alergi dengan checkbox: Makanan, Obat, Debu, Lainnya (isian bebas). Tersedia kolom keterangan untuk menjelaskan pilihan.
4. **Pengobatan rutin** â€” "Apakah Anda sedang menjalani pengobatan rutin atau mengonsumsi obat tertentu secara berkala?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
5. **Keterbatasan fisik** â€” "Apakah Anda memiliki kondisi kesehatan atau keterbatasan fisik yang perlu diketahui sekolah?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
6. **Riwayat rawat inap** â€” "Apakah Anda pernah menjalani rawat inap atau operasi dalam 2 tahun terakhir?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
7. **Kebutuhan khusus** â€” "Apakah Anda memiliki kebutuhan khusus terkait kesehatan selama mengikuti kegiatan belajar?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
8. **Nama kontak darurat.**
9. **Hubungan kontak darurat dengan calon peserta didik.**
10. **Nomor telepon kontak darurat.**

**Pernyataan** (wajib disetujui pendaftar): *"Saya menyatakan bahwa informasi kesehatan yang saya berikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat perubahan kondisi kesehatan, saya bersedia memberitahukan pihak sekolah."*

Perilaku formulir:
- Pertanyaan Ya/Tidak membuka turunannya secara kondisional. Kolom keterangan pada pertanyaan yang dijawab "Tidak" dikosongkan dan tidak ikut terkirim.
- Pertanyaan 2 dan 3 adalah daftar checkbox, tidak memaksa minimal satu centang.
- Pernyataan wajib disetujui sebelum submit.
- Validasi bersyarat dijalankan ulang di backend saat pendaftaran.
- Data kesehatan bersifat sensitif: batasi aksesnya dengan izin khusus, sertakan dalam audit akses, dan sudah tercakup dalam dossier/unduhan ZIP pada halaman Arsip/Cari Pendaftar.

---

## Sistem Ujian CBT (Akademik & Psikologi) & Seleksi Terpadu

Sistem PPDB mengintegrasikan modul Computer Based Test (CBT) mandiri dan sesi tatap muka terstruktur untuk evaluasi komprehensif calon santri:

### 1. Bank Soal & Kategori CBT
- Dikelola di level Periode (`ppdb_exam_banks`) untuk dua kategori utama:
  1. **Seleksi Akademik**: Mengukur kemampuan dasar (matematika, bahasa, pengetahuan umum/keislaman).
  2. **Seleksi Psikologi**: Mengukur potensi bakat, kecerdasan logis, dan kecocokan psikologis santri berasrama.
- Struktur soal: Pilihan Ganda (Single Choice MCQ A-E) dengan kunci jawaban (`is_correct`), bobot poin per soal, dan alokasi total durasi waktu pengerjaan.
- Tersedia fitur unduh template CSV dan import berkas bank soal massal oleh panitia.

### 2. Jadwal Ujian Massal, Batching & Cutoff H-1
- Jadwal ujian CBT (`ppdb_exam_schedules`) diset massal per gelombang pendaftaran dan dapat dikelompokkan berdasarkan **Batch / Kloter**.
- **Aturan Cutoff H-1:** Pendaftaran slot jadwal suatu batch ditutup 24 jam sebelum ujian pertama di batch tersebut dimulai. Calon santri yang dokumennya baru disetujui setelah cutoff otomatis masuk ke batch berikutnya.
- **Konsolidasi Notifikasi:** Jadwal ujian yang berlangsung pada tanggal yang sama dikonsolidasikan dalam 1 pesan WhatsApp terpadu.
- **Pengingat Terjadwal Otomatis:** Sistem mengirimkan pengingat otomatis ke WhatsApp pendaftar pada H-2, H-1, dan 1 jam sebelum ujian dimulai via BullMQ queue.
- Mode pelaksanaan fleksibel:
  - `offline`: Dilaksanakan di Lab Komputer Pesantren (Kampus PTDARRAHMAN).
  - `online`: Dilaksanakan secara virtual jarak jauh via video conference (Zoom / Google Meet).
- Setiap jadwal memiliki **PIN Sesi / Token Akses** unik (misal: `AKAD-8921`) yang wajib dimasukkan peserta untuk memulai ujian.

### 3. Ruang Ujian CBT & Perlindungan Integritas (Anti-Cheating)
- **Gerbang Autentikasi:** Peserta mengakses ruang ujian melalui verifikasi kredensial ganda (kata sandi akun pendaftar + PIN sesi ujian).
- **Autosave Real-Time:** Setiap klik pemilihan jawaban langsung tersimpan seketika di database (`ppdb_exam_answers`) untuk mencegah kehilangan data akibat kendala koneksi.
- **Anti-Cheating Monitor:** Sistem mendeteksi perpindahan tab atau jendela browser ke luar layar ujian lebih dari 5 detik. Pelanggaran dicatat dalam `ppdb_exam_attempts` (`violations_count`). Jika melebihi ambang batas, status pengerjaan pendaftar otomatis terkunci (`locked`).
- **Live Monitoring Panitia:** Pengawas ujian memantau progres seluruh peserta secara real-time dari halaman `/admin/monitoring/:category/:scheduleId`. Pengawas berwenang membuka kembali status ujian peserta yang terkunci via tombol **Unfreeze Peserta**.
- **Auto-Submit & Auto-Grading:** Saat durasi timer habis, sistem otomatis menutup ujian, mengunci jawaban, dan menghitung skor akhir pendaftar.

### 4. Sesi 1:1 Tahfidz & Wawancara (Santri dan Orang Tua/Wali)
- **Sesi 1:1 Tahfidz:** Evaluasi tartil, tahsin, dan kemampuan hafalan Al-Qur'an bersama asatidz penguji dengan lembar rubrik berbobot resmi.
- **Sesi 1:1 Wawancara Calon Santri:** Menggali motivasi, kemandirian, adab, dan kesiapan tinggal di asrama pesantren.
- **Sesi 1:1 Wawancara Orang Tua/Wali:** Wawancara komitmen pengasuhan, keselarasan visi pendidikan Islam, dan dukungan wali santri.
- Format workspace penilaian evaluator: Layar kerja dua kolom dengan formulir rubrik terbobot di kolom kiri dan dossier lengkap santri di kolom kanan.

---

## Integrasi Payment Gateway Pakasir API v2 & Penyelesaian Pendaftaran

Sistem PPDB mengintegrasikan gerbang pembayaran resmi **Pakasir API v2** untuk pembayaran formulir pendaftaran santri baru:

1. **Biaya Formulir:**
   - Setelah registrasi, sistem membuat tagihan formulir.
   - Pendaftar melakukan pembayaran via QRIS dinamis (`POST /payment/create-qris`).
   - Webhook Pakasir (`POST /payment/webhook` / `POST /payment/webhook/pak-kasir`) memvalidasi pembayaran secara atomik & idempoten menggunakan header `X-Secret`.
   - Setelah lunas, kuitansi resmi terbit (`GET /payment/receipt/{id}` dan link publik `/kuitansi/:id`).
2. **Kelulusan & Penandatanganan LoA (Tahap Akhir):**
   - Pendaftar yang dinyatakan lulus oleh panitia dapat melihat hasil seleksi di `/applicant/pengumuman`.
   - Pendaftar dan orang tua membubuhkan tanda tangan digital pada Letter of Acceptance (LoA) (`POST /ppdb/applicants/me/sign-loa`).
   - **Alur PPDB selesai pada penandatanganan LoA.** Begitu LoA ditandatangani, data formulir terkunci permanen (`is_locked = true`) dan status calon santri resmi diterima.
   - LoA resmi dapat diverifikasi publik di `/loa/:registrationNo`.
   - Sistem menampilkan tautan eksklusif untuk bergabung ke **Grup WhatsApp Resmi Santri Baru**.
4. **Biaya Pendidikan (Biaya Masuk) & Penyetoran di Luar Aplikasi:**
   - Biaya pendidikan tetap dihitung secara transparan di dalam sistem sebagai informasi resmi pada LoA santri.
   - Penyetoran dana dilakukan **di luar aplikasi** (transfer rekening resmi PTDARRAHMAN / tunai di kantor bendahara pesantren). Di dalam portal PPDB pendaftar tidak ada tombol pembayaran QRIS untuk biaya masuk, dan alur pendaftaran tuntas pada penandatanganan LoA.

---

## Standardisasi Dokumen Resmi & Ekspor Cetak

Untuk menjaga integritas arsip dan tampilan dokumen institusi, sistem menerapkan standardisasi layout cetak A4 baku (`apps/ppdb/src/utils/export*`):
- **Formulir Pendaftaran (`exportApplicantForm`):** Rekapitulasi komprehensif data santri, keluarga, domisili, dan identifikasi kesehatan berstempel digital pesantren.
- **Lembar Penilaian Seleksi (`exportAssessment` / `OfficialAssessmentSheet`):** Lembar penilaian evaluator berisi kriteria tartil/tahfidz dan wawancara berbobot.
- **Kuitansi Resmi (`exportReceipt` / `OfficialReceiptCard`):** Bukti pembayaran berstempel digital dilengkapi kode QR bertoken HMAC yang dapat diverifikasi publik tanpa login (`/kuitansi/:id`).
- **Surat Penerimaan / LoA (`exportLoa` / `LoaOfficialDocument`):** Surat resmi penerimaan calon santri dengan klausul *non-refundable*, tanda tangan digital/basah wali, dan tautan verifikasi keabsahan (`/loa/:registrationNo`).

---

## Arsip dan Pencarian Dossier Pendaftar

- Pencarian lintas periode dan gelombang berada di **halaman khusus Arsip/Cari Pendaftar (`/admin/arsip`)**. Tidak ditambahkan ke tabel operasional lain.
- Mendukung unduhan berkas perorangan dan paket bundle ZIP satu-klik (`GET /ppdb/archive/applicants/{id}/dossier/zip`).
- Akses dossier dibatasi dengan izin khusus dan seluruh aktivitas unduhan dicatat dalam `audit_log` bersama alamat IP admin pemohon.

---

## Validasi dan Pengecualian Wajib

- **Konfigurasi/publikasi:** Cegah pembukaan pendaftaran jika tidak ada periode aktif, gelombang aktif, tanggal di luar rentang, atau kuota habis.
- **Pendaftaran/pembayaran:** Validasi ulang status periode, gelombang, tanggal, dan kuota di server saat pendaftaran dan pembayaran. Reservasi slot dan kalkulasi kuota dijalankan atomik.
- **Kuota tercapai:** Tutup gelombang dan pendaftaran satu kali, batalkan seluruh tagihan formulir pending, kirim notifikasi, dan hentikan pengingat Senin.
- **Pengecualian Pembayaran Terlambat:** Jika webhook sukses datang setelah tagihan dibatalkan karena kuota penuh, tandai transaksi sebagai pengecualian (`late_payment_exception`) untuk pemeriksaan manual adminâ€”jangan otomatis memindahkan pendaftar atau menghapus saldo.
- **Formulir kesehatan:** Server memvalidasi kelengkapan jawaban (pertanyaan Ya/Tidak wajib ada keterangan jika "Ya", kontak darurat valid, pernyataan disetujui).
- **Dossier/unduhan:** Periksa izin khusus di server untuk melihat dan mengunduh data sensitif; audit unduhan ZIP maupun berkas perorangan.

---

## Status Keputusan Bisnis

### Keputusan yang Sudah Terselesaikan (*Resolved* di Kode):
- âœ… **Pembayaran Terlambat:** Ditandai sebagai pengecualian pemeriksaan admin (`late_payment_exception`), tidak dipindahkan otomatis.
- âœ… **Izin Dossier & Audit:** Dibatasi untuk admin berizin (`require_ppdb_admin`), dengan pencatatan jejak audit alamat IP pada setiap ekspor ZIP.
- âœ… **Kuesioner Kesehatan:** 10 pertanyaan baku wajib tervalidasi lengkap di server saat pendaftaran.
- âœ… **Pembaruan Mandiri Profil & Kesehatan Santri:** Santri/wali dapat meninjau dan memperbarui data formulir pendaftaran serta identifikasi kesehatan secara mandiri di `/applicant/profile` (`PUT /ppdb/applicants/me`). Pembaruan dibatasi hanya selama proses seleksi berlangsung, dan otomatis dikunci permanen (`is_locked`) sesaat setelah santri dinyatakan lulus dan LoA resmi ditandatangani.

### Keputusan yang Masih Terbuka (Menunggu Kebijakan Yayasan):
- Berapa lama masa retensi berkas dan riwayat data kesehatan pendaftar yang tidak diterima?
- Apakah pencantuman jenjang pendidikan institusi pada template cetak dokumen perlu dikonfigurasi melalui backoffice tersendiri atau cukup satu konfigurasi statis institusi?

---

## Integrasi Eksternal

Sistem PPDB terhubung ke beberapa layanan eksternal berikut:

### Pakasir API v2 â€” Payment Gateway
- Menyediakan QRIS dinamis per transaksi untuk pembayaran formulir.
- Webhook diterima di `POST /payment/webhook` dan `POST /payment/webhook/pak-kasir`, divalidasi menggunakan header `X-Secret`, pencocokan nominal, serta pengecekan idempoten untuk mencegah duplikasi saldo.
- Kuitansi resmi bertanda tangan HMAC token dapat diverifikasi publik di `/kuitansi/:id` tanpa login.
- Implementasi: `apps/api/src/core/pakasir.py` & `apps/api/src/services/payment_service.py`.

### Cloudinary â€” Penyimpanan File & Gambar
- Digunakan untuk upload file dan gambar melalui `POST /companyprofile/upload`.
- Mencakup foto avatar, gambar berita, konten Company Profile, dan aset institusi lainnya.

### WhatsApp Web.js â€” Notifikasi WhatsApp
- Microservice Node.js menggunakan `whatsapp-web.js` + Chromium, dikelola dengan antrian BullMQ via Redis.
- Mengirimkan notifikasi untuk event: konfirmasi pembayaran formulir, konfirmasi booking sesi, undangan grup WA, dan pemberitahuan kelulusan.
- Referensi template: `docs/notifikasi-code-1790904241894.md`.

---

## Aturan Desain UI/UX

Konvensi tampilan dan pengalaman pengguna yang wajib diikuti di semua aplikasi frontend:

- **Dynamic Branding:** Logo, favicon, dan nama institusi diambil secara dinamis dari API melalui `settingsService.getLogo()`. Tidak diperbolehkan melakukan hardcode path atau URL logo statis di kode sumber.
- **Tidak Ada Pilihan Jenjang:** Tidak ada field, dropdown, atau label jenjang pendidikan di formulir pendaftaran, dashboard pendaftar, konfigurasi gelombang, maupun halaman publik.
- **Pagination:** Semua tabel operasional yang menampilkan daftar data menggunakan pagination server-side. Tidak diperbolehkan memuat seluruh data sekaligus tanpa pagination.
- **Responsive Layout:** Semua halaman wajib responsif dan dapat digunakan dengan baik pada layar mobile maupun desktop. Tap target minimal 44Ã—44px untuk elemen interaktif.
- **Tampilan Data Orang Tua/Wali:** Data ayah, ibu, dan wali wajib ditampilkan secara lengkap di seluruh dashboard operasional (Admin, Superadmin, dan profil Pendaftar). Tidak boleh direduksi menjadi satu baris `parent_name`.
- **Print Engine A4:** Dokumen resmi dirender dalam format A4 baku di browser menggunakan iframe print. Tidak diperbolehkan mengubah ukuran atau margin cetak dokumen resmi tanpa keputusan tim teknis.

---

## Aturan Keamanan

Seluruh fitur yang berkaitan dengan data sensitif, dokumen resmi, dan autentikasi wajib mematuhi ketentuan berikut:

- **HMAC Token pada Kuitansi:** Setiap kuitansi resmi yang diterbitkan ditandatangani secara digital menggunakan HMAC token. Token ini dapat diverifikasi publik tanpa login di `/kuitansi/:id` dan `/receipt/:id` untuk membuktikan keaslian dokumen.
- **Audit Log Akses Dossier:** Seluruh aktivitas melihat dan mengunduh dossier pendaftarâ€”termasuk unduhan per berkas maupun paket ZIPâ€”dicatat dalam tabel `audit_log` bersama alamat IP admin pemohon. Akses dossier dibatasi dengan izin khusus (`require_ppdb_admin`).
- **Validasi X-Secret Webhook:** Webhook eksternal (Pakasir payment) divalidasi menggunakan header secret yang ditetapkan di konfigurasi server. Request tanpa header yang valid atau dengan nominal tidak cocok langsung ditolak.
- **Data Kesehatan Sensitif:** Identifikasi kesehatan pendaftar hanya dapat dibuka oleh admin berizin pada halaman detail/dossier. Akses dicatat dalam audit log. Data tidak ditampilkan di tabel operasional umum.
- **HTTP-only Cookie JWT:** Token autentikasi disimpan di HTTP-only Cookie untuk mencegah akses dari JavaScript sisi klien (mitigasi serangan XSS). Auto-refresh token dilakukan tanpa interaksi pengguna saat token kedaluwarsa (response 401).
- **Manajemen Sesi Multi-Perangkat:** Seluruh sesi login aktif dipantau dan dapat dicabut dari jarak jauh oleh pemilik akun melalui `/applicant/profile` atau panel admin. Revoke sesi mencegah akses tidak sah dari perangkat yang hilang atau dicuri.
- **Credentials di `.env`:** Semua kredensial, API key, dan secret disimpan di file `.env` lokal masing-masing aplikasi dan tidak boleh di-commit ke Git.
