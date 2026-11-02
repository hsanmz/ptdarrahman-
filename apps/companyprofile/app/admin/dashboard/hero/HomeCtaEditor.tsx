'use client'

import { useEffect, useState } from 'react'
import {
  AlignLeft,
  AlignRight,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Flame,
  Info,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import * as api from '@/app/lib/api'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import type { HomeCtaContent } from '@/app/lib/types'
import { resolvePortalUrl } from '@repo/ui'

const PORTAL_URL = resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL)
const EMPTY_CTA: HomeCtaContent = {
  enabled: true,
  title: '',
  description: '',
  button_text: 'Daftar Sekarang',
  button_url: PORTAL_URL,
  layout: 'left',
}
const LIMITS = { title: 60, description: 200, button_text: 25 }

const fieldClass =
  'w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'

export function HomeCtaEditor({ canCrud }: { canCrud: boolean }) {
  const [value, setValue] = useState<HomeCtaContent | null>(null)
  const [draft, setDraft] = useState<HomeCtaContent>(EMPTY_CTA)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getSettings()
      .then((settings) => {
        if (cancelled) return
        try {
          const parsed = JSON.parse(
            settings.find((setting) => setting.key === 'home_cta')?.value || 'null',
          ) as HomeCtaContent | null
          if (parsed && typeof parsed === 'object' && parsed.enabled) {
            const current = { ...parsed, button_url: PORTAL_URL }
            setValue(current)
            setDraft(current)
          } else {
            setValue(null)
            setDraft(EMPTY_CTA)
          }
        } catch {
          setValue(null)
        }
      })
      .catch(() => {
        if (!cancelled) toast('error', 'Gagal memuat data CTA beranda.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function setField<K extends keyof HomeCtaContent>(key: K, fieldValue: HomeCtaContent[K]) {
    setDraft((current) => ({ ...current, [key]: fieldValue }))
  }

  async function save() {
    const title = draft.title.trim()
    const description = draft.description.trim()
    const buttonText = draft.button_text.trim()
    if (!title || title.length > LIMITS.title)
      return toast('error', 'Judul wajib diisi maksimal 60 karakter.')
    if (!description || description.length > LIMITS.description)
      return toast('error', 'Deskripsi wajib diisi maksimal 200 karakter.')
    if (!buttonText || buttonText.length > LIMITS.button_text)
      return toast('error', 'Teks tombol wajib diisi maksimal 25 karakter.')

    setSaving(true)
    try {
      const next: HomeCtaContent = {
        ...draft,
        enabled: true,
        title,
        description,
        button_text: buttonText,
        button_url: PORTAL_URL,
      }
      await api.updateSetting('home_cta', JSON.stringify(next))
      setValue(next)
      setDraft(next)
      setEditing(false)
      toast('success', 'CTA beranda berhasil disimpan.')
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Gagal menyimpan CTA beranda.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (
      !(await confirm({
        title: 'Hapus CTA Beranda',
        message: 'CTA akan dihapus dan banner CTA disembunyikan dari beranda.',
        confirmLabel: 'Hapus CTA',
        cancelLabel: 'Batal',
        variant: 'danger',
      }))
    )
      return

    try {
      await api.updateSetting('home_cta', '')
      setValue(null)
      setDraft(EMPTY_CTA)
      setEditing(false)
      toast('success', 'CTA beranda dihapus.')
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Gagal menghapus CTA.')
    }
  }

  function counter(key: keyof typeof LIMITS) {
    const count = String(draft[key] || '').length
    return (
      <span className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">
        {count}/{LIMITS[key]}
      </span>
    )
  }

  const isAlignRight = (editing ? draft.layout : value?.layout) === 'right'
  const displayTitle = editing ? draft.title : value?.title
  const displayDesc = editing ? draft.description : value?.description
  const displayBtn = editing ? draft.button_text : value?.button_text

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-white/95 shadow-sm">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--bg-secondary)]/60 via-white to-[var(--accent-subtle)]/30 px-6 py-4.5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#155738] text-white shadow-md">
            <Flame className="h-5 w-5 text-[var(--accent-gold)]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-[var(--font-heading)] text-base font-bold text-[var(--text)]">
                Banner CTA Pendaftaran Beranda
              </h3>
              {value?.enabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Tayang di Bawah Hero
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  Belum Ditampilkan
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Banner ajakan resmi pendaftaran santri baru yang tampil tepat di bawah Hero Slider beranda.
            </p>
          </div>
        </div>

        {canCrud && !editing ? (
          <div className="flex items-center gap-2">
            {value ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(value)
                    setEditing(true)
                  }}
                  className="gap-2 rounded-xl text-xs font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Edit Banner CTA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void remove()}
                  className="gap-1.5 rounded-xl text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setDraft(EMPTY_CTA)
                  setEditing(true)
                }}
                className="gap-2 rounded-xl text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
                Aktifkan & Buat CTA
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Main Body */}
      {editing ? (
        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <div>
              <strong>Posisi Penayangan:</strong> Banner ini tampil <strong>tepat di bawah Hero Slider</strong> pada halaman depan (Beranda), di atas profil &amp; program pesantren untuk menarik perhatian pendaftar baru.
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form Fields */}
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="flex items-center text-xs font-bold text-[var(--text)]">
                  Judul Banner / Headline {counter('title')}
                </span>
                <Input
                  className={fieldClass}
                  maxLength={LIMITS.title}
                  value={draft.title}
                  onChange={(event) => setField('title', event.target.value)}
                  placeholder="Contoh: Mulai Perjalanan Pendidikan Terbaik di PTD Ar-Rahman"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="flex items-center text-xs font-bold text-[var(--text)]">
                  Deskripsi / Penjelasan Singkat {counter('description')}
                </span>
                <Textarea
                  className={fieldClass}
                  rows={3}
                  maxLength={LIMITS.description}
                  value={draft.description}
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder="Contoh: Pendaftaran Santri Baru Gelombang 1 telah dibuka. Segera amankan kuota pendidikan tahfidz & teknologi digital."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="flex items-center text-xs font-bold text-[var(--text)]">
                    Teks Tombol Aksi {counter('button_text')}
                  </span>
                  <Input
                    className={fieldClass}
                    maxLength={LIMITS.button_text}
                    value={draft.button_text}
                    onChange={(event) => setField('button_text', event.target.value)}
                    placeholder="Daftar Sekarang"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="block text-xs font-bold text-[var(--text)]">
                    Tujuan Tautan Tombol
                  </span>
                  <div className="relative">
                    <Input
                      className={`${fieldClass} cursor-not-allowed bg-[var(--bg-secondary)] pr-8 text-xs text-[var(--text-muted)]`}
                      type="url"
                      value={PORTAL_URL}
                      disabled
                      readOnly
                    />
                    <ExternalLink className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </label>
              </div>

              {/* Layout Picker Buttons */}
              <div>
                <span className="block text-xs font-bold text-[var(--text)] mb-2">
                  Penataan Tata Letak (Layout Card)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setField('layout', 'left')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      draft.layout === 'left'
                        ? 'border-[var(--accent)] bg-emerald-50/60 text-[var(--accent)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300'
                    }`}
                  >
                    <AlignLeft className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Teks Kiri (Default)</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Tombol di sebelah kanan</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setField('layout', 'right')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      draft.layout === 'right'
                        ? 'border-[var(--accent)] bg-emerald-50/60 text-[var(--accent)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300'
                    }`}
                  >
                    <AlignRight className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Teks Kanan</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Tombol di sebelah kiri</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview Panel */}
            <div className="flex flex-col">
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Pratinjau Tampilan Live
              </span>
              <div className="flex-1 rounded-2xl border border-[var(--accent-gold)]/25 bg-gradient-to-br from-[var(--accent)] via-[#155738] to-[#0D3823] p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--accent-gold)]/15 blur-2xl" />

                <div className={`relative z-10 ${draft.layout === 'right' ? 'text-right' : ''}`}>
                  <div className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-gold)]/35 bg-[var(--accent-gold)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold)] ${draft.layout === 'right' ? 'ml-auto' : ''}`}>
                    <Sparkles className="h-3 w-3" />
                    Penerimaan Santri Baru
                  </div>
                  <h4 className="mt-3 font-[var(--font-display)] text-lg font-bold leading-snug">
                    {draft.title || 'Judul CTA Akan Tampil di Sini...'}
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-white/80 line-clamp-3">
                    {draft.description || 'Deskripsi singkat ajakan pendaftaran akan muncul di bagian ini.'}
                  </p>
                </div>

                <div className={`relative z-10 mt-5 pt-3 border-t border-white/10 flex items-center justify-between ${draft.layout === 'right' ? 'flex-row-reverse' : ''}`}>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--accent-gold)] to-[#E5BE64] px-4 py-2 text-xs font-bold text-[#143021] shadow-md">
                    {draft.button_text || 'Daftar Sekarang'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] text-white/60">
                    Sistem Countdown &amp; Kuota PPDB Otomatis
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)]/70 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(value || EMPTY_CTA)
                setEditing(false)
              }}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              loading={saving}
              className="gap-2 rounded-xl bg-[var(--accent)] font-semibold shadow-md hover:bg-[#145337]"
            >
              <Save className="h-4 w-4" />
              Simpan Perubahan CTA
            </Button>
          </div>
        </div>
      ) : value ? (
        <div className="p-6">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--accent-gold)]/30 bg-gradient-to-br from-[var(--accent)] via-[#155738] to-[#0D3823] p-6 text-white shadow-md">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-gold)]/10 blur-3xl" />
            <div className={`relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 ${value.layout === 'right' ? 'md:flex-row-reverse' : ''}`}>
              <div className={`max-w-xl ${value.layout === 'right' ? 'md:text-right' : ''}`}>
                <div className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-gold)]/35 bg-[var(--accent-gold)]/15 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-gold)] ${value.layout === 'right' ? 'md:ml-auto' : ''}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Penerimaan Santri Baru
                </div>
                <h4 className="mt-2.5 font-[var(--font-display)] text-xl font-bold leading-tight">
                  {value.title}
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-white/80 leading-relaxed">
                  {value.description}
                </p>
              </div>

              <div className={`flex flex-col items-start gap-2 shrink-0 ${value.layout === 'right' ? 'md:items-start' : 'md:items-end'}`}>
                <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[#E5BE64] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#143021] shadow-lg">
                  {value.button_text}
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="text-[11px] text-white/70">
                  Target: {value.button_url}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              <span>
                Tata letak card: <strong>{value.layout === 'right' ? 'Teks Kanan' : 'Teks Kiri'}</strong>
              </span>
            </div>
            <span>Tampil langsung di bawah slider utama halaman depan.</span>
          </div>
        </div>
      ) : (
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <Flame className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--text)]">CTA Beranda Belum Diatur</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Klik tombol &quot;Aktifkan &amp; Buat CTA&quot; di atas untuk menampilkan banner ajakan pendaftaran di bawah Hero beranda.
          </p>
        </div>
      )}
    </section>
  )
}
