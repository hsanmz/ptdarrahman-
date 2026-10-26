import { useState } from 'react'
import ApplicantLoAModal from '@/components/shared/ApplicantLoAModal'
import ApplicantSignLoAModal from '@/components/shared/ApplicantSignLoAModal'
import {
  CheckCircle,
  X,
  FileSignature,
  AlertTriangle,
  ShieldCheck,
  PenTool,
} from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'

interface ResultStepProps {
  applicant: any
  selectionResult: any
  loa?: any
}

export default function ResultStep({ applicant, selectionResult, loa }: ResultStepProps) {
  const [showLoaModal, setShowLoaModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)

  const isLoaSigned = Boolean(loa?.is_loa_signed || applicant?.is_loa_signed)

  return (
    <div className="space-y-6">
      {applicant?.status === 'passed' ? (
        <div className="space-y-6">
          {/* Pass Banner */}
          <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                <div className="w-12 h-12 shrink-0 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-800">Selamat! Anda Dinyatakan Lulus</h3>
                  <p className="text-emerald-700 text-sm mt-1">
                    Selamat, Anda telah lulus seleksi PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
                  </p>
                </div>
              </div>

              {selectionResult?.scores && selectionResult.scores.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-4 sm:mt-6">
                  {selectionResult.scores.map((sc: any, idx: number) => (
                    <div key={idx} className="bg-white border border-emerald-100 rounded-xl p-3 flex justify-between items-center shadow-2xs gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{sc.category_name}</p>
                        <p className="text-sm font-medium text-emerald-900 break-words">{sc.criteria_name}</p>
                      </div>
                      <div className="text-xl font-bold text-emerald-700 shrink-0">{sc.score}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* LoA Section */}
          <div className="border border-emerald-200 rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-emerald-50/70 p-4 sm:p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <FileSignature className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-emerald-950 text-base">Dokumen Letter of Acceptance (LoA)</h4>
                  <p className="text-xs text-emerald-700 truncate">Surat Resmi Penerimaan Santri Baru & Persetujuan Orang Tua/Wali</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isLoaSigned ? (
                  <>
                    <Badge variant="success" className="gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Sudah Ditandatangani
                    </Badge>
                    <Button onClick={() => setShowLoaModal(true)} className="w-full sm:w-auto h-9 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 font-semibold text-xs cursor-pointer">
                      <FileSignature className="w-4 h-4" />
                      Buka / Unduh LoA
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="warning" className="gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800 border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Wajib Ditandatangani
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={() => setShowLoaModal(true)}
                      className="w-full sm:w-auto h-9 gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0 font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      <FileSignature className="w-4 h-4 text-slate-600" />
                      Lihat Dokumen LoA
                    </Button>
                    <Button
                      onClick={() => setShowSignModal(true)}
                      className="w-full sm:w-auto h-9 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <PenTool className="w-4 h-4" />
                      Tanda Tangani LoA
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {!isLoaSigned ? (
                <div className="p-4 sm:p-5 bg-amber-50/95 border-2 border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <PenTool className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-950 text-sm">
                        Konfirmasi Dua Pihak: Tanda Tangan Digital Orang Tua / Wali di Aplikasi
                      </p>
                      <p className="text-amber-900 leading-relaxed text-xs">
                        Calon santri yang dinyatakan lulus wajib melakukan konfirmasi dengan cara membubuhkan <strong>Tanda Tangan Digital Orang Tua / Wali secara langsung di aplikasi ini</strong> untuk menyelesaikan pendaftaran. Tanda tangan dan nama orang tua/wali akan otomatis tercantum pada dokumen Letter of Acceptance (LoA).
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => setShowLoaModal(true)}
                      className="w-full sm:w-auto h-10 px-4 gap-2 bg-white hover:bg-amber-100/50 border-amber-300 text-amber-950 font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      <FileSignature className="w-4 h-4 text-amber-700" />
                      Lihat Dokumen LoA
                    </Button>
                    <Button
                      onClick={() => setShowSignModal(true)}
                      className="w-full sm:w-auto h-10 px-5 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      <PenTool className="w-4 h-4" />
                      Tanda Tangani LoA Sekarang
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs sm:text-sm flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Alhamdulillah! Dokumen LoA Resmi Telah Ditandatangani</p>
                    <p className="text-emerald-700 text-xs mt-0.5">
                      Seluruh rangkaian pendaftaran PPDB telah selesai. Dokumen Letter of Acceptance (LoA) sah dapat Anda unduh kapan saja sebagai arsip bukti penerimaan resmi santri.
                    </p>
                  </div>
                </div>
              )}
              <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">Klausul Resmi PPDB:</p>
                  <p className="mt-0.5 font-medium text-slate-800 italic">
                    "Seluruh dana yang telah dibayarkan tidak dapat dikembalikan."
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ApplicantLoAModal open={showLoaModal} onOpenChange={setShowLoaModal} applicantId={applicant?.id} isApplicantPortal={true} />
          <ApplicantSignLoAModal open={showSignModal} onOpenChange={setShowSignModal} applicantId={applicant?.id} isApplicantPortal={true} />
        </div>
      ) : applicant?.status === 'failed' ? (
        <div className="p-6 sm:p-8 border rounded-2xl text-center bg-red-50/70 border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Dinyatakan Tidak Lulus</h3>
          <p className="text-red-700 text-sm max-w-md mx-auto leading-relaxed">
            Terima kasih telah berpartisipasi dalam proses seleksi PPDB Pesantren Tahfidz Qur'an dan Digital Arrahman.
          </p>
        </div>
      ) : (
        <div className="p-6 sm:p-8 border rounded-2xl text-center bg-muted/10">
          <p className="text-muted-foreground text-sm">Belum ada hasil pendaftaran. Silakan cek kembali nanti.</p>
        </div>
      )}
    </div>
  )
}
