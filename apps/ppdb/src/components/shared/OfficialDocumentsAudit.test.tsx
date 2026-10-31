import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoaOfficialDocument, { type LoaData } from './LoaOfficialDocument'
import ApplicantFormDocument from './ApplicantFormDocument'
import OfficialAssessmentSheet from './OfficialAssessmentSheet'

// Mock global fetch for company profile logo & contact info
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
)

const mockLoaData: LoaData = {
  letter_number: 'LOA/PPDB/2026/001',
  registration_number: 'REG-2026-001',
  academic_year: '2026/2027',
  admission_officer: 'Ust. Wijaya Kurnia, M.Pd.',
  location: 'Bekasi',
  date_str: '17 Oktober 2026',
  applicant: {
    id: 'app-001',
    full_name: 'Ahmad Faiz Syamil',
    wave_name: 'Gelombang 1',
    nisn: '1234567890',
    nik: '3275000000000001',
    previous_school: 'SMP Islam Terpadu',
    parent_name: 'Budi Santoso',
  },
  fee_items: [
    { name: 'Biaya Masuk', nominal: 10000000, description: 'Fasilitas santri' },
  ],
  total_fee: 10000000,
  minimum_dp: 3000000,
  deadline_lunas: '25 Oktober 2026',
  fixed_clause: 'Dana tidak dapat dikembalikan',
  is_graduated: true,
  is_loa_signed: false,
}

const mockApplicant = {
  id: 'app-001',
  full_name: 'Ahmad Faiz Syamil',
  nisn: '1234567890',
  nik: '3275000000000001',
  gender: 'L',
  birth_place: 'Bekasi',
  birth_date: '2010-05-15',
  religion: 'Islam',
  previous_school: 'SMP Islam Terpadu',
  wave_name: 'Gelombang 1',
  period_name: '2026/2027',
  payment_status: 'paid',
  status: 'document_uploaded',
  created_at: '2026-10-01T08:00:00Z',
  admission_officer: 'Ust. Wijaya Kurnia, M.Pd.',
}

describe('Audit Dokumen Resmi PPDB — QR Label & Naming Convention', () => {
  it('LoA: tidak ada label VERIFIED DIGITAL PANITIA PPDB dan memakai Office of Admission PPDB PTDARRAHMAN', () => {
    render(<LoaOfficialDocument data={mockLoaData} page="both" />)
    expect(screen.queryByText(/VERIFIED DIGITAL/i)).toBeNull()
    expect(screen.queryByText(/^PANITIA PPDB$/i)).toBeNull()
    expect(screen.getAllByText(/Office of Admission PPDB PTDARRAHMAN/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/PPDB Ar-Rahman/i)).toBeNull()
  })

  it('Formulir Pendaftar: tidak ada label VERIFIED DIGITAL PANITIA PPDB dan memakai Office of Admission PPDB PTDARRAHMAN', () => {
    render(<ApplicantFormDocument applicant={mockApplicant} page="both" />)
    expect(screen.queryByText(/VERIFIED DIGITAL/i)).toBeNull()
    expect(screen.queryByText(/PANITIA PPDB/i)).toBeNull()
    expect(screen.getByText(/Office of Admission PPDB PTDARRAHMAN/i)).toBeInTheDocument()
    expect(screen.queryByText(/PPDB Ar-Rahman/i)).toBeNull()
  })

  it('Lembar Penilaian Evaluator: tidak ada label VERIFIED DIGITAL PANITIA PPDB dan memakai Office of Admission PPDB PTDARRAHMAN', () => {
    render(<OfficialAssessmentSheet applicant={mockApplicant} categories={[]} />)
    expect(screen.queryByText(/VERIFIED DIGITAL/i)).toBeNull()
    expect(screen.queryByText(/PANITIA PPDB/i)).toBeNull()
    expect(screen.getByText(/Office of Admission PPDB PTDARRAHMAN/i)).toBeInTheDocument()
    expect(screen.queryByText(/PPDB Ar-Rahman/i)).toBeNull()
  })
})
