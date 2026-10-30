'use client'

import Link from 'next/link'
import { Calendar, Mail, Phone } from 'lucide-react'
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
 * 3. Artikel terkait (dari kategori yang sama, tidak termasuk artikel saat ini)
 *
 * `wave` diterima dari parent page (server fetch) — tidak fetch ulang di client.
 */
export default function NewsSidebar({
  article,
  allNews,
  wave = null,
}: NewsSidebarProps) {
  const related = allNews
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* ── CTA Gelombang PPDB Aktif ── */}
      <PpdbWaveBanner wave={wave} variant="prominent" />

      {/* ── Kontak Panitia ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Butuh Informasi?
        </h3>
        <ul className="space-y-2.5 text-sm">
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Mail className="w-4 h-4 shrink-0 text-[var(--accent)]" />
            <span>ppdb@ptdarrahman.sch.id</span>
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Phone className="w-4 h-4 shrink-0 text-[var(--accent)]" />
            <span>(021) 812-8361-2352</span>
          </li>
        </ul>
      </div>

      {/* ── Artikel Terkait ── */}
      {related.length > 0 && (
        <div>
          <h3 className="font-bold text-lg text-[var(--text)] mb-4">
            Artikel Lainnya
          </h3>
          <div className="space-y-3">
            {related.map((item) => {
              const info = item.content ?? {}
              return (
                <Link
                  key={item.slug}
                  href={`/news/${item.slug}`}
                  className="group flex flex-col gap-2 rounded-xl border border-[var(--border)]/50 p-3 hover:border-[var(--accent)]/50 hover:bg-[var(--bg-secondary)]/30 transition-all"
                >
                  {item.image ? (
                    <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-[var(--border)]/30">
                      <img
                        src={item.image}
                        alt={info.title || 'Gambar Berita'}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full rounded-lg bg-[var(--border)]/30 flex items-center justify-center">
                      <span className="text-[var(--text-muted)] text-xs">Tanpa Gambar</span>
                    </div>
                  )}
                  <span className="text-[10px] px-2 py-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold uppercase tracking-wider">
                    {item.category}
                  </span>
                  <h4 className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--accent)] leading-snug line-clamp-2">
                    {info.title}
                  </h4>
                  {item.date && (
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {new Date(item.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
