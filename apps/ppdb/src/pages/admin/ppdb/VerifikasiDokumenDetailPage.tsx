import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { DocTrigger } from '@repo/ui'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  X,
  XCircle,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  User,
  Users,
  Home,
  HeartPulse,
  MessageCircle,
  Eye,
  Send,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
} from '@/components/ui'
import { BASE_DOCUMENTS } from '@/constants/documents'
import { HealthIdentificationViewer } from '@/components/shared/HealthIdentificationViewer'
import { cn } from '@/lib/utils'

interface DocumentItem {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  public_url: string
  doc_type: string
  created_at: string
}

interface DocReviewState {
  status: 'approved' | 'rejected'
  reason?: string
}

const REJECTION_SUGGESTIONS = [
  'Foto buram / tidak terbaca',
  'Dokumen terpotong / halaman tidak lengkap',
  'Bukan dokumen asli atau legalisir',
  'Data tidak sesuai dengan biodata formulir',
  'Format atau orientasi foto miring / terbalik',
  'Masa berlaku berkas telah kedaluwarsa',
  'Berkas belum diunggah, wajib dilengkapi',
]

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return String(dateStr)
  }
}

function findUploadedDoc(docs: DocumentItem[] | undefined, specName: string): DocumentItem | undefined {
  if (!docs || !Array.isArray(docs)) return undefined
  const sn = specName.toLowerCase()
  return docs.find((d) => {
    const dt = (d.doc_type || '').toLowerCase()
    if (dt === sn) return true
    if (sn.includes('kartu keluarga') && (dt === 'kk' || dt.includes('keluarga'))) return true
    if (sn.includes('akta') && (dt === 'akta' || dt.includes('lahir'))) return true
    if (sn.includes('pas foto') && (dt === 'foto' || dt.includes('foto'))) return true
    if (sn.includes('nisn') && dt.includes('nisn')) return true
    if (sn.includes('ktp') && dt.includes('ktp')) return true
    if (sn.includes('semester 1') && dt.includes('1')) return true
    if (sn.includes('semester 2') && dt.includes('2')) return true
    if (sn.includes('semester 3') && dt.includes('3')) return true
    if (sn.includes('semester 4') && dt.includes('4')) return true
    return false
  })
}

export default function VerifikasiDokumenDetailPage() {
  const { id: applicantId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Mobile / Tablet Tab Switcher (< lg)
  const [mobileTab, setMobileTab] = useState<'documents' | 'form'>('documents')

  // Accordion state (set of open document names)
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({})

  // Per-document review state: { [specName]: { status: 'approved' | 'rejected', reason?: string } }
  const [docReviews, setDocReviews] = useState<Record<string, DocReviewState>>({})

  // Inline rejection editing panel: which document is currently opening rejection note
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null)
  const [inlineRejectNote, setInlineRejectNote] = useState('')

  // Confirmation modal state: 'approve' | 'reject' | null
  const [confirmModalType, setConfirmModalType] = useState<'approve' | 'reject' | null>(null)

  // Image preview lightbox
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  // Fetch applicant form data
  const {
    data: applicant,
    isLoading: loadingApplicant,
    isError: isApplicantError,
    error: applicantError,
    refetch: refetchApplicant,
  } = useQuery({
    queryKey: ['applicant-detail', applicantId],
    queryFn: async () => {
      if (!applicantId) throw new Error('ID Pendaftar tidak ditemukan')
      return await apiFetch<any>(`/ppdb/applicants/${applicantId}`)
    },
    enabled: !!applicantId,
    retry: 1,
    staleTime: 30000,
  })

  // Fetch applicant documents
  const {
    data: docsData,
    isLoading: loadingDocs,
    isError: isDocsError,
    error: docsError,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['applicant-documents', applicantId],
    queryFn: async () => {
      if (!applicantId) throw new Error('ID Pendaftar tidak ditemukan')
      const res = await apiFetch<{ data: DocumentItem[] }>(`/ppdb/applicants/${applicantId}/documents`)
      return res?.data || []
    },
    enabled: !!applicantId,
    retry: 1,
    staleTime: 30000,
  })

  const uploadedDocs = useMemo(() => docsData || [], [docsData])

  // Initialize docReviews from applicant current state when data loads
  useEffect(() => {
    if (!applicant) return
    const initial: Record<string, DocReviewState> = {}

    // If applicant is already approved, pre-populate all uploaded documents as approved
    if (['document_approved', 'selection', 'passed'].includes(applicant.status)) {
      BASE_DOCUMENTS.forEach((spec) => {
        const doc = findUploadedDoc(uploadedDocs, spec.name)
        if (doc) {
          initial[spec.name] = { status: 'approved' }
        }
      })
    } else if (applicant.status === 'document_rejected' && applicant.rejection_reason) {
      // Parse rejection note to pre-fill rejected items
      const reasonText = applicant.rejection_reason
      BASE_DOCUMENTS.forEach((spec) => {
        const doc = findUploadedDoc(uploadedDocs, spec.name)
        const namePattern = spec.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(?:•\\s*)?${namePattern}(?:\\s*:\\s*|\\s*-\\s*)([^•\n]+)`, 'i')
        const match = reasonText.match(regex)
        if (match) {
          initial[spec.name] = { status: 'rejected', reason: match[1]?.trim() }
        } else if (reasonText.toLowerCase().includes(spec.name.toLowerCase())) {
          initial[spec.name] = { status: 'rejected', reason: 'Perlu perbaikan sesuai catatan panitia' }
        } else if (doc) {
          // Document was uploaded and not mentioned as rejected
        }
      })
    }
    setDocReviews(initial)
  }, [applicant?.status, applicant?.rejection_reason, uploadedDocs])

  // Calculate review progress and statuses

  const rejectedSpecs = useMemo(() => {
    return BASE_DOCUMENTS.filter((spec) => docReviews[spec.name]?.status === 'rejected')
  }, [docReviews])

  const approvedSpecs = useMemo(() => {
    return BASE_DOCUMENTS.filter((spec) => docReviews[spec.name]?.status === 'approved')
  }, [docReviews])

  // Dokumen yang belum memiliki status sama sekali (belum dinilai)
  const unreviewedSpecs = useMemo(() => {
    return BASE_DOCUMENTS.filter((spec) => !docReviews[spec.name]?.status)
  }, [docReviews])

  const unreviewedCount = unreviewedSpecs.length
  const isAllReviewed = unreviewedCount === 0
  const hasRejections = rejectedSpecs.length > 0

  // Mutation for verifying documents
  const verifyMutation = useMutation({
    mutationFn: async ({
      status,
      reason,
    }: {
      status: 'document_approved' | 'document_rejected'
      reason?: string
    }) => {
      return apiFetch(`/ppdb/applicants/${applicantId}/documents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason }),
      })
    },
    onSuccess: (_, variables) => {
      const isApproved = variables.status === 'document_approved'
      toast(
        'success',
        isApproved
          ? 'Seluruh berkas pendaftar berhasil disetujui (Lolos Verifikasi)!'
          : 'Catatan revisi dokumen berhasil dikirim ke calon santri.'
      )
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
      queryClient.invalidateQueries({ queryKey: ['applicants-docs'] })
      queryClient.invalidateQueries({ queryKey: ['applicant-detail', applicantId] })
      queryClient.invalidateQueries({ queryKey: ['applicant-documents', applicantId] })
      refetchApplicant()
      refetchDocs()
      setConfirmModalType(null)
      setRejectingDoc(null)
      setInlineRejectNote('')
    },
    onError: (err: any) => {
      toast('error', err?.message || 'Gagal mengubah status verifikasi dokumen')
    },
  })

  // Accordion open/collapse
  const toggleAccordion = (name: string) => {
    setOpenAccordion((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  const handleToggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {}
    BASE_DOCUMENTS.forEach((d) => {
      next[d.name] = expand
    })
    setOpenAccordion(next)
  }

  // Action: Mark single document as APPROVED
  const handleSetDocApproved = (specName: string) => {
    setDocReviews((prev) => ({
      ...prev,
      [specName]: { status: 'approved' },
    }))
    if (rejectingDoc === specName) {
      setRejectingDoc(null)
      setInlineRejectNote('')
    }
    toast('success', `Berkas "${specName}" ditandai valid / disetujui.`)
  }

  // Action: Open inline rejection panel for a document
  const handleOpenRejectPanel = (specName: string) => {
    setRejectingDoc(specName)
    setInlineRejectNote(docReviews[specName]?.reason || '')
    // Auto expand accordion if collapsed
    setOpenAccordion((prev) => ({ ...prev, [specName]: true }))
  }

  // Action: Confirm inline rejection for a document
  const handleSaveDocRejection = (specName: string) => {
    if (!inlineRejectNote.trim()) {
      toast('error', `Tuliskan catatan alasan revisi untuk berkas "${specName}".`)
      return
    }
    setDocReviews((prev) => ({
      ...prev,
      [specName]: {
        status: 'rejected',
        reason: inlineRejectNote.trim(),
      },
    }))
    setRejectingDoc(null)
    setInlineRejectNote('')
    toast('info', `Berkas "${specName}" ditandai perlu revisi.`)
  }

  // Action: Reset/Undo review on a document
  const handleResetDocReview = (specName: string) => {
    setDocReviews((prev) => {
      const next = { ...prev }
      delete next[specName]
      return next
    })
    if (rejectingDoc === specName) {
      setRejectingDoc(null)
      setInlineRejectNote('')
    }
    toast('info', `Status penilaian berkas "${specName}" di-reset.`)
  }

  // Action: Approve all documents that are not yet marked rejected
  const handleApproveAllRemaining = () => {
    setDocReviews((prev) => {
      const next = { ...prev }
      BASE_DOCUMENTS.forEach((spec) => {
        // If not already rejected, approve it
        if (next[spec.name]?.status !== 'rejected') {
          next[spec.name] = { status: 'approved' }
        }
      })
      return next
    })
    toast('success', 'Seluruh berkas dokumen berhasil ditandai sah / disetujui.')
  }

  // Execution: Submit Revisions to applicant
  const handleExecuteSendRevisions = () => {
    if (rejectedSpecs.length === 0) {
      toast('error', 'Tidak ada dokumen yang berstatus ditolak.')
      return
    }
    const formattedReason =
      `[REVISI DOKUMEN]: ` +
      rejectedSpecs
        .map((spec) => `• ${spec.name}: ${docReviews[spec.name]?.reason || 'Perlu diperbaiki'}`)
        .join(' ')

    verifyMutation.mutate({
      status: 'document_rejected',
      reason: formattedReason,
    })
  }

  // Execution: Submit Final Approval
  const handleExecuteApproval = () => {
    verifyMutation.mutate({
      status: 'document_approved',
    })
  }

  const currentStatus = applicant?.status || 'document_uploaded_pending'
  const isApproved = ['document_approved', 'selection', 'passed'].includes(currentStatus)
  const isRejected = currentStatus === 'document_rejected'
  const isCommitmentNote = applicant?.rejection_reason?.startsWith('[BERKAS MENYUSUL]')

  if (loadingApplicant) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[600px] w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isApplicantError || !applicant) {
    const errorMsg =
      (applicantError as any)?.message ||
      `Data calon santri dengan ID "${applicantId}" tidak dapat dimuat atau belum tersedia.`

    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4 my-16 bg-white rounded-2xl border border-slate-200/90 shadow-sm animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Gagal Memuat Data Calon Santri</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">{errorMsg}</p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            onClick={() => refetchApplicant()}
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3.5"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Coba Lagi
          </Button>
          <Button
            onClick={() => navigate('/admin/verifikasi-dokumen')}
            variant="outline"
            size="sm"
            className="text-xs h-9 px-3.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Kembali ke Daftar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="-m-3.5 sm:-m-4 md:-m-6 lg:-m-8 flex flex-col h-auto lg:h-[calc(100vh-3.6rem)] lg:max-h-[calc(100vh-3.6rem)] lg:overflow-hidden bg-slate-50/60 select-text animate-fade-in">
      {/* ══════════════════════════════════════════════════════════════════
          1. HEADER WORKSPACE VERIFIKASI (Sticky 1 Baris Penuh di Atas)
          ══════════════════════════════════════════════════════════════════ */}
      <header className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/80 shrink-0 z-20 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sisi Kiri: Navigasi Kembali & Identitas Pendaftar */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/verifikasi-dokumen')}
              className="h-9 px-2.5 sm:px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl shrink-0"
              title="Kembali ke Daftar Verifikasi Dokumen"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span className="text-xs font-semibold">Daftar</span>
            </Button>

            <div className="h-5 w-px bg-slate-200 shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate max-w-[280px] sm:max-w-md">
                  Verifikasi: {applicant.full_name}
                </h1>
                <Badge
                  variant={isApproved ? 'success' : isRejected ? 'destructive' : isCommitmentNote ? 'warning' : 'outline'}
                  className={cn(
                    'text-[10px] uppercase font-bold px-2 py-0.5',
                    !isApproved && !isRejected && isCommitmentNote && 'bg-amber-50 text-amber-800 border-amber-300',
                    !isApproved && !isRejected && !isCommitmentNote && 'bg-blue-50 text-blue-700 border-blue-200'
                  )}
                >
                  {isApproved
                    ? 'Disetujui'
                    : isRejected
                    ? 'Perlu Revisi Dokumen'
                    : isCommitmentNote
                    ? 'Menunggu (Berkas Menyusul)'
                    : 'Menunggu Verifikasi'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                No. Registrasi: <span className="font-mono font-medium text-slate-700">{applicant.registration_number || applicant.id.slice(0, 8).toUpperCase()}</span> • {applicant.wave_name || 'Gelombang 1'}
              </p>
            </div>
          </div>

          {/* Sisi Kanan: SINGLE ADAPTIVE ACTION BUTTON & BookOpen Trigger */}
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            {/* Indikator dokumen yang belum dinilai jika masih ada */}
            {!isAllReviewed && !isApproved && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium animate-fade-in">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{unreviewedCount} berkas belum dinilai</span>
              </div>
            )}

            {/* JIKA ADA DOKUMEN DITOLAK: HANYA TAMPILKAN TOMBOL KIRIM REVISI (DAPAT DIKLIK JIKA SELURUH DOKUMEN SUDAH DINILAI) */}
            {hasRejections ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmModalType('reject')}
                disabled={verifyMutation.isPending || !isAllReviewed}
                className={cn(
                  'h-9 px-3.5 gap-2 text-white text-xs font-bold shadow-2xs transition-all',
                  isAllReviewed
                    ? 'bg-rose-600 hover:bg-rose-700 animate-fade-in cursor-pointer'
                    : 'bg-rose-300 hover:bg-rose-300 opacity-60 cursor-not-allowed'
                )}
                title={
                  !isAllReviewed
                    ? `Harap tentukan status (setujui/tolak) pada ${unreviewedCount} dokumen tersisa sebelum mengirim revisi`
                    : `Kirim catatan perbaikan untuk ${rejectedSpecs.length} berkas yang ditolak`
                }
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Kirim Revisi ({rejectedSpecs.length})</span>
              </Button>
            ) : isApproved ? (
              /* JIKA SUDAH DISETUJUI RESMI */
              <Badge
                variant="success"
                className="h-9 px-3 gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Dokumen Telah Diverifikasi</span>
              </Badge>
            ) : (
              /* JIKA TIDAK ADA DOKUMEN DITOLAK: TAMPILKAN TOMBOL VERIFIKASI DOKUMEN (DAPAT DIKLIK JIKA SEMUA SUDAH DINILAI) */
              <Button
                size="sm"
                variant="default"
                onClick={() => setConfirmModalType('approve')}
                disabled={verifyMutation.isPending || !isAllReviewed}
                className={cn(
                  'h-9 px-3.5 gap-2 text-white text-xs font-bold shadow-2xs transition-all',
                  isAllReviewed
                    ? 'bg-emerald-600 hover:bg-emerald-700 animate-fade-in cursor-pointer'
                    : 'bg-slate-200 hover:bg-slate-200 text-slate-400 border border-slate-300/80 cursor-not-allowed'
                )}
                title={
                  !isAllReviewed
                    ? `Harap periksa dan tentukan status seluruh ${BASE_DOCUMENTS.length} dokumen (${unreviewedCount} belum dinilai) terlebih dahulu`
                    : 'Verifikasi seluruh berkas calon santri (lolos verifikasi berkas)'
                }
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verifikasi Dokumen</span>
              </Button>
            )}

            {/* Documentation Trigger Button (lucide:bookopen) */}
            <div className="h-5 w-px bg-slate-200 shrink-0" />
            <DocTrigger docKey="ppdb-verifikasi-dokumen" variant="light" />
          </div>
        </div>
      </header>

      {/* ── Mobile/Tablet View Switcher (< lg) ── */}
      <div className="flex lg:hidden items-center p-1 bg-slate-200/70 rounded-xl m-3 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('documents')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all',
            mobileTab === 'documents' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>Berkas Dokumen ({uploadedDocs.length}/9)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all',
            mobileTab === 'form' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Formulir Pendaftar</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. AREA DUA CONTAINER DENGAN INDEPENDENT SCROLL (NO SCROLLBAR)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* ──────────────────────────────────────────────────────────────
            CONTAINER KIRI: DOKUMEN ACCORDION (LEBIH LEBAR: ~64%)
            ────────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'w-full lg:w-[60%] xl:w-[64%] min-h-0 min-w-0 shrink-0 bg-slate-50/50 p-4 sm:p-6 lg:p-7 space-y-4 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            mobileTab !== 'documents' && 'hidden lg:block'
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Top Bar Container Kiri */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="space-y-0.5">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Berkas Dokumen Persyaratan
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span>{uploadedDocs.length} dari {BASE_DOCUMENTS.length} terunggah</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">{approvedSpecs.length} disetujui</span>
                {hasRejections && (
                  <>
                    <span>•</span>
                    <span className="text-rose-700 font-bold">{rejectedSpecs.length} ditolak</span>
                  </>
                )}
                {unreviewedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 font-semibold">{unreviewedCount} belum dinilai</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {unreviewedCount > 0 && !hasRejections && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApproveAllRemaining}
                  className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100"
                  title="Tandai semua berkas yang belum dinilai sebagai sah/disetujui"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Setujui Semua ({unreviewedCount})
                </Button>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                  className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Buka Semua
                </Button>
                <span className="text-slate-300">|</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                  className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Tutup Semua
                </Button>
              </div>
            </div>
          </div>

          {/* Banner Peringatan: Jika Masih Ada Dokumen yang Belum Dinilai */}
          {!isAllReviewed && !isApproved && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed flex-1">
                <p className="font-bold text-amber-950">
                  Terdapat {unreviewedCount} dokumen yang belum memiliki status penilaian:
                </p>
                <p className="text-[11px] text-amber-800">
                  Harap tentukan status <strong>Setujui</strong> atau <strong>Tolak</strong> pada setiap berkas di bawah ini hingga lengkap. Tombol <strong>"Verifikasi Dokumen"</strong> atau <strong>"Kirim Revisi"</strong> di header atas baru dapat diklik setelah seluruh dokumen memiliki status.
                </p>
              </div>
            </div>
          )}

          {/* Banner Status Dinamis: Jika Ada Dokumen Ditolak */}
          {hasRejections && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5 shadow-2xs animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed flex-1">
                <p className="font-bold text-rose-950">
                  Terdapat {rejectedSpecs.length} dokumen yang ditandai perlu revisi:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-rose-800 text-[11px]">
                  {rejectedSpecs.map((spec) => (
                    <li key={spec.name}>
                      <span className="font-semibold">{spec.name}:</span>{' '}
                      {docReviews[spec.name]?.reason || 'Perlu perbaikan'}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-rose-700 font-medium pt-0.5">
                  {isAllReviewed ? (
                    <span>
                      ✓ Seluruh dokumen telah diperiksa. Silakan klik tombol <strong>"Kirim Revisi ({rejectedSpecs.length})"</strong> di header untuk mengirimkan catatan perbaikan ke calon santri.
                    </span>
                  ) : (
                    <span>
                      ⚠️ Selesaikan penilaian pada <strong>{unreviewedCount} berkas tersisa</strong> agar tombol Kirim Revisi dapat diproses.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Banner Status Dinamis: Seluruh Dokumen Telah Dinilai dan Semuanya Sah/Valid */}
          {!hasRejections && isAllReviewed && !isApproved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-2xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Seluruh berkas dokumen ({approvedSpecs.length}/{BASE_DOCUMENTS.length}) telah diperiksa dan sah.
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">
                Klik tombol <strong>"Verifikasi Dokumen"</strong> di header untuk menyelesaikan.
              </span>
            </div>
          )}

          {/* Banner Komitmen Berkas Menyusul */}
          {isCommitmentNote && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold text-amber-950 block">Komitmen Berkas Rapor Menyusul:</span>
                <p className="text-amber-800">{applicant.rejection_reason.replace('[BERKAS MENYUSUL]: ', '')}</p>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  💡 Panitia dapat langsung menyetujui calon santri untuk melanjutkan ke sesi Ujian Tahfidz &amp; Wawancara. Berkas fisik dapat diserahkan saat daftar ulang.
                </p>
              </div>
            </div>
          )}

          {/* ACCORDION LIST: 9 Dokumen Baku */}
          {loadingDocs ? (
            <div className="space-y-3 pb-16">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-44 rounded-md" />
                    <Skeleton className="h-7 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-72 rounded-md" />
                </div>
              ))}
            </div>
          ) : isDocsError ? (
            <div className="p-6 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-xl my-4">
              <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto" />
              <p className="text-xs font-bold text-rose-950">Gagal Memuat Berkas Dokumen</p>
              <p className="text-[11px] text-rose-800 leading-relaxed max-w-sm mx-auto">
                {(docsError as any)?.message || 'Terjadi kendala jaringan saat mengambil daftar dokumen dari server.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchDocs()}
                className="h-8 px-3 text-xs border-rose-300 text-rose-800 bg-white hover:bg-rose-100 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Coba Muat Ulang Berkas
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pb-16">
              {BASE_DOCUMENTS.map((spec, idx) => {
              const doc = findUploadedDoc(uploadedDocs, spec.name)
              const isOpen = openAccordion[spec.name] ?? idx < 2 // Default expand first 2
              const isUploaded = !!doc
              const isImage = doc?.mime_type.startsWith('image/')
              const isPdf = doc?.mime_type === 'application/pdf'
              const isDeferrable = !['NISN', 'Kartu Keluarga (KK)', 'Akta Kelahiran', 'Pas Foto', 'KTP Orang Tua/Wali'].includes(spec.name)

              const review = docReviews[spec.name]
              const isDocApproved = review?.status === 'approved'
              const isDocRejected = review?.status === 'rejected'
              const isRejectingThis = rejectingDoc === spec.name

              return (
                <Card
                  key={spec.name}
                  className={cn(
                    'border transition-all overflow-hidden shadow-2xs',
                    isDocRejected
                      ? 'border-rose-300 bg-rose-50/20'
                      : isDocApproved
                      ? 'border-emerald-200 bg-white'
                      : isUploaded
                      ? 'border-slate-200/90 bg-white hover:border-slate-300'
                      : 'border-slate-200/60 bg-white/70'
                  )}
                >
                  {/* Accordion Header / Top Action Bar: VERIFIKASI 1 PER 1 LANGSUNG DI HEADER */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-b border-slate-100">
                    {/* Sisi Kiri: Klik untuk Expand/Collapse */}
                    <button
                      type="button"
                      onClick={() => toggleAccordion(spec.name)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1 group cursor-pointer"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          isDocRejected
                            ? 'bg-rose-100 text-rose-700'
                            : isDocApproved
                            ? 'bg-emerald-100 text-emerald-700'
                            : isUploaded
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-100 text-slate-400'
                        )}
                      >
                        {isDocRejected ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : isDocApproved ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : isUploaded ? (
                          <FileText className="w-4 h-4 text-slate-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors',
                              isDocRejected && 'text-rose-900',
                              isDocApproved && 'text-emerald-950'
                            )}
                          >
                            {spec.name}
                          </span>
                          <span className="text-rose-500 font-bold text-xs" title="Diperlukan">*</span>

                          {/* Evaluasi Status Dokumen */}
                          {isDocRejected ? (
                            <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0 h-5 bg-rose-600 text-white">
                              ✕ Ditolak
                            </Badge>
                          ) : isDocApproved ? (
                            <Badge variant="success" className="text-[10px] font-bold px-2 py-0 h-5 bg-emerald-100 text-emerald-800 border-emerald-300">
                              ✓ Disetujui
                            </Badge>
                          ) : isUploaded ? (
                            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 h-5 text-slate-600 border-slate-300">
                              Terunggah (Belum Diperiksa)
                            </Badge>
                          ) : isDeferrable && isCommitmentNote ? (
                            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 h-5 border-amber-300 bg-amber-50 text-amber-800">
                              Menyusul (Komitmen)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 h-5 text-slate-400">
                              Belum Ada
                            </Badge>
                          )}
                        </div>

                        {/* Catatan Alasan jika Ditolak */}
                        {isDocRejected && review?.reason ? (
                          <p className="text-[11px] text-rose-700 font-medium truncate mt-0.5">
                            Alasan: {review.reason}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{spec.description}</p>
                        )}
                      </div>

                      <div className="text-slate-400 group-hover:text-slate-600 shrink-0 ml-1">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Sisi Kanan: Action Buttons 1 PER 1 (TERPAMPANG JELAS DI HEADER) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                      {isUploaded && doc && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(doc.public_url, '_blank')
                          }}
                          className="h-8 px-2.5 gap-1.5 text-xs text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                          title="Buka berkas di tab baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Buka</span>
                        </Button>
                      )}

                      {/* TOMBOL SETUJUI (1 PER 1) */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetDocApproved(spec.name)
                        }}
                        className={cn(
                          'h-8 px-2.5 gap-1 text-xs font-semibold transition-all',
                          isDocApproved
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs hover:bg-emerald-700'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100'
                        )}
                        title="Setujui berkas ini"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isDocApproved ? 'Disetujui' : 'Setujui'}</span>
                      </Button>

                      {/* TOMBOL TOLAK (1 PER 1) */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenRejectPanel(spec.name)
                        }}
                        className={cn(
                          'h-8 px-2.5 gap-1 text-xs font-semibold transition-all',
                          isDocRejected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs hover:bg-rose-700'
                            : 'border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100'
                        )}
                        title="Tolak berkas ini dan minta perbaikan"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isDocRejected ? 'Ditolak' : 'Tolak'}</span>
                      </Button>

                      {/* TOMBOL RESET JIKA SUDAH DINILAI */}
                      {(isDocApproved || isDocRejected) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResetDocReview(spec.name)
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                          title="Reset penilaian berkas ini"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Accordion Body Content */}
                  {isOpen && (
                    <div className="p-4 bg-slate-50/60 border-t border-slate-100 space-y-4">
                      {/* Box Input Alasan Penolakan Langsung jika tombol Tolak diklik */}
                      {isRejectingThis && (
                        <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-xl space-y-3 animate-fade-in shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                              Alasan Penolakan:
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingDoc(null)
                                setInlineRejectNote('')
                              }}
                              className="h-6 px-1.5 text-[11px] text-rose-700 hover:bg-rose-100"
                            >
                              Batal
                            </Button>
                          </div>

                          {/* Quick Chips Alasan */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-slate-500 font-medium block">
                              Pilih catatan cepat atau ketik sendiri di bawah:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {REJECTION_SUGGESTIONS.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => setInlineRejectNote(suggestion)}
                                  className={cn(
                                    'px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer text-left',
                                    inlineRejectNote === suggestion
                                      ? 'bg-rose-600 text-white border-rose-600 font-bold'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:text-rose-700'
                                  )}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="text"
                              value={inlineRejectNote}
                              onChange={(e) => setInlineRejectNote(e.target.value)}
                              placeholder={`Contoh: Foto buram atau nama tidak sesuai pada ${spec.name}`}
                              className="w-full text-xs bg-white border border-rose-300 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectingDoc(null)
                                  setInlineRejectNote('')
                                }}
                                className="h-8 px-3 text-xs"
                              >
                                Batal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSaveDocRejection(spec.name)}
                                className="h-8 px-3.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                Simpan
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Preview Dokumen */}
                      {isUploaded && doc ? (
                        <div className="space-y-3">
                          <div className="p-2 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                            {isImage ? (
                              <div className="relative group flex items-center justify-center bg-slate-900/5 rounded-lg overflow-hidden min-h-[240px] max-h-[500px]">
                                <img
                                  src={doc.public_url}
                                  alt={spec.name}
                                  className="w-auto h-auto max-h-[480px] max-w-full object-contain rounded-md cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setImagePreviewUrl(doc.public_url)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setImagePreviewUrl(doc.public_url)}
                                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 backdrop-blur-xs transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Perbesar</span>
                                </button>
                              </div>
                            ) : isPdf ? (
                              <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                <div className="p-2 bg-slate-100 flex items-center justify-between text-xs text-slate-600 border-b border-slate-200">
                                  <span className="font-medium flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-emerald-600" /> Dokumen PDF
                                  </span>
                                  <a
                                    href={doc.public_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                                  >
                                    Buka di Tab Baru <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                                <iframe
                                  src={`${doc.public_url}#toolbar=0`}
                                  title={spec.name}
                                  className="w-full h-[400px] border-0"
                                />
                              </div>
                            ) : (
                              <div className="p-6 text-center space-y-2 bg-slate-50 rounded-lg">
                                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                                <p className="text-xs text-slate-600">
                                  Tipe berkas: <span className="font-mono">{doc.mime_type}</span>
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(doc.public_url, '_blank')}
                                  className="h-8 text-xs gap-1.5"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Unduh / Buka Dokumen
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Metadata file */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                            <span className="truncate max-w-[280px]">
                              Berkas: <strong className="text-slate-700 font-medium">{doc.original_name}</strong>
                            </span>
                            <span>
                              {formatBytes(doc.size_bytes)} • Diunggah: {formatDateIndo(doc.created_at)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center space-y-2 bg-white rounded-xl border border-dashed border-slate-300">
                          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700">Berkas Belum Diunggah</p>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            {isDeferrable && isCommitmentNote
                              ? 'Santri telah menyertakan komitmen bahwa berkas rapor ini akan diserahkan menyusul saat daftar ulang.'
                              : 'Calon santri belum mengunggah dokumen ini ke portal PPDB.'}
                          </p>
                        </div>
                      )}

                      {/* Kontrol Validasi Dokumen */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-slate-600">Validasi:</span>
                          {isDocRejected ? (
                            <Badge variant="destructive" className="bg-rose-600 text-white text-[10px] font-bold">
                              ✕ Ditolak
                            </Badge>
                          ) : isDocApproved ? (
                            <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                              ✓ Disetujui
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-300 text-[10px]">
                              Belum Dinilai
                            </Badge>
                          )}
                          {isDocRejected && review?.reason && (
                            <span className="text-xs text-rose-700 font-medium truncate hidden sm:inline max-w-xs">
                              ({review.reason})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSetDocApproved(spec.name)}
                            className={cn(
                              'h-8 px-3 text-xs font-semibold gap-1.5 transition-all shadow-2xs',
                              isDocApproved
                                ? 'bg-emerald-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            )}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isDocApproved ? 'Disetujui' : 'Setujui'}</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRejectPanel(spec.name)}
                            className={cn(
                              'h-8 px-3 text-xs font-semibold gap-1.5 transition-all',
                              isDocRejected
                                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                                : 'border-rose-300 text-rose-700 bg-rose-50/70 hover:bg-rose-100'
                            )}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isDocRejected ? 'Ditolak' : 'Tolak'}</span>
                          </Button>

                          {(isDocApproved || isDocRejected) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetDocReview(spec.name)}
                              className="h-8 px-2 text-xs text-slate-400 hover:text-slate-700"
                              title="Reset status penilaian berkas ini"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────
            CONTAINER KANAN: DATA LENGKAP FORMULIR PENDAFTAR
            ────────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'flex-1 min-h-0 min-w-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 p-4 sm:p-6 lg:p-7 space-y-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            mobileTab !== 'form' && 'hidden lg:block'
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Header Ringkas Profil Santri */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                  {applicant.full_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-base break-words leading-tight">{applicant.full_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    NISN: <span className="font-mono font-medium text-slate-700">{applicant.nisn || '-'}</span> • NIK: <span className="font-mono font-medium text-slate-700">{applicant.nik || '-'}</span>
                  </p>
                </div>
              </div>

              {applicant.phone_number && (
                <a
                  href={`https://wa.me/${applicant.phone_number.replace(/^0/, '62').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 transition-colors shrink-0"
                  title="Hubungi Pendaftar via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* BAGIAN 1: Data Calon Santri */}
          <Card className="border-slate-200/80 shadow-2xs">
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Data Pribadi Calon Santri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="min-w-0">
                  <span className="text-slate-500 block">Nama Lengkap:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.full_name}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Jenis Kelamin:</span>
                  <span className="font-semibold text-slate-800">
                    {applicant.gender === 'L' ? 'Laki-laki' : applicant.gender === 'P' ? 'Perempuan' : '-'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Tempat, Tanggal Lahir:</span>
                  <span className="font-semibold text-slate-800 break-words">
                    {applicant.birth_place || '-'}, {formatDateIndo(applicant.birth_date)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Asal Sekolah:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.previous_school || '-'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Tahun Kelulusan:</span>
                  <span className="font-semibold text-slate-800">{applicant.graduation_year || '-'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Anak Ke / Dari:</span>
                  <span className="font-semibold text-slate-800">
                    {applicant.child_number || '-'} dari {applicant.siblings_count || '-'} bersaudara
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BAGIAN 2: Data Orang Tua / Wali */}
          <Card className="border-slate-200/80 shadow-2xs">
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Data Orang Tua / Wali
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="min-w-0">
                  <span className="text-slate-500 block">Nama Ayah:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.father_name || '-'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Pekerjaan Ayah:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.father_job || '-'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Nama Ibu:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.mother_name || '-'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Pekerjaan Ibu:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.mother_job || '-'}</span>
                </div>
                {applicant.guardian_name && (
                  <>
                    <div className="min-w-0">
                      <span className="text-slate-500 block">Nama Wali:</span>
                      <span className="font-semibold text-slate-800 break-words">{applicant.guardian_name}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block">Pekerjaan Wali:</span>
                      <span className="font-semibold text-slate-800 break-words">{applicant.guardian_job || '-'}</span>
                    </div>
                  </>
                )}
                <div className="min-w-0">
                  <span className="text-slate-500 block">No. Telepon / WhatsApp Ortu:</span>
                  <span className="font-semibold text-slate-800 font-mono break-all">
                    {applicant.parent_phone || applicant.phone_number || '-'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Penghasilan Rata-rata:</span>
                  <span className="font-semibold text-slate-800 break-words">{applicant.parent_income || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BAGIAN 3: Domisili & Alamat Lengkap */}
          <Card className="border-slate-200/80 shadow-2xs">
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                Domisili &amp; Alamat Tinggal
              </h4>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block">Alamat Jalan:</span>
                  <span className="font-semibold text-slate-800 leading-relaxed break-words">
                    {applicant.address || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="min-w-0">
                    <span className="text-slate-500 block">RT / RW:</span>
                    <span className="font-semibold text-slate-800">
                      {applicant.rt || '-'}/{applicant.rw || '-'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 block">Kelurahan:</span>
                    <span className="font-semibold text-slate-800 break-words">{applicant.kelurahan || '-'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 block">Kecamatan:</span>
                    <span className="font-semibold text-slate-800 break-words">{applicant.kecamatan || '-'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 block">Kota / Kab:</span>
                    <span className="font-semibold text-slate-800 break-words">{applicant.city || '-'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 block">Provinsi:</span>
                    <span className="font-semibold text-slate-800 break-words">{applicant.province || '-'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 block">Kode Pos:</span>
                    <span className="font-semibold text-slate-800">{applicant.postal_code || '-'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BAGIAN 4: Kuesioner Kesehatan (10 Pertanyaan Baku) */}
          <Card className="border-slate-200/80 shadow-2xs">
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-emerald-600" />
                Kuesioner Kesehatan Calon Santri (10 Pertanyaan)
              </h4>
              <HealthIdentificationViewer
                data={
                  applicant.disease_history ||
                  (typeof applicant.health_questionnaire === 'string'
                    ? applicant.health_questionnaire
                    : applicant.health_questionnaire
                    ? JSON.stringify(applicant.health_questionnaire)
                    : null)
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. MODAL LIGHTBOX PREVIEW GAMBAR
          ══════════════════════════════════════════════════════════════════ */}
      {imagePreviewUrl && (
        <Dialog open={!!imagePreviewUrl} onOpenChange={() => setImagePreviewUrl(null)}>
          <DialogContent className="w-[95vw] sm:max-w-4xl p-2 bg-black/90 border-0">
            <div className="relative flex items-center justify-center min-h-[400px] max-h-[85vh]">
              <img
                src={imagePreviewUrl}
                alt="Preview Dokumen"
                className="max-h-[82vh] max-w-full object-contain rounded-md"
              />
            </div>
            <DialogFooter className="p-2 justify-between">
              <a
                href={imagePreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Resolusi Asli
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImagePreviewUrl(null)}
                className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          4. MODAL KONFIRMASI: KIRIM PERMINTAAN REVISI DOKUMEN
          ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={confirmModalType === 'reject'}
        onOpenChange={(open) => !open && setConfirmModalType(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Kirim Permintaan Revisi Dokumen
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pemberitahuan revisi hanya akan dikirimkan untuk berkas yang ditolak. Calon santri wajib mengunggah ulang dokumen tersebut.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs text-slate-700 font-semibold">
              Rincian {rejectedSpecs.length} dokumen yang perlu diperbaiki:
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {rejectedSpecs.map((spec) => (
                <div
                  key={spec.name}
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1"
                >
                  <div className="font-bold text-rose-950 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{spec.name}</span>
                  </div>
                  <p className="text-rose-800 text-[11px] pl-5">
                    Catatan: <strong>{docReviews[spec.name]?.reason || 'Perlu diperbaiki'}</strong>
                  </p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              💬 Status pendaftar akan diubah menjadi <strong>Perlu Revisi Dokumen</strong>. Notifikasi resmi dan pesan WhatsApp akan otomatis terkirim ke calon santri untuk segera melakukan revisi berkas di portal PPDB.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmModalType(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleExecuteSendRevisions}
              disabled={verifyMutation.isPending}
              className="gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Send className="w-4 h-4" />
              Kirim Catatan Revisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════
          5. MODAL KONFIRMASI: VERIFIKASI DOKUMEN (LOLOS VERIFIKASI)
          ══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={confirmModalType === 'approve'}
        onOpenChange={(open) => !open && setConfirmModalType(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Verifikasi Dokumen Calon Santri
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pastikan berkas persyaratan calon santri telah sesuai dengan ketentuan penerimaan santri baru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-700 leading-relaxed">
            <p>
              Apakah Anda yakin telah memverifikasi dan menyetujui seluruh berkas pendaftaran ananda{' '}
              <strong className="text-slate-900">{applicant.full_name}</strong>?
            </p>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
              <span className="font-bold block">Dampak Verifikasi Dokumen:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800">
                <li>Status pendaftar beralih ke <strong>Lolos Berkas (Tahap Seleksi)</strong>.</li>
                <li>Calon santri masuk ke <strong>Sesi Ujian Tahfidz &amp; Wawancara</strong> sesuai jadwal yang ditetapkan panitia.</li>
                <li>Notifikasi kelulusan berkas otomatis dikirimkan via WhatsApp.</li>
              </ul>
            </div>

            {isCommitmentNote && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                ℹ️ Calon santri memiliki komitmen berkas rapor menyusul yang akan diserahkan saat daftar ulang fisik.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmModalType(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExecuteApproval}
              disabled={verifyMutation.isPending}
              className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="w-4 h-4" />
              Konfirmasi &amp; Loloskan Berkas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
