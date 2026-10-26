import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ApplicantProfileModal from './ApplicantProfileModal'

// Mock client apiFetch
vi.mock('@/api/client', () => ({
  API_BASE: 'http://localhost:8000',
  apiFetch: vi.fn().mockResolvedValue(null),
}))

// Mock exportApplicantForm doc utils
vi.mock('@/utils/exportApplicantForm', async () => {
  const actual = await vi.importActual<any>('@/utils/exportApplicantForm')
  return {
    ...actual,
    downloadApplicantFormDoc: vi.fn().mockResolvedValue(undefined),
  }
})

const mockApplicant = {
  id: 'app-12345678-abcd',
  full_name: 'Ahmad Faiz Al-Faruq',
  nisn: '0012345678',
  nik: '3201234567890001',
  gender: 'L',
  birth_place: 'Bekasi',
  birth_date: '2010-05-15',
  religion: 'Islam',
  previous_school: 'SMP Negeri 1 Tambun',
  registration_path: 'reguler',
  wave_name: 'Gelombang 1 Utama',
  period_name: 'Tahun Ajaran 2026/2027',
  payment_status: 'paid',
  status: 'document_uploaded',
  created_at: '2026-10-01T08:00:00Z',
  username: 'ahmadfaiz',
  phone: '081234567890',
  email: 'ahmad.faiz@example.com',
  father_name: 'Faruq Basalamah',
  father_phone: '08111222333',
  mother_name: 'Khadijah',
  mother_phone: '08111444555',
  address: 'Jl. Melati No. 12',
  district: 'Tambun Selatan',
  city: 'Bekasi',
  province: 'Jawa Barat',
}

function renderModal(props: Partial<Parameters<typeof ApplicantProfileModal>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ApplicantProfileModal
        open={true}
        onOpenChange={vi.fn()}
        applicant={mockApplicant}
        {...props}
      />
    </QueryClientProvider>
  )
}

describe('ApplicantProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('menampilkan header modal dengan nama, NISN, gelombang, dan status secara interaktif', () => {
    renderModal()

    expect(screen.getByText('Ahmad Faiz Al-Faruq')).toBeInTheDocument()
    expect(screen.getByText(/Reg: 0012345678/i)).toBeInTheDocument()
    expect(screen.getByText('Gelombang 1 Utama')).toBeInTheDocument()
    expect(screen.getByText('Lunas')).toBeInTheDocument()
  })

  it('membuka tab Biodata & Santri secara default, bukan langsung pratinjau cetak A4', () => {
    renderModal()

    // Tab navigasi
    const biodataTab = screen.getByRole('tab', { name: /biodata & santri/i })
    expect(biodataTab).toHaveAttribute('data-state', 'active')

    // Field biodata ditampilkan di layar utama
    expect(screen.getByText('Identitas Calon Santri')).toBeInTheDocument()
    expect(screen.getByText('Status & Jalur Masuk')).toBeInTheDocument()
    expect(screen.getByText('SMP Negeri 1 Tambun')).toBeInTheDocument()
  })

  it('dapat berpindah tab ke Orang Tua / Wali dan Domisili & Kontak', () => {
    renderModal()

    // Buka tab orang tua
    const parentsTab = screen.getByRole('tab', { name: /orang tua \/ wali/i })
    fireEvent.click(parentsTab)
    expect(screen.getByText('Data Ayah Kandung')).toBeInTheDocument()
    expect(screen.getByText('Faruq Basalamah')).toBeInTheDocument()
    expect(screen.getByText('Khadijah')).toBeInTheDocument()

    // Buka tab domisili
    const domisiliTab = screen.getByRole('tab', { name: /domisili & kontak/i })
    fireEvent.click(domisiliTab)
    expect(screen.getByText('Jl. Melati No. 12')).toBeInTheDocument()
    expect(screen.getByText('ahmad.faiz@example.com')).toBeInTheDocument()
  })

  it('dapat membuka tab Format Cetak (A4) untuk pratinjau lembar cetak jika diinginkan', () => {
    renderModal()

    const cetakTab = screen.getByRole('tab', { name: /format cetak \(a4\)/i })
    fireEvent.click(cetakTab)

    expect(screen.getByText('Pratinjau Format Dokumen Cetak A4 Resmi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 Halaman' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Halaman 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Halaman 2' })).toBeInTheDocument()
  })

  it('memanggil window.print saat tombol Cetak / Print PDF diklik', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderModal()

    const printButton = screen.getByRole('button', { name: /cetak \/ print pdf/i })
    fireEvent.click(printButton)

    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })
})
