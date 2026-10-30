import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cbtService, type ScheduleItem } from '@/services/cbtService'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ConfirmDialog,
  EmptyState,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui'
import {
  Plus,
  Calendar,
  Users,
  MapPin,
  Video,
  KeyRound,
  Search,
  Trash2,
  Pencil,
  CalendarDays,
  ExternalLink,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JadwalUjianPageProps {
  category: 'akademik' | 'psikologi'
  title: string
}

export default function JadwalUjianPage({ category, title }: JadwalUjianPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // View Mode: 'card' vs 'list'
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // Client-side search
  const [searchQuery, setSearchQuery] = useState('')

  // Periods & Waves Query
  const { data: periodsRes } = useQuery({
    queryKey: ['periods-active'],
    queryFn: () => ppdbService.getPeriods({ perPage: 20 }),
  })
  const activePeriod =
    periodsRes?.data?.find((p: any) => p.status === 'active' || p.is_active) ||
    periodsRes?.data?.[0]
  const waves = activePeriod?.waves || []

  // Selected Wave Filter
  const [selectedWaveId, setSelectedWaveId] = useState<string>('')

  // Schedules Query
  const { data: rawSchedules = [], isLoading } = useQuery({
    queryKey: ['cbt-schedules', category, selectedWaveId],
    queryFn: () => cbtService.getSchedules(category, selectedWaveId || undefined),
  })
  const schedules = Array.isArray(rawSchedules) ? rawSchedules : []

  const filteredSchedules = schedules.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return [s.name, s.batch_name, s.wave_name, s.officer_name, s.location, s.meeting_url, s.access_token]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  })

  // Available Banks for creation
  const { data: rawBanks = [] } = useQuery({
    queryKey: ['cbt-banks-for-schedule', category],
    queryFn: () => cbtService.getBanks(category),
  })
  const banks = Array.isArray(rawBanks) ? rawBanks : []

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [waveId, setWaveId] = useState('')
  const [bankId, setBankId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [batchName, setBatchName] = useState('Sesi 1')
  const [sessionDate, setSessionDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [officerName, setOfficerName] = useState('')
  const [mode, setMode] = useState<'offline' | 'online'>('offline')
  const [location, setLocation] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Delete State
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => cbtService.createSchedule(payload),
    onSuccess: () => {
      toast('success', 'Jadwal Seleksi berhasil dibuat!')
      setShowCreateModal(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['cbt-schedules', category] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal membuat Jadwal Seleksi.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      cbtService.updateSchedule(id, payload),
    onSuccess: () => {
      toast('success', 'Jadwal Seleksi berhasil diperbarui!')
      setShowCreateModal(false)
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['cbt-schedules', category] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal memperbarui Jadwal Seleksi.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cbtService.deleteSchedule(id),
    onSuccess: () => {
      toast('success', 'Jadwal Seleksi berhasil dihapus.')
      setDeleteScheduleId(null)
      queryClient.invalidateQueries({ queryKey: ['cbt-schedules', category] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menghapus Jadwal Seleksi.')
    },
  })

  const resetForm = () => {
    setWaveId(selectedWaveId || waves[0]?.id || '')
    setBankId(banks[0]?.id || '')
    setSessionName('')
    setBatchName('Sesi 1')
    setSessionDate('')
    setStartTime('08:00')
    setOfficerName('')
    setMode('offline')
    setLocation('')
    setMeetingUrl('')
    setNotes('')
  }

  const handleOpenCreate = () => {
    resetForm()
    setEditingId(null)
    if (waves.length > 0) setWaveId(selectedWaveId || waves[0].id)
    setShowCreateModal(true)
  }

  const handleOpenEdit = (schedule: ScheduleItem) => {
    setEditingId(schedule.id)
    setWaveId(schedule.wave_id || '')
    setBankId(schedule.bank_id || '')
    setSessionName(schedule.name || '')
    setBatchName(schedule.batch_name || '')
    setSessionDate(schedule.session_date ? String(schedule.session_date).split('T')[0] : '')
    setStartTime(schedule.start_time || '08:00')
    setOfficerName(schedule.officer_name || '')
    setMode(schedule.mode || 'offline')
    setLocation(schedule.location || '')
    setMeetingUrl(schedule.meeting_url || '')
    setNotes(schedule.notes || '')
    setShowCreateModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!waveId) {
      toast('error', 'Pilih gelombang terlebih dahulu.')
      return
    }
    if (!sessionName.trim() || !sessionDate) {
      toast('error', 'Nama Sesi dan Tanggal Pelaksanaan wajib diisi.')
      return
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        payload: {
          name: sessionName.trim(),
          batch_name: batchName.trim() || null,
          session_date: sessionDate,
          start_time: startTime,
          end_time: 'Selesai',
          officer_name: officerName.trim() || null,
          mode,
          location: mode === 'offline' ? (location.trim() || null) : null,
          meeting_url: mode === 'online' ? (meetingUrl.trim() || null) : null,
          notes: notes.trim() || null,
        },
      })
      return
    }

    if (!bankId) {
      toast('error', 'Belum ada Bank Soal. Buat bank soal kategori ini di menu Bank Soal terlebih dahulu.')
      return
    }

    createMutation.mutate({
      wave_id: waveId,
      bank_id: bankId,
      category,
      name: sessionName.trim(),
      batch_name: batchName.trim() || null,
      session_date: sessionDate,
      start_time: startTime,
      end_time: 'Selesai',
      officer_name: officerName.trim() || null,
      mode,
      location: mode === 'offline' ? (location.trim() || null) : null,
      meeting_url: mode === 'online' ? (meetingUrl.trim() || null) : null,
      notes: notes.trim() || null,
    })
  }

  const handleCardClick = (sched: ScheduleItem) => {
    navigate(`/admin/monitoring/${category}/${sched.id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title={title}
        description={`Jadwal ujian seleksi tertulis massal untuk gelombang aktif. Klik pada kartu jadwal untuk masuk ke Halaman Pemantauan Ujian (Monitoring Room).`}
        docKey="ppdb-jadwal-cbt"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Buat Jadwal Seleksi
            </Button>
          </div>
        }
      />

      {/* Wave Filter & View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {waves.length > 0 ? (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Filter Gelombang:</Label>
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
        ) : <div />}

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
              placeholder="Cari nama, kloter, pengawas, atau PIN"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Schedule Cards / Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted/40" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={CalendarDays}
            title={`Belum ada ${title}`}
            description="Buat jadwal sesi ujian baru untuk gelombang pendaftaran yang sedang berjalan."
            action={
              <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" /> Buat Jadwal Sekarang
              </Button>
            }
          />
        </Card>
      ) : filteredSchedules.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Search}
            title="Tidak ada jadwal yang cocok"
            description={`Pencarian "${searchQuery.trim()}" tidak menemukan jadwal apa pun. Coba kata kunci lain.`}
            action={
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Reset Pencarian
              </Button>
            }
          />
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="text-xs font-semibold">Jadwal Sesi</TableHead>
                  <TableHead className="text-xs font-semibold">Kloter / Batch</TableHead>
                  <TableHead className="text-xs font-semibold">Gelombang</TableHead>
                  <TableHead className="text-xs font-semibold">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold">Pelaksanaan</TableHead>
                  <TableHead className="text-xs font-semibold">Pengawas</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Peserta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((s) => (
                  <TableRow
                    key={s.id}
                    onClick={() => handleCardClick(s)}
                    className="cursor-pointer hover:bg-emerald-50/60 transition-colors group"
                    title="Klik untuk membuka pemantauan ujian live"
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
                        className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200 max-w-[110px]"
                        title={s.batch_name || '-'}
                      >
                        <span className="truncate">{s.batch_name || '-'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 max-w-[120px]"
                        title={s.wave_name || '-'}
                      >
                        <span className="truncate">{s.wave_name || '-'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-800 font-medium whitespace-nowrap">
                        {s.session_date}
                        <span className="text-[11px] text-muted-foreground font-mono ml-1.5">
                          {s.start_time || '08:00'} WIB
                        </span>
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
                    <TableCell>
                      <div
                        className="text-xs text-slate-800 font-medium max-w-[120px] truncate"
                        title={s.officer_name || '-'}
                      >
                        {s.officer_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-semibold text-slate-800">
                        {s.total_eligible || 0}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        Orang
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.map((s) => (
            <Card
              key={s.id}
              onClick={() => handleCardClick(s)}
              className="group cursor-pointer border border-border/80 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden relative"
            >
              <div className="h-1.5 w-full bg-emerald-500 group-hover:h-2 transition-all" />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
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
                        className={`text-[11px] ${
                          s.mode === 'online'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
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
                        setDeleteScheduleId(s.id)
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      title="Hapus Jadwal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">
                      {s.session_date} ({s.start_time} WIB - Selesai)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.mode === 'online' ? (
                      <Video className="w-4 h-4 text-blue-500 shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="line-clamp-1">
                      {s.mode === 'online'
                        ? s.meeting_url || 'Tautan Zoom/Meet'
                        : s.location || 'Lokasi Kampus PTDARRAHMAN'}
                    </span>
                  </div>

                  {s.officer_name && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Pengawas: {s.officer_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>PIN Akses: <strong className="text-emerald-700 font-mono tracking-wider">{s.access_token}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                  <span className="text-muted-foreground">
                    Peserta: <strong className="text-foreground">{s.total_eligible} Orang</strong>
                  </span>
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    Buka Pemantauan <ExternalLink className="w-3 h-3 ml-1" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Buat Jadwal Seleksi */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) setEditingId(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pr-16 border-b bg-slate-50/60 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Plus className="w-5 h-5 text-emerald-600" />
              {editingId ? 'Edit' : 'Buat'} Jadwal Seleksi ({category === 'akademik' ? 'Tes Akademik' : 'Tes Psikologi'})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingId
                ? 'Perbarui jadwal, waktu, pengawas, atau lokasi pelaksanaan ujian. Bank soal dan gelombang tidak dapat diubah dari sini.'
                : 'Atur pengerjaan ujian massal untuk pendaftar pada gelombang, lengkap dengan PIN akses ujian.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Sumber Soal: Pilih Bank Soal */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Bank Soal *</Label>
                {banks.length > 0 ? (
                  <>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                      value={bankId}
                      onChange={(e) => setBankId(e.target.value)}
                      disabled={!!editingId}
                      required
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} ({b.total_questions} soal, {b.duration_minutes} menit)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Butir soal peserta diambil dari bank soal yang dipilih.
                    </p>
                  </>
                ) : (
                  <>
                    <select className="w-full h-9 rounded-md border border-input bg-muted px-3 py-1 text-xs" disabled>
                      <option>Belum ada Bank Soal tersedia</option>
                    </select>
                    <p className="text-[11px] text-red-600">
                      Belum ada bank soal kategori ini. Buat dulu di menu Bank Soal sebelum membuat jadwal.
                    </p>
                  </>
                )}
              </div>

              {/* Gelombang */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Gelombang *</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                  value={waveId}
                  onChange={(e) => setWaveId(e.target.value)}
                  disabled={!!editingId}
                  required
                >
                  {waves.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Sesi Ujian & Kloter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nama Sesi Ujian *</Label>
                  <Input
                    placeholder="Contoh: Tes Akademik Gelombang 1"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kloter / Sesi (Batch)</Label>
                  <Input
                    placeholder="Contoh: Sesi 1 / Kloter Pagi"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                </div>
              </div>

              {/* Tanggal & Jam Mulai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tanggal Pelaksanaan *</Label>
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Jam Mulai (WIB) *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                      s/d Selesai
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nama Penguji / Pengawas (Opsional)</Label>
                <Input
                  placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd."
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mode Pelaksanaan *</Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="exam-mode"
                      checked={mode === 'offline'}
                      onChange={() => setMode('offline')}
                      className="accent-emerald-600"
                    />
                    <span>Tatap Muka (Offline)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="exam-mode"
                      checked={mode === 'online'}
                      onChange={() => setMode('online')}
                      className="accent-emerald-600"
                    />
                    <span>Daring (Online)</span>
                  </label>
                </div>
              </div>

              {mode === 'offline' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lokasi / Gedung / Ruangan / URL Sharelok</Label>
                  <Input
                    placeholder="Contoh: Gedung Tahfidz Lt. 2 Ruang 201 atau tautan Google Maps"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tautan Zoom / Google Meet</Label>
                  <Input
                    placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catatan Khusus (Opsional)</Label>
                <Input
                  placeholder="Contoh: Harap membawa laptop/gadget dengan baterai penuh."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-slate-50/60 shrink-0 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Menyimpan...'
                  : editingId
                    ? 'Simpan Perubahan'
                    : 'Simpan Jadwal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteScheduleId}
        onClose={() => setDeleteScheduleId(null)}
        title="Hapus Jadwal Seleksi?"
        message="Jadwal seleksi ini akan dihapus. Peserta tidak akan dapat mengakses sesi seleksi ini lagi."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        onConfirm={() => deleteScheduleId && deleteMutation.mutate(deleteScheduleId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
