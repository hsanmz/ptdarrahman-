import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useBrand } from '@repo/ui'
import { API_BASE } from '@/api/client'
import {
  Menu, X, ChevronDown, UserPlus, LogIn, BookOpen,
  DollarSign, FileCheck, CalendarCheck, HelpCircle, Sparkles
} from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { prefersReducedMotion } from '@/lib/motion'

interface NavLinkItem {
  name: string
  href: string
  icon?: any
}

const NAV_LINKS: NavLinkItem[] = [
  { name: 'Beranda', href: '/' },
  { name: 'Kurikulum & Fasilitas', href: '/kurikulum-fasilitas', icon: BookOpen },
  { name: 'Biaya & Beasiswa', href: '/biaya-beasiswa', icon: DollarSign },
  { name: 'Syarat & Ketentuan', href: '/syarat-ketentuan', icon: FileCheck },
  { name: 'Alur & Jadwal', href: '/alur-jadwal', icon: CalendarCheck },
  { name: 'FAQ', href: '/faq', icon: HelpCircle },
]

export default function PublicNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logoUrl } = useBrand(API_BASE)

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [ctaDropdownOpen, setCtaDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
    setCtaDropdownOpen(false)
  }, [location.pathname])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCtaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    if (prefersReducedMotion()) {
      const onScroll = () => {
        setScrolled(window.scrollY > 40)
        const bar = progressRef.current
        if (bar) {
          const max = document.documentElement.scrollHeight - window.innerHeight
          const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
          bar.style.transform = `scaleX(${ratio})`
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      onScroll()
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }

    const lenis = new Lenis()
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)

    let navScrolled = false
    const applyNavScrolled = () => {
      const next = lenis.scroll > 40
      if (next === navScrolled) return
      navScrolled = next
      setScrolled(next)
    }

    const updateScrollProgress = () => {
      const bar = progressRef.current
      if (!bar) return
      const max = ScrollTrigger.maxScroll(window)
      const ratio = max > 0 ? Math.min(1, Math.max(0, lenis.scroll / max)) : 0
      bar.style.transform = `scaleX(${ratio})`
    }

    const tick = (time: number) => {
      lenis.raf(time * 1000)
      updateScrollProgress()
      applyNavScrolled()
    }

    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    updateScrollProgress()
    applyNavScrolled()

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (lenisRef.current === lenis) lenisRef.current = null
    }
  }, [])

  const PILL_RADIUS = 'rounded-[2rem] md:rounded-[2.5rem]'
  const PILL_RADIUS_OFF = 'rounded-none'

  return (
    <header
      className={cn(
        'fixed z-50 ease-brand-pill transition-[left,right,top,max-width,border-radius,background-color,box-shadow,border-color]',
        scrolled
          ? cn(
              'left-2 right-2 top-2 mx-auto max-w-7xl border border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl md:left-6 md:right-6 md:top-3',
              PILL_RADIUS
            )
          : cn('left-0 right-0 top-0 mx-auto max-w-[100vw] border border-transparent bg-white/90 shadow-sm backdrop-blur-2xl', PILL_RADIUS_OFF)
      )}
    >
      {/* Scroll Progress Bar */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden ease-brand-pill transition-[border-radius]',
          scrolled ? PILL_RADIUS : PILL_RADIUS_OFF
        )}
      >
        <div
          ref={progressRef}
          className="absolute bottom-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-gold-accent via-emerald-primary to-emerald-dark"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <div className="container mx-auto flex h-16 items-center justify-between px-3 md:h-20 md:px-6">
        {/* Logo & Institution Identity */}
        <Link to="/" className="group flex min-w-0 items-center gap-2.5 transition-transform hover:scale-[1.01]">
          {logoUrl ? (
            <img src={logoUrl} alt="PTDARRAHMAN Logo" className="h-9 w-auto max-w-36 object-contain" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-lg text-white shadow-sm shadow-emerald-primary/20">
              ار
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-heading text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              PTDARRAHMAN
            </div>
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1">
              <span>PPDB Santri Baru</span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200',
                  isActive
                    ? 'bg-emerald-primary/10 text-emerald-primary shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-emerald-primary hover:bg-slate-100/70'
                )}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Right CTA Area: Unified "Daftar / Login" */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Unified Daftar / Login Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCtaDropdownOpen((prev) => !prev)}
              className={cn(
                'group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-primary to-emerald-dark px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-primary/25 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95',
                ctaDropdownOpen && 'ring-2 ring-emerald-primary/40 ring-offset-2'
              )}
              aria-expanded={ctaDropdownOpen}
              aria-label="Menu Daftar atau Login"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-accent transition-transform group-hover:rotate-12" />
              <span>Daftar / Login</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-200', ctaDropdownOpen && 'rotate-180')}
              />
            </button>

            {/* Dropdown Menu */}
            {ctaDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-50">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Portal PPDB PTDARRAHMAN
                </div>

                <button
                  onClick={() => {
                    setCtaDropdownOpen(false)
                    navigate('/register')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-emerald-50 hover:text-emerald-primary"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-primary">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Daftar Akun Baru</div>
                    <div className="text-xs text-slate-500">Pendaftaran calon santri baru</div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setCtaDropdownOpen(false)
                    navigate('/auth/login')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <LogIn className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Masuk / Login</div>
                    <div className="text-xs text-slate-500">Portal santri & panitia PPDB</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Buka menu navigasi"
          aria-expanded={mobileOpen}
          className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className={cn(
            'border-t border-slate-100 bg-white/98 px-5 py-5 backdrop-blur-2xl shadow-xl lg:hidden',
            scrolled ? 'rounded-b-3xl' : 'rounded-b-none'
          )}
        >
          <nav className="flex flex-col space-y-1 pb-4">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all',
                    isActive
                      ? 'bg-emerald-primary/10 text-emerald-primary'
                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-emerald-primary'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                  <span>{link.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Unified CTA in Mobile Drawer */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Aksi PPDB (Daftar / Login)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/auth/login')
                }}
                className="w-full gap-2 rounded-xl text-xs font-bold border-slate-200 justify-center"
              >
                <LogIn className="h-4 w-4" /> Masuk Portal
              </Button>
              <Button
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/register')
                }}
                className="w-full gap-2 rounded-xl text-xs font-bold bg-emerald-primary text-white justify-center shadow-md shadow-emerald-primary/20"
              >
                <UserPlus className="h-4 w-4" /> Daftar Baru
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
