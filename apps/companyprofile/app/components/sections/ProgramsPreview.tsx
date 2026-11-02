'use client'

import { useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  animate,
} from 'framer-motion'
import { ArrowRight, BookOpen, Cpu, Globe, Award, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useProgramLinks } from '../../hooks/useProgramLinks'
import TiltCard from '../ui/TiltCard'
import MagneticButton from '../ui/MagneticButton'

import type { Program } from '@/app/lib/types'
import { API_BASE } from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'

const CARD_GAP = 24
// Durasi per item dibuat seimbang (7 detik) agar pergerakan berjalan sangat halus (smooth) dan terus berulang tanpa jeda
const DURATION_PER_ITEM_SECONDS = 7

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  Cpu,
  Globe,
  Award,
}

const programData = [
  {
    id: 'tahfidz',
    icon: BookOpen,
    image: '',
    title: 'Tahfidz Al-Quran',
    desc: 'Hafalan Al-Quran komprehensif — 30 Juz dengan tajwid dan tafsir yang benar.',
    features: ['Hafalan 30 Juz', 'Tajwid & Tashih', 'Studi Tafsir'],
  },
  {
    id: 'digital',
    icon: Cpu,
    image: '',
    title: 'Teknologi Digital',
    desc: 'Coding, AI, robotik, dan keamanan siber — keterampilan siap masa depan.',
    features: ['Coding & AI', 'Robotik & IoT', 'Keamanan Siber'],
  },
  {
    id: 'bilingual',
    icon: Globe,
    image: '',
    title: 'Program Bilingual',
    desc: 'Imersi Bahasa Inggris-Arab dengan penutur asli, siap TOEFL/IELTS.',
    features: ['Imersi Inggris', 'Fasih Arab', 'Persiapan TOEFL'],
  },
  {
    id: 'leadership',
    icon: Award,
    image: '',
    title: 'Akademi Kepemimpinan',
    desc: 'Kepemimpinan karakter, kepercayaan diri, dan visi global.',
    features: ['Pembangunan Karakter', 'Kepemimpinan Proyek', 'Dampak Sosial'],
  },
]

export default function ProgramsPreview({ programs = [] }: { programs?: Program[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const setWidthRef = useRef(0)
  const visibleRef = useRef(true)
  const isSlowedRef = useRef(false)
  const reduced = useReducedMotion()

  const displayPrograms =
    programs.length > 0
      ? programs.slice(0, 4).map((p) => ({
          id: p.slug || p.id,
          icon: iconMap[p.icon] || Sparkles,
          title: p.content?.title || '',
          desc: p.content?.desc || '',
          features: (p.content?.highlights || []).slice(0, 3),
          image: p.image || '',
        }))
      : programData

  const { hrefFor } = useProgramLinks()

  // 3 duplicate sets untuk continuous endless marquee yang konsisten di semua lebar layar
  const duplicatedPrograms = useMemo(() => {
    if (displayPrograms.length === 0) return []
    return [
      ...displayPrograms.map((p, i) => ({ ...p, uniqueKey: `set0-${p.id}-${i}` })),
      ...displayPrograms.map((p, i) => ({ ...p, uniqueKey: `set1-${p.id}-${i}` })),
      ...displayPrograms.map((p, i) => ({ ...p, uniqueKey: `set2-${p.id}-${i}` })),
    ]
  }, [displayPrograms])

  const translateX = useMotionValue(0)

  // Pause rAF loop saat section di luar viewport supaya hemat CPU/baterai
  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting
      },
      { threshold: 0 },
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  useAnimationFrame((_, delta) => {
    const track = trackRef.current
    if (!track || !startedRef.current) return
    if (reduced || !visibleRef.current) return
    const distance = setWidthRef.current
    if (distance <= 0) return

    // Kecepatan melambat halus saat kursor diarahkan ke kartu, namun tetap berputar tanpa berhenti total
    const effectiveDuration = isSlowedRef.current
      ? DURATION_PER_ITEM_SECONDS * 2.5
      : DURATION_PER_ITEM_SECONDS

    const pxPerMs = distance / (displayPrograms.length * effectiveDuration * 1000)
    let next = translateX.get() - pxPerMs * delta

    // Jaminan looping berulang tanpa henti (infinite repeating marquee)
    while (next <= -distance) {
      next += distance
    }
    while (next > 0) {
      next -= distance
    }
    translateX.set(next)
  })

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track || track.children.length === 0) return
      const first = track.children[0] as HTMLElement | undefined
      const second = track.children[displayPrograms.length] as HTMLElement | undefined
      if (first && second) {
        setWidthRef.current = second.offsetLeft - first.offsetLeft
        startedRef.current = setWidthRef.current > 0
      }
    }
    measure()
    const t = window.setTimeout(measure, 300)
    let debounce: ReturnType<typeof setTimeout> | null = null
    let raf = 0
    const onResize = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        raf = requestAnimationFrame(measure)
      }, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', onResize)
      if (debounce) clearTimeout(debounce)
      cancelAnimationFrame(raf)
    }
  }, [displayPrograms.length])

  const nudge = (direction: -1 | 1) => {
    const distance = setWidthRef.current
    const step = distance > 0 ? distance / displayPrograms.length : 380 + CARD_GAP
    const current = translateX.get()
    const target = current - direction * step
    animate(translateX, target, {
      duration: 0.6,
      ease: [0.25, 1, 0.5, 1],
      onComplete: () => {
        if (distance > 0) {
          let normalized = translateX.get()
          while (normalized <= -distance) normalized += distance
          while (normalized > 0) normalized -= distance
          translateX.set(normalized)
        }
      },
    })
  }

  return (
    <section ref={sectionRef} className="relative z-10 overflow-hidden bg-[var(--bg-secondary)] py-16 sm:py-20 md:py-24">
      <div className="relative w-full">
        <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.04]" />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 relative z-10 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-8 sm:mb-12"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center justify-center mb-3"
            >
              <span className="floating-badge-1 section-badge justify-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] text-xs font-semibold tracking-wider uppercase shadow-sm">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-[var(--accent-gold)]" />
                PROGRAM UNGGULAN
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="section-title max-w-3xl mx-auto tracking-tight font-extrabold text-[var(--text)]"
            >
              Empat Pilar Keunggulan{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-[var(--accent)] to-[var(--accent-gold)] bg-clip-text text-transparent font-extrabold drop-shadow-xs">
                PTDARRAHMAN
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="section-subtitle mx-auto mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal max-w-2xl"
            >
              Kedalaman spiritual Al-Qur&apos;an sekaligus penguasaan rekayasa teknologi digital dalam satu kesatuan kurikulum
            </motion.p>
          </motion.div>
        </div>

        {/* Carousel Berjalan Otomatis (Infinite Continuous Marquee Ticker) */}
        <div
          className="relative z-10 w-full overflow-hidden py-4"
          onMouseEnter={() => {
            isSlowedRef.current = true
          }}
          onMouseLeave={() => {
            isSlowedRef.current = false
          }}
          onTouchStart={() => {
            isSlowedRef.current = true
          }}
          onTouchEnd={() => {
            setTimeout(() => {
              isSlowedRef.current = false
            }, 2000)
          }}
        >
          {/* Edge fade overlays */}
          <div
            className="absolute left-0 top-0 bottom-0 z-20 pointer-events-none w-10 sm:w-28"
            style={{ background: 'linear-gradient(90deg, var(--bg-secondary) 0%, transparent 100%)' }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-20 pointer-events-none w-10 sm:w-28"
            style={{ background: 'linear-gradient(270deg, var(--bg-secondary) 0%, transparent 100%)' }}
          />

          <motion.div
            ref={trackRef}
            className="flex items-stretch py-2"
            style={{ gap: CARD_GAP, width: 'max-content', x: translateX }}
          >
            {duplicatedPrograms.map((prog) => {
              const Icon = prog.icon as React.ComponentType<{ className?: string }>
              return (
                <TiltCard
                  key={prog.uniqueKey}
                  className="group w-[min(84vw,340px)] sm:w-[350px] lg:w-[370px] shrink-0"
                >
                  <Link
                    href={hrefFor(prog.id)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      e.currentTarget.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`)
                      e.currentTarget.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`)
                    }}
                    className="glass-card card-spotlight rounded-2xl overflow-hidden !no-underline flex flex-col h-full border border-[var(--color-border)] hover:border-[var(--accent)]/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 bg-[var(--bg-elevated)]"
                  >
                    {prog.image ? (
                      <div className="relative h-36 overflow-hidden bg-[var(--bg)] sm:h-40">
                        <img
                          src={resolveImageSrc(prog.image, API_BASE)}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="relative h-16 sm:h-18 overflow-hidden bg-gradient-to-r from-[var(--accent-subtle)]/70 via-[var(--bg-elevated)] to-[var(--bg)] border-b border-[var(--color-border)]/60 flex items-center px-5 sm:px-6">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--color-border)] shadow-sm flex items-center justify-center text-[var(--accent)] group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-[var(--accent)]/5 to-transparent pointer-events-none" />
                      </div>
                    )}

                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      {prog.image && (
                        <div className="flex items-center justify-end -mt-8 sm:-mt-9 mb-2 relative z-10">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--color-border)] shadow-md flex items-center justify-center group-hover:scale-110 transition-transform text-[var(--accent)]">
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>
                      )}

                      <h3 className="font-[var(--font-display)] text-lg sm:text-xl font-bold text-[var(--text)] mb-2 group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all duration-300 leading-snug">
                        {prog.title}
                      </h3>

                      <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed font-medium text-[var(--text-secondary)] group-hover:text-[var(--text)] transition-colors duration-300 mb-4">
                        {prog.desc}
                      </p>

                      <div className="space-y-2 mb-6 flex-1">
                        {prog.features.slice(0, 3).map((f, j) => (
                          <div
                            key={j}
                            className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text)] group-hover:translate-x-1 transition-all duration-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 shadow-[0_0_8px_var(--accent)] group-hover:scale-125 group-hover:shadow-[0_0_12px_var(--accent)] transition-all duration-300" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                      </div>

                      <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--accent)] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:gap-3 transition-all duration-300 mt-auto pt-4 border-t border-[var(--color-border)]">
                        <span>Pelajari Selengkapnya</span>
                        <ArrowRight className="w-4 h-4 transform transition-transform duration-300 ease-out group-hover:translate-x-2" />
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              )
            })}
          </motion.div>
        </div>

        {/* Navigasi Carousel Manual (Prev / Next buttons) */}
        {displayPrograms.length > 1 ? (
          <div className="relative z-10 mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Program sebelumnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--bg-elevated)] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Program berikutnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--bg-elevated)] text-[var(--text)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        {/* CTA ke Halaman Lengkap Programs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-10 sm:mt-14 text-center"
        >
          <MagneticButton strength={0.3}>
            <Link
              href="/programs"
              className="btn-primary inline-flex items-center gap-2.5 text-sm px-6 py-3 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
            >
              <span>Lihat Rincian Kurikulum & Semua Program</span>
              <ArrowRight className="w-4 h-4 transform transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
