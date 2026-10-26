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
  DialogFooter,
  ConfirmDialog,
  EmptyState,
  Badge,
} from '@/components/ui'
import {
  Plus,
  Calendar,
  Users,
  MapPin,
  Video,
  KeyRound,
  Trash2,
  CalendarDays,
  ExternalLink,
} from 'lucide-react'

interface JadwalUjianPageProps {
  category: 'akademik' | 'psikologi'
  title: string
}

export default function JadwalUjianPage({ category, title }: JadwalUjianPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Periods & Waves Query
  const { data: periodsRes } = useQuery({
    queryKey: ['periods-active'],
    queryFn: () => ppdbService.getPeriods({ perPage: 10 }),
  })
  const activePeriod =
    periodsRes?.data?.find((p: any) => p.status === 'active' || p.is_active) ||
    periodsRes?.data?.[0]
  const waves = activePeriod?.waves || []

  // Selected Wave Filter
  const [selectedWaveId, setSelectedWaveId] = useState<string>('')

  // Schedules Query
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['cbt-schedules', category, selectedWaveId],
    queryFn: () => cbtService.getSchedules(category, selectedWaveId || undefined),
  })

  // Available Banks for creation
  const { data: banks = [] } = useQuery({
    queryKey: ['cbt-banks-for-schedule', category],
    queryFn: () => cbtService.getBanks(category),
  })

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [waveId, setWaveId] = useState('')
  const [bankId, setBankId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [batchName, setBatchName] = useState('Sesi 1')
  const [sessionDate, setSessionDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('10:00')
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
    setWaveId(waves[0]?.id || '')
    setBankId(banks[0]?.id || '')
    setSessionName('')
    setBatchName('Sesi 1')
    setSessionDate('')
    setStartTime('08:00')
    setEndTime('10:00')
    setOfficerName('')
    setMode('offline')
    setLocation('')
    setMeetingUrl('')
    setNotes('')
  }

  const handleOpenCreate = () => {
    resetForm()
    if (waves.length > 0) setWaveId(waves[0].id)
    if (banks.length > 0) setBankId(banks[0].id)
    setShowCreateModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!waveId) {
      toast('error', 'Pilih gelombang terlebih dahulu.')
      return
    }
    if (!bankId) {
      toast('error', 'Pilih Bank Soal terlebih dahulu. Jika belum ada, buat di menu Bank Soal.')
      return
    }
    if (!sessionName.trim() || !sessionDate) {
      toast('error', 'Nama Sesi dan Tanggal Pelaksanaan wajib diisi.')
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
      end_time: endTime,
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

      {/* Wave Filter */}
      {waves.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-muted-foreground">Filter Gelombang:</Label>
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

      {/* Schedule Cards */}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schedules.map((s) => (
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
                      <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200">
                        {s.wave_name || 'Gelombang'}
                      </Badge>
                      {s.batch_name && (
                        <Badge variant="outline" className="text-[11px] bg-purple-50 text-purple-700 border-purple-200">
                          {s.batch_name}
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
                    <h3 className="font-bold text-base text-foreground group-hover:text-emerald-700 transition-colors line-clamp-1 mt-1">
                      {s.name}
                    </h3>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteScheduleId(s.id)
                    }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      {s.session_date} ({s.start_time} - {s.end_time} WIB)
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
                    Peserta Berkas: <strong className="text-foreground">{s.total_eligible} Orang</strong>
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
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-emerald-600" />
              Buat Jadwal Seleksi ({category === 'akademik' ? 'Tes Akademik' : 'Tes Psikologi'})
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Gelombang *</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={waveId}
                  onChange={(e) => setWaveId(e.target.value)}
                  required
                >
                  {waves.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Bank Soal *</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  required
                >
                  {banks.length === 0 ? (
                    <option value="">Belum ada Bank Soal (Buat dulu)</option>
                  ) : (
                    banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.duration_minutes} Menit)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Selesai (WIB) *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
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

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={createMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || banks.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal'}
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
