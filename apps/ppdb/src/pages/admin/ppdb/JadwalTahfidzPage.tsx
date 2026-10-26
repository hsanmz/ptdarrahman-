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
} from '@/components/ui'
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Users,
  Search,
  Pencil,
  Trash2,
  CalendarDays,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  ArrowRight,
  Phone,
  Tag,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function JadwalTahfidzPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCanPage('sessions')

  // Selected Wave Filter
  const [selectedWaveId, setSelectedWaveId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({})

  // Modal States
  const [sessionModal, setSessionModal] = useState<'create' | 'edit' | null>(null)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Reschedule State (Pindah Sesi)
  const [rescheduleApplicant, setRescheduleApplicant] = useState<{ applicant_id: string; full_name: string } | null>(null)
  const [targetSessionId, setTargetSessionId] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')

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
  const schedules: any[] = sessionsRes?.data || []

  // Form State
  const [form, setForm] = useState({
    wave_id: '',
    batch_name: 'Sesi 1',
    name: 'Seleksi Tahfidz Sesi 1',
    session_date: '',
    start_time: '08:00',
    end_time: '12:00',
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
      toast('success', res?.message || 'Jadwal berhasil dipindahkan!')
      setRescheduleApplicant(null)
      setTargetSessionId('')
      setRescheduleReason('')
      queryClient.invalidateQueries({ queryKey: ['selection-sessions', 'tahfidz'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal memindahkan jadwal')
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
      end_time: '12:00',
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
      end_time: s.end_time || '12:00',
      mode: s.mode || 'offline',
      officer_name: s.officer_name || '',
      location: s.location || '',
      meeting_url: s.meeting_url || '',
      description: s.description || '',
    })
    setSessionModal('edit')
  }

  const toggleExpand = (id: string) => {
    setExpandedSchedules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSave = () => {
    if (!form.wave_id) return toast('error', 'Pilih gelombang terlebih dahulu')
    if (!form.name.trim()) return toast('error', 'Nama jadwal wajib diisi')
    if (!form.session_date) return toast('error', 'Tanggal pelaksanaan wajib diisi')
    if (!form.start_time) return toast('error', 'Jam mulai wajib diisi')
    if (!form.officer_name.trim()) return toast('error', 'Nama Penguji Tahfidz wajib diisi')
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
        action={
          canCrud ? (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Buat Jadwal Tahfidz
            </Button>
          ) : undefined
        }
      />

      {/* Wave Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {waves.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Filter Gelombang:
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={selectedWaveId === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedWaveId('')}
                className="h-8 text-xs"
              >
                Semua Gelombang
              </Button>
              {waves.map((w: any) => (
                <Button
                  key={w.id}
                  variant={selectedWaveId === w.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWaveId(w.id)}
                  className="h-8 text-xs"
                >
                  {w.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari jadwal / penguji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
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
                  <Plus className="w-4 h-4 mr-1.5" /> Buat Jadwal Tahfidz
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSchedules.map((s) => {
            const bookedList: any[] = s.booked_applicants || []
            const isExpanded = !!expandedSchedules[s.id]
            const evaluatedCount = s.evaluated_count || 0
            const totalApplicants = bookedList.length

            return (
              <Card
                key={s.id}
                className="border border-border/80 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar Indicator */}
                  <div className="h-1.5 w-full bg-emerald-500" />

                  <CardContent className="p-5 space-y-4">
                    {/* Header: Title, Batch, Mode */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="font-bold text-base text-slate-900 truncate hover:text-emerald-700 cursor-pointer transition-colors"
                            onClick={() => navigate(`/admin/jadwal-seleksi/tahfidz/${s.id}`)}
                            title="Klik untuk buka ruang & input nilai"
                          >
                            {s.name}
                          </h3>
                          {s.batch_name && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              {s.batch_name}
                            </Badge>
                          )}
                          {s.wave_name && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 inline-flex items-center gap-1"
                            >
                              <Tag className="h-2.5 w-2.5 shrink-0" />
                              {s.wave_name}
                            </Badge>
                          )}
                        </div>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {s.description}
                          </p>
                        )}
                      </div>

                      <Badge
                        variant={s.mode === 'online' ? 'secondary' : 'outline'}
                        className={cn(
                          'text-xs font-semibold shrink-0 gap-1',
                          s.mode === 'online'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {s.mode === 'online' ? (
                          <>
                            <Video className="w-3 h-3 text-blue-600" /> Online (Zoom)
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3 text-emerald-600" /> Offline
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {s.session_date
                            ? new Date(s.session_date).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {s.start_time || '08:00'} - {s.end_time || '12:00'} WIB
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">
                          Penguji: {s.officer_name || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        {s.mode === 'online' ? (
                          <>
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {s.meeting_url ? (
                              <a
                                href={s.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline truncate"
                              >
                                {s.meeting_url}
                              </a>
                            ) : (
                              <span>Link belum disetel</span>
                            )}
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{s.location || 'Kampus PTDARRAHMAN'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Participants Summary Header */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-800">
                          {totalApplicants} Peserta Terdaftar
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({evaluatedCount} dinilai)
                        </span>
                      </div>

                      {totalApplicants > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1"
                          onClick={() => toggleExpand(s.id)}
                        >
                          {isExpanded ? (
                            <>
                              Sembunyikan Peserta <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Lihat {totalApplicants} Peserta <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Expandable Participant List */}
                    {isExpanded && totalApplicants > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                        {bookedList.map((app: any, idx: number) => (
                          <div
                            key={app.id || idx}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-900 truncate">
                                  {app.full_name}
                                </span>
                                {app.nisn && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    NISN: {app.nisn}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                {app.phone && (
                                  <span className="inline-flex items-center gap-1 font-mono">
                                    <Phone className="w-2.5 h-2.5" /> {app.phone}
                                  </span>
                                )}
                                {app.notes && (
                                  <span className="truncate max-w-[200px] text-slate-400">
                                    • {app.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {canCrud && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  onClick={() => {
                                    setRescheduleApplicant({
                                      applicant_id: app.id,
                                      full_name: app.full_name,
                                    })
                                    setTargetSessionId('')
                                    setRescheduleReason('')
                                  }}
                                >
                                  Pindah Sesi
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                onClick={() =>
                                  navigate(
                                    `/admin/sessions/tahfidz/evaluasi/${s.id}?applicant_id=${app.id}`
                                  )
                                }
                              >
                                <Award className="w-3 h-3" />
                                Form Nilai
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[11px] text-muted-foreground">
                    Dibuat {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                      onClick={() => navigate(`/admin/jadwal-seleksi/tahfidz/${s.id}`)}
                    >
                      <span>Buka Ruang & Nilai</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>

                    {canCrud && (
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Jadwal"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteId(s.id)}
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {sessionModal === 'create'
                ? 'Buat Jadwal Seleksi Tahfidz'
                : 'Edit Jadwal Seleksi Tahfidz'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tentukan jadwal ujian seleksi hafalan Al-Qur'an untuk pendaftar pada gelombang ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  Jam Mulai <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jam Selesai <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Penguji Tahfidz */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Penguji Tahfidz <span className="text-red-500">*</span>
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

          <DialogFooter className="flex justify-end gap-2">
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
                'Simpan Jadwal Tahfidz'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Dialog Pindah Sesi (Reschedule Peserta) ── */}
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
                {schedules.map((s: any) => (
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
                placeholder="Contoh: Peserta berhalangan hadir pada tanggal sesi sebelumnya karena sakit..."
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Memindahkan...
                </>
              ) : (
                'Konfirmasi Pindah Sesi'
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
