import { useState, useMemo } from 'react'
import { CheckCircle, FileText, Upload, AlertCircle, ShieldCheck, ExternalLink, Clock } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { BASE_DOCUMENTS, type DocumentSpec } from '@/constants/documents'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'

const CORE_DOCS = [
  'NISN',
  'Kartu Keluarga (KK)',
  'Akta Kelahiran',
  'Pas Foto',
  'KTP Orang Tua/Wali',
]

interface DocumentUploadStepProps {
  applicant: any
  documents: any[]
  requiredDocuments?: any[]
  onDocumentsChange: (docs: any[]) => void
  onSubmitRequest: (commitmentDeferred?: boolean) => void
}

export default function DocumentUploadStep({
  applicant,
  documents,
  requiredDocuments,
  onDocumentsChange,
  onSubmitRequest,
}: DocumentUploadStepProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState<string | null>(null)
  const [hasCommitment, setHasCommitment] = useState(false)

  const activeDocuments: (DocumentSpec | any)[] = (requiredDocuments && requiredDocuments.length > 0)
    ? requiredDocuments
    : BASE_DOCUMENTS

  const handleUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast('error', 'Ukuran file maksimal 2MB')
      e.target.value = ''
      return
    }

    setUploading(docType)
    const formData = new FormData()
    formData.append('doc_type', docType)
    formData.append('file', file)

    try {
      await api.apiFetch<any>('/ppdb/documents/upload', {
        method: 'POST',
        body: formData
      })
      toast('success', `Dokumen "${docType}" berhasil diunggah`)
      const docsRes = await api.apiFetch<any>('/ppdb/documents')
      onDocumentsChange(docsRes.data || [])
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunggah dokumen')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  // Identifikasi dokumen yang sudah diunggah
  const uploadedDocMap = useMemo(() => {
    const map = new Map<string, any>()
    documents.forEach((d) => {
      const type = d.doc_type || d.entity_type?.replace('ppdb_document:', '')
      if (type) map.set(type, d)
    })
    return map
  }, [documents])

  // Dokumen yang wajib diunggah
  const mandatoryDocs = useMemo(() => {
    return activeDocuments.filter((d: any) => d.required !== false)
  }, [activeDocuments])

  // Dokumen yang masih kurang
  const missingMandatory = useMemo(() => {
    return mandatoryDocs.filter((d: any) => !uploadedDocMap.has(d.name))
  }, [mandatoryDocs, uploadedDocMap])

  // Berkas pokok identitas yang belum diunggah
  const missingCore = useMemo(() => {
    return mandatoryDocs.filter((d: any) => CORE_DOCS.includes(d.name) && !uploadedDocMap.has(d.name))
  }, [mandatoryDocs, uploadedDocMap])

  // Berkas rapor yang belum diunggah
  const missingReports = useMemo(() => {
    return mandatoryDocs.filter((d: any) => !CORE_DOCS.includes(d.name) && !uploadedDocMap.has(d.name))
  }, [mandatoryDocs, uploadedDocMap])

  const canCommitmentApply = missingCore.length === 0 && missingReports.length > 0
  const canSubmitWithCommitment = canCommitmentApply && hasCommitment

  const isApproved = ['document_approved', 'selection', 'passed'].includes(applicant?.status)
  const isPendingOrRejected = ['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)
  const canSubmit = (missingMandatory.length === 0 || canSubmitWithCommitment) && isPendingOrRejected && !isApproved

  const isCommitmentNote = applicant?.rejection_reason?.startsWith('[BERKAS MENYUSUL]')
  const isRealRejection = applicant?.status === 'document_rejected' && !isCommitmentNote

  return (
    <div className="space-y-4">
      {/* Banner Dokumen Terverifikasi & Disetujui (Completed State) */}
      {isApproved && (
        <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-emerald-900 text-sm">Seluruh Dokumen Persyaratan Terverifikasi</h4>
                <Badge variant="success" className="text-[10px] font-semibold">Lolos Verifikasi</Badge>
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Berkas pendaftaran Anda telah diperiksa dan disetujui resmi oleh Panitia PPDB Ar-Rahman. Seluruh berkas telah dikunci untuk arsip seleksi penerimaan santri baru.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner Komitmen Berkas Menyusul */}
      {isCommitmentNote && (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="p-4 flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="block text-amber-950 font-semibold mb-0.5">
                Pengajuan Komitmen Berkas Menyusul
              </strong>
              {applicant.rejection_reason.replace('[BERKAS MENYUSUL]: ', '')}. Berkas Anda sedang dalam proses verifikasi panitia.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kartu Alasan Ditolak jika Status document_rejected (Rejection murni) */}
      {isRealRejection && (
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" /> Dokumen Anda Ditolak / Perlu Revisi
            </p>
            <p className="text-sm text-red-700 mt-1">
              {applicant.rejection_reason ? (
                <>Alasan: <span className="font-medium">{applicant.rejection_reason}</span></>
              ) : (
                'Silakan periksa kembali dan unggah ulang dokumen yang diminta, lalu kirim ulang untuk diverifikasi.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Format yang didukung: <strong>PDF, JPG, JPEG, PNG</strong> (Maksimal 2MB per file).
      </p>

      {/* Grid Dokumen Persyaratan */}
      <div className="grid gap-3">
        {activeDocuments.map((doc: any, idx: number) => {
          const uploaded = uploadedDocMap.get(doc.name)
          const isUploading = uploading === doc.name
          const isMandatory = doc.required !== false

          return (
            <Card key={idx} className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors">
              <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center mt-0.5 sm:mt-0 ${uploaded ? 'bg-emerald-100 text-emerald-600' : isMandatory ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'}`}>
                    {uploaded ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-slate-900 break-words">
                        {doc.name}
                        {isMandatory && <span className="text-rose-500 font-bold ml-1 text-sm" title="Diperlukan">*</span>}
                      </p>
                      {uploaded ? (
                        <Badge variant="success" className="text-[10px] font-medium px-2 py-0 h-5">
                          {isApproved ? 'Terverifikasi' : 'Terunggah'}
                        </Badge>
                      ) : hasCommitment && !CORE_DOCS.includes(doc.name) ? (
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 h-5 border-amber-300 bg-amber-50 text-amber-800">
                          Menyusul
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 h-5 text-slate-500">
                          Belum diunggah
                        </Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{doc.description}</p>
                    )}
                    {uploaded && (
                      <a href={uploaded.public_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1.5 inline-block font-medium break-all">
                        Lihat berkas
                      </a>
                    )}
                  </div>
                </div>
                <div className="shrink-0 relative w-full sm:w-auto">
                  {isApproved ? (
                    uploaded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto h-9 gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-medium"
                        onClick={() => window.open(uploaded.public_url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Buka Berkas
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-xs py-1 px-2.5">Menyusul</Badge>
                    )
                  ) : (
                    <>
                      <input
                        type="file"
                        id={`doc-upload-${idx}`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleUpload(doc.name, e)}
                        disabled={isUploading || !isPendingOrRejected}
                      />
                      <Button size="sm" variant={uploaded ? "outline" : "default"} className="w-full sm:w-auto h-10 sm:h-9 gap-2 pointer-events-none" disabled={isUploading || !isPendingOrRejected}>
                        {isUploading ? <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : <Upload className="h-3.5 w-3.5" />}
                        {isUploading ? 'Mengunggah...' : uploaded ? 'Ganti Berkas' : 'Upload Berkas'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Opsi Komitmen Berkas Menyusul jika 5 berkas pokok sudah terisi tapi ada rapor belum terbit */}
      {canCommitmentApply && isPendingOrRejected && !isApproved && (
        <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/90 to-amber-50/40 shadow-xs">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="commitment-deferred-checkbox"
              checked={hasCommitment}
              onChange={(e) => setHasCommitment(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
            />
            <div className="text-xs text-amber-950 leading-relaxed">
              <strong className="block text-amber-900 font-semibold text-sm mb-0.5">
                Pernyataan Berkas Rapor Belum Terbit dari Sekolah Asal (Menyusul)
              </strong>
              Sebagian rapor (<strong>{missingReports.map((d: any) => d.name).join(', ')}</strong>) belum diterbitkan atau belum dibagikan oleh sekolah asal. Saya bersedia melanjutkan tahapan pendaftaran dan berkomitmen menyerahkan berkas susulan tersebut saat daftar ulang / kedatangan santri ke pesantren.
            </div>
          </label>
        </div>
      )}

      {/* Info Validasi Kelengkapan Dokumen & Tombol Submit */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t">
        <div className="text-xs min-w-0 flex-1">
          {isApproved ? (
            <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              Status: Seluruh berkas persyaratan telah divalidasi dan disetujui panitia.
            </span>
          ) : missingCore.length > 0 ? (
            <span className="text-rose-700 font-medium flex items-start sm:items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5 sm:mt-0" />
              <span className="break-words">
                Berkas pokok identitas belum lengkap: <strong>{missingCore.map((d: any) => d.name).join(', ')}</strong>
              </span>
            </span>
          ) : missingReports.length > 0 && !hasCommitment ? (
            <span className="text-amber-700 font-medium flex items-start sm:items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
              <span className="break-words">
                Terdapat {missingReports.length} rapor yang belum diunggah. Centang pernyataan komitmen menyusul di atas jika rapor belum diterbitkan sekolah asal.
              </span>
            </span>
          ) : missingReports.length > 0 && hasCommitment ? (
            <span className="text-amber-800 font-medium flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-amber-600" />
              Komitmen berkas menyusul aktif. Anda dapat langsung mengirim berkas untuk diverifikasi panitia.
            </span>
          ) : (
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              Seluruh berkas persyaratan telah lengkap diunggah!
            </span>
          )}
        </div>

        {isApproved ? (
          <Badge variant="success" className="py-2 px-3.5 text-xs font-semibold gap-1.5 self-start sm:self-auto h-10 sm:h-9">
            <ShieldCheck className="w-4 h-4" /> Dokumen Terverifikasi
          </Badge>
        ) : (
          <Button
            disabled={!canSubmit}
            onClick={() => onSubmitRequest(canSubmitWithCommitment)}
            className="w-full sm:w-auto h-11 sm:h-10 font-bold"
          >
            {applicant?.status === 'document_uploaded_pending' ? 'Kirim' :
             applicant?.status === 'document_rejected' ? 'Kirim Ulang' :
             'Menunggu Review'}
          </Button>
        )}
      </div>
    </div>
  )
}
