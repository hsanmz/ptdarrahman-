import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Badge, Card, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui"
import { DocTrigger } from '@repo/ui'
import {
  CheckCircle, Lock, Wallet, FileUp, Trophy, AlertCircle,
  BookOpen, MessageSquare, ArrowRight,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/Toast'
import SupportFab from './components/SupportFab'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  registration: 'Terdaftar',
  pending_payment: 'Menunggu Pembayaran',
  document_uploaded: 'Dokumen Menunggu Review',
  document_uploaded_pending: 'Dokumen Menunggu Review',
  document_rejected: 'Dokumen Ditolak',
  document_approved: 'Dokumen Disetujui',
  selection: 'Tahap Seleksi',
  passed: 'LULUS ✓',
  failed: 'Tidak Lulus',
  expired: 'Kedaluwarsa',
}

export default function ApplicantDashboardPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const documentsQuery = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => apiFetch<any>('/ppdb/documents'),
  })

  const applicant = transactionQuery.data?.applicant
  const status = applicant?.status
  const loading = transactionQuery.isLoading || documentsQuery.isLoading

  const inSelection = ['document_approved', 'selection', 'passed', 'failed'].includes(status)

  const selectionQuery = useQuery({
    queryKey: ['my-selection'],
    queryFn: async () => {
      const [resultRes, sessionRes] = await Promise.all([
        apiFetch<any>('/selection/applicants/me/results'),
        apiFetch<any>('/selection/applicants/me/sessions'),
      ])
      return {
        result: resultRes || null,
        sessionData: sessionRes || null,
      }
    },
    enabled: inSelection,
  })

  const contactQuery = useQuery({
    queryKey: ['contact-info'],
    queryFn: () => apiFetch<any>('/companyprofile/contact-info'),
  })

  const loaQuery = useQuery({
    queryKey: ['my-loa'],
    queryFn: async () => {
      const res = await apiFetch<any>('/ppdb/applicants/me/loa').catch(() => null)
      return res?.letter_number ? res : (res?.loa || null)
    },
    enabled: ['passed', 'failed'].includes(status),
  })

  const contactInfo = contactQuery.data ?? null

  const hasTahfidzScore = selectionQuery.data?.sessionData?.has_tahfidz_score || false
  const hasInterviewScore = selectionQuery.data?.sessionData?.has_interview_score || false

  const isLoaSigned = Boolean(applicant?.is_loa_signed || loaQuery.data?.is_loa_signed)

  const hasActiveSchedule = Boolean(
    (selectionQuery.data?.sessionData?.all_schedules && selectionQuery.data.sessionData.all_schedules.length > 0) ||
    selectionQuery.data?.sessionData?.tahfidz_session ||
    selectionQuery.data?.sessionData?.interview_session
  )

  // Step definition dinamis (Granular) — alur berhenti sampai penandatanganan LoA resmi
  const steps = [
    {
      number: 1,
      title: 'Pembayaran Formulir',
      description: 'Menyelesaikan pembayaran pendaftaran PPDB.',
      icon: Wallet,
      status: applicant?.payment_status === 'paid' ? 'completed' : 'pending',
      path: '/applicant/kuitansi',
    },
    {
      number: 2,
      title: 'Upload Dokumen',
      description: 'Mengunggah seluruh berkas persyaratan wajib.',
      icon: FileUp,
      status: ['document_approved', 'selection', 'passed', 'failed'].includes(status) ? 'completed' :
              applicant?.payment_status === 'paid' ? 'active' : 'locked',
      path: '/applicant/dokumen',
    },
    {
      number: 3,
      title: 'Tes Seleksi',
      description: hasActiveSchedule
        ? 'Jadwal dan hasil ujian seleksi akademik, psikologi, dan tahfidz.'
        : 'Dokumen disetujui. Menunggu jadwal seleksi diterbitkan panitia.',
      icon: BookOpen,
      status: (hasTahfidzScore || selectionQuery.data?.result?.cbt_results?.akademik || ['passed', 'failed'].includes(status)) ? 'completed' :
              ['document_approved', 'selection'].includes(status) ? 'active' : 'locked',
      path: '/applicant/tes-seleksi',
    },
    {
      number: 4,
      title: 'Wawancara',
      description: 'Wawancara calon santri dan orang tua/wali.',
      icon: MessageSquare,
      status: hasInterviewScore || ['passed', 'failed'].includes(status) ? 'completed' :
              ['document_approved', 'selection'].includes(status) ? 'active' : 'locked',
      path: '/applicant/wawancara',
    },
    {
      number: 5,
      title: 'Hasil Kelulusan & LoA',
      description: 'Pengumuman kelulusan dan penandatanganan LoA resmi.',
      icon: Trophy,
      status: status === 'passed' ? (isLoaSigned ? 'completed' : 'active') : status === 'failed' ? 'completed' : 'locked',
      path: '/applicant/pengumuman',
    },
  ]

  const doneSteps = steps.filter(s => s.status === 'completed').length

  const fullName = applicant?.full_name || user?.full_name || 'Pendaftar'
  const firstName = fullName.split(' ')[0]

  const paymentLabel = applicant?.payment_status === 'paid' ? 'Formulir Lunas' : 'Menunggu Bayar'
  let statusLabel = STATUS_LABEL[status] || status || 'Menunggu Pembayaran'
  if (status === 'selection' && !hasActiveSchedule) {
    statusLabel = 'Menunggu Jadwal Seleksi'
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl w-full space-y-6">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-5xl w-full space-y-6">
        {/* Welcome Header */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-primary via-emerald-800 to-teal-800 p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6 relative z-10">
            <div className="min-w-0">
              <span className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Dashboard Pendaftar</span>
              <h1 className="mt-0.5 break-words font-heading text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{firstName}</h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
                Pantau progres pendaftaran Anda dan selesaikan setiap tahapan yang masih aktif.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-accent/25 px-3 py-1 text-xs font-semibold text-gold-light ring-1 ring-gold-accent/40">
                  {paymentLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between gap-3 border-t border-white/10 sm:border-t-0 pt-3 sm:pt-0">
              <DocTrigger docKey="applicant-dashboard" variant="dark" />
              <div className="text-right">
                <p className="text-xs font-medium text-emerald-100">Progres Pendaftaran</p>
                <p className="mt-0.5 font-heading text-xl font-bold">{doneSteps}<span className="text-emerald-100/70">/{steps.length}</span></p>
                <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-gold-accent transition-all" style={{ width: `${(doneSteps / steps.length) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {status === 'document_rejected' && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <h3 className="text-red-800 font-semibold text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Dokumen Ditolak
            </h3>
            <p className="text-red-700 mt-2 text-sm leading-relaxed">
              Terdapat kekurangan atau kesalahan pada dokumen Anda dengan alasan:{' '}
              <strong className="underline">{applicant?.rejection_reason || 'Mohon periksa dan unggah ulang dokumen yang sesuai'}</strong>.
              Silakan buka tahap Dokumen untuk memperbaiki berkas.
            </p>
          </div>
        )}

        {/* Visual Timeline (Stepper) */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 overflow-x-auto touch-pan-x">
          <div className="min-w-[700px] pb-1">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0" />
              <div
                className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-emerald-primary rounded-full z-0 transition-all duration-500"
                style={{ width: `calc(${((doneSteps) / (steps.length - 1)) * 100}% - ${doneSteps === steps.length ? 3 : 1}rem)` }}
              />

              {steps.map((step) => {
                const isCompleted = step.status === 'completed'
                const isActive = step.status === 'active'
                const StepIcon = step.icon || CheckCircle

                let circleCls = "bg-slate-100 text-slate-400 border-2 border-white ring-4 ring-slate-50"
                if (isCompleted) circleCls = "bg-emerald-primary text-white border-2 border-white ring-4 ring-emerald-50 shadow-md"
                else if (isActive) circleCls = "bg-white text-emerald-primary border-2 border-emerald-primary ring-4 ring-emerald-50 shadow-md"

                return (
                  <div key={step.number} className="relative z-10 flex flex-col items-center gap-3 w-32">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300", circleCls)}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <div className="text-center">
                      <p className={cn("text-xs font-bold", isActive ? "text-emerald-primary" : isCompleted ? "text-slate-800" : "text-slate-400")}>
                        Tahap {step.number}
                      </p>
                      <p className={cn("text-[10px] uppercase tracking-wider mt-0.5", isActive ? "font-semibold text-emerald-700" : "text-slate-500")}>
                        {step.title.replace(' Persyaratan', '')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Task Details - Buka Halaman Baru Saat Diklik (Bukan Dropdown) */}
        <div className="pt-4 pb-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-900">Daftar Tahapan Seleksi</h2>
              <p className="text-xs text-slate-500">Klik tahapan aktif untuk masuk ke halaman pengerjaan.</p>
            </div>
          </div>

          <div className="relative space-y-4">
            <div className="absolute bottom-8 left-5 sm:left-[1.375rem] top-8 w-0.5 -translate-x-px bg-slate-200" />
            {steps.map((step) => {
              const isCompleted = step.status === 'completed'
              const isActive = step.status === 'active'
              const isPending = step.status === 'pending'
              const isLocked = step.status === 'locked'
              const StepIcon = step.icon || CheckCircle

              const circleCls = isCompleted
                ? 'bg-emerald-primary text-white ring-4 ring-emerald-primary/15'
                : isActive
                  ? 'bg-white text-emerald-primary border-emerald-primary ring-4 ring-emerald-primary/10'
                  : isPending
                    ? 'bg-gold-accent text-white ring-4 ring-gold-accent/15'
                    : 'bg-slate-100 text-slate-400 border-slate-200'

              const stepBadge = isCompleted
                ? <Badge variant="success">Selesai</Badge>
                : isActive
                  ? <Badge variant="info">Sedang Berjalan</Badge>
                  : isPending
                    ? <Badge variant="warning">Menunggu Bayar</Badge>
                    : <Badge variant="outline" className="text-slate-400"><Lock className="mr-1 h-3 w-3" />Terkunci</Badge>

              return (
                <div key={step.number} className="group relative flex items-start">
                  <div className="z-10 mr-3 sm:mr-5 mt-1 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center">
                    <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleCls}`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                  </div>

                  <Card
                    className={cn(
                      'flex-1 min-w-0 border-slate-200 shadow-sm transition-all duration-300',
                      isActive && 'border-emerald-primary/40 shadow-md ring-1 ring-emerald-primary/10 hover:border-emerald-primary',
                      !isLocked && 'cursor-pointer hover:shadow-md hover:border-emerald-300 hover:bg-slate-50/50',
                      isLocked && 'bg-slate-50/50 opacity-60 cursor-not-allowed'
                    )}
                    onClick={() => {
                      if (isLocked) {
                        toast('info', 'Tahap ini masih terkunci. Silakan selesaikan tahap sebelumnya terlebih dahulu.')
                        return
                      }
                      navigate(step.path)
                    }}
                  >
                    <CardHeader className="p-3.5 sm:p-5">
                      <div className="flex items-center justify-between gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className={cn(
                              'text-base sm:text-lg font-heading leading-tight break-words',
                              isActive && 'text-emerald-primary',
                              isCompleted && 'text-emerald-primary',
                              isPending && 'text-gold-dark',
                              isLocked && 'text-slate-700'
                            )}>
                              {step.title}
                            </CardTitle>
                            <div className="hidden sm:block">{stepBadge}</div>
                          </div>
                          <CardDescription className="mt-1 text-xs break-words">{step.description}</CardDescription>
                          <div className="mt-2 sm:hidden">{stepBadge}</div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {!isLocked ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 text-emerald-800 group-hover:bg-emerald-100 text-xs font-bold transition-all shadow-2xs">
                              <span>Buka</span>
                              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          ) : (
                            <div className="p-2 text-slate-300">
                              <Lock className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating Support FAB */}
      {contactInfo && (contactInfo.phone_primary || contactInfo.whatsapp || contactInfo.email_primary) && (
        <SupportFab
          phone={contactInfo.phone_primary}
          whatsapp={contactInfo.whatsapp}
          email={contactInfo.email_primary}
        />
      )}
    </>
  )
}
