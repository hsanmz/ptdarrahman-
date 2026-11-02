import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NewsClient from '../(main)/news/_components/NewsClient'
import { fallbackNews } from '../lib/news'

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />
  },
}))

// Mock useScrollReveal
vi.mock('@/app/hooks/useScrollAnimations', () => ({
  useScrollReveal: vi.fn(),
}))

// Mock matchMedia for jsdom
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('NewsClient Component UI & Filtering', () => {
  it('merender search input, pills kategori, dan kartu berita default', () => {
    render(<NewsClient news={fallbackNews()} />)

    // Input pencarian
    const searchInput = screen.getByPlaceholderText(/Cari berita, prestasi, atau topik/i)
    expect(searchInput).toBeTruthy()

    // Pills kategori
    expect(screen.getByText('Semua')).toBeTruthy()
    expect(screen.getAllByText("Tahfidz & Tasmi'").length).toBeGreaterThan(0)
    expect(screen.getAllByText('Teknologi Digital').length).toBeGreaterThan(0)

    // Sorotan utama muncul
    expect(screen.getByText('Sorotan Utama')).toBeTruthy()
  })

  it('memfilter artikel berdasarkan kata kunci pencarian teks', () => {
    render(<NewsClient news={fallbackNews()} />)

    const searchInput = screen.getByPlaceholderText(/Cari berita, prestasi, atau topik/i)
    fireEvent.change(searchInput, { target: { value: 'Next.js' } })

    // Artikel Next.js harus ada
    expect(screen.getByText(/Sharing Session PTD Ar-Rahman Hadirkan Senior Engineer Gojek/i)).toBeTruthy()

    // Counter menampilkan artikel
    expect(screen.getByText(/Menampilkan/i)).toBeTruthy()
  })

  it('memfilter artikel berdasarkan klik kategori pill', () => {
    render(<NewsClient news={fallbackNews()} />)

    // Klik kategori Teknologi Digital
    const techBtn = screen.getByRole('button', { name: /Teknologi Digital/i })
    fireEvent.click(techBtn)

    // Artikel tentang Next.js dan IoT muncul
    expect(screen.getByText(/Sharing Session PTD Ar-Rahman Hadirkan Senior Engineer Gojek/i)).toBeTruthy()
    expect(screen.getByText(/Evaluasi Kompetensi Digital: Santri PTD Ar-Rahman/i)).toBeTruthy()
  })

  it('menampilkan interactive empty state dan rekomendasi saat hasil pencarian nihil', () => {
    render(<NewsClient news={fallbackNews()} />)

    const searchInput = screen.getByPlaceholderText(/Cari berita, prestasi, atau topik/i)
    fireEvent.change(searchInput, { target: { value: 'topik_yang_pasti_tidak_ada_xyz123' } })

    // Pesan empty state
    expect(screen.getByText('Artikel Tidak Ditemukan')).toBeTruthy()
    expect(screen.getByText(/Topik Populer:/i)).toBeTruthy()

    // Klik tombol rekomendasi "Tasmi' 30 Juz"
    const chipBtn = screen.getByRole('button', { name: /Tasmi' 30 Juz/i })
    fireEvent.click(chipBtn)

    // Artikel Tasmi' kembali muncul
    expect(screen.getByText(/Dua Santri PTD Ar-Rahman Tuntaskan Tasmi' 30 Juz/i)).toBeTruthy()
  })
})
