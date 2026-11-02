'use client'

/* eslint-disable @next/next/no-img-element -- gambar banner berasal dari URL CMS yang dapat memakai domain eksternal. */

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroSlide } from '@/app/lib/types'
import { API_BASE } from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'
import { prefersReducedMotion } from '@/app/lib/motion'

const AUTOPLAY_MS = 5000

export default function HeroSection({ slides = [] }: { slides?: HeroSlide[] }) {
  const items = useMemo(
    () => slides.filter((slide) => typeof slide.image === 'string' && slide.image.trim() !== ''),
    [slides],
  )
  const [active, setActive] = useState(0)
  const [isHoveredControls, setIsHoveredControls] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const goToNext = useCallback(() => {
    if (items.length <= 1) return
    setActive((curr) => (curr + 1) % items.length)
  }, [items.length])

  const goToPrev = useCallback(() => {
    if (items.length <= 1) return
    setActive((curr) => (curr - 1 + items.length) % items.length)
  }, [items.length])

  // Autoplay otomatis berjalan sendiri secara berkala (5 detik)
  useEffect(() => {
    if (items.length <= 1 || isHoveredControls || prefersReducedMotion()) return

    timerRef.current = setInterval(() => {
      goToNext()
    }, AUTOPLAY_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [items.length, isHoveredControls, goToNext, active])

  if (items.length === 0) {
    return (
      <section
        aria-label="Area banner beranda"
        className="mt-16 h-[calc(100vh-4rem)] w-full bg-[var(--bg-secondary)] md:mt-20 md:h-[calc(100vh-5rem)]"
      />
    )
  }

  // Handle Touch Swipe untuk mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToNext()
      else goToPrev()
    }
    touchStartX.current = null
  }

  const current = items[Math.min(active, items.length - 1)]
  const mode = current?.content?.height_mode

  return (
    <section
      aria-label="Banner beranda"
      className={`relative mt-16 w-full bg-[var(--bg-secondary)] overflow-hidden select-none md:mt-20 ${
        mode === 'peek' ? 'mb-[10vh]' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container Slide dengan Efek Crossfade Halus */}
      <div className="relative w-full">
        {items.map((slide, index) => {
          const isCurrent = index === active
          const imageUrl = resolveImageSrc(String(slide.image), API_BASE)

          return (
            <div
              key={slide.id}
              className={`w-full transition-opacity duration-700 ease-in-out ${
                isCurrent
                  ? 'opacity-100 relative z-10'
                  : 'opacity-0 absolute inset-0 pointer-events-none z-0'
              }`}
            >
              <img
                src={imageUrl}
                alt="Banner Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
                className="block h-auto w-full object-contain object-center"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          )
        })}
      </div>

      {/* Navigasi & Indikator jika terdapat lebih dari 1 slide */}
      {items.length > 1 ? (
        <>
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            onClick={goToPrev}
            onMouseEnter={() => setIsHoveredControls(true)}
            onMouseLeave={() => setIsHoveredControls(false)}
            aria-label="Banner sebelumnya"
            className="absolute left-3 sm:left-4 top-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          {/* Tombol Berikutnya */}
          <button
            type="button"
            onClick={goToNext}
            onMouseEnter={() => setIsHoveredControls(true)}
            onMouseLeave={() => setIsHoveredControls(false)}
            aria-label="Banner berikutnya"
            className="absolute right-3 sm:right-4 top-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          {/* Indikator Titik & Progress Otomatis */}
          <div
            onMouseEnter={() => setIsHoveredControls(true)}
            onMouseLeave={() => setIsHoveredControls(false)}
            className="absolute bottom-3 sm:bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3.5 py-2 backdrop-blur-md border border-white/10 shadow-lg"
          >
            {items.map((slide, index) => {
              const isCurrent = index === active
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Tampilkan banner ${index + 1}`}
                  aria-current={isCurrent}
                  className={`relative h-2 rounded-full transition-all duration-500 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isCurrent
                      ? 'w-8 bg-white/40'
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                >
                  {isCurrent && (
                    <span
                      key={`progress-${active}`}
                      className="absolute inset-0 bg-white rounded-full animate-hero-progress origin-left"
                      style={{
                        animationDuration: `${AUTOPLAY_MS}ms`,
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </section>
  )
}
