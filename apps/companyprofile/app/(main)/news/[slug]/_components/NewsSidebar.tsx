'use client'

import Link from 'next/link'
import { Calendar, Mail, Phone, ArrowRight } from 'lucide-react'
import type { NewsArticle } from '@/app/lib/types'
import PpdbWaveBanner from '@/app/components/ui/PpdbWaveBanner'
import type { ActivePpdbWave } from '@/app/lib/ppdb'

interface NewsSidebarProps {
  article: NewsArticle
  allNews: NewsArticle[]
  wave?: ActivePpdbWave | null
}

/**
 * Kolom kanan 30% di halaman detail berita.
 *
 * Berisi:
 * 1. CTA pendaftaran PPDB (promosi utama, dinamis dari API gelombang aktif)
 * 2. Kontak panitia
 * 3. Rekomendasi berita tanpa gambar (ringkas, elegan, dan fokus pada teks)
 *
 * `wave` diterima dari parent page (server fetch) — tidak fetch ulang di client.
 */
export default function NewsSidebar({
  article,
  allNews,
  wave = null,
}: NewsSidebarProps) {
  const related = allNews
    .filter((a) => a.slug !== article.slug)
    .sort((a, b) => {
      // Prioritaskan kategori yang sama, lalu artikel terbaru.
      const sameCategory = Number(b.category === article.category) - Number(a.category === article.category)
      if (sameCategory !== 0) return sameCategory
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, 4)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── CTA Gelombang PPDB Aktif ── */}
      <PpdbWaveBanner wave={wave} variant="prominent" />

      {/* ── Kontak Panitia ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-4.5">
        <h3 className="font-bold text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
          Butuh Informasi?
        </h3>
        <ul className="space-y-2 text-xs sm:text-sm">
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Mail className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
            <a
              href="mailto:ppdb@ptdarrahman.sch.id"
              className="hover:text-[var(--accent)] transition-colors break-all"
            >
              ppdb@ptdarrahman.sch.id
            </a>
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Phone className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
            <a
              href="tel:02181283612352"
              className="hover:text-[var(--accent)] transition-colors"
            >
              (021) 812-8361-2352
            </a>
          </li>
        </ul>
      </div>

      {/* ── Rekomendasi Berita (Format teks bersih tanpa thumbnail gambar) ── */}
      {related.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-4.5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[var(--border)]">
            <h3 className="font-[var(--font-heading)] font-bold text-sm sm:text-base text-[var(--text)]">
              Rekomendasi Berita
            </h3>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              {related.length} artikel
            </span>
          </div>

          <div className="divide-y divide-[var(--border)]/70">
            {related.map((item) => {
              const info = item.content ?? {}
              const dateText = formatDate(item.date)
              return (
                <Link
                  key={item.slug}
                  href={`/news/${item.slug}`}
                  className="group block py-2.5 first:pt-0 last:pb-0 !no-underline"
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {item.category && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold uppercase tracking-wider">
                        {item.category}
                      </span>
                    )}
                    {dateText && (
                      <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3 text-[var(--accent)] shrink-0" />
                        {dateText}
                      </span>
                    )}
                  </div>
                  <h4
                    className="font-bold text-xs sm:text-sm text-[var(--text)] group-hover:text-[var(--accent)] leading-snug line-clamp-1 transition-colors"
                    title={info.title}
                  >
                    {info.title}
                  </h4>
                  {info.excerpt && (
                    <p
                      className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-1 leading-relaxed"
                      title={info.excerpt}
                    >
                      {info.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
                    <span>Baca artikel</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
