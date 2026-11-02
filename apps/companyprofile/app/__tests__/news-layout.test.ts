import { describe, it, expect } from 'vitest'
import { fallbackNews, mergeNewsArticles, FALLBACK_NEWS } from '@/app/lib/news'

describe('News System & Fallbacks', () => {
  it('FALLBACK_NEWS memuat 6 artikel berita autentik PTDARRAHMAN', () => {
    expect(FALLBACK_NEWS.length).toBeGreaterThanOrEqual(6)
    FALLBACK_NEWS.forEach((article) => {
      expect(article.id).toBeTruthy()
      expect(article.slug).toBeTruthy()
      expect(article.category).toBeTruthy()
      expect(article.content?.title).toBeTruthy()
      expect(article.content?.excerpt).toBeTruthy()
      expect(article.content?.body).toBeTruthy()
    })
  })

  it('fallbackNews() menghasilkan salinan independen', () => {
    const list1 = fallbackNews()
    const list2 = fallbackNews()
    expect(list1).not.toBe(list2)
    expect(list1.length).toBe(FALLBACK_NEWS.length)
  })

  it('mergeNewsArticles menyatukan artikel dan mempertahankan data lengkap', () => {
    const merged = mergeNewsArticles(fallbackNews())
    expect(merged.length).toBe(FALLBACK_NEWS.length)
    expect(merged.some((a) => a.category === "Tahfidz & Tasmi'")).toBe(true)
    expect(merged.some((a) => a.category === 'Teknologi Digital')).toBe(true)
    expect(merged.some((a) => a.category === 'Kegiatan & Prestasi')).toBe(true)
    expect(merged.some((a) => a.category === 'Kehidupan Asrama')).toBe(true)
  })

  it('seluruh artikel memiliki format tanggal ISO yang valid', () => {
    FALLBACK_NEWS.forEach((article) => {
      if (article.date) {
        const time = new Date(article.date).getTime()
        expect(Number.isNaN(time)).toBe(false)
      }
    })
  })
})
