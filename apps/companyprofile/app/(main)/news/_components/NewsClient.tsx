'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { NewsArticle } from '@/app/lib/types'
import { mergeNewsArticles, fallbackNews } from '@/app/lib/news'
import {
  ArrowRight,
  Calendar,
  Search,
  X,
  SearchX,
  Sparkles,
  Tag,
  BookOpen,
} from 'lucide-react'

const POPULAR_TOPICS = [
  "Tasmi' 30 Juz",
  'Next.js',
  'PORSENI',
  'Rihlah',
  'Capstone',
  'Tahfidz',
]

export default function NewsClient({ news }: { news: NewsArticle[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua')

  useEffect(() => {
    document.title = 'Berita & Acara | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 85%', stagger: 0.08 })

  // Pastikan selalu ada data artikel yang aman
  const articlesSource = useMemo(() => {
    const raw = news && news.length > 0 ? news : fallbackNews()
    const sortTime = (dateStr: string) => {
      const t = new Date(dateStr).getTime()
      return Number.isNaN(t) ? 0 : t
    }
    return mergeNewsArticles(raw).sort((a, b) => sortTime(b.date) - sortTime(a.date))
  }, [news])

  // Kategori unik dengan jumlah artikel
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: articlesSource.length }
    for (const art of articlesSource) {
      const cat = art.category?.trim() || 'Lainnya'
      counts[cat] = (counts[cat] || 0) + 1
    }
    const categories = Object.keys(counts).filter((c) => c !== 'Semua')
    return [{ name: 'Semua', count: counts['Semua'] }, ...categories.map((c) => ({ name: c, count: counts[c] }))]
  }, [articlesSource])

  // Filter gabungan (kategori + pencarian teks)
  const filtered = useMemo(() => {
    return articlesSource.filter((article) => {
      // Filter Kategori
      if (selectedCategory !== 'Semua') {
        const cat = article.category?.trim() || 'Lainnya'
        if (cat.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false
        }
      }

      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const info = article.content || {}
        const inTitle = (info.title || '').toLowerCase().includes(q)
        const inExcerpt = (info.excerpt || '').toLowerCase().includes(q)
        const inBody = (info.body || '').toLowerCase().includes(q)
        const inCat = (article.category || '').toLowerCase().includes(q)
        const inAuthor = (info.author || '').toLowerCase().includes(q)
        return inTitle || inExcerpt || inBody || inCat || inAuthor
      }

      return true
    })
  }, [articlesSource, selectedCategory, searchQuery])

  // Format tanggal ramah bahasa Indonesia
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const isDefaultView = selectedCategory === 'Semua' && !searchQuery.trim()
  const featuredArticle = isDefaultView && filtered.length > 0 ? filtered[0] : null
  const regularArticles = isDefaultView ? filtered.slice(1) : filtered

  const handleReset = () => {
    setSearchQuery('')
    setSelectedCategory('Semua')
  }

  return (
    <>
      <PageHeader
        variant="editorial"
        title="Berita & Acara"
        subtitle="Ikuti kabar terkini, prestasi santri, agenda kegiatan, dan inovasi pendidikan di PTDARRAHMAN"
        badge="KABAR & ARTIKEL"
      />

      <section ref={sectionRef} className="relative overflow-hidden py-12 sm:py-16 md:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

          {/* Panel Pencarian & Filter Terpadu */}
          <div className="mb-10 sm:mb-14 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Box Modern */}
              <div className="relative w-full md:max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berita, prestasi, atau topik..."
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all shadow-sm"
                  aria-label="Cari artikel berita"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    aria-label="Hapus kata kunci pencarian"
                  >
                    <X className="w-4 h-4 bg-[var(--bg-secondary)] rounded-full p-0.5" />
                  </button>
                )}
              </div>

              {/* Status Ringkasan Hasil */}
              <div className="flex items-center justify-between md:justify-end gap-3 text-xs sm:text-sm text-[var(--text-muted)]">
                <span>
                  Menampilkan <strong className="text-[var(--text)] font-semibold">{filtered.length}</strong> artikel
                </span>
                {(!isDefaultView) && (
                  <button
                    onClick={handleReset}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Kategori Filter Tabs (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 mr-1 shrink-0">
                <Tag className="w-3.5 h-3.5" />
                Kategori:
              </span>
              {categoriesWithCounts.map((cat) => {
                const isActive = selectedCategory === cat.name
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[var(--accent)] text-white shadow-sm ring-2 ring-[var(--accent)]/30'
                        : 'bg-[var(--card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Featured Article Card (Hanya muncul saat mode default 'Semua') */}
          {featuredArticle && (
            <div className="mb-12">
              <Link
                href={`/news/${featuredArticle.slug}`}
                className="group glass-card rounded-3xl overflow-hidden !no-underline grid grid-cols-1 lg:grid-cols-12 border border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-xl transition-all duration-300"
              >
                <div className="lg:col-span-7 aspect-[16/10] lg:aspect-auto lg:min-h-[360px] relative overflow-hidden bg-[var(--bg-secondary)]">
                  {featuredArticle.image ? (
                    <Image
                      src={featuredArticle.image}
                      alt={featuredArticle.content?.title || 'Sorotan Berita Utama'}
                      fill
                      priority
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <BookOpen className="w-12 h-12 stroke-1" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                      Sorotan Utama
                    </span>
                    {featuredArticle.category && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)] text-white shadow-md">
                        {featuredArticle.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[var(--card)]">
                  <div>
                    {featuredArticle.date && (
                      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] mb-3">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>{formatDate(featuredArticle.date)}</span>
                        {featuredArticle.content?.author && (
                          <>
                            <span>•</span>
                            <span>{featuredArticle.content.author}</span>
                          </>
                        )}
                      </div>
                    )}
                    <h2 className="font-[var(--font-heading)] text-xl sm:text-2xl font-bold text-[var(--text)] mb-3 leading-snug group-hover:text-[var(--accent)] transition-colors">
                      {featuredArticle.content?.title}
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed line-clamp-3 sm:line-clamp-4 mb-6">
                      {featuredArticle.content?.excerpt || featuredArticle.content?.body || ''}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                      Baca Berita Utama
                    </span>
                    <span className="w-9 h-9 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Grid Artikel Regular / Hasil Pencarian */}
          {regularArticles.length > 0 && (
            <div>
              {featuredArticle && (
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-[var(--font-heading)] text-lg sm:text-xl font-bold text-[var(--text)]">
                    Kabar & Artikel Lainnya
                  </h3>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {regularArticles.map((article) => {
                  const info = article.content ?? {}
                  const dateText = formatDate(article.date)
                  return (
                    <Link
                      key={article.id || article.slug}
                      href={`/news/${article.slug}`}
                      className="group glass-card rounded-2xl overflow-hidden !no-underline flex flex-col border border-[var(--border)] hover:border-[var(--accent)]/40 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="aspect-[16/10] overflow-hidden relative bg-[var(--bg-secondary)]">
                        {article.image ? (
                          <Image
                            src={article.image}
                            alt={info?.title || 'Gambar berita'}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <BookOpen className="w-8 h-8 stroke-1" />
                          </div>
                        )}
                        {article.category && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-[var(--accent)] text-white shadow-sm">
                            {article.category}
                          </span>
                        )}
                      </div>
                      <div className="p-5 sm:p-6 flex flex-col flex-1">
                        {dateText && (
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                            <span>{dateText}</span>
                          </div>
                        )}
                        <h3 className="font-[var(--font-heading)] text-base sm:text-lg font-bold text-[var(--text)] mb-2 leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                          {info.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-4">
                          {info.excerpt || info.body || ''}
                        </p>
                        <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
                          <span>Baca Selengkapnya</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State Interaktif jika tidak ada hasil */}
          {filtered.length === 0 && (
            <div className="py-12 sm:py-16 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
                <SearchX className="w-8 h-8" />
              </div>
              <h3 className="font-[var(--font-heading)] text-xl font-bold text-[var(--text)] mb-2">
                Artikel Tidak Ditemukan
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                {searchQuery
                  ? `Tidak ada artikel yang cocok dengan pencarian "${searchQuery}". Coba gunakan kata kunci lain atau pilih topik di bawah ini.`
                  : 'Belum ada artikel untuk kategori yang dipilih.'}
              </p>

              {/* Rekomendasi Topik Populer */}
              <div className="mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2.5">
                  Topik Populer:
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {POPULAR_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setSearchQuery(topic)
                        setSelectedCategory('Semua')
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all shadow-sm"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all"
              >
                Tampilkan Semua Berita
              </button>
            </div>
          )}

        </div>
      </section>
    </>
  )
}
