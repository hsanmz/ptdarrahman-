'use client'

import { useEffect, useState } from 'react'
import { termsDocument } from '@/app/data/terms'

/**
 * Daftar isi dokumen T&C dengan scrollspy: tautan bab/subbab yang sedang
 * terbaca diberi warna aksen, dan panelnya dipasang sticky di sidebar desktop
 * supaya ikut mengikuti bacaan.
 */
export default function TermsToc() {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const targets = termsDocument
      .flatMap((chapter) => [chapter.id, ...chapter.subsections.map((s) => s.id)])
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (targets.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        const last = visible[visible.length - 1]
        if (last) setActiveId(last.target.id)
      },
      // Bagian dianggap aktif saat judulnya mencapai pita atas layar
      // (di bawah navbar) — zona tinggal ~25% view di atas.
      { rootMargin: '-96px 0px -75% 0px', threshold: 0 },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav aria-label="Daftar isi dokumen">
      <div className="text-[10px] font-[var(--font-heading)] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
        Daftar Isi
      </div>
      <ul className="space-y-2">
        {termsDocument.map((chapter) => {
          const chapterActive =
            activeId === chapter.id ||
            chapter.subsections.some((s) => s.id === activeId)
          return (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                className={`block text-xs font-semibold transition-colors ${
                  chapterActive ? 'text-[var(--accent)]' : 'text-[var(--text)] hover:text-[var(--accent)]'
                }`}
              >
                {chapter.heading}
              </a>
              <ul className="mt-1.5 space-y-1 border-l border-[var(--color-border)] pl-3 ml-1">
                {chapter.subsections.map((section) => {
                  const isActive = activeId === section.id
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`block text-xs transition-colors ${
                          isActive
                            ? 'text-[var(--accent)] font-medium'
                            : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
                        }`}
                      >
                        {section.heading}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
