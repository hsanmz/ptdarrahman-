import type { NewsArticle } from './types'

/**
 * Berita resmi cadangan PTDARRAHMAN agar halaman `/news` selalu menampilkan
 * konten berita nyata saat koneksi database/API belum memuat data berita.
 */
export const FALLBACK_NEWS: NewsArticle[] = [
  {
    id: 'news-1',
    slug: 'dua-santri-ptd-ar-rahman-tuntaskan-tasmi-30-juz-bil-ghoib',
    category: "Tahfidz & Tasmi'",
    date: '2024-06-05',
    image:
      'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop',
    content: {
      title:
        "Alhamdulillah, Dua Santri PTD Ar-Rahman Tuntaskan Tasmi' 30 Juz Bil Ghoib dan Khotmul Qur'an",
      excerpt:
        "Dua santri putra PTD Ar-Rahman, Alvito Syarman Siregar dan Muhammad Ardan Sunda, menuntaskan ujian setoran hafalan 30 Juz Bil Ghoib dari Juz 1 hingga Juz 30, ditutup prosesi Khotmul Qur'an pada 5 Juni 2024.",
      body:
        "Suasana haru dan penuh kesyukuran menyelimuti keluarga besar Pesantren Tahfidz & Digital (PTD) Ar-Rahman. Dua santri putra terbaik, yakni Alvito Syarman Siregar dan Muhammad Ardan Sunda, berhasil menuntaskan ujian setoran hafalan Al-Qur'an 30 Juz Bil Ghoib (tanpa melihat mushaf) dari Juz 1 hingga Juz 30.\n\nRangkaian ujian Tasmi' 30 Juz Bil Ghoib dilaksanakan selama dua hari penuh pada Senin hingga Selasa, 3-4 Juni 2024 mulai ba'da Subuh hingga selesai bertempat di Kampus PTD Ar-Rahman, Mangunjaya, Tambun Selatan, Bekasi. Setelah dinyatakan tuntas menyetorkan seluruh hafalannya, prosesi puncak Khotmul Qur'an digelar secara khidmat pada hari Rabu, 5 Juni 2024 di Gedung Ar-Rahman, Jatimakmur.\n\nCapaian ini menjadi bukti nyata bahwa kurikulum terpadu di PTD Ar-Rahman mampu mengantarkan para santri mencapai target hafalan tertinggi sembari tetap aktif mempelajari teknologi informasi.",
      author: 'Humas PTDARRAHMAN',
    },
  },
  {
    id: 'news-2',
    slug: 'sharing-session-ptd-ar-rahman-senior-engineer-gojek-nextjs',
    category: 'Teknologi Digital',
    date: '2025-09-19',
    image:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop',
    content: {
      title:
        'Sharing Session PTD Ar-Rahman Hadirkan Senior Engineer Gojek, Kupas Tuntas Framework Next.js',
      excerpt:
        'PTD Ar-Rahman menggelar Sharing Session bersama Hendiri Sudianto, Senior Software Engineer Gojek, membedah Next.js: arsitektur, best practices, optimasi performa, hingga integrasi API.',
      body:
        'Dalam rangka mendekatkan pembelajaran teknologi santri dengan standar industri perangkat lunak nasional, Pesantren Tahfidz & Digital (PTD) Ar-Rahman menggelar kegiatan Sharing Session inspiratif pada hari Ahad, 14 September 2025. Acara ini menghadirkan narasumber tamu Hendiri Sudianto, seorang Senior Software Engineer di Gojek yang telah berpengalaman selama 9 tahun di bidang rekayasa perangkat lunak.\n\nPada sesi tersebut, para santri PTD Ar-Rahman diajak mengupas tuntas Next.js, salah satu framework pengembangan web modern berbasis React yang digunakan secara luas untuk membangun aplikasi berskala besar. Materi yang dibahas mencakup konsep fundamental arsitektur Next.js, penerapan best practices di dunia kerja, teknik optimasi performa aplikasi web, hingga cara mengintegrasikan API.',
      author: 'Tim IT PTDARRAHMAN',
    },
  },
  {
    id: 'news-3',
    slug: 'santri-ptd-ar-rahman-porseni-pontren-2025-kabupaten-bekasi',
    category: 'Kegiatan & Prestasi',
    date: '2025-10-19',
    image:
      'https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=1200&auto=format&fit=crop',
    content: {
      title:
        'Santri PTD Ar-Rahman Tunjukkan Semangat Juang di PORSENI PONTREN 2025 Kabupaten Bekasi',
      excerpt:
        'Sebanyak 19 santri PTD Ar-Rahman berlaga pada enam cabang lomba di PORSENI PONTREN 2025 Kabupaten Bekasi, bersaing bersama 73 pesantren dan lebih dari 2.100 santri.',
      body:
        'Santri Pesantren Tahfidz & Digital (PTD) Ar-Rahman turut ambil bagian dalam perhelatan Pekan Olahraga dan Seni Antar Pondok Pesantren (PORSENI PONTREN) 2025 Tingkat Kabupaten Bekasi yang diselenggarakan pada Kamis, 16 Oktober 2025 di Pesantren Darul Azhar, Kecamatan Setu, Kabupaten Bekasi.\n\nPada perhelatan ini, PTD Ar-Rahman mengutus kontingen santri untuk berlaga pada enam cabang perlombaan sekaligus, meliputi Pidato Bahasa Arab, Pidato Bahasa Inggris, Pidato Bahasa Indonesia, Kaligrafi, Badminton, Futsal, dan Tenis Meja.',
      author: 'Kesiswaan PTDARRAHMAN',
    },
  },
  {
    id: 'news-4',
    slug: 'tradisi-tasmi-10-juz-sekali-duduk-dan-medali-emas-olimpiade-tafsir',
    category: "Tahfidz & Tasmi'",
    date: '2024-07-15',
    image:
      'https://images.unsplash.com/photo-1576767475305-ce65f5cbb67e?q=80&w=1200&auto=format&fit=crop',
    content: {
      title:
        "Tradisi Tasmi' 10 Juz Sekali Duduk dan Raihan Medali Emas Olimpiade Tafsir Qur'an Nasional",
      excerpt:
        "Tasmi' 10 Juz Bil Ghoib sekali duduk oleh Ashraf El-Haq dan Medali Emas Olimpiade Tafsir Qur'an Nasional oleh Alvito Syarman Siregar membuktikan kekuatan tahfidz dan tafsir santri PTD Ar-Rahman.",
      body:
        "Kualitas hafalan dan pemahaman Al-Qur'an di Pesantren Tahfidz & Digital (PTD) Ar-Rahman terus dibuktikan melalui evaluasi berjenjang dan kompetisi tingkat nasional. Salah satu agenda rutin unggulan pesantren adalah pelaksanaan Tasmi' Al-Qur'an 10 Juz Bil Ghoib Sekali Duduk, yang disiarkan langsung melalui Zoom dan Instagram Live.\n\nTidak hanya unggul dalam hafalan, ananda Alvito Syarman Siregar berhasil meraih Medali Emas dalam ajang Olimpiade Tafsir Qur'an Tingkat Nasional.",
      author: 'Departemen Tahfidz',
    },
  },
  {
    id: 'news-5',
    slug: 'evaluasi-kompetensi-digital-ujian-praktik-iot-dan-basis-data',
    category: 'Teknologi Digital',
    date: '2024-12-10',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
    content: {
      title:
        'Evaluasi Kompetensi Digital: Santri PTD Ar-Rahman Jalani Ujian Praktik IoT dan Basis Data',
      excerpt:
        'Pada Sumatif Akhir Semester, santri PTD Ar-Rahman menjalani ujian praktik perakitan dan pemrograman IoT serta perancangan dan pengelolaan basis data di laboratorium.',
      body:
        'Sebagai pesantren yang memadukan tahfidz Al-Qur\'an dan teknologi informasi, pelaksanaan Sumatif Akhir Semester (SAS) di PTD Ar-Rahman menguji keterampilan rekayasa teknologi para santri secara langsung di laboratorium pemrograman Lantai 3.\n\nDalam rangkaian ujian praktik IT, para santri mendemonstrasikan proyek perakitan dan pemrograman Internet of Things (IoT) yang mengintegrasikan perangkat keras dengan logika pemrograman dan sistem Basis Data modern.',
      author: 'Lab Komputer PTDARRAHMAN',
    },
  },
  {
    id: 'news-6',
    slug: 'gerakan-lingkungan-indah-ramadhan-dan-ukhuwah-santri-ptd-ar-rahman',
    category: 'Kehidupan Asrama',
    date: '2025-03-12',
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop',
    content: {
      title:
        'Menjemput Keberkahan Ramadhan dan Memupuk Ukhuwah Lewat Gerakan Lingkungan Indah Santri',
      excerpt:
        'Gerakan Lingkungan Indah menyambut Ramadhan dan aneka kegiatan kebersamaan memupuk kemandirian, kedisiplinan, dan kepemimpinan santri PTD Ar-Rahman.',
      body:
        'Pembentukan karakter kepemimpinan, kemandirian, dan kebersamaan menjadi bagian tak terpisahkan dari keseharian santri di Pesantren Tahfidz & Digital (PTD) Ar-Rahman. Melalui program Gerakan Lingkungan Indah (GLI), santri putra dilatih bertanggung jawab merawat asrama, ruang belajar, dan lingkungan sekitar secara gotong royong.',
      author: 'Kesantrian & Asrama',
    },
  },
]

export function fallbackNews(): NewsArticle[] {
  return FALLBACK_NEWS.map((article) => ({
    ...article,
    content: { ...article.content },
    gallery: article.gallery ? [...article.gallery] : undefined,
  }))
}

/**
 * Satukan salinan artikel lama dengan slug yang sama.
 *
 * Data yang sudah tersedia di salah satu salinan tetap dipertahankan, sementara
 * field dari salinan terakhir menjadi nilai utama jika keduanya terisi.
 */
export function mergeNewsArticles(articles: NewsArticle[]): NewsArticle[] {
  const merged = new Map<string, NewsArticle>()

  for (const article of articles) {
    const key = article.slug || article.id
    const previous = merged.get(key)

    if (!previous) {
      merged.set(key, article)
      continue
    }

    const gallery = Array.from(
      new Set([...(previous.gallery ?? []), ...(article.gallery ?? [])]),
    )

    merged.set(key, {
      ...previous,
      ...article,
      image: article.image || previous.image,
      category: article.category || previous.category,
      date: article.date || previous.date,
      gallery: gallery.length > 0 ? gallery : undefined,
      content: {
        ...(previous.content ?? {}),
        ...(article.content ?? {}),
      },
    })
  }

  return [...merged.values()]
}
