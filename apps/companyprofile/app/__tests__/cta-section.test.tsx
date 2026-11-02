import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CTASection from '../components/sections/CTASection'
import type { HomeCtaContent } from '../lib/types'

describe('CTASection Component', () => {
  const mockContent: HomeCtaContent = {
    enabled: true,
    title: 'Mulai Perjalanan Pendidikan Qurani & Digital',
    description: 'Daftarkan putra-putri Anda untuk menjadi generasi penghafal Al-Qur’an.',
    button_text: 'Daftar Sekarang',
    button_url: '/ppdb',
    layout: 'left',
  }

  it('merender judul, deskripsi, badge dan tombol CTA dengan benar', () => {
    render(<CTASection content={mockContent} />)

    expect(screen.getByText('Penerimaan Santri Baru')).toBeTruthy()
    expect(screen.getByText('Mulai Perjalanan Pendidikan Qurani & Digital')).toBeTruthy()
    expect(screen.getByText('Daftarkan putra-putri Anda untuk menjadi generasi penghafal Al-Qur’an.')).toBeTruthy()
    expect(screen.getByText('Daftar Sekarang')).toBeTruthy()
  })

  it('menyelesaikan link tombol ke portal ppdb dengan tepat', () => {
    render(<CTASection content={mockContent} />)

    const link = screen.getByRole('link', { name: /daftar sekarang/i })
    expect(link.getAttribute('href')).toContain('5174')
  })
})
