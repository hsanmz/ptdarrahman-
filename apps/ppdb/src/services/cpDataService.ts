import { apiFetch } from '@/api/client'

export interface ProgramItem {
  id: string
  slug: string
  title: string
  tagline: string
  desc: string
  duration: string
  level: string
  highlights: string[]
  curriculum: string[]
  outcomes: string[]
  iconName?: string
}

export interface FacilityItem {
  id: string
  name: string
  category: 'tech' | 'worship' | 'academic' | 'boarding' | 'sports'
  desc: string
  image: string
  features: string[]
  floor?: string
}

export const FALLBACK_PROGRAMS: ProgramItem[] = [
  {
    id: 'prog-1',
    slug: 'tahfidz-al-quran',
    title: "Tahfidz Al-Qur'an 30 Juz & Ulumul Qur'an",
    tagline: "Dari Tahsin Bacaan hingga Ujian Terbuka Tasmi' 30 Juz Bil Ghoib",
    desc: "Program inti yang membimbing santri putra menghafal 30 juz Al-Qur'an secara bertahap, terukur, dan terjaga sanad bacaannya. Setiap santri mengikuti halaqah harian ba'da Subuh dan Ashar bersama Muhaffidz, dievaluasi melalui Sumatif Akhir Semester (SAS) Tahfidz, serta diuji ketahanan hafalannya melalui sidang Tasmi' 5, 10, 15, hingga 30 Juz Sekali Duduk dan seremoni Khotmul Qur'an.",
    duration: 'Program Terpadu Berjenjang',
    level: '30 Juz Mutqin & Bersanad',
    highlights: [
      "Tradisi Tasmi' Bil Ghoib Terbuka: Uji hafalan 10 juz sekali duduk hingga 30 juz penuh disiarkan live streaming.",
      "Pendalaman Tafsir Al-Qur'an & Ulumul Qur'an untuk membekali santri memahami kandungan ayat secara kontekstual.",
      "Halaqah Intensif Bersama Muhaffidz: Pendampingan setoran ziyadah (hafalan baru) dan muraja'ah (pengulangan) setiap hari.",
      "Wisuda Khotmul Qur'an Resmi di hadapan dewan masyaikh dan orang tua/wali santri.",
    ],
    curriculum: [
      'Tahsin & Tajwid Terapan (Matan Jazariyah & Tuhfatul Athfal)',
      "Ziyadah Harian (Target 1-2 Halaman Baru per Hari)",
      "Muraja'ah Kubro Harian & Mingguan",
      "Tasmi' Berjenjang Sekali Duduk (5, 10, 15, 20, 30 Juz)",
      "Tafsir Ayat Ahkam & Ulumul Qur'an Dasar",
    ],
    outcomes: [
      "Hafal 30 juz Al-Qur'an secara mutqin, memiliki sanad bacaan, mampu menjadi imam shalat rawatib dan tarawih, serta siap menjadi mu'allim Al-Qur'an.",
    ],
  },
  {
    id: 'prog-2',
    slug: 'teknologi-digital',
    title: 'Rekayasa Teknologi Digital, Web & IoT',
    tagline: 'Menguasai Pemrograman Modern, Basis Data, dan Internet of Things di Ruang Programming Pesantren',
    desc: 'Program Teknologi Digital di PTDARRAHMAN melampaui pelajaran komputer sekolah biasa. Bertempat di Ruang Programming Lantai 3, para santri mempelajari rekayasa perangkat lunak modern, perancangan basis data relasional, pengembangan aplikasi web skala industri (React/Next.js), hingga perakitan perangkat cerdas Internet of Things (IoT). Santri juga mengikuti Sharing Session bersama praktisi teknologi industri terkemuka.',
    duration: 'Program Terpadu Praktik Lab',
    level: 'Praktik Industri & Portofolio Nyata',
    highlights: [
      'Kurikulum Pemrograman Modern: Algoritma, HTML5/CSS3, JavaScript modern, React, dan framework Next.js.',
      'Praktikum Internet of Things (IoT): Merakit sensor mikrokontroler Arduino & ESP32 untuk otomasi cerdas.',
      'Perancangan & Optimasi Basis Data: Desain ERD, SQL database, dan arsitektur RESTful API.',
      'Mentoring Praktisi Industri: Kuliah tamu rutin bersama Senior Software Engineer dari tech company nasional.',
    ],
    curriculum: [
      'Fundamental Logika & Algoritma Komputer',
      'Pengembangan Web Frontend & Fullstack (React / Next.js / Tailwind CSS)',
      'Manajemen Basis Data & Integrasi API Modern',
      'Praktikum Robotika Dasar & Perangkat Keras IoT',
      'Produksi Konten Digital & Studio Podcast Dakwah',
    ],
    outcomes: [
      'Mampu membangun aplikasi web fungsional yang siap dipublikasikan, memiliki portofolio proyek perangkat lunak mandiri, dan siap berdaya saing di industri teknologi global.',
    ],
  },
  {
    id: 'prog-3',
    slug: 'bilingual',
    title: 'Program Bilingual (Bahasa Arab & Inggris Aktif)',
    tagline: 'Cakap Berkomunikasi Global dan Percaya Diri di Panggung Pidato Tiga Bahasa',
    desc: "Program Bilingual membentuk kebiasaan berkomunikasi aktif dalam Bahasa Arab dan Bahasa Inggris di lingkungan asrama PTDARRAHMAN. Selain menunjang pemahaman ayat-ayat Al-Qur'an dan literatur teknologi berbahasa Inggris, santri dilatih dalam seni berpidato (public speaking) 3 bahasa dan diterjunkan dalam ajang kompetisi khitobah.",
    duration: 'Pembiasaan Harian Asrama',
    level: 'Komunikasi & Public Speaking Aktif',
    highlights: [
      'Pelatihan Pidato 3 Bahasa (Arab, Inggris, Indonesia) mingguan dengan evaluasi retorika.',
      "Bahasa Arab Komunikatif (Muhadatsah) untuk menopang hafalan Qur'an dan kajian kitab.",
      'Bahasa Inggris Teknis untuk membaca dokumentasi rekayasa software dan literatur global.',
      'Delegasi Lomba: Berpartisipasi aktif dalam ajang pidato antar pesantren tingkat daerah dan nasional.',
    ],
    curriculum: [
      'Muhadatsah Yaumiyyah (Percakapan Sehari-hari)',
      'English Conversation & Technical Vocabulary',
      'Retorika Pidato & Seni Public Speaking (Muhadharah)',
      'Seni Kaligrafi Islam (Khat) & Literasi Bahasa',
    ],
    outcomes: [
      'Percaya diri berbicara di depan umum menggunakan Bahasa Arab dan Inggris, serta terbiasa menelaah referensi internasional.',
    ],
  },
  {
    id: 'prog-4',
    slug: 'akademi-kepemimpinan',
    title: 'Akademi Kepemimpinan, Karakter & Kemandirian',
    tagline: 'Membentuk Karakter Santri yang Mandiri, Disiplin, Tangguh, dan Berjiwa Pemimpin',
    desc: 'Menempa mentalitas, adab mulia, dan kemandirian santri melalui tata tertib asrama yang terstruktur. Santri dilatih bertanggung jawab lewat Gerakan Lingkungan Indah (GLI), olahraga prestasi (futsal, badminton, tenis meja), dakwah kreatif di studio podcast, serta kepemimpinan organisasi santri.',
    duration: 'Integrasi Ekosistem Asrama',
    level: 'Disiplin, Adab & Kepemimpinan',
    highlights: [
      'Gerakan Lingkungan Indah (GLI): Menanamkan tanggung jawab merawat kerapian dan kebersihan lingkungan pesantren.',
      'Olahraga & Kesehatan Fisik: Latihan teratur futsal, bulutangkis, dan tenis meja.',
      'Studio Podcast Kreatif: Mengasah keberanian santri berbicara di depan mikrofon dan kamera untuk syiar kebaikan.',
      'Rihlah Alam & Tadabbur Qurani: Membangun soliditas tim dan kecintaan pada alam ciptaan Allah SWT.',
    ],
    curriculum: [
      'Adab & Akhlak Santri Terhadap Guru, Sahabat, dan Lingkungan',
      'Manajemen Waktu & Kemandirian Hidup Berasrama',
      'Kepemimpinan Organisasi & Problem Solving Kelompok',
      'Kebugaran Jasmani & Sportivitas Olahraga',
    ],
    outcomes: [
      'Santri berakhlak mulia, mandiri tanpa ketergantungan orang tua, sigap mengatasi tantangan hidup, dan memiliki jiwa kepemimpinan amanah.',
    ],
  },
  {
    id: 'prog-5',
    slug: 'dirasah-islamiyah',
    title: 'Dirasah Islamiyah (Studi Keislaman & Kitab)',
    tagline: 'Memperkokoh Fondasi Akidah, Fiqih Ibadah, Akhlak Mulia, dan Kaidah Bahasa Arab',
    desc: "Membekali santri dengan pemahaman keislaman Ahlussunnah wal Jama'ah yang moderat dan kokoh. Pembelajaran meliputi fiqih ibadah praktis, akidah yang lurus, tarikh Islam, serta kaidah nahwu & sharaf sebagai kunci memahami teks kitab kuning.",
    duration: 'Kajian Halaqah Berjenjang',
    level: 'Fondasi Tsaqafah Islamiyah',
    highlights: [
      'Kajian Fiqih Ibadah Praktis: Memastikan kesempurnaan wudhu, shalat, thaharah, dan muamalah harian santri.',
      'Akidah Shahihah: Menanamkan keyakinan tauhid yang kokoh dari pengaruh pemikiran menyimpang.',
      'Pembelajaran Nahwu-Sharaf Terapan untuk membantu pemahaman makna ayat suci Al-Qur\'an.',
    ],
    curriculum: [
      'Fiqih Ibadah Terapan (Kitab Safinatun Najah & Matan Al-Ghayah)',
      'Akidah Dasar (Aqidatul Awwam)',
      'Akhlak Lil Banin & Adabul Alim Wal Muta\'allim',
      'Nahwu & Sharaf Aplikatif',
    ],
    outcomes: [
      'Memahami tata cara ibadah yang benar, memiliki cara pandang Islam yang rahmatan lil \'alamin, dan mampu mengamalkannya dalam kehidupan nyata.',
    ],
  },
]

export const FALLBACK_FACILITIES: FacilityItem[] = [
  {
    id: 'fac-1',
    name: 'Ruang Programming (Lantai 3)',
    category: 'tech',
    desc: 'Laboratorium komputer khusus tempat santri mempelajari penulisan kode (coding), pengembangan web Next.js, basis data, dan praktikum IoT dengan pendingin ruangan serta jaringan berkecepatan tinggi.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 3',
    features: [
      'Ruang kelas coding ber-AC dan nyaman',
      'Sarana praktik web modern, database & IoT',
      'Akses internet terpantau dan terfilter',
      'Layar proyektor & monitor display pengajar',
    ],
  },
  {
    id: 'fac-2',
    name: 'Musholla & Area Halaqah (Lantai 3)',
    category: 'worship',
    desc: "Pusat ibadah shalat berjamaah 5 waktu, dzikir ma'tsurat, halaqah setoran tahfidz harian, dan pelaksanaan sidang Tasmi' Bil Ghoib sekali duduk.",
    image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 3',
    features: [
      'Suasana tenang, sejuk, dan khusyuk',
      'Tempat wudhu terintegrasi di lantai yang sama',
      "Karpet tebal dan area halaqah ziyadah & muraja'ah",
      'Sound system jernih untuk adzan dan imam shalat',
    ],
  },
  {
    id: 'fac-3',
    name: 'Ruang Podcast & Studio Kreatif (Lantai 2)',
    category: 'tech',
    desc: 'Studio multimedia kedap suara yang dilengkapi perangkat audio-visual lengkap untuk melatih santri dalam dakwah digital, rekaman ceramah, podcast inspiratif, dan penyiaran Tasmi live streaming.',
    image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 2',
    features: [
      'Ruang akustik kedap suara berkualitas tinggi',
      'Mikrofon profesional, audio mixer, & monitor headphone',
      'Kamera studio untuk siaran langsung (live streaming)',
      'Pelatihan teknik broadcasting dan dakwah kreatif',
    ],
  },
  {
    id: 'fac-4',
    name: 'Aula Pertemuan Serbaguna (Lantai 2)',
    category: 'academic',
    desc: 'Ruang pertemuan luas untuk kegiatan sharing session bersama praktisi teknologi, evaluasi akbar santri, seminar keislaman, serta silaturahmi dengan orang tua/wali santri.',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 2',
    features: [
      'Kapasitas menampung seluruh civitas santri dan panitia',
      'Fasilitas proyektor multimedia beresolusi tinggi',
      'Tempat penyelenggaraan wisuda tahfidz internal',
      'Pusat kegiatan orientasi santri baru (Khutbatul Arsy)',
    ],
  },
  {
    id: 'fac-5',
    name: 'Kamar Asrama Santri Putra (Lantai 2)',
    category: 'boarding',
    desc: 'Kamar hunian santri mukim yang teratur, bersih, dan berventilasi baik, dilengkapi ranjang bertingkat kokoh, lemari pakaian seragam per santri, dan pengawasan musyrif asrama 24 jam.',
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 2',
    features: [
      'Ranjang bertingkat nyaman dengan kasur busa berkualitas',
      'Lemari pakaian individu untuk masing-masing santri',
      'Ventilasi sirkulasi udara alami dan kipas angin',
      'Didampingi musyrif asrama di setiap lorong kamar',
    ],
  },
  {
    id: 'fac-6',
    name: 'Ruang Kelas Akademik & Diskusi (Lantai 3)',
    category: 'academic',
    desc: 'Ruang belajar teori dan diskusi kelompok untuk mata pelajaran kurikulum umum dan keislaman dengan meja kursi ergonomis serta papan tulis interaktif.',
    image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 3',
    features: [
      'Pencahayaan terang dan sirkulasi udara optimal',
      'Whiteboard besar untuk pemaparan materi pembelajaran',
      'Konektivitas display untuk presentasi santri',
      'Suasana kelas yang kondusif dan interaktif',
    ],
  },
  {
    id: 'fac-7',
    name: 'Ruang Makan & Dapur Bersih (Lantai 1)',
    category: 'boarding',
    desc: 'Area makan terpadu yang higienis tempat penyajian menu makan santri 3 kali sehari dengan menu seimbang, serta ruang tamu untuk menyambut kunjungan orang tua/wali santri.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop',
    floor: 'Lantai 1',
    features: [
      'Penyajian makanan higienis standar gizi santri',
      'Air minum isi ulang bersih bersertifikasi',
      'Meja dan bangku makan teratur rapi',
      'Area tunggu dan resepsionis untuk tamu & orang tua',
    ],
  },
  {
    id: 'fac-8',
    name: 'Area Rooftop & Sarana Olahraga',
    category: 'sports',
    desc: 'Area terbuka di lantai atas yang difungsikan untuk kegiatan olahraga mandiri santri (tenis meja, senam kebugaran, jemur pakaian) dan area refreshing menatap langit senja.',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600&auto=format&fit=crop',
    floor: 'Rooftop',
    features: [
      'Meja tenis meja (pingpong) & sarana kebugaran jasmani',
      'Area penjemuran pakaian santri terlindung atap kanopi',
      'Pemandangan terbuka untuk rileksasi santri di sore hari',
      'Pagar pengaman kokoh mengelilingi seluruh perimeter rooftop',
    ],
  },
]

export async function fetchCpPrograms(): Promise<ProgramItem[]> {
  try {
    const rawList = await apiFetch<any[]>('/companyprofile/programs')
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((item, idx) => {
        let contentObj: any = {}
        if (typeof item.content === 'string') {
          try {
            contentObj = JSON.parse(item.content)
          } catch {
            contentObj = {}
          }
        } else if (typeof item.content === 'object' && item.content !== null) {
          contentObj = item.content
        }

        const fallback = FALLBACK_PROGRAMS[idx] || FALLBACK_PROGRAMS[0]
        return {
          id: item.id || `prog-${idx}`,
          slug: item.slug || fallback.slug,
          title: item.title || contentObj.title || fallback.title,
          tagline: contentObj.tagline || fallback.tagline,
          desc: item.description || contentObj.desc || fallback.desc,
          duration: contentObj.duration || fallback.duration,
          level: contentObj.level || fallback.level,
          highlights: Array.isArray(contentObj.highlights) && contentObj.highlights.length > 0
            ? contentObj.highlights
            : fallback.highlights,
          curriculum: Array.isArray(contentObj.curriculum) && contentObj.curriculum.length > 0
            ? contentObj.curriculum
            : fallback.curriculum,
          outcomes: Array.isArray(contentObj.outcomes) && contentObj.outcomes.length > 0
            ? contentObj.outcomes
            : fallback.outcomes,
        }
      })
    }
  } catch {
    // Silently fall back to built-in high fidelity data
  }
  return FALLBACK_PROGRAMS
}

export async function fetchCpFacilities(): Promise<FacilityItem[]> {
  try {
    const rawList = await apiFetch<any[]>('/companyprofile/facilities')
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((item, idx) => {
        let contentObj: any = {}
        if (typeof item.content === 'string') {
          try {
            contentObj = JSON.parse(item.content)
          } catch {
            contentObj = {}
          }
        } else if (typeof item.content === 'object' && item.content !== null) {
          contentObj = item.content
        }

        const fallback = FALLBACK_FACILITIES[idx] || FALLBACK_FACILITIES[0]
        return {
          id: item.id || `fac-${idx}`,
          name: contentObj.name || item.name || fallback.name,
          category: (item.category || fallback.category) as FacilityItem['category'],
          desc: contentObj.desc || item.description || fallback.desc,
          image: item.image || fallback.image,
          features: Array.isArray(contentObj.features) && contentObj.features.length > 0
            ? contentObj.features
            : fallback.features,
          floor: contentObj.floor || fallback.floor,
        }
      })
    }
  } catch {
    // Silently fall back to built-in high fidelity data
  }
  return FALLBACK_FACILITIES
}
