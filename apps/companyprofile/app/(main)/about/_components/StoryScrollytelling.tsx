'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import SectionTitle from '@/app/components/ui/SectionTitle'
import { storyChapters, storyVisual } from '@/app/data/aboutStory'

/**
 * Layout sticky-scroll (scrollytelling) ala modern:
 * - Bila `storyVisual.image` terisi: visual utama (foto Ketua Yayasan) menempel
 *   (`position: sticky`) di kiri mengikuti layar, sementara kolom cerita di
 *   kanannya mengalir ke bawah.
 * - Bila image kosong: tayang sebagai timeline terpusat tanpa visual; layout
 *   dua kolom kembali otomatis begitu foto resmi diisi.
 * 4 babak cerita PTD; babak yang sedang terbaca ditandai lewat
 * IntersectionObserver (nomor bidang menyala emerald, lainnya meredup).
 */
export default function StoryScrollytelling() {
  const reduced = useReducedMotion()
  const [activeId, setActiveId] = useState(storyChapters[0]?.id ?? null)
  // Visual sementara kosong (foto resmi menyusul) — section tayang tanpa
  // visual; mengisi `storyVisual.image` mengembalikan layout dua kolom.
  const hasVisual = storyVisual.image.trim() !== ''
  const chapterRefs = useRef<Array<HTMLLIElement | null>>([])

  useEffect(() => {
    const els = chapterRefs.current.filter((el): el is HTMLLIElement => el !== null)
    if (els.length === 0) return

    let raf = 0
    const pick = () => {
      const mid = window.innerHeight / 2
      let best: string | null = null
      let bestDist = Infinity
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        const dist = Math.abs((rect.top + rect.bottom) / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = el.id
        }
      }
      if (best) setActiveId(best)
    }
    // Babak aktif dipilih ulang setiap kali ada yang masuk/keluar zona tengah layar.
    const observer = new IntersectionObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(pick)
    }, { threshold: [0, 0.25, 0.5] })
    els.forEach((el) => observer.observe(el))
    pick()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="bg-[var(--bg)] py-16 sm:py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionTitle badge="SEJAK 2021" title="Warisan Keunggulan Quran & Digital" />

        <div
          className={`mt-10 md:mt-14 ${
            hasVisual
              ? 'grid lg:grid-cols-2 gap-8 lg:gap-16 items-start'
              : 'max-w-3xl mx-auto'
          }`}
        >
          {hasVisual && (
            /* Kiri: visual nempel mengikuti scroll (desktop) */
            <div className="relative lg:sticky lg:top-24 lg:self-start">
              <div className="relative aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl ring-1 ring-[var(--border-strong)]">
                <Image
                  src={storyVisual.image}
                  alt={storyVisual.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A1F]/80 via-[#0B2A1F]/10 to-transparent" />
                {/* Kartu identitas di kaki visual */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 glass-card rounded-2xl p-4 sm:p-5">
                  <p className="font-[var(--font-heading)] text-lg sm:text-xl font-semibold text-white leading-tight">
                    {storyVisual.name}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
                    {storyVisual.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Babak cerita yang mengalir saat scroll — dua kolom saat visual
              ada, satu kolom terpusat saat visual kosong */}
          <ol className="relative">
            {storyChapters.map((chapter, i) => {
              const isActive = activeId === chapter.id
              const isLast = i === storyChapters.length - 1
              return (
                <motion.li
                  key={chapter.id}
                  id={chapter.id}
                  ref={(el) => {
                    chapterRefs.current[i] = el
                  }}
                  className="relative flex gap-4 sm:gap-6 pb-14 sm:pb-20 last:pb-0 sm:min-h-[46vh] sm:items-start"
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px 0px -60px 0px' }}
                  transition={{ duration: reduced ? 0 : 0.55, ease: 'easeOut' }}
                >
                  {/* Rel vertikal penghubung babak */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[19px] top-12 bottom-0 border-l border-dashed border-[var(--border-strong)]"
                    />
                  )}
                  {/* Bidang nomor: menyala saat babak sedang terbaca */}
                  <span
                    className={`relative z-10 mt-1 w-10 h-10 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-[var(--accent)] text-white border-transparent shadow-md'
                        : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border-strong)]'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {`0${i + 1}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.22em] mb-2 transition-colors duration-300 ${
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {chapter.kicker}
                    </p>
                    <h3
                      className={`font-[var(--font-heading)] text-2xl md:text-[28px] font-semibold leading-snug mb-4 transition-colors duration-300 ${
                        isActive ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {chapter.title}
                    </h3>
                    <div className="space-y-3 max-w-prose">
                      {chapter.body.map((paragraph, j) => (
                        <p
                          key={j}
                          className="text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
