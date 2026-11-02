'use client'

import { useState } from 'react'
import { AlertTriangle, BookOpen, FileText, Image as ImageIcon, Save, ShieldCheck } from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Label } from '@/app/components/ui/Label'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { Field } from '../CrudFormDialog'
import { getContentFields } from '../_constants'
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

const SECTION_LABELS: Record<string, string> = {
  'home-preview': 'Preview Beranda — Siapa Kami', hero: 'Hero halaman', 'story-heading': 'Pembuka perjalanan', story: 'Cerita perjalanan', vision: 'Visi', mission: 'Misi', 'values-heading': 'Pembuka nilai inti', value: 'Nilai inti', 'student-profile': 'Profil santri', 'leadership-heading': 'Pembuka struktur organisasi', cta: 'CTA pendaftaran',
}

function sectionText(section: string): string {
  return SECTION_LABELS[section] || 'Bagian Tentang Kami'
}

function contentOf(item: RowRecord | null): Record<string, unknown> {
  return item?.content && typeof item.content === 'object' ? item.content : {}
}

export function AboutFormDialog({ mode, editingItem, formData, setFormData, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)
  const section = String(formData.section ?? '')
  const fields = getContentFields('about', section)
  const statFields = section === 'home-preview'
    ? Array.from({ length: 4 }, (_, index) => {
        const number = index + 1
        return {
          number,
          value: fields.find((field) => field.name === `stat_${number}_value`)!,
          suffix: fields.find((field) => field.name === `stat_${number}_suffix`)!,
          label: fields.find((field) => field.name === `stat_${number}_label`)!,
        }
      })
    : []
  const statFieldNames = new Set(statFields.flatMap((stat) => [stat.value.name, stat.suffix.name, stat.label.name]))
  const regularFields = fields.filter((field) => !statFieldNames.has(field.name))

  function update(patch: Partial<FormState>) {
    setFormData({ ...formData, ...patch })
    if (serverError) setServerError('')
  }

  function clearFieldError(name: string) {
    setFieldErrors((previous) => {
      if (!(name in previous)) return previous
      const next = { ...previous }
      delete next[name]
      return next
    })
  }

  function fieldValue(name: string): string {
    return String(formData[`_c_${name}`] ?? '')
  }

  function setField(name: string, value: string) {
    update({ [`_c_${name}`]: value })
    clearFieldError(name)
  }

  async function requestClose() {
    if (saving || uploading) return
    if (!isDirty) { onClose(); return }
    if (await confirm(UNSAVED_CHANGES_CONFIRM)) onClose()
  }

  async function handleSave() {
    if (saving || uploading) return
    const errors: Record<string, string> = {}
    if (!section) errors.section = 'Bagian wajib dipilih.'
    if (formData.order !== '' && formData.order !== undefined && Number.isNaN(Number(formData.order))) errors.order = 'Urutan harus berupa angka.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast('error', 'Periksa kolom yang ditandai merah.')
      return
    }

    setSaving(true)
    try {
      const content: Record<string, unknown> = { ...contentOf(editingItem) }
      for (const field of fields) {
        const raw = fieldValue(field.name)
        if (field.type === 'list') {
          content[field.name] = raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
        } else if (field.name === 'body' && section === 'story') {
          content[field.name] = raw.split(/\r?\n+/).map((value) => value.trim()).filter(Boolean)
        } else {
          content[field.name] = raw
        }
      }
      const payload = {
        section,
        order: formData.order === '' || formData.order === undefined ? 0 : Number(formData.order),
        content: JSON.stringify(content),
      }
      if (mode === 'edit' && editingItem?.id) await api.updateItem(`/about/${editingItem.id}`, payload)
      else await api.createItem('/about', payload)
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Bagian Tentang Kami berhasil dibuat' : 'Bagian Tentang Kami berhasil disimpan')
    } catch (error) {
      const message = errorMessage(error, 'Gagal menyimpan bagian Tentang Kami')
      setServerError(message)
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  function renderContentField(field: { name: string; label: string; type: string }) {
    const id = `about-${field.name}`
    if (field.name === 'image' || field.name.startsWith('image_')) {
      return <div className="space-y-2"><Label htmlFor={id}>{field.label}</Label><FacilityImageField id={id} value={fieldValue(field.name)} onChange={(value) => setField(field.name, value)} onUploadingChange={setUploading} error={fieldErrors[field.name]} /></div>
    }
    if (field.type === 'list' || field.type === 'textarea') {
      return <Field label={field.label} htmlFor={id}><Textarea id={id} value={fieldValue(field.name)} onChange={(event) => setField(field.name, event.target.value)} rows={field.type === 'list' ? 5 : 4} className={TEXTAREA_CLASS} placeholder={field.type === 'list' ? 'Satu item per baris' : 'Tulis isi bagian ini...'} /></Field>
    }
    return <Field label={field.label} htmlFor={id}><Input id={id} type={field.type === 'number' ? 'number' : 'text'} value={fieldValue(field.name)} onChange={(event) => setField(field.name, event.target.value)} className={FIELD_CLASS} placeholder={field.type === 'number' ? 'Contoh: 350' : 'Tulis nilai konten...'} /></Field>
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent className="flex h-[88dvh] max-h-[900px] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)] p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl" aria-describedby="about-form-description">
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/60 to-[var(--accent-gold)]/10 px-6 py-4"><div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" /><div className="relative flex items-center gap-3.5 pr-8"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]"><BookOpen className="h-5 w-5" /></div><div className="min-w-0"><DialogTitle className="truncate font-heading text-lg font-bold leading-tight text-[var(--text)]">{mode === 'create' ? 'Tambah Bagian Tentang Kami' : 'Edit Bagian Tentang Kami'}</DialogTitle><p id="about-form-description" className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">Edit hanya konten pada bagian {sectionText(section)}.</p></div></div></div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 lg:overflow-hidden"><div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] lg:divide-x lg:divide-[var(--border)]/70"><div className="h-auto space-y-4 overflow-y-auto px-6 py-5 lg:h-full"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><Field label="Bagian" htmlFor="about-section" required><select id="about-section" value={section} onChange={(event) => update({ section: event.target.value })} className={cn(FIELD_CLASS, 'w-full border px-3 text-[var(--text)] focus:outline-none', fieldErrors.section && 'border-destructive')}><option value="">Pilih bagian</option>{Object.entries(SECTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{fieldErrors.section ? <p className="text-[11px] text-destructive">{fieldErrors.section}</p> : null}</Field><Field label="Urutan" htmlFor="about-order"><Input id="about-order" type="number" value={String(formData.order ?? '')} onChange={(event) => update({ order: event.target.value })} className={cn(FIELD_CLASS, fieldErrors.order && 'border-destructive')} placeholder="0" /></Field></div>{section ? <div className="space-y-5">{regularFields.length > 0 ? <div className="grid gap-4 sm:grid-cols-2">{regularFields.map((field) => <div key={field.name} className={field.type === 'textarea' || field.type === 'list' || field.name === 'image' ? 'sm:col-span-2' : ''}>{renderContentField(field)}</div>)}</div> : null}{statFields.length > 0 ? <section className="rounded-2xl border border-[var(--border)]/70 bg-white/80 p-4 sm:p-5"><div className="mb-4"><h3 className="text-sm font-semibold text-[var(--text)]">Statistik Beranda</h3><p className="mt-1 text-xs text-[var(--text-muted)]">Atur angka, satuan, dan label untuk setiap statistik.</p></div><div className="grid gap-3 sm:grid-cols-2">{statFields.map((stat) => <div key={stat.number} className="rounded-xl border border-[var(--border)]/70 bg-white p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-[var(--text-secondary)]">Statistik {stat.number}</span><span className="rounded-md bg-[var(--accent-subtle)] px-2 py-1 text-xs font-bold text-[var(--accent)]">{fieldValue(stat.value.name) || '—'}{fieldValue(stat.suffix.name)}</span></div><div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3"><Field label="Nilai" htmlFor={`about-${stat.value.name}`}><Input id={`about-${stat.value.name}`} type="number" value={fieldValue(stat.value.name)} onChange={(event) => setField(stat.value.name, event.target.value)} className={FIELD_CLASS} placeholder="350" /></Field><Field label="Satuan" htmlFor={`about-${stat.suffix.name}`}><Input id={`about-${stat.suffix.name}`} value={fieldValue(stat.suffix.name)} onChange={(event) => setField(stat.suffix.name, event.target.value)} className={FIELD_CLASS} placeholder="+" /></Field></div><div className="mt-3"><Field label="Label" htmlFor={`about-${stat.label.name}`}><Input id={`about-${stat.label.name}`} value={fieldValue(stat.label.name)} onChange={(event) => setField(stat.label.name, event.target.value)} className={FIELD_CLASS} placeholder="Santri Aktif" /></Field></div></div>)}</div></section> : null}</div> : <div className="rounded-2xl border border-dashed border-border bg-white/70 p-8 text-center text-sm text-[var(--text-muted)]"><FileText className="mx-auto mb-3 h-6 w-6" /><p>Pilih bagian untuk menampilkan field kontennya.</p></div>}</div><div className="min-h-0 overflow-y-auto bg-white/35 px-6 py-5"><div className="rounded-2xl border border-border/70 bg-white/80 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><ImageIcon className="h-4 w-4 text-[var(--accent)]" />Panduan pengisian</div><ul className="mt-4 space-y-3 text-xs leading-relaxed text-[var(--text-secondary)]"><li>Preview Beranda mengelola teks, gambar, nilai utama, dan statistik pada beranda.</li><li>Untuk daftar poin, tulis satu item di setiap baris.</li><li>Gambar bisa diunggah atau menggunakan URL gambar.</li><li>Urutan digunakan pada bagian yang memiliki beberapa kartu.</li></ul></div></div></div></div>

        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/95 px-6 py-3.5"><div className="mb-2.5">{serverError ? <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{serverError}</p> : null}</div><div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">{isDirty ? <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Perubahan belum disimpan</p> : <p className="hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />Konten tersinkron ke halaman publik setelah disimpan.</p>}<div className="flex w-full justify-end gap-2.5 sm:w-auto"><Button type="button" variant="ghost" onClick={() => void requestClose()} className="h-10 rounded-xl">Batal</Button><Button type="button" onClick={() => void handleSave()} loading={saving} disabled={saving || uploading} className="h-10 min-w-[150px] gap-2 rounded-xl">{!saving && <Save className="h-4 w-4" />}{saving ? 'Menyimpan...' : uploading ? 'Mengunggah...' : mode === 'create' ? 'Simpan Bagian' : 'Simpan Perubahan'}</Button></div></div></div>
      </DialogContent>
    </Dialog>
  )
}
