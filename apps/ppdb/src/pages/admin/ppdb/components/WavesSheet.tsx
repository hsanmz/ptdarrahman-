import { useState, Fragment, useMemo } from 'react'
import { ppdbService } from '@/services'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCanPage } from '@/hooks/useCan'
import { cn } from '@/lib/utils'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Badge, Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, ConfirmDialog, Sheet, SheetContent, SheetHeader, SheetTitle,
  EmptyState, Alert, CurrencyInput
} from '@/components/ui'
import {
  Plus, Edit, Trash2, CheckCircle, XCircle, Waves, Receipt, Check, Users, Banknote,
  Percent, Tag, Calculator, Sparkles, Info
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const localIso = (d: string): string => {
  const dt = new Date(d)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

const todayIso = (): string => localIso(new Date().toString())

const getNextDayIso = (dStr?: string) => {
  if (!dStr) return todayIso()
  const dt = new Date(dStr)
  dt.setDate(dt.getDate() + 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

const waveSchema = z.object({
  name: z.string().min(1, 'Nama gelombang wajib diisi'),
  registration_start_date: z.string().min(1, 'Tanggal mulai pendaftaran wajib diisi'),
  registration_end_date: z.string().min(1, 'Tanggal akhir pendaftaran wajib diisi'),
  quota: z.number().min(1, 'Kuota harus diisi minimal 1'),
  early_discount_quota: z.number().min(0, 'Jumlah harus nol atau lebih'),
}).refine(data => data.registration_end_date > data.registration_start_date, {
  message: "Tanggal akhir pendaftaran harus setelah tanggal mulai pendaftaran",
  path: ["registration_end_date"],
}).refine(data => data.early_discount_quota <= data.quota, {
  message: 'Jumlah diskon pendaftar awal tidak boleh melebihi kuota',
  path: ['early_discount_quota'],
});

type WaveFormData = z.infer<typeof waveSchema>;

const emptyWaveForm = (): WaveFormData => ({
  name: '',
  registration_start_date: '',
  registration_end_date: '',
  quota: 0,
  early_discount_quota: 0,
})

const fmtDateShort = (d: string): string =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const WAVE_MILESTONES: { step: string; label: string; get: (w: any) => string }[] = [
  { step: 'registration_start_date', label: 'Mulai Daftar', get: (w) => w.registration_start_date },
  { step: 'registration_end_date', label: 'Akhir Daftar', get: (w) => w.registration_end_date },
]

export default function WavesSheet({ period, onClose }: { period: any, onClose: () => void }) {
  const { toast } = useToast()
  const { canCrud } = useCanPage('periods')
  const queryClient = useQueryClient()

  const { data: waves = [], isLoading: loading } = useQuery({
    queryKey: ['waves', period?.id],
    queryFn: () => ppdbService.getWaves({ period_id: period.id }),
    enabled: !!period?.id
  })

  const [showForm, setShowForm] = useState(false)
  const [editingWave, setEditingWave] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<{ id: string, type: 'activate' | 'deactivate' } | null>(null)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<WaveFormData>({
    resolver: zodResolver(waveSchema),
    defaultValues: emptyWaveForm()
  })

  const startDateWatch = useWatch({ control, name: 'registration_start_date' })

  // ---------------------------------------------------------------------------
  // Dialog Diskon Biaya (2 Tab) — master komponen biaya ada di level Periode
  // ---------------------------------------------------------------------------
  const [feeDialogWave, setFeeDialogWave] = useState<any>(null)
  const [feeActiveTab, setFeeActiveTab] = useState<'regular_discount' | 'early_discount' | 'engine'>('regular_discount')
  const [feeItems, setFeeItems] = useState<any[]>([])

  // Edit Diskon Reguler (Tab 1)
  const [regularEditingItem, setRegularEditingItem] = useState<any>(null)
  const [regularDiscountType, setRegularDiscountType] = useState<'' | 'percent' | 'nominal'>('')
  const [regularDiscountValue, setRegularDiscountValue] = useState(0)

  // Edit Diskon Pendaftar Awal (Tab 2)
  const [earlyEditingItem, setEarlyEditingItem] = useState<any>(null)
  const [earlyDiscountType, setEarlyDiscountType] = useState<'' | 'percent' | 'nominal'>('')
  const [earlyDiscountValue, setEarlyDiscountValue] = useState(0)

  const openFeeDialog = async (w: any) => {
    setFeeDialogWave(w)
    setFeeActiveTab('regular_discount')
    fetchFeeItems(w.id)
  }

  const fetchFeeItems = async (wave_id: string) => {
    try {
      const res = await apiFetch<any>(`/ppdb/waves/${wave_id}/fee-items`)
      setFeeItems(res.items || [])
    } catch {
      toast('error', 'Gagal memuat item biaya')
    }
  }

  // Handle Update Diskon Reguler (Tab 1)
  const handleSaveRegularDiscount = async (item: any) => {
    if (!feeDialogWave || !canCrud) return
    if (regularDiscountType && (regularDiscountValue <= 0 || (regularDiscountType === 'percent' && regularDiscountValue > 100))) {
      toast('error', 'Nilai diskon reguler harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-discounts/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          discount_type: regularDiscountType || null,
          discount_value: regularDiscountType ? regularDiscountValue : null,
          early_discount_type: item.early_discount_type || null,
          early_discount_value: item.early_discount_value || null,
        })
      })
      setRegularEditingItem(null)
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Diskon reguler berhasil diperbarui')
    } catch (e: any) {
      toast('error', e.message || 'Gagal memperbarui diskon reguler')
    }
  }

  // Handle Update Diskon Tambahan Pendaftar Awal (Tab 2)
  const handleSaveEarlyDiscount = async (item: any) => {
    if (!feeDialogWave || !canCrud) return
    if (!item.is_period_item) return
    if (earlyDiscountType && (earlyDiscountValue <= 0 || (earlyDiscountType === 'percent' && earlyDiscountValue > 100))) {
      toast('error', 'Nilai diskon tambahan harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    if (earlyDiscountType && !(feeDialogWave?.early_discount_quota > 0)) {
      toast('error', 'Atur kuota pendaftar awal pada gelombang terlebih dahulu')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-discounts/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          discount_type: item.discount_type || null,
          discount_value: item.discount_value || null,
          early_discount_type: earlyDiscountType || null,
          early_discount_value: earlyDiscountType ? earlyDiscountValue : null,
        })
      })
      setEarlyEditingItem(null)
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Diskon pendaftar awal berhasil diperbarui')
    } catch (e: any) {
      toast('error', e.message || 'Gagal memperbarui diskon pendaftar awal')
    }
  }

  // ---------------------------------------------------------------------------
  // Mesin Perhitungan Biaya Helpers
  // ---------------------------------------------------------------------------
  const calcRegularDiscount = (item: any): number => {
    const nom = Number(item.nominal) || 0
    if (!item.discount_type || !item.discount_value) return 0
    if (item.discount_type === 'percent') {
      return Math.min(nom, Math.floor((nom * Number(item.discount_value)) / 100))
    }
    return Math.min(nom, Number(item.discount_value))
  }

  const calcRegularNet = (item: any): number => {
    const nom = Number(item.nominal) || 0
    return Math.max(0, nom - calcRegularDiscount(item))
  }

  const calcEarlyDiscount = (item: any): number => {
    const baseNominal = calcRegularNet(item)
    if (!item.early_discount_type || !item.early_discount_value) return 0
    if (item.early_discount_type === 'percent') {
      return Math.min(baseNominal, Math.floor((baseNominal * Number(item.early_discount_value)) / 100))
    }
    return Math.min(baseNominal, Number(item.early_discount_value))
  }

  const calcEarlyNet = (item: any): number => {
    const baseNominal = calcRegularNet(item)
    return Math.max(0, baseNominal - calcEarlyDiscount(item))
  }

  const engineTotals = useMemo(() => {
    let totalGross = 0
    let totalRegDiscount = 0
    let totalRegNet = 0
    let totalEarlyDiscount = 0
    let totalEarlyNet = 0

    feeItems.forEach(item => {
      const nom = Number(item.nominal) || 0
      const regDisc = calcRegularDiscount(item)
      const regNet = calcRegularNet(item)
      const earlyDisc = calcEarlyDiscount(item)
      const earlyNet = calcEarlyNet(item)

      totalGross += nom
      totalRegDiscount += regDisc
      totalRegNet += regNet
      totalEarlyDiscount += earlyDisc
      totalEarlyNet += earlyNet
    })

    return {
      totalGross,
      totalRegDiscount,
      totalRegNet,
      totalEarlyDiscount,
      totalEarlyNet,
      totalEarlyCombinedDiscount: totalRegDiscount + totalEarlyDiscount,
    }
  }, [feeItems])

  // ---------------------------------------------------------------------------
  // Gelombang Form Handlers
  // ---------------------------------------------------------------------------
  const openCreate = () => {
    setEditingWave(null)
    reset(emptyWaveForm())
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (w: any) => {
    setEditingWave(w)
    reset({
      name: w.name || '',
      registration_start_date: (w.registration_start_date || '').split('T')[0],
      registration_end_date: (w.registration_end_date || '').split('T')[0],
      quota: w.quota ?? 0,
      early_discount_quota: w.early_discount_quota ?? 0,
    })
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async (data: WaveFormData) => {
    if (!canCrud || !period) return
    const payload = {
      ...data,
      name: data.name.trim(),
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingWave) {
        await ppdbService.updateWave(editingWave.id, payload)
        toast('success', 'Gelombang berhasil diperbarui')
      } else {
        await ppdbService.createWave({ ...payload, period_id: period.id })
        toast('success', 'Gelombang berhasil ditambahkan')
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waves', period.id] }),
        queryClient.invalidateQueries({ queryKey: ['waves'] }),
        queryClient.invalidateQueries({ queryKey: ['periods'] })
      ])
      setShowForm(false)
    } catch (e: any) {
      const msg = e.message || 'Gagal menyimpan gelombang'
      setFormError(msg)
      toast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId || !canCrud) return
    try {
      await ppdbService.deleteWave(deletingId)
      toast('success', 'Gelombang berhasil dihapus')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waves', period.id] }),
        queryClient.invalidateQueries({ queryKey: ['waves'] }),
        queryClient.invalidateQueries({ queryKey: ['periods'] })
      ])
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus gelombang')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAction = async () => {
    if (!actionId || !canCrud) return
    try {
      if (actionId.type === 'activate') {
        await ppdbService.activateWave(actionId.id)
        toast('success', 'Gelombang berhasil diaktifkan')
      } else {
        await ppdbService.deactivateWave(actionId.id)
        toast('success', 'Gelombang berhasil dinonaktifkan')
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waves', period.id] }),
        queryClient.invalidateQueries({ queryKey: ['waves'] }),
        queryClient.invalidateQueries({ queryKey: ['periods'] }),
        queryClient.invalidateQueries({ queryKey: ['applicants'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })

      ])


    } catch (e: any) {
      toast('error', e.message || `Gagal ${actionId.type} gelombang`)
    } finally {
      setActionId(null)
    }
  }

  return (
    <Sheet open={!!period} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl sm:w-[720px] overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="mb-4 sm:mb-6">
          <SheetTitle className="text-lg sm:text-xl">Gelombang — {period?.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Daftar Gelombang</h3>
            {canCrud && (
              <Button size="sm" onClick={openCreate} className="gap-1 h-8 sm:h-9 text-xs sm:text-sm">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
                      <div className="h-3 w-64 rounded bg-slate-50 animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((j) => <div key={j} className="h-20 rounded-xl bg-slate-50 animate-pulse" />)}
                  </div>
                  <div className="h-12 rounded-lg bg-slate-50 animate-pulse" />
                </div>
              ))}
            </div>
          ) : waves.length === 0 ? (
            <EmptyState
              icon={Waves}
              title="Belum Ada Gelombang"
              description="Tambahkan gelombang pertama agar pendaftaran PPDB dapat berjalan untuk periode ini."
              actionLabel={canCrud ? 'Tambah Gelombang' : undefined}
              onAction={canCrud ? openCreate : undefined}
              className="bg-transparent border-transparent"
            />
          ) : (
            <div className="space-y-4">
              {waves.map((w: any) => {
                const filled = w.filled ?? 0
                const pct = w.quota > 0 ? Math.round((filled / w.quota) * 100) : 0
                const remaining = Math.max(0, w.quota - filled)
                const today = todayIso()
                const resolved = WAVE_MILESTONES.map((m) => {
                  const iso = localIso(m.get(w))
                  return { ...m, iso, done: today >= iso }
                })
                const lastDoneIdx = resolved.reduce((acc, m, i) => (m.done ? i : acc), -1)
                const activeStep = lastDoneIdx + 1 < resolved.length ? lastDoneIdx + 1 : resolved.length

                return (
                  <div
                    key={w.id}
                    className={cn(
                      'rounded-2xl border p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md',
                      w.status === 'active'
                        ? 'border-emerald-primary/40 ring-1 ring-emerald-primary/10 bg-white'
                        : 'border-slate-100 bg-white'
                    )}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                        <div className={cn(
                          'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 flex-col items-center justify-center rounded-xl font-heading text-xs font-bold leading-none',
                          w.status === 'active' ? 'bg-emerald-primary text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                        )}>
                          <span className="text-[9px] uppercase opacity-80">Gel</span>
                          {w.wave_number}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading text-sm sm:text-base font-bold text-foreground truncate">{w.name}</h3>
                            <Badge variant={w.status === 'active' ? 'success' : 'secondary'} className={w.status === 'active' ? 'bg-emerald-bright text-white' : ''}>
                              {w.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {w.status === 'active'
                              ? 'Data pendaftar, pembayaran & seleksi mengacu pada gelombang ini'
                              : 'Gelombang tidak aktif — belum menerima pendaftar'}
                          </p>
                        </div>
                      </div>

                      {canCrud && (
                        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {w.status === 'active' ? (
                            <Button variant="ghost" size="sm" onClick={() => setActionId({ id: w.id, type: 'deactivate' })} className="h-8 gap-1 px-2.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 text-xs">
                              <XCircle className="h-4 w-4 shrink-0" /> Nonaktifkan
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => setActionId({ id: w.id, type: 'activate' })} className="h-8 gap-1 bg-emerald-primary px-2.5 text-white hover:bg-emerald-dark shadow-sm text-xs">
                              <CheckCircle className="h-4 w-4 shrink-0" /> Aktifkan
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openFeeDialog(w)}
                            title="Rincian Biaya & Diskon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                          >
                            <Percent className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(w)} title="Edit" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingId(w.id)} title="Hapus" className="h-8 w-8 text-rose-danger hover:bg-rose-light shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Metrics grid */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Kuota Formulir
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900 leading-tight">
                          {filled} <span className="text-sm font-medium text-slate-400">/ {w.quota}</span>
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pct >= 90 ? 'bg-rose-danger' : 'bg-gradient-to-r from-emerald-primary to-emerald-bright'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          {remaining > 0 ? `${remaining} pembayaran tersisa` : 'Penuh'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5" /> Biaya Formulir
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900 leading-tight">
                          {period?.form_fee
                            ? `Rp ${Number(period.form_fee).toLocaleString('id-ID')}`
                            : 'Gratis'}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">Master periode — berlaku semua gelombang</p>
                      </div>
                    </div>

                    {/* Timeline strip */}
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-start">
                        {resolved.map((m, i) => (
                          <Fragment key={m.step}>
                            {i > 0 && (
                              <div className={cn(
                                'mx-1 mt-1 h-px flex-1 min-w-[8px]',
                                i <= activeStep ? 'bg-emerald-primary/40' : 'bg-slate-200'
                              )} />
                            )}
                            <div className="flex flex-col items-center gap-1 text-center" style={{ minWidth: 0, flex: 1 }}>
                              <span className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none shadow-sm',
                                m.done
                                  ? 'bg-emerald-primary text-white'
                                  : i === activeStep
                                    ? 'bg-gold-accent text-white'
                                    : 'bg-slate-100 text-slate-400'
                              )}>
                                {m.done ? <Check className="h-3 w-3" /> : i + 1}
                              </span>
                              <span className={cn(
                                'text-[10px] leading-tight px-0.5',
                                m.done || i === activeStep ? 'text-slate-700 font-medium' : 'text-slate-400'
                              )}>
                                {m.label}
                              </span>
                              <span className={cn(
                                'text-[10px] leading-tight whitespace-nowrap px-0.5',
                                m.done || i === activeStep ? 'text-slate-500' : 'text-slate-300'
                              )}>
                                {fmtDateShort(m.get(w))}
                              </span>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Modal Form Tambah / Edit Gelombang */}
      <Dialog open={showForm} onOpenChange={(v: boolean) => { setShowForm(v); if (!v) setFormError(null) }}>
        <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingWave ? 'Edit Gelombang' : 'Tambah Gelombang'}</DialogTitle>
            <DialogDescription>
              {editingWave
                ? `Ubah konfigurasi ${editingWave.name} pada periode ${period?.name}.`
                : `Konfigurasi gelombang baru untuk periode ${period?.name}. Rincian biaya diatur di panel Rincian Biaya.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-5 pt-2 max-h-[65vh] overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="wave-name">Nama Gelombang *</Label>
              <Input id="wave-name" {...register('name')} placeholder="Contoh: Gelombang 1" disabled={!canCrud} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jadwal Pendaftaran</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-start">Tanggal Mulai *</Label>
                  <Input
                    id="wave-start"
                    type="date"
                    min={editingWave ? undefined : todayIso()}
                    {...register('registration_start_date')}
                    disabled={!canCrud}
                  />
                  {errors.registration_start_date && <p className="text-xs text-red-500">{errors.registration_start_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-end">Tanggal Akhir *</Label>
                  <Input
                    id="wave-end"
                    type="date"
                    min={startDateWatch ? getNextDayIso(startDateWatch) : getNextDayIso(todayIso())}
                    {...register('registration_end_date')}
                    disabled={!canCrud}
                  />
                  {errors.registration_end_date && <p className="text-xs text-red-500">{errors.registration_end_date.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kuota Pendaftar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-quota">Kuota Pendaftar *</Label>
                  <Input
                    id="wave-quota"
                    type="number"
                    min={1}
                    {...register('quota', { valueAsNumber: true })}
                    placeholder="Contoh: 100"
                    disabled={!canCrud}
                  />
                  {errors.quota && <p className="text-xs text-red-500">{errors.quota.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-early-discount-quota">Kuota Pendaftar Awal</Label>
                  <Input
                    id="wave-early-discount-quota"
                    type="number"
                    min={0}
                    {...register('early_discount_quota', { valueAsNumber: true })}
                    placeholder="0 = tidak ada"
                    disabled={!canCrud}
                  />
                  {errors.early_discount_quota && <p className="text-xs text-red-500">{errors.early_discount_quota.message}</p>}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Biaya formulir, komponen biaya, dan minimal DP diatur di master <strong>Periode</strong>. Di gelombang ini hanya diskonnya.
              </p>
            </div>

            {formError && (
              <Alert type="error" title="Periksa kembali data Anda">{formError}</Alert>
            )}

            <p className="text-[11px] text-muted-foreground leading-snug pt-2 border-t border-dashed">
              * Dihitung dari {'{x}'} pembayaran formulir pertama yang berhasil.
            </p>

            {canCrud && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Hapus Gelombang"
        message="Apakah Anda yakin ingin menghapus gelombang ini secara permanen?"
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={!!actionId}
        onClose={() => setActionId(null)}
        title={actionId?.type === 'activate' ? 'Aktifkan Gelombang' : 'Nonaktifkan Gelombang'}
        message={actionId?.type === 'activate' ? 'Mengaktifkan gelombang ini akan menonaktifkan gelombang lain yang sedang aktif.' : 'Apakah Anda yakin ingin menonaktifkan gelombang ini?'}
        onConfirm={handleAction}
        confirmLabel="Ya, Lanjutkan"
        variant={actionId?.type === 'activate' ? 'primary' : 'destructive'}
      />

      {/* ===================================================================== */}
      {/* DIALOG RINCIAN BIAYA & DISKON (3 TAB) */}
      {/* ===================================================================== */}
      <Dialog open={!!feeDialogWave} onOpenChange={(v: boolean) => !v && setFeeDialogWave(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <DialogTitle className="text-lg">
                Rincian Biaya &amp; Diskon — {feeDialogWave?.name}
              </DialogTitle>
            </div>
            <DialogDescription>
              Master komponen biaya ada di level Periode. Di gelombang ini panitia hanya mengatur diskon reguler, diskon pendaftar awal, dan simulasi perhitungannya.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 mt-2 gap-1 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
            <button
              type="button"
              onClick={() => setFeeActiveTab('regular_discount')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0',
                feeActiveTab === 'regular_discount'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Tag className="h-3.5 w-3.5 shrink-0" />
              1. Diskon Reguler
            </button>
            <button
              type="button"
              onClick={() => setFeeActiveTab('early_discount')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0',
                feeActiveTab === 'early_discount'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              2. Diskon Awal
            </button>
            <button
              type="button"
              onClick={() => setFeeActiveTab('engine')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0',
                feeActiveTab === 'engine'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Calculator className="h-3.5 w-3.5 shrink-0" />
              3. Hitung Biaya
            </button>
          </div>

          <div className="pt-3">
            {/* --------------------------------------------------------------- */}
            {/* TAB 1: DISKON REGULER GELOMBANG */}
            {/* --------------------------------------------------------------- */}
            {feeActiveTab === 'regular_discount' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
                  <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-emerald-900">
                      Diskon reguler gelombang atas master komponen biaya periode
                    </p>
                    <p className="text-emerald-800">
                      Nominal standar tiap komponen diatur di halaman <strong>Periode</strong>. Panitia di sini hanya menentukan potongan per gelombangnya.
                    </p>
                  </div>
                </div>

                {/* Edit Diskon Reguler Inline */}
                {regularEditingItem && (
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-emerald-950">
                        Atur Diskon Reguler: <span className="text-emerald-700">{regularEditingItem.name}</span>
                      </p>
                      <span className="text-[11px] text-slate-500">
                        Standar: Rp {Number(regularEditingItem.nominal).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipe Diskon Reguler</Label>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                          value={regularDiscountType}
                          onChange={(e) => setRegularDiscountType(e.target.value as '' | 'percent' | 'nominal')}
                        >
                          <option value="">Tanpa Diskon Reguler</option>
                          <option value="percent">Persentase (%)</option>
                          <option value="nominal">Nominal Rupiah (Rp)</option>
                        </select>
                      </div>
                      {regularDiscountType && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {regularDiscountType === 'percent' ? 'Besaran Diskon (%)' : 'Besaran Diskon (Rp)'}
                          </Label>
                          {regularDiscountType === 'percent' ? (
                            <Input
                              type="number"
                              min={0.01}
                              max={100}
                              step="0.01"
                              value={regularDiscountValue || ''}
                              onChange={(e) => setRegularDiscountValue(Number(e.target.value))}
                              className="bg-white"
                            />
                          ) : (
                            <CurrencyInput
                              value={regularDiscountValue}
                              onValueChange={setRegularDiscountValue}
                              placeholder="Nominal diskon"
                              className="bg-white"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                      <Button variant="outline" size="sm" onClick={() => setRegularEditingItem(null)}>Batal</Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveRegularDiscount(regularEditingItem)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Simpan Diskon Reguler
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabel Diskon Reguler */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <Table className="min-w-[550px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center whitespace-nowrap">No</TableHead>
                        <TableHead className="whitespace-nowrap">Komponen</TableHead>
                        <TableHead className="whitespace-nowrap">Biaya Standar</TableHead>
                        <TableHead className="whitespace-nowrap">Diskon Reguler</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Harga Setelah Diskon</TableHead>
                        <TableHead className="w-20 text-right whitespace-nowrap">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                            Belum ada master komponen biaya pada periode ini. Atur di halaman Periode terlebih dahulu.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feeItems.map((item, idx) => {
                          const regDisc = calcRegularDiscount(item)
                          const regNet = calcRegularNet(item)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-center text-xs text-slate-400">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                                  {item.is_period_item ? (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal text-muted-foreground bg-slate-50">Master</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal text-amber-700 bg-amber-50">Legacy</Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700">
                                Rp {Number(item.nominal).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {item.discount_type ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {item.discount_type === 'percent'
                                      ? `${item.discount_value}% (Rp ${regDisc.toLocaleString('id-ID')})`
                                      : `Rp ${Number(item.discount_value).toLocaleString('id-ID')}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">— (Standar periode)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs font-bold text-slate-900">
                                Rp {regNet.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!item.is_period_item}
                                  onClick={() => {
                                    setRegularEditingItem(item)
                                    setRegularDiscountType(item.discount_type || '')
                                    setRegularDiscountValue(Number(item.discount_value || 0))
                                  }}
                                  className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                                  title={item.is_period_item ? 'Atur diskon' : 'Komponen legacy — hanya bisa dibaca'}
                                >
                                  <Edit className="h-3 w-3 mr-1" /> Set
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 2: DISKON PENDAFTAR PERTAMA */}
            {/* --------------------------------------------------------------- */}
            {feeActiveTab === 'early_discount' && (
              <div className="space-y-4">
                {/* Banner Info Kuota Pendaftar Awal */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                  <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-amber-900">
                      Diskon Khusus {feeDialogWave?.early_discount_quota || 0} Pendaftar Pertama
                    </p>
                    <p className="text-amber-800">
                      Diskon ini dihitung dari <strong>sisa biaya setelah diskon reguler</strong>. Calon santri yang masuk dalam kuota awal akan mendapatkan diskon dobel (Diskon Reguler Gelombang + Diskon Tambahan Pendaftar Awal).
                    </p>
                    {!(feeDialogWave?.early_discount_quota > 0) && (
                      <p className="font-semibold text-rose-700 pt-1">
                        * Perhatian: Kuota pendaftar awal saat ini 0. Harap atur kuota diskon pendaftar awal pada gelombang terlebih dahulu.
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit Diskon Tambahan Pendaftar Awal Inline */}
                {earlyEditingItem && (
                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-950">
                        Atur Diskon Pendaftar Awal: <span className="text-emerald-700">{earlyEditingItem.name}</span>
                      </p>
                      <span className="text-[11px] text-slate-500">
                        Diskon Reguler: Rp {calcRegularNet(earlyEditingItem).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipe Diskon Tambahan</Label>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                          value={earlyDiscountType}
                          onChange={(e) => setEarlyDiscountType(e.target.value as '' | 'percent' | 'nominal')}
                        >
                          <option value="">Tanpa Diskon Tambahan</option>
                          <option value="percent">Persentase (%) dari Sisa Reguler</option>
                          <option value="nominal">Nominal Rupiah (Rp)</option>
                        </select>
                      </div>
                      {earlyDiscountType && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {earlyDiscountType === 'percent' ? 'Nilai Persentase (%)' : 'Nilai Potongan (Rp)'}
                          </Label>
                          {earlyDiscountType === 'percent' ? (
                            <Input
                              type="number"
                              min={0.01}
                              max={100}
                              step="0.01"
                              value={earlyDiscountValue || ''}
                              onChange={(e) => setEarlyDiscountValue(Number(e.target.value))}
                              className="bg-white"
                            />
                          ) : (
                            <CurrencyInput
                              value={earlyDiscountValue}
                              onValueChange={setEarlyDiscountValue}
                              placeholder="Nominal potongan"
                              className="bg-white"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                      <Button variant="outline" size="sm" onClick={() => setEarlyEditingItem(null)}>Batal</Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEarlyDiscount(earlyEditingItem)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Simpan Diskon Pendaftar Awal
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabel Diskon Pendaftar Awal */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <Table className="min-w-[550px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center whitespace-nowrap">No</TableHead>
                        <TableHead className="whitespace-nowrap">Komponen</TableHead>
                        <TableHead className="whitespace-nowrap">Diskon Reguler</TableHead>
                        <TableHead className="whitespace-nowrap">Diskon Awal</TableHead>
                        <TableHead className="whitespace-nowrap">Pendaftar Awal</TableHead>
                        <TableHead className="w-20 text-right whitespace-nowrap">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                            Belum ada komponen biaya. Tambahkan komponen di Tab 1 terlebih dahulu.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feeItems.map((item, idx) => {
                          const regNet = calcRegularNet(item)
                          const earlyDisc = calcEarlyDiscount(item)
                          const earlyNet = calcEarlyNet(item)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-center text-xs text-slate-400">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                                  {item.is_period_item && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal text-muted-foreground bg-slate-50">Master</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700">
                                Rp {regNet.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {item.early_discount_type ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    {item.early_discount_type === 'percent'
                                      ? `+${item.early_discount_value}% (Rp ${earlyDisc.toLocaleString('id-ID')})`
                                      : `+Rp ${Number(item.early_discount_value).toLocaleString('id-ID')}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">— (Sama dgn Reguler)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-emerald-700">
                                Rp {earlyNet.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEarlyEditingItem(item)
                                    setEarlyDiscountType(item.early_discount_type || '')
                                    setEarlyDiscountValue(Number(item.early_discount_value || 0))
                                  }}
                                  className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                                >
                                  <Edit className="h-3 w-3 mr-1" /> Set
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 3: MESIN PERHITUNGAN BIAYA (TABEL KOMPARASI LENGKAP) */}
            {/* --------------------------------------------------------------- */}
            {feeActiveTab === 'engine' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-700">
                      Simulasi Perhitungan Biaya
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Kuota Awal: {feeDialogWave?.early_discount_quota || 0} Santri
                  </Badge>
                </div>

                {/* Tabel Simpel 5 Kolom: No, Komponen, Biaya Normal, Diskon Reguler, Pendaftar Awal */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <Table className="min-w-[550px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center font-bold text-xs whitespace-nowrap">No</TableHead>
                        <TableHead className="font-bold text-xs whitespace-nowrap">Komponen</TableHead>
                        <TableHead className="text-right font-bold text-xs whitespace-nowrap">Biaya Normal</TableHead>
                        <TableHead className="text-right font-bold text-xs bg-slate-100/50 whitespace-nowrap">Diskon Reguler</TableHead>
                        <TableHead className="text-right font-bold text-xs text-emerald-950 bg-emerald-50/60 whitespace-nowrap">
                          {feeDialogWave?.early_discount_quota ? `{${feeDialogWave.early_discount_quota}} ` : ''}Pendaftar Awal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                            Belum ada data komponen biaya.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feeItems.map((item, idx) => {
                          const nom = Number(item.nominal) || 0
                          const regDisc = calcRegularDiscount(item)
                          const regNet = calcRegularNet(item)
                          const earlyDisc = calcEarlyDiscount(item)
                          const earlyNet = calcEarlyNet(item)
                          return (
                            <TableRow key={item.id} className="hover:bg-slate-50/50">
                              <TableCell className="text-center text-xs text-slate-400 font-medium">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                                  {item.is_period_item && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal text-muted-foreground bg-slate-50">Master</Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium text-slate-600">
                                Rp {nom.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right text-xs bg-slate-50/60">
                                <p className="font-bold text-slate-900">
                                  Rp {regNet.toLocaleString('id-ID')}
                                </p>
                                {regDisc > 0 && (
                                  <p className="text-[10px] text-emerald-600 font-medium">
                                    Diskon Rp {regDisc.toLocaleString('id-ID')}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs bg-emerald-50/40">
                                <p className="font-extrabold text-emerald-800">
                                  Rp {earlyNet.toLocaleString('id-ID')}
                                </p>
                                {earlyDisc > 0 && (
                                  <p className="text-[10px] text-amber-700 font-medium">
                                    Diskon Rp {earlyDisc.toLocaleString('id-ID')}
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>

                    {/* Baris Total Simpel */}
                    {feeItems.length > 0 && (
                      <tfoot>
                        <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <TableCell colSpan={2} className="text-xs uppercase tracking-wider text-slate-800 font-extrabold py-3">
                            TOTAL BAYAR
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-700 py-3">
                            <p>Rp {engineTotals.totalGross.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-slate-500 font-normal">Normal</p>
                          </TableCell>
                          <TableCell className="text-right text-xs font-extrabold text-slate-900 bg-slate-200/50 py-3">
                            <p>Rp {engineTotals.totalRegNet.toLocaleString('id-ID')}</p>
                            {engineTotals.totalRegDiscount > 0 ? (
                              <p className="text-[10px] text-emerald-700 font-medium">
                                Hemat Rp {engineTotals.totalRegDiscount.toLocaleString('id-ID')}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-normal">Tanpa diskon</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-black text-emerald-800 bg-emerald-100/70 py-3">
                            <p>Rp {engineTotals.totalEarlyNet.toLocaleString('id-ID')}</p>
                            {engineTotals.totalEarlyCombinedDiscount > 0 ? (
                              <p className="text-[10px] text-emerald-800 font-medium">
                                Hemat Rp {engineTotals.totalEarlyCombinedDiscount.toLocaleString('id-ID')}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-normal">Tanpa diskon</p>
                            )}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    )}
                  </Table>
                </div>

                {/* 3 Ringkasan Kartu: Biaya Normal, Diskon Reguler, Pendaftar Awal */}
                {feeItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Biaya Normal
                      </p>
                      <p className="text-lg font-extrabold text-slate-900">
                        Rp {engineTotals.totalGross.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Total seluruh komponen tanpa diskon
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/60 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Diskon Reguler
                      </p>
                      <p className="text-lg font-extrabold text-emerald-900">
                        Rp {engineTotals.totalRegNet.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Total bayar (Hemat Rp {engineTotals.totalRegDiscount.toLocaleString('id-ID')})
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-600" />
                        {feeDialogWave?.early_discount_quota ? `{${feeDialogWave.early_discount_quota}} ` : ''}Pendaftar Awal
                      </p>
                      <p className="text-lg font-extrabold text-amber-950">
                        Rp {engineTotals.totalEarlyNet.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Total bayar (Hemat Rp {engineTotals.totalEarlyCombinedDiscount.toLocaleString('id-ID')})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
