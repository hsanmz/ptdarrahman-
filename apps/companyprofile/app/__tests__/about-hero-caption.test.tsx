import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import AboutClient from '../(main)/about/AboutClient'
import { fallbackAboutContent } from '../data/aboutContent'
import { fallbackLeadershipBoards } from '../data/leadership'

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

describe('AboutClient — Eko Santoso Profile Card', () => {
  it('merender nama Eko Santoso dan jabatan Ketua Yayasan Generasi Cerdas Akhlak Mulia di bawah gambar', () => {
    const { container } = render(
      <AboutClient
        aboutContent={fallbackAboutContent}
        leadership={fallbackLeadershipBoards}
      />
    )

    // Nama Eko Santoso di caption hero
    const nameHeadings = screen.getAllByRole('heading', { name: /Eko Santoso/i })
    expect(nameHeadings.length).toBeGreaterThanOrEqual(1)
    const heroNameHeading = nameHeadings[0]
    expect(heroNameHeading.className).toContain('font-[var(--font-display)]')
    expect(heroNameHeading.className).toContain('text-2xl')

    // Jabatan Ketua Yayasan Generasi Cerdas Akhlak Mulia
    const roleEls = screen.getAllByText(/Ketua Yayasan Generasi Cerdas Akhlak Mulia/i)
    expect(roleEls.length).toBeGreaterThanOrEqual(1)
    const roleEl = roleEls[0]
    expect(roleEl).toBeTruthy()
    expect(roleEl.className).toContain('text-[var(--accent)]')
    expect(roleEl.className).toContain('font-semibold')

    // Memastikan label "Pimpinan Lembaga" tidak ditampilkan di atas foto
    expect(screen.queryByText('Pimpinan Lembaga')).toBeNull()

    // Memastikan gambar profil hadir
    const img = container.querySelector('img[src*="pak-eko.jpg"]')
    expect(img).toBeTruthy()
  })
})
