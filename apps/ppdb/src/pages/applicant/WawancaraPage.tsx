import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
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
  Users,
  CalendarPlus,
  FileText,
} from 'lucide-react'

const parseInterviewNotes = (raw?: any) => {
  if (!raw) return { santri: '', ortu: '', general: '' }
  const text = String(raw).trim()

  const santriMatch =
    text.match(/(?:^|\n)\[(?:Wawancara Santri|Santri)\]:\s*([\s\S]*?)(?=(?:\n\[|$))/i) ||
    text.match(/(?:^|\n)\[Wawancara\]:\s*([\s\S]*?)(?=(?:\n\[|$))/i)

  const ortuMatch = text.match(
    /(?:^|\n)\[(?:Wawancara Orang Tua|Orang Tua|Wali)\]:\s*([\s\S]*?)(?=(?:\n\[|$))/i
  )

  return {
    santri: santriMatch ? santriMatch[1].trim() : '',
    ortu: ortuMatch ? ortuMatch[1].trim() : '',
    general: !santriMatch && !ortuMatch ? text : '',
  }
}

export default function WawancaraPage() {
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

  const isLoading = selectionQuery.isLoading
  const sessionData = selectionQuery.data?.sessionData
  const selectionResult = selectionQuery.data?.result

  const santriSession = sessionData?.interview_session || null
  const ortuSession = sessionData?.interview_parent_session || null
  const parsedNotes = parseInterviewNotes(selectionResult?.notes)

  const hasInterviewScore = sessionData?.has_interview_score || false

  const getCalendarLink = (item: any, titlePrefix: string) => {
    if (!item || !item.session_date) return '#'
    const dateStr = String(item.session_date).split('T')[0].replace(/-/g, '')
    const startTime = (item.start_time || '09:00').replace(':', '')
    const startHour = parseInt((item.start_time || '09:00').split(':')[0] || '9', 10)
    const endHour = String(startHour + 1).padStart(2, '0')
    const startMinute = (item.start_time || '09:00').split(':')[1] || '00'
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

  return (
    <div className="mx-auto max-w-5xl w-full space-y-6">
      <ApplicantPageHeader
        title="Wawancara Seleksi"
        description="Jadwal dan rekapitulasi hasil wawancara calon santri serta wawancara orang tua/wali."
        docKey="applicant-interview"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ─────────────────────────────────────────────────────────────
              1. WAWANCARA CALON SANTRI / SISWA
             ───────────────────────────────────────────────────────────── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="h-2 w-full bg-emerald-600" />
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-semibold">
                  Calon Santri
                </Badge>
                {hasInterviewScore && (
                  <Badge className="bg-emerald-100 text-emerald-700">Sudah Dinilai</Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-2">
                <User className="w-5 h-5 text-emerald-600" />
                Wawancara Calon Santri
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Wawancara kepribadian, motivasi menghafal Al-Qur'an, dan kesiapan berasrama.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs text-slate-600 flex-1 flex flex-col justify-between">
              {santriSession ? (
                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800 text-sm">
                      {santriSession.session_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {santriSession.start_time} - {santriSession.end_time || 'Selesai'} WIB
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Pewawancara: {santriSession.officer_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {santriSession.mode === 'online' ? (
                      <Video className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="truncate">
                      {santriSession.mode === 'online' ? (
                        <a
                          href={santriSession.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 underline font-medium"
                        >
                          Tautan Zoom Wawancara
                        </a>
                      ) : (
                        santriSession.location || 'Ruang Wawancara Santri'
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  Belum ada jadwal wawancara santri aktif untuk gelombang Anda.
                </div>
              )}

              {/* Catatan / Hasil Evaluator */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Catatan / Resume Pewawancara:
                </span>
                {parsedNotes.santri || parsedNotes.general ? (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-slate-800 text-xs italic">
                    "{parsedNotes.santri || parsedNotes.general}"
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs text-center">
                    Belum ada catatan wawancara (menunggu pelaksanaan).
                  </div>
                )}
              </div>

              {santriSession && (
                <div className="pt-2">
                  <a
                    href={getCalendarLink(santriSession, 'Wawancara Santri')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Simpan ke Google Calendar
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─────────────────────────────────────────────────────────────
              2. WAWANCARA ORANG TUA / WALI
             ───────────────────────────────────────────────────────────── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="h-2 w-full bg-teal-600" />
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-teal-50 text-teal-700 font-semibold">
                  Orang Tua / Wali
                </Badge>
                {Boolean(parsedNotes.ortu) && (
                  <Badge className="bg-emerald-100 text-emerald-700">Sudah Terlaksana</Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-2">
                <Users className="w-5 h-5 text-teal-600" />
                Wawancara Orang Tua / Wali
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Penyelarasan visi pendidikan pesantren, komitmen orang tua, dan tata tertib santri.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs text-slate-600 flex-1 flex flex-col justify-between">
              {ortuSession || santriSession ? (
                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800 text-sm">
                      {(ortuSession || santriSession)?.session_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {(ortuSession || santriSession)?.start_time} - {(ortuSession || santriSession)?.end_time || 'Selesai'} WIB
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Pewawancara: {(ortuSession || santriSession)?.officer_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(ortuSession || santriSession)?.mode === 'online' ? (
                      <Video className="w-4 h-4 text-teal-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="truncate">
                      {(ortuSession || santriSession)?.mode === 'online' ? (
                        <a
                          href={(ortuSession || santriSession)?.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 underline font-medium"
                        >
                          Tautan Zoom Wawancara Ortu
                        </a>
                      ) : (
                        (ortuSession || santriSession)?.location || 'Ruang Wawancara Orang Tua/Wali'
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  Belum ada jadwal wawancara orang tua aktif untuk gelombang Anda.
                </div>
              )}

              {/* Catatan / Hasil Evaluator Ortu */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Catatan / Resume Pewawancara:
                </span>
                {parsedNotes.ortu ? (
                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl text-slate-800 text-xs italic">
                    "{parsedNotes.ortu}"
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs text-center">
                    Belum ada catatan wawancara orang tua (menunggu pelaksanaan).
                  </div>
                )}
              </div>

              {(ortuSession || santriSession) && (
                <div className="pt-2">
                  <a
                    href={getCalendarLink(ortuSession || santriSession, 'Wawancara Orang Tua')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Simpan ke Google Calendar
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
