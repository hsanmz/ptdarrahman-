'use client'

/* eslint-disable @next/next/no-img-element -- preview memakai URL gambar CMS eksternal. */

import { useState } from 'react'
import { AlertTriangle, Check, Image as ImageIcon, Link2, Save, ShieldCheck, Upload, X } from 'lucide-react'
import * as api from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Label } from '@/app/components/ui/Label'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import type { FormState, RowRecord } from '../_types'
import { errorMessage } from '../_types'

interface Props {
  mode: 'create' | 'edit'
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const FIELD_CLASS = 'h-11 rounded-xl border-[var(--border)] bg-white/95 text-sm focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

function heightMode(value: unknown): 'full' | 'peek' {
  return value === 'full' ? 'full' : 'peek'
}

export function HeroFormDialog({ mode, editingItem, formData, setFormData, onClose, onSaved }: Props) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [serverError, setServerError] = useState('')
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)
  const image = String(formData.image ?? '')
  const selectedHeight = heightMode(formData._c_height_mode)

  function update(patch: Partial<FormState>) {
    setFormData({ ...formData, ...patch })
    if (serverError) setServerError('')
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      toast('error', 'Format gambar harus JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast('error', 'Ukuran gambar maksimal 5 MB.')
      return
    }

    setUploading(true)
    try {
      const url = await api.uploadImage(file, 'hero')
      update({ image: url })
      toast('success', 'Gambar banner berhasil diunggah. Tekan Simpan untuk menerapkan.')
    } catch (error) {
      toast('error', `Upload gagal: ${errorMessage(error)}`)
    } finally {
      setUploading(false)
    }
  }

  async function requestClose() {
    if (saving || uploading) return
    if (!isDirty || await confirm(UNSAVED_CHANGES_CONFIRM)) onClose()
  }

  async function handleSave() {
    if (saving || uploading) return
    if (mode === 'create' && !image.trim()) {
      setServerError('Gambar banner wajib diisi. Upload file atau masukkan URL gambar.')
      return
    }
    if (/^https?:\/\//i.test(image)) {
      try {
        const parsed = new URL(image)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      } catch {
        setServerError('URL gambar tidak valid. Gunakan URL HTTP atau HTTPS.')
        return
      }
    }

    setSaving(true)
    try {
      const orderValue = formData.order === '' || formData.order === undefined ? 0 : Number(formData.order)
      const payload = {
        image: image.trim(),
        order: Number.isFinite(orderValue) ? orderValue : 0,
        content: JSON.stringify({ height_mode: selectedHeight }),
      }
      if (mode === 'edit' && editingItem?.id) {
        await api.updateItem(`/hero-slides/${editingItem.id}`, payload)
      } else {
        await api.createItem('/hero-slides', payload)
      }
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Banner berhasil dibuat' : 'Banner berhasil disimpan')
    } catch (error) {
      const message = errorMessage(error, 'Gagal menyimpan banner')
      setServerError(message)
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent className="flex h-[88dvh] max-h-[900px] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)] p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)]" aria-describedby="hero-form-description">
        <div className="shrink-0 border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/70 to-[var(--accent-gold)]/10 px-6 py-4">
          <DialogTitle className="font-heading text-lg font-bold text-[var(--text)]">{mode === 'create' ? 'Tambah Banner Hero' : 'Edit Banner Hero'}</DialogTitle>
          <p id="hero-form-description" className="mt-1 text-xs text-[var(--text-secondary)]">Hero beranda hanya memakai gambar banner tanpa teks atau tombol CTA.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 lg:overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] lg:divide-x lg:divide-[var(--border)]/70">
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <section className="rounded-2xl border border-[var(--border)]/70 bg-white/85 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><ImageIcon className="h-4 w-4 text-[var(--accent)]" />Gambar Banner</div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Gunakan gambar horizontal 16:9 agar aman di desktop dan mobile.</p>
                <div className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[var(--bg-secondary)] p-1">
                  {(['upload', 'url'] as const).map((item) => (
                    <button key={item} type="button" onClick={() => setImageMode(item)} className={cn('flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all', imageMode === item ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)]')}>
                      {item === 'upload' ? <Upload className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                      {item === 'upload' ? 'Upload File' : 'URL Gambar'}
                    </button>
                  ))}
                </div>

                {imageMode === 'upload' ? (
                  <label className="group mt-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/60 px-4 py-7 text-center transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)]/60">
                    <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]"><Upload className={cn('h-5 w-5', uploading && 'animate-pulse')} /></span>
                    <span className="text-sm font-semibold text-[var(--text)]">{uploading ? 'Mengunggah...' : 'Pilih gambar banner'}</span>
                    <span className="text-xs text-[var(--text-muted)]">JPG, PNG, atau WebP · maksimal 5 MB</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" disabled={uploading} />
                  </label>
                ) : (
                  <div className="relative mt-4">
                    <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <Input className={cn(FIELD_CLASS, 'pl-9')} type="url" value={image} onChange={(event) => update({ image: event.target.value })} placeholder="https://example.com/banner.webp" />
                  </div>
                )}

                {image ? (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--border)]/70 bg-white/70 p-3">
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"><img src={resolveImageSrc(image, api.API_BASE)} alt="Pratinjau banner" className="h-full w-full object-cover object-center" /></div>
                    <p className="min-w-0 flex-1 break-all text-xs leading-relaxed text-[var(--text-secondary)]">{image}</p>
                    <button type="button" onClick={() => update({ image: '' })} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500" aria-label="Hapus gambar banner"><X className="h-4 w-4" /></button>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-[var(--border)]/70 bg-white/85 p-5">
                <div className="flex items-center justify-between gap-3"><div><Label className="text-sm font-semibold text-[var(--text)]">Ukuran Tampilan</Label><p className="mt-1 text-xs text-[var(--text-muted)]">Pilih tinggi banner yang disimpan bersama gambar.</p></div><span className="text-xs text-[var(--text-muted)]">Wajib</span></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {([
                    { value: 'full' as const, title: 'Opsi A — Tanpa Ruang Bawah', description: 'Gambar tampil utuh sesuai rasio aslinya.', formula: 'lebar penuh · tinggi otomatis' },
                    { value: 'peek' as const, title: 'Opsi B — Ruang Bawah 10%', description: 'Gambar tetap utuh, dengan ruang kosong 10% layar di bawahnya.', formula: 'gambar + 10vh ruang bawah' },
                  ]).map((option) => (
                    <button key={option.value} type="button" onClick={() => update({ _c_height_mode: option.value })} className={cn('rounded-xl border p-4 text-left transition-colors', selectedHeight === option.value ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/60' : 'border-[var(--border)] bg-white hover:border-[var(--accent)]/50')}>
                      <span className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-[var(--text)]">{option.title}</span><span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selectedHeight === option.value ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]')}>{selectedHeight === option.value ? <Check className="h-3 w-3" /> : null}</span></span>
                      <span className="mt-2 block text-xs leading-relaxed text-[var(--text-secondary)]">{option.description}</span>
                      <span className="mt-2 block font-mono text-[10px] text-[var(--text-muted)]">{option.formula}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="overflow-y-auto bg-white/35 px-6 py-5">
              <div className="rounded-2xl border border-[var(--border)]/70 bg-white/80 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]"><ShieldCheck className="h-4 w-4 text-[var(--accent)]" />Aturan Gambar Banner</div>
                <ul className="mt-4 space-y-3 text-xs leading-relaxed text-[var(--text-secondary)]"><li>Format yang diterima: JPG, PNG, dan WebP.</li><li>Ukuran file maksimal 5 MB.</li><li>Rekomendasi ukuran 1920 × 1080 px dengan rasio 16:9.</li><li>Gambar ditampilkan utuh dengan tinggi otomatis mengikuti rasio asli, sehingga tidak terpotong atau gepeng.</li><li>Opsi B menambahkan ruang kosong 10vh di bawah gambar sebelum section berikutnya.</li><li>Hero publik hanya menampilkan gambar. Judul, subtitle, dan tombol CTA lama tidak lagi dirender.</li></ul>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)]/70 bg-[var(--bg-secondary)]">
                <div className="border-b border-[var(--border)]/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Preview Tampilan</div>
                {image ? <img src={resolveImageSrc(image, api.API_BASE)} alt="Preview banner" className="block h-auto w-full object-contain object-center" /> : <div className="flex aspect-video items-center justify-center text-xs text-[var(--text-muted)]">Belum ada gambar</div>}
                {selectedHeight === 'peek' ? <div className="h-8 border-t border-dashed border-[var(--border)] px-3 py-2 text-[10px] text-[var(--text-muted)]">Ruang kosong 10vh di bawah gambar</div> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/95 px-6 py-3.5">
          {serverError ? <p role="alert" className="mb-3 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{serverError}</p> : null}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"><p className="hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />Gambar tersinkron setelah disimpan.</p><div className="flex w-full justify-end gap-2.5 sm:w-auto"><Button type="button" variant="ghost" onClick={() => void requestClose()} className="h-10 rounded-xl">Batal</Button><Button type="button" onClick={() => void handleSave()} loading={saving} disabled={saving || uploading} className="h-10 min-w-[150px] gap-2 rounded-xl">{!saving && <Save className="h-4 w-4" />}{saving ? 'Menyimpan...' : 'Simpan Banner'}</Button></div></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
