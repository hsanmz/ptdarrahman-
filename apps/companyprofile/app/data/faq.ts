/**
 * Fallback FAQ data untuk PTDARRAHMAN.
 * Sumber dinamis utama adalah endpoint `/companyprofile/faq`
 * dan datanya dikelola dari Admin CMS -> Informasi -> FAQ.
 */

export interface Faq {
  question: string
  answer: string
  /** Kategori opsional untuk pengelompokan, mis. "Pendaftaran". */
  category?: string
}

export const faqs: Faq[] = [
  {
    category: 'Umum',
    question: 'Apa itu PTDARRAHMAN dan apa yang membedakannya dari pesantren konvensional?',
    answer:
      "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman (PTDARRAHMAN) adalah institusi pendidikan Islam modern yang mengintegrasikan pembelajaran Tahfidz Al-Qur'an bersanad, pembinaan akhlak mulia, dan penguasaan teknologi digital mutakhir. Santri tidak hanya dibimbing menghafal Al-Qur'an dan memahami ilmu syar'i secara mendalam, tetapi juga dibekali keahlian digital terapan seperti rekayasa perangkat lunak (coding), kecerdasan buatan (AI), robotika, keamanan siber, serta komunikasi bilingual (Bahasa Arab dan Inggris).",
  },
  {
    category: 'Pendaftaran',
    question: 'Bagaimana tahapan pendaftaran dan seleksi calon santri baru di PTDARRAHMAN?',
    answer:
      'Pendaftaran santri baru dilaksanakan secara terpadu melalui portal online PPDB PTDARRAHMAN: (1) Membuat akun dan mengisi formulir biodata serta kuesioner kesehatan mandiri; (2) Melakukan pembayaran biaya formulir pendaftaran via QRIS dinamis resmi sistem; (3) Mengunggah berkas persyaratan (NISN, KK, Akta Kelahiran, KTP orang tua, dan 4 rapor terakhir); (4) Mengikuti ujian seleksi terpadu CBT (akademik & psikologi) dan tes hafalan Tahfidz; (5) Mengikuti wawancara terpadu calon santri beserta orang tua/wali; (6) Pengumuman hasil seleksi dan penandatanganan Letter of Acceptance (LoA) digital.',
  },
  {
    category: "Tahfidz & Syar'i",
    question: "Berapa target hafalan Al-Qur'an santri dan bagaimana metode bimbingan Tahfidz di PTDARRAHMAN?",
    answer:
      "Target utama bimbingan adalah pencapaian hafalan hingga 30 Juz secara mutqin dengan standar tajwid dan makhraj yang teruji. Pembelajaran Al-Qur'an dibimbing langsung oleh para asatidz hafizh bersanad menggunakan metode talaqqi, musyafahah, ziyadah (hafalan baru harian), muroja'ah berjenjang (harian, pekanan, dan bulanan), serta tasmi' terbuka di hadapan penguji dan wali santri.",
  },
  {
    category: 'Kurikulum Digital',
    question: 'Keterampilan teknologi digital apa saja yang dipelajari santri di PTDARRAHMAN?',
    answer:
      'Kurikulum digital PTDARRAHMAN dirancang aplikatif dari tingkat fundamental hingga proyek industri, mencakup pemrograman web dan mobile, pengenalan logika algoritma, kecerdasan buatan (Artificial Intelligence & Machine Learning), robotika berbasis IoT, dasar-dasar cyber security, serta UI/UX design. Santri diarahkan untuk menghasilkan produk karya digital nyata yang bermanfaat bagi kemaslahatan umat.',
  },
  {
    category: 'Biaya & Pembayaran',
    question: 'Bagaimana ketentuan biaya pendidikan dan mekanisme pembayarannya?',
    answer:
      'Rincian master komponen biaya pendidikan (seperti uang pangkal, seragam, matrikulasi, sarana, dan SPP bulanan) beserta potongan diskon gelombang/early bird disajikan secara transparan pada dokumen resmi Letter of Acceptance (LoA) bagi calon santri yang dinyatakan lulus seleksi. Pembayaran biaya formulir pendaftaran dilakukan langsung melalui QRIS di portal PPDB, sedangkan penyetoran biaya masuk/pendidikan dilakukan di luar sistem melalui transfer rekening resmi PTDARRAHMAN atau tunai di kantor bendahara pesantren.',
  },
  {
    category: 'Kehidupan Santri',
    question: 'Bagaimana pola kehidupan harian santri di asrama dan aturan penggunaan gawai/laptop?',
    answer:
      'Santri menjalani rutinitas harian yang seimbang dan disiplin selama 24 jam, mulai dari sholat berjamaah tepat waktu, qiyamul lail, halaqah tahfidz shubuh dan ashar, kegiatan kelas formal, hingga olahraga dan pembinaan karakter di sore hari. Perangkat komputer dan gawai untuk kebutuhan praktikum digital digunakan secara terpimpin dan terjadwal di laboratorium komputer atau ruang kelas dengan sistem pengawasan jaringan yang ketat guna memastikan lingkungan belajar yang aman dan terarah.',
  },
  {
    category: 'Fasilitas',
    question: 'Fasilitas apa saja yang disediakan pesantren untuk mendukung kenyamanan belajar santri?',
    answer:
      "PTDARRAHMAN menyediakan sarana penunjang yang representatif, meliputi ruang asrama bersih dan nyaman, masjid jami' berkapasitas besar, laboratorium komputer dan digital multimedia dengan koneksi internet terproteksi, ruang kelas interaktif ber-AC, perpustakaan terpadu, sarana olahraga, katering makanan halal dan bergizi 3 kali sehari, serta pos kesehatan santri dengan pendampingan tenaga medis.",
  },
]
