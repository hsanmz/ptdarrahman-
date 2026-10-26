import * as React from 'react'
import {
  BookOpen,
  Clock,
  Sparkles,
  ShieldAlert,
  BellRing,
  HelpCircle,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  CreditCard,
  Award,
  CalendarDays,
  FileCheck,
  Settings,
  Archive,
  Layers,
  GraduationCap,
  Shield,
  Activity,
  KeyRound,
  QrCode,
  Smartphone,
  RefreshCw,
  X,
} from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
import { Button } from './button'
import { Badge } from './badge'
import { cn } from '../../lib/utils'

export interface DocSection {
  number: number
  title: string
  icon?: React.ComponentType<{ className?: string }>
  content: React.ReactNode
}

export interface DocItem {
  title: string
  subtitle: string
  sections: DocSection[]
  contactNote?: string
}

export const SYSTEM_DOCS: Record<string, DocItem> = {
  // ── PPDB ADMIN DOCS ──────────────────────────────────────────────────────────
  'ppdb-dashboard': {
    title: 'Dashboard Operasional PPDB',
    subtitle: 'Petunjuk navigasi metrik utama, pemantauan gelombang aktif, dan aksi cepat.',
    sections: [
      {
        number: 1,
        title: 'Apa itu Dashboard Admin?',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman <strong>Dashboard Admin</strong> menyajikan ringkasan metrik operasional Penerimaan Peserta Didik Baru (PPDB) pada periode dan gelombang yang aktif. Anda dapat memantau jumlah pendaftar, status pembayaran formulir, berkas yang perlu diverifikasi, serta progres ujian seleksi dan kelulusan.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Aturan 1 Periode & 1 Gelombang Aktif',
        icon: Activity,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Sistem menerapkan prinsip <strong>Single Active Period & Wave</strong>. Hanya satu periode dan satu gelombang pendaftaran yang aktif secara global.
            </p>
            <p>
              Seluruh pendaftar baru yang mendaftar secara otomatis ditautkan ke gelombang aktif tanpa perlu memilih secara manual.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Kartu Sesi 1:1 Milik Anda',
        icon: Clock,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Pada bagian bawah dashboard, terdapat ringkasan kartu sesi 1:1 (Tahfidz/Wawancara) yang dibuat oleh akun Anda.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Merah:</strong> Sesi belum diambil oleh pendaftar.</li>
              <li><strong>Kuning:</strong> Sesi telah di-booking santri dan siap dinilai (klik untuk input nilai).</li>
              <li><strong>Hijau:</strong> Sesi telah selesai dinilai.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Alur Cepat Operasional Panitia',
        icon: Layers,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <li><strong>Verifikasi Dokumen:</strong> Periksa berkas dan kuesioner kesehatan pendaftar yang telah melunasi formulir.</li>
            <li><strong>Sesi 1:1:</strong> Siapkan slot jadwal Tahfidz dan Wawancara untuk santri yang berkasnya valid.</li>
            <li><strong>Hasil Seleksi:</strong> Tetapkan kelulusan dan rilis LoA resmi.</li>
            <li><strong>Review LoA:</strong> Pantau tanda tangan digital orang tua & santri hingga alur PPDB tuntas.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-data-pendaftar': {
    title: 'Data Pendaftar PPDB',
    subtitle: 'Petunjuk operasional pemantauan dan pengelolaan biodata calon santri.',
    sections: [
      {
        number: 1,
        title: 'Apa itu Halaman Data Pendaftar?',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman <strong>Data Pendaftar</strong> menyajikan seluruh data pendaftar pada gelombang dan periode aktif. Admin dapat memantau progres calon santri mulai dari pengisian biodata, kelengkapan berkas, data orang tua/wali lengkap (Ayah, Ibu, Wali), domisili, hingga kuesioner kesehatan.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Memahami Status Pendaftar',
        icon: Clock,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Terdaftar / Menunggu Bayar
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Akun baru dibuat dan formulir telah diisi, menunggu pembayaran biaya registrasi/formulir diselesaikan oleh calon santri.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Dokumen Menunggu Review
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Biaya formulir telah lunas dan pendaftar telah mengunggah berkas persyaratan. Siap diverifikasi oleh panitia di menu <strong>Verifikasi Dokumen</strong>.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Tahap Seleksi
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Dokumen dinyatakan lengkap dan disetujui. Santri berhak memilih jadwal Session 1:1 Tahfidz serta Wawancara.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <Badge variant="success" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Lulus / Diterima
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Telah menyelesaikan seluruh rangkaian tes dan dinyatakan lulus seleksi oleh penguji/panitia. Santri dapat mengunduh serta menandatangani LoA digital resmi untuk menyelesaikan alur PPDB.
              </p>
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Aturan Gelombang & Lingkup Data',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-900">🔒 Hanya Menampilkan Gelombang Aktif:</p>
            <p>
              Data pendaftar pada halaman ini dibatasi secara ketat hanya untuk gelombang yang sedang aktif saat ini. Jika Anda ingin melihat atau menelusuri data santri pada periode atau gelombang lampau, buka menu <strong>Arsip Pendaftar</strong>.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Melihat Detail Profil & Formulir Kesehatan',
        icon: FileText,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Gunakan kolom pencarian di toolbar untuk mencari santri berdasarkan <strong>Nama, Nomor Registrasi, atau NISN</strong>.</li>
            <li>Klik tombol <strong>Detail / Profil</strong> pada baris santri yang dituju.</li>
            <li>Modal akan menampilkan biodata komprehensif: data siswa, data orang tua (Ayah, Ibu, Wali) secara lengkap, riwayat pendidikan, berkas terunggah, serta <strong>Identifikasi Kesehatan</strong> (riwayat penyakit, alergi, dan kontak darurat).</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-verifikasi-dokumen': {
    title: 'Verifikasi Dokumen Persyaratan',
    subtitle: 'Panduan pengecekan dan validasi keabsahan berkas pendaftaran calon santri.',
    sections: [
      {
        number: 1,
        title: 'Tujuan Menu Verifikasi Dokumen',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Fitur ini digunakan oleh panitia administrasi untuk memvalidasi berkas wajib seperti <strong>Kartu Keluarga, Akta Kelahiran, Rapor/Ijazah, Pasfoto</strong>, dan surat pendukung lainnya yang diunggah oleh calon santri setelah membayar formulir.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Keputusan Verifikasi: Setujui vs Tolak',
        icon: FileCheck,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-900">Setujui Dokumen (Valid)</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Jika semua berkas terbaca jelas, asli/legalisir sah, dan sesuai data biodata pendaftar. Santri akan otomatis dipindahkan ke status <strong>Tahap Seleksi</strong>.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-900">Tolak Dokumen (Wajib Beri Catatan)</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Jika dokumen buram, terpotong, atau salah berkas. Admin <strong>wajib mengisi catatan penolakan</strong> agar pendaftar mengetahui dokumen mana yang perlu diunggah ulang.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Notifikasi Otomatis ke WhatsApp Pendaftar',
        icon: BellRing,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Setiap kali admin menekan tombol <strong>Setujui</strong> atau <strong>Tolak</strong>, sistem secara instan mengirim notifikasi WhatsApp otomatis ke nomor pendaftar/orang tua mengabarkan status verifikasi dan instruksi selanjutnya.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Langkah Verifikasi Dokumen',
        icon: FileText,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Pilih pendaftar dengan status <strong>Menunggu Review</strong> pada daftar.</li>
            <li>Klik pratinjau dokumen untuk memeriksa file gambar atau PDF dalam resolusi penuh.</li>
            <li>Periksa kecocokan nama, tanggal lahir, dan NIK pada Akta/KK dengan data formulir.</li>
            <li>Klik <strong>Setujui Semua</strong> jika lengkap, atau klik <strong>Tolak</strong> pada dokumen yang tidak sesuai beserta alasan spesifik.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-pembayaran-formulir': {
    title: 'Pembayaran Formulir Registrasi',
    subtitle: 'Panduan verifikasi pembayaran biaya pendaftaran PPDB.',
    sections: [
      {
        number: 1,
        title: 'Alur Pembayaran Formulir',
        icon: CreditCard,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Calon santri yang baru mendaftar wajib menyelesaikan biaya formulir pendaftaran. Pembayaran dapat diverifikasi secara manual oleh staf keuangan atau terkonfirmasi melalui bukti transfer.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Aturan Kuota & Penutupan Gelombang Otomatis',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-900">⚡ Kuota Dihitung dari Pembayaran Lunas:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              <li>Kuota gelombang dihitung dari transaksi pembayaran formulir yang <strong>berhasil (paid)</strong>, bukan dari jumlah pendaftar terbuat.</li>
              <li>Saat kuota tercapai, sistem akan <strong>otomatis menutup gelombang pendaftaran</strong>.</li>
              <li>Seluruh invoice pendaftar yang belum dibayar akan <strong>otomatis dibatalkan</strong>, dan pendaftar diarahkan mendaftar pada gelombang berikutnya.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Pengingat Pembayaran Otomatis Hari Senin',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Selama gelombang masih aktif dan belum penuh, pendaftar dengan status pembayaran pending akan menerima <strong>pengingat WhatsApp otomatis setiap hari Senin</strong> untuk segera menyelesaikan pembayaran. Pengingat dihentikan saat gelombang ditutup.
          </p>
        ),
      },
      {
        number: 4,
        title: 'Cara Konfirmasi Pembayaran Manual',
        icon: CheckCircle2,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Cek bukti transfer yang diunggah pendaftar pada tab <strong>Menunggu Konfirmasi</strong>.</li>
            <li>Cocokkan nominal dan nama rekening pengirim dengan mutasi rekening resmi PTDARRAHMAN.</li>
            <li>Klik tombol <strong>Konfirmasi Lunas</strong>. Status pendaftar akan otomatis berubah menjadi aktif dan membuka tahap upload dokumen.</li>
          </ol>
        ),
      },
    ],
  },


  'ppdb-penilaian': {
    title: 'Hasil Seleksi & Penilaian Akhir',
    subtitle: 'Panduan penetapan keputusan kelulusan dan rekap nilai ujian santri.',
    sections: [
      {
        number: 1,
        title: 'Komponen Nilai Seleksi PPDB',
        icon: Award,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              Total nilai seleksi calon santri dihitung dari dua pilar evaluasi:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <p className="font-bold text-emerald-900 text-xs">1. Session Tahfidz</p>
                <p className="text-[11px] text-emerald-800 mt-1">Diinput penguji 1:1 berdasarkan rubrik hafalan, tajwid & makhraj.</p>
              </div>
              <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
                <p className="font-bold text-purple-900 text-xs">2. Session Wawancara</p>
                <p className="text-[11px] text-purple-800 mt-1">Diinput pewawancara 1:1 berdasarkan kesiapan dan komitmen santri/wali.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Penetapan Status Kelulusan (Lulus / Tidak Lulus)',
        icon: CheckCircle2,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <Badge variant="success" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Lulus</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Santri berhak menerima Letter of Acceptance (LoA) resmi dan menandatangani dokumen LoA secara digital sebagai penetapan akhir penerimaan.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <Badge variant="destructive" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Tidak Lulus</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Santri dinyatakan belum memenuhi syarat kriteria kelulusan PPDB untuk gelombang berjalan.
              </p>
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Publikasi LoA & Notifikasi Hasil',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setelah panitia menetapkan dan menyimpan hasil kelulusan, sistem akan mengirimkan notifikasi WhatsApp hasil seleksi kepada calon santri. Santri yang lulus dapat langsung mengunduh surat kelulusan (LoA) di dashboard mereka.
          </p>
        ),
      },
    ],
  },

  'ppdb-periods': {
    title: 'Periode & Gelombang PPDB',
    subtitle: 'Aturan mutlak konfigurasi periode ajaran dan gelombang pendaftaran.',
    sections: [
      {
        number: 1,
        title: 'Aturan Emas: 1 Periode & 1 Gelombang Aktif',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-900">📌 Aturan Bisnis PPDB:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              <li><strong>Hanya 1 periode aktif</strong> di seluruh sistem secara global. Mengaktifkan suatu periode otomatis menonaktifkan periode lain.</li>
              <li><strong>Gelombang hanya boleh aktif jika periode induknya aktif</strong>. Menonaktifkan periode otomatis menonaktifkan seluruh gelombang di dalamnya.</li>
              <li><strong>Dalam 1 periode, maksimal hanya ada 1 gelombang aktif</strong>. Mengaktifkan gelombang lain otomatis menggantikan gelombang aktif sebelumnya.</li>
              <li>Pendaftar otomatis masuk ke gelombang aktif; pendaftar tidak memilih gelombang sendiri.</li>
              <li><strong>Tanpa Jenjang Pendidikan &amp; Bebas Jalur:</strong> Sistem PPDB bebas dari pilihan jenjang (SMP/SMK/dll) dan menerapkan proses pendaftaran terpadu tanpa pemisahan jalur pendaftaran.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Komponen Konfigurasi Gelombang',
        icon: Settings,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Jadwal Buka & Tutup:</strong>
              Rentang tanggal publikasi formulir pendaftaran. Pendaftaran ditolak di luar rentang tanggal ini.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Harga Formulir & Kuota:</strong>
              Biaya registrasi awal serta batas maksimal pembayaran formulir yang diterima sistem.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Diskon Pendaftar Pertama:</strong>
              Diskon early bird untuk X pendaftar pertama yang lunas bayar formulir registrasi.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Cara Menambah & Mengaktifkan Gelombang',
        icon: CalendarDays,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Pastikan Periode tahun ajaran yang bersangkutan telah aktif.</li>
            <li>Klik tombol <strong>Kelola Gelombang</strong> pada periode terkait.</li>
            <li>Klik <strong>Tambah Gelombang</strong>, isi nama gelombang, tanggal, harga formulir, kuota, dan diskon.</li>
            <li>Aktifkan sakelar gelombang untuk membuka pendaftaran secara publik.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-loa': {
    title: 'Template & Preview LoA',
    subtitle: 'Panduan konfigurasi Surat Penerimaan Resmi (LoA).',
    sections: [
      {
        number: 1,
        title: 'Apa itu LoA?',
        icon: FileText,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <strong>Letter of Acceptance (LoA)</strong> adalah surat resmi penerimaan bagi pendaftar yang dinyatakan lulus. Setelah LoA ditandatangani, alur PPDB dinyatakan selesai.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Klausul Tetap (Non-Refundable Clause)',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">🔒 Klausul Wajib:</p>
            <p>
              LoA secara permanen memuat klausul bahwa seluruh dana formulir dan biaya pendidikan yang telah disetorkan tidak dapat dikembalikan (non-refundable) dengan alasan apa pun.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Pratinjau Real-Time Sebelum Terbit',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Admin dapat menguji dan melihat tampilan preview PDF LoA dengan data dummy sebelum surat diterbitkan ke santri. Dokumen yang sudah diterbitkan kepada santri akan disimpan sebagai arsip tetap (frozen artifact).
          </p>
        ),
      },
    ],
  },

  'ppdb-rubrik': {
    title: 'Rubrik Penilaian Seleksi',
    subtitle: 'Panduan pengaturan kriteria dan bobot evaluasi Tahfidz & Wawancara.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Rubrik Penilaian',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Rubrik penilaian menentukan kriteria apa saja yang akan dinilai oleh penguji saat sesi tatap muka 1:1, beserta porsi persentase (bobot) masing-masing kriteria terhadap nilai akhir.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Kategori Penilaian',
        icon: Layers,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <strong className="text-emerald-900 block mb-0.5">1. Rubrik Tahfidz:</strong>
              Kriteria hafalan Al-Qur'an calon santri (contoh: Kelancaran Hafalan, Makharijul Huruf, Tajwid, dan Irama).
            </div>
            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
              <strong className="text-purple-900 block mb-0.5">2. Rubrik Wawancara:</strong>
              Kriteria wawancara kesiapan santri dan orang tua (contoh: Kesiapan Mondok, Motivasi Belajar, dan Komitmen Orang Tua).
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Aturan Pembobotan Kriteria',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">⚖️ Total Bobot Wajib 100%:</p>
            <p>
              Pastikan akumulasi persentase bobot seluruh kriteria dalam satu kategori rubrik bernilai tepat <strong>100%</strong> agar kalkulasi nilai terbobot otomatis bekerja akurat di lembar penilaian penguji.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-review-loa': {
    title: 'Review & Monitoring LoA Santri',
    subtitle: 'Panduan pemantauan Surat Penerimaan Resmi (LoA) dan tanda tangan digital santri serta orang tua/wali.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Menu Review LoA',
        icon: FileCheck,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Menu <strong>Review LoA</strong> menampilkan seluruh calon santri yang telah dinyatakan lulus seleksi dan diterbitkan Letter of Acceptance (LoA) resmi. Panitia dapat memantau status tanda tangan digital serta mengunduh berkas LoA sah.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Tanda Tangan Digital Santri & Wali',
        icon: CheckCircle2,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Santri bersama orang tua/wali menandatangani dokumen LoA secara digital melalui portal mandiri pendaftar sebagai pernyataan persetujuan dan komitmen resmi.
            </p>
            <p>
              Setelah LoA ditandatangani, data pendaftar terkunci permanen (<code>is_locked = true</code>) dan seluruh alur proses PPDB dinyatakan tuntas.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Akhir Alur PPDB',
        icon: Award,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Penandatanganan LoA oleh pendaftar dan orang tua/wali menandai selesainya alur PPDB.
            </p>
            <p>
              Status LoA yang sudah ditandatangani dapat dipantau pada dashboard admin PPDB.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Penyetoran Biaya Pendidikan di Luar Aplikasi',
        icon: CreditCard,
        content: (
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">ℹ️ Rincian Biaya Pendidikan:</p>
            <p>
              Rincian biaya masuk/biaya pendidikan disajikan transparan pada lembar LoA santri. Penyetoran biaya pendidikan dilakukan <strong>di luar aplikasi</strong> (transfer rekening resmi PTDARRAHMAN / tunai di kantor bendahara pesantren). Di dalam sistem PPDB tidak ada pembayaran online tahap 2.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-diskonasi': {
    title: 'Diskonasi Komponen Biaya Gelombang',
    subtitle: 'Panduan konfigurasi diskon reguler dan diskon pendaftar awal (early bird) per komponen biaya pendidikan.',
    sections: [
      {
        number: 1,
        title: 'Struktur Biaya Periode & Diskonasi Gelombang',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Master komponen biaya pendidikan (uang pangkal, SPP, seragam, dsb.) dikonfigurasi di tingkat <strong>Periode</strong>. Gelombang pendaftaran tidak membuat biaya dari nol, melainkan cukup mengatur <strong>diskonasi</strong> terhadap komponen biaya periode tersebut.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Diskon Reguler vs Diskon Pendaftar Awal (Early Bird)',
        icon: Clock,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              <strong>Diskon Reguler:</strong> Berlaku standar untuk seluruh santri yang mendaftar pada gelombang ini (dapat berupa persentase % atau nominal Rupiah).
            </p>
            <p>
              <strong>Diskon Pendaftar Awal (Early Bird):</strong> Berlaku khusus untuk sejumlah kuota pendaftar pertama yang pembayaran formulirnya berhasil terkonfirmasi.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Kalkulasi Otomatis pada LoA',
        icon: FileText,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Diskon yang dikonfigurasi akan otomatis mengurangi tagihan rincian biaya pendidikan santri pada Surat Penerimaan (LoA) resmi saat santri dinyatakan lulus seleksi.
          </p>
        ),
      },
      {
        number: 4,
        title: 'Penyetoran di Luar Aplikasi',
        icon: CreditCard,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Penyetoran dana biaya pendidikan dilakukan di luar sistem aplikasi melalui transfer manual ke rekening resmi PTDARRAHMAN atau tunai di kantor bendahara pesantren.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-session-evaluation': {
    title: 'Lembar Evaluasi Ujian 1:1',
    subtitle: 'Panduan pengisian penilaian kriteria rubrik Tahfidz/Wawancara dan tinjauan dossier santri.',
    sections: [
      {
        number: 1,
        title: 'Format Workspace Dua Kolom',
        icon: Layers,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Halaman evaluasi didesain dengan dua area independen:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Kolom Kiri:</strong> Formulir penilaian kriteria rubrik terbobot, input nilai (0-100), kalkulasi skor akhir otomatis, dan catatan penguji.</li>
              <li><strong>Kolom Kanan:</strong> Dossier lengkap pendaftar (biodata santri, orang tua/wali lengkap, identifikasi kesehatan 10 soal, dan berkas persyaratan).</li>
            </ul>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Kalkulasi Nilai Terbobot',
        icon: Award,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setiap kriteria memiliki bobot persentase (%) sesuai konfigurasi di menu Rubrik. Skor akhir terhitung otomatis secara proporsional secara real-time saat Anda menginput nilai tiap kriteria.
          </p>
        ),
      },
      {
        number: 3,
        title: 'Catatan Penguji (Evaluator Notes)',
        icon: FileText,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Catatan penguji untuk Tahfidz dan Wawancara disimpan secara terpisah dan terstruktur. Catatan ini akan menjadi rujukan utama bagi panitia saat rapat penentuan kelulusan santri di menu Penilaian Akhir.
          </p>
        ),
      },
    ],
  },

  'ppdb-bank-soal': {
    title: 'Bank Soal CBT (Akademik & Psikologi)',
    subtitle: 'Panduan penyusunan dan pengelolaan materi ujian pilihan ganda (MCQ) resmi.',
    sections: [
      {
        number: 1,
        title: 'Kategori Bank Soal Per Periode',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Bank Soal dikonfigurasi per periode ajaran untuk dua kategori utama: <strong>Seleksi Akademik</strong> (kemampuan dasar, matematika, bahasa, keislaman) dan <strong>Seleksi Psikologi</strong> (tes potensi, kecerdasan logis, dan kecocokan psikologis santri).
          </p>
        ),
      },
      {
        number: 2,
        title: 'Format Soal Pilihan Ganda (MCQ)',
        icon: FileText,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Setiap butir soal memiliki 5 pilihan jawaban (A, B, C, D, E), satu kunci jawaban resmi (<code>is_correct</code>), dan bobot poin tertentu.
            </p>
            <p>
              Total poin default adalah 100 dengan durasi pengerjaan yang dapat disesuaikan per bank soal (standar 60 menit).
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Import Massal Berkas CSV',
        icon: FileCheck,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Panitia dapat mengunduh format template CSV melalui tombol <strong>Unduh Template Soal (.csv)</strong>, mengisi butir pertanyaan dan opsi jawaban, kemudian mengunggahnya secara instan untuk membuat bank soal baru.
          </p>
        ),
      },
    ],
  },

  'ppdb-jadwal-cbt': {
    title: 'Jadwal Ujian Seleksi Massal (CBT)',
    subtitle: 'Panduan penjadwalan ujian tertulis massal per gelombang dan kloter/batch.',
    sections: [
      {
        number: 1,
        title: 'Jadwal Ujian Massal Per Gelombang',
        icon: CalendarDays,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Ujian CBT dijadwalkan secara massal untuk seluruh calon santri di gelombang aktif yang telah lolos verifikasi berkas persyaratan. Jadwal dapat dikelompokkan ke dalam <strong>Batch / Kloter</strong> tertentu.
          </p>
        ),
      },
      {
        number: 2,
        title: 'PIN Sesi / Access Token Ujian',
        icon: KeyRound,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Setiap sesi memiliki <strong>PIN Sesi / Access Token</strong> unik (contoh: <code>AKAD-8921</code>).
            </p>
            <p>
              Peserta wajib memasukkan kata sandi akun PPDB dan PIN sesi tersebut di gerbang autentikasi sebelum lembar soal dapat dibuka.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Aturan Cutoff H-1 & Reminder WhatsApp',
        icon: Clock,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Penutupan slot suatu batch berlaku otomatis <strong>24 jam (H-1)</strong> sebelum ujian batch pertama dimulai. Pendaftar yang berkasnya tervalidasi setelah batas cutoff akan dimasukkan ke batch berikutnya.
            </p>
            <p>
              Sistem secara otomatis mengirimkan notifikasi pengingat ke nomor WhatsApp calon santri pada H-2, H-1, dan 1 jam sebelum ujian berlangsung.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-cbt-monitoring': {
    title: 'Pemantauan Ujian CBT Real-Time',
    subtitle: 'Panduan pengawasan pengerjaan live peserta ujian, timer, pelanggaran, dan unfreeze.',
    sections: [
      {
        number: 1,
        title: 'Konsol Pengawasan Real-Time',
        icon: Activity,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman pemantauan menyajikan data live pengerjaan seluruh peserta pada jadwal ujian aktif: status pengerjaan (Belum Mulai, Sedang Mengerjakan, Terkunci, atau Selesai), sisa waktu, dan jumlah soal yang telah dijawab.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Deteksi Pelanggaran & Status Terkunci',
        icon: ShieldAlert,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p>
              Sistem memantau perpindahan tab browser atau fokus layar keluar dari ruang ujian lebih dari 5 detik.
            </p>
            <p>
              Setiap insiden dicatat dalam log pelanggaran. Peserta yang melebihi batas toleransi otomatis terkunci (<code>locked</code>) dan tidak dapat melanjutkan menjawab tanpa izin pengawas.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Fitur Buka Kunci (Unfreeze) Peserta',
        icon: CheckCircle2,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Pengawas berwenang membuka kunci peserta yang terkena status locked (misal akibat kendala teknis atau browser restart) melalui tombol <strong>Buka Kunci</strong> pada baris peserta terkait.
          </p>
        ),
      },
      {
        number: 4,
        title: 'Autosave & Auto-Submit Saat Timer Habis',
        icon: Clock,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setiap klik opsi jawaban peserta tersimpan secara instan di database. Saat durasi ujian berakhir, sistem secara otomatis mensubmit seluruh lembar jawaban peserta dan menghitung skor akhir seketika.
          </p>
        ),
      },
    ],
  },

  'ppdb-arsip': {
    title: 'Arsip Pendaftar & Pencarian Dossier',
    subtitle: 'Pusat pencarian berkas lengkap lintas periode dan ekspor dokumen/ZIP.',
    sections: [
      {
        number: 1,
        title: 'Tujuan Menu Arsip Pendaftar',
        icon: Archive,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Menu <strong>Arsip Pendaftar</strong> adalah satu-satunya tempat untuk melakukan <strong>pencarian data santri lintas seluruh periode dan gelombang</strong> tanpa terikat gelombang aktif operasional saat ini.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Dossier Lengkap 1 Tindakan (One-Click Dossier)',
        icon: FileText,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-900">Dossier santri mencakup seluruh riwayat pendaftaran:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Biodata diri santri dan asal sekolah.</li>
              <li>Data lengkap Orang Tua / Wali (Ayah, Ibu, Wali).</li>
              <li>Kuesioner Identifikasi Kesehatan santri.</li>
              <li>Seluruh dokumen persyaratan yang pernah diunggah & riwayat verifikasinya.</li>
              <li>Jadwal & lembar evaluasi Session 1:1 Tahfidz & Wawancara.</li>
              <li>Keputusan pendaftaran dan LoA beserta status tanda tangan.</li>
              <li>Riwayat transaksi pembayaran formulir pendaftaran.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Unduhan Dokumen & Paket ZIP Dossier',
        icon: Sparkles,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              Sistem mendukung unduhan berkas satuan serta <strong>Unduh Dossier ZIP Lengkap</strong> yang memuat rangkuman PDF biodata resmi beserta seluruh lampiran asli santri dalam folder terstruktur.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-notifications': {
    title: 'Notifikasi WhatsApp PPDB',
    subtitle: 'Panduan monitoring pengiriman pesan otomatis ke calon santri dan orang tua.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Log Notifikasi',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman ini mencatat riwayat pengiriman pesan WhatsApp otomatis kepada calon santri, orang tua/wali, serta evaluator penguji selama seluruh alur tahapan PPDB berlangsung.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Pemicu Pesan Otomatis (Triggers)',
        icon: Clock,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Kredensial Akun:</strong>
              Dikirim saat santri baru berhasil registrasi (memuat nomor pendaftaran dan info login).
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Status Pembayaran Formulir:</strong>
              Konfirmasi invoice bayar dan notifikasi lunas saat dana terverifikasi.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Pengingat Pembayaran Senin:</strong>
              Broadcast otomatis setiap Senin bagi pendaftar yang belum menyelesaikan tagihan formulir.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Booking Session 1:1:</strong>
              Konfirmasi jadwal ujian tatap muka kepada santri dan penguji pembuat jadwal.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Pengumuman & LoA Kelulusan:</strong>
              Pemberitahuan kelulusan dan penerbitan Surat Penerimaan (LoA) resmi santri.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Memahami Status Pengiriman',
        icon: CheckCircle2,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <Badge variant="success" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Terkirim</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Pesan telah berhasil disampaikan ke nomor WhatsApp penerima melalui WhatsApp Gateway.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <Badge variant="destructive" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Gagal Kirim</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Nomor penerima tidak aktif, tidak terdaftar di WhatsApp, atau koneksi gateway sedang terputus.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },

  // ── SUPERADMIN DOCS ──────────────────────────────────────────────────────────
  'superadmin-applicants': {
    title: 'Pengawasan Pendaftar Global',
    subtitle: 'Panduan kontrol dan audit data seluruh calon santri di sistem pesantren.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Menu Pendaftar Superadmin',
        icon: Users,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Menu ini memberikan pandangan helikopter (tingkat tinggi) terhadap seluruh data santri yang masuk ke sistem, lintas seluruh gelombang, status verifikasi, dan status pembayaran.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Audit & Penanganan Pengecualian',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">🔍 Kewenangan Superadmin:</p>
            <p>
              Superadmin dapat memeriksa detail teknis pendaftaran, menelusuri data mentah pendaftar, serta mengidentifikasi kasus khusus seperti transaksi pending atau anomali data pendaftaran.
            </p>
          </div>
        ),
      },
    ],
  },

  'superadmin-users': {
    title: 'Manajemen Pengguna (Users)',
    subtitle: 'Panduan pengelolaan akun staf, panitia, evaluator, dan admin sistem.',
    sections: [
      {
        number: 1,
        title: 'Pengelolaan Akun Pengguna',
        icon: Users,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman ini digunakan untuk membuat akun staf baru, mengatur peran (role), mereset kata sandi, serta mengaktifkan atau menonaktifkan akses pengguna ke sistem.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Hierarki Tipe Akun',
        icon: Shield,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
              <strong className="text-purple-900 block mb-0.5">Superadmin:</strong>
              Memiliki akses tanpa batas ke seluruh konfigurasi institusi, audit trail, server WhatsApp, dan manajemen user.
            </div>
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
              <strong className="text-blue-900 block mb-0.5">Staff / Panitia (Custom Role):</strong>
              Hak akses dibatasi sesuai izin role yang ditetapkan (Admin PPDB, Keuangan, Penguji Tahfidz, Pewawancara).
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Keamanan Akun',
        icon: KeyRound,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">🔐 Praktik Terbaik:</p>
            <p>
              Nonaktifkan status akun jika petugas telah selesai bertugas. Jangan pernah membagikan kredensial Superadmin utama kepada sembarang pihak.
            </p>
          </div>
        ),
      },
    ],
  },

  'superadmin-roles': {
    title: 'Peran & Hak Akses (RBAC)',
    subtitle: 'Panduan konfigurasi Role-Based Access Control antar modul.',
    sections: [
      {
        number: 1,
        title: 'Prinsip Role-Based Access Control',
        icon: Shield,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Sistem menggunakan matriks per-modul untuk menentukan apakah suatu peran memiliki izin <strong>Read (Melihat)</strong>, <strong>Write (Mengubah)</strong>, atau <strong>CRUD (Penuh)</strong> pada modul PPDB, Keuangan, Evaluasi, dan Pengaturan.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Membuat & Mengedit Role',
        icon: Settings,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Klik tombol <strong>Tambah Role Baru</strong> di pojok kanan atas.</li>
            <li>Beri nama peran dan deskripsi tanggung jawab pekerjaan.</li>
            <li>Centang kotak izin modul sesuai tugas staf terkait (misal: Penguji Tahfidz hanya membutuhkan akses Evaluasi).</li>
            <li>Simpan perubahan. Perubahan izin akan langsung berlaku pada sesi login berikutnya.</li>
          </ol>
        ),
      },
    ],
  },

  'superadmin-activities': {
    title: 'Audit Trail & Log Aktivitas',
    subtitle: 'Perekaman jejak audit seluruh aktivitas dan mutasi data di sistem.',
    sections: [
      {
        number: 1,
        title: 'Tujuan Perekaman Audit Trail',
        icon: Activity,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setiap aksi penting di sistem (pembuatan user, penghapusan slot jadwal, verifikasi berkas, perubahan nilai, dll.) dicatat secara permanen untuk menjamin akuntabilitas dan transparansi tata kelola institusi.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Informasi yang Dicatat',
        icon: Clock,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>Setiap entri log memuat:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Pelaku (Actor):</strong> Username dan nama staf yang melakukan aksi.</li>
              <li><strong>Aksi (Action):</strong> Jenis tindakan (CREATE, UPDATE, DELETE, VERIFY, dsb).</li>
              <li><strong>Entitas (Entity):</strong> Modul atau data yang terdampak beserta ID objek.</li>
              <li><strong>Waktu (Timestamp):</strong> Waktu presisi saat kejadian berlangsung.</li>
            </ul>
          </div>
        ),
      },
    ],
  },

  'superadmin-notifications': {
    title: 'Pusat Notifikasi Superadmin',
    subtitle: 'Pemantauan trafik notifikasi sistem dan siaran pesan global.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Menu Notifikasi',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Memantau kesehatan pengiriman pesan notifikasi sistem, tingkat keberhasilan kirim, serta riwayat kegagalan jaringan antrean pesan WhatsApp.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Penanganan Pesan Gagal',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">⚠️ Pemeriksaan Kegagalan:</p>
            <p>
              Jika terdapat lonjakan pesan berstatus "Gagal Kirim", periksa status koneksi gateway pada menu <strong>WhatsApp</strong> untuk memastikan nomor resmi pesantren tetap terhubung dan tidak ter-logout.
            </p>
          </div>
        ),
      },
    ],
  },

  'superadmin-whatsapp': {
    title: 'WhatsApp Gateway & Sesi Perangkat',
    subtitle: 'Panduan pairing, pemantauan status sesi, dan integrasi WhatsApp resmi.',
    sections: [
      {
        number: 1,
        title: 'Tentang Layanan WhatsApp Gateway',
        icon: Smartphone,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Layanan WhatsApp Gateway menghubungkan sistem informasi pesantren dengan nomor WhatsApp resmi menggunakan pustaka Baileys. Layanan ini menangani seluruh pengiriman pesan otomatis (OTP, kredensial, konfirmasi bayar, dan hasil seleksi).
          </p>
        ),
      },
      {
        number: 2,
        title: 'Cara Pairing / Scan QR Code',
        icon: QrCode,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Buka WhatsApp di ponsel resmi pesantren $\rightarrow$ Pengaturan $\rightarrow$ <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
            <li>Arahkan kamera ponsel ke QR Code yang muncul di layar dashboard ini.</li>
            <li>Setelah berhasil terhubung, status indikator akan berubah menjadi <strong>Terhubung (Connected)</strong> berwarna hijau.</li>
          </ol>
        ),
      },
      {
        number: 3,
        title: 'Restart Sesi & Penanganan Masalah',
        icon: RefreshCw,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">⚡ Tips Jika Koneksi Terputus:</p>
            <p>
              Gunakan tombol <strong>Restart Session</strong> jika status gateway tertahan pada mode reconnecting atau pesan tidak kunjung terkirim. Jika nomor ter-logout dari WhatsApp ponsel, generate ulang QR Code baru.
            </p>
          </div>
        ),
      },
    ],
  },

  // ── APPLICANT DOCS ───────────────────────────────────────────────────────────
  'applicant-dashboard': {
    title: 'Panduan Alur Pendaftaran Calon Santri',
    subtitle: 'Petunjuk lengkap menyelesaikan 4 tahapan penerimaan santri baru.',
    sections: [
      {
        number: 1,
        title: 'Tahap 1: Pembayaran Formulir',
        icon: CreditCard,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Selesaikan pembayaran biaya formulir registrasi melalui nomor rekening/metode pembayaran yang tertera. Setelah transfer selesai, sistem akan memvalidasi pembayaran Anda untuk membuka akses ke tahap pengunggahan dokumen.
            </p>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Tahap 2: Unggah Dokumen Persyaratan',
        icon: FileText,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Unggah berkas-berkas wajib seperti <strong>Kartu Keluarga, Akta Kelahiran, Rapor/Ijazah, dan Pasfoto</strong>. Pastikan file jelas terbaca (format PDF atau JPG/PNG). Panitia akan memverifikasi berkas Anda.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Tahap 3: Ujian Seleksi Session 1:1',
        icon: GraduationCap,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <strong className="text-emerald-950 block mb-0.5">Booking Jadwal Session 1:1:</strong>
              Pilih slot jadwal tes Tahfidz dan Wawancara yang tersedia sesuai kenyamanan Anda (tersedia mode Online via Zoom atau Offline di pesantren).
            </div>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Tahap 4: Pengumuman Kelulusan & Tanda Tangan LoA',
        icon: Award,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Setelah penilaian selesai, periksa hasil kelulusan di dashboard. Jika dinyatakan <strong>LULUS</strong>, unduh surat penerimaan (LoA) resmi dan lakukan tanda tangan digital bersama orang tua/wali untuk menuntaskan alur pendaftaran. Penyetoran biaya pendidikan dilakukan di luar aplikasi (transfer rekening resmi PTDARRAHMAN / tunai di bendahara pesantren).
            </p>
          </div>
        ),
      },
    ],
  },

  'applicant-documents': {
    title: 'Upload & Kirim Dokumen Persyaratan',
    subtitle: 'Panduan pengunggahan 9 berkas wajib persyaratan, batas ukuran, dan proses verifikasi panitia.',
    sections: [
      {
        number: 1,
        title: '9 Berkas Wajib Persyaratan (Seragam)',
        icon: FileText,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <strong className="text-slate-900 block mb-0.5">Dokumen Wajib Santri:</strong>
              Surat Keterangan/Bukti NISN, Kartu Keluarga (KK), Akta Kelahiran, dan Pasfoto berwarna santri.
            </div>
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <strong className="text-emerald-950 block mb-0.5">Berkas Orang Tua &amp; Akademik:</strong>
              KTP Asli Orang Tua / Wali serta 4 Rapor Terakhir (Rapor Semester 1, 2, 3, dan 4) wajib diunggah secara lengkap oleh seluruh pendaftar.
            </div>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Ketentuan Format & Batas Ukuran File',
        icon: Sparkles,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              • Format file yang didukung: <strong>JPG, JPEG, PNG, atau PDF</strong>.
            </p>
            <p>
              • Ukuran maksimal per berkas: <strong>2 MB</strong>.
            </p>
            <p>
              • Pastikan hasil scan atau foto dokumen terlihat jelas, tidak buram, tidak terpotong, dan seluruh teks serta stempel dapat terbaca dengan baik oleh panitia verifikator.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Tombol Kirim Dokumen & Verifikasi Panitia',
        icon: FileCheck,
        content: (
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 leading-relaxed space-y-1.5">
            <p>
              Setelah semua berkas berhasil diunggah, tombol <strong>Kirim</strong> akan aktif. Klik tombol tersebut untuk menyerahkan dokumen ke antrean verifikasi panitia.
            </p>
            <p>
              Setelah dikirim, status akan berubah menjadi <strong>Dokumen Menunggu Review</strong>. Anda akan menerima pemberitahuan WhatsApp begitu panitia selesai meninjau dokumen.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Revisi Dokumen Jika Status Ditolak',
        icon: RefreshCw,
        content: (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p>
              Jika berkas Anda ditolak atau memerlukan perbaikan, sistem akan menampilkan catatan penolakan dari panitia. Unggah ulang dokumen yang diminta, kemudian klik tombol <strong>Kirim</strong> kembali untuk ditinjau ulang.
            </p>
          </div>
        ),
      },
    ],
  },

  'applicant-payment': {
    title: 'Kuitansi Pembayaran Formulir PPDB',
    subtitle: 'Informasi keabsahan bukti pembayaran resmi, QR Code verifikasi, dan fitur bagikan link kuitansi.',
    sections: [
      {
        number: 1,
        title: 'Bukti Pembayaran Sah & Resmi',
        icon: CreditCard,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Kuitansi digital ini merupakan bukti sah bahwa biaya formulir pendaftaran PPDB Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman telah terbayar dan lunas di sistem keuangan kami.
            </p>
            <p>
              Kuitansi mencantumkan Nomor Transaksi, Nama Santri, Gelombang, Metode Pembayaran, Waktu Transaksi, dan Stempel Status <strong>LUNAS</strong>.
            </p>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Verifikasi Publik Melalui Kode QR',
        icon: QrCode,
        content: (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-1.5">
            <p>
              Setiap kuitansi dilengkapi kode QR otentik. Kode QR ini dapat dipindai oleh siapa pun menggunakan kamera ponsel untuk memvalidasi keaslian dokumen secara instan di halaman publik resmi pesantren.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Bagikan & Salin Tautan Kuitansi',
        icon: Smartphone,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Gunakan tombol <strong>Bagikan</strong> atau tautan WhatsApp untuk mengirimkan bukti pembayaran ini kepada keluarga, wali santri, atau panitia.
            </p>
            <p>
              Tautan publik yang dibagikan hanya menampilkan kuitansi bersih tanpa menu navigasi internal dashboard, sehingga aman dibagikan ke pihak luar.
            </p>
          </div>
        ),
      },
    ],
  },

  'applicant-tahfidz': {
    title: 'Seleksi 1:1 Tahfidz Al-Qur\'an',
    subtitle: 'Panduan pemilihan slot penguji, aspek penilaian tartil & hafalan, serta tata tertib pelaksanaan.',
    sections: [
      {
        number: 1,
        title: 'Pemilihan Slot Jadwal Penguji',
        icon: CalendarDays,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Pilih salah satu jadwal ujian 1:1 Tahfidz yang tersedia di daftar sesi. Perhatikan nama asatidz/penguji, tanggal, waktu, serta mode sesi yang dipilih.
            </p>
            <p>
              • <strong>Mode Online:</strong> Ujian dilaksanakan melalui video conference Zoom Meeting. Tautan Zoom akan muncul pada kartu jadwal Anda.
            </p>
            <p>
              • <strong>Mode Offline:</strong> Ujian tatap muka langsung di kampus Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman sesuai lokasi ruangan yang tertera.
            </p>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Materi & Kriteria Penilaian',
        icon: Award,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Aspek yang dinilai oleh penguji meliputi:
            </p>
            <p>
              1. <strong>Makharijul Huruf & Tajwid:</strong> Ketepatan pelafalan huruf hijaiyah dan hukum bacaan tajwid.
            </p>
            <p>
              2. <strong>Tartil & Kelancaran:</strong> Kecepatan, kefasihan ritme, serta kejelasan lantunan ayat Al-Qur'an.
            </p>
            <p>
              3. <strong>Hafalan Al-Qur'an:</strong> Daya ingat, sambung ayat, dan capaian hafalan juz/surat santri.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Tata Tertib Ujian',
        icon: ShieldAlert,
        content: (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-1.5">
            <p>
              • Santri wajib mengenakan pakaian muslim yang rapi dan menutup aurat (baju koko/gamis/jilbab).
            </p>
            <p>
              • Untuk sesi online, bergabunglah ke tautan Zoom minimal 10 menit sebelum jadwal dimulai di ruangan yang tenang dan pencahayaan terang.
            </p>
          </div>
        ),
      },
    ],
  },

  'applicant-interview': {
    title: 'Seleksi 1:1 Wawancara Santri & Wali',
    subtitle: 'Panduan pelaksanaan wawancara komitmen calon santri dan orang tua/wali santri.',
    sections: [
      {
        number: 1,
        title: 'Pemilihan Jadwal Wawancara',
        icon: CalendarDays,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Pilih slot waktu wawancara yang tersedia setelah menyelesaikan tahapan sebelumnya. Sesi wawancara dapat dilakukan secara <strong>Online (Zoom)</strong> atau <strong>Offline (tatap muka di pesantren)</strong>.
            </p>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Kehadiran Calon Santri dan Wali',
        icon: Users,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Sesi wawancara wajib dihadiri oleh <strong>calon santri didampingi oleh orang tua atau wali santri</strong>. Wawancara bertujuan membangun keselarasan dan kesepahaman antara pihak keluarga dan pengasuh pesantren.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Fokus & Ruang Lingkup Wawancara',
        icon: Sparkles,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Pewawancara akan mendalami motivasi calon santri, kemandirian kehidupan asrama, riwayat kebiasaan dan kesehatan santri, serta kesiapan orang tua dalam mendukung program pendidikan dan tata tertib pesantren.
            </p>
          </div>
        ),
      },
    ],
  },

  'applicant-selection': {
    title: 'Tes Seleksi & Ujian 1:1',
    subtitle: 'Petunjuk tahapan ujian tatap muka langsung (Session 1:1 Tahfidz & Wawancara).',
    sections: [
      {
        number: 1,
        title: 'Tahapan Seleksi Personal 1:1',
        icon: Users,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Calon santri menjalani dua tahapan seleksi utama: <strong>Ujian Tahfidz Al-Qur'an</strong> bersama asatidz penguji dan <strong>Wawancara Komitmen</strong> bersama calon santri dan orang tua/wali.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Pemilihan Jadwal Mandiri',
        icon: Clock,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setelah dokumen persyaratan disetujui panitia, calon santri dapat memilih slot jadwal penguji yang tersedia secara mandiri melalui menu Seleksi di portal ini.
          </p>
        ),
      },
    ],
  },

  'applicant-result': {
    title: 'Hasil Kelulusan & LoA Resmi',
    subtitle: 'Petunjuk melihat pengumuman kelulusan, unduh dokumen LoA resmi, dan tanda tangan digital dokumen persetujuan.',
    sections: [
      {
        number: 1,
        title: 'Pengumuman Hasil Seleksi',
        icon: Award,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Hasil seleksi diumumkan secara transparan di halaman ini setelah seluruh penilaian (Tahfidz dan Wawancara) selesai direkapitulasi dan disidangkan oleh panitia penerimaan santri baru.
            </p>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Unduh Dokumen Surat Kelulusan (LoA)',
        icon: FileText,
        content: (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-1.5">
            <p>
              Calon santri yang dinyatakan <strong>LULUS</strong> dapat langsung mengunduh <strong>Letter of Acceptance (LoA)</strong> resmi.
            </p>
            <p>
              Surat ini memuat nomor registrasi resmi, ketetapan kelulusan, serta ketentuan persetujuan santri baru.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Tanda Tangan Digital Dokumen LoA',
        icon: FileCheck,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Santri dan orang tua/wali melakukan tanda tangan digital langsung pada dokumen LoA sebagai komitmen dan persetujuan resmi penerimaan santri baru.
            </p>
            <p>
              Setelah LoA ditandatangani, seluruh rangkaian alur PPDB telah selesai.
            </p>
          </div>
        ),
      },
    ],
  },
}

export interface DocButtonProps {
  onClick?: () => void
  title?: string
  className?: string
  variant?: 'light' | 'dark'
}

export function DocButton({
  onClick,
  title = 'Panduan & Cara Kerja',
  className,
  variant = 'light',
}: DocButtonProps) {
  const isDark = variant === 'dark'
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        'h-10 w-10 rounded-xl transition-colors',
        isDark
          ? 'text-emerald-100 hover:text-white hover:bg-white/15'
          : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50',
        className
      )}
      title={title}
    >
      <BookOpen className="h-5 w-5" />
    </Button>
  )
}

export interface DocSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc?: DocItem
  docKey?: string
}

export function DocSheet({ open, onOpenChange, doc, docKey }: DocSheetProps) {
  const activeDoc = doc || (docKey ? SYSTEM_DOCS[docKey] : undefined)
  if (!activeDoc) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[100vw] sm:max-w-xl md:max-w-2xl overflow-y-auto p-4 sm:p-6 space-y-6">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-slate-900">
                Panduan & Cara Kerja {activeDoc.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {activeDoc.subtitle}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {activeDoc.sections.map((sec) => {
          const SectionIcon = sec.icon || Sparkles
          return (
            <div key={sec.number} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SectionIcon className="h-4 w-4 text-emerald-600" />
                {sec.number}. {sec.title}
              </h3>
              {sec.content}
            </div>
          )
        })}

        {/* Footer Bantuan */}
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-900">
              {activeDoc.contactNote ||
                'Ada pertanyaan atau kendala operasional? Hubungi Koordinator PPDB Pesantren Tahfidz Qur\'an dan Digital Ar-Rahman.'}
            </p>
          </div>
          <div className="flex justify-end sm:justify-center">
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="group w-full gap-2 rounded-xl border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.01] sm:w-auto"
              >
                <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                Tutup Panduan
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export interface DocTriggerProps {
  docKey?: string
  doc?: DocItem
  title?: string
  className?: string
  variant?: 'light' | 'dark'
}

/**
 * Komponen all-in-one yang self-contained:
 * Merender tombol CTA Lucide: book-open dan mengontrol pembukaan slide-over sheet dokumentasinya.
 * Cukup pasang 1 baris di header halaman!
 */
export function DocTrigger({
  docKey,
  doc,
  title,
  className,
  variant = 'light',
}: DocTriggerProps) {
  const [open, setOpen] = React.useState(false)
  const activeDoc = doc || (docKey ? SYSTEM_DOCS[docKey] : undefined)

  if (!activeDoc) return null

  const resolvedTitle = title || `Panduan & Cara Kerja ${activeDoc.title}`

  return (
    <>
      <DocButton
        onClick={() => setOpen(true)}
        title={resolvedTitle}
        className={className}
        variant={variant}
      />
      <DocSheet open={open} onOpenChange={setOpen} doc={activeDoc} />
    </>
  )
}
