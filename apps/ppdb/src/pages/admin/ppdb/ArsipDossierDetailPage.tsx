import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, apiFetchBlob } from '@/api/client'
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import {
  ArrowLeft,
  Archive,
  Download,
  FileText,
  ExternalLink,
  Shield,
  Loader2,
  Layers,
  ChevronRight,
  ZoomIn,
  Plus,
  Minus,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { resultStatusLabel, resultStatusMeta } from '@/lib/selectionStatus'
import { cn } from '@/lib/utils'

// Document renderers & export utils
import ApplicantFormDocument from '@/components/shared/ApplicantFormDocument'
import OfficialAssessmentSheet from '@/components/shared/OfficialAssessmentSheet'
import LoaOfficialDocument, { type LoaData } from '@/components/shared/LoaOfficialDocument'
import { downloadApplicantFormDoc } from '@/utils/exportApplicantForm'
import { downloadAssessmentDoc } from '@/utils/exportAssessment'
import { downloadLoaDoc } from '@/utils/exportLoa'

interface ArchiveDocumentItem {
  id: string
  key: string
  title: string
  category: 'form' | 'upload' | 'assessment' | 'loa'
  typeLabel: string
  badgeLabel?: string
  date?: string
  status?: string
  originalName?: string
  fileSize?: number
  publicUrl?: string
  mimeType?: string
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Friendly document label based on doc_type
function getFriendlyDocTitle(doc: any): string {
  const type = (doc.doc_type || '').toLowerCase()
  if (type.includes('nisn')) return 'Kartu / Bukti NISN'
  if (type.includes('kk') || type.includes('keluarga')) return 'Kartu Keluarga (KK)'
  if (type.includes('akta') || type.includes('lahir')) return 'Akta Kelahiran'
  if (type.includes('foto')) return 'Pas Foto Calon Santri'
  if (type.includes('ktp')) return 'KTP Orang Tua / Wali'
  if (type.includes('rapor_1') || type.includes('rapor 1')) return 'Rapor Semester 1'
  if (type.includes('rapor_2') || type.includes('rapor 2')) return 'Rapor Semester 2'
  if (type.includes('rapor_3') || type.includes('rapor 3')) return 'Rapor Semester 3'
  if (type.includes('rapor_4') || type.includes('rapor 4')) return 'Rapor Semester 4'
  if (type.includes('rapor')) return 'Rapor Terakhir'
  if (type.includes('sehat')) return 'Surat Keterangan Sehat'
  if (type.includes('baik') || type.includes('kelakuan')) return 'Surat Berkelakuan Baik'
  if (type.includes('prestasi') || type.includes('sertifikat')) return 'Sertifikat Prestasi'

  if (doc.original_name) {
    return doc.original_name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
  }
  return (doc.doc_type || 'Dokumen Persyaratan').toUpperCase()
}

function triggerDownloadUrl(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function ArsipDossierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // References for printable/exportable elements
  const formContainerRef = useRef<HTMLDivElement | null>(null)
  const assessmentContainerRef = useRef<HTMLDivElement | null>(null)
  const loaContainerRef = useRef<HTMLDivElement | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)

  // State
  const [activeDocId, setActiveDocId] = useState<string>('doc-form')
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [downloadFormat, setDownloadFormat] = useState<'zip' | 'pdf' | 'png'>('zip')
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false)

  // Default Zoom adalah 85% — hanya diterapkan ke lembar kertas file
  const [zoomLevel, setZoomLevel] = useState<number>(85)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imagePreviewTitle, setImagePreviewTitle] = useState<string>('')

  // Zoom handlers (mengubah ukuran kertas fisik saja, label file tetap 100% normal)
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(150, prev + 15))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(50, prev - 15))
  const handleZoomReset = () => setZoomLevel(85)

  // Fetch complete dossier
  const { data: dossier, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['applicant-dossier-page', id],
    queryFn: async () => {
      return await apiFetch<any>(`/ppdb/archive/applicants/${id}/dossier`)
    },
    enabled: !!id,
  })

  const applicant = dossier?.applicant
  const documents: any[] = dossier?.documents || []
  const transcript = dossier?.transcript
  const loa = dossier?.loa

  // Filter valid uploaded documents (rejects are permanently pruned per system rule)
  const verifiedUploadDocs = useMemo(() => {
    return documents.filter((doc) => doc.status !== 'rejected')
  }, [documents])

  // Map LoA data to strict LoaData interface (ALWAYS generated, with fallback to applicant data)
  const loaData: LoaData = useMemo(() => {
    return {
      letter_number:
        loa?.letter_number ||
        `LoA/PPDB/2026/${applicant?.registration_number || applicant?.nisn || (id ? id.slice(0, 8).toUpperCase() : 'PENDARRAHMAN')}`,
      registration_number:
        loa?.registration_number ||
        applicant?.registration_number ||
        applicant?.nisn ||
        (id ? id.slice(0, 8).toUpperCase() : 'REG-PTDARRAHMAN'),
      academic_year: loa?.academic_year || applicant?.academic_year || '2026 / 2027',
      admission_officer:
        loa?.admission_officer || applicant?.head_of_committee || 'Ust. Wijaya Kurnia, M.Pd.',
      director_name: loa?.director_name || 'Ust. Dr. H. Abdurrahman, M.A.',
      location: loa?.location || 'Bekasi',
      date_str:
        loa?.date_str ||
        new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      applicant: {
        id: applicant?.id || id || '',
        full_name: applicant?.full_name || 'CALON SANTRI',
        wave_name: applicant?.wave_name || 'Gelombang 1',
        nisn: applicant?.nisn,
        nik: applicant?.nik,
        previous_school: applicant?.previous_school,
        parent_name: applicant?.father_name || applicant?.parent_name,
      },
      fee_items:
        loa?.fee_items && loa.fee_items.length > 0
          ? loa.fee_items
          : [
              {
                name: 'Uang Pangkal / Pembangunan',
                nominal: 15000000,
                description: 'Biaya fasilitas & sarana prasarana santri',
              },
              {
                name: 'SPP Bulan Pertama',
                nominal: 1500000,
                description: 'SPP & asrama bulan pertama',
              },
              {
                name: 'Paket Seragam & Buku',
                nominal: 2500000,
                description: 'Seragam santri lengkap & modul kurikulum',
              },
            ],
      total_fee: loa?.total_fee || 19000000,
      minimum_dp: loa?.minimum_dp || 5000000,
      discount_name: loa?.discount_name,
      deadline_lunas: loa?.deadline_lunas || '30 Hari Setelah Diterima',
      fixed_clause:
        loa?.fixed_clause || 'Seluruh dana yang telah dibayarkan tidak dapat dikembalikan.',
      is_graduated: loa?.is_graduated ?? (applicant?.status === 'passed'),
      is_loa_signed: loa?.is_loa_signed ?? Boolean(applicant?.is_loa_signed),
      loa_signed_at: loa?.loa_signed_at || applicant?.loa_signed_at,
      loa_signer_name: loa?.loa_signer_name || applicant?.loa_signer_name,
      loa_signer_relation: loa?.loa_signer_relation || applicant?.loa_signer_relation,
      loa_signature_data: loa?.loa_signature_data || applicant?.loa_signature_data,
      loa_signature_token: loa?.loa_signature_token || applicant?.loa_signature_token,
      va_bank: loa?.va_bank || 'Bank Syariah Indonesia (BSI)',
      va_number: loa?.va_number || 'Nomor Rekening Resmi PTDARRAHMAN (Hubungi Panitia)',
      whatsapp_group_link: loa?.whatsapp_group_link,
    }
  }, [loa, applicant, id])

  // Construct complete file list in order:
  // 1. Data pendaftar (Formulir Pendaftaran & Kuesioner Kesehatan)
  // 2. File-file upload terverifikasi (jika belum ada, sertakan placeholder Berkas Upload)
  // 3. File hasil penilaian & evaluasi seleksi (Lembar Penilaian Evaluator)
  // 4. File LoA (Letter of Acceptance resmi — selalu ada)
  const fileItems: ArchiveDocumentItem[] = useMemo(() => {
    const list: ArchiveDocumentItem[] = []

    // #1. Formulir Pendaftaran (ApplicantFormDocument.tsx)
    list.push({
      id: 'doc-form',
      key: 'form',
      title: 'Formulir Pendaftaran & Kuesioner Kesehatan',
      category: 'form',
      typeLabel: 'Dokumen A4 Resmi (2 Halaman)',
      badgeLabel: 'Data Lengkap',
      status: 'Resmi',
    })

    // #2. File-file yang Dia Upload (Hasil Verifikasi)
    if (verifiedUploadDocs.length > 0) {
      verifiedUploadDocs.forEach((doc, idx) => {
        const isPdf =
          doc.mime_type?.includes('pdf') || doc.original_name?.toLowerCase().endsWith('.pdf')
        list.push({
          id: `doc-upload-${doc.id || idx}`,
          key: `upload-${doc.id || idx}`,
          title: getFriendlyDocTitle(doc),
          category: 'upload',
          typeLabel: isPdf ? 'Dokumen PDF' : 'Berkas Gambar',
          badgeLabel: doc.status === 'approved' ? 'Disetujui' : 'Terverifikasi',
          date: doc.created_at,
          originalName: doc.original_name,
          fileSize: doc.size_bytes,
          publicUrl: doc.public_url,
          mimeType: doc.mime_type,
          status: doc.status,
        })
      })
    } else {
      // Jika pendaftar belum memiliki berkas fisik di database, tetap tampilkan berkas ke-2
      list.push({
        id: 'doc-upload-empty',
        key: 'upload-empty',
        title: 'Berkas Persyaratan Upload (Hasil Verifikasi)',
        category: 'upload',
        typeLabel: 'Dokumen Persyaratan',
        badgeLabel: 'Belum Diunggah',
        status: 'Belum Ada',
      })
    }

    // #3. Lembar Penilaian & Transkrip Seleksi (OfficialAssessmentSheet.tsx)
    list.push({
      id: 'doc-assessment',
      key: 'assessment',
      title: 'Lembar Penilaian Evaluator & Transkrip Nilai',
      category: 'assessment',
      typeLabel: 'Lembar Evaluasi A4',
      badgeLabel: transcript?.graduation_status
        ? resultStatusLabel(transcript.graduation_status)
        : 'Rekapitulasi Nilai',
      status: 'Terverifikasi',
    })

    // #4. Letter of Acceptance (LoA Resmi — LoaOfficialDocument.tsx — SELALU ADA)
    list.push({
      id: 'doc-loa',
      key: 'loa',
      title: 'Letter of Acceptance (LoA) Resmi',
      category: 'loa',
      typeLabel: 'Surat Keputusan A4 (2 Halaman)',
      badgeLabel: loaData.is_loa_signed
        ? 'Ditandatangani Digital'
        : loaData.is_graduated
        ? 'Resmi Lulus'
        : 'Draft Keputusan',
      status: loaData.letter_number ? 'Resmi' : 'Draft',
    })

    return list
  }, [verifiedUploadDocs, transcript, loaData])

  // Inisialisasi checklist seluruh berkas terpilih secara otomatis
  useEffect(() => {
    if (fileItems.length > 0 && selectedDocIds.length === 0) {
      setSelectedDocIds(fileItems.map((f) => f.id))
    }
  }, [fileItems])

  // Track active document during preview scroll
  const handleScroll = useCallback(() => {
    if (!previewScrollRef.current) return
    const containerTop = previewScrollRef.current.getBoundingClientRect().top
    let currentId = fileItems[0]?.id
    for (const item of fileItems) {
      const el = document.getElementById(`section-${item.id}`)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.top - containerTop <= 160) {
          currentId = item.id
        }
      }
    }
    if (currentId && currentId !== activeDocId) {
      setActiveDocId(currentId)
    }
  }, [fileItems, activeDocId])

  // Smooth scroll to target file
  const scrollToDoc = (docId: string) => {
    setActiveDocId(docId)
    const el = document.getElementById(`section-${docId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Toggle selection
  const isAllSelected = fileItems.length > 0 && selectedDocIds.length === fileItems.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds([])
    } else {
      setSelectedDocIds(fileItems.map((f) => f.id))
    }
  }

  const handleToggleSelect = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  // ZIP download handler
  const handleDownloadZip = async () => {
    if (!id || !applicant) return
    const blob = await apiFetchBlob(`/ppdb/archive/applicants/${id}/dossier/zip`)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = (applicant.full_name || 'pendaftar').replace(/[^a-zA-Z0-9_-]/g, '_')
    a.download = `dossier_${safeName}_${id.slice(0, 8)}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  // Batch download handler based on selected checkboxes and format
  const handleBatchDownload = async () => {
    if (selectedDocIds.length === 0) {
      toast('error', 'Pilih setidaknya satu berkas untuk diunduh.')
      return
    }

    setIsBatchDownloading(true)
    const originalZoom = zoomLevel
    try {
      if (downloadFormat === 'zip') {
        await handleDownloadZip()
        toast('success', 'Paket ZIP dossier lengkap berhasil diunduh.')
        return
      }

      // Kembalikan zoom sementara ke 100% untuk tangkapan canvas PDF/PNG presisi tinggi
      if (originalZoom !== 100) {
        setZoomLevel(100)
        await new Promise((r) => setTimeout(r, 120))
      }

      const toDownload = fileItems.filter((f) => selectedDocIds.includes(f.id))
      let successCount = 0

      for (const item of toDownload) {
        if (item.category === 'form') {
          if (formContainerRef.current) {
            await downloadApplicantFormDoc({
              containerElement: formContainerRef.current,
              format: downloadFormat === 'pdf' ? 'pdf' : 'image',
              applicantName: applicant?.full_name || 'santri',
              registrationNo: applicant?.nisn || applicant?.id?.slice(0, 8),
              pageMode: 'both',
            })
            successCount++
          }
        } else if (item.category === 'assessment') {
          if (assessmentContainerRef.current) {
            await downloadAssessmentDoc(
              assessmentContainerRef.current,
              downloadFormat === 'pdf' ? 'pdf' : 'image',
              applicant?.full_name || 'santri',
              applicant?.nisn || applicant?.id?.slice(0, 8)
            )
            successCount++
          }
        } else if (item.category === 'loa') {
          if (loaContainerRef.current) {
            await downloadLoaDoc({
              containerElement: loaContainerRef.current,
              format: downloadFormat === 'pdf' ? 'pdf' : 'image',
              applicantName: applicant?.full_name || 'santri',
              registrationNo: loaData.registration_number,
              pageMode: 'both',
            })
            successCount++
          }
        } else if (item.category === 'upload') {
          if (item.publicUrl) {
            triggerDownloadUrl(
              item.publicUrl,
              item.originalName || `${item.title}.${downloadFormat}`
            )
            successCount++
          }
        }
        await new Promise((r) => setTimeout(r, 250))
      }

      toast(
        'success',
        `Berhasil memproses unduhan ${successCount} berkas sebagai ${downloadFormat.toUpperCase()}.`
      )
    } catch (err: any) {
      toast('error', `Gagal mengunduh: ${err.message || 'Terjadi kesalahan sistem'}`)
    } finally {
      if (originalZoom !== 100) {
        setZoomLevel(originalZoom)
      }
      setIsBatchDownloading(false)
    }
  }


  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <h3 className="text-base font-bold text-slate-800">Menyiapkan Arsip Berkas Dossier...</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Sistem sedang memuat seluruh data diri, berkas asli terverifikasi, hasil seleksi, dan
          dokumen resmi calon santri.
        </p>
      </div>
    )
  }

  // Error state
  if (isError || !applicant) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-red-200 rounded-xl shadow-sm text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
          <Archive className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Arsip Pendaftar Tidak Ditemukan</h2>
        <p className="text-xs text-muted-foreground">
          {(error as any)?.message ||
            'Berkas dossier untuk calon santri ini tidak tersedia atau telah dihapus.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/arsip')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali ke Daftar Arsip
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => refetch()}
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  const selectionMeta = resultStatusMeta(applicant.status)

  return (
    <div className="-m-4 md:-m-6 lg:-m-8 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-slate-100 font-sans">
      {/* =========================================================================
          PAGE HEADER (COMPACT TOP BAR)
          ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-5 py-2 flex items-center justify-between shrink-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/arsip')}
            className="h-7 px-2 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kembali</span>
          </Button>
          <span className="text-slate-300 shrink-0">/</span>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {applicant.full_name}
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-[10px] text-slate-600 bg-slate-50 py-0"
            >
              NISN: {applicant.nisn || '-'}
            </Badge>
            <span className="text-slate-300 hidden md:inline">·</span>
            <span className="text-xs text-slate-500 hidden md:inline">
              {applicant.wave_name || 'Gelombang Aktif'}
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                selectionMeta.cls
              )}
            >
              {selectionMeta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Shield className="h-3 w-3 text-emerald-600" />
            Akses Terverifikasi
          </span>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-PANE WORKSPACE: LEFT PREVIEW (FULL PAGE A4) + RIGHT CONTROLS
          ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* =======================================================================
            LEFT CONTAINER: FULL PAGE A4 CONTINUOUS DOCUMENT STREAM
            ======================================================================= */}
        <div
          ref={previewScrollRef}
          onScroll={handleScroll}
          className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-auto bg-slate-200/80 p-4 sm:p-6 lg:p-8 scroll-smooth relative"
        >
          {/* FLOATING ZOOM TOOLBAR: MENGONTROL SKALA LEMBAR KERTAS A4 DENGAN DEFAULT 85% */}
          <div className="sticky top-2 z-30 flex justify-center pointer-events-none mb-4">
            <div className="pointer-events-auto bg-slate-900/90 text-white backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded transition-colors text-slate-300 hover:text-white"
                title="Perkecil Kertas (-15%)"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-0.5 hover:bg-slate-800 rounded font-mono text-xs font-bold text-emerald-400 transition-colors"
                title="Reset ke 85%"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 150}
                className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded transition-colors text-slate-300 hover:text-white"
                title="Perbesar Kertas (+15%)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* LIST DOKUMEN: LABEL DI ATAS KERTAS TETAP 100% TIDAK TER-ZOOM, HANYA KERTAS YANG SCALED */}
          <div className="w-full flex flex-col items-center">
            {/* 1. FILE DATA PENDAFTAR: FORMULIR PENDAFTARAN & KUESIONER KESEHATAN (A4) */}
            <div id="section-doc-form" className="mb-8 scroll-mt-16 flex flex-col items-center w-full">
              {/* LABEL DI ATAS KERTAS: HANYA TEKS TANPA CONTAINER (TIDAK IKUT TER-ZOOM) */}
              <div className="w-full max-w-[210mm] mx-auto px-1 py-1 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm shrink-0">
                    Berkas 1 / {fileItems.length}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                    Formulir Pendaftaran & Kuesioner Kesehatan
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium shrink-0">
                  Dokumen A4 Resmi (2 Halaman)
                </span>
              </div>

              {/* HANYA KERTAS FILE INI YANG TER-ZOOM SCALED */}
              <div
                className="transition-transform duration-150 ease-out origin-top flex flex-col items-center"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  width: '210mm',
                  marginBottom: `calc(600mm * ${zoomLevel / 100 - 1})`,
                }}
              >
                <div ref={formContainerRef} className="w-full flex flex-col items-center">
                  <ApplicantFormDocument applicant={applicant} page="both" />
                </div>
              </div>
            </div>

            {/* 2. FILE-FILE YANG DIA UPLOAD (HASIL VERIFIKASI) */}
            {verifiedUploadDocs.length > 0 ? (
              verifiedUploadDocs.map((doc, idx) => {
                const fileIndex = idx + 2
                const docId = `doc-upload-${doc.id || idx}`
                const isPdf =
                  doc.mime_type?.includes('pdf') ||
                  doc.original_name?.toLowerCase().endsWith('.pdf')
                const isImage =
                  !isPdf &&
                  (doc.mime_type?.startsWith('image/') ||
                    /\.(jpe?g|png|webp|avif)$/i.test(doc.original_name || ''))
                const friendlyTitle = getFriendlyDocTitle(doc)

                return (
                  <div
                    key={doc.id || idx}
                    id={`section-${docId}`}
                    className="mb-8 scroll-mt-16 flex flex-col items-center w-full"
                  >
                    {/* LABEL DI ATAS KERTAS: HANYA TEKS TANPA CONTAINER (TIDAK IKUT TER-ZOOM) */}
                    <div className="w-full max-w-[210mm] mx-auto px-1 py-1 mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm shrink-0">
                          Berkas {fileIndex} / {fileItems.length}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                          {friendlyTitle}
                        </span>
                        {doc.original_name && (
                          <span className="text-slate-500 font-mono text-xs truncate max-w-[180px] hidden sm:inline">
                            ({doc.original_name})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium shrink-0">
                        {isPdf ? 'PDF' : isImage ? 'Berkas Gambar' : 'Dokumen'} ·{' '}
                        {formatBytes(doc.size_bytes)}
                      </span>
                    </div>

                    {/* HANYA KERTAS FILE INI YANG TER-ZOOM SCALED */}
                    <div
                      className="transition-transform duration-150 ease-out origin-top flex flex-col items-center"
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: 'top center',
                        width: '210mm',
                        marginBottom: `calc(297mm * ${zoomLevel / 100 - 1})`,
                      }}
                    >
                      {isImage && doc.public_url ? (
                        <div
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
                            boxSizing: 'border-box',
                          }}
                          className="bg-white shadow-md border border-slate-300 rounded-xs flex flex-col justify-center items-center p-6 relative group"
                        >
                          <img
                            src={doc.public_url}
                            alt={friendlyTitle}
                            className="max-h-[265mm] max-w-full w-auto h-auto object-contain cursor-pointer hover:opacity-95 transition-opacity rounded-xs shadow-2xs border border-slate-200"
                            onClick={() => {
                              setImagePreviewUrl(doc.public_url)
                              setImagePreviewTitle(friendlyTitle)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreviewUrl(doc.public_url)
                              setImagePreviewTitle(friendlyTitle)
                            }}
                            className="absolute bottom-4 right-4 px-2.5 py-1 bg-black/75 hover:bg-black/90 text-white rounded text-[11px] font-medium flex items-center gap-1.5 backdrop-blur-xs transition-colors shadow"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Perbesar Gambar</span>
                          </button>
                        </div>
                      ) : isPdf && doc.public_url ? (
                        <div
                          style={{
                            width: '210mm',
                            height: '297mm',
                            boxSizing: 'border-box',
                          }}
                          className="bg-white shadow-md border border-slate-300 rounded-xs overflow-hidden"
                        >
                          <iframe
                            src={`${doc.public_url}#toolbar=0`}
                            title={friendlyTitle}
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '210mm',
                            minHeight: '120mm',
                            boxSizing: 'border-box',
                          }}
                          className="bg-white shadow-md border border-slate-300 rounded-xs p-12 text-center flex flex-col items-center justify-center space-y-3"
                        >
                          <FileText className="w-12 h-12 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-700">
                            {doc.original_name || 'Berkas Dokumen'}
                          </p>
                          {doc.public_url && (
                            <a
                              href={doc.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              Buka Berkas di Tab Baru <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              /* Placeholder jika belum ada upload berkas di database */
              <div
                id="section-doc-upload-empty"
                className="mb-8 scroll-mt-16 flex flex-col items-center w-full"
              >
                {/* LABEL DI ATAS KERTAS: HANYA TEKS TANPA CONTAINER (TIDAK IKUT TER-ZOOM) */}
                <div className="w-full max-w-[210mm] mx-auto px-1 py-1 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm shrink-0">
                      Berkas 2 / {fileItems.length}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                      Berkas Persyaratan yang Diunggah
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium shrink-0">
                    Hasil Verifikasi
                  </span>
                </div>

                {/* HANYA KERTAS INI YANG TER-ZOOM SCALED */}
                <div
                  className="transition-transform duration-150 ease-out origin-top flex flex-col items-center"
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    width: '210mm',
                    marginBottom: `calc(180mm * ${zoomLevel / 100 - 1})`,
                  }}
                >
                  <div
                    style={{
                      width: '210mm',
                      minHeight: '180mm',
                      boxSizing: 'border-box',
                    }}
                    className="bg-white shadow-md border border-slate-300 rounded-xs p-10 flex flex-col justify-center items-center text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h3 className="text-sm font-bold text-slate-800">
                        Belum Ada Berkas Fisik Terverifikasi
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pendaftar ini belum mengunggah dokumen persyaratan fisik atau berkas sedang
                        dalam antrean administrasi.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {[
                        'Bukti NISN',
                        'Kartu Keluarga (KK)',
                        'Akta Kelahiran',
                        'Pas Foto',
                        'KTP Ortu',
                        'Rapor Semester 1-4',
                      ].map((docName) => (
                        <span
                          key={docName}
                          className="text-[11px] px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200"
                        >
                          {docName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. FILE HASIL PENILAIAN (OfficialAssessmentSheet.tsx) */}
            {(() => {
              const assessmentIndex =
                fileItems.findIndex((f) => f.id === 'doc-assessment') + 1 || 3
              return (
                <div
                  id="section-doc-assessment"
                  className="mb-8 scroll-mt-16 flex flex-col items-center w-full"
                >
                  {/* LABEL DI ATAS KERTAS: HANYA TEKS TANPA CONTAINER (TIDAK IKUT TER-ZOOM) */}
                  <div className="w-full max-w-[210mm] mx-auto px-1 py-1 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm shrink-0">
                        Berkas {assessmentIndex} / {fileItems.length}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                        Lembar Penilaian Evaluator & Transkrip Nilai
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium shrink-0">
                      Lembar Evaluasi Resmi A4
                    </span>
                  </div>

                  {/* HANYA KERTAS INI YANG TER-ZOOM SCALED */}
                  <div
                    className="transition-transform duration-150 ease-out origin-top flex flex-col items-center"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      width: '210mm',
                      marginBottom: `calc(297mm * ${zoomLevel / 100 - 1})`,
                    }}
                  >
                    <div ref={assessmentContainerRef} className="w-full flex justify-center">
                      <OfficialAssessmentSheet
                        applicant={applicant}
                        categories={transcript?.categories || []}
                        cbtResults={transcript?.cbt_results}
                        resultNotes={transcript?.result_notes}
                        evaluatorNotes={transcript?.evaluator_notes}
                        graduationStatus={transcript?.graduation_status}
                      />
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 4. FILE LoA (SURAT PENERIMAAN RESMI - LoaOfficialDocument.tsx - SELALU ADA) */}
            {(() => {
              const loaIndex = fileItems.findIndex((f) => f.id === 'doc-loa') + 1 || 4
              return (
                <div id="section-doc-loa" className="mb-8 scroll-mt-16 flex flex-col items-center w-full">
                  {/* LABEL DI ATAS KERTAS: HANYA TEKS TANPA CONTAINER (TIDAK IKUT TER-ZOOM) */}
                  <div className="w-full max-w-[210mm] mx-auto px-1 py-1 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm shrink-0">
                        Berkas {loaIndex} / {fileItems.length}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                        Letter of Acceptance (LoA) Resmi
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium shrink-0">
                      Surat Keputusan A4 (2 Halaman)
                    </span>
                  </div>

                  {/* HANYA KERTAS INI YANG TER-ZOOM SCALED */}
                  <div
                    className="transition-transform duration-150 ease-out origin-top flex flex-col items-center"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      width: '210mm',
                      marginBottom: `calc(600mm * ${zoomLevel / 100 - 1})`,
                    }}
                  >
                    <div ref={loaContainerRef} className="w-full flex justify-center">
                      <LoaOfficialDocument data={loaData} />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* =======================================================================
            RIGHT CONTAINER: PANEL KANAN RAMPING (NORMAL 100% SCALE)
            ======================================================================= */}
        <div className="w-full lg:w-[265px] xl:w-[280px] shrink-0 h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-xs">
          {/* TOP SECTION: DOWNLOAD & FORMAT SELECTOR */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 shrink-0 space-y-2.5">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Download Berkas
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Pilih format & centang berkas
              </p>
            </div>

            {/* Format Selector: ZIP, PDF, PNG */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                Format
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['zip', 'pdf', 'png'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setDownloadFormat(fmt)}
                    className={cn(
                      'h-7 rounded text-[11px] font-bold transition-all border flex items-center justify-center gap-1',
                      downloadFormat === fmt
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-select bar: Select All & Count */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Pilih Semua</span>
              </label>
              <span className="text-[10px] font-semibold text-slate-500">
                {selectedDocIds.length}/{fileItems.length} dipilih
              </span>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-1.5 pt-0.5">
              <Button
                onClick={handleBatchDownload}
                disabled={isBatchDownloading || selectedDocIds.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold gap-1.5 shadow-2xs"
              >
                {isBatchDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mengunduh...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Unduh {selectedDocIds.length} Berkas ({downloadFormat.toUpperCase()})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* BOTTOM SECTION: AVAILABLE FILE LIST WITH CHECKBOXES */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-700 shrink-0">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-500" />
                Berkas Tersedia ({fileItems.length})
              </span>
              <span className="text-[9.5px] text-slate-400 font-normal">
                Klik untuk lompat
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {fileItems.map((item, index) => {
                const isChecked = selectedDocIds.includes(item.id)
                const isActive = activeDocId === item.id

                return (
                  <div
                    key={item.id}
                    onClick={() => scrollToDoc(item.id)}
                    className={cn(
                      'w-full text-left p-2 rounded-md transition-all flex items-center gap-2 cursor-pointer group border',
                      isActive
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/70'
                    )}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggleSelect(item.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                    />

                    {/* Sequence number */}
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      )}
                    >
                      {index + 1}
                    </span>

                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'text-xs font-semibold block truncate transition-colors leading-tight',
                          isActive ? 'text-emerald-950 font-bold' : 'text-slate-800 group-hover:text-emerald-700'
                        )}
                      >
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <span className="truncate">{item.typeLabel}</span>
                        {item.fileSize && (
                          <>
                            <span>·</span>
                            <span>{formatBytes(item.fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Indicator Arrow */}
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 shrink-0 transition-transform',
                        isActive ? 'text-emerald-600 translate-x-0.5' : 'text-slate-300 group-hover:translate-x-0.5'
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          IMAGE PREVIEW LIGHTBOX DIALOG
          ========================================================================= */}
      <Dialog open={!!imagePreviewUrl} onOpenChange={(v) => !v && setImagePreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-4 sm:p-6 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between pr-6">
              <span>{imagePreviewTitle || 'Pratinjau Berkas Gambar'}</span>
              {imagePreviewUrl && (
                <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1">
                  <a href={imagePreviewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    Buka Asli
                  </a>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {imagePreviewUrl && (
            <div className="flex-1 overflow-auto bg-slate-950/90 rounded-xl p-4 flex items-center justify-center min-h-[350px]">
              <img
                src={imagePreviewUrl}
                alt={imagePreviewTitle}
                className="max-h-[75vh] max-w-full w-auto h-auto object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
