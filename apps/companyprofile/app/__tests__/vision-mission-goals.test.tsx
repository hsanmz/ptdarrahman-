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

describe('Vision, Mission, and Goals Section', () => {
  it('merender teks visi lengkap sesuai dokumen resmi', () => {
    render(
      <AboutClient
        aboutContent={fallbackAboutContent}
        leadership={fallbackLeadershipBoards}
      />
    )

    // Heading Visi, Misi & Tujuan
    expect(screen.getByRole('heading', { name: /Visi.*Misi/i })).toBeTruthy()

    // Teks Visi
    expect(
      screen.getByText(
        /Menjadi Lembaga Pendidikan Terbaik bagi generasi Islam dengan memberikan penghayatan dan bekal hidup/i
      )
    ).toBeTruthy()
  })

  it('merender 4 butir Misi Kami secara lengkap', () => {
    render(
      <AboutClient
        aboutContent={fallbackAboutContent}
        leadership={fallbackLeadershipBoards}
      />
    )

    expect(screen.getByRole('heading', { name: /MISI KAMI/i })).toBeTruthy()
    expect(
      screen.getByText('Menciptakan lingkungan islami, bersih, dan nyaman')
    ).toBeTruthy()
    expect(
      screen.getByText('Membina akidah lurus, akhlak mulia, dan pribadi tangguh')
    ).toBeTruthy()
    expect(
      screen.getByText('Mencetak generasi penerus yang hafal Al-Qur\'an')
    ).toBeTruthy()
    expect(
      screen.getByText('Menguasai kecakapan bidang informasi dan teknologi')
    ).toBeTruthy()
  })

  it('merender 4 butir Tujuan Kami secara lengkap', () => {
    render(
      <AboutClient
        aboutContent={fallbackAboutContent}
        leadership={fallbackLeadershipBoards}
      />
    )

    expect(screen.getByRole('heading', { name: /TUJUAN KAMI/i })).toBeTruthy()
    expect(
      screen.getByText('Membangun peradaban Islam mulia di muka bumi')
    ).toBeTruthy()
    expect(
      screen.getByText('Menumbuhkan kecintaan pada Allah dan Rasul-Nya')
    ).toBeTruthy()
    expect(
      screen.getByText('Meningkatkan mutu umat melalui teknologi mutakhir')
    ).toBeTruthy()
    expect(
      screen.getByText('Mencetak para pemimpin muslim dan penggerak dakwah')
    ).toBeTruthy()
  })
})
