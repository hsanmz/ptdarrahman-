import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgramsPreview from '../components/sections/ProgramsPreview'

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

describe('ProgramsPreview Component', () => {
  it('merender judul, deskripsi, dan kartu program unggulan', () => {
    render(<ProgramsPreview />)

    expect(screen.getByText('PROGRAM UNGGULAN')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: /Empat Pilar Keunggulan PTDARRAHMAN/i })).toBeTruthy()
    expect(screen.getAllByText('Tahfidz Al-Quran').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Teknologi Digital').length).toBeGreaterThan(0)
  })

  it('memiliki tombol navigasi sebelumnya dan berikutnya', () => {
    render(<ProgramsPreview />)

    expect(screen.getByRole('button', { name: /program sebelumnya/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /program berikutnya/i })).toBeTruthy()
  })
})
