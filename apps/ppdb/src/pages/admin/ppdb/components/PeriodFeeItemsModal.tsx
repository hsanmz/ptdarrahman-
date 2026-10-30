import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  CurrencyInput,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  ConfirmDialog,
  Badge,
} from '@/components/ui'
import {
  Plus,
  Edit,
  Trash2,
  Banknote,
  Info,
  Layers,
} from 'lucide-react'

interface PeriodFeeItemsModalProps {
  period: any
  open: boolean
  onClose: () => void
  canManage?: boolean
}

interface FeeItemFormData {
  id?: string
  name: string
  nominal: number
  description: string
  order_index: number
}

const formatIdr = (val: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)

export default function PeriodFeeItemsModal({
  period,
  open,
  onClose,
  canManage = true,
}: PeriodFeeItemsModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FeeItemFormData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FeeItemFormData>({
    name: '',
    nominal: 0,
    description: '',
    order_index: 1,
  })
  const [submitting, setSubmitting] = useState(false)

  const {
    data: feeData,
    isLoading,
  } = useQuery({
    queryKey: ['period-fee-items', period?.id],
    queryFn: async () => {
      if (!period?.id) return { items: [] }
      return await ppdbService.getPeriodFeeItems(period.id)
    },
    enabled: Boolean(open && period?.id),
  })

  const items: any[] = feeData?.items || []
  const totalStandardFee = items.reduce(
    (sum, it) => sum + (Number(it.nominal) || 0),
    0
  )

  const openCreate = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      nominal: 0,
      description: '',
      order_index: items.length + 1,
    })
    setFormOpen(true)
  }

  const openEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      id: item.id,
      name: item.name || '',
      nominal: Number(item.nominal) || 0,
      description: item.description || '',
      order_index: item.order_index || 1,
    })
    setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast('error', 'Nama komponen biaya wajib diisi')
      return
    }
    if (formData.nominal <= 0) {
      toast('error', 'Nominal biaya harus lebih dari 0')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem?.id) {
        await ppdbService.updatePeriodFeeItem(period.id, editingItem.id, {
          name: formData.name.trim(),
          nominal: Number(formData.nominal),
          description: formData.description.trim() || undefined,
          order_index: Number(formData.order_index) || 1,
        })
        toast('success', 'Komponen biaya berhasil diperbarui')
      } else {
        await ppdbService.createPeriodFeeItem(period.id, {
          name: formData.name.trim(),
          nominal: Number(formData.nominal),
          description: formData.description.trim() || undefined,
          order_index: Number(formData.order_index) || 1,
        })
        toast('success', 'Komponen biaya berhasil ditambahkan')
      }

      await queryClient.invalidateQueries({
        queryKey: ['period-fee-items', period.id],
      })
      await queryClient.invalidateQueries({ queryKey: ['periods'] })
      await queryClient.invalidateQueries({ queryKey: ['wave-fee-items'] })
      setFormOpen(false)
    } catch (err: any) {
      toast('error', err.message || 'Gagal menyimpan komponen biaya')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setSubmitting(true)
    try {
      await ppdbService.deletePeriodFeeItem(period.id, deletingId)
      toast('success', 'Komponen biaya berhasil dihapus')
      await queryClient.invalidateQueries({
        queryKey: ['period-fee-items', period.id],
      })
      await queryClient.invalidateQueries({ queryKey: ['periods'] })
      await queryClient.invalidateQueries({ queryKey: ['wave-fee-items'] })
      setDeletingId(null)
    } catch (err: any) {
      toast('error', err.message || 'Gagal menghapus komponen biaya')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 pr-16 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Banknote className="h-5 w-5 text-primary" />
                  Master Komponen Biaya Pendidikan
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Periode: <span className="font-semibold text-foreground">{period?.name}</span>{' '}
                  ({period?.academic_year || 'Tahun Ajaran'})
                </DialogDescription>
              </div>
              {canManage && (
                <Button onClick={openCreate} size="sm" className="gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" />
                  Tambah Komponen
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Notice info */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <Info className="h-4 w-4 text-primary" />
                Informasi Biaya Pendidikan (Di Luar Aplikasi)
              </div>
              <p>
                Komponen biaya master di bawah ini menjadi acuan standar untuk seluruh gelombang pada periode ini.
                Di setiap gelombang, panitia cukup menentukan persentase atau nominal diskon (reguler & pendaftar awal).
              </p>
              <p className="text-emerald-700 font-medium">
                Pembayaran biaya pendidikan dilakukan di luar aplikasi (transfer rekening resmi PTDARRAHMAN atau tunai di kantor bendahara pesantren).
              </p>
            </div>

            {/* Total Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3.5 space-y-1 shadow-sm">
                <span className="text-xs text-muted-foreground font-medium">
                  Total Standar Biaya Masuk
                </span>
                <div className="text-xl font-bold text-foreground">
                  {formatIdr(totalStandardFee)}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3.5 space-y-1 shadow-sm">
                <span className="text-xs text-muted-foreground font-medium">
                  Jumlah Komponen Terdaftar
                </span>
                <div className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span>{items.length} Komponen</span>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Standar Periode
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3.5 space-y-1 shadow-sm">
                <span className="text-xs text-muted-foreground font-medium">
                  Biaya Formulir (QRIS)
                </span>
                <div className="text-xl font-bold text-foreground">
                  {period?.form_fee ? formatIdr(Number(period.form_fee)) : 'Gratis'}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3.5 space-y-1 shadow-sm">
                <span className="text-xs text-muted-foreground font-medium">
                  Minimal DP (di LoA)
                </span>
                <div className="text-xl font-bold text-foreground">
                  {formatIdr(Number(period?.minimum_dp) || 0)}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Nama Komponen Biaya</TableHead>
                    <TableHead className="text-right">Nominal Standar</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    {canManage && <TableHead className="w-24 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        Memuat data komponen biaya...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Layers className="h-8 w-8 text-muted-foreground/40" />
                          <div className="text-sm font-medium">Belum ada komponen biaya</div>
                          <div className="text-xs text-muted-foreground max-w-sm">
                            Tambahkan komponen seperti Biaya Pembangunan, SPP Bulan Pertama, Seragam, dsb.
                          </div>
                          {canManage && (
                            <Button onClick={openCreate} size="sm" variant="outline" className="mt-2 text-xs">
                              <Plus className="h-3.5 w-3.5 mr-1" /> Buat Komponen Pertama
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {item.order_index || idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-700">
                          {formatIdr(Number(item.nominal) || 0)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={item.description}>
                          {item.description || '-'}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(item)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingId(item.id)}
                                className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog for Create/Edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Komponen Biaya' : 'Tambah Komponen Biaya'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Komponen biaya standar untuk periode {period?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name" className="text-xs font-semibold">
                Nama Komponen Biaya <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="item-name"
                placeholder="Contoh: Biaya Pembangunan / Uang Pangkal"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-nominal" className="text-xs font-semibold">
                Nominal Standar (Rp) <span className="text-rose-500">*</span>
              </Label>
              <CurrencyInput
                id="item-nominal"
                value={formData.nominal}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, nominal: val }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-desc" className="text-xs font-semibold">
                Deskripsi / Keterangan (Opsional)
              </Label>
              <Input
                id="item-desc"
                placeholder="Contoh: Termasuk seragam santri, buku paket, dan matrikulasi"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-order" className="text-xs font-semibold">
                Urutan Tampilan
              </Label>
              <Input
                id="item-order"
                type="number"
                min={1}
                value={formData.order_index}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    order_index: parseInt(e.target.value, 10) || 1,
                  }))
                }
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="Hapus Komponen Biaya"
        message="Apakah Anda yakin ingin menghapus komponen biaya ini dari periode? Komponen ini tidak akan lagi muncul di gelombang dan LoA santri baru."
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />
    </>
  )
}
