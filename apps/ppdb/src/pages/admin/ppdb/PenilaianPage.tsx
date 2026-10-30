import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui"
import { Textarea } from "@/components/ui"
import {
  ArrowRight,
  Activity,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  MessageSquare,
  Info,
  UserCheck,
  ThumbsDown,
  RotateCcw,
  Download,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  Brain,
  Monitor,
  Save,
  ShieldAlert,
  CalendarDays,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Applicant } from '@/types/ppdb'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import ToolbarCard from '@/components/shared/ToolbarCard'
import OfficialAssessmentSheet from '@/components/shared/OfficialAssessmentSheet'
import { downloadAssessmentDoc } from '@/utils/exportAssessment'
import { useToast } from '@/components/Toast'
import { useCanPage } from '@/hooks/useCan'
import { cn } from '@/lib/utils'
import {
  resultStatusMeta,
  resultStatusLabel,
} from '@/lib/selectionStatus'

type NoteField = 'notes_akademik' | 'notes_psikologi' | 'notes_tahfidz' | 'notes_wawancara'

// Fallback untuk data lama: catatan komponen tersimpan tertimpa berlabel [Tahfidz]: / [Wawancara]: di satu teks.
function parseLegacyComponentNotes(raw?: string | null): Partial<Record<NoteField, string>> {
  const text = (raw || '').trim()
  if (!text) return {}
  const grab = (tag: string) => {
    const m = text.match(new RegExp(`(?:^|\\n)\\[${tag}\\]:\\s*([\\s\\S]*?)(?=(?:\\n\\[|$))`, 'i'))
    return m ? m[1].trim() : ''
  }
  const tahfidz = grab('Tahfidz')
  const wawancara = grab('Wawancara')
  if (tahfidz || wawancara) return { notes_tahfidz: tahfidz, notes_wawancara: wawancara }
  return {}
}

function SelectionBadge({ status }: { status?: string }) {
  const meta = resultStatusMeta(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap', meta.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
      {meta.label}
    </span>
  )
}

interface ScoreDetailModalProps {
  applicant: Applicant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChanged?: () => void
  logoUrl?: string | null
}

interface CbtResultCardProps {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  iconWrap: string
  result: any | null
  noteValue: string
  disabled: boolean
  onNoteChange: (value: string) => void
  onSaveNote: () => void
  saving: boolean
}

function CbtResultCard({ title, subtitle, icon: Icon, iconWrap, result, noteValue, disabled, onNoteChange, onSaveNote, saving }: CbtResultCardProps) {
  const completed = result?.attempt_status === 'completed' && result?.score != null
  const statusLabel =
    result == null
      ? 'Belum Ada Jadwal'
      : result.attempt_status === 'completed'
      ? 'Selesai'
      : result.attempt_status === 'in_progress'
      ? 'Sedang Berlangsung'
      : result.attempt_status === 'locked'
      ? 'Terkunci (Perlu Unfreeze)'
      : 'Belum Mulai'

  return (
    <div className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', iconWrap)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-800">{title}</h4>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {completed ? (
          <Badge variant="success" className="text-xs font-bold">
            Nilai: {Number(result.score)} / 100
          </Badge>
        ) : (
          <Badge variant="warning" className="text-xs font-semibold whitespace-nowrap">
            {statusLabel}
          </Badge>
        )}
      </div>

      {result ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Jadwal Ujian</span>
            <span className="font-medium text-slate-700">{result.schedule_name || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch / Tanggal</span>
            <span className="font-medium text-slate-700">
              {result.batch_name || '-'} · {result.session_date || '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Pelanggaran Tab</span>
            <span className={cn('font-medium', (result.violations_count || 0) > 0 ? 'text-red-600 font-bold' : 'text-slate-700')}>
              {result.violations_count || 0}x
            </span>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
          Belum ada jadwal atau nilai ujian CBT yang tersimpan untuk pendaftar ini.
        </div>
      )}

      {/* Catatan hasil (opsional) */}
      <div className="pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Catatan Hasil (Opsional)
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 px-2 bg-white"
            disabled={disabled || saving}
            onClick={onSaveNote}
          >
            <Save className="h-3 w-3" /> Simpan Catatan
          </Button>
        </div>
        <Textarea
          value={noteValue}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={2}
          placeholder="Contoh: penguasaan materi perlu pendampingan tambahan di minggu pertama."
          className="text-xs mt-1.5 resize-none"
        />
      </div>
    </div>
  )
}

function ScoreDetailModal({ applicant, open, onOpenChange, onStatusChanged, logoUrl }: ScoreDetailModalProps) {
  const assessmentSheetRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { canCrud } = useCanPage('penilaian')
  const queryClient = useQueryClient()
  const [verdictMode, setVerdictMode] = useState<null | 'passed' | 'conditional' | 'waitlist' | 'failed' | 'selection'>(null)
  const [verdictReason, setVerdictReason] = useState('')
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<NoteField, string>>({
    notes_akademik: '',
    notes_psikologi: '',
    notes_tahfidz: '',
    notes_wawancara: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-transcript-view', applicant?.id],
    queryFn: async () => {
      if (!applicant?.id) return null
      return await api.apiFetch<any>(`/ppdb/applicants/${applicant.id}/transcript`)
    },
    enabled: open && !!applicant?.id,
  })

  useEffect(() => {
    if (!open) return
    const resultNotes = (data?.result_notes || {}) as Record<string, string | null>
    const legacy = parseLegacyComponentNotes(data?.evaluator_notes)
    setNoteDrafts({
      notes_akademik: resultNotes.akademik || '',
      notes_psikologi: resultNotes.psikologi || '',
      notes_tahfidz: resultNotes.tahfidz || legacy.notes_tahfidz || '',
      notes_wawancara: resultNotes.wawancara || legacy.notes_wawancara || '',
    })
  }, [open, data?.result_notes, data?.evaluator_notes])

  const verdictMutation = useMutation({
    mutationFn: (payload: { status: string; reason?: string }) =>
      api.apiFetch(`/selection/applicants/${applicant!.id}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast('success', `Hasil pendaftaran ditetapkan: ${resultStatusLabel(verdictMode)}`)
      queryClient.invalidateQueries({ queryKey: ['applicant-transcript-view', applicant?.id] })
      queryClient.invalidateQueries({ queryKey: ['applicants-selection-results'] })
      setVerdictMode(null)
      setVerdictReason('')
      onStatusChanged?.()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan keputusan'),
  })

  const notesMutation = useMutation({
    mutationFn: (field: NoteField) => {
      const value = noteDrafts[field].trim()
      return api.apiFetch(`/selection/applicants/${applicant!.id}/result-notes`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
      })
    },
    onSuccess: () => {
      toast('success', 'Catatan hasil seleksi tersimpan')
      queryClient.invalidateQueries({ queryKey: ['applicant-transcript-view', applicant?.id] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan catatan'),
  })

  const handleConfirmVerdict = () => {
    if (!verdictMode) return
    // Kembali ke "Dalam Proses" selalu diizinkan.
    if (verdictMode === 'selection') {
      verdictMutation.mutate({ status: 'selection' })
      return
    }
    if (!scoresComplete) {
      toast('error', `Nilai belum lengkap: ${missingScores.join(', ')}. Lengkapi nilai terlebih dahulu.`)
      return
    }
    // Catatan evaluator wajib sebelum hasil pendaftaran diterbitkan.
    if (!verdictReason.trim()) {
      toast('error', 'Catatan evaluator wajib diisi sebelum menetapkan hasil pendaftaran.')
      return
    }
    verdictMutation.mutate({ status: verdictMode, reason: verdictReason.trim() })
  }

  if (!applicant) return null

  const appData = data?.applicant || applicant
  const categories: any[] = data?.categories || []
  const cbtResults = data?.cbt_results || {}
  const evaluatorNotes = data?.evaluator_notes
  const graduationStatus = data?.graduation_status || applicant.status

  // Kelengkapan nilai — hasil pendaftaran hanya aktif bila seluruh nilai masuk.
  // Backend menghitung sisi kelengkapannya; frontend menampilkan daftar gap-nya.
  const missingScores: string[] = Array.isArray(data?.missing_scores) ? data.missing_scores : []
  const scoresComplete = !isLoading && !!data && missingScores.length === 0

  const tahfidzCategory = categories.find(c => c.category_name?.toLowerCase().includes('tahfidz'))
  const wawancaraCategory = categories.find(c => (c.category_name || '').toLowerCase().includes('wawancara') || (c.category_name || '').toLowerCase().includes('interview'))

  const calculateAvg = (criteriaList?: any[]) => {
    if (!criteriaList || criteriaList.length === 0) return null
    const validScores = criteriaList.filter(c => c.score != null && !isNaN(Number(c.score)))
    if (validScores.length === 0) return null
    const total = validScores.reduce((acc, c) => acc + Number(c.score), 0)
    return (total / validScores.length).toFixed(1)
  }

  const tahfidzAvg = calculateAvg(tahfidzCategory?.criteria)
  const wawancaraAvg = calculateAvg(wawancaraCategory?.criteria)

  const handleDownload = async (format: 'pdf' | 'image') => {
    if (!assessmentSheetRef.current) {
      toast('error', 'Dokumen penilaian belum siap diunduh. Mohon tunggu sebentar.')
      return
    }
    try {
      setIsDownloading(format)
      await downloadAssessmentDoc(
        assessmentSheetRef.current,
        format,
        appData.full_name || 'santri',
        appData.registration_number || appData.id
      )
      toast('success', `Lembar penilaian berhasil diunduh sebagai ${format.toUpperCase()}`)
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunduh lembar penilaian')
    } finally {
      setIsDownloading(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  Hasil Pendaftaran Pendaftar
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Rekapitulasi seluruh hasil seleksi (CBT Akademik, CBT Psikologi, Tahfidz, Wawancara) dengan catatan opsional per komponen.
                </DialogDescription>
              </div>

              {/* Dropdown Download Lembar Penilaian (PDF / Gambar) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!isDownloading || isLoading}
                    className="h-8 text-xs gap-1.5 shrink-0 w-full sm:w-auto bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs font-semibold"
                  >
                    {isDownloading ? (
                      <>
                        <Clock className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0" />
                        <span>Menyiapkan {isDownloading === 'pdf' ? 'PDF' : 'Gambar'}...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Download Lembar</span>
                        <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-slate-200 bg-white">
                  <DropdownMenuItem
                    onClick={() => handleDownload('pdf')}
                    disabled={!!isDownloading}
                    className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">Download PDF</span>
                      <span className="text-[10px] text-muted-foreground">Format standar dokumen A4</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDownload('image')}
                    disabled={!!isDownloading}
                    className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">Download Gambar</span>
                      <span className="text-[10px] text-muted-foreground">Format PNG resolusi tinggi A4</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Clock className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" />
            Memuat lembar hasil nilai seleksi...
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Kartu Profil Santri */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nama Lengkap Santri</span>
                <span className="font-bold text-sm text-slate-800">{appData.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">NISN / NIK</span>
                <span className="font-semibold text-slate-700">{appData.nisn || appData.nik || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Gelombang PPDB</span>
                <span className="font-medium text-slate-700">{appData.wave_name || '—'}</span>
              </div>
            </div>

            {/* SEKSI 1: HASIL CBT AKADEMIK */}
            <CbtResultCard
              title="1. Hasil CBT Akademik"
              subtitle="Ujian Seleksi Akademik Terkomputerisasi"
              icon={Monitor}
              iconWrap="bg-indigo-50 text-indigo-700"
              result={cbtResults.akademik || null}
              noteValue={noteDrafts.notes_akademik}
              disabled={notesMutation.isPending}
              saving={notesMutation.isPending}
              onNoteChange={(v) => setNoteDrafts(s => ({ ...s, notes_akademik: v }))}
              onSaveNote={() => notesMutation.mutate('notes_akademik')}
            />

            {/* SEKSI 2: HASIL CBT PSIKOLOGI */}
            <CbtResultCard
              title="2. Hasil CBT Psikologi"
              subtitle="Ujian Seleksi Psikologi Terkomputerisasi"
              icon={Brain}
              iconWrap="bg-sky-50 text-sky-700"
              result={cbtResults.psikologi || null}
              noteValue={noteDrafts.notes_psikologi}
              disabled={notesMutation.isPending}
              saving={notesMutation.isPending}
              onNoteChange={(v) => setNoteDrafts(s => ({ ...s, notes_psikologi: v }))}
              onSaveNote={() => notesMutation.mutate('notes_psikologi')}
            />

            {/* SEKSI 3: HASIL TES TAHFIDZ */}
            <div className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">3. Hasil Uji Tahfidz Al-Qur&apos;an</h4>
                    <p className="text-[11px] text-muted-foreground">Penilaian Penguji Tahfidz Sesuai Rubrik</p>
                  </div>
                </div>
                {tahfidzAvg && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                    Rata-rata: {tahfidzAvg} / 100
                  </Badge>
                )}
              </div>

              {tahfidzCategory && tahfidzCategory.criteria && tahfidzCategory.criteria.length > 0 ? (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-[11px]">
                        <th className="text-left py-2 px-3 font-semibold">Kriteria Penilaian</th>
                        <th className="text-center py-2 px-3 w-24 font-semibold">Bobot</th>
                        <th className="text-right py-2 px-3 w-28 font-semibold">Skor Perolehan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tahfidzCategory.criteria.map((cr: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700">{cr.criteria_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {cr.score != null ? cr.score : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
                  Belum ada nilai ujian Tahfidz yang tersimpan untuk pendaftar ini.
                </div>
              )}

              {/* Catatan hasil (opsional) */}
              <div className="pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Catatan Hasil (Opsional)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 px-2 bg-white"
                    disabled={notesMutation.isPending}
                    onClick={() => notesMutation.mutate('notes_tahfidz')}
                  >
                    <Save className="h-3 w-3" /> Simpan Catatan
                  </Button>
                </div>
                <Textarea
                  value={noteDrafts.notes_tahfidz}
                  onChange={(e) => setNoteDrafts(s => ({ ...s, notes_tahfidz: e.target.value }))}
                  rows={2}
                  placeholder="Catatan kelancaran hafalan, target juz, mantra keplelian, dan rekomendasi kelas..."
                  className="text-xs mt-1.5 resize-none"
                />
              </div>
            </div>

            {/* SEKSI 4: HASIL TES WAWANCARA */}
            <div className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">4. Hasil Uji Wawancara</h4>
                    <p className="text-[11px] text-muted-foreground">Penilaian Pewawancara (Santri &amp; Orang Tua/Wali)</p>
                  </div>
                </div>
                {wawancaraAvg && (
                  <Badge variant="outline" className="text-xs font-bold text-amber-700 bg-amber-50 border-amber-200">
                    Rata-rata: {wawancaraAvg} / 100
                  </Badge>
                )}
              </div>

              {wawancaraCategory && wawancaraCategory.criteria && wawancaraCategory.criteria.length > 0 ? (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-[11px]">
                        <th className="text-left py-2 px-3 font-semibold">Kriteria Penilaian</th>
                        <th className="text-center py-2 px-3 w-24 font-semibold">Bobot</th>
                        <th className="text-right py-2 px-3 w-28 font-semibold">Skor Perolehan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {wawancaraCategory.criteria.map((cr: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700">{cr.criteria_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {cr.score != null ? cr.score : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
                  Belum ada nilai ujian Wawancara yang tersimpan untuk pendaftar ini.
                </div>
              )}

              {/* Catatan hasil (opsional) */}
              <div className="pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Catatan Hasil (Opsional)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 px-2 bg-white"
                    disabled={notesMutation.isPending}
                    onClick={() => notesMutation.mutate('notes_wawancara')}
                  >
                    <Save className="h-3 w-3" /> Simpan Catatan
                  </Button>
                </div>
                <Textarea
                  value={noteDrafts.notes_wawancara}
                  onChange={(e) => setNoteDrafts(s => ({ ...s, notes_wawancara: e.target.value }))}
                  rows={2}
                  placeholder="Catatan sikap wawancara, komitmen pendidikan, kesiapan keluarga, dan rekomendasi..."
                  className="text-xs mt-1.5 resize-none"
                />
              </div>
            </div>

            {/* STATUS KEPUTUSAN & VALIDASI KELULUSAN */}
            <div className={cn(
              "border-2 rounded-xl overflow-hidden",
              graduationStatus === 'passed' ? 'border-emerald-200' :
              graduationStatus === 'conditional' ? 'border-sky-200' :
              graduationStatus === 'waitlist' ? 'border-violet-200' :
              graduationStatus === 'failed' ? 'border-red-200' : 'border-slate-200'
            )}>
              {/* Status Row */}
              <div className={cn(
                "flex items-center justify-between p-4",
                graduationStatus === 'passed' ? 'bg-emerald-50' :
                graduationStatus === 'conditional' ? 'bg-sky-50' :
                graduationStatus === 'waitlist' ? 'bg-violet-50' :
                graduationStatus === 'failed' ? 'bg-red-50' : 'bg-slate-50'
              )}>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-slate-700" />
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">Status Hasil Pendaftaran</span>
                    <span className="text-[11px] text-muted-foreground">Keputusan hasil seleksi calon santri</span>
                  </div>
                </div>
                <Badge
                  variant={
                    graduationStatus === 'passed' ? 'success' :
                    graduationStatus === 'failed' ? 'destructive' :
                    graduationStatus === 'conditional' ? 'info' :
                    graduationStatus === 'waitlist' ? 'gold' : 'warning'
                  }
                  className="text-xs uppercase px-3 py-1 font-bold whitespace-nowrap"
                >
                  {resultStatusLabel(graduationStatus)}
                </Badge>
              </div>

              {/* Catatan evaluator terakhir (hasil final) */}
              {evaluatorNotes && graduationStatus !== 'selection' && (
                <div className="px-4 py-2.5 bg-white border-t border-slate-100">
                  <p className="text-[11px] text-slate-700"><span className="font-semibold text-slate-800">Catatan Evaluator:</span> <span className="italic">{evaluatorNotes}</span></p>
                </div>
              )}

              {/* Tombol Validasi — hanya tampil jika admin punya hak */}
              {canCrud && !verdictMode && (
                <div className="px-4 py-3 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className={cn(
                    "text-xs",
                    scoresComplete ? "text-muted-foreground" : "text-amber-700 font-medium flex items-start gap-1.5"
                  )}>
                    {!scoresComplete ? (
                      isLoading ? (
                        <span>Memuat data nilai pendaftar…</span>
                      ) : (
                        <>
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Hasil hanya dapat ditetapkan setelah seluruh nilai masuk. Nilai belum lengkap: {missingScores.join(', ')}.
                          </span>
                        </>
                      )
                    ) : graduationStatus === 'selection' || !graduationStatus
                      ? 'Tetapkan hasil pendaftaran pendaftar ini.'
                      : 'Ubah kategori hasil yang sudah ditetapkan.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                      onClick={() => setVerdictMode('passed')}
                      disabled={verdictMutation.isPending || !scoresComplete}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Diterima
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100 w-full sm:w-auto"
                      onClick={() => setVerdictMode('conditional')}
                      disabled={verdictMutation.isPending || !scoresComplete}
                    >
                      <Info className="h-3.5 w-3.5" /> Bersyarat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 w-full sm:w-auto"
                      onClick={() => setVerdictMode('waitlist')}
                      disabled={verdictMutation.isPending || !scoresComplete}
                    >
                      <CalendarDays className="h-3.5 w-3.5" /> Cadangan
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                      onClick={() => setVerdictMode('failed')}
                      disabled={verdictMutation.isPending || !scoresComplete}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Tidak Diterima
                    </Button>
                    {(graduationStatus !== 'selection' && graduationStatus) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 text-slate-600 w-full sm:w-auto"
                        onClick={() => setVerdictMode('selection')}
                        disabled={verdictMutation.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset ke Dalam Proses
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Panel konfirmasi inline */}
              {canCrud && verdictMode && (
                <div className={cn(
                  "px-4 py-4 border-t space-y-3",
                  verdictMode === 'passed' ? 'bg-emerald-50/60 border-emerald-200' :
                  verdictMode === 'conditional' ? 'bg-sky-50/60 border-sky-200' :
                  verdictMode === 'waitlist' ? 'bg-violet-50/60 border-violet-200' :
                  verdictMode === 'failed' ? 'bg-red-50/60 border-red-200' : 'bg-amber-50/60 border-amber-200'
                )}>
                  {verdictMode !== 'selection' && (
                    <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Catatan evaluator wajib diisi dan akan dikirim dalam notifikasi WhatsApp hasil.
                    </p>
                  )}
                  <p className={cn(
                    "text-xs font-semibold",
                    verdictMode === 'passed' ? 'text-emerald-800' :
                    verdictMode === 'conditional' ? 'text-sky-800' :
                    verdictMode === 'waitlist' ? 'text-violet-800' :
                    verdictMode === 'failed' ? 'text-red-800' : 'text-amber-800'
                  )}>
                    {verdictMode === 'passed'
                      ? '✅ Konfirmasi: Tetapkan hasil pendaftaran DITERIMA?'
                      : verdictMode === 'conditional'
                      ? '📋 Konfirmasi: Tetapkan hasil pendaftaran DITERIMA BERSYARAT?'
                      : verdictMode === 'waitlist'
                      ? '📌 Konfirmasi: Tetapkan hasil pendaftaran CADANGAN?'
                      : verdictMode === 'failed'
                      ? '❌ Konfirmasi: Tetapkan hasil pendaftaran TIDAK DITERIMA?'
                      : '↩️ Konfirmasi: Reset status ke Dalam Proses?'}
                  </p>
                  <Textarea
                    placeholder={
                      verdictMode === 'selection'
                        ? 'Catatan tambahan (opsional)...'
                        : 'Alasan / pertimbangan evaluator (wajib)...'
                    }
                    value={verdictReason}
                    onChange={e => setVerdictReason(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs w-full sm:w-auto"
                      onClick={() => { setVerdictMode(null); setVerdictReason('') }}
                      disabled={verdictMutation.isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      className={cn("h-8 text-xs gap-1.5 w-full sm:w-auto",
                        verdictMode === 'passed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                        verdictMode === 'conditional' ? 'bg-sky-600 hover:bg-sky-700 text-white' :
                        verdictMode === 'waitlist' ? 'bg-violet-600 hover:bg-violet-700 text-white' :
                        verdictMode === 'failed' ? 'bg-destructive hover:bg-destructive/90 text-white' :
                        'bg-amber-600 hover:bg-amber-700 text-white'
                      )}
                      onClick={handleConfirmVerdict}
                      disabled={
                        verdictMutation.isPending ||
                        (verdictMode !== 'selection' && !scoresComplete)
                      }
                    >
                      {verdictMutation.isPending ? 'Menyimpan...' : 'Ya, Konfirmasi'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
        </DialogContent>
      </Dialog>

    {/* Hidden Container untuk Render Lembar Penilaian Resmi A4 (Presisi Tanpa Kotoran Modal) */}
    {open && appData && (
      <div
        className="print:hidden"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '210mm',
          zIndex: -99999,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <OfficialAssessmentSheet
          ref={assessmentSheetRef}
          applicant={appData}
          categories={categories}
          cbtResults={cbtResults}
          resultNotes={noteDrafts}
          evaluatorNotes={evaluatorNotes}
          graduationStatus={graduationStatus}
          logoUrl={logoUrl}
        />
      </div>
    )}
  </>
)
}

export default function PenilaianPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(
    'https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png'
  )

  useEffect(() => {
    fetch(`${api.API_BASE}/companyprofile/settings/logo`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.value) setLogoUrl(data.value)
      })
      .catch(() => {})
  }, [])

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants-selection-results', searchQuery, page, limit, statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())
      // Hanya pendaftar dari PERIODE aktif (seluruh gelombang di dalamnya).
      qs.append('period_id', 'active')

      const res = await api.apiFetch<{ data: Applicant[], total: number, active_period: any }>(`/ppdb/applicants?${qs.toString()}`)
      return res
    }
  })

  const applicants = data?.data || []
  const activePeriodData = data?.active_period && typeof data.active_period === 'object' ? data.active_period : null
  const hasActivePeriod = !!activePeriodData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleFilterChange = (status: string) => {
    if (status) {
      setSearchParams({ status })
    } else {
      setSearchParams({})
    }
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Hasil Pendaftaran"
        description="Rekapitulasi penilaian calon santri — Akademik, Psikologi, Tahfidz, dan Wawancara. Admin menetapkan hasil pendaftaran di sini."
        loading={loading}
        docKey="ppdb-penilaian"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Periode Aktif', value: activePeriodData?.name || 'Tidak ada', active: hasActivePeriod, pulse: hasActivePeriod },
          { icon: Award, label: 'Peserta Seleksi', value: data?.total != null ? `${data.total} santri` : '—', active: true },
        ]}
      />

      {!loading && hasActivePeriod === false && (
        <NoActiveWaveBanner message="Tidak ada periode yang aktif saat ini. Aktifkan periode terlebih dahulu untuk melihat hasil pendaftaran." />
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full"
          onClick={() => handleFilterChange('')}
        >
          Semua Status
        </Button>
        <Button
          variant={statusFilter === 'selection' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('selection')}
        >
          <Clock className="h-3.5 w-3.5" /> Dalam Proses
        </Button>
        <Button
          variant={statusFilter === 'passed' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('passed')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Diterima
        </Button>
        <Button
          variant={statusFilter === 'conditional' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('conditional')}
        >
          <Info className="h-3.5 w-3.5" /> Diterima Bersyarat
        </Button>
        <Button
          variant={statusFilter === 'waitlist' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('waitlist')}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Cadangan
        </Button>
        <Button
          variant={statusFilter === 'failed' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('failed')}
        >
          <XCircle className="h-3.5 w-3.5" /> Tidak Diterima
        </Button>
      </div>

      <ToolbarCard
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-emerald-primary/5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Nama Pendaftar</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Email / No. WA</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Hasil Pendaftaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={3} className="py-4 px-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : applicants.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-muted-foreground text-sm">
                      Belum ada pendaftar yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  applicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      onClick={() => setSelectedApplicant(applicant)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      title="Klik untuk melihat hasil seleksi & penetapan hasil pendaftaran"
                    >
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">{applicant.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{applicant.wave_name || '-'}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{applicant.email || '-'}</div>
                        <div className="text-xs text-muted-foreground">{applicant.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <SelectionBadge status={applicant.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Modal Lembar Hasil Nilai Seleksi & Validasi Kategori Hasil */}
      <ScoreDetailModal
        applicant={selectedApplicant}
        open={!!selectedApplicant}
        onOpenChange={(v) => !v && setSelectedApplicant(null)}
        onStatusChanged={() => refetch()}
        logoUrl={logoUrl}
      />
    </div>
  )
}
