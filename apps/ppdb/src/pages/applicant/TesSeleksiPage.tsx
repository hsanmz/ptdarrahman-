import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { cbtService } from '@/services/cbtService'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Skeleton,
} from '@/components/ui'
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
  User,
  BookOpen,
  Brain,
  Award,
  PlayCircle,
  CalendarPlus,
  Sparkles,
} from 'lucide-react'

export default function TesSeleksiPage() {
  const navigate = useNavigate()

  // 1. Transaction / Applicant Data
  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  // 2. Selection Data (Sessions & Results)
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
  })

  const applicant = transactionQuery.data?.applicant
  const waveId = applicant?.wave_id

  // 3. CBT Schedules for wave
  const cbtAkademikQuery = useQuery({
    queryKey: ['cbt-schedules-akademik', waveId],
    queryFn: () => cbtService.getSchedules('akademik', waveId),
    enabled: Boolean(waveId),
  })

  const cbtPsikologiQuery = useQuery({
    queryKey: ['cbt-schedules-psikologi', waveId],
    queryFn: () => cbtService.getSchedules('psikologi', waveId),
    enabled: Boolean(waveId),
  })

  const isLoading =
    transactionQuery.isLoading ||
    selectionQuery.isLoading ||
    cbtAkademikQuery.isLoading ||
    cbtPsikologiQuery.isLoading

  const sessionData = selectionQuery.data?.sessionData
  const selectionResult = selectionQuery.data?.result

  const tahfidzSession = sessionData?.tahfidz_session || null
  const akademikSchedule = cbtAkademikQuery.data?.[0] || null
  const psikologiSchedule = cbtPsikologiQuery.data?.[0] || null

  // Scores
  const cbtResults = selectionResult?.cbt_results || {}
  const akademikAttempt = cbtResults['akademik']
  const psikologiAttempt = cbtResults['psikologi']

  const tahfidzScores = (selectionResult?.scores || []).filter((s: any) => {
    const cat = (s.category_name || '').toLowerCase()
    const crit = (s.criteria_name || '').toLowerCase()
    return (
      cat.includes('tahfidz') ||
      crit.includes('tahfidz') ||
      cat.includes('quran') ||
      cat.includes("qur'an")
    )
  })

  const tahfidzAvg =
    tahfidzScores.length > 0
      ? (
          tahfidzScores.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) /
          tahfidzScores.length
        ).toFixed(1)
      : selectionResult?.tahfidz_score ?? null

  const getCalendarLink = (item: any, titlePrefix: string) => {
    if (!item || !item.session_date) return '#'
    const dateStr = String(item.session_date).split('T')[0].replace(/-/g, '')
    const startTime = (item.start_time || '08:00').replace(':', '')
    const startHour = parseInt((item.start_time || '08:00').split(':')[0] || '8', 10)
    const endHour = String(startHour + 2).padStart(2, '0')
    const startMinute = (item.start_time || '08:00').split(':')[1] || '00'
    const endTime = `${endHour}${startMinute}`

    const dates = `${dateStr}T${startTime}00/${dateStr}T${endTime}00`
    const text = encodeURIComponent(`${titlePrefix} - PPDB PTDARRAHMAN`)
    const loc = encodeURIComponent(
      item.mode === 'online'
        ? item.meeting_url || 'Online Meeting'
        : item.location || 'Kampus PTDARRAHMAN'
    )
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&location=${loc}`
  }

  // Cek apakah ada jadwal di hari yang sama
  const allDates = [
    akademikSchedule?.session_date,
    psikologiSchedule?.session_date,
    tahfidzSession?.session_date,
  ].filter(Boolean)
  const isSameDay =
    allDates.length > 1 && new Set(allDates).size < allDates.length

  return (
    <div className="mx-auto max-w-5xl w-full space-y-6">
      <ApplicantPageHeader
        title="Tes Seleksi Masuk"
        description="Jadwal pelaksanaan ujian seleksi akademik, psikologi, dan tes tahfidz serta rekapitulasi nilai resmi."
        docKey="applicant-selection"
      />

      {isSameDay && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-sm">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>Perhatian:</strong> Beberapa ujian seleksi dilaksanakan pada hari yang sama. Harap perhatikan jam mulai masing-masing sesi agar tidak terlambat.
          </div>
        </div>
      )}

      {!isLoading && !akademikSchedule && !psikologiSchedule && !tahfidzSession && (
        <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-3xl flex items-start gap-3.5 text-blue-950">
          <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-slate-900 text-sm">Menunggu Jadwal Seleksi</h4>
            <p className="text-slate-600 leading-relaxed">
              Alhamdulillah, seluruh dokumen persyaratan Anda telah diverifikasi dan disetujui panitia. Saat ini panitia PPDB sedang menyusun jadwal ujian seleksi (Akademik, Psikologi, dan Tahfidz) untuk gelombang Anda.
            </p>
            <p className="text-slate-500 font-medium pt-1">
              Jadwal ujian akan otomatis muncul di halaman ini dan dikirimkan langsung ke nomor WhatsApp Anda begitu jadwal diterbitkan oleh panitia.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. JADWAL SELEKSI TERJADWAL
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Jadwal Ujian Seleksi
          </h3>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
            Terjadwal Otomatis per Gelombang
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Seleksi Akademik */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="h-2 w-full bg-blue-500 absolute top-0 left-0" />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-semibold">
                    CBT Online
                  </Badge>
                  {akademikAttempt?.status === 'completed' && (
                    <Badge className="bg-emerald-100 text-emerald-700">Selesai</Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 mt-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Tes Akademik
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Ujian Berbasis Komputer (CBT) materi dasar & logika.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 flex-1 flex flex-col justify-between">
                {akademikSchedule ? (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {akademikSchedule.session_date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {akademikSchedule.start_time} - {akademikSchedule.end_time || 'Selesai'} WIB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {akademikSchedule.mode === 'online' ? (
                        <Video className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MapPin className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="truncate">
                        {akademikSchedule.mode === 'online'
                          ? 'Daring / Online Browser'
                          : akademikSchedule.location || 'Laboratorium CBT'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400">
                    Belum ada jadwal akademik aktif untuk gelombang Anda.
                  </div>
                )}

                <div className="pt-2">
                  {akademikSchedule && akademikAttempt?.status !== 'completed' ? (
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
                      onClick={() => navigate(`/exam/${akademikSchedule.id}`)}
                    >
                      <PlayCircle className="w-4 h-4" />
                      Mulai Ujian Akademik
                    </Button>
                  ) : akademikAttempt?.status === 'completed' ? (
                    <div className="p-2 bg-emerald-50 text-emerald-700 text-center rounded-lg font-medium text-xs">
                      ✓ Ujian Selesai Dikerjakan
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Seleksi Psikologi */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="h-2 w-full bg-purple-500 absolute top-0 left-0" />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 font-semibold">
                    CBT Online
                  </Badge>
                  {psikologiAttempt?.status === 'completed' && (
                    <Badge className="bg-emerald-100 text-emerald-700">Selesai</Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 mt-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  Tes Psikologi
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Ujian Psikotes & pemetaan kesiapan belajar santri.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 flex-1 flex flex-col justify-between">
                {psikologiSchedule ? (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {psikologiSchedule.session_date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {psikologiSchedule.start_time} - {psikologiSchedule.end_time || 'Selesai'} WIB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {psikologiSchedule.mode === 'online' ? (
                        <Video className="w-4 h-4 text-purple-500" />
                      ) : (
                        <MapPin className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="truncate">
                        {psikologiSchedule.mode === 'online'
                          ? 'Daring / Online Browser'
                          : psikologiSchedule.location || 'Laboratorium CBT'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400">
                    Belum ada jadwal psikologi aktif untuk gelombang Anda.
                  </div>
                )}

                <div className="pt-2">
                  {psikologiSchedule && psikologiAttempt?.status !== 'completed' ? (
                    <Button
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium gap-1.5"
                      onClick={() => navigate(`/exam/${psikologiSchedule.id}`)}
                    >
                      <PlayCircle className="w-4 h-4" />
                      Mulai Ujian Psikologi
                    </Button>
                  ) : psikologiAttempt?.status === 'completed' ? (
                    <div className="p-2 bg-emerald-50 text-emerald-700 text-center rounded-lg font-medium text-xs">
                      ✓ Ujian Selesai Dikerjakan
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Seleksi Tahfidz */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="h-2 w-full bg-emerald-500 absolute top-0 left-0" />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-semibold">
                    {tahfidzSession?.mode === 'online' ? 'Zoom Meeting' : 'Tatap Muka'}
                  </Badge>
                  {tahfidzAvg !== null && (
                    <Badge className="bg-emerald-100 text-emerald-700">Sudah Dinilai</Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 mt-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Tes Tahfidz Al-Qur'an
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Ujian kelancaran hafalan & tajwid bersama penguji.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 flex-1 flex flex-col justify-between">
                {tahfidzSession ? (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {tahfidzSession.session_date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {tahfidzSession.start_time} - {tahfidzSession.end_time || 'Selesai'} WIB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Penguji: {tahfidzSession.officer_name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tahfidzSession.mode === 'online' ? (
                        <Video className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <MapPin className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="truncate">
                        {tahfidzSession.mode === 'online' ? (
                          <a
                            href={tahfidzSession.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 underline font-medium"
                          >
                            Tautan Zoom Ujian
                          </a>
                        ) : (
                          tahfidzSession.location || 'Ruang Pengujian Tahfidz'
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400">
                    Belum ada jadwal tahfidz aktif untuk gelombang Anda.
                  </div>
                )}

                <div className="pt-2">
                  {tahfidzSession && (
                    <a
                      href={getCalendarLink(tahfidzSession, 'Ujian Tahfidz')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Simpan ke Google Calendar
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HASIL TES SELEKSI (EMPTY STATE JIKA BELUM ADA)
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600" />
          Hasil Nilai Ujian Seleksi
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Hasil Akademik */}
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nilai Akademik
                </span>
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                {akademikAttempt?.score !== undefined && akademikAttempt?.score !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {akademikAttempt.score}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                ) : (
                  <div className="py-2">
                    <Badge variant="outline" className="text-xs text-slate-400 bg-slate-50 font-normal">
                      Belum Ada Nilai
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {akademikAttempt?.finished_at
                  ? `Selesai: ${new Date(akademikAttempt.finished_at).toLocaleDateString('id-ID')}`
                  : 'Hasil dihitung otomatis setelah pengerjaan selesai.'}
              </p>
            </CardContent>
          </Card>

          {/* Hasil Psikologi */}
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nilai Psikologi
                </span>
                <Brain className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                {psikologiAttempt?.score !== undefined && psikologiAttempt?.score !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {psikologiAttempt.score}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                ) : (
                  <div className="py-2">
                    <Badge variant="outline" className="text-xs text-slate-400 bg-slate-50 font-normal">
                      Belum Ada Nilai
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {psikologiAttempt?.finished_at
                  ? `Selesai: ${new Date(psikologiAttempt.finished_at).toLocaleDateString('id-ID')}`
                  : 'Hasil dihitung otomatis setelah pengerjaan selesai.'}
              </p>
            </CardContent>
          </Card>

          {/* Hasil Tahfidz */}
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nilai Tahfidz
                </span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                {tahfidzAvg !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {tahfidzAvg}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                ) : (
                  <div className="py-2">
                    <Badge variant="outline" className="text-xs text-slate-400 bg-slate-50 font-normal">
                      Belum Ada Nilai
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {tahfidzScores.length > 0
                  ? `Telah dinilai untuk ${tahfidzScores.length} kriteria tajwid & tahfidz.`
                  : 'Dinilai langsung oleh penguji Tahfidz resmi.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
