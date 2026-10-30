import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cbtService, type CandidateMonitoring } from '@/services/cbtService'
import { useToast } from '@/components/Toast'
import MoveSessionDialog from '@/components/shared/MoveSessionDialog'
import { DocTrigger } from '@repo/ui'
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableSkeletonRows,
} from '@/components/ui'
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  KeyRound,
  Users,
  Clock,
  CheckCircle2,
  Search,
  Lock,
  Unlock,
  Calendar,
} from 'lucide-react'

export default function PemantauanUjianPage() {
  const { category, scheduleId } = useParams<{ category: 'akademik' | 'psikologi'; scheduleId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Live Query with auto-polling every 4 seconds
  const { data: monitoringData, isLoading } = useQuery({
    queryKey: ['cbt-monitoring', scheduleId],
    queryFn: () => (scheduleId ? cbtService.getMonitoring(scheduleId) : null),
    enabled: !!scheduleId,
    refetchInterval: 4000, // Real-time polling
  })

  const schedule = monitoringData?.schedule
  const candidates = Array.isArray(monitoringData?.candidates) ? monitoringData.candidates : []
  const stats = monitoringData?.stats || {
    total: 0,
    not_started: 0,
    in_progress: 0,
    locked: 0,
    completed: 0,
  }

  // Reschedule State (Pindah Sesi Massal)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)

  // Query other schedules for this category
  const { data: allSchedules = [] } = useQuery({
    queryKey: ['cbt-schedules', category, schedule?.wave_id],
    queryFn: () => (category ? cbtService.getSchedules(category as any, schedule?.wave_id) : []),
    enabled: !!category,
  })

  // Unfreeze Mutation
  const unfreezeMutation = useMutation({
    mutationFn: (applicantId: string) =>
      cbtService.unfreezeCandidate(scheduleId!, applicantId),
    onSuccess: (_res, applicantId) => {
      const candidate = candidates.find((c) => c.applicant_id === applicantId)
      toast(
        'success',
        `Akses ${candidate?.full_name || 'peserta'} dibuka. Ujian peserta direset: mulai dari soal pertama, wajib konfirmasi ulang password + PIN.`
      )
      queryClient.invalidateQueries({ queryKey: ['cbt-monitoring', scheduleId] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal membuka kunci peserta.')
    },
  })

  const examUrl = `${window.location.origin}/exam/${scheduleId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(examUrl)
    setCopiedLink(true)
    toast('success', 'Tautan ujian berhasil disalin!')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleCopyPin = () => {
    if (!schedule?.access_token) return
    navigator.clipboard.writeText(schedule.access_token)
    setCopiedPin(true)
    toast('success', 'PIN Sesi berhasil disalin!')
    setTimeout(() => setCopiedPin(false), 2500)
  }

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.registration_number && c.registration_number.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatRemainingTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s < 10 ? '0' : ''}${s}d`
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'Belum Masuk'
      case 'in_progress':
        return 'Mengerjakan'
      case 'locked':
        return 'Terkunci'
      case 'completed':
        return 'Selesai'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/admin/jadwal-seleksi/${category || 'akademik'}`)}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Kembali ke Daftar Jadwal Seleksi
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-700">Pemantauan Real-time Aktif</span>
          </div>
          <DocTrigger docKey="ppdb-cbt-monitoring" variant="light" />
        </div>
      </div>

      {/* Header Info Card */}
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-50/50 via-background to-background">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-xs font-semibold uppercase">
                  {schedule?.category || category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {schedule?.wave_name || 'Gelombang Aktif'}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    schedule?.mode === 'online'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {schedule?.mode === 'online' ? 'Online (Daring)' : 'Offline (Tatap Muka)'}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-foreground mt-1">
                {schedule?.name || 'Memuat Jadwal Sesi...'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-md shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{schedule?.session_date} ({schedule?.start_time} - {schedule?.end_time} WIB)</span>
              </div>
              {schedule?.officer_name && (
                <div className="flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-md shadow-sm">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Pengawas: {schedule.officer_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Exam URL & PIN Share Box */}
          <div className="p-3.5 bg-background border border-emerald-300 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 w-full md:w-auto">
              <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Tautan Akses Ujian & PIN Peserta:
              </div>
              <p className="text-[11px] text-muted-foreground">
                Bagikan ke peserta saat jam ujian tiba agar pendaftar dapat masuk ke ruang CBT.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 bg-muted/60 border rounded-md px-2.5 py-1 text-xs font-mono">
                <KeyRound className="w-3.5 h-3.5 text-emerald-700 mr-1" />
                <span>PIN: </span>
                <strong className="text-emerald-800 tracking-wider font-bold">
                  {schedule?.access_token || '----'}
                </strong>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPin}
                  className="h-6 px-1.5 ml-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 text-xs border-emerald-400 text-emerald-800 hover:bg-emerald-50"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Salin Link Ujian
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border border-border">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Total Peserta</span>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Belum Masuk</span>
            <div className="text-2xl font-bold text-muted-foreground">{stats.not_started}</div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-blue-700">Sedang Mengerjakan</span>
            <div className="text-2xl font-bold text-blue-800">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="border border-red-300 bg-red-50/40">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-red-700 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Terkunci (Curang)
            </span>
            <div className="text-2xl font-bold text-red-800">{stats.locked}</div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-emerald-700">Selesai</span>
            <div className="text-2xl font-bold text-emerald-800">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Candidate Table & Filters */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Filter, Search & CTA Pindah Sesi */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau no registrasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'Semua', val: 'all' },
                { label: 'Mengerjakan', val: 'in_progress' },
                { label: 'Terkunci', val: 'locked' },
                { label: 'Selesai', val: 'completed' },
                { label: 'Belum Masuk', val: 'not_started' },
              ].map((f) => (
                <Button
                  key={f.val}
                  variant={statusFilter === f.val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(f.val)}
                  className="h-8 text-xs"
                >
                  {f.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMoveDialogOpen(true)}
                disabled={candidates.filter((c) => c.status !== 'completed').length === 0}
                className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                title="Pindahkan peserta ke jadwal CBT lain jika berhalangan"
              >
                <Calendar className="w-3.5 h-3.5" />
                Pindah Sesi
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">No. Regis</TableHead>
                  <TableHead className="text-xs">Calon Santri</TableHead>
                  <TableHead className="text-xs">Status CBT</TableHead>
                  <TableHead className="text-xs text-center">Terjawab</TableHead>
                  <TableHead className="text-xs text-center">Pelanggaran</TableHead>
                  <TableHead className="text-xs text-center">Nilai</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows cols={7} rows={5} />
                ) : filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      Tidak ada peserta yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((c) => (
                    <TableRow
                      key={c.applicant_id}
                      className={c.status === 'locked' ? 'bg-red-50/50' : undefined}
                    >
                      <TableCell className="text-xs font-mono font-semibold text-foreground">
                        {c.registration_number || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div
                          className="font-semibold text-foreground max-w-[180px] truncate"
                          title={c.full_name}
                        >
                          {c.full_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono max-w-[180px] truncate">
                          {c.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.status === 'not_started' && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Belum Masuk
                          </Badge>
                        )}
                        {c.status === 'in_progress' && (
                          <Badge className="bg-blue-600 text-white font-medium flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 animate-spin" />
                            Mengerjakan ({formatRemainingTime(c.remaining_seconds)})
                          </Badge>
                        )}
                        {c.status === 'locked' && (
                          <Badge className="bg-red-600 text-white font-bold animate-pulse flex items-center gap-1 w-fit">
                            <Lock className="w-3 h-3" />
                            TERKUNCI (Curang)
                          </Badge>
                        )}
                        {c.status === 'completed' && (
                          <Badge className="bg-emerald-600 text-white font-medium flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Selesai
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono">
                        {c.answers_count} / {c.total_questions}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {c.violations_count > 0 ? (
                          <span className="font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs">
                            {c.violations_count}x
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0x</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold">
                        {c.score !== null && c.score !== undefined ? (
                          <span className="text-emerald-700 text-sm">{c.score}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === 'locked' && (
                            <Button
                              size="sm"
                              onClick={() => unfreezeMutation.mutate(c.applicant_id)}
                              disabled={unfreezeMutation.isPending}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-2.5 shadow-xs animate-bounce"
                            >
                              <Unlock className="w-3 h-3 mr-1" />
                              Buka Kunci
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal Pindah Sesi Peserta CBT (Reschedule Massal) ── */}
      <MoveSessionDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        sourceSessionId={scheduleId || null}
        sourceSessionLabel={
          schedule?.name
            ? `${schedule.name} (${schedule?.session_date} · ${schedule?.start_time} - ${schedule?.end_time} WIB)`
            : null
        }
        applicants={candidates.map((c: CandidateMonitoring) => ({
          applicant_id: c.applicant_id,
          full_name: c.full_name,
          phone: c.phone,
          extra_label: c.registration_number
            ? `No. Regis: ${c.registration_number}`
            : null,
          status_label: statusLabel(c.status),
          moves_disabled: c.status === 'completed',
        }))}
        targets={allSchedules
          .filter((s) => s.id !== scheduleId && s.status !== 'cancelled')
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            session_date: s.session_date,
            start_time: s.start_time,
            end_time: s.end_time,
            tag: s.mode === 'online' ? 'Online' : 'Offline',
          }))}
        onMoved={() => queryClient.invalidateQueries({ queryKey: ['cbt-monitoring', scheduleId] })}
      />
    </div>
  )
}
