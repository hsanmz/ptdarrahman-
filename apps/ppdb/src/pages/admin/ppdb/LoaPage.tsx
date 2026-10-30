import { useState } from 'react'
import {
  FileBadge,
  Eye,
  Maximize2
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import LoaOfficialDocument, { type LoaData } from '@/components/shared/LoaOfficialDocument'

export default function LoaPage() {
  const [loaActivePage, setLoaActivePage] = useState<1 | 2>(1)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  // Sample data conforming to official LoaData
  const sampleLoaData: LoaData = {
    letter_number: 'LoA/PPDB/2026/REG-27102501079',
    registration_number: 'REG-27102501079',
    academic_year: '2026 / 2027',
    admission_officer: 'Ust. Wijaya Kurnia, M.Pd.',
    director_name: 'Ust. Dr. H. Abdurrahman, M.A.',
    location: 'Bekasi',
    date_str: '08 Oktober 2026',
    applicant: {
      id: 'app-dummy-1',
      full_name: 'MUHAMMAD ZIYAD HASAN',
      wave_name: 'Gelombang 1',
      nisn: '1234567890',
      previous_school: 'SMP Negeri 1 Cikarang Utara',
      parent_name: 'Hasan Basri',
    },
    fee_items: [
      { name: 'Biaya Pembangunan (Early Bird 1)', nominal: 10000000, description: 'Potongan diskon pendaftar awal, dibayarkan 1 (satu) kali.' },
      { name: 'SPP / Biaya Pendidikan Bulan Pertama', nominal: 1500000, description: 'Biaya bulanan mencakup asrama, konsumsi, dan program tahfidz.' },
      { name: 'Biaya Matrikulasi (Pre-Pesantren)', nominal: 1000000, description: 'Dibayarkan 1 (satu) kali untuk orientasi dan pembekalan adab.' },
      { name: 'Biaya Seragam, Kitab & Modul Digital', nominal: 2500000, description: '4 setel seragam santri, paket kitab tahfidz, dan akun LMS.' },
    ],
    total_fee: 15000000,
    minimum_dp: 5000000,
    discount_name: 'Potongan Biaya Pembangunan (Early Bird Gelombang 1)',
    deadline_lunas: '08 April 2027',
    fixed_clause: 'Seluruh dana yang telah dibayarkan tidak dapat dikembalikan.',
    is_graduated: true,
    is_loa_signed: true,
    loa_signed_at: '2026-10-08T10:30:00',
    loa_signer_name: 'Hasan Basri',
    loa_signer_relation: 'Ayah Kandung',
    va_bank: 'Bank Syariah Indonesia (BSI)',
    va_number: '88560 27 102 501079',
    whatsapp_group_link: 'https://chat.whatsapp.com/demo-santri-baru',
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Pratinjau Dokumen Pengumuman & Kelulusan"
        description="Pratinjau Letter of Acceptance (LoA) resmi yang ditandatangani sebagai tahap akhir pendaftaran."
        docKey="ppdb-loa"
      />

      {/* Document Showcase Card */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileBadge className="h-5 w-5 text-indigo-600 shrink-0" />
                <CardTitle className="text-base sm:text-lg font-semibold text-slate-800">
                  Showcase Pratinjau Dokumen (Dummy Data)
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pratinjau format visual LoA yang dihasilkan sistem.
              </p>
            </div>

            {/* Document Selector & Fullscreen Action */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullscreenOpen(true)}
                className="gap-1.5 text-xs h-8 bg-white shrink-0"
              >
                <Maximize2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span className="hidden xs:inline">Layar Penuh</span>
              </Button>
            </div>
          </div>

          {/* Sub-navigation for LoA Pages if LoA is selected */}
          {
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-200/70">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                <span className="text-xs font-medium text-slate-500 shrink-0">Lembar LoA:</span>
                <div className="inline-flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setLoaActivePage(1)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      loaActivePage === 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Hal 1: Rincian & Biaya
                  </button>
                  <button
                    onClick={() => setLoaActivePage(2)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      loaActivePage === 2
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Hal 2: Rekening VA & Cara Bayar
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                Format Surat Resmi Sesuai Standar Institusi (2 Halaman)
              </span>
            </div>
          }
        </CardHeader>

        <CardContent className="p-3 sm:p-6 bg-slate-100/60 min-h-[500px] flex items-center justify-start md:justify-center overflow-x-auto">
          <LoaOfficialDocument data={sampleLoaData} page={loaActivePage} />
        </CardContent>
      </Card>

      {/* Fullscreen Dialog Modal */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <DialogHeader className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Pratinjau Letter of Acceptance [LoA]</span>
            </DialogTitle>
            <div className="flex items-center gap-2 sm:mr-6 self-start sm:self-auto">
              {
                <div className="inline-flex gap-1 bg-white border border-slate-200 p-0.5 rounded-md">
                  <button
                    onClick={() => setLoaActivePage(1)}
                    className={`px-2 py-1 rounded text-xs ${
                      loaActivePage === 1 ? 'bg-indigo-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Halaman 1
                  </button>
                  <button
                    onClick={() => setLoaActivePage(2)}
                    className={`px-2 py-1 rounded text-xs ${
                      loaActivePage === 2 ? 'bg-indigo-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Halaman 2
                  </button>
                </div>
              }
            </div>
          </DialogHeader>

          <div className="flex justify-start md:justify-center py-4 overflow-x-auto">
            <LoaOfficialDocument data={sampleLoaData} page={loaActivePage} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
