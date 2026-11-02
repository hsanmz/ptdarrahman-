import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import {
  HelpCircle, Search, ChevronDown, MessageCircle, Phone, Mail,
  UserPlus, LogIn, Sparkles, Bus, Clock, Laptop, CreditCard,
  Home, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FaqItem {
  id: string
  question: string
  answer: string
  category: 'transport' | 'daily' | 'curriculum' | 'exam' | 'finance' | 'dormitory'
}

const FAQS_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'transport',
    question: 'Apakah ada fasilitas atau layanan antar-jemput santri?',
    answer:
      'Pesantren Tahfidz Qur\'an dan Digital Ar-Rahman merupakan pesantren berasrama penuh (full boarding school) di mana seluruh santri mukim tinggal di asrama 24 jam, sehingga tidak ada layanan antar-jemput harian seperti sekolah non-boarding. Namun untuk agenda kepulangan liburan semester dan kedatangan santri baru, panitia menyediakan titik koordinasi penjemputan dari Stasiun Bekasi dan stasiun LRT terdekat bagi wali santri yang berasal dari luar daerah atau luar pulau.',
  },
  {
    id: 'faq-2',
    category: 'daily',
    question: 'Jam berapa kegiatan harian santri dimulai dan bagaimana jadwalnya?',
    answer:
      'Aktivitas harian santri dimulai pukul 04.15 WIB untuk persiapan shalat Subuh berjamaah di musholla pesantren, dilanjutkan Halaqah Ziyadah Tahfidz pertama (05.00 - 06.30 WIB). Setelah sarapan pagi dan persiapan kelas, santri mengikuti Kegiatan Belajar Mengajar (KBM) akademik serta praktikum rekayasa teknologi digital di Ruang Programming (07.30 - 15.00 WIB) yang diselingi istirahat shalat Dhuhur dan makan siang. Sore hari ba\'da Ashar diisi halaqah muraja\'ah dan olahraga, dilanjutkan kegiatan keislaman malam ba\'da Maghrib/Isya, hingga istirahat tidur malam pada pukul 21.30 WIB.',
  },
  {
    id: 'faq-3',
    category: 'curriculum',
    question: 'Bagaimana santri membagi waktu antara menghafal Al-Qur\'an 30 juz dan belajar coding/komputer?',
    answer:
      'Kurikulum kami menerapkan manajemen waktu yang harmonis dan terstruktur. Waktu fajar (pagi) dan senja (sore) dikhususkan untuk kejernihan konsentrasi hafalan Al-Qur\'an bersama Muhaffidz. Siang hari santri belajar di laboratorium komputer (Ruang Programming Lantai 3) untuk mengasah logika pemrograman, rekayasa web (React/Next.js), basis data, dan Internet of Things (IoT). Disiplin menghafal Al-Qur\'an justru terbukti melatih ketajaman daya ingat dan ketelitian santri dalam coding.',
  },
  {
    id: 'faq-4',
    category: 'dormitory',
    question: 'Apakah santri diperbolehkan membawa smartphone atau laptop sendiri ke asrama?',
    answer:
      'Untuk menjaga kemurnian fokus hafalan Al-Qur\'an, ketenangan ibadah, dan pembentukan karakter adab, santri dilarang keras membawa smartphone (HP) pribadi, laptop, atau perangkat gadget lainnya ke asrama. Seluruh kebutuhan pembelajaran komputasi dan akses internet telah disediakan secara lengkap, terfasilitasi, dan terfilter di Ruang Programming Lab Komputer Lantai 3 di bawah pengawasan instruktur IT.',
  },
  {
    id: 'faq-5',
    category: 'dormitory',
    question: 'Bagaimana santri berkomunikasi dengan orang tua dan kapan jadwal kunjungan (sambangan)?',
    answer:
      'Komunikasi telepon santri dengan orang tua dijadwalkan secara bergantian setiap akhir pekan (hari Sabtu/Ahad) melalui telepon asrama yang didampingi musyrif. Adapun kunjungan orang tua (sambangan) diizinkan secara berkala pada pekan ke-2 dan pekan ke-4 setiap bulan di area ruang tamu lantai 1 agar ananda dapat beradaptasi secara optimal dengan budaya kemandirian.',
  },
  {
    id: 'faq-6',
    category: 'daily',
    question: 'Bagaimana sistem makan dan pemenuhan gizi santri di pesantren?',
    answer:
      'Santri mendapatkan makan 3 kali sehari (sarapan, makan siang, dan makan malam) yang dimasak higienis di dapur pesantren dengan komposisi gizi seimbang (nasi, lauk berprotein, sayur, buah, dan ekstra puding pada hari tertentu). Air minum bersih isi ulang bersertifikasi juga tersedia bebas di setiap lantai asrama.',
  },
  {
    id: 'faq-7',
    category: 'exam',
    question: 'Apakah ujian seleksi penerimaan santri diadakan secara online atau offline?',
    answer:
      'Sistem seleksi PPDB kami mendukung dua mode: daring (online via Zoom & portal CBT terpadu) untuk calon santri dari luar Jabodetabek/luar pulau, serta luring (offline tatap muka di kampus pesantren) bagi calon santri yang ingin langsung merasakan suasana pesantren. Peserta akan memperoleh nomor sesi, jadwal batch, dan PIN login CBT di portal akun masing-masing.',
  },
  {
    id: 'faq-8',
    category: 'exam',
    question: 'Apa saja materi yang diujikan dalam tes seleksi santri baru?',
    answer:
      'Materi seleksi terdiri dari 3 tahapan terpadu: (1) CBT Akademik (kemampuan dasar Matematika, Bahasa Indonesia, & IPA) dan Tes Psikologi/Logika; (2) Ujian Tahfidz (kelancaran hafalan, fashahah, dan tajwid tilawah Al-Qur\'an); serta (3) Wawancara Terpadu calon santri dan orang tua/wali seputar kesiapan mental berasrama dan komitmen pendidikan.',
  },
  {
    id: 'faq-9',
    category: 'finance',
    question: 'Apakah biaya formulir pendaftaran bisa dikembalikan jika calon santri batal mendaftar?',
    answer:
      'Sesuai klausul baku PPDB PTDARRAHMAN, biaya formulir pendaftaran yang dibayarkan melalui QRIS dinamis bersifat non-refundable (tidak dapat dikembalikan atas alasan apa pun jika pendaftar mengundurkan diri).',
  },
  {
    id: 'faq-10',
    category: 'finance',
    question: 'Bagaimana mekanisme pembayaran biaya masuk dan SPP pendidikan santri?',
    answer:
      'Di dalam portal web PPDB, pendaftar hanya menyelesaikan biaya formulir secara online melalui QRIS. Setelah dinyatakan lulus dan menandatangani Letter of Acceptance (LoA) resmi, penyetoran Uang Muka (DP) dan pelunasan biaya pendidikan dilakukan di luar aplikasi melalui transfer ke rekening bank resmi PTDARRAHMAN atau pembayaran tunai langsung di kantor bendahara pesantren.',
  },
  {
    id: 'faq-11',
    category: 'finance',
    question: 'Apakah tersedia beasiswa bagi calon santri yang berprestasi?',
    answer:
      'Ya! PTDARRAHMAN menyediakan program Beasiswa Tahfidz Qur\'an (untuk penghafal minimal 10 - 30 Juz mutqin), Beasiswa Prestasi Sains & IT Digital, serta Beasiswa Afirmasi Yatim/Dhuafa Berprestasi dengan kuota terbatas setiap angkatan.',
  },
]

export default function FaqPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1')

  const categories = [
    { id: 'all', label: 'Semua Pertanyaan', icon: HelpCircle },
    { id: 'transport', label: 'Antar-Jemput & Transportasi', icon: Bus },
    { id: 'daily', label: 'Jam Sekolah & Harian', icon: Clock },
    { id: 'curriculum', label: 'Kurikulum & IT', icon: Laptop },
    { id: 'dormitory', label: 'Asrama & Gadget', icon: Home },
    { id: 'exam', label: 'Tes Seleksi & Wawancara', icon: ShieldCheck },
    { id: 'finance', label: 'Biaya & Beasiswa', icon: CreditCard },
  ]

  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((faq) => {
      const matchCat = selectedCategory === 'all' || faq.category === selectedCategory
      const matchQuery =
        searchQuery.trim() === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchQuery
    })
  }, [searchQuery, selectedCategory])

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="pt-24 pb-20">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden px-4 py-12 bg-gradient-to-b from-purple-50/50 via-white to-background border-b border-slate-100">
        <div className="container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-bold text-purple-900 border border-purple-200">
            <HelpCircle className="h-3.5 w-3.5 text-purple-700" />
            <span>Pusat Tanya Jawab Orang Tua</span>
          </span>

          <h1 className="mt-4 font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Temukan jawaban cepat seputar kehidupan asrama, jam kegiatan santri, fasilitas antar-jemput, kurikulum tahfidz &amp; IT, hingga sistem pembayaran.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan... (misal: antar-jemput, jam sekolah, laptop)"
              className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm focus:border-emerald-primary focus:outline-none focus:ring-2 focus:ring-emerald-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all',
                  isSelected
                    ? 'bg-emerald-primary text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* FAQs Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id
              return (
                <div
                  key={faq.id}
                  className={cn(
                    'rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-xs',
                    isOpen ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200/90 hover:border-slate-300'
                  )}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50/50"
                    aria-expanded={isOpen}
                  >
                    <span className="font-heading text-base font-bold text-slate-900 pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300',
                        isOpen && 'rotate-180 text-emerald-primary'
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-slate-800">Pertanyaan Tidak Ditemukan</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Coba ubah kata kunci pencarian atau hubungi panitia PPDB langsung melalui kanal komunikasi kami.
              </p>
            </div>
          )}
        </div>

        {/* ── Contact Helpdesk Box ── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-primary">
                Butuh Bantuan Lebih Lanjut?
              </span>
              <h3 className="font-heading text-xl font-extrabold text-slate-900 mt-1">
                Konsultasikan Bersama Tim Panitia PPDB
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
                Tim panitia siap menjawab pertanyaan dan mendampingi proses pendaftaran ananda setiap hari kerja.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/6281283612352?text=Halo%20Panitia%20PPDB%20PTDARRAHMAN,%20saya%20ingin%20bertanya%20mengenai%20pendaftaran%20santri%20baru."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat WhatsApp</span>
              </a>

              <a
                href="mailto:info@ptdarrahman.sch.id"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                <Mail className="h-4 w-4" />
                <span>Email Panitia</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── CTA Banner ── */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-primary to-emerald-dark p-8 text-white text-center shadow-xl">
          <h3 className="font-heading text-xl sm:text-2xl font-extrabold">
            Sudah Mendapatkan Kejelasan Informasi?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-lg mx-auto">
            Segera buat akun pendaftaran online dan jadilah bagian dari santri baru PTDARRAHMAN tahun ajaran baru.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate('/register')}
              className="rounded-full bg-gold-accent px-8 py-3 text-sm font-bold text-emerald-950 shadow-md hover:bg-gold-light"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Daftar Santri Baru
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/auth/login')}
              className="rounded-full border-white/30 bg-white/10 px-7 py-3 text-sm font-bold text-white hover:bg-white/20"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Masuk / Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
