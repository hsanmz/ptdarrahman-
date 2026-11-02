'use client'

import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { resolveImageSrc } from '@/app/lib/image-file'
import * as api from '@/app/lib/api'
import type { RowRecord } from '../_types'
import { BOARD_TITLES } from '@/app/data/leadership'

interface Props {
  items: RowRecord[]
  canCrud: boolean
  detailLoading: string | null
  onCreate: (board: string) => void
  onEdit: (item: RowRecord) => void
  onDelete: (item: RowRecord) => void
}

const BOARD_ORDER = ['yayasan', 'islamic-center']

function boardLabel(board: string): string {
  return BOARD_TITLES[board] ?? board.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function contentOf(item: RowRecord): Record<string, unknown> {
  return item.content && typeof item.content === 'object' ? item.content : {}
}

export function LeadershipCards({ items, canCrud, detailLoading, onCreate, onEdit, onDelete }: Props) {
  const boards = [...new Set([...BOARD_ORDER, ...items.map((item) => String(item.board || 'lainnya'))])]

  async function requestDelete(item: RowRecord) {
    const content = contentOf(item)
    const name = typeof content.name === 'string' ? content.name : 'pengurus ini'
    if (await confirm({ title: 'Hapus pengurus', message: `Yakin ingin menghapus "${name}"? Tindakan ini tidak bisa dibatalkan.`, confirmLabel: 'Ya, Hapus', cancelLabel: 'Batal', variant: 'danger' })) onDelete(item)
  }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent-subtle)]/45 px-5 py-4 text-sm text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--text)]">Foto pengurus dikelola dari CMS</p>
        <p className="mt-1">Gunakan tombol Edit untuk mengunggah file atau memasukkan URL. Gambar yang tampil di halaman publik berasal dari field anggota ini, bukan gambar statis.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {boards.map((board) => {
          const members = items.filter((item) => (item.board || 'lainnya') === board).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          return (
            <Card key={board} className="overflow-hidden rounded-2xl border-border/70 bg-white/80 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-[var(--bg-secondary)]/55 px-5 py-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]"><Users className="h-5 w-5" /></span><div><h3 className="font-heading text-base font-bold text-[var(--text)]">{boardLabel(board)}</h3><p className="mt-0.5 text-xs text-[var(--text-muted)]">{members.length} anggota terdaftar</p></div></div>{canCrud && <Button type="button" size="sm" variant="outline" onClick={() => onCreate(board)} className="shrink-0 gap-1.5 rounded-lg px-2.5 text-xs"><Plus className="h-3.5 w-3.5" /> Tambah</Button>}</div>
              <div className="grid gap-2.5 p-4 sm:grid-cols-2">
                {members.length === 0 ? <div className="rounded-xl border border-dashed border-border/80 px-4 py-5 text-center text-xs text-[var(--text-muted)] sm:col-span-2">Belum ada anggota di kelompok ini.</div> : members.map((item) => { const content = contentOf(item); const name = typeof content.name === 'string' ? content.name : 'Tanpa nama'; const position = typeof content.position === 'string' ? content.position : ''; const image = typeof content.image === 'string' ? content.image : ''; return <div key={item.id} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3 hover:border-[var(--accent)]/30"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border/70 bg-[var(--accent-subtle)]">{image ? <img src={resolveImageSrc(image, api.API_BASE)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--accent)]">{name.slice(0, 2).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--text)]">{name}</p><p className="mt-0.5 truncate text-xs text-[var(--accent)]">{position || 'Jabatan belum diisi'}</p></div>{canCrud && <div className="flex shrink-0 gap-0.5 opacity-70 group-hover:opacity-100"><Button type="button" variant="ghost" size="sm" disabled={detailLoading === item.id} onClick={() => onEdit(item)} className="h-8 w-8 rounded-lg p-0 text-[var(--accent)]" aria-label={`Edit ${name}`}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="sm" onClick={() => void requestDelete(item)} className="h-8 w-8 rounded-lg p-0 text-red-500 hover:bg-red-50" aria-label={`Hapus ${name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>}</div> })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
