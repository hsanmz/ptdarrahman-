/**
 * Data statis dokumen Ketentuan & Syarat (T&C) Company Profile PTDARRAHMAN.
 * Konten dipelihara manual di sini (bukan lewat CMS) dan dirender di
 * halaman /syarat-ketentuan.
 *
 * Penanda tebal ditulis dengan markdown **...** dan diurai saat render
 * (lihat komponen Inline di halaman T&C) — jangan gunakan HTML mentah.
 */

export type TermBlock =
  | { t: 'p'; text: string }
  /** Baris pengantar daftar yang menonjol, mis. "Bukti minimum:" */
  | { t: 'label'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  /** Subbagian seperti "A. Industri Skala Mikro" */
  | { t: 'h3'; text: string }

export interface TermSubsection {
  id: string
  heading: string
  blocks: TermBlock[]
}

export interface TermChapter {
  id: string
  heading: string
  /** Paragraf pembuka bab sebelum subsection pertama (opsional). */
  intro?: string
  subsections: TermSubsection[]
}

export interface TermMeta {
  kode: string
  tanggalBerlaku: string
  versi: string
  status: string
  unit: string
  institusi: string
}

export const termMeta: TermMeta = {
  kode: 'TNC-CPS-2026',
  tanggalBerlaku: '27 Oktober 2026',
  versi: '1.0',
  status: 'Standar dan Ketentuan Operasional Internal',
  unit: 'Tim Humas dan Hubungan Industri (Hubin)',
  institusi: "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman",
}

export const termsDocument: TermChapter[] = [
  {
    id: 'bab-1',
    heading: 'BAB I. PENDAHULUAN',
    subsections: [
      {
        id: '1-1-latar-belakang',
        heading: '1.1 Latar Belakang',
        blocks: [
          {
            t: 'p',
            text: 'Company Profile merupakan dokumen profil resmi institusi yang berfungsi sebagai media informasi, publikasi, promosi kelembagaan, serta pengenalan kapasitas institusi kepada masyarakat, calon peserta didik, orang tua, pemerintah, lembaga pendidikan, dunia usaha, dan dunia industri (DUDI).',
          },
          {
            t: 'p',
            text: "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman memerlukan Company Profile yang mampu menggambarkan identitas lembaga secara menyeluruh, meliputi pendidikan Al-Qur'an, pembentukan karakter Islami, pengembangan kompetensi digital, fasilitas pembelajaran, kualitas sumber daya manusia, prestasi, serta kesiapan peserta didik menghadapi perkembangan dunia kerja dan kewirausahaan.",
          },
          {
            t: 'p',
            text: 'Oleh karena itu, penyusunan Company Profile harus mengikuti standar yang terstruktur, terukur, informatif, dan dapat dipertanggungjawabkan.',
          },
          {
            t: 'p',
            text: 'Dokumen ini ditetapkan sebagai acuan internal bagi seluruh unit kerja yang terlibat dalam pengumpulan data, penyusunan materi, desain, verifikasi, persetujuan, penerbitan, dan pendistribusian Company Profile.',
          },
        ],
      },
      {
        id: '1-2-maksud-dan-tujuan',
        heading: '1.2 Maksud dan Tujuan',
        blocks: [
          { t: 'p', text: 'Dokumen ini disusun untuk:' },
          {
            t: 'ol',
            items: [
              'Menetapkan standar minimum kelengkapan Company Profile institusi.',
              'Menjamin keakuratan identitas, legalitas, dan informasi kelembagaan.',
              'Menampilkan karakteristik pendidikan pesantren tahfidz yang terintegrasi dengan kompetensi digital.',
              'Menstandarkan penyajian program pendidikan, fasilitas, tenaga pendidik, prestasi, dan capaian peserta didik.',
              'Mengklasifikasikan mitra industri berdasarkan skala usaha, bidang industri, dan tingkat kerja sama.',
              'Meningkatkan kredibilitas institusi di hadapan perusahaan, lembaga pemerintah, perguruan tinggi, dan calon mitra strategis.',
              'Menjadi pedoman penyusunan dokumen cetak, multimedia, presentasi, dan profil digital berbasis web.',
              'Menjamin bahwa informasi yang dipublikasikan tidak menyesatkan, melanggar privasi, atau mengatasnamakan pihak lain tanpa persetujuan.',
            ],
          },
        ],
      },
      {
        id: '1-3-ruang-lingkup',
        heading: '1.3 Ruang Lingkup',
        blocks: [
          { t: 'p', text: 'Ketentuan ini mencakup:' },
          {
            t: 'ol',
            items: [
              'Identitas dan legalitas institusi.',
              'Profil organisasi dan tata kelola kelembagaan.',
              'Visi, misi, tujuan, dan nilai institusi.',
              'Program pendidikan tahfidz dan pembinaan karakter.',
              'Program pendidikan serta kompetensi digital.',
              'Kurikulum dan metode pembelajaran.',
              'Sumber daya manusia dan tenaga pendidik.',
              'Infrastruktur dan fasilitas pembelajaran.',
              'Prestasi, portofolio, dan capaian institusi.',
              'Klasifikasi industri dan pemetaan mitra DUDI.',
              'Program kemitraan pendidikan dan industri.',
              'Standar desain, dokumentasi, dan publikasi.',
              'Perlindungan data pribadi dan hak penggunaan aset.',
              'Mekanisme verifikasi, persetujuan, evaluasi, dan pembaruan dokumen.',
            ],
          },
        ],
      },
      {
        id: '1-4-prinsip-penyusunan',
        heading: '1.4 Prinsip Penyusunan',
        blocks: [
          { t: 'p', text: 'Seluruh Company Profile wajib berpedoman pada prinsip berikut:' },
          {
            t: 'ul',
            items: [
              '**Akurat:** Informasi sesuai dengan kondisi dan dokumen yang dapat diverifikasi.',
              '**Legal:** Identitas dan klaim kelembagaan sesuai dengan status hukum serta izin yang dimiliki.',
              '**Transparan:** Capaian, fasilitas, dan kerja sama ditampilkan tanpa melebih-lebihkan kondisi sebenarnya.',
              '**Profesional:** Menggunakan bahasa, desain, dan struktur informasi yang konsisten.',
              "**Islami:** Mencerminkan nilai Al-Qur'an, adab, akhlak, dan tanggung jawab.",
              '**Kompetitif:** Menunjukkan kompetensi yang relevan dengan kebutuhan industri dan perkembangan teknologi.',
              '**Terukur:** Mengutamakan data, indikator, dan bukti pendukung yang dapat diperiksa.',
              '**Berkelanjutan:** Informasi ditinjau dan diperbarui secara berkala.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'bab-2',
    heading: 'BAB II. PERSYARATAN IDENTITAS DAN LEGALITAS INSTITUSI',
    subsections: [
      {
        id: '2-1-identitas-resmi-lembaga',
        heading: '2.1 Identitas Resmi Lembaga',
        blocks: [
          { t: 'p', text: 'Company Profile wajib mencantumkan identitas institusi yang meliputi:' },
          {
            t: 'ol',
            items: [
              'Nama resmi lembaga sesuai dokumen pendirian atau izin yang berlaku.',
              'Nama yayasan atau badan penyelenggara, apabila ada.',
              'Jenis dan bentuk satuan pendidikan yang diselenggarakan.',
              'Tahun pendirian atau mulai beroperasi.',
              'Alamat lengkap lokasi institusi.',
              'Nomor telepon atau kontak resmi institusi.',
              'Alamat surat elektronik resmi.',
              'Situs web resmi dan akun media sosial resmi, apabila tersedia.',
              'Logo institusi dalam format digital berkualitas tinggi.',
              'Nama pimpinan atau kepala lembaga sesuai struktur organisasi yang berlaku.',
            ],
          },
          {
            t: 'p',
            text: 'Nama populer, nama program, dan nama merek institusi boleh digunakan sebagai identitas visual tambahan, tetapi tidak boleh menggantikan nama resmi pada bagian legalitas.',
          },
        ],
      },
      {
        id: '2-2-dokumen-legalitas',
        heading: '2.2 Dokumen Legalitas',
        blocks: [
          {
            t: 'p',
            text: 'Informasi legalitas wajib disesuaikan dengan bentuk dan status masing-masing unit pendidikan. Dokumen yang perlu diperiksa meliputi:',
          },
          {
            t: 'ol',
            items: [
              'Akta pendirian yayasan atau badan penyelenggara, jika relevan.',
              'Pengesahan badan hukum, apabila dipersyaratkan.',
              'Surat keputusan pendirian atau dokumen pendirian institusi.',
              'Izin operasional atau dokumen perizinan yang sesuai dengan jenis lembaga.',
              'Nomor Statistik Pondok Pesantren (NSP) dan Piagam Statistik Pesantren (PSP), apabila pesantren telah terdaftar dan memiliki dokumen tersebut.',
              'Nomor Pokok Sekolah Nasional (NPSN) untuk satuan pendidikan yang terdaftar dan memiliki NPSN.',
              'Dokumen akreditasi satuan pendidikan formal, apabila berlaku.',
              'Dokumen kerja sama kelembagaan yang masih berlaku, jika akan ditampilkan.',
              'Sertifikat atau dokumen pendukung lain yang relevan dengan layanan pendidikan institusi.',
            ],
          },
          {
            t: 'p',
            text: '**Ketentuan:** Tidak semua pesantren otomatis memiliki NPSN, status akreditasi sekolah formal, atau jenis izin yang sama. Informasi tersebut wajib ditampilkan berdasarkan dokumen aktual, bukan berdasarkan asumsi.',
          },
          {
            t: 'p',
            text: 'Apabila dokumen tertentu belum tersedia atau tidak berlaku bagi unit yang bersangkutan, informasi tersebut tidak boleh dibuat atau dicantumkan seolah-olah sudah dimiliki.',
          },
        ],
      },
      {
        id: '2-3-validasi-data-identitas',
        heading: '2.3 Validasi Data Identitas',
        blocks: [
          {
            t: 'p',
            text: 'Sebelum diterbitkan, identitas lembaga harus diperiksa melalui sumber atau dokumen resmi yang relevan. Verifikasi mencakup:',
          },
          {
            t: 'ul',
            items: [
              'Kesesuaian nama dengan dokumen legalitas.',
              'Kesesuaian nomor identitas lembaga dengan pangkalan data terkait.',
              'Keabsahan dokumen akreditasi yang dicantumkan.',
              'Kesesuaian alamat dengan lokasi operasional.',
              'Kesesuaian jabatan pimpinan dengan struktur organisasi terbaru.',
              'Keaktifan kontak dan kanal komunikasi resmi.',
            ],
          },
          {
            t: 'p',
            text: 'Referensi pemeriksaan identitas satuan pendidikan dapat menggunakan layanan resmi data pendidikan pemerintah, sedangkan legalitas pesantren diperiksa melalui dokumen dan layanan Kementerian Agama yang relevan.',
          },
        ],
      },
      {
        id: '2-4-alamat-dan-informasi-geografis',
        heading: '2.4 Alamat dan Informasi Geografis',
        blocks: [
          { t: 'p', text: 'Company Profile wajib mencantumkan alamat institusi yang jelas. Informasi tambahan yang disarankan:' },
          {
            t: 'ol',
            items: [
              'Koordinat lokasi.',
              'Tautan Google Maps atau layanan peta digital yang menunjukkan lokasi institusi secara tepat.',
              'Petunjuk akses menuju lokasi.',
              'Informasi lokasi kampus atau unit pendidikan lain, jika terdapat lebih dari satu lokasi.',
            ],
          },
          {
            t: 'p',
            text: 'Peta digital harus mengarah ke lokasi institusi yang benar, bukan sekadar wilayah kecamatan atau kabupaten.',
          },
        ],
      },
      {
        id: '2-5-kontak-resmi',
        heading: '2.5 Kontak Resmi',
        blocks: [
          { t: 'p', text: 'Kontak yang digunakan untuk keperluan publikasi meliputi:' },
          {
            t: 'ul',
            items: [
              'Nomor telepon institusi atau nomor layanan resmi.',
              'Alamat email institusi.',
              'Alamat situs web.',
              'Kontak bagian penerimaan peserta didik.',
              'Kontak Tim Humas/Hubin untuk urusan kemitraan.',
            ],
          },
          {
            t: 'p',
            text: 'Penggunaan domain sch.id dapat diterapkan apabila sesuai dengan status dan ketentuan domain yang berlaku bagi institusi. Untuk lembaga yang menggunakan domain resmi lain, penggunaannya diperbolehkan sepanjang sah dan dikelola oleh institusi.',
          },
          {
            t: 'p',
            text: 'Kontak personal tidak boleh dipublikasikan sebagai kontak utama kelembagaan tanpa persetujuan pihak terkait.',
          },
        ],
      },
    ],
  },
  {
    id: 'bab-3',
    heading: 'BAB III. STANDAR KELENGKAPAN SUBSTANSI COMPANY PROFILE',
    intro: 'Company Profile dinyatakan memenuhi standar apabila memuat seluruh komponen inti yang relevan dengan kondisi institusi.',
    subsections: [
      {
        id: '3-1-ringkasan-eksekutif',
        heading: '3.1 Ringkasan Eksekutif',
        blocks: [
          { t: 'p', text: 'Bagian ini memberikan gambaran singkat mengenai institusi kepada pembaca. Informasi minimum:' },
          {
            t: 'ol',
            items: [
              'Nama resmi institusi.',
              'Bidang dan karakteristik pendidikan.',
              'Konsep pendidikan tahfidz dan digital.',
              'Keunggulan utama institusi.',
              'Kelompok sasaran pendidikan.',
              'Kompetensi atau capaian unggulan.',
              'Peluang kerja sama yang ditawarkan kepada mitra.',
            ],
          },
          {
            t: 'p',
            text: 'Ringkasan eksekutif harus menjelaskan nilai utama institusi dalam bahasa yang mudah dipahami oleh masyarakat dan calon mitra industri.',
          },
        ],
      },
      {
        id: '3-2-sejarah-dan-perkembangan-institusi',
        heading: '3.2 Sejarah dan Perkembangan Institusi',
        blocks: [
          { t: 'p', text: 'Bagian ini memuat:' },
          {
            t: 'ol',
            items: [
              'Latar belakang pendirian.',
              'Tahun berdiri.',
              'Tujuan awal pendirian.',
              'Perkembangan program pendidikan.',
              'Perkembangan fasilitas.',
              'Pembentukan program digital.',
              'Pencapaian penting institusi.',
              'Rencana pengembangan jangka panjang.',
            ],
          },
          {
            t: 'p',
            text: 'Tonggak pencapaian atau milestone disarankan disajikan dalam bentuk linimasa.',
          },
          {
            t: 'p',
            text: 'Data perkembangan jumlah peserta didik, tenaga pendidik, program, dan fasilitas dapat ditampilkan dalam grafik apabila tersedia data historis yang dapat diverifikasi.',
          },
        ],
      },
      {
        id: '3-3-visi-misi-tujuan-dan-nilai-institusi',
        heading: '3.3 Visi, Misi, Tujuan, dan Nilai Institusi',
        blocks: [
          { t: 'p', text: 'Bagian ini wajib menjelaskan arah pengembangan institusi. Komponen yang disertakan:' },
          {
            t: 'ul',
            items: [
              'Visi lembaga.',
              'Misi lembaga.',
              'Tujuan pendidikan.',
              'Nilai dasar institusi.',
              'Sasaran strategis.',
              'Target capaian pendidikan.',
            ],
          },
          {
            t: 'p',
            text: "Nilai institusi perlu menunjukkan integrasi antara pembentukan karakter Islami, penguasaan Al-Qur'an, pengembangan ilmu pengetahuan, dan kompetensi digital.",
          },
          {
            t: 'p',
            text: 'Target yang ditampilkan harus realistis dan sesuai dengan rencana resmi institusi.',
          },
        ],
      },
      {
        id: '3-4-sistem-pendidikan-pesantren-tahfidz',
        heading: '3.4 Sistem Pendidikan Pesantren Tahfidz',
        blocks: [
          { t: 'p', text: 'Bagian ini merupakan komponen inti yang membedakan Ar-Rahman dari lembaga pendidikan umum. Informasi yang perlu dicantumkan:' },
          {
            t: 'ol',
            items: [
              "Program tahfidz Al-Qur'an.",
              'Metode pembelajaran dan pendampingan hafalan.',
              'Target hafalan berdasarkan program yang benar-benar tersedia.',
              'Metode murajaah.',
              'Sistem setoran dan evaluasi hafalan.',
              'Pembinaan tajwid dan tahsin.',
              'Pembelajaran keislaman.',
              'Pembinaan adab dan akhlak.',
              'Pembiasaan ibadah dan kegiatan keagamaan.',
              'Pendampingan perkembangan santri.',
            ],
          },
          {
            t: 'p',
            text: 'Jika tersedia, institusi dapat menambahkan data mengenai jumlah santri yang mengikuti program tahfidz, capaian hafalan, hasil evaluasi, serta prestasi keagamaan.',
          },
          {
            t: 'p',
            text: 'Target hafalan tidak boleh digambarkan sebagai capaian aktual seluruh santri apabila target tersebut hanya berlaku untuk program atau kelompok tertentu.',
          },
        ],
      },
      {
        id: '3-5-sistem-pendidikan-dan-kompetensi-digital',
        heading: '3.5 Sistem Pendidikan dan Kompetensi Digital',
        blocks: [
          { t: 'p', text: 'Bagian ini menjelaskan bagaimana peserta didik memperoleh kompetensi teknologi. Bidang kompetensi yang dapat dipetakan antara lain:' },
          {
            t: 'h3',
            text: 'A. Pengembangan Perangkat Lunak',
          },
          {
            t: 'ul',
            items: [
              'Pemrograman dasar.',
              'Pengembangan situs web.',
              'Pengembangan aplikasi.',
              'Pengelolaan basis data.',
              'Pengujian perangkat lunak.',
              'Penggunaan Git dan platform pengelolaan kode.',
            ],
          },
          {
            t: 'h3',
            text: 'B. Desain Digital',
          },
          {
            t: 'ul',
            items: [
              'Desain grafis.',
              'UI/UX design.',
              'Desain antarmuka aplikasi.',
              'Prototyping.',
              'Pembuatan aset visual digital.',
            ],
          },
          {
            t: 'h3',
            text: 'C. Multimedia dan Konten Digital',
          },
          {
            t: 'ul',
            items: [
              'Fotografi dan videografi.',
              'Penyuntingan video.',
              'Animasi.',
              'Produksi konten digital.',
              'Pengelolaan media sosial.',
            ],
          },
          {
            t: 'h3',
            text: 'D. Infrastruktur dan Teknologi',
          },
          {
            t: 'ul',
            items: [
              'Jaringan komputer.',
              'Administrasi sistem.',
              'Pengelolaan server.',
              'Dasar keamanan informasi.',
              'Pemeliharaan perangkat komputer.',
            ],
          },
          {
            t: 'h3',
            text: 'E. Data dan Teknologi Baru',
          },
          {
            t: 'ul',
            items: [
              'Pengolahan data.',
              'Visualisasi data.',
              'Pemanfaatan kecerdasan buatan secara bertanggung jawab.',
              'Otomatisasi proses digital.',
            ],
          },
          {
            t: 'p',
            text: 'Daftar di atas merupakan pilihan bidang kompetensi yang dapat dipetakan, bukan pernyataan bahwa semua bidang sudah diajarkan di Ar-Rahman.',
          },
          {
            t: 'p',
            text: 'Hanya program yang benar-benar dilaksanakan, memiliki pengajar, materi, dan kegiatan pembelajaran yang jelas yang boleh dicantumkan sebagai program aktif.',
          },
        ],
      },
      {
        id: '3-6-integrasi-tahfidz-dan-kompetensi-digital',
        heading: '3.6 Integrasi Tahfidz dan Kompetensi Digital',
        blocks: [
          {
            t: 'p',
            text: 'Company Profile perlu menjelaskan hubungan antara pendidikan agama dan teknologi. Materi yang dapat ditampilkan:',
          },
          {
            t: 'ol',
            items: [
              'Penguatan adab dan etika dalam penggunaan teknologi.',
              'Pemanfaatan teknologi sebagai sarana pembelajaran.',
              'Pengembangan proyek digital yang bermanfaat.',
              'Penerapan etika digital dan tanggung jawab bermedia.',
              'Pembentukan disiplin, tanggung jawab, dan budaya kerja.',
              'Pengembangan kemampuan komunikasi dan kolaborasi.',
              'Pembiasaan penggunaan teknologi untuk kegiatan produktif.',
            ],
          },
          {
            t: 'p',
            text: 'Integrasi ini harus dijelaskan melalui program, metode, atau contoh kegiatan yang benar-benar dilaksanakan.',
          },
        ],
      },
      {
        id: '3-7-kurikulum-dan-metode-pembelajaran',
        heading: '3.7 Kurikulum dan Metode Pembelajaran',
        blocks: [
          { t: 'p', text: 'Bagian ini memuat:' },
          {
            t: 'ul',
            items: [
              'Struktur kurikulum yang berlaku.',
              'Mata pelajaran atau materi utama.',
              'Program tahfidz.',
              'Materi kompetensi digital.',
              'Metode pembelajaran teori dan praktik.',
              'Sistem penilaian.',
              'Program proyek.',
              'Evaluasi kompetensi.',
              'Kegiatan pengembangan diri.',
              'Program persiapan studi lanjut atau karier, apabila tersedia.',
            ],
          },
          {
            t: 'p',
            text: 'Jika institusi menyelenggarakan pendidikan formal, nonformal, dan program pesantren secara bersamaan, setiap program harus dibedakan agar pembaca memahami status dan cakupannya.',
          },
        ],
      },
      {
        id: '3-8-profil-pimpinan-dan-tenaga-pendidik',
        heading: '3.8 Profil Pimpinan dan Tenaga Pendidik',
        blocks: [
          { t: 'p', text: 'Informasi yang disajikan meliputi:' },
          {
            t: 'ol',
            items: [
              'Struktur pimpinan.',
              'Tenaga pendidik tahfidz.',
              'Pengajar mata pelajaran umum.',
              'Instruktur kompetensi digital.',
              'Tenaga kependidikan.',
              'Kualifikasi akademik.',
              'Sertifikasi profesi yang relevan.',
              'Pengalaman mengajar atau pengalaman industri.',
              'Keahlian utama.',
              'Peran dalam pengembangan institusi.',
            ],
          },
          {
            t: 'p',
            text: 'Nama, gelar, kualifikasi, dan sertifikasi wajib sesuai dengan dokumen yang dimiliki.',
          },
          {
            t: 'p',
            text: 'Sertifikasi kompetensi industri hanya boleh dicantumkan apabila benar-benar dimiliki dan dapat dibuktikan.',
          },
        ],
      },
      {
        id: '3-9-infrastruktur-dan-fasilitas',
        heading: '3.9 Infrastruktur dan Fasilitas',
        blocks: [
          { t: 'p', text: 'Fasilitas yang dapat dicantumkan meliputi:' },
          {
            t: 'ul',
            items: [
              'Ruang belajar.',
              'Asrama santri.',
              'Masjid atau musala.',
              'Ruang tahfidz.',
              'Laboratorium komputer.',
              'Ruang praktik digital.',
              'Laboratorium jaringan, apabila tersedia.',
              'Studio multimedia, apabila tersedia.',
              'Perpustakaan.',
              'Koneksi internet.',
              'Perangkat komputer dan pendukung pembelajaran.',
              'Fasilitas olahraga.',
              'Ruang pelayanan administrasi.',
              'Sarana sanitasi dan fasilitas kesehatan dasar yang tersedia.',
            ],
          },
          {
            t: 'p',
            text: 'Setiap fasilitas harus disertai deskripsi fungsi, kondisi aktual, dan dokumentasi visual.',
          },
          {
            t: 'p',
            text: 'Jumlah perangkat, kapasitas laboratorium, dan fasilitas pendukung harus berdasarkan inventaris terbaru.',
          },
        ],
      },
      {
        id: '3-10-prestasi-proyek-dan-portofolio',
        heading: '3.10 Prestasi, Proyek, dan Portofolio',
        blocks: [
          {
            t: 'p',
            text: 'Bagian ini bertujuan menunjukkan bukti nyata hasil pembelajaran dan perkembangan institusi. Informasi yang dapat disajikan:',
          },
          {
            t: 'ol',
            items: [
              'Prestasi tahfidz dan keagamaan.',
              'Prestasi akademik.',
              'Prestasi kompetisi teknologi.',
              'Hasil proyek perangkat lunak.',
              'Portofolio desain UI/UX.',
              'Hasil produksi multimedia.',
              'Produk atau karya digital santri.',
              'Kegiatan sosial dan pengabdian masyarakat.',
              'Penghargaan institusi.',
              'Publikasi atau kegiatan kolaborasi.',
            ],
          },
          {
            t: 'p',
            text: 'Setiap capaian sebaiknya dilengkapi nama kegiatan, tahun, kategori, penyelenggara, dan bukti pendukung.',
          },
          {
            t: 'p',
            text: 'Proyek latihan, proyek internal, produk komersial, dan produk yang telah digunakan oleh klien harus dibedakan secara jelas.',
          },
        ],
      },
      {
        id: '3-11-capaian-dan-indikator-kinerja-institusi',
        heading: '3.11 Capaian dan Indikator Kinerja Institusi',
        blocks: [
          {
            t: 'p',
            text: 'Apabila data tersedia, Company Profile disarankan menampilkan indikator kinerja yang terukur. Contoh indikator:',
          },
          {
            t: 'ul',
            items: [
              'Jumlah peserta didik aktif.',
              'Jumlah tenaga pendidik.',
              'Jumlah program pendidikan.',
              'Jumlah bidang kompetensi digital.',
              'Jumlah proyek yang diselesaikan.',
              'Jumlah sertifikasi kompetensi yang diperoleh peserta didik.',
              'Jumlah prestasi dalam periode tertentu.',
              'Jumlah mitra industri aktif.',
              'Jumlah peserta didik yang mengikuti praktik kerja.',
              'Jumlah lulusan yang melanjutkan pendidikan.',
              'Jumlah lulusan yang bekerja atau berwirausaha.',
              'Persentase kelulusan sertifikasi, jika relevan.',
            ],
          },
          {
            t: 'p',
            text: 'Setiap angka harus dilengkapi periode pengukuran dan definisi indikator.',
          },
          {
            t: 'p',
            text: 'Sebagai contoh, data lulusan yang bekerja tidak boleh disamakan dengan jumlah lulusan yang mengikuti pelatihan atau praktik kerja.',
          },
        ],
      },
      {
        id: '3-12-layanan-dan-peluang-kerja-sama',
        heading: '3.12 Layanan dan Peluang Kerja Sama',
        blocks: [
          {
            t: 'p',
            text: 'Company Profile harus menjelaskan bentuk kolaborasi yang dapat dikembangkan bersama pihak eksternal. Contohnya:',
          },
          {
            t: 'ol',
            items: [
              'Praktik Kerja Lapangan (PKL).',
              'Kunjungan industri.',
              'Guru tamu atau praktisi industri mengajar.',
              'Sinkronisasi kurikulum.',
              'Pelatihan dan sertifikasi kompetensi.',
              'Pengembangan kelas industri.',
              'Proyek kolaborasi.',
              'Pendampingan portofolio santri.',
              'Rekrutmen lulusan.',
              'Pengembangan kewirausahaan digital.',
              'Pengembangan produk atau solusi teknologi.',
              'Program beasiswa.',
              'Penelitian dan pengembangan.',
              'Program tanggung jawab sosial perusahaan yang relevan.',
            ],
          },
          {
            t: 'p',
            text: 'Setiap bentuk kerja sama harus disesuaikan dengan kesiapan institusi dan kebutuhan calon mitra.',
          },
        ],
      },
    ],
  },
  {
    id: 'bab-4',
    heading: 'BAB IV. KLASIFIKASI SKALA INDUSTRI DAN MITRA DUDI',
    subsections: [
      {
        id: '4-1-tujuan-klasifikasi',
        heading: '4.1 Tujuan Klasifikasi',
        blocks: [
          {
            t: 'p',
            text: 'Klasifikasi industri digunakan untuk memetakan calon mitra, menilai peluang kerja sama, menentukan prioritas pendekatan, dan menyusun strategi hubungan industri.',
          },
          {
            t: 'p',
            text: 'Klasifikasi tidak boleh hanya didasarkan pada popularitas merek atau ukuran logo perusahaan.',
          },
          {
            t: 'p',
            text: 'Penilaian perlu mempertimbangkan skala usaha, legalitas, bidang usaha, kapasitas operasional, relevansi kompetensi, serta bentuk kerja sama yang mungkin dilaksanakan.',
          },
        ],
      },
      {
        id: '4-2-klasifikasi-berdasarkan-skala-usaha',
        heading: '4.2 Klasifikasi Berdasarkan Skala Usaha',
        blocks: [
          { t: 'h3', text: 'A. Industri Skala Mikro' },
          { t: 'label', text: 'Karakteristik:' },
          {
            t: 'ul',
            items: [
              'Memiliki kegiatan usaha berskala sangat kecil.',
              'Operasional dan jumlah tenaga kerja relatif terbatas.',
              'Umumnya melayani pasar lokal atau segmen tertentu.',
              'Dapat berupa usaha perseorangan maupun badan usaha yang sesuai dengan ketentuan hukum.',
            ],
          },
          { t: 'label', text: 'Potensi kerja sama:' },
          {
            t: 'ul',
            items: [
              'Proyek digital sederhana.',
              'Pembuatan situs web.',
              'Desain promosi.',
              'Pengelolaan konten media sosial.',
              'Pendampingan digitalisasi usaha.',
              'Pembelajaran kewirausahaan.',
            ],
          },
          { t: 'h3', text: 'B. Industri Skala Kecil' },
          { t: 'label', text: 'Karakteristik:' },
          {
            t: 'ul',
            items: [
              'Memiliki operasional yang lebih terstruktur dibandingkan usaha mikro.',
              'Memiliki pelanggan dan kegiatan usaha yang relatif stabil.',
              'Dapat melibatkan sejumlah tenaga kerja tetap.',
              'Berpotensi membutuhkan layanan teknologi dan multimedia.',
            ],
          },
          { t: 'label', text: 'Potensi kerja sama:' },
          {
            t: 'ul',
            items: [
              'Proyek pengembangan aplikasi sederhana.',
              'Digital marketing.',
              'Desain identitas merek.',
              'Pengembangan katalog digital.',
              'Praktik kerja dan pembelajaran berbasis proyek.',
            ],
          },
          { t: 'h3', text: 'C. Industri Skala Menengah' },
          { t: 'label', text: 'Karakteristik:' },
          {
            t: 'ul',
            items: [
              'Memiliki kegiatan operasional dan pembagian fungsi kerja yang lebih mapan.',
              'Memiliki kapasitas usaha serta cakupan pasar yang lebih luas.',
              'Dapat memiliki beberapa divisi atau unit operasional.',
              'Memiliki kebutuhan pengembangan kompetensi tenaga kerja.',
            ],
          },
          { t: 'label', text: 'Potensi kerja sama:' },
          {
            t: 'ul',
            items: [
              'PKL terstruktur.',
              'Sinkronisasi kurikulum.',
              'Kelas praktisi.',
              'Pelatihan kompetensi.',
              'Proyek teknologi dengan ruang lingkup lebih luas.',
              'Pengembangan standar kerja dan portofolio.',
            ],
          },
          { t: 'h3', text: 'D. Industri Skala Besar' },
          { t: 'label', text: 'Karakteristik:' },
          {
            t: 'ul',
            items: [
              'Memiliki kegiatan usaha dengan skala operasional besar.',
              'Memiliki organisasi dan proses bisnis yang kompleks.',
              'Dapat memiliki jaringan operasional nasional atau internasional.',
              'Memiliki kebutuhan tenaga kerja dan pengembangan kompetensi yang beragam.',
            ],
          },
          { t: 'label', text: 'Potensi kerja sama:' },
          {
            t: 'ul',
            items: [
              'Program pengembangan kompetensi.',
              'PKL melalui mekanisme resmi perusahaan.',
              'Program guru tamu.',
              'Sertifikasi kompetensi.',
              'Program beasiswa.',
              'Rekrutmen lulusan.',
              'Proyek kolaborasi.',
              'Program tanggung jawab sosial perusahaan.',
            ],
          },
          { t: 'h3', text: 'E. Perusahaan Multinasional' },
          {
            t: 'p',
            text: 'Perusahaan multinasional merupakan kategori tambahan berdasarkan cakupan operasional lintas negara. Karakteristik:',
          },
          {
            t: 'ul',
            items: [
              'Memiliki kegiatan operasional di lebih dari satu negara.',
              'Dapat memiliki standar kompetensi dan prosedur kerja internasional.',
              'Berpotensi memiliki program pendidikan, sertifikasi, atau pengembangan talenta.',
            ],
          },
          {
            t: 'p',
            text: 'Kategori ini tidak otomatis menunjukkan bahwa perusahaan lebih relevan dibandingkan perusahaan nasional. Relevansi kerja sama tetap harus dinilai berdasarkan bidang usaha dan kebutuhan institusi.',
          },
          {
            t: 'p',
            text: '**Catatan klasifikasi:** Apabila diperlukan penetapan skala UMKM secara formal, gunakan kriteria peraturan yang berlaku, termasuk ketentuan modal usaha atau hasil penjualan tahunan. Kategori usaha tidak boleh ditentukan hanya berdasarkan jumlah karyawan atau persepsi umum.',
          },
        ],
      },
      {
        id: '4-3-klasifikasi-berdasarkan-sektor-industri',
        heading: '4.3 Klasifikasi Berdasarkan Sektor Industri',
        blocks: [
          { t: 'p', text: 'Setiap mitra harus dipetakan berdasarkan bidang usahanya. Kategori yang dapat digunakan:' },
          {
            t: 'ol',
            items: [
              '**Teknologi Informasi dan Perangkat Lunak:** Pengembangan aplikasi, layanan TI, konsultasi teknologi, dan produk perangkat lunak.',
              '**Infrastruktur dan Jaringan:** Jaringan komputer, layanan infrastruktur, pusat data, dan pengelolaan sistem.',
              '**Desain dan Industri Kreatif:** Desain grafis, UI/UX, animasi, fotografi, dan multimedia.',
              '**Media dan Digital Marketing:** Agensi digital, pengelolaan media sosial, produksi konten, dan pemasaran digital.',
              '**Manufaktur dan Industri Produksi:** Industri pengolahan, perakitan, dan proses produksi.',
              '**Perdagangan dan E-Commerce:** Perdagangan digital, toko daring, distribusi, dan pengelolaan perdagangan.',
              '**Pendidikan dan Pelatihan:** Lembaga pelatihan, penyedia sertifikasi, dan institusi pendidikan.',
              '**Keuangan dan Layanan Bisnis:** Layanan keuangan, administrasi, dan jasa profesional yang relevan.',
              '**Kewirausahaan dan UMKM:** Usaha lokal, bisnis rintisan, dan pengembangan produk.',
              '**Industri Halal dan Ekonomi Syariah:** Usaha yang bergerak di sektor halal atau layanan ekonomi syariah.',
            ],
          },
          {
            t: 'p',
            text: 'Kategori tersebut dapat diperluas sesuai kebutuhan kompetensi yang dikembangkan oleh Ar-Rahman.',
          },
        ],
      },
      {
        id: '4-4-matriks-prioritas-calon-mitra',
        heading: '4.4 Matriks Prioritas Calon Mitra',
        blocks: [
          {
            t: 'p',
            text: 'Untuk menentukan prioritas pendekatan, setiap calon mitra dinilai menggunakan indikator berikut.',
          },
          {
            t: 'ul',
            items: [
              'Kesesuaian bidang usaha dengan kompetensi digital.',
              'Kesesuaian dengan nilai dan tujuan pendidikan pesantren.',
              'Ketersediaan program pendidikan atau pengembangan talenta.',
              'Peluang PKL atau proyek pembelajaran.',
              'Potensi pelatihan dan sertifikasi.',
              'Potensi penyerapan lulusan.',
              'Kemudahan akses komunikasi dan koordinasi.',
              'Kejelasan legalitas dan reputasi perusahaan.',
            ],
          },
          { t: 'p', text: 'Setiap indikator dapat diberi skor 1-5. Contoh kategori internal:' },
          {
            t: 'ul',
            items: [
              '**Prioritas A:** Skor 80-100.',
              '**Prioritas B:** Skor 60-79.',
              '**Prioritas C:** Skor di bawah 60.',
            ],
          },
          {
            t: 'p',
            text: 'Skor tersebut merupakan instrumen pemetaan internal, bukan standar resmi pemerintah atau industri.',
          },
          {
            t: 'p',
            text: 'Calon mitra dengan risiko hukum, reputasi, atau ketidaksesuaian nilai yang serius harus melalui pemeriksaan khusus dan tidak otomatis disetujui meskipun memperoleh skor tinggi.',
          },
        ],
      },
    ],
  },
  {
    id: 'bab-5',
    heading: 'BAB V. KLASIFIKASI TINGKAT KEMITRAAN INDUSTRI',
    subsections: [
      {
        id: '5-1-level-0-calon-mitra',
        heading: '5.1 Level 0 - Calon Mitra',
        blocks: [
          {
            t: 'p',
            text: 'Status ini diberikan kepada perusahaan atau organisasi yang telah diidentifikasi sebagai calon mitra, tetapi belum memiliki kerja sama resmi.',
          },
          { t: 'label', text: 'Bukti minimum:' },
          {
            t: 'ul',
            items: [
              'Identitas perusahaan.',
              'Bidang usaha.',
              'Kontak resmi.',
              'Hasil pemetaan kesesuaian.',
              'Catatan komunikasi awal, jika tersedia.',
            ],
          },
          { t: 'label', text: 'Ketentuan publikasi:' },
          {
            t: 'p',
            text: 'Calon mitra tidak boleh ditampilkan sebagai mitra resmi atau mitra aktif.',
          },
        ],
      },
      {
        id: '5-2-level-1-mitra-kunjungan-dan-edukasi',
        heading: '5.2 Level 1 - Mitra Kunjungan dan Edukasi',
        blocks: [
          { t: 'p', text: 'Kerja sama berupa:' },
          {
            t: 'ul',
            items: [
              'Kunjungan industri.',
              'Seminar.',
              'Webinar.',
              'Kuliah tamu.',
              'Pengenalan dunia kerja.',
              'Kegiatan edukasi singkat.',
            ],
          },
          { t: 'label', text: 'Bukti pendukung:' },
          {
            t: 'ul',
            items: [
              'Surat undangan atau surat persetujuan.',
              'Dokumentasi kegiatan.',
              'Laporan pelaksanaan.',
            ],
          },
          {
            t: 'p',
            text: 'Kegiatan satu kali tidak boleh digambarkan sebagai kemitraan strategis jangka panjang.',
          },
        ],
      },
      {
        id: '5-3-level-2-mitra-praktik-kerja-lapangan',
        heading: '5.3 Level 2 - Mitra Praktik Kerja Lapangan',
        blocks: [
          {
            t: 'p',
            text: 'Kerja sama berfokus pada pemberian kesempatan praktik kerja atau pengalaman kerja kepada peserta didik. Cakupan dapat meliputi:',
          },
          {
            t: 'ul',
            items: [
              'Penempatan peserta PKL.',
              'Pembimbingan oleh pihak industri.',
              'Penilaian hasil praktik.',
              'Penyusunan laporan kegiatan.',
              'Evaluasi kompetensi peserta.',
            ],
          },
          { t: 'label', text: 'Bukti pendukung:' },
          {
            t: 'ul',
            items: [
              'Dokumen kerja sama atau persetujuan penempatan.',
              'Daftar peserta yang mengikuti program.',
              'Periode pelaksanaan.',
              'Laporan dan evaluasi kegiatan.',
            ],
          },
          {
            t: 'p',
            text: 'Durasi PKL mengikuti ketentuan pendidikan, kesepakatan para pihak, serta kebijakan perusahaan. Durasi 3-6 bulan tidak boleh dianggap sebagai ketentuan universal untuk semua program.',
          },
        ],
      },
      {
        id: '5-4-level-3-mitra-pengembangan-kompetensi',
        heading: '5.4 Level 3 - Mitra Pengembangan Kompetensi',
        blocks: [
          {
            t: 'p',
            text: 'Kerja sama melibatkan industri dalam peningkatan kualitas pembelajaran. Bentuk kerja sama:',
          },
          {
            t: 'ul',
            items: [
              'Sinkronisasi kurikulum.',
              'Penyusunan materi praktik.',
              'Guru tamu.',
              'Pelatihan kompetensi.',
              'Pengembangan proyek berbasis kebutuhan industri.',
              'Pendampingan portofolio.',
            ],
          },
          { t: 'label', text: 'Bukti pendukung:' },
          {
            t: 'ul',
            items: [
              'Dokumen kerja sama.',
              'Rencana kegiatan.',
              'Materi atau modul.',
              'Dokumentasi pelaksanaan.',
              'Evaluasi hasil.',
            ],
          },
        ],
      },
      {
        id: '5-5-level-4-mitra-kelas-industri-dan-sertifikasi',
        heading: '5.5 Level 4 - Mitra Kelas Industri dan Sertifikasi',
        blocks: [
          {
            t: 'p',
            text: 'Kerja sama melibatkan program pembelajaran yang dirancang bersama industri atau penyedia sertifikasi yang kompeten. Bentuk kerja sama:',
          },
          {
            t: 'ul',
            items: [
              'Kelas industri.',
              'Program pelatihan terstruktur.',
              'Kurikulum bersama.',
              'Penggunaan perangkat atau teknologi industri.',
              'Uji kompetensi.',
              'Sertifikasi oleh lembaga atau pihak yang berwenang.',
            ],
          },
          { t: 'label', text: 'Bukti pendukung:' },
          {
            t: 'ul',
            items: [
              'Perjanjian kerja sama.',
              'Struktur program.',
              'Silabus atau kurikulum.',
              'Persyaratan peserta.',
              'Mekanisme evaluasi.',
              'Dokumen sertifikasi yang relevan.',
            ],
          },
          {
            t: 'p',
            text: 'Istilah kelas industri, sertifikasi industri, atau program eksklusif hanya boleh digunakan apabila benar-benar sesuai dengan program yang disepakati.',
          },
          {
            t: 'p',
            text: 'Penggunaan nama atau logo principal teknologi tidak otomatis membuktikan bahwa institusi merupakan mitra resmi principal tersebut.',
          },
        ],
      },
      {
        id: '5-6-level-5-mitra-strategis-dan-pengembangan-talenta',
        heading: '5.6 Level 5 - Mitra Strategis dan Pengembangan Talenta',
        blocks: [
          {
            t: 'p',
            text: 'Level ini digunakan untuk kerja sama yang memiliki cakupan lebih luas dan berkelanjutan. Bentuk kerja sama:',
          },
          {
            t: 'ul',
            items: [
              'Program pengembangan talenta.',
              'Pengembangan kompetensi jangka panjang.',
              'Proyek bersama.',
              'Program beasiswa.',
              'Pengembangan produk digital.',
              'Pelatihan berkelanjutan.',
              'Pengembangan fasilitas pembelajaran.',
              'Program magang yang terstruktur.',
              'Pengembangan jalur karier lulusan.',
            ],
          },
          { t: 'label', text: 'Bukti pendukung:' },
          {
            t: 'ul',
            items: [
              'Perjanjian kerja sama yang relevan.',
              'Rencana kerja bersama.',
              'Penanggung jawab masing-masing pihak.',
              'Target dan indikator kinerja.',
              'Evaluasi pelaksanaan.',
              'Bukti keberlanjutan program.',
            ],
          },
          {
            t: 'p',
            text: 'Penetapan level ini harus berdasarkan ruang lingkup dan bukti kegiatan, bukan semata-mata nilai kontrak atau nama besar perusahaan.',
          },
        ],
      },
    ],
  },
]
