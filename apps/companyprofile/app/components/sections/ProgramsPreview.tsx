'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'

import { ArrowRight, BookOpen, Cpu, Globe, Award, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useProgramLinks } from '../../hooks/useProgramLinks'
import TiltCard from '../ui/TiltCard'

import type { Program } from '@/app/lib/types'
import { API_BASE } from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'

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

  // 3 duplicate sets untuk carousel loop tanpa batas (infinite seamless circular scroll)
  const infinitePrograms = useMemo(() => {
    if (displayPrograms.length === 0) return []
    return [
      ...displayPrograms.map((p, i) => ({ ...p, uniqueKey: `set0-${p.id}-${i}` })),
      ...displayPrograms.map((p, i) => ({ ...p, uniqueKey: `set1-${p.id}-${i}` })),
      ...displayPrograms.map((p, i) => ({ ...p, uniqueKey: `set2-${p.id}-${i}` })),
    ]
  }, [displayPrograms])

  const stripRef = useRef<HTMLDivElement>(null)
  const { hrefFor } = useProgramLinks()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const virtualIndexRef = useRef(displayPrograms.length)
  const isTeleporting = useRef(false)
  const isScrollingProgrammatically = useRef(false)

  // Inisialisasi posisi awal di Set ke-1 (tengah)
  useEffect(() => {
    if (!stripRef.current) return
    const container = stripRef.current
    const children = Array.from(container.children) as HTMLElement[]
    const N = displayPrograms.length
    if (children[N]) {
      container.scrollLeft = children[N].offsetLeft - container.offsetLeft
      virtualIndexRef.current = N
      setActiveIndex(0)
    }
  }, [displayPrograms.length])

  const handleScroll = useCallback(() => {
    if (!stripRef.current || isTeleporting.current) return
    const container = stripRef.current
    const scrollLeft = container.scrollLeft
    const children = Array.from(container.children) as HTMLElement[]
    const N = displayPrograms.length
    if (children.length === 0 || N === 0) return

    let closestIndex = 0
    let minDiff = Infinity
    children.forEach((child, idx) => {
      const diff = Math.abs(child.offsetLeft - container.offsetLeft - scrollLeft)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = idx
      }
    })

    if (!isScrollingProgrammatically.current) {
      virtualIndexRef.current = closestIndex
    }
    setActiveIndex(closestIndex % N)

    // Silent seamless wrap jika di-swipe manual oleh pengguna melampaui batas tengah
    if (closestIndex >= N * 2 && children[closestIndex - N]) {
      isTeleporting.current = true
      container.style.scrollSnapType = 'none'
      container.scrollLeft = children[closestIndex - N].offsetLeft - container.offsetLeft
      virtualIndexRef.current = closestIndex - N
      requestAnimationFrame(() => {
        if (container) container.style.scrollSnapType = ''
        isTeleporting.current = false
      })
    } else if (closestIndex < N && children[closestIndex + N]) {
      isTeleporting.current = true
      container.style.scrollSnapType = 'none'
      container.scrollLeft = children[closestIndex + N].offsetLeft - container.offsetLeft
      virtualIndexRef.current = closestIndex + N
      requestAnimationFrame(() => {
        if (container) container.style.scrollSnapType = ''
        isTeleporting.current = false
      })
    }
  }, [displayPrograms.length])

  const scrollToProgram = useCallback(
    (index: number) => {
      if (!stripRef.current) return
      const container = stripRef.current
      const children = Array.from(container.children) as HTMLElement[]
      const N = displayPrograms.length
      if (N === 0) return

      if (children[index]) {
        isScrollingProgrammatically.current = true
        virtualIndexRef.current = index
        setActiveIndex(index % N)

        container.scrollTo({
          left: children[index].offsetLeft - container.offsetLeft,
          behavior: 'smooth',
        })

        // Setelah animasi geser selesai, normalkan posisi virtual ke set tengah secara senyap
        setTimeout(() => {
          isScrollingProgrammatically.current = false
          if (!stripRef.current) return
          const currentChildren = Array.from(stripRef.current.children) as HTMLElement[]
          const targetIndex = virtualIndexRef.current
          if (targetIndex >= N * 2 && currentChildren[targetIndex - N]) {
            stripRef.current.style.scrollSnapType = 'none'
            stripRef.current.scrollLeft =
              currentChildren[targetIndex - N].offsetLeft - stripRef.current.offsetLeft
            virtualIndexRef.current = targetIndex - N
            requestAnimationFrame(() => {
              if (stripRef.current) stripRef.current.style.scrollSnapType = ''
            })
          } else if (targetIndex < N && currentChildren[targetIndex + N]) {
            stripRef.current.style.scrollSnapType = 'none'
            stripRef.current.scrollLeft =
              currentChildren[targetIndex + N].offsetLeft - stripRef.current.offsetLeft
            virtualIndexRef.current = targetIndex + N
            requestAnimationFrame(() => {
              if (stripRef.current) stripRef.current.style.scrollSnapType = ''
            })
          }
        }, 450)
      }
    },
    [displayPrograms.length]
  )

  const scrollPrograms = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = virtualIndexRef.current + direction
      scrollToProgram(nextIndex)
      // Jeda sejenak auto-scroll jika pengguna menavigasi manual
      setIsPaused(true)
      setTimeout(() => setIsPaused(false), 4500)
    },
    [scrollToProgram]
  )

  // Otomatis berjalan (Auto-play carousel bergulir tanpa henti)
  useEffect(() => {
    if (isPaused || displayPrograms.length <= 1) return

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      const nextIndex = virtualIndexRef.current + 1
      scrollToProgram(nextIndex)
    }, 3500)

    return () => clearInterval(timer)
  }, [isPaused, displayPrograms.length, scrollToProgram])

  return (
    <section className="relative z-10 overflow-hidden bg-[var(--bg-secondary)] py-16 sm:py-20 md:py-24">
      <div className="relative w-full">
        <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.04]" />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 relative z-10 shrink-0">
          <div className="text-center mb-8 sm:mb-12">
            <span className="section-badge justify-center">PROGRAM UNGGULAN</span>
            <h2 className="section-title max-w-3xl mx-auto">
              Empat Pilar Keunggulan PTDARRAHMAN
            </h2>
            <p className="section-subtitle mx-auto mt-3 sm:mt-4 text-sm sm:text-base">
              Kedalaman spiritual Al-Qur'an sekaligus penguasaan rekayasa teknologi digital dalam satu kesatuan kurikulum
            </p>
          </div>
        </div>

        {/* Layout Kartu:
            - Horizontal snap scroll looping tanpa batas
        */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div
            ref={stripRef}
            onScroll={handleScroll}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => {
              setTimeout(() => setIsPaused(false), 3000)
            }}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 sm:gap-6 overflow-x-auto pb-4"
          >
            {infinitePrograms.map((prog) => {
              const Icon = prog.icon as React.ComponentType<{ className?: string }>
              return (
                <TiltCard
                  key={prog.uniqueKey}
                  className="group w-[min(84vw,360px)] sm:w-[360px] lg:w-[380px] shrink-0 snap-start"
                >
                  <Link
                    href={hrefFor(prog.id)}
                    className="glass-card rounded-2xl overflow-hidden !no-underline flex flex-col h-full border border-[var(--color-border)] hover:border-[var(--accent)]/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
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

                      <h3 className="font-[var(--font-display)] text-lg sm:text-xl font-bold text-[var(--text)] mb-2 group-hover:text-[var(--accent)] transition-colors leading-snug">
                        {prog.title}
                      </h3>

                      <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed font-medium text-[var(--text-secondary)] mb-4">
                        {prog.desc}
                      </p>

                      <div className="space-y-2 mb-6 flex-1">
                        {prog.features.slice(0, 3).map((f, j) => (
                          <div
                            key={j}
                            className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[var(--text-secondary)]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 shadow-[0_0_6px_var(--accent)]" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                      </div>

                      <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--accent)] group-hover:gap-3 transition-all mt-auto pt-4 border-t border-[var(--color-border)]">
                        Pelajari Selengkapnya
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              )
            })}
          </div>
        </div>

        {/* Navigasi Carousel (Dot indicators + tombol prev/next) */}
        {displayPrograms.length > 1 ? (
          <div className="relative z-10 mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollPrograms(-1)}
              aria-label="Program sebelumnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--bg-elevated)] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Simbol bulat di tengah navigasi */}
            <div className="flex items-center gap-2.5 px-1">
              {displayPrograms.map((prog, idx) => {
                const isActive = idx === activeIndex
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => {
                      const N = displayPrograms.length
                      scrollToProgram(N + idx)
                      setIsPaused(true)
                      setTimeout(() => setIsPaused(false), 4500)
                    }}
                    aria-label={`Lihat program: ${prog.title}`}
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer ${
                      isActive
                        ? 'scale-125 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]'
                        : 'bg-[var(--border-strong)] opacity-50 hover:opacity-100 hover:scale-110'
                    }`}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollPrograms(1)}
              aria-label="Program berikutnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--bg-elevated)] text-[var(--text)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-sm cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        {/* CTA ke Halaman Lengkap Programs */}
        <div className="relative z-10 mt-10 sm:mt-14 text-center">
          <Link
            href="/programs"
            className="btn-primary inline-flex items-center gap-2.5 text-sm px-6 py-3 shadow-md hover:shadow-lg"
          >
            Lihat Rincian Kurikulum & Semua Program
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
