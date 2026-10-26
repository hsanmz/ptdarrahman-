import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import {
  Printer,
  Download,
  ChevronDown,
  Clock,
  FileText,
  Image as ImageIcon,
  User,
  Users,
  MapPin,
  HeartPulse,
  Phone,
  Mail,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  IdCard,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import PaymentStatusBadge from './PaymentStatusBadge'
import { HealthIdentificationViewer } from './HealthIdentificationViewer'
import ApplicantFormDocument from './ApplicantFormDocument'
import { downloadApplicantFormDoc, parseHealthData } from '@/utils/exportApplicantForm'
import { cn } from '@/lib/utils'

interface ApplicantProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicant: any
  title?: string
  showPasswordHint?: boolean
}

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function formatDate(value?: string | null): string {
  if (!value) return '-'
  try {
    const iso = String(value).slice(0, 10)
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return String(value)
    return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m} ${y}`
  } catch {
    return String(value)
  }
}

function humanize(value?: string | null): string {
  if (!value) return ''
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function DocStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string; dot?: string }> = {
    document_uploaded: {
      label: 'Menunggu Verifikasi',
      cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      dot: 'bg-amber-500',
    },
    document_uploaded_pending: {
      label: 'Menunggu Verifikasi',
      cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      dot: 'bg-amber-500',
    },
    document_approved: {
      label: 'Disetujui',
      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
      dot: 'bg-emerald-500',
    },
    document_rejected: {
      label: 'Ditolak',
      cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
      dot: 'bg-red-500',
    },
  }
  const resolved = ['passed', 'failed', 'selection'].includes(status || '')
    ? map.document_approved
    : (status && map[status]) || {
        label: humanize(status) || '-',
        cls: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200',
        dot: 'bg-slate-400',
      }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        resolved.cls
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', resolved.dot)} />
      {resolved.label}
    </span>
  )
}

function SelectionStatusBadge({ status }: { status?: string }) {
  if (status === 'passed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        Lulus Seleksi
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
        Tidak Lulus
      </span>
    )
  if (status === 'selection')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        Tahap Seleksi
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
      Terdaftar
    </span>
  )
}

function WhatsAppButton({
  phone,
  label = 'Chat WhatsApp',
}: {
  phone?: string | null
  label?: string
}) {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return null
  const waNumber = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned
  return (
    <a
      href={`https://wa.me/${waNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
      title={`Hubungi via WhatsApp (${phone})`}
    >
      <MessageSquare className="h-3 w-3" />
      <span>{label}</span>
    </a>
  )
}

function InfoItem({
  label,
  value,
  mono = false,
  action,
  className,
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
  action?: React.ReactNode
  className?: string
}) {
  const empty = value === null || value === undefined || value === '' || value === '-'
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {action}
      </div>
      <div
        className={cn(
          'text-sm font-medium text-slate-800 break-words',
          mono && 'font-mono text-xs font-semibold text-slate-700',
          empty && 'text-slate-400 italic font-normal'
        )}
      >
        {empty ? '—' : value}
      </div>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-shadow',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-none">{title}</h4>
            {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function ApplicantProfileModal({
  open,
  onOpenChange,
  applicant,
  title = 'Detail Data Calon Santri',
}: ApplicantProfileModalProps) {
  const { toast } = useToast()
  const exportContainerRef = useRef<HTMLDivElement | null>(null)

  const [activeTab, setActiveTab] = useState<string>('biodata')
  const [previewPage, setPreviewPage] = useState<1 | 2 | 'both'>('both')
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)

  // Ambil detail pendaftar lengkap jika ada id
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['applicant-detail-modal', applicant?.id],
    queryFn: async () => {
      if (!applicant?.id) return null
      return await apiFetch<any>(`/ppdb/applicants/${applicant.id}`)
    },
    enabled: open && !!applicant?.id,
  })

  if (!applicant) return null

  // Gabungkan data awal dengan detail terbaru dari server
  const resolvedApplicant = detailData || applicant
  const fullName = resolvedApplicant.full_name || 'Calon Santri'
  const regNo =
    resolvedApplicant.nisn ||
    resolvedApplicant.nik ||
    (resolvedApplicant.id ? resolvedApplicant.id.slice(0, 8).toUpperCase() : 'REG')

  const parsedHealth = parseHealthData(resolvedApplicant.disease_history)

  const handleDownload = async (format: 'pdf' | 'image') => {
    const el = exportContainerRef.current
    if (!el) {
      toast('error', 'Dokumen formulir belum siap diunduh. Mohon tunggu sebentar.')
      return
    }
    try {
      setIsDownloading(format)
      // Gunakan mode halaman yang sedang dipilih di tab cetak jika relevan, default 'both'
      const pageMode = activeTab === 'cetak' ? previewPage : 'both'
      await downloadApplicantFormDoc({
        containerElement: el,
        format,
        applicantName: fullName,
        registrationNo: regNo,
        pageMode,
      })
      toast(
        'success',
        `Formulir pendaftaran berhasil diunduh sebagai ${
          format === 'pdf' ? 'Dokumen PDF Resmi (A4)' : 'Gambar PNG (HD)'
        }`
      )
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunduh formulir pendaftaran')
    } finally {
      setIsDownloading(null)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200/90 shadow-2xl rounded-2xl">
        {/* Style Khusus Print: Hanya lembar dokumen A4 yang dicetak, dialog dan latar disembunyikan */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .applicant-form-print-sheet,
            .applicant-form-print-sheet * {
              visibility: visible !important;
            }
            .applicant-form-print-sheet {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              margin: 0 auto !important;
              z-index: 999999 !important;
              background: white !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `}</style>

        {/* ══════════════════════════════════════════════════════════
            HEADER MODAL (Interactive & Clean Screen Toolbar)
            ══════════════════════════════════════════════════════════ */}
        <div className="print:hidden border-b border-slate-200/80 bg-white p-4 sm:p-5 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Profil Ringkas Santri */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/20">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="sr-only">{title}</span>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                  {fullName}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px] border border-slate-200">
                    Reg: {regNo}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600 font-medium">
                    {resolvedApplicant.wave_name || 'Gelombang PPDB'}
                  </span>
                  {resolvedApplicant.created_at && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">
                        Daftar: {formatDate(resolvedApplicant.created_at)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar: Cetak & Download */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Tombol Cetak Dokumen Resmi */}
              <Button
                type="button"
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-2xs font-semibold cursor-pointer"
                title="Cetak formulir resmi A4 via printer atau PDF"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>Cetak / Print PDF</span>
              </Button>

              {/* Dropdown Download Formulir Resmi */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!!isDownloading}
                    className="h-9 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 shadow-2xs font-semibold cursor-pointer"
                  >
                    {isDownloading ? (
                      <>
                        <Clock className="h-3.5 w-3.5 animate-spin text-white shrink-0" />
                        <span>Menyiapkan {isDownloading === 'pdf' ? 'PDF' : 'Gambar'}...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 text-white shrink-0" />
                        <span>Download Formulir</span>
                        <ChevronDown className="h-3 w-3 text-emerald-200 shrink-0" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1.5 shadow-lg border-slate-200 bg-white"
                >
                  <DropdownMenuItem
                    onClick={() => handleDownload('pdf')}
                    disabled={!!isDownloading}
                    className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">Dokumen PDF (A4)</span>
                      <span className="text-[10px] text-slate-500">
                        Format resmi 2 halaman A4
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleDownload('image')}
                    disabled={!!isDownloading}
                    className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">Gambar PNG (HD)</span>
                      <span className="text-[10px] text-slate-500">
                        Format gambar resolusi tinggi
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Status Bar Ribbon */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-medium">Pembayaran:</span>
              <PaymentStatusBadge status={resolvedApplicant.payment_status} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-medium">Dokumen:</span>
              <DocStatusBadge status={resolvedApplicant.status} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-medium">Seleksi:</span>
              <SelectionStatusBadge status={resolvedApplicant.status} />
            </div>
            {resolvedApplicant.username && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-[11px] font-medium">Username:</span>
                <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                  {resolvedApplicant.username}
                </span>
              </div>
            )}
            {detailLoading && !detailData && (
              <span className="text-[11px] text-emerald-700 animate-pulse ml-auto flex items-center gap-1">
                <Clock className="h-3 w-3" /> Memuat detail lengkap...
              </span>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TABS NAVIGATION (Interaktif & Terstruktur)
            ══════════════════════════════════════════════════════════ */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="print:hidden flex-1 flex flex-col min-h-0"
        >
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 pt-2 shrink-0">
            <TabsList className="flex items-center justify-start overflow-x-auto touch-pan-x no-scrollbar w-full bg-slate-200/60 p-1 gap-1 whitespace-nowrap rounded-xl">
              <TabsTrigger
                value="biodata"
                className="text-xs gap-1.5 px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs font-semibold rounded-lg"
              >
                <User className="h-3.5 w-3.5 text-emerald-600" />
                Biodata & Santri
              </TabsTrigger>
              <TabsTrigger
                value="parents"
                className="text-xs gap-1.5 px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs font-semibold rounded-lg"
              >
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                Orang Tua / Wali
              </TabsTrigger>
              <TabsTrigger
                value="domisili"
                className="text-xs gap-1.5 px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs font-semibold rounded-lg"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                Domisili & Kontak
              </TabsTrigger>
              <TabsTrigger
                value="kesehatan"
                className="text-xs gap-1.5 px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs font-semibold rounded-lg"
              >
                <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
                Kuesioner Kesehatan
              </TabsTrigger>
              <TabsTrigger
                value="cetak"
                className="text-xs gap-1.5 px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs font-semibold rounded-lg"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                Format Cetak (A4)
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ══════════════════════════════════════════════════════════
              TAB BODY CONTENTS
              ══════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
            {/* TAB 1: BIODATA & SANTRI */}
            <TabsContent value="biodata" className="mt-0 space-y-4 animate-fade-in">
              {resolvedApplicant.rejection_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-800 uppercase tracking-wide">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>Catatan / Alasan Penolakan</span>
                  </div>
                  <p className="mt-1 text-rose-700 leading-relaxed pl-6">
                    {resolvedApplicant.rejection_reason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Identitas Pribadi */}
                <SectionCard
                  icon={IdCard}
                  title="Identitas Calon Santri"
                  subtitle="Data diri lengkap calon santri yang terdaftar"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <InfoItem
                      label="Nama Lengkap"
                      value={resolvedApplicant.full_name}
                      className="sm:col-span-2"
                    />
                    <InfoItem label="NISN" value={resolvedApplicant.nisn} mono />
                    <InfoItem label="NIK" value={resolvedApplicant.nik} mono />
                    <InfoItem
                      label="Jenis Kelamin"
                      value={
                        resolvedApplicant.gender === 'L'
                          ? 'Laki-laki'
                          : resolvedApplicant.gender === 'P'
                          ? 'Perempuan'
                          : resolvedApplicant.gender
                      }
                    />
                    <InfoItem label="Agama" value={resolvedApplicant.religion || 'Islam'} />
                    <InfoItem
                      label="Tempat, Tanggal Lahir"
                      value={
                        resolvedApplicant.birth_place || resolvedApplicant.birth_date
                          ? `${resolvedApplicant.birth_place || '-'}, ${formatDate(
                              resolvedApplicant.birth_date
                            )}`
                          : '-'
                      }
                      className="sm:col-span-2"
                    />
                    <InfoItem
                      label="Asal Sekolah"
                      value={resolvedApplicant.previous_school}
                    />
                    <InfoItem
                      label="Tahun Kelulusan"
                      value={(resolvedApplicant as any).graduation_year}
                    />
                  </div>
                </SectionCard>

                {/* Status Pendaftaran & Akun */}
                <SectionCard
                  icon={GraduationCap}
                  title="Status Pendaftaran"
                  subtitle="Informasi registrasi, gelombang, dan akun sistem"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <InfoItem
                      label="Gelombang"
                      value={resolvedApplicant.wave_name || 'Gelombang Aktif'}
                    />
                    <InfoItem
                      label="Periode PPDB"
                      value={resolvedApplicant.period_name || 'Periode Aktif'}
                    />
                    <InfoItem
                      label="Tanggal Mendaftar"
                      value={formatDate(resolvedApplicant.created_at)}
                    />
                    <InfoItem
                      label="Username Akun"
                      value={resolvedApplicant.username}
                      mono
                      className="sm:col-span-2"
                    />
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px] font-semibold mb-1 uppercase">
                          Biaya Formulir
                        </span>
                        <PaymentStatusBadge status={resolvedApplicant.payment_status} />
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px] font-semibold mb-1 uppercase">
                          Hasil Pendaftaran
                        </span>
                        <SelectionStatusBadge status={resolvedApplicant.status} />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            {/* TAB 2: ORANG TUA & WALI */}
            <TabsContent value="parents" className="mt-0 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Ayah Kandung */}
                <SectionCard
                  icon={User}
                  title="Data Ayah Kandung"
                  subtitle="Identitas dan kontak ayah calon santri"
                >
                  <div className="space-y-3">
                    <InfoItem
                      label="Nama Lengkap Ayah"
                      value={resolvedApplicant.father_name || resolvedApplicant.parent_name}
                    />
                    <InfoItem
                      label="No. WhatsApp / Telepon Ayah"
                      value={resolvedApplicant.father_phone || resolvedApplicant.parent_phone}
                      action={
                        <WhatsAppButton
                          phone={
                            resolvedApplicant.father_phone || resolvedApplicant.parent_phone
                          }
                        />
                      }
                    />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <InfoItem
                        label="Pekerjaan Ayah"
                        value={resolvedApplicant.father_job}
                      />
                      <InfoItem
                        label="Pendidikan Terakhir"
                        value={resolvedApplicant.father_education}
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Data Ibu Kandung */}
                <SectionCard
                  icon={User}
                  title="Data Ibu Kandung"
                  subtitle="Identitas dan kontak ibu calon santri"
                >
                  <div className="space-y-3">
                    <InfoItem label="Nama Lengkap Ibu" value={resolvedApplicant.mother_name} />
                    <InfoItem
                      label="No. WhatsApp / Telepon Ibu"
                      value={resolvedApplicant.mother_phone}
                      action={<WhatsAppButton phone={resolvedApplicant.mother_phone} />}
                    />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <InfoItem
                        label="Pekerjaan Ibu"
                        value={resolvedApplicant.mother_job}
                      />
                      <InfoItem
                        label="Pendidikan Terakhir"
                        value={resolvedApplicant.mother_education}
                      />
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Data Wali (Jika diisi atau opsional) */}
              <SectionCard
                icon={Users}
                title="Data Wali Calon Santri"
                subtitle="Diisi bila calon santri diasuh atau diwalikan selain orang tua kandung"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <InfoItem
                    label="Nama Lengkap Wali"
                    value={resolvedApplicant.guardian_name || 'Tidak ada wali khusus'}
                  />
                  <InfoItem
                    label="Hubungan dengan Santri"
                    value={resolvedApplicant.guardian_relation}
                  />
                  <InfoItem
                    label="No. WhatsApp Wali"
                    value={resolvedApplicant.guardian_phone}
                    action={<WhatsAppButton phone={resolvedApplicant.guardian_phone} />}
                  />
                  <InfoItem
                    label="Pekerjaan Wali"
                    value={resolvedApplicant.guardian_job}
                  />
                </div>
              </SectionCard>
            </TabsContent>

            {/* TAB 3: DOMISILI & KONTAK */}
            <TabsContent value="domisili" className="mt-0 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kontak Utama Santri */}
                <SectionCard
                  icon={Phone}
                  title="Kontak Calon Santri"
                  subtitle="Saluran komunikasi langsung dengan santri"
                  className="md:col-span-1"
                >
                  <div className="space-y-3.5">
                    <InfoItem
                      label="No. WhatsApp Calon Santri"
                      value={resolvedApplicant.phone}
                      action={<WhatsAppButton phone={resolvedApplicant.phone} />}
                    />
                    <InfoItem
                      label="Alamat Email"
                      value={
                        resolvedApplicant.email ? (
                          <span className="flex items-center gap-1 font-mono text-xs">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            {resolvedApplicant.email}
                          </span>
                        ) : (
                          '-'
                        )
                      }
                    />
                  </div>
                </SectionCard>

                {/* Alamat Domisili Lengkap */}
                <SectionCard
                  icon={MapPin}
                  title="Alamat Tempat Tinggal (Domisili)"
                  subtitle="Data lokasi tempat tinggal calon santri"
                  className="md:col-span-2"
                >
                  <div className="space-y-3">
                    <InfoItem
                      label="Alamat Lengkap"
                      value={resolvedApplicant.address}
                      className="w-full"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      <InfoItem label="RT / RW" value={resolvedApplicant.rt_rw} />
                      <InfoItem label="Kelurahan / Desa" value={resolvedApplicant.village} />
                      <InfoItem label="Kecamatan" value={resolvedApplicant.district} />
                      <InfoItem label="Kabupaten / Kota" value={resolvedApplicant.city} />
                      <InfoItem label="Provinsi" value={resolvedApplicant.province} />
                      <InfoItem
                        label="Kode Pos"
                        value={resolvedApplicant.postal_code}
                        mono
                      />
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Kontak Darurat (Dari data Kuesioner Kesehatan) */}
              {parsedHealth?.emergency_contact_name && (
                <SectionCard
                  icon={ShieldCheck}
                  title="Kontak Darurat (Emergency Contact)"
                  subtitle="Kontak yang dapat dihubungi saat keadaan mendesak"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <InfoItem
                      label="Nama Kontak Darurat"
                      value={parsedHealth.emergency_contact_name}
                    />
                    <InfoItem
                      label="Hubungan"
                      value={parsedHealth.emergency_contact_relation}
                    />
                    <InfoItem
                      label="No. Telepon Darurat"
                      value={parsedHealth.emergency_contact_phone}
                      action={
                        <WhatsAppButton phone={parsedHealth.emergency_contact_phone} />
                      }
                    />
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            {/* TAB 4: KUESIONER KESEHATAN (10 SOAL BAKU) */}
            <TabsContent value="kesehatan" className="mt-0 space-y-4 animate-fade-in">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs flex items-start gap-3 text-emerald-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold">
                    Identifikasi Riwayat Kesehatan Mandiri (10 Pertanyaan Baku)
                  </h5>
                  <p className="text-emerald-700 mt-0.5 leading-relaxed">
                    Data kesehatan ini diisi langsung oleh calon santri saat registrasi awal
                    sebagai bagian dari formulir baku pendaftaran.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <HealthIdentificationViewer data={resolvedApplicant.disease_history} />
              </div>
            </TabsContent>

            {/* TAB 5: FORMAT CETAK A4 (PREVIEW DOKUMEN RESMI) */}
            <TabsContent value="cetak" className="mt-0 space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Pratinjau Format Dokumen Cetak A4 Resmi
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tampilan di bawah adalah format presisi yang dicetak atau diunduh ke PDF.
                  </p>
                </div>

                {/* Page Switcher */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setPreviewPage('both')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer',
                      previewPage === 'both'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    2 Halaman
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPage(1)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer',
                      previewPage === 1
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Halaman 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPage(2)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer',
                      previewPage === 2
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Halaman 2
                  </button>
                </div>
              </div>

              {/* Render Lembar Cetak Dokumen A4 Terisolasi */}
              <div className="flex justify-start sm:justify-center overflow-x-auto touch-pan-x py-4 bg-slate-200/80 rounded-2xl p-2 sm:p-6 border border-slate-300 shadow-inner">
                <ApplicantFormDocument applicant={resolvedApplicant} page={previewPage} />
              </div>
            </TabsContent>
          </div>

          {/* ══════════════════════════════════════════════════════════
              FOOTER MODAL
              ══════════════════════════════════════════════════════════ */}
          <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">
                Sistem PPDB Resmi — Pesantren Tahfidz Qur&apos;an & Digital Ar-Rahman
              </span>
              <span className="sm:hidden">PPDB Ar-Rahman</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-semibold px-4 cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </Tabs>

        {/* ══════════════════════════════════════════════════════════
            BACKGROUND EXPORT & PRINT ISOLATION CONTAINER
            (Selalu tersedia di DOM untuk html2canvas & browser print)
            ══════════════════════════════════════════════════════════ */}
        <div
          ref={exportContainerRef}
          className="applicant-form-print-sheet"
          style={{
            position: 'fixed',
            left: '-99999px',
            top: 0,
            width: '210mm',
            zIndex: -99999,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <ApplicantFormDocument
            applicant={resolvedApplicant}
            page={activeTab === 'cetak' ? previewPage : 'both'}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
