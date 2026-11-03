'use client'

import { useState } from 'react'
import { AlertTriangle, BookOpen, CheckCircle2, FileText, GraduationCap, Save, ShieldCheck } from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { Field, FormSection } from '../CrudFormDialog'
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
const TEXTAREA_CLASS = 'min-h-[7rem] resize-y rounded-xl border-[var(--border)] bg-white/95 leading-relaxed focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

function contentOf(item: RowRecord | null): Record<string, unknown> {
  return item?.content && typeof item.content === 'object' ? item.content : {}
}

export function ProgramFormDialog({ mode, editingItem, formData, setFormData, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const value = (name: string) => String(formData[`_c_${name}`] ?? '')

  function update(patch: Partial<FormState>) {
    setFormData({ ...formData, ...patch })
    if (serverError) setServerError('')
  }

  function setContent(name: string, next: string) {
    update({ [`_c_${name}`]: next })
    setFieldErrors((previous) => {
      if (!(name in previous)) return previous
      const result = { ...previous }
      delete result[name]
      return result
    })
  }

  async function requestClose() {
    if (saving || uploading) return
    if (!isDirty) { onClose(); return }
    if (await confirm(UNSAVED_CHANGES_CONFIRM)) onClose()
  }

  async function handleSave() {
    if (saving || uploading) return
    const errors: Record<string, string> = {}
    if (!value('title').trim()) errors.title = 'Judul program wajib diisi.'
    if (formData.order !== '' && formData.order !== undefined && Number.isNaN(Number(formData.order))) errors.order = 'Urutan harus berupa angka.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      toast('error', 'Periksa kolom yang ditandai merah.')
      return
    }

    setSaving(true)
    try {
      const content: Record<string, unknown> = { ...contentOf(editingItem) }
      content.title = value('title').trim()
      content.tagline = value('tagline').trim()
      content.desc = value('desc').trim()
      content.duration = value('duration').trim()
      content.level = value('level').trim()
      for (const name of ['highlights', 'curriculum', 'outcomes']) {
        content[name] = value(name).split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      }

      const payload = {
        icon: String(formData.icon ?? '').trim(),
        order: formData.order === '' || formData.order === undefined ? 0 : Number(formData.order),
        image: String(formData.image ?? '').trim(),
        content: JSON.stringify(content),
      }
      if (mode === 'edit' && editingItem?.id) await api.updateItem(`/programs/${editingItem.id}`, payload)
      else await api.createItem('/programs', payload)
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Program berhasil dibuat' : 'Program berhasil disimpan')
    } catch (error) {
      const message = errorMessage(error, 'Gagal menyimpan program')
      setServerError(message)
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  const titleError = fieldErrors.title
  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent className="flex h-[88dvh] max-h-[900px] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)] p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl" aria-describedby="program-form-description">
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/60 to-[var(--accent-gold)]/10 px-6 py-4"><div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" /><div className="relative flex items-center gap-3.5 pr-8"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]"><GraduationCap className="h-5 w-5" /></div><div className="min-w-0"><DialogTitle className="truncate font-heading text-lg font-bold leading-tight text-[var(--text)]">{mode === 'create' ? 'Tambah Program' : 'Edit Program'}</DialogTitle><p id="program-form-description" className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">Kelola informasi program pendidikan, kurikulum, dan visual program.</p></div></div></div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 lg:overflow-hidden"><div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] lg:divide-x lg:divide-[var(--border)]/70"><div className="h-auto space-y-4 overflow-y-auto px-6 py-5 lg:h-full"><FormSection label="Identitas Program" icon={BookOpen}><div className="grid gap-4 sm:grid-cols-2"><Field label="Judul Program" htmlFor="program-title" required wide><Input id="program-title" value={value('title')} onChange={(event) => setContent('title', event.target.value)} className={cn(FIELD_CLASS, titleError && 'border-destructive')} placeholder="Contoh: Tahfidz dan Digital" />{titleError ? <p className="mt-1 text-[11px] text-destructive">{titleError}</p> : null}</Field><Field label="Tagline" htmlFor="program-tagline"><Input id="program-tagline" value={value('tagline')} onChange={(event) => setContent('tagline', event.target.value)} className={FIELD_CLASS} placeholder="Kalimat singkat program" /></Field><Field label="Durasi" htmlFor="program-duration"><Input id="program-duration" value={value('duration')} onChange={(event) => setContent('duration', event.target.value)} className={FIELD_CLASS} placeholder="Contoh: 6 tahun" /></Field><Field label="Tingkat" htmlFor="program-level"><Input id="program-level" value={value('level')} onChange={(event) => setContent('level', event.target.value)} className={FIELD_CLASS} placeholder="Contoh: SMP - SMA" /></Field><Field label="Ikon" htmlFor="program-icon"><Input id="program-icon" value={String(formData.icon ?? '')} onChange={(event) => update({ icon: event.target.value })} className={FIELD_CLASS} placeholder="Nama ikon atau simbol program" /></Field><Field label="Urutan Tampilan" htmlFor="program-order"><Input id="program-order" type="number" value={String(formData.order ?? '')} onChange={(event) => update({ order: event.target.value })} className={cn(FIELD_CLASS, fieldErrors.order && 'border-destructive')} placeholder="0" /></Field></div></FormSection><FormSection label="Deskripsi Program" icon={FileText}><Field label="Deskripsi" htmlFor="program-desc"><Textarea id="program-desc" value={value('desc')} onChange={(event) => setContent('desc', event.target.value)} rows={5} className={TEXTAREA_CLASS} placeholder="Jelaskan pendekatan dan pengalaman belajar program..." /></Field></FormSection><div className="grid gap-4 sm:grid-cols-3"><Field label="Keunggulan (1 per baris)" htmlFor="program-highlights"><Textarea id="program-highlights" value={value('highlights')} onChange={(event) => setContent('highlights', event.target.value)} rows={7} className={TEXTAREA_CLASS} placeholder="Tahfidz intensif\nKelas digital\nPembinaan karakter" /></Field><Field label="Kurikulum (1 per baris)" htmlFor="program-curriculum"><Textarea id="program-curriculum" value={value('curriculum')} onChange={(event) => setContent('curriculum', event.target.value)} rows={7} className={TEXTAREA_CLASS} placeholder="Tahfidz\nBahasa\nTeknologi" /></Field><Field label="Hasil (1 per baris)" htmlFor="program-outcomes"><Textarea id="program-outcomes" value={value('outcomes')} onChange={(event) => setContent('outcomes', event.target.value)} rows={7} className={TEXTAREA_CLASS} placeholder="Hafalan terarah\nKeterampilan digital" /></Field></div></div><div className="min-h-0 overflow-y-auto bg-white/35 px-6 py-5"><div className="flex items-baseline justify-between gap-2"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--accent-gold)]" /><span className="text-[13px] font-medium text-[var(--text-secondary)]">Visual Program</span></div><span className="text-[10px] text-[var(--text-muted)]">Opsional</span></div><div className="mt-2"><FacilityImageField id="program-image" value={String(formData.image ?? '')} onChange={(image) => update({ image })} onUploadingChange={setUploading} /></div><div className="mt-5 rounded-xl border border-border/70 bg-white/75 p-4 text-xs leading-relaxed text-[var(--text-secondary)]">Gambar ditampilkan pada kartu program dan halaman detail. Anda bisa mengunggah file atau memasukkan URL gambar yang sudah tersedia.</div></div></div></div>

        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/95 px-6 py-3.5"><div className="mb-2.5">{serverError ? <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{serverError}</p> : null}</div><div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">{isDirty ? <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Perubahan belum disimpan</p> : <p className="hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />Data program tersinkron setelah disimpan.</p>}<div className="flex w-full justify-end gap-2.5 sm:w-auto"><Button type="button" variant="ghost" onClick={() => void requestClose()} className="h-10 rounded-xl">Batal</Button><Button type="button" onClick={() => void handleSave()} loading={saving} disabled={saving || uploading} className="h-10 min-w-[150px] gap-2 rounded-xl">{!saving && <Save className="h-4 w-4" />}{saving ? 'Menyimpan...' : uploading ? 'Mengunggah...' : mode === 'create' ? 'Simpan Program' : 'Simpan Perubahan'}</Button></div></div></div>
      </DialogContent>
    </Dialog>
  )
}
