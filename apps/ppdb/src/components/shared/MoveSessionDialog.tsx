import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/components/ui'
import { AlertTriangle, Calendar, CheckCircle2, Loader2, Search } from 'lucide-react'

export interface MoveSessionApplicant {
  applicant_id: string
  full_name: string
  phone?: string | null
  /** Label tambahan di bawah nama, misal no. registrasi atau nama orang tua. */
  extra_label?: string | null
  /** Badge status, misal "Selesai" atau "Sudah Dinilai". */
  status_label?: string | null
  /** Baris dengan flag ini tidak bisa dipindah (checkbox mati). */
  moves_disabled?: boolean
}

export interface MoveSessionTarget {
  id: string
  name: string
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
  /** Label kategori pendek di depan nama sesi, misal "Wawancara" atau "Tahfidz". */
  tag?: string | null
}

interface BulkMoveResponse {
  message: string
  total_requested: number
  moved_count: number
  failed: Array<{ applicant_id: string; detail: string }>
  target_session_id: string
  target_session_name: string
}

interface MoveSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sesi asal daftar ini; wajib dipakai backend saat target berupa jadwal CBT. */
  sourceSessionId: string | null
  /** Ringkasan sesi asal untuk ditampilkan, misal "Tahfidz Batch A (2026-03-01, 08:00 WIB)". */
  sourceSessionLabel?: string | null
  applicants: MoveSessionApplicant[]
  targets: MoveSessionTarget[]
  /** Dipanggil sekali setelah ada pemindahan sukses, untuk invalidate query parent. */
  onMoved?: () => void
}

const formatTargetOption = (t: MoveSessionTarget) => {
  const date = t.session_date ? String(t.session_date).split('T')[0] : ''
  const time = t.start_time ? [t.start_time, t.end_time].filter(Boolean).join(' - ') : ''
  const parts = [t.name, date || '-', time].filter(Boolean)
  return parts.length ? parts.join(' · ') : t.name
}

export default function MoveSessionDialog({
  open,
  onOpenChange,
  sourceSessionId,
  sourceSessionLabel,
  applicants,
  targets,
  onMoved,
}: MoveSessionDialogProps) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetSessionId, setTargetSessionId] = useState('')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<BulkMoveResponse | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(new Set())
      setTargetSessionId('')
      setReason('')
      setResult(null)
    }
  }, [open])

  const filteredApplicants = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return applicants
    return applicants.filter((app) =>
      [app.full_name, app.phone, app.extra_label]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [applicants, query])

  const movableApplicants = filteredApplicants.filter((app) => !app.moves_disabled)
  const allSelected = movableApplicants.length > 0
    && movableApplicants.every((app) => selected.has(app.applicant_id))
  const selectedCount = [...selected].filter((id) =>
    applicants.some((app) => app.applicant_id === id && !app.moves_disabled)
  ).length

  const toggleOne = (applicantId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(applicantId)) next.delete(applicantId)
      else next.add(applicantId)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(movableApplicants.map((app) => app.applicant_id)))
    }
  }

  const moveMutation = useMutation({
    mutationFn: async () => {
      return await api.apiFetch<BulkMoveResponse>('/selection/applicants/move-session-bulk', {
        method: 'POST',
        body: JSON.stringify({
          applicant_ids: [...selected],
          target_session_id: targetSessionId,
          current_session_id: sourceSessionId || undefined,
          reason: reason.trim() || undefined,
        }),
      })
    },
    onSuccess: (res) => {
      setResult(res)
      toast('success', res?.message || 'Pendaftar berhasil dipindahkan.')
      onMoved?.()
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal memindahkan pendaftar ke sesi baru.')
    },
  })

  const nameById = useMemo(
    () => new Map(applicants.map((app) => [app.applicant_id, app.full_name])),
    [applicants]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Pindah Sesi Massal
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Centang pendaftar yang mau dipindah, pilih sesi tujuan, lalu simpan.
            {sourceSessionLabel ? (
              <>
                {' '}Pendaftar dipindah dari sesi <strong className="text-slate-700">{sourceSessionLabel}</strong>.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {applicants.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            Belum ada pendaftar terdaftar di sesi ini, tidak ada yang bisa dipindahkan.
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs overflow-hidden flex flex-col min-h-0">
            {/* Daftar pendaftar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama pendaftar..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Badge variant="outline" className="text-[11px] text-slate-500 shrink-0">
                  {selectedCount ? `${selectedCount} dipilih` : `${movableApplicants.length} bisa dipindah`}
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {filteredApplicants.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    Tidak ada pendaftar yang cocok dengan pencarian.
                  </p>
                ) : (
                  filteredApplicants.map((app) => (
                    <label
                      key={app.applicant_id}
                      className={`flex items-start gap-2.5 px-3 py-2 ${
                        app.moves_disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        checked={selected.has(app.applicant_id)}
                        onCheckedChange={() => toggleOne(app.applicant_id)}
                        disabled={app.moves_disabled}
                        className="mt-0.5"
                        aria-label={`Pilih ${app.full_name}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-800 truncate">
                          {app.full_name}
                        </span>
                        {app.extra_label ? (
                          <span className="block text-[11px] text-slate-500 truncate">
                            {app.extra_label}
                          </span>
                        ) : null}
                        {app.phone ? (
                          <span className="block text-[11px] text-slate-500 font-mono truncate">
                            {app.phone}
                          </span>
                        ) : null}
                      </span>
                      {app.status_label ? (
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${
                            app.moves_disabled
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-slate-500 bg-slate-50 border-slate-200'
                          }`}
                        >
                          {app.status_label}
                        </Badge>
                      ) : null}
                    </label>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="move-select-all"
                  checked={
                    allSelected ? true : selectedCount > 0 ? 'indeterminate' : false
                  }
                  onCheckedChange={toggleAll}
                  disabled={movableApplicants.length === 0}
                />
                <Label
                  htmlFor="move-select-all"
                  className="text-[11px] text-slate-600 font-medium cursor-pointer"
                >
                  Pilih semua yang bisa dipindah
                </Label>
              </div>
            </div>

            {/* Target */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 block">
                Pilih Sesi Tujuan <span className="text-red-500">*</span>
              </Label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
                className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih sesi tujuan --</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tag ? `[${t.tag}] ` : ''}
                    {formatTargetOption(t)}
                  </option>
                ))}
              </select>
              {targets.length === 0 && (
                <p className="text-[11px] text-amber-700">
                  Belum ada sesi lain yang tersedia, buat jadwal baru dulu di menu jadwal.
                </p>
              )}
            </div>

            {/* Alasan */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 block">
                Alasan Pemindahan (Opsional)
              </Label>
              <Textarea
                placeholder="Contoh: Peserta sakit / berhalangan hadir pada tanggal sesi sebelumnya..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Setiap pendaftar yang dipindah otomatis menerima notifikasi WhatsApp berisi
              jadwal barunya.
            </p>

            {/* Hasil setelah simpan */}
            {result && (
              <div className="rounded-lg border p-3 space-y-1.5" aria-live="polite">
                {'failed' in result && result.failed.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">
                      {result.moved_count} pendaftar berhasil dipindahkan ke{' '}
                      {result.target_session_name}.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        {result.moved_count} pendaftar berhasil dipindahkan,{' '}
                        {result.failed.length} tidak dipindahkan:
                      </span>
                    </div>
                    <ul className="ml-6 space-y-0.5 list-disc text-[11px] text-slate-600">
                      {result.failed.map((f) => (
                        <li key={f.applicant_id}>
                          <span className="font-semibold text-slate-800">
                            {nameById.get(f.applicant_id) || f.applicant_id}
                          </span>
                          {' '}
                          {f.detail}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={moveMutation.isPending}
          >
            {result && applicants.length > 0 ? 'Selesai' : 'Batal'}
          </Button>
          {applicants.length > 0 && (
            <Button
              size="sm"
              onClick={() => moveMutation.mutate()}
              disabled={!targetSessionId || selectedCount === 0 || moveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              {moveMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memindahkan...
                </>
              ) : result ? (
                <>Simpan Lagi ({selectedCount})</>
              ) : (
                <>Pindahkan {selectedCount > 0 ? `${selectedCount} ` : ''}Pendaftar</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
