import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import { useCanPage } from '@/hooks/useCan'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ConfirmDialog,
  Textarea,
  EmptyState,
  Label,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui'
import {
  BookOpen,
  Plus,
  Calendar,
  MapPin,
  Video,
  User,
  Search,
  Pencil,
  Trash2,
  CalendarDays,
  ExternalLink,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const formatDateSafe = (d?: any, opts?: Intl.DateTimeFormatOptions) => {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString('id-ID', opts || {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

export default function JadwalTahfidzPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCanPage('sessions')

  // View Mode: 'card' vs 'list'
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // Selected Wave Filter
  const [selectedWaveId, setSelectedWaveId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal States
  const [sessionModal, setSessionModal] = useState<'create' | 'edit' | null>(null)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Periods & Waves Query
  const { data: periodsRes } = useQuery({
    queryKey: ['periods-active'],
    queryFn: () => ppdbService.getPeriods({ perPage: 20 }),
  })
  const activePeriod =
    periodsRes?.data?.find((p: any) => p.status === 'active' || p.is_active) ||
    periodsRes?.data?.[0]
  const waves: any[] = activePeriod?.waves || []

  // Tahfidz Schedules Query
  const { data: sessionsRes, isLoading } = useQuery({
    queryKey: ['selection-sessions', 'tahfidz'],
    queryFn: () => api.apiFetch<{ data: any[] }>('/selection/sessions?type=tahfidz'),
  })
  const schedules: any[] = Array.isArray(sessionsRes?.data)
    ? sessionsRes.data
    : Array.isArray(sessionsRes)
      ? sessionsRes
      : []

  // Form State
  const [form, setForm] = useState({
    wave_id: '',
    batch_name: 'Sesi 1',
    name: 'Seleksi Tahfidz Sesi 1',
    session_date: '',
    start_time: '08:00',
    end_time: 'Selesai',
    mode: 'offline' as 'offline' | 'online',
    officer_name: '',
    location: 'Kampus PTDARRAHMAN',
    meeting_url: '',
    description: '',
  })

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedWaveId && s.wave_id !== selectedWaveId) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (s.name || '').toLowerCase().includes(q)
        const matchOfficer = (s.officer_name || '').toLowerCase().includes(q)
        const matchBatch = (s.batch_name || '').toLowerCase().includes(q)
        const matchLocation = (s.location || '').toLowerCase().includes(q)
        return matchName || matchOfficer || matchBatch || matchLocation
      }
      return true
    })
  }, [schedules, selectedWaveId, searchQuery])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        end_time: 'Selesai',
        session_type: 'tahfidz',
        quota: 0, // Massal / global gelombang
      }
      if (sessionModal === 'create') {
        return await api.apiFetch('/selection/sessions', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } else {
        return await api.apiFetch(`/selection/sessions/${selectedSession.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      }
    },
    onSuccess: (res: any) => {
      toast('success', res?.message || 'Jadwal Seleksi Tahfidz berhasil disimpan!')
      setSessionModal(null)
      queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'tahfidz'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menyimpan jadwal')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.apiFetch(`/selection/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('success', 'Jadwal Seleksi Tahfidz berhasil dihapus')
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'tahfidz'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menghapus jadwal')
    },
  })

  // Handlers
  const handleOpenCreate = () => {
    setSelectedSession(null)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const defaultDate = tomorrow.toISOString().split('T')[0]
    setForm({
      wave_id: selectedWaveId || waves[0]?.id || '',
      batch_name: 'Sesi 1',
      name: 'Seleksi Tahfidz Sesi 1',
      session_date: defaultDate,
      start_time: '08:00',
      end_time: 'Selesai',
      mode: 'offline',
      officer_name: '',
      location: 'Kampus PTDARRAHMAN',
      meeting_url: '',
      description: '',
    })
    setSessionModal('create')
  }

  const handleOpenEdit = (s: any) => {
    setSelectedSession(s)
    setForm({
      wave_id: s.wave_id || waves[0]?.id || '',
      batch_name: s.batch_name || 'Sesi 1',
      name: s.name || '',
      session_date: s.session_date ? s.session_date.split('T')[0] : '',
      start_time: s.start_time || '08:00',
      end_time: 'Selesai',
      mode: s.mode || 'offline',
      officer_name: s.officer_name || '',
      location: s.location || '',
      meeting_url: s.meeting_url || '',
      description: s.description || '',
    })
    setSessionModal('edit')
  }

  const handleSave = () => {
    if (!form.wave_id) return toast('error', 'Pilih gelombang terlebih dahulu')
    if (!form.name.trim()) return toast('error', 'Nama jadwal wajib diisi')
    if (!form.session_date) return toast('error', 'Tanggal pelaksanaan wajib diisi')
    if (!form.start_time) return toast('error', 'Jam mulai wajib diisi')
    if (form.mode === 'online' && !form.meeting_url.trim()) {
      return toast('error', 'Tautan Zoom/Meet wajib diisi untuk mode online')
    }
    if (form.mode === 'offline' && !form.location.trim()) {
      return toast('error', 'Ruangan/Lokasi wajib diisi untuk mode offline')
    }
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Seleksi Tahfidz"
        description="Jadwal pelaksanaan ujian seleksi Tahfidz Qur'an per gelombang & batch untuk seluruh pendaftar. Klik tombol form nilai untuk mulai menginput skor peserta."
        docKey="ppdb-jadwal-tahfidz"
        action={
          canCrud ? (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Buat Jadwal Seleksi
            </Button>
          ) : undefined
        }
      />

      {/* Wave Filter & Search / View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {waves.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Filter Gelombang:
            </Label>
            <select
              value={selectedWaveId}
              onChange={(e) => setSelectedWaveId(e.target.value)}
              className="h-8 min-w-[190px] max-w-[240px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Gelombang</option>
              {waves.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              type="button"
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2.5 text-xs',
                viewMode === 'card'
                  ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              onClick={() => setViewMode('card')}
              title="Tampilan Card"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1 text-slate-700" />
              Card
            </Button>
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2.5 text-xs',
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              onClick={() => setViewMode('list')}
              title="Tampilan Tabel"
            >
              <List className="h-3.5 w-3.5 mr-1 text-slate-700" />
              List
            </Button>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari jadwal / penguji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Schedules List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted/40" />
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={CalendarDays}
            title="Belum Ada Jadwal Seleksi Tahfidz"
            description="Buat jadwal sesi seleksi Tahfidz baru untuk gelombang pendaftaran yang sedang berjalan."
            action={
              canCrud ? (
                <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" /> Buat Jadwal Seleksi
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="text-xs font-semibold">Jadwal Sesi</TableHead>
                  <TableHead className="text-xs font-semibold">Kloter / Batch</TableHead>
                  <TableHead className="text-xs font-semibold">Gelombang</TableHead>
                  <TableHead className="text-xs font-semibold">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold">Penguji</TableHead>
                  <TableHead className="text-xs font-semibold">Pelaksanaan</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Peserta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((s) => {
                  const sessionParticipants: any[] = s.participants || []
                  const evaluatedCount = s.evaluated_count || 0
                  const totalApplicants = sessionParticipants.length

                  return (
                    <TableRow
                      key={s.id}
                      onClick={() => navigate(`/admin/jadwal-seleksi/tahfidz/${s.id}`)}
                      className="cursor-pointer hover:bg-emerald-50/60 transition-colors group"
                      title="Klik untuk membuka ruang seleksi tahfidz"
                    >
                      <TableCell>
                        <div
                          className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors max-w-[180px] truncate"
                          title={s.name}
                        >
                          {s.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 max-w-[110px]"
                          title={s.batch_name || '-'}
                        >
                          <span className="truncate">{s.batch_name || '-'}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 max-w-[120px]"
                          title={s.wave_name || '-'}
                        >
                          <span className="truncate">{s.wave_name || '-'}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-800 font-medium whitespace-nowrap">
                          {formatDateSafe(s.session_date)}
                          <span className="text-[11px] text-muted-foreground font-mono ml-1.5">
                            {s.start_time || '08:00'} WIB
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="text-xs text-slate-800 font-medium max-w-[120px] truncate"
                          title={s.officer_name || '-'}
                        >
                          {s.officer_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 max-w-[140px] whitespace-nowrap text-[11px] font-medium text-slate-800">
                          {s.mode === 'online' ? (
                            <Video className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                          ) : (
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                          )}
                          <span
                            className="truncate"
                            title={s.mode === 'online' ? 'Online' : s.location || 'Offline'}
                          >
                            {s.mode === 'online' ? 'Online' : s.location || 'Offline'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {totalApplicants}
                          <span className="text-[11px] text-muted-foreground font-mono ml-1">
                            ({evaluatedCount} dinilai)
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.map((s) => {
            const sessionParticipants: any[] = s.participants || []
            const evaluatedCount = s.evaluated_count || 0
            const totalApplicants = sessionParticipants.length

            return (
              <Card
                key={s.id}
                onClick={() => navigate(`/admin/jadwal-seleksi/tahfidz/${s.id}`)}
                className="border border-border/80 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Bar Indicator */}
                  <div className="h-1.5 w-full bg-emerald-500" />

                  <CardContent className="p-5 space-y-4">
                    {/* Header: Badges, Title, Aksi */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200 max-w-[140px] min-w-0"
                          >
                            <span className="truncate">{s.wave_name || 'Gelombang'}</span>
                          </Badge>
                          {s.batch_name && (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-purple-50 text-purple-700 border-purple-200 max-w-[110px] min-w-0"
                            >
                              <span className="truncate">{s.batch_name}</span>
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[11px]',
                              s.mode === 'online'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                          >
                            {s.mode === 'online' ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                        <h3
                          className="font-bold text-base text-foreground group-hover:text-emerald-700 transition-colors line-clamp-1 mt-1"
                          title={s.name}
                        >
                          {s.name}
                        </h3>
                      </div>

                      {canCrud && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEdit(s)
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50"
                            title="Edit Jadwal"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(s.id)
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Detail Pelaksanaan */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium truncate">
                          {formatDateSafe(s.session_date)} ({s.start_time || '08:00'} WIB - Selesai)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.mode === 'online' ? (
                          <Video className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {s.mode === 'online' ? (
                          s.meeting_url ? (
                            <a
                              href={s.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline truncate max-w-[220px]"
                              title={s.meeting_url}
                            >
                              {s.meeting_url}
                            </a>
                          ) : (
                            <span className="truncate">Tautan Zoom/Meet</span>
                          )
                        ) : (
                          <span className="truncate max-w-[220px]" title={s.location || 'Kampus PTDARRAHMAN'}>
                            {s.location || 'Kampus PTDARRAHMAN'}
                          </span>
                        )}
                      </div>

                      {s.officer_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-500 shrink-0" />
                          <span className="truncate" title={s.officer_name}>
                            Penguji: {s.officer_name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">
                          Peserta: <strong className="text-foreground">{totalApplicants} Orang</strong>
                        </span>
                        <span className="text-[10px] text-muted-foreground">{evaluatedCount} dinilai</span>
                      </div>
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                        Buka Ruang &amp; Nilai <ExternalLink className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Modal Tambah / Edit Jadwal Tahfidz ── */}
      <Dialog
        open={sessionModal !== null}
        onOpenChange={(open) => !open && setSessionModal(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pr-16 border-b bg-slate-50/60 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {sessionModal === 'create'
                ? 'Buat Jadwal Seleksi (Tahfidz)'
                : 'Edit Jadwal Seleksi (Tahfidz)'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tentukan jadwal ujian seleksi hafalan Al-Qur'an untuk pendaftar pada gelombang ini.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {/* Gelombang */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Gelombang PPDB <span className="text-red-500">*</span>
              </Label>
              <select
                value={form.wave_id}
                onChange={(e) => setForm({ ...form, wave_id: e.target.value })}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Gelombang --</option>
                {waves.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nama Sesi & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Jadwal <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Seleksi Tahfidz Gelombang 1 - Sesi 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kloter / Batch
                </Label>
                <Input
                  placeholder="Sesi 1"
                  value={form.batch_name}
                  onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Tanggal & Waktu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tanggal Pelaksanaan <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jam Mulai (WIB) <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="text-xs h-9"
                  />
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    s/d Selesai
                  </span>
                </div>
              </div>
            </div>

            {/* Penguji Tahfidz */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Penguji / Pengawas (Opsional)
              </Label>
              <Input
                placeholder="Contoh: Ustadz M. Farhan, Al-Hafidz"
                value={form.officer_name}
                onChange={(e) => setForm({ ...form, officer_name: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            {/* Mode: Offline vs Online */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Mode Ujian <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={form.mode === 'offline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, mode: 'offline' })}
                  className={cn(
                    'h-9 text-xs gap-1.5',
                    form.mode === 'offline'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : ''
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" /> Offline (Tatap Muka)
                </Button>
                <Button
                  type="button"
                  variant={form.mode === 'online' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, mode: 'online' })}
                  className={cn(
                    'h-9 text-xs gap-1.5',
                    form.mode === 'online'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : ''
                  )}
                >
                  <Video className="w-3.5 h-3.5" /> Online (Zoom / Meet)
                </Button>
              </div>
            </div>

            {form.mode === 'offline' ? (
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ruangan / Lokasi Ujian <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Ruang Ujian Tahfidz Lt. 2 - Kampus PTDARRAHMAN"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tautan Zoom / Google Meet <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="https://zoom.us/j/..."
                  value={form.meeting_url}
                  onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            )}

            {/* Keterangan */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Keterangan / Panduan Tambahan (Opsional)
              </Label>
              <Textarea
                placeholder="Contoh: Peserta wajib membawa mushaf Al-Qur'an dan hadir 15 menit sebelum ujian..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50/60 shrink-0 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionModal(null)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Jadwal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Konfirmasi Hapus Jadwal ── */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Hapus Jadwal Seleksi Tahfidz"
        message="Apakah Anda yakin ingin menghapus jadwal seleksi Tahfidz ini? Seluruh data sesi dan penugasan peserta di sesi ini akan dibatalkan."
        confirmLabel="Hapus Jadwal"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
