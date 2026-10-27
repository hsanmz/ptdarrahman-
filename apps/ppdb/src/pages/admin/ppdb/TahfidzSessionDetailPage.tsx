import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCanPage } from '@/hooks/useCan'
import { DocTrigger } from '@repo/ui'
import {
  Card,
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
  Label,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Search,
  ExternalLink,
  Phone,
  Tag,
  Loader2,
  TableProperties,
  List,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const formatDateSafe = (d?: any) => {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

export default function TahfidzSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCanPage('sessions')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'pending'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'bulk'>('list')

  // Reschedule Dialog State
  const [rescheduleApplicant, setRescheduleApplicant] = useState<{ applicant_id: string; full_name: string } | null>(null)
  const [targetSessionId, setTargetSessionId] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')

  // 1. Fetch Session Info & Applicants (Real-time polling 5s)
  const { data: sessionsRes, isLoading: loadingSessions, isFetching } = useQuery({
    queryKey: ['selection-sessions', 'tahfidz'],
    queryFn: () => api.apiFetch<{ data: any[] }>('/selection/sessions?type=tahfidz'),
    refetchInterval: 5000,
  })

  const schedulesList = Array.isArray(sessionsRes?.data) ? sessionsRes.data : []
  const session = useMemo(() => {
    return schedulesList.find((s) => s.id === sessionId)
  }, [schedulesList, sessionId])

  const allSchedules = schedulesList

  // 2. Fetch Categories & Criteria for Tahfidz Rubric
  const { data: categories = [] } = useQuery({
    queryKey: ['selection-categories-global'],
    queryFn: async () => {
      const res = await api.apiFetch<any>('/selection/categories')
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  const tahfidzCategory = useMemo(() => {
    return categories.find((c: any) => c.name?.toLowerCase().includes('tahfidz'))
  }, [categories])

  const criteriaList: any[] = tahfidzCategory?.criteria || []

  // 3. Bulk Grading State: Record<applicant_id, { scores: Record<criteria_id, number>, notes: string }>
  const [bulkData, setBulkData] = useState<Record<string, { scores: Record<string, number>; notes: string }>>({})

  // Initialize bulk data when session applicants load
  const bookedApplicants: any[] = Array.isArray(session?.booked_applicants) ? session.booked_applicants : []

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return bookedApplicants.filter((app) => {
      const isEval = !!app.is_tahfidz_evaluated
      if (statusFilter === 'evaluated' && !isEval) return false
      if (statusFilter === 'pending' && isEval) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (app.full_name || '').toLowerCase().includes(q)
        const matchNisn = (app.nisn || '').toLowerCase().includes(q)
        const matchPhone = (app.phone || '').toLowerCase().includes(q)
        return matchName || matchNisn || matchPhone
      }
      return true
    })
  }, [bookedApplicants, statusFilter, searchQuery])

  // Bulk Save Mutation
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      // Validate that each candidate with scores has REQUIRED notes
      const payloadItems: any[] = []

      for (const app of bookedApplicants) {
        const appBulk = bulkData[app.id]
        if (!appBulk) continue

        const scoresEntries = Object.entries(appBulk.scores || {})
        if (scoresEntries.length === 0) continue

        if (!appBulk.notes || !appBulk.notes.trim()) {
          throw new Error(`Catatan evaluasi untuk santri "${app.full_name}" wajib diisi sebelum menyimpan nilai!`)
        }

        payloadItems.push({
          applicant_id: app.id,
          scores: scoresEntries.map(([criteria_id, score]) => ({
            criteria_id,
            score: Number(score),
          })),
          notes: `[Tahfidz]: ${appBulk.notes.trim()}`,
        })
      }

      if (payloadItems.length === 0) {
        throw new Error('Belum ada nilai yang diinput untuk disimpan.')
      }

      return await api.apiFetch('/selection/results/bulk', {
        method: 'POST',
        body: JSON.stringify({ items: payloadItems }),
      })
    },
    onSuccess: (res: any) => {
      toast('success', res?.message || 'Seluruh nilai Tahfidz berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'tahfidz'] })
      setViewMode('list')
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menyimpan nilai massal')
    },
  })

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!rescheduleApplicant || !targetSessionId) {
        throw new Error('Pilih jadwal target pemindahan')
      }
      return await api.apiFetch(
        `/selection/applicants/${rescheduleApplicant.applicant_id}/move-session`,
        {
          method: 'POST',
          body: JSON.stringify({
            target_session_id: targetSessionId,
            reason: rescheduleReason.trim() || undefined,
          }),
        }
      )
    },
    onSuccess: (res: any) => {
      toast('success', res?.message || 'Jadwal santri berhasil dipindahkan!')
      setRescheduleApplicant(null)
      setTargetSessionId('')
      setRescheduleReason('')
      queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'tahfidz'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal memindahkan jadwal santri')
    },
  })

  // Calculate bulk summary
  const totalCount = bookedApplicants.length
  const evaluatedCount = bookedApplicants.filter((a) => a.is_tahfidz_evaluated).length
  const pendingCount = totalCount - evaluatedCount

  if (loadingSessions && !session) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Memuat data jadwal seleksi Tahfidz...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center p-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Jadwal Tahfidz Tidak Ditemukan</h2>
        <p className="max-w-md text-sm text-slate-600">
          Jadwal seleksi Tahfidz mungkin telah dihapus atau tidak berada di periode aktif.
        </p>
        <Button onClick={() => navigate('/admin/jadwal-seleksi/tahfidz')} variant="outline">
          Kembali ke Daftar Jadwal
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Top Navigation & Back Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/jadwal-seleksi/tahfidz')}
            className="h-9 w-9 p-0 rounded-full"
            title="Kembali ke Daftar Jadwal"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl font-bold text-slate-900">{session.name}</h1>
              {session.batch_name && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  {session.batch_name}
                </Badge>
              )}
              {session.wave_name && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {session.wave_name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ruang Seleksi &amp; Penilaian Ujian Tahfidz Al-Qur'an
            </p>
          </div>
        </div>

        {/* Header CTAs */}
        <div className="flex items-center gap-2">
          <DocTrigger docKey="ppdb-jadwal-tahfidz" variant="light" />
          {isFetching && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Real-time
            </span>
          )}

          {canCrud && (
            <Button
              variant={viewMode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode((m) => (m === 'bulk' ? 'list' : 'bulk'))}
              className={cn(
                'h-9 text-xs gap-1.5',
                viewMode === 'bulk' ? 'bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              )}
            >
              {viewMode === 'bulk' ? (
                <>
                  <List className="h-3.5 w-3.5" /> Tampilan Daftar
                </>
              ) : (
                <>
                  <TableProperties className="h-3.5 w-3.5" /> Input Nilai Sekaligus
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Schedule Info Banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Tanggal Pelaksanaan</span>
            <span className="text-xs font-semibold text-slate-800">
              {formatDateSafe(session.session_date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Waktu Ujian</span>
            <span className="text-xs font-semibold text-slate-800">
              {session.start_time || '08:00'} - {session.end_time || '12:00'} WIB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Penguji Tahfidz</span>
            <span className="text-xs font-semibold text-slate-800 truncate block max-w-[170px]">
              {session.officer_name || '-'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            {session.mode === 'online' ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Mode / Lokasi</span>
            {session.mode === 'online' ? (
              session.meeting_url ? (
                <a
                  href={session.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  Buka Zoom <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs font-semibold text-blue-700">Online (Zoom)</span>
              )
            ) : (
              <span className="text-xs font-semibold text-slate-800 truncate block max-w-[170px]">
                {session.location || 'Kampus PTDARRAHMAN'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-muted-foreground">Total Peserta Terdaftar</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount} Santri</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-muted-foreground">Sudah Selesai Dinilai</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{evaluatedCount} Santri</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-muted-foreground">Menunggu Penilaian</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount} Santri</p>
        </Card>
      </div>

      {/* ── MODE 1: LIST VIEW (Penilaian Per Santri) ── */}
      {viewMode === 'list' && (
        <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Santri Peserta Seleksi</h2>
              <p className="text-xs text-muted-foreground">
                Klik baris santri untuk membuka lembar penilaian dan menginput nilai rubrik.
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-7 text-xs px-2.5"
                >
                  Semua ({totalCount})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  className="h-7 text-xs px-2.5"
                >
                  Belum ({pendingCount})
                </Button>
                <Button
                  variant={statusFilter === 'evaluated' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('evaluated')}
                  className="h-7 text-xs px-2.5"
                >
                  Sudah ({evaluatedCount})
                </Button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari santri / NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </div>

          {filteredApplicants.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {bookedApplicants.length === 0
                ? 'Belum ada pendaftar yang terdaftar di jadwal seleksi ini.'
                : 'Tidak ada santri yang cocok dengan filter pencarian.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="text-xs font-semibold">Nama Santri</TableHead>
                    <TableHead className="text-xs font-semibold">Kontak</TableHead>
                    <TableHead className="text-xs font-semibold">Status Penilaian</TableHead>
                    <TableHead className="text-xs font-semibold">Catatan Evaluator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplicants.map((app, idx) => {
                    const isEval = !!app.is_tahfidz_evaluated
                    const score = app.tahfidz_score

                    return (
                      <TableRow
                        key={app.id || idx}
                        onClick={() =>
                          navigate(`/admin/sessions/tahfidz/evaluasi/${session.id}?applicant_id=${app.id}`)
                        }
                        className="cursor-pointer hover:bg-emerald-50/60 transition-colors group"
                        title="Klik untuk membuka lembar penilaian"
                      >
                        <TableCell>
                          <div className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {app.full_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-slate-600 inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" /> {app.phone || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isEval ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Sudah Dinilai ({score ?? '-'})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                              Belum Dinilai
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="text-xs text-slate-600 truncate block">
                            {app.notes || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* ── MODE 2: BULK GRADING (Lembar Nilai Sekaligus) ── */}
      {viewMode === 'bulk' && (
        <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-4 sm:p-5 border-b bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TableProperties className="h-5 w-5 text-emerald-700" />
                Lembar Penilaian Sekaligus (Bulk Grading)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Input nilai seluruh kriteria rubrik Tahfidz sekaligus. Akumulasi nilai otomatis terhitung.
                <span className="font-semibold text-red-600 ml-1">
                  *Catatan per santri wajib diisi sebelum menyimpan!
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                onClick={() => bulkSaveMutation.mutate()}
                disabled={bulkSaveMutation.isPending}
              >
                {bulkSaveMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Simpan Semua Nilai
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[750px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10 text-xs">No</TableHead>
                  <TableHead className="w-48 text-xs">Nama Santri</TableHead>
                  {criteriaList.map((crit) => (
                    <TableHead key={crit.id} className="text-center text-xs">
                      {crit.name}
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        ({crit.weight}%)
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="w-24 text-center text-xs font-bold text-emerald-800">
                    Nilai Akhir
                  </TableHead>
                  <TableHead className="w-64 text-xs font-semibold text-rose-700">
                    Catatan Evaluasi <span className="text-red-500">* (Wajib)</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookedApplicants.map((app, idx) => {
                  const currentAppBulk = bulkData[app.id] || { scores: {}, notes: app.notes || '' }
                  const scores = currentAppBulk.scores

                  // Compute weighted average
                  let totalWeighted = 0
                  let totalWeight = 0
                  criteriaList.forEach((c) => {
                    const val = scores[c.id]
                    if (val !== undefined && val !== null && !isNaN(val)) {
                      totalWeighted += (Number(val) * Number(c.weight)) / 100
                      totalWeight += Number(c.weight)
                    }
                  })
                  const computedScore = totalWeight > 0 ? totalWeighted.toFixed(1) : '-'

                  return (
                    <TableRow key={app.id || idx}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs text-slate-900 block truncate max-w-[180px]">
                          {app.full_name}
                        </span>
                        {app.is_tahfidz_evaluated && (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            ✓ Nilai tersimpan: {app.tahfidz_score}
                          </span>
                        )}
                      </TableCell>

                      {criteriaList.map((crit) => (
                        <TableCell key={crit.id} className="text-center p-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            value={scores[crit.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value)
                              setBulkData((prev) => ({
                                ...prev,
                                [app.id]: {
                                  scores: {
                                    ...(prev[app.id]?.scores || {}),
                                    [crit.id]: val as number,
                                  },
                                  notes: prev[app.id]?.notes ?? (app.notes || ''),
                                },
                              }))
                            }}
                            className="h-8 w-20 text-center text-xs mx-auto font-mono"
                          />
                        </TableCell>
                      ))}

                      <TableCell className="text-center font-mono font-bold text-sm text-emerald-700">
                        {computedScore}
                      </TableCell>

                      <TableCell className="p-2">
                        <Input
                          placeholder="Catatan hafalan & tajwid santri..."
                          value={currentAppBulk.notes}
                          onChange={(e) => {
                            const val = e.target.value
                            setBulkData((prev) => ({
                              ...prev,
                              [app.id]: {
                                scores: prev[app.id]?.scores || {},
                                notes: val,
                              },
                            }))
                          }}
                          className={cn(
                            'text-xs h-8',
                            !currentAppBulk.notes?.trim() && Object.keys(scores).length > 0
                              ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                              : ''
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Modal Dialog Pindah Sesi (Reschedule) ── */}
      <Dialog
        open={rescheduleApplicant !== null}
        onOpenChange={(open) => !open && setRescheduleApplicant(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Calendar className="h-5 w-5 text-blue-600" />
              Pindah Sesi Tahfidz
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pindahkan jadwal ujian Tahfidz untuk peserta{' '}
              <span className="font-semibold text-slate-800">
                {rescheduleApplicant?.full_name}
              </span>
              . Sistem akan otomatis mengirimkan notifikasi jadwal baru via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Pilih Jadwal Tahfidz Target <span className="text-red-500">*</span>
              </Label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Jadwal Target --</option>
                {allSchedules
                  .filter((s: any) => s.id !== session.id)
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.session_date ? s.session_date.split('T')[0] : ''} ·{' '}
                      {s.start_time || ''} - {s.end_time || ''})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Alasan Pemindahan Jadwal (Opsional)
              </Label>
              <Textarea
                placeholder="Contoh: Peserta sakit / berhalangan hadir pada tanggal sesi sebelumnya..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRescheduleApplicant(null)}
              disabled={rescheduleMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              onClick={() => rescheduleMutation.mutate()}
              disabled={!targetSessionId || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memindahkan...
                </>
              ) : (
                'Konfirmasi Pindah Sesi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
