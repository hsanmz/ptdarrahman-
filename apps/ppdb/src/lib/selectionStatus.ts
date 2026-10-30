// Kategori hasil pendaftaran seleksi (dipakai lintas halaman admin & pendaftar).
// 'selection' = Dalam Proses (keputusan belum ditetapkan panitia).

export const RESULT_STATUS_CODES = {
  dalamProses: 'selection',
  diterima: 'passed',
  diterimaBersyarat: 'conditional',
  cadangan: 'waitlist',
  tidakDiterima: 'failed',
} as const

export const RESULT_STATUS_LABELS: Record<string, string> = {
  selection: 'Dalam Proses',
  passed: 'Diterima',
  conditional: 'Diterima Bersyarat',
  waitlist: 'Cadangan',
  failed: 'Tidak Diterima',
}

export function resultStatusLabel(status?: string | null): string {
  if (!status) return 'Dalam Proses'
  return RESULT_STATUS_LABELS[status] || status
}

export interface ResultStatusMeta {
  label: string
  cls: string
  dot: string
}

// Kelas pill mengikuti gaya badge tabel admin (rounded-full kecil dengan dot).
export const RESULT_STATUS_META: Record<string, ResultStatusMeta> = {
  selection: {
    label: 'Dalam Proses',
    cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    dot: 'bg-amber-500',
  },
  passed: {
    label: 'Diterima',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  conditional: {
    label: 'Diterima Bersyarat',
    cls: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    dot: 'bg-sky-500',
  },
  waitlist: {
    label: 'Cadangan',
    cls: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    dot: 'bg-violet-500',
  },
  failed: {
    label: 'Tidak Diterima',
    cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    dot: 'bg-red-500',
  },
}

export function resultStatusMeta(status?: string | null): ResultStatusMeta {
  return (
    RESULT_STATUS_META[status || 'selection'] || RESULT_STATUS_META.selection
  )
}

// Warna blok keputusan untuk lembar penilaian resmi & pengumuman.
export const RESULT_STATUS_DECISION: Record<
  string,
  { text: string; wrap: string; title: string }
> = {
  passed: {
    text: 'text-emerald-800',
    wrap: 'bg-emerald-50/80 border-emerald-300 text-emerald-950',
    title: 'DITERIMA SELEKSI CALON SANTRI',
  },
  conditional: {
    text: 'text-sky-800',
    wrap: 'bg-sky-50/80 border-sky-300 text-sky-950',
    title: 'DITERIMA BERSYARAT (CONDITIONAL)',
  },
  waitlist: {
    text: 'text-violet-800',
    wrap: 'bg-violet-50/80 border-violet-300 text-violet-950',
    title: 'CADANGAN (WAITING LIST)',
  },
  failed: {
    text: 'text-rose-800',
    wrap: 'bg-rose-50/80 border-rose-300 text-rose-950',
    title: 'TIDAK DITERIMA',
  },
  selection: {
    text: 'text-amber-800',
    wrap: 'bg-amber-50/80 border-amber-300 text-amber-950',
    title: 'DALAM PROSES SELEKSI',
  },
}

export function resultStatusDecision(status?: string | null) {
  return RESULT_STATUS_DECISION[status || 'selection'] || RESULT_STATUS_DECISION.selection
}
