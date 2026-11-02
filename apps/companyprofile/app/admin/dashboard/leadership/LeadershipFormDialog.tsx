'use client'

import { useState } from 'react'
import { AlertTriangle, Network, Save, ShieldCheck } from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Label } from '@/app/components/ui/Label'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { Field } from '../CrudFormDialog'
import { errorMessage } from '../_types'
import type { FormState, RowRecord } from '../_types'
import { FacilityImageField } from '../facilities/FacilityImageField'

interface Props {
  mode: 'create' | 'edit'
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

const FIELD_CLASS = 'h-11 rounded-xl border-[var(--border)] bg-white/95 text-sm focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

function contentOf(item: RowRecord | null): Record<string, unknown> {
  return item?.content && typeof item.content === 'object' ? item.content : {}
}

export function LeadershipFormDialog({ mode, editingItem, formData, setFormData, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  function update(patch: Partial<FormState>) {
    setFormData({ ...formData, ...patch })
    if (serverError) setServerError('')
  }

  function setField(name: string, value: string) {
    update({ [`_c_${name}`]: value })
    setFieldErrors((previous) => {
      if (!(name in previous)) return previous
      const next = { ...previous }
      delete next[name]
      return next
    })
  }

  const value = (name: string) => String(formData[`_c_${name}`] ?? '')

  async function requestClose() {
    if (saving || uploading) return
    if (!isDirty) { onClose(); return }
    if (await confirm(UNSAVED_CHANGES_CONFIRM)) onClose()
  }

  async function handleSave() {
    if (saving || uploading) return
    const errors: Record<string, string> = {}
    if (!String(formData.board ?? '').trim()) errors.board = 'Kelompok lembaga wajib dipilih.'
    if (!value('name').trim()) errors.name = 'Nama pengurus wajib diisi.'
    if (!value('position').trim()) errors.position = 'Jabatan wajib diisi.'
    if (formData.order !== '' && formData.order !== undefined && Number.isNaN(Number(formData.order))) errors.order = 'Urutan harus berupa angka.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      toast('error', 'Periksa kolom yang ditandai merah.')
      return
    }

    setSaving(true)
    try {
      const content: Record<string, unknown> = { ...contentOf(editingItem) }
      content.name = value('name').trim()
      content.position = value('position').trim()
      content.image = value('image').trim()
      const payload = {
        board: String(formData.board).trim(),
        order: formData.order === '' || formData.order === undefined ? 0 : Number(formData.order),
        content: JSON.stringify(content),
      }
      if (mode === 'edit' && editingItem?.id) await api.updateItem(`/leadership/${editingItem.id}`, payload)
      else await api.createItem('/leadership', payload)
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Pengurus berhasil ditambahkan' : 'Data pengurus berhasil disimpan')
    } catch (error) {
      const message = errorMessage(error, 'Gagal menyimpan data pengurus')
      setServerError(message)
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent className="flex h-[88dvh] max-h-[850px] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)] p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl" aria-describedby="leadership-form-description">
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/60 to-[var(--accent-gold)]/10 px-6 py-4"><div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" /><div className="relative flex items-center gap-3.5 pr-8"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]"><Network className="h-5 w-5" /></div><div className="min-w-0"><DialogTitle className="truncate font-heading text-lg font-bold leading-tight text-[var(--text)]">{mode === 'create' ? 'Tambah Pengurus' : 'Edit Pengurus'}</DialogTitle><p id="leadership-form-description" className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">Data anggota struktur organisasi dan foto profil publik.</p></div></div></div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 lg:overflow-hidden"><div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] lg:divide-x lg:divide-[var(--border)]/70"><div className="h-auto space-y-4 overflow-y-auto px-6 py-5 lg:h-full"><div className="grid gap-3 sm:grid-cols-2"><Field label="Kelompok lembaga" htmlFor="leadership-board" required><select id="leadership-board" value={String(formData.board ?? '')} onChange={(event) => update({ board: event.target.value })} className={cn(FIELD_CLASS, 'w-full border px-3 text-[var(--text)] focus:outline-none', fieldErrors.board && 'border-destructive')}><option value="">Pilih kelompok</option><option value="yayasan">Yayasan</option><option value="islamic-center">Islamic Center</option></select>{fieldErrors.board ? <p className="text-[11px] text-destructive">{fieldErrors.board}</p> : null}</Field><Field label="Urutan tampilan" htmlFor="leadership-order"><Input id="leadership-order" type="number" value={String(formData.order ?? '')} onChange={(event) => update({ order: event.target.value })} className={cn(FIELD_CLASS, fieldErrors.order && 'border-destructive')} placeholder="0" /></Field></div><Field label="Nama pengurus" htmlFor="leadership-name" required><Input id="leadership-name" value={value('name')} onChange={(event) => setField('name', event.target.value)} className={cn(FIELD_CLASS, fieldErrors.name && 'border-destructive')} placeholder="Nama lengkap pengurus" />{fieldErrors.name ? <p className="text-[11px] text-destructive">{fieldErrors.name}</p> : null}</Field><Field label="Jabatan" htmlFor="leadership-position" required><Input id="leadership-position" value={value('position')} onChange={(event) => setField('position', event.target.value)} className={cn(FIELD_CLASS, fieldErrors.position && 'border-destructive')} placeholder="Contoh: Ketua" />{fieldErrors.position ? <p className="text-[11px] text-destructive">{fieldErrors.position}</p> : null}</Field></div><div className="min-h-0 overflow-y-auto bg-white/35 px-6 py-5"><div className="flex items-baseline justify-between gap-2"><Label htmlFor="leadership-image" className="text-[13px] font-medium text-[var(--text-secondary)]">Foto pengurus <span className="text-[11px] font-normal text-[var(--text-muted)]">(opsional)</span></Label><span className="text-[10px] text-[var(--text-muted)]">Tampil di halaman publik</span></div><div className="mt-2"><FacilityImageField id="leadership-image" value={value('image')} onChange={(image) => setField('image', image)} onUploadingChange={setUploading} error={fieldErrors.image} previewSize="large" /></div><div className="mt-5 rounded-xl border border-border/70 bg-white/75 p-4 text-xs leading-relaxed text-[var(--text-secondary)]">File yang diunggah akan disimpan sebagai URL pada data anggota CMS. URL lama juga dapat diganti atau dihapus dari sini.</div></div></div></div>
        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/95 px-6 py-3.5"><div className="mb-2.5">{serverError ? <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{serverError}</p> : null}</div><div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">{isDirty ? <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Perubahan belum disimpan</p> : <p className="hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />Kolom bertanda <span className="text-red-500">*</span> wajib diisi.</p>}<div className="flex w-full justify-end gap-2.5 sm:w-auto"><Button type="button" variant="ghost" onClick={() => void requestClose()} className="h-10 rounded-xl">Batal</Button><Button type="button" onClick={() => void handleSave()} loading={saving} disabled={saving || uploading} className="h-10 min-w-[150px] gap-2 rounded-xl">{!saving && <Save className="h-4 w-4" />}{saving ? 'Menyimpan...' : uploading ? 'Mengunggah...' : mode === 'create' ? 'Simpan Pengurus' : 'Simpan Perubahan'}</Button></div></div></div>
      </DialogContent>
    </Dialog>
  )
}
