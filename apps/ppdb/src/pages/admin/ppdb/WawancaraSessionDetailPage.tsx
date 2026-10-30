import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCanPage } from '@/hooks/useCan'
import { DocTrigger } from '@repo/ui'
import MoveSessionDialog from '@/components/shared/MoveSessionDialog'
import {
  Card,
  Badge,
  Button,
  Input,
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
  HeartHandshake,
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

export default function WawancaraSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCanPage('sessions')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'pending'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'bulk'>('list')
  const [bulkTarget, setBulkTarget] = useState<'santri' | 'ortu'>('santri')

  // Reschedule Dialog State (Pindah Sesi Massal)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)

  // 1. Fetch Session Info & Applicants (Real-time polling 5s)
  const { data: sessionsRes, isLoading: loadingSessions, isFetching } = useQuery({
    queryKey: ['selection-sessions', 'interview'],
    queryFn: () => api.apiFetch<{ data: any[] }>('/selection/sessions?type=interview'),
    refetchInterval: 5000,
  })

  const schedulesList = Array.isArray(sessionsRes?.data) ? sessionsRes.data : []
  const session = useMemo(() => {
    return schedulesList.find((s) => s.id === sessionId)
  }, [schedulesList, sessionId])

  const allSchedules = schedulesList

  // 2. Fetch Categories & Criteria for Interview Rubric
  const { data: categories = [] } = useQuery({
    queryKey: ['selection-categories-global'],
    queryFn: async () => {
      const res = await api.apiFetch<any>('/selection/categories')
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  const santriCategory = useMemo(() => {
    return categories.find((c: any) => {
      const n = (c.name || '').toLowerCase()
      return n.includes('santri') || n === 'wawancara'
    })
  }, [categories])

  const ortuCategory = useMemo(() => {
    return categories.find((c: any) => {
      const n = (c.name || '').toLowerCase()
      return n.includes('orang tua') || n.includes('ortu') || n.includes('wali')
    })
  }, [categories])

  const activeBulkCriteria: any[] =
    bulkTarget === 'santri' ? santriCategory?.criteria || [] : ortuCategory?.criteria || []

  // 3. Bulk Grading State: Record<applicant_id, { santriScores: Record<cid, num>, ortuScores: Record<cid, num>, notesSantri: str, notesOrtu: str }>
  const [bulkData, setBulkData] = useState<
    Record<string, { scores: Record<string, number>; notes: string }>
  >({})

  const sessionParticipants: any[] = Array.isArray(session?.participants) ? session.participants : []

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return sessionParticipants.filter((app) => {
      const isComplete = !!app.is_santri_evaluated && !!app.is_ortu_evaluated
      if (statusFilter === 'evaluated' && !isComplete) return false
      if (statusFilter === 'pending' && isComplete) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (app.full_name || '').toLowerCase().includes(q)
        const matchParent = (app.parent_name || '').toLowerCase().includes(q)
        const matchNisn = (app.nisn || '').toLowerCase().includes(q)
        const matchPhone = (app.phone || '').toLowerCase().includes(q)
        return matchName || matchParent || matchNisn || matchPhone
      }
      return true
    })
  }, [sessionParticipants, statusFilter, searchQuery])

  // Bulk Save Mutation
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      const payloadItems: any[] = []

      for (const app of sessionParticipants) {
        const appBulk = bulkData[app.id]
        if (!appBulk) continue

        const scoresEntries = Object.entries(appBulk.scores || {})
        if (scoresEntries.length === 0) continue

        if (!appBulk.notes || !appBulk.notes.trim()) {
          const targetLabel = bulkTarget === 'santri' ? 'Wawancara Santri' : 'Wawancara Orang Tua'
          throw new Error(`Catatan ${targetLabel} untuk "${app.full_name}" wajib diisi sebelum menyimpan nilai!`)
        }

        const tagPrefix = bulkTarget === 'santri' ? '[Wawancara Santri]' : '[Wawancara Ortu]'

        payloadItems.push({
          applicant_id: app.id,
          scores: scoresEntries.map(([criteria_id, score]) => ({
            criteria_id,
            score: Number(score),
          })),
          notes: `${tagPrefix}: ${appBulk.notes.trim()}`,
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
      toast('success', res?.message || 'Nilai Wawancara berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'interview'] })
      setViewMode('list')
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menyimpan nilai massal')
    },
  })

  // Calculate bulk summary
  const totalCount = sessionParticipants.length
  const santriDoneCount = sessionParticipants.filter((a) => a.is_santri_evaluated).length
  const ortuDoneCount = sessionParticipants.filter((a) => a.is_ortu_evaluated).length

  if (loadingSessions && !session) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Memuat data jadwal wawancara...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center p-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Jadwal Wawancara Tidak Ditemukan</h2>
        <p className="max-w-md text-sm text-slate-600">
          Jadwal wawancara mungkin telah dihapus atau tidak berada di periode aktif.
        </p>
        <Button onClick={() => navigate('/admin/jadwal-seleksi/wawancara')} variant="outline">
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
            onClick={() => navigate('/admin/jadwal-seleksi/wawancara')}
            className="h-9 w-9 p-0 rounded-full"
            title="Kembali ke Daftar Jadwal"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl font-bold text-slate-900">{session.name}</h1>
              {session.batch_name && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {session.batch_name}
                </Badge>
              )}
              {session.wave_name && (
                <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300 inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {session.wave_name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ruang Wawancara Terpadu Calon Santri &amp; Orang Tua / Wali
            </p>
          </div>
        </div>

        {/* Header CTAs */}
        <div className="flex items-center gap-2">
          <DocTrigger docKey="ppdb-jadwal-wawancara" variant="light" />
          {isFetching && (
            <span className="text-[11px] text-blue-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Real-time
            </span>
          )}

          {canCrud && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMoveDialogOpen(true)}
                disabled={totalCount === 0}
                className="h-9 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                title="Pindahkan peserta ke jadwal Wawancara lain jika berhalangan"
              >
                <Calendar className="h-3.5 w-3.5" /> Pindah Sesi
              </Button>
              <Button
                variant={viewMode === 'bulk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode((m) => (m === 'bulk' ? 'list' : 'bulk'))}
                className={cn(
                  'h-9 text-xs gap-1.5',
                  viewMode === 'bulk' ? 'bg-blue-700 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-50'
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
            </>
          )}
        </div>
      </div>

      {/* ── Schedule Info Banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Tanggal</span>
            <span className="text-xs font-semibold text-slate-800">
              {formatDateSafe(session.session_date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Waktu</span>
            <span className="text-xs font-semibold text-slate-800">
              {session.start_time || '09:00'} - {session.end_time || '12:00'} WIB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Pewawancara</span>
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
            <span className="text-[11px] text-muted-foreground block">Pelaksanaan</span>
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
          <span className="text-xs text-muted-foreground">Total Peserta</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount} Pasang</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-muted-foreground">Santri Selesai</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {santriDoneCount} / {totalCount} Santri
          </p>
        </Card>
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-muted-foreground">Ortu Selesai</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {ortuDoneCount} / {totalCount} Orang Tua
          </p>
        </Card>
      </div>

      {/* ── MODE 1: LIST VIEW (Penilaian Per Santri & Orang Tua) ── */}
      {viewMode === 'list' && (
        <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Pasangan Calon Santri &amp; Orang Tua</h2>
              <p className="text-xs text-muted-foreground">
                Satu jadwal terpadu. Klik tombol "Nilai Santri" atau "Nilai Orang Tua" untuk mengisi evaluasi masing-masing.
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
                  Semua
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  className="h-7 text-xs px-2.5"
                >
                  Belum
                </Button>
                <Button
                  variant={statusFilter === 'evaluated' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('evaluated')}
                  className="h-7 text-xs px-2.5"
                >
                  Selesai
                </Button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari santri / orang tua..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </div>

          {filteredApplicants.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {sessionParticipants.length === 0
                ? 'Belum ada pendaftar yang terdaftar di jadwal wawancara ini.'
                : 'Tidak ada data yang cocok dengan filter pencarian.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="text-xs font-semibold">Nama Santri</TableHead>
                    <TableHead className="text-xs font-semibold">Ortu/Wali &amp; Kontak</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Santri</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Orang Tua</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplicants.map((app, idx) => {
                    const isSantriEval = !!app.is_santri_evaluated
                    const santriScore = app.santri_score
                    const isOrtuEval = !!app.is_ortu_evaluated
                    const ortuScore = app.ortu_score

                    return (
                      <TableRow
                        key={app.id || idx}
                        onClick={() =>
                          navigate(`/admin/sessions/wawancara/evaluasi/${session.id}?applicant_id=${app.id}`)
                        }
                        className="cursor-pointer hover:bg-blue-50/60 transition-colors group"
                        title="Klik untuk membuka lembar penilaian wawancara"
                      >
                        <TableCell>
                          <div
                            className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 transition-colors max-w-[180px] truncate"
                            title={app.full_name}
                          >
                            {app.full_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="text-xs font-medium text-slate-800 max-w-[180px] truncate"
                            title={app.parent_name || 'Orang Tua/Wali'}
                          >
                            {app.parent_name || 'Orang Tua/Wali'}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 inline-flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5 text-slate-400" /> {app.parent_phone || app.phone || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isSantriEval ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs font-bold gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Sudah ({santriScore ?? '-'})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50 border-slate-200">
                              Belum Dinilai
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isOrtuEval ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Sudah ({ortuScore ?? '-'})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50 border-slate-200">
                              Belum Dinilai
                            </Badge>
                          )}
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
          <div className="p-4 sm:p-5 border-b bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TableProperties className="h-5 w-5 text-blue-700" />
                Lembar Penilaian Wawancara Sekaligus (Bulk Grading)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Pilih target penilaian di bawah.
                <span className="font-semibold text-red-600 ml-1">
                  *Catatan per orang wajib diisi sebelum menyimpan!
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
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-bold"
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

          {/* Switcher Santri vs Ortu */}
          <div className="p-3 bg-slate-50 border-b flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Target Penilaian:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <Button
                variant={bulkTarget === 'santri' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBulkTarget('santri')}
                className="h-7 text-xs px-3 gap-1.5"
              >
                <User className="h-3.5 w-3.5" /> Wawancara Calon Santri
              </Button>
              <Button
                variant={bulkTarget === 'ortu' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBulkTarget('ortu')}
                className="h-7 text-xs px-3 gap-1.5"
              >
                <HeartHandshake className="h-3.5 w-3.5" /> Wawancara Orang Tua/Wali
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[750px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10 text-xs">No</TableHead>
                  <TableHead className="w-48 text-xs">
                    {bulkTarget === 'santri' ? 'Nama Calon Santri' : 'Nama Orang Tua / Wali'}
                  </TableHead>
                  {activeBulkCriteria.map((crit) => (
                    <TableHead key={crit.id} className="text-center text-xs">
                      {crit.name}
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        ({crit.weight}%)
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="w-24 text-center text-xs font-bold text-blue-800">
                    Nilai Akhir
                  </TableHead>
                  <TableHead className="w-64 text-xs font-semibold text-rose-700">
                    Catatan {bulkTarget === 'santri' ? 'Santri' : 'Orang Tua'} <span className="text-red-500">* (Wajib)</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionParticipants.map((app, idx) => {
                  const currentAppBulk = bulkData[app.id] || { scores: {}, notes: '' }
                  const scores = currentAppBulk.scores

                  let totalWeighted = 0
                  let totalWeight = 0
                  activeBulkCriteria.forEach((c) => {
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
                          {bulkTarget === 'santri' ? app.full_name : app.parent_name || 'Orang Tua/Wali'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {bulkTarget === 'santri' ? `Ortu: ${app.parent_name || '-'}` : `Santri: ${app.full_name}`}
                        </span>
                      </TableCell>

                      {activeBulkCriteria.map((crit) => (
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
                                  notes: prev[app.id]?.notes ?? '',
                                },
                              }))
                            }}
                            className="h-8 w-20 text-center text-xs mx-auto font-mono"
                          />
                        </TableCell>
                      ))}

                      <TableCell className="text-center font-mono font-bold text-sm text-blue-700">
                        {computedScore}
                      </TableCell>

                      <TableCell className="p-2">
                        <Input
                          placeholder={`Catatan observasi ${bulkTarget === 'santri' ? 'calon santri' : 'orang tua/wali'}...`}
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

      {/* ── Modal Dialog Pindah Sesi (Reschedule Massal) ── */}
      <MoveSessionDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        sourceSessionId={session.id}
        sourceSessionLabel={`${session.name} (${session.session_date ? formatDateSafe(session.session_date) : '-'} · ${session.start_time || '-'} - ${session.end_time || '-'} WIB)`}
        applicants={sessionParticipants.map((app: any) => ({
          applicant_id: app.id,
          full_name: app.full_name,
          phone: app.phone,
          extra_label: app.parent_name ? `Orang Tua/Wali: ${app.parent_name}` : null,
          status_label:
            !!app.is_santri_evaluated && !!app.is_ortu_evaluated
              ? 'Nilai Lengkap'
              : 'Belum Lengkap',
          moves_disabled: false,
        }))}
        targets={allSchedules
          .filter((s: any) => s.id !== session.id)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            session_date: s.session_date,
            start_time: s.start_time,
            end_time: s.end_time,
            tag: s.batch_name || null,
          }))}
        onMoved={() =>
          queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'interview'] })
        }
      />
    </div>
  )
}
