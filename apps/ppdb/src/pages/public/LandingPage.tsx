import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { apiFetch } from '@/api/client'
import {
  ArrowRight, Waves, BookOpen, DollarSign, FileCheck, CalendarCheck,
  HelpCircle, ShieldCheck, Cpu, Award, Sparkles, LogIn, UserPlus,
  Users, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveWaveData {
  active: boolean
  registration_open?: boolean
  registration_status?: string
  id?: string
  name?: string
  period_name?: string
  academic_year?: string
  quota?: number
  paid_count?: number
  form_fee?: number
  minimum_dp?: number
  registration_start_date?: string | null
  registration_end_date?: string | null
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [wave, setWave] = useState<ActiveWaveData | null>(null)

  useEffect(() => {
    apiFetch<ActiveWaveData>('/ppdb/waves/active-public')
      .then((data) => {
        setWave(data)
      })
      .catch(() => {
        setWave({ active: false })
      })
  }, [])

  const isOpen = wave?.active === true || wave?.registration_open === true
  const totalQuota = wave?.quota && wave.quota > 0 ? wave.quota : 30
  const registeredCount = wave?.paid_count || 0
  const remainingQuota = Math.max(0, totalQuota - registeredCount)
  const quotaPercent = Math.min(100, Math.round((registeredCount / totalQuota) * 100))

  const quickNavCards = [
    {
      title: 'Kurikulum & Fasilitas',
      desc: 'Pelajari kurikulum tahfidz 30 juz, coding web, IoT, serta sarana penunjang asrama modern.',
      href: '/kurikulum-fasilitas',
      icon: BookOpen,
      tag: 'Akademik & Sarana',
      color: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Biaya & Beasiswa',
      desc: 'Transparansi rincian biaya formulir, SPP, rincian biaya masuk, diskon gelombang, dan beasiswa.',
      href: '/biaya-beasiswa',
      icon: DollarSign,
      tag: 'Finansial & Bantuan',
      color: 'from-amber-500 to-yellow-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'Syarat & Ketentuan',
      desc: 'Kelengkapan 6 berkas persyaratan, 10 kuesioner kesehatan mandiri, dan komitmen mukim santri.',
      href: '/syarat-ketentuan',
      icon: FileCheck,
      tag: 'Persyaratan & Berkas',
      color: 'from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Alur & Jadwal',
      desc: 'Jadwal penting gelombang, mekanisme batching tes seleksi terpadu CBT H-1, hingga penerbitan LoA.',
      href: '/alur-jadwal',
      icon: CalendarCheck,
      tag: 'Linimasa Seleksi',
      color: 'from-emerald-600 to-emerald-800',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      title: 'FAQ / Tanya Jawab',
      desc: 'Jawaban atas pertanyaan yang paling sering ditanyakan orang tua seputar asrama, jam sekolah, & penjemputan.',
      href: '/faq',
      icon: HelpCircle,
      tag: 'Pusat Bantuan',
      color: 'from-purple-500 to-violet-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ]

  const pillars = [
    {
      icon: Award,
      title: "Tahfidz 30 Juz Bersanad",
      desc: "Bimbingan intensif halaqah harian bersama Muhaffidz berpengalaman dengan target hafalan mutqin dan tradisi tasmi' terbuka.",
    },
    {
      icon: Cpu,
      title: "Rekayasa Teknologi Digital",
      desc: "Santri menguasai pemrograman web modern, perancangan basis data, dan Internet of Things (IoT) di Ruang Programming khusus.",
    },
    {
      icon: ShieldCheck,
      title: "Kemandirian & Adab Asrama",
      desc: "Penempaan karakter akhlak karimah, kepemimpinan, dan kemandirian berasrama penuh yang kondusif tanpa gadget pribadi.",
    },
  ]

  return (
    <div className="pt-20 md:pt-24 pb-16">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden px-4 pt-8 pb-16 sm:pb-20 md:pt-12">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[90vw] max-w-4xl rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="pointer-events-none absolute top-40 right-10 h-72 w-72 rounded-full bg-gold-accent/10 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center">
            {/* Status Wave Announcement Pill */}
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-primary/20 bg-white/80 px-4 py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
              {loading ? (
                <>
                  <Waves className="h-4 w-4 text-slate-400 animate-pulse" />
                  <span className="text-slate-400">Memuat status gelombang...</span>
                </>
              ) : isOpen ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span>
                    Pendaftaran <strong className="text-emerald-primary font-bold">{wave?.name || 'Gelombang Aktif'}</strong> Resmi Dibuka (TA {wave?.academic_year || '2026/2027'})
                  </span>
                </>
              ) : (
                <>
                  <Waves className="h-4 w-4 text-slate-400" />
                  <span>
                    {wave?.registration_status === 'quota_reached'
                      ? 'Kuota Gelombang Penuh'
                      : 'Menunggu Pembukaan Gelombang Baru'}
                  </span>
                </>
              )}
            </div>

            {/* Arabic Verse */}
            <div className="mb-2 font-serif text-2xl text-gold-dark opacity-95 md:text-3xl">
              «اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ»
            </div>
            <p className="text-xs italic text-slate-500 sm:text-sm">
              {'"Bacalah dengan nama Tuhanmu yang menciptakan" — QS. Al-\'Alaq: 1'}
            </p>

            {/* Main Headline */}
            <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[4rem] leading-[1.1]">
              Penerimaan Santri Baru
              <br />
              <span className="bg-gradient-to-r from-emerald-primary to-emerald-dark bg-clip-text text-transparent">
                Pesantren Tahfidz Qur'an dan Digital Ar-Rahman
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm md:text-base text-slate-600 leading-relaxed">
              Mendidik generasi penghafal Al-Qur'an 30 juz yang mutqin sekaligus cakap dalam rekayasa teknologi digital modern, web, dan IoT di era global.
            </p>

            {/* Daya Tampung & Kuota Card Banner */}
            <div className="mt-8 w-full max-w-2xl rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-xl shadow-emerald-950/5 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-primary border border-emerald-100">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Daya Tampung Santri Baru
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 flex items-baseline gap-2">
                      <span>{totalQuota} Santri / Angkatan</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {remainingQuota} Slot Tersisa
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:w-36 text-right">
                    <div className="text-[11px] text-slate-500 mb-1">
                      Keterisian: <span className="font-bold text-slate-700">{quotaPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {wave?.registration_end_date && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Batas Akhir Gelombang:</span>
                  <span className="font-bold text-slate-700">
                    {new Date(wave.registration_end_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Unified CTA Buttons (Daftar / Login) */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Button
                onClick={() => navigate('/register')}
                disabled={!isOpen}
                className={cn(
                  'h-auto gap-2.5 rounded-full px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg transition-all hover:-translate-y-0.5 active:scale-95',
                  isOpen
                    ? 'bg-gradient-to-r from-emerald-primary to-emerald-dark text-white shadow-emerald-primary/30 hover:shadow-emerald-primary/40'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                <UserPlus className="h-5 w-5" />
                <span>Daftar Santri Baru</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/auth/login')}
                className="h-auto gap-2 rounded-full border-slate-300 bg-white/90 px-7 py-3.5 text-sm sm:text-base font-bold text-slate-800 backdrop-blur-md hover:bg-slate-50 hover:border-slate-400"
              >
                <LogIn className="h-4 w-4" />
                <span>Masuk / Login Portal</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Exploration Matrix (Halaman-Halaman Informasi) ── */}
      <section className="relative px-4 py-12 bg-slate-50/70 border-y border-slate-100">
        <div className="container mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              Informasi Lengkap PPDB
            </span>
            <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
              Jelajahi Panduan &amp; Ketentuan Pendaftaran
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Setiap halaman menyajikan informasi transparan untuk membantu Ayah &amp; Bunda mempersiapkan pendidikan ananda.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quickNavCards.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.href}
                  to={card.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md', card.color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-bold', card.badgeBg)}>
                        {card.tag}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-slate-900 group-hover:text-emerald-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-emerald-primary group-hover:gap-2 transition-all">
                    <span>Buka Halaman</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Pillars: Mengapa PTDARRAHMAN? ── */}
      <section className="px-4 py-16 md:py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">
              Keunggulan Unggulan
            </span>
            <h2 className="mt-2 font-heading text-2xl sm:text-4xl font-extrabold text-slate-900">
              Sinergi Al-Qur'an dan Teknologi Masa Depan
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Di PTDARRAHMAN, kami percaya penghafal Al-Qur'an harus tampil percaya diri menjadi inovator dan pelopor teknologi yang berakhlak mulia.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-primary mb-5">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Band ── */}
      <section className="px-4 pt-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-obsidian via-emerald-dark to-emerald-primary px-6 py-12 sm:px-12 sm:py-16 text-center text-white shadow-2xl">
            {/* Arabic Decorative Watermark */}
            <div className="pointer-events-none absolute -bottom-16 -right-8 select-none font-serif text-[14rem] font-bold text-white/5">
              ار
            </div>

            <div className="relative z-10 mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-accent/20 px-3.5 py-1 text-xs font-bold text-gold-accent backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Penerimaan Santri Baru PTDARRAHMAN</span>
              </span>

              <h2 className="mt-4 font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
                Mulai Perjalanan Mulia Ananda Hari Ini
              </h2>
              <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed">
                Bergabunglah bersama keluarga besar PTDARRAHMAN dan wujudkan cita-cita mencetak generasi Qur'ani yang berdaya saing digital internasional.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => navigate('/register')}
                  disabled={!isOpen}
                  className="h-auto gap-2 rounded-full bg-gold-accent px-8 py-3.5 text-sm sm:text-base font-bold text-emerald-dark shadow-lg shadow-gold-accent/30 transition-all hover:bg-gold-light hover:-translate-y-0.5 active:scale-95"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Daftar / Buat Akun Baru</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/auth/login')}
                  className="h-auto gap-2 rounded-full border-white/30 bg-white/10 px-7 py-3.5 text-sm sm:text-base font-bold text-white backdrop-blur-md hover:bg-white/20"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke Akun</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
