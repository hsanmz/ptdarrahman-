import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' })
globalThis.window = dom.window as any
globalThis.document = dom.window.document
globalThis.navigator = dom.window.navigator

import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LandingPage from './LandingPage'
import KurikulumFasilitasPage from './KurikulumFasilitasPage'
import BiayaBeasiswaPage from './BiayaBeasiswaPage'
import SyaratKetentuanPage from './SyaratKetentuanPage'
import AlurJadwalPage from './AlurJadwalPage'
import FaqPage from './FaqPage'

// Mock apiFetch
vi.mock('@/api/client', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/ppdb/waves/active-public')) {
      return Promise.resolve({
        active: true,
        registration_open: true,
        name: 'Gelombang 1',
        academic_year: '2026/2027',
        quota: 30,
        paid_count: 5,
      })
    }
    if (url.includes('/ppdb/waves/active-public/fees')) {
      return Promise.resolve({
        active: true,
        wave_name: 'Gelombang 1',
        academic_year: '2026/2027',
        form_fee: 350000,
        minimum_dp: 3000000,
        early_discount_quota: 10,
        items: [],
      })
    }
    return Promise.resolve([])
  }),
  API_BASE: 'http://localhost:8000',
}))

// Mock useBrand
vi.mock('@repo/ui', () => ({
  useBrand: () => ({ logoUrl: '' }),
  resolveCompanyProfileUrl: () => 'http://localhost:3000',
}))

describe('PPDB Public Pages', () => {
  it('renders LandingPage (Beranda) with announcement and CTA', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )
    expect(screen.getByText(/Penerimaan Santri Baru/i)).toBeInTheDocument()
    expect(screen.getByText(/Daftar Santri Baru/i)).toBeInTheDocument()
    expect(screen.getByText(/Kurikulum & Fasilitas/i)).toBeInTheDocument()
    expect(screen.getByText(/Biaya & Beasiswa/i)).toBeInTheDocument()
    expect(screen.getByText(/Syarat & Ketentuan/i)).toBeInTheDocument()
  })

  it('renders KurikulumFasilitasPage with tabs and curriculum items', async () => {
    render(
      <BrowserRouter>
        <KurikulumFasilitasPage />
      </BrowserRouter>
    )
    expect(screen.getByText(/Kurikulum Terpadu & Fasilitas Modern/i)).toBeInTheDocument()
    expect(await screen.findByText(/5 Pilar Kurikulum Terintegrasi/i)).toBeInTheDocument()
  })

  it('renders BiayaBeasiswaPage with fees table and scholarships', async () => {
    render(
      <BrowserRouter>
        <BiayaBeasiswaPage />
      </BrowserRouter>
    )
    expect(screen.getByText(/Rincian Biaya Pendidikan & Beasiswa/i)).toBeInTheDocument()
    expect(screen.getByText(/Biaya Formulir \(QRIS\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Peluang Beasiswa Prestasi & Afirmasi/i)).toBeInTheDocument()
  })

  it('renders SyaratKetentuanPage with requirements and 6 documents', () => {
    render(
      <BrowserRouter>
        <SyaratKetentuanPage />
      </BrowserRouter>
    )
    expect(screen.getByText(/Syarat & Ketentuan PPDB/i)).toBeInTheDocument()
    expect(screen.getByText(/6 Dokumen Persyaratan Wajib/i)).toBeInTheDocument()
    expect(screen.getByText(/Kuesioner Kesehatan Mandiri/i)).toBeInTheDocument()
  })

  it('renders AlurJadwalPage with the 7 stages and batch rules', () => {
    render(
      <BrowserRouter>
        <AlurJadwalPage />
      </BrowserRouter>
    )
    expect(screen.getByText(/Alur Pendaftaran & Jadwal Penting/i)).toBeInTheDocument()
    expect(screen.getByText(/7 Tahap Menuju Santri PTDARRAHMAN/i)).toBeInTheDocument()
    expect(screen.getByText(/Sistem Batching & Cutoff Ujian Seleksi/i)).toBeInTheDocument()
  })

  it('renders FaqPage with questions and search input', () => {
    render(
      <BrowserRouter>
        <FaqPage />
      </BrowserRouter>
    )
    expect(screen.getByText(/Pertanyaan yang Sering Diajukan \(FAQ\)/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Cari pertanyaan/i)).toBeInTheDocument()
    expect(screen.getByText(/Apakah ada fasilitas atau layanan antar-jemput santri\?/i)).toBeInTheDocument()
  })
})
