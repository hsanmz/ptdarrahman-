'use client'
/* eslint-disable @next/next/no-img-element -- Gambar thumbnail CMS admin */

import {
  BookOpen, CheckCircle2, FileText, Image as ImageIcon, Info, Megaphone,
  Pencil, Plus, ShieldCheck, Target, Trash2, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { cn } from '@/app/lib/utils'
import { resolveImageSrc } from '@/app/lib/image-file'
import * as api from '@/app/lib/api'
import type { RowRecord } from '../_types'

interface Props {
  items: RowRecord[]
  canCrud: boolean
  detailLoading: string | null
  onCreate: (section: string) => void
  onEdit: (item: RowRecord) => void
  onDelete: (item: RowRecord) => void
}

const SECTION_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  'home-preview': { label: 'Preview Beranda — Siapa Kami', description: 'Konten, gambar, dan nilai utama pada beranda.', icon: Info },
  hero: { label: 'Hero halaman', description: 'Judul, pembuka, visual, dan tombol utama.', icon: ImageIcon },
  'story-heading': { label: 'Pembuka perjalanan', description: 'Judul dan pengantar bagian perjalanan.', icon: BookOpen },
  story: { label: 'Cerita perjalanan', description: 'Bab-bab cerita yang tampil berurutan.', icon: FileText },
  vision: { label: 'Visi', description: 'Arah besar pendidikan institusi.', icon: Target },
  mission: { label: 'Misi', description: 'Poin kerja yang dijalankan setiap hari.', icon: CheckCircle2 },
  'values-heading': { label: 'Pembuka nilai inti', description: 'Pengantar untuk kartu nilai inti.', icon: ShieldCheck },
  value: { label: 'Nilai inti', description: 'Kartu nilai dan karakter pendidikan.', icon: ShieldCheck },
  'student-profile': { label: 'Profil santri', description: 'Bekal dan karakter santri yang dituju.', icon: Users },
  'leadership-heading': { label: 'Pembuka struktur organisasi', description: 'Judul dan pengantar susunan pengurus.', icon: Info },
  cta: { label: 'CTA pendaftaran', description: 'Ajakan pendaftaran di bagian akhir halaman.', icon: Megaphone },
}

const SECTION_ORDER = Object.keys(SECTION_META)

function valueOf(item: RowRecord, key: string): string {
  const value = item.content && typeof item.content === 'object' ? item.content[key] : undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function previewOf(item: RowRecord): string {
  const content = item.content && typeof item.content === 'object' ? item.content : {}
  const body = typeof content.body === 'string' ? content.body : ''
  const description = typeof content.description === 'string' ? content.description : ''
  const list = Array.isArray(content.items) ? `${content.items.length} poin` : ''
  return body || description || list || 'Belum ada ringkasan konten.'
}

export function AboutContentBoard({ items, canCrud, detailLoading, onCreate, onEdit, onDelete }: Props) {
  const grouped = new Map<string, RowRecord[]>()
  for (const item of items) {
    const rows = grouped.get(item.section || '') ?? []
    rows.push(item)
    grouped.set(item.section || '', rows)
  }

  const sections = [
    ...SECTION_ORDER,
    ...[...grouped.keys()].filter((section) => !SECTION_META[section]),
  ]

  async function requestDelete(item: RowRecord) {
    const title = valueOf(item, 'title') || valueOf(item, 'eyebrow') || 'bagian ini'
    if (await confirm({ title: 'Hapus bagian Tentang Kami', message: `Yakin ingin menghapus "${title}"? Tindakan ini tidak bisa dibatalkan.`, confirmLabel: 'Ya, Hapus', cancelLabel: 'Batal', variant: 'danger' })) onDelete(item)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent-subtle)]/45 px-5 py-4 text-sm text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--text)]">Konten Tentang Kami dipisah per bagian</p>
        <p className="mt-1">Edit satu kartu sesuai bagiannya. Perubahan hanya menyentuh blok yang dipilih dan langsung dibaca halaman publik.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => {
          const meta = SECTION_META[section] ?? { label: section, description: 'Bagian About tambahan.', icon: FileText }
          const Icon = meta.icon
          const rows = (grouped.get(section) ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          return (
            <Card key={section} className="overflow-hidden rounded-2xl border-border/70 bg-white/80 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-[var(--bg-secondary)]/55 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-bold text-[var(--text)]">{meta.label}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{meta.description}</p>
                  </div>
                </div>
                {canCrud && (
                  <Button type="button" size="sm" variant="outline" onClick={() => onCreate(section)} className="shrink-0 gap-1.5 rounded-lg px-2.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </Button>
                )}
              </div>

              <div className="space-y-2.5 p-4">
                {rows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 px-4 py-5 text-center text-xs text-[var(--text-muted)]">
                    Belum ada data bagian ini.
                    {canCrud ? <button type="button" onClick={() => onCreate(section)} className="ml-1 font-semibold text-[var(--accent)] hover:underline">Tambah sekarang</button> : null}
                  </div>
                ) : rows.map((item) => {
                  const title = valueOf(item, 'title') || valueOf(item, 'name') || valueOf(item, 'eyebrow') || `Item urutan ${item.order ?? 0}`
                  const image = valueOf(item, 'image') || valueOf(item, 'image_1')
                  return (
                    <div key={item.id} className="group flex items-start gap-3 rounded-xl border border-border/60 bg-white px-3.5 py-3 transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-subtle)]/20">
                      {image ? <img src={resolveImageSrc(image, api.API_BASE)} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-border/70 object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)]"><Icon className="h-4 w-4" /></span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-[var(--text)]">{title}</p><span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">Urutan {item.order ?? 0}</span></div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">{previewOf(item)}</p>
                      </div>
                      {canCrud && <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100"><Button type="button" variant="ghost" size="sm" disabled={detailLoading === item.id} onClick={() => onEdit(item)} aria-label={`Edit ${title}`} className="h-8 w-8 rounded-lg p-0 text-[var(--accent)]"><Pencil className={cn('h-3.5 w-3.5', detailLoading === item.id && 'animate-pulse')} /></Button><Button type="button" variant="ghost" size="sm" onClick={() => void requestDelete(item)} aria-label={`Hapus ${title}`} className="h-8 w-8 rounded-lg p-0 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button></div>}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
