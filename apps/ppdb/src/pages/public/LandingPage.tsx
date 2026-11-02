import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ShapeDivider } from '@/components/ui'
import { apiFetch, API_BASE } from '@/api/client'
import { useBrand } from '@repo/ui'
import { cn } from '@/lib/utils'
import {
  ArrowRight, LogIn, Menu, X, Wallet, FileUp, ClipboardCheck, Trophy,
  LayoutDashboard, Zap, Headphones, Waves, UserCheck, BookOpen, Globe2,
  TrendingUp, Users,
} from 'lucide-react'
import Footer from '@/components/layout/Footer'

interface ActiveWave {
  active: boolean
  name?: string
  allowed_levels?: string[]
  registration_start_date?: string | null
  registration_end_date?: string | null
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [wave, setWave] = useState<ActiveWave | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const { logoUrl } = useBrand(API_BASE)

  useEffect(() => {
    // prefers-reduced-motion: Skrip parallax dihapus, diganti listener scroll native biasa.
    // Tidak ada lagi Lenis atau GSAP — hanya listen scroll standar untuk:
    // - Navbar state saat scroll
    // - Garis progress di navbar
    const handleScroll = () => {
      setScrolled(window.scrollY > 80)
      const bar = progressRef.current
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
        bar.style.transform = `scaleX(${ratio})`
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  useEffect(() => {
    apiFetch<ActiveWave>('/ppdb/waves/active-public')
      .then((data) => setWave(data.active ? data : { active: false }))
      .catch(() => setWave({ active: false }))
  }, [])

  const isOpen = wave?.active === true
  const year = new Date().getFullYear()

  const scrollToAlur = () => {
    document.getElementById('alur')?.scrollIntoView({ behavior: 'smooth' })
  }

  const steps = [
    { icon: Wallet, title: 'Daftar & Bayar', desc: 'Isi formulir pendaftaran dan selesaikan biaya formulir pada gelombang yang aktif.' },
    { icon: FileUp, title: 'Upload Dokumen', desc: 'Unggah berkas persyaratan untuk diverifikasi oleh panitia.' },
    { icon: ClipboardCheck, title: 'Seleksi & Ujian', desc: 'Ikuti tahapan seleksi sesuai jadwal yang telah Anda pilih.' },
    { icon: Trophy, title: 'Pengumuman & LoA', desc: 'Lihat hasil kelulusan dan tanda tangani Letter of Acceptance (LoA) secara digital.' },
  ]

  // Radius navbar, dipakai bersama oleh <header> DAN wrapper garis progress
  // supaya sudutnya tidak desync saat transisi.
  //
  // Setengah tinggi bar: h-16 = 64px → 32px, md:h-20 = 80px → 40px. Angka ini
  // membuat bentuknya tetap persis stadium/pill seperti `rounded-full`, TAPI
  // rentang interpolasinya realistis (32px ↔ 40px, bukan 9999px ↔ 0) sehingga
  // transisi lengkung → kotak terasa linear dan halus.
  const PILL_RADIUS = 'rounded-[2rem] md:rounded-[2.5rem]'
  const PILL_RADIUS_OFF = 'rounded-none'

  const features = [
    { icon: LayoutDashboard, title: 'Sistem Terintegrasi', desc: 'Pendaftaran, seleksi, hingga pengumuman dapat dipantau dari satu dashboard.', tint: 'bg-emerald-light text-emerald-primary' },
    { icon: Zap, title: 'Transparan & Cepat', desc: 'Proses seleksi dan informasi kelulusan dilakukan secara transparan dan seketika.', tint: 'bg-gold-bg text-gold-dark' },
    { icon: Headphones, title: 'Dukungan Panitia', desc: 'Tim panitia siap sedia mendampingi proses pendaftaran Anda jika mengalami kendala.', tint: 'bg-emerald-light text-emerald-primary' },
  ]

  // Navigation sections for easy scrolling
  const sections = [
    { id: 'hero', label: 'Beranda' },
    { id: 'program-unggulan', label: 'Program Unggulan' },
    { id: 'alur', label: 'Alur Pendaftaran' },
    { id: 'mengapa', label: 'Mengapa PTDARRAHMAN?' },
    { id: 'cta', label: 'Daftar Sekarang' },
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const scrollToNextSection = () => {
    const currentScroll = window.scrollY
    const windowHeight = window.innerHeight
    
    // Find the next section that's not fully visible
    let nextSection = null
    let minDistance = Infinity
    
    sections.forEach(section => {
      const element = document.getElementById(section.id)
      if (element) {
        const rect = element.getBoundingClientRect()
        const distance = Math.abs(rect.top - windowHeight / 2)
        if (distance < minDistance && rect.top > 0) {
          minDistance = distance
          nextSection = section
        }
      }
    })
    
    if (nextSection) {
      scrollToSection(nextSection.id)
    }
  }

  const scrollToPreviousSection = () => {
    const currentScroll = window.scrollY
    
    // Find the previous section
    let previousSection = null
    let maxDistance = -Infinity
    
    sections.forEach(section => {
      const element = document.getElementById(section.id)
      if (element) {
        const rect = element.getBoundingClientRect()
        const distance = rect.top
        if (distance > 0 && distance < maxDistance) {
          maxDistance = distance
          previousSection = section
        }
      }
    })
    
    if (previousSection) {
      scrollToSection(previousSection.id)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans">
      {/* ── Navbar ──
          Efek disamakan dengan `apps/companyprofile/app/components/layout/Navbar.tsx`:
          saat di-scroll, navbar lepas dari tepi layar dan berubah jadi pil
          melayang (inset + rounded penuh + shadow lembut), dan muncul garis
          progress gold → emerald di tepi bawahnya.

          PENTING soal radius: state "melayang" sengaja TIDAK pakai
          `rounded-full`. `rounded-full` = 9999px, jadi interpolasi 9999px → 0
          (lengkung → kotak) nyaris tidak kelihatan selama ~90% durisi, baru
          snap ke kotak di frame terakhir. Itu yang bikin transisinya terasa
          "nge-lag"/kurang halus. Nilai px yang realistis (setengah tinggi bar)
          bikin interpolasinya linear, dan secara visual tetap persis pill. */}
      <header
        className={cn(
          // z-50 di navbar PPDB.
          'fixed z-50 ease-brand-pill',
          'transition-[left,right,top,max-width,border-radius,background-color,box-shadow,border-color]',
        scrolled
          ? cn('left-2 right-2 top-2 mx-auto max-w-6xl border border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl md:left-8 md:right-8 md:top-4', PILL_RADIUS)
          : cn('left-0 right-0 top-0 mx-auto max-w-[100vw] border border-transparent bg-white/85 shadow-sm backdrop-blur-2xl', PILL_RADIUS_OFF)
      )}>
        {/* Scroll progress line — radiusnya HARUS sama persis dengan header,
            kalau tidak sudutnya desync saat transisi. */}
        <div className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden ease-brand-pill transition-[border-radius]',
          scrolled ? PILL_RADIUS : PILL_RADIUS_OFF
        )}>
          <div
            ref={progressRef}
            className="absolute bottom-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-gold-accent to-emerald-primary"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20">
            <div className="flex min-w-0 items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="PTD-Arrahman Logo" className="h-9 w-auto max-w-36 object-contain" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-lg text-white shadow-sm shadow-emerald-primary/20">
                  ار
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-heading text-base font-bold text-foreground">PTD-Arrahman</div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">PPDB Online</div>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" onClick={() => navigate('/auth/login')} className="gap-2 rounded-full font-semibold text-foreground hover:text-primary">
                <LogIn className="h-4 w-4" /> Masuk
              </Button>
              <Button onClick={() => navigate('/register')} className="gap-2 rounded-full bg-primary px-5 font-semibold shadow-md shadow-emerald-primary/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-dark hover:shadow-lg">
                Daftar Sekarang
              </Button>
            </div>

            <button
              onClick={() => setMobileOpen(p => !p)}
              aria-label="Buka/tutup menu"
              aria-expanded={mobileOpen}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-slate-100 sm:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu — ikut rounding pil biar panelnya tidak "gantung"
              dari bar atas yang sudah rounded. */}
          {mobileOpen && (
            <div className={cn(
              'border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur-2xl sm:hidden',
              scrolled ? 'rounded-b-2xl' : 'rounded-b-none'
            )}>
              <Button variant="ghost" onClick={() => navigate('/auth/login')} className="mb-2 w-full justify-start gap-2 rounded-xl font-semibold">
                <LogIn className="h-4 w-4" /> Masuk
              </Button>
              <Button onClick={() => navigate('/register')} className="w-full gap-2 rounded-xl font-semibold">
                Daftar Sekarang <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
      </header>

      {/* ── Hero ── */}
      <div className="hero-column relative flex flex-col items-center text-center">
                {/* Status pill (PPDB specific) */}
                {wave && (
                  <div className="mb-5 flex flex-col items-center gap-2 animate-fade-in sm:mb-12">
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-primary/20 bg-white/70 px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
                      {isOpen ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                          </span>
                          <span>
                            Pendaftaran <span className="text-emerald-primary">{wave.name ?? 'Gelombang Baru'}</span> dibuka
                          </span>
                        </>
                      ) : (
                        <>
                          <Waves className="h-4 w-4 text-slate-400" />
                          <span>Menunggu Gelombang Baru</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Arabic Quote — satu unit dengan terjemahannya di bawah */}
                <div className="arabic-quote mb-2 text-xl text-gold-dark opacity-90 sm:text-2xl md:text-3xl">
                  «اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ»
                </div>
                <p className="text-sm italic text-slate-500 sm:text-base">
                  {'"Bacalah dengan nama Tuhanmu yang menciptakan" — Al-Alaq 96:1'}
                </p>

                {/* 2 baris, bukan 3. Sebelumnya "Pesantren" (9) / "Tahfidz" (7) /
                    "& Digital Arrahman" (17) — baris ketiga hampir dua kali
                    lebar baris pertama, jadi rag-nya rusak. Sekarang 17/17. */}
                <h1 className="mt-5 text-center font-brand text-[2.25rem] font-bold leading-[1.06] tracking-[-0.015em] text-obsidian sm:mt-10 sm:text-5xl sm:leading-[1.02] md:text-6xl lg:text-7xl lg:leading-[0.98] xl:text-[5.5rem]">
                  Pesantren Tahfidz
                  <br />
                  <span className="text-emerald-primary">&amp; Digital Arrahman</span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-6 sm:text-base sm:text-lg md:text-xl">
                  {"Mencetak penghafal Al-Qur'an yang khatam sekaligus melek teknologi digital — dua hal yang berjalan beriringan."}
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-5">
                  <Button
                    onClick={() => navigate('/register')}
                    disabled={!isOpen}
                    className={cn(
                      'h-auto gap-2 rounded-full px-6 py-3 text-sm font-bold sm:px-8 sm:py-4 sm:text-base',
                      isOpen
                        ? 'bg-emerald-primary text-white shadow-lg shadow-emerald-primary/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-dark hover:shadow-xl'
                        : 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {isOpen ? 'Daftar Sekarang' : 'Menunggu Gelombang Baru'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={scrollToAlur}
                    className="h-auto gap-2 rounded-full border-emerald-primary/45 bg-white/60 px-6 py-3 text-sm font-bold text-emerald-primary backdrop-blur-md transition-all hover:border-emerald-primary hover:bg-emerald-primary/10 sm:px-8 sm:py-4 sm:text-base"
                  >
                    Lihat Alur Pendaftaran
</Button>
                </div>
        </div>
      {/* ── Program Unggulan ── */}
      {/* Program 4 pilar yang menggabungkan spiritual depth dan penguasaan digital */}
      <section id="program-unggulan" className="relative scroll-mt-16 overflow-hidden bg-gradient-to-br from-emerald-primary/5 to-emerald-light/20 py-20 md:py-28">
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-primary">PROGRAM UNGGULAN</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Empat Pilar Keunggulan Ar-Rahman
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              <span className="font-semibold text-emerald-primary">Kedalaman spiritual</span> sekaligus <span className="font-semibold text-emerald-primary">penguasaan digital</span> dalam satu program terintegrasi.
              Empat pilar ini berjalan beriringan untuk mencetak generasi Qur'ani yang siap menghadapi tantangan era digital.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-lg shadow-emerald-primary/25">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -right-3 -top-3 text-[5rem] font-bold leading-none text-emerald-primary/10 transition-colors group-hover:text-emerald-primary/20">
                01
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Kedalaman Spiritualitas</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Hafalan Al-Qur'an dengan tajwid sempurna, tadabur ayat, dan pembinaan akhlak Islami yang mendalam.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-lg shadow-emerald-primary/25">
                <Globe2 className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -right-3 -top-3 text-[5rem] font-bold leading-none text-emerald-primary/10 transition-colors group-hover:text-emerald-primary/20">
                02
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Penguasaan Digital</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Keterampilan teknologi modern, coding, dan literasi digital untuk berkontribusi di era 4.0.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-lg shadow-emerald-primary/25">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -right-3 -top-3 text-[5rem] font-bold leading-none text-emerald-primary/10 transition-colors group-hover:text-emerald-primary/20">
                03
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Kepemimpinan Berkarakter</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Kepemimpinan yang berbasis iman, integritas, dan kemampuan beradaptasi di berbagai lingkungan.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-lg shadow-emerald-primary/25">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -right-3 -top-3 text-[5rem] font-bold leading-none text-emerald-primary/10 transition-colors group-hover:text-emerald-primary/20">
                04
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Dukungan Komunitas</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Jaringan sosial yang solid, mentoring intensif, dan dukungan penuh dari seluruh warga pesantren.
              </p>
            </div>
          </div>

          <div className="mt-14 text-center">
            <p className="inline-flex items-center gap-2 text-sm text-slate-600">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-primary/30" />
              <span className="text-emerald-primary">Terintegrasi secara holistik</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-primary/30" />
            </p>
          </div>
        </div>
      </section>

      {/* ── Alur Pendaftaran ── */}
      {/* pt-40 menutupi wave 137px di atas section ini. `border-t` lama
          dihapus karena garis 1px itu akan memotong tepi gelombang. */}
      <section id="alur" className="relative scroll-mt-16 overflow-hidden bg-white pb-16 pt-40 md:pb-20 md:pt-44">
        <ShapeDivider fill="#F0EDE4" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Alur Pendaftaran</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Empat Langkah Menuju PTDARRAHMAN
            </h2>
            <p className="mt-3 text-slate-500">
              Simak dan ikuti setiap tahapan pendaftaran dengan teliti agar proses berjalan lancar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="group relative z-30 overflow-hidden rounded-2xl border border-slate-100 bg-ivory/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-primary/20 hover:bg-white hover:shadow-lg hover:shadow-emerald-primary/10">
                  <span className="pointer-events-none absolute -right-2 -top-3 select-none font-heading text-7xl font-extrabold text-emerald-primary/[0.06] transition-colors group-hover:text-emerald-primary/10">
                    {i + 1}
                  </span>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-md shadow-emerald-primary/20 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5 text-white" />
                    </span>
                    <span className="font-heading text-sm font-bold text-gold-dark">Langkah {i + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Keunggulan ── */}
      <section id="mengapa" className="relative overflow-hidden bg-background pb-16 pt-40 md:pb-20 md:pt-44">
        <ShapeDivider fill="#FFFFFF" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          {/* z-10 + z-30 di bawah dipertahankan darizai ketika globe masih ada;
              globe-nya sudah dihapus, tapi nilainya tidak merusak apa pun. */}
          <div className="relative z-10 mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Mengapa PTDARRAHMAN?</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Sistem Pendaftaran Modern &amp; Terpercaya
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="relative z-30 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent" />
                  <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', f.tint)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section id="cta" className="bg-background pb-16 md:pb-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-obsidian via-emerald-dark to-emerald-primary px-6 py-14 text-center shadow-2xl shadow-emerald-dark/30 md:py-16">
            <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-emerald-bright/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-6 select-none font-heading text-[12rem] font-bold leading-none text-white/[0.06]">
              ار
            </div>
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-accent">PPDB {year === 2026 ? '2026' : year}</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Siap Membangun Generasi Qur'ani?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Bergabunglah bersama kami dan jadilah bagian dari generasi yang berakhlak mulia, unggul dalam ilmu, dan
                kompetitif di era digital.
              </p>
              <Button
                onClick={() => navigate('/register')}
                disabled={!isOpen}
                className="mt-8 h-auto gap-2 rounded-full bg-gold-accent px-9 py-3.5 text-base font-bold text-emerald-dark shadow-lg shadow-gold-accent/30 transition-all hover:-translate-y-0.5 hover:bg-gold-light hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isOpen ? <>Daftar Sekarang <ArrowRight className="h-5 w-5" /></> : 'Menunggu Gelombang Baru'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>

    {/* Navigation Dots - Bottom Center */}
    <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 transform">
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
        {sections.map((section, index) => {
          const isActive = () => {
            const element = document.getElementById(section.id)
            if (!element) return false
            const rect = element.getBoundingClientRect()
            return rect.top <= 100 && rect.bottom >= 100
          }
          
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'w-10 h-10 rounded-full text-sm font-medium transition-all duration-300',
                isActive()
                  ? 'bg-emerald-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
              )}
              aria-label={`Ke ${section.label}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
    </div>

    {/* Scroll Navigation Arrows - Right Side */}
    <div className="fixed right-4 top-1/2 z-40 -translate-y-1/2 hidden transform flex-col gap-4 md:flex">
      <button
        onClick={scrollToPreviousSection}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-emerald-primary/10"
        aria-label="Bagian sebelumnya"
      >
        <svg className="h-6 w-6 rotate-90 text-emerald-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
      <button
        onClick={scrollToNextSection}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-emerald-primary/10"
        aria-label="Bagian berikutnya"
      >
        <svg className="h-6 w-6 -rotate-90 text-emerald-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 14l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>

    {/* Scroll to Top Button - Bottom Right */}
    <button
      onClick={() => scrollToSection('hero')}
      className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
      aria-label="Kembali ke atas"
    >
      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  )
}
