import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewsSidebar from '../(main)/news/[slug]/_components/NewsSidebar'
import { fallbackNews } from '../lib/news'

// Mock PpdbWaveBanner
vi.mock('@/app/components/ui/PpdbWaveBanner', () => ({
  default: () => <div data-testid="ppdb-wave-banner">PPDB Banner</div>,
}))

describe('NewsSidebar Component', () => {
  const allArticles = fallbackNews()
  const currentArticle = allArticles[0]

  it('merender bagian Rekomendasi Berita tanpa elemen gambar', () => {
    const { container } = render(
      <NewsSidebar article={currentArticle} allNews={allArticles} />
    )

    // Heading Rekomendasi Berita tampil
    expect(screen.getByText('Rekomendasi Berita')).toBeTruthy()

    // Memastikan TIDAK ADA elemen img di dalam blok Rekomendasi Berita
    const images = container.querySelectorAll('img')
    expect(images.length).toBe(0)

    // Judul artikel rekomendasi muncul dan dibatasi 1 baris (line-clamp-1)
    const otherArticle = allArticles[1]
    const titleEl = screen.getByText(otherArticle.content!.title!)
    expect(titleEl).toBeTruthy()
    expect(titleEl.className).toContain('line-clamp-1')

    // Preview / excerpt konten artikel rekomendasi dibatasi 1 baris (line-clamp-1)
    const excerptEl = screen.getByText(otherArticle.content!.excerpt!)
    expect(excerptEl).toBeTruthy()
    expect(excerptEl.className).toContain('line-clamp-1')
  })

  it('menampilkan informasi kontak panitia dan banner PPDB', () => {
    render(<NewsSidebar article={currentArticle} allNews={allArticles} />)

    expect(screen.getByTestId('ppdb-wave-banner')).toBeTruthy()
    expect(screen.getByText('ppdb@ptdarrahman.sch.id')).toBeTruthy()
    expect(screen.getByText('(021) 812-8361-2352')).toBeTruthy()
  })
})
