/**
 * Naskah "Story PTD" untuk layout sticky-scroll di halaman `/about`.
 * Sisi kiri (visual) menempel saat scroll; sisi kanan (babak cerita) mengalir.
 * Bila `storyVisual.image` kosong, section tayang sebagai timeline terpusat
 * tanpa visual — layout dua kolom kembali otomatis saat foto diisi.
 *
 * CATATAN PANITIA: narasi di bawah masih RANCANGAN aman tanpa klaim berlebihan —
 * ganti seluruh `body` dengan cerita resmi segera setelah naskah final diserahkan.
 */

export interface StoryVisual {
  /** URL foto utama (foto resmi Ketua Yayasan). Kosong = tayang tanpa visual. */
  image: string
  alt: string
  name: string
  role: string
}

export interface StoryChapter {
  id: string
  kicker: string
  title: string
  body: string[]
}

export const storyVisual: StoryVisual = {
  // TODO: ganti dengan foto resmi Ketua Yayasan saat aset diserahkan.
  image:
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2070&auto=format&fit=crop',
  alt: 'Eko Santoso — Ketua Yayasan Generasi Cerdas Akhlak Mulia',
  name: 'Eko Santoso',
  role: 'Ketua Yayasan Generasi Cerdas Akhlak Mulia',
}

export const storyChapters: StoryChapter[] = [
  {
    id: 'cerita-siapa-eko',
    kicker: 'BAGIAN 01',
    title: 'Siapa Pak Eko?',
    body: [
      "Eko Santoso adalah Ketua Yayasan Generasi Cerdas Akhlak Mulia — lembaga yang menaungi kegiatan pendidikan Ar Rahman Islamic Center, termasuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.",
      'Bersama pengurus yayasan, beliau mengawal arah kelembagaan agar seluruh lini pendidikan tetap berpijak pada nilai Al-Quran, akhlak mulia, dan orientasi keunggulan.',
    ],
  },
  {
    id: 'cerita-kenapa-dibangun',
    kicker: 'BAGIAN 02',
    title: 'Kenapa PTD Dibangun?',
    body: [
      'PTD lahir dari satu keyakinan yang tumbuh sejak 2021: generasi muslim yang kuat hafalannya juga harus cakap menghadapi era digital — bukan pilih salah satu, tapi memadukan keduanya.',
      'Dari kelompok belajar tahfidz kecil di kawasan Kalimalang, keyakinan itu berkembang menjadi keputusan melembaga: membangun pesantren yang menempatkan Al-Quran sebagai fondasi dan teknologi sebagai bekal masa depan.',
    ],
  },
  {
    id: 'cerita-bagaimana-sistem',
    kicker: 'BAGIAN 03',
    title: 'Bagaimana Sistemnya?',
    body: [
      'Kurikulum terpadu 6 tahun (SMP–SMA) memadukan hafalan Al-Quran, ilmu keislaman, sains digital — coding, AI, robotik — bahasa, dan pembinaan kepemimpinan dalam satu keseharian santri.',
      'Semuanya berjalan dalam satu tarikan napas: irama hafalan menjadi denyut utama hari santri, sementara kelas digital dan pembinaan karakter menyertainya tanpa saling meniadakan.',
    ],
  },
  {
    id: 'cerita-tujuan-ptd',
    kicker: 'BAGIAN 04',
    title: 'Tujuan PTD Dibuat?',
    body: [
      "Tujuan terbesar PTD bukan sekadar menghadirkan hafidz atau programmer, melainkan mencetak generasi Rahmatan lil 'Alamin — pribadi berakhlak yang membawa manfaat bagi semesta.",
      'Setiap santri dibekali kekuatan ganda: kemuliaan hafalan untuk hidup yang terarah, dan kompetensi digital untuk kemandirian serta kontribusi di dunia nyata.',
    ],
  },
]
