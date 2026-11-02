'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/app/lib/gsap'
import { prefersReducedMotion } from '@/app/lib/motion'
import type { AboutContentData } from '@/app/lib/types'

export default function StatsSection({ content = null }: { settings?: Record<string, string>; content?: AboutContentData | null }) {
  const displayStats = Array.from({ length: 4 }, (_, index) => {
    const position = index + 1
    const rawValue = content?.[`stat_${position}_value`]
    const rawLabel = content?.[`stat_${position}_label`]
    const value = rawValue === undefined || rawValue === '' ? Number.NaN : Number(rawValue)
    if (!Number.isFinite(value) || typeof rawLabel !== 'string' || !rawLabel.trim()) return null
    return {
      value,
      suffix: String(content?.[`stat_${position}_suffix`] ?? ''),
      label: rawLabel,
    }
  }).filter((stat): stat is { value: number; suffix: string; label: string } => stat !== null)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const root = rootRef.current
    if (!root) return
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
        const target = Number(el.dataset.stat ?? '0')
        const obj = { n: 0 }
        gsap.to(obj, {
          n: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => { el.textContent = String(Math.round(obj.n)) },
        })
      })
      const cards = root.querySelectorAll('[data-card]')
      gsap.fromTo(cards, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  if (displayStats.length === 0) return null

  return (
    <section ref={rootRef} className="py-16 sm:py-20 bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayStats.map((s) => (
            <div key={s.label} data-card className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
              <p className="font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--accent)] tracking-tight">
                <span data-stat={s.value}>0</span>{s.suffix}
              </p>
              <p className="mt-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
