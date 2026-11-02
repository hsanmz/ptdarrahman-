import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import GalleryClient from '../(main)/gallery/_components/GalleryClient'
import type { GalleryItem } from '../lib/types'

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

// Mock CoverflowCarousel
vi.mock('@/app/components/ui/CoverflowCarousel', () => ({
  CoverflowCarousel: () => <div data-testid="coverflow">Coverflow</div>,
}))

// Mock matchMedia and scrollTo for jsdom
beforeAll(() => {
  window.scrollTo = vi.fn()
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

describe('Gallery Lightbox Modal', () => {
  const mockGallery: GalleryItem[] = [
    {
      id: 'gal-1',
      image: 'https://images.unsplash.com/photo-1',
      category: 'Kegiatan Santri',
      content: {
        title: 'Sholat Berjamaah Santri',
        desc: 'Dokumentasi sholat berjamaah di masjid pesantren.',
      },
    },
    {
      id: 'gal-2',
      image: 'https://images.unsplash.com/photo-2',
      category: 'Fasilitas',
      content: {
        title: 'Lab Komputer Santri',
        desc: 'Suasana belajar pemrograman.',
      },
    },
  ]

  it('menampilkan tombol close dan background transparan putih saat gambar diklik', async () => {
    render(<GalleryClient gallery={mockGallery} />)

    // Klik tombol foto pertama
    const itemButton = screen.getByRole('button', { name: /Buka foto Sholat Berjamaah Santri/i })
    fireEvent.click(itemButton)

    // Dialog harus terbuka
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()

    // Tombol close harus ada di dalam dialog
    const closeBtn = within(dialog).getByRole('button', { name: /tutup/i })
    expect(closeBtn).toBeTruthy()

    // Panel teks harus memiliki background transparan putih (bg-white)
    const modalDesc = within(dialog).getByText('Dokumentasi sholat berjamaah di masjid pesantren.')
    expect(modalDesc).toBeTruthy()
    const textPanel = modalDesc.closest('div')
    expect(textPanel?.className).toContain('bg-white')

    // Klik tombol close menutup modal
    fireEvent.click(closeBtn)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
