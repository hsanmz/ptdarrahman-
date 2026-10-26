# DOKUMENTASI SISTEM NOTIFIKASI WHATSAPP PPDB

**Versi:** Acuan terbaru kebutuhan PPDB
**Modul:** Notifikasi WhatsApp

Semua notifikasi kepada pendaftar dikirim melalui WhatsApp; email tidak digunakan. Pengingat otomatis hanya dikirim kepada pendaftar yang masih memenuhi syarat.

**Status kode saat ini:** Pemicu PPDB memakai template WhatsApp dan antrean Redis BullMQ. Scheduler API menjalankan pengingat pembayaran formulir setiap Senin pukul 08.00 WIB, pengingat dokumen H+3 setiap hari pukul 08.00 WIB, serta pengingat jadwal ujian pada H-2, H-1, dan sekitar 1 jam sebelum mulai. Panel notifikasi hanya menggunakan kanal WhatsApp. Alur pendaftar tuntas pada penandatanganan digital LoA; biaya pendidikan disetor di luar aplikasi melalui Rekening Resmi PTDARRAHMAN atau kantor bendahara pesantren.

**Perbedaan notifikasi pembayaran:** `wave_closed_pending_payment` dikirim ketika gelombang ditutup dan tagihan pending dibatalkan bersama-sama. `payment_expired` dikirim ketika batas waktu bayar seorang pendaftar lewat; akunnya dinonaktifkan dan pendaftar diberi arahan untuk mendaftar kembali jika gelombang baru tersedia.

**Pengingat H+3:** dikirim tiga hari setelah pembayaran formulir berhasil, hanya jika pendaftar belum submit satu dokumen pun. Pendaftar yang sudah submit minimal satu dokumen tidak menerima pengingat ini.


---

## PERUBAHAN AKUN

*   **Akun dibuat oleh admin/Superadmin:** kredensial dikirim ke akun pengguna yang baru dibuat, bukan ke pembuat akun.
*   **Username, email, atau nomor telepon berubah:** konfirmasi dikirim ke pemilik akun, baik perubahan dilakukan sendiri maupun oleh admin.
*   **Pemilik akun mengganti password:** konfirmasi dikirim tanpa menyertakan password.
*   **Password direset admin:** kredensial baru dikirim ke pemilik akun.
*   **Pemulihan akun pendaftar:** password sementara dikirim melalui pesan WhatsApp pemulihan.

## FASE 1: PENDAFTARAN AWAL & FORMULIR

### 1. Pendaftaran Akun Berhasil
*   **Trigger:** Pendaftar klik submit pada form pendaftaran awal.
*   **Template Pesan:**
> ðŸ“¢ **Pendaftaran Akun Berhasil!**
>
> Assalamuâ€™alaikum / Halo *[Nama Pendaftar]*,
> Terima kasih telah mendaftar di *[Nama Sekolah/Pesantren]*. Akun PPDB Anda telah berhasil dibuat.
>
> Berikut adalah detail akses Anda:
> ðŸ‘¤ Username: *[Username]*
> ðŸ”‘ Password: *[Password]*
> ðŸŒ Link Login: *[Link URL Aplikasi]*
>
> âš ï¸ *Penting:*
> Langkah Anda selanjutnya adalah melakukan **Pembayaran Biaya Formulir**. Harap segera login ke sistem untuk melihat tagihan Anda. Batas akhir pembayaran formulir adalah sampai gelombang pendaftaran ditutup pada *[Tanggal Tutup Gelombang]*.

### 2. Pembayaran Formulir Berhasil
*   **Trigger:** Webhook Pak Kasir mendeteksi pembayaran formulir lunas.
*   **Template Pesan:**
> âœ… **Pembayaran Formulir Berhasil!**
>
> Halo *[Nama Pendaftar]*,
> Pembayaran formulir pendaftaran Anda telah kami terima. Terima kasih!
>
> ðŸ“ *Langkah Selanjutnya:*
> Silakan submit dokumen melalui dashboard agar dapat ditinjau panitia: *[Link URL Aplikasi]*.
>
> Silakan login dan lengkapi dokumen Anda di sini: *[Link URL Aplikasi]*

### 3. Penutupan Gelombang (Pembayaran Formulir Expired)
*   **Event key:** `wave_closed_pending_payment`
*   **Trigger:** Gelombang ditutup karena tanggal berakhir atau kuota tercapai; tagihan formulir yang masih pending dibatalkan.
*   **Template Pesan:**
> âŒ **Masa Pembayaran Formulir Telah Berakhir**
>
> Halo *[Nama Pendaftar]*,
> Mohon maaf, masa pembayaran formulir untuk Gelombang *[Nama Gelombang]* telah resmi ditutup dan tagihan Anda otomatis dibatalkan.
>
> Anda boleh mendaftar lagi pada gelombang berikutnya jika tersedia, tetapi tidak wajib. Silakan cek informasi pendaftaran di *[Link URL Aplikasi]*. Terima kasih.

### 4. Pengingat Pembayaran Formulir Setiap Senin
*   **Event key:** `payment_reminder_monday`
*   **Trigger:** Setiap hari Senin untuk pendaftar yang belum membayar, selama gelombang masih terbuka dan tagihan belum dibatalkan.
*   **Berhenti jika:** Pembayaran formulir berhasil, gelombang ditutup, atau tagihan dibatalkan.
*   **Template Pesan:**
> ðŸ”” **PENGINGAT PEMBAYARAN FORMULIR**
>
> Halo *[Nama Pendaftar]*, pembayaran formulir Anda masih belum kami terima. Silakan lanjutkan pembayaran sebelum gelombang *[Nama Gelombang]* ditutup pada *[Tanggal Tutup]*.
>
> Lanjutkan pendaftaran: *[Link Pembayaran/Aplikasi]*
>
> Abaikan pesan ini jika Anda sudah membayar.

---

## FASE 2: VERIFIKASI DOKUMEN

### Dokumen Dikirim untuk Verifikasi
*   **Trigger:** Pendaftar menekan submit dokumen untuk dikirim ke panitia.
*   **Template Pesan:**
> ðŸ“© **DOKUMEN BERHASIL DIKIRIM**
>
> Halo *[Nama Pendaftar]*, dokumen Anda sudah dikirim untuk ditinjau panitia. Pantau status dan informasi revisi melalui dashboard: *[Link Dashboard]*.

### 5. Dokumen Ditolak (Revisi)
*   **Trigger:** Admin Verifikator menekan tombol "Reject Dokumen".
*   **Template Pesan:**
> âš ï¸ **Pemberitahuan Revisi Dokumen PPDB**
>
> Halo *[Nama Pendaftar]*,
> Tim kami telah memeriksa dokumen yang Anda unggah. Mohon maaf, dokumen Anda belum dapat divalidasi karena alasan berikut:
>
> âŒ *[Catatan Admin / Alasan Penolakan]*
>
> ðŸ”„ *Langkah Selanjutnya:*
> Agar dapat melanjutkan ke tahap Ujian, silakan login ke *[Link URL Aplikasi]* dan unggah ulang dokumen perbaikan sesegera mungkin.

### 6. Dokumen Disetujui (Approved)
*   **Event key:** `document_approved`
*   **Trigger:** Admin verifikator menyetujui dokumen yang telah ditinjau.
*   **Template Pesan:**
> âœ… **Dokumen Disetujui!**
>
> Halo *[Nama Pendaftar]*,
> Alhamdulillah, seluruh dokumen persyaratan Anda telah *valid dan disetujui*.
>
> ðŸ“… *Langkah Selanjutnya:*
> Jadwal seleksi ditetapkan oleh panitia dan akan dikirim melalui WhatsApp serta dashboard. Pendaftar tidak perlu memilih jadwal sendiri. Silakan pantau dashboard: *[Link URL Aplikasi]*.

---

## FASE 3: UJIAN & WAWANCARA

### 8. Jadwal Seleksi Ditetapkan atau Diubah
*   **Trigger:** Jadwal ditetapkan panitia, tahap seleksi berikutnya dijadwalkan, atau admin mengubah jadwal/waktu/lokasi.
*   **Template Pesan:**
> ðŸ“… **JADWAL SELEKSI DITETAPKAN / DIPERBARUI**
>
> Halo *[Nama Pendaftar]*, jadwal *[Nama Tahap/Ujian]* Anda telah ditetapkan atau diperbarui.
>
> ðŸ“† Tanggal: *[Tanggal]*
> â° Waktu: *[Jam Mulai - Jam Selesai]*
> ðŸ“ Lokasi/Link: *[Detail Lokasi atau Link Zoom]*
>
> Jadwal ditetapkan oleh panitia; Anda tidak perlu memilih sesi. Harap hadir/bergabung 15 menit lebih awal. Detail tersedia di *[Link Dashboard]*.

### 9. Tahap Penilaian Selesai
*   **Trigger:** Pendaftar menyelesaikan CBT Akademik/Psikologi atau evaluator menyimpan penilaian Tahfidz/Wawancara.
*   **Template Pesan:**
> âœ… **TAHAP PENILAIAN SELESAI**
>
> Halo *[Nama Pendaftar]*, tahap *[Nama Tahap]* telah selesai dan dicatat. Pantau dashboard untuk informasi jadwal tahap berikutnya atau hasil pendaftaran: *[Link Dashboard]*. Nilai tidak dicantumkan di pesan.

Tahap selesai mencakup semua ujian dan penilaian yang aktif: Akademik, Psikologi, Tahfidz, dan Wawancara.

---

## FASE 4: KELULUSAN & PENANDATANGANAN LoA (TAHAP AKHIR)

### 10. Hasil Pendaftaran: LULUS
*   **Trigger:** Admin menetapkan hasil pendaftaran LULUS.
*   **Template Pesan:**
> ðŸŽ‰ **HASIL PENDAFTARAN: LULUS**
>
> Selamat *[Nama Pendaftar]*, hasil pendaftaran Anda di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman adalah **LULUS**.
>
> Surat Keterangan Penerimaan / *Letter of Acceptance (LoA)* Anda sudah diterbitkan dan dapat ditinjau di dashboard pendaftaran: *[Link URL Aplikasi]*.
>
> âœï¸ *Langkah Penyelesaian Alur PPDB (Wajib):*
> Silakan login ke dashboard dan bubuhkan **Tanda Tangan Digital** orang tua/wali pada dokumen LoA. Begitu LoA ditandatangani, data pendaftaran Anda resmi terkunci permanen (*is_locked = true*) dan alur pendaftaran PPDB Anda selesai tuntas.
>
> ðŸ“± *Grup WhatsApp Resmi Calon Santri & Wali Santri:*
> Bergabunglah ke grup koordinasi resmi angkatan di tautan berikut:
> *[Link Group WhatsApp]*
>
> ðŸ’³ *Informasi Biaya Pendidikan:*
> Rincian resmi biaya pendidikan tercantum lengkap pada lembar LoA Anda. Penyetoran dana pendidikan dilakukan **di luar aplikasi** (transfer ke Rekening Resmi PTDARRAHMAN atau tunai di kantor bendahara pesantren).

### 11. Hasil Pendaftaran: TIDAK LULUS
*   **Trigger:** Admin menetapkan hasil pendaftaran TIDAK LULUS.
*   **Template Pesan:**
> ðŸ“¢ **HASIL PENDAFTARAN: TIDAK LULUS**
>
> Halo *[Nama Pendaftar]*,
> Terima kasih telah mengikuti seluruh tahapan penilaian PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
>
> Dengan berat hati kami sampaikan bahwa hasil pendaftaran Anda saat ini **TIDAK LULUS**.
>
> Jangan berkecil hati, tetap semangat belajar dan semoga Anda mendapatkan tempat pendidikan yang terbaik. Terima kasih.

### 12. LoA Ditandatangani — Alur PPDB Selesai
* **Event key:** `loa_signed`
* **Trigger:** Orang tua/wali menyelesaikan penandatanganan digital LoA di aplikasi.
* **Template Pesan:** LoA telah ditandatangani dan alur PPDB telah selesai; pendaftar diminta menyimpan LoA dari dashboard.

---

## FASE 5: PENGINGAT TAHAPAN LANJUTAN

Fitur ini berjalan otomatis di latar belakang untuk menekan angka pendaftar yang mandek di tengah proses.

### 1. Pengingat Submit Dokumen (H+3)
*   **Trigger:** 3 hari setelah pembayaran formulir berhasil, jika pendaftar belum submit dokumen apa pun.
*   **Template Pesan:**
> 🔔 **PENGINGAT SUBMIT DOKUMEN**
> Halo *[Nama Pendaftar]*, pembayaran formulir Anda telah berhasil, tetapi Anda belum submit dokumen apa pun. Silakan submit dokumen melalui dashboard: *[Link URL Aplikasi]*.

### 2. Pengingat Jadwal Seleksi (H-2, H-1, dan 1 Jam Sebelum)
*   **Trigger:** Dikirim otomatis 1 jam sebelum sesi seleksi 1:1 (Tahfidz / Wawancara) dimulai.
*   **Template Pesan:**
> ðŸ”” **PENGINGAT SESI SELEKSI (1 JAM LAGI)**
>
> Halo *[Nama Pendaftar]*,
> Mengingatkan kembali bahwa Sesi Seleksi *[Tahfidz/Wawancara]* Anda akan dimulai dalam waktu **1 jam lagi** pada pukul *[Waktu]*.
>
> ðŸ“ **Detail Lokasi / Tautan Zoom:** *[Detail Lokasi atau Link Zoom]*
>
> Harap hadir / bergabung 15 menit sebelum sesi dimulai. Semoga sukses!
