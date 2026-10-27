import type { LeadershipBoard, LeadershipMember } from '@/app/lib/types'

/**
 * Struktur organisasi khusus halaman `/about` — TERPISAH dari CRUD Guru & Staff.
 * Sumber utama: CMS tab "Struktur Organisasi" (tabel `leadership_members`).
 * Daftar di bawah hanyalah cadangan saat CMS kosong/gagal agar halaman tidak pernah
 * tampil kosong; isi harus selalu sinkron dengan data resmi panitia.
 */

export const BOARD_TITLES: Record<string, string> = {
  yayasan: 'Susunan Pengurus Yayasan Generasi Cerdas Akhlak Mulia',
  'islamic-center': 'Susunan Pengurus Ar Rahman Islamic Center',
}

/** Urutan grup pada halaman: Yayasan dulu, lalu Ar Rahman Islamic Center. */
const BOARD_ORDER = ['yayasan', 'islamic-center']

export const fallbackLeadershipBoards: LeadershipBoard[] = [
  {
    board: 'yayasan',
    title: BOARD_TITLES.yayasan,
    members: [
      { name: 'Indra Setiawan', position: 'Pembina' },
      { name: 'Tri Indra Basoeki', position: 'Pembina' },
      { name: 'Rini Widiastuti Rahayu', position: 'Pengawas' },
      { name: 'Eko Santoso', position: 'Ketua' },
      { name: 'Chandra Sari Nugraheni', position: 'Bendahara' },
      { name: 'Noor Kartika Muliawati', position: 'Sekretaris' },
      { name: 'Rachmania Kurniawati', position: 'Sekretaris' },
    ],
  },
  {
    board: 'islamic-center',
    title: BOARD_TITLES['islamic-center'],
    members: [
      { name: 'Chandra Sari Nugraheni', position: 'President Director' },
      { name: 'Fathya Irsalina M', position: 'AVP Performance Management' },
      { name: 'Mira Susanti', position: 'AVP Internal Auditor' },
      { name: 'Leo Latul Agusta', position: 'Director of Education Center' },
      { name: 'Ahmad Mahfud', position: 'Director of Support & Development' },
      { name: 'Dewi Nareswari', position: 'Vice President of Branding & Development' },
      { name: 'Dahniar', position: 'Vice President of Finance & Support' },
      { name: 'Ruswandri', position: 'Head of Lembaga Pengelolaan Ziswaf' },
      { name: 'Silvi Laeli Kodaria', position: 'Head of Sekolah Alam Qurani Ar Rahman' },
      // Nama resmi lembaga sesuai standar naming: Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
      { name: 'Ziyad Khairy', position: "Head of Pesantren Tahfidz Qur'an dan Digital Ar-Rahman" },
      { name: 'Ahmad Khaeruddin', position: 'Head of Lembaga Pendidikan Al Quran' },
      { name: 'Susilawati', position: 'Head of Lembaga Pembinaan Masyarakat' },
    ],
  },
]

function humanizeBoard(board: string): string {
  return board
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Mengubah baris CMS (`leadership_members`) menjadi kelompok siap render.
 * Urutan anggota mengikuti `order_index` ASC; tanpa kolom itu urutan baris
 * CMS dipertahankan apa adanya.
 */
export function groupLeadership(items: LeadershipMember[]): LeadershipBoard[] {
  const buckets = new Map<
    string,
    { title: string; members: Array<{ name: string; position: string; order: number }> }
  >()
  items.forEach((item) => {
    const content = item.content ?? {}
    const name = String(content.name ?? '').trim()
    if (!name) return
    const key = (item.board || '').trim() || 'lainnya'
    const bucket = buckets.get(key) ?? {
      title: BOARD_TITLES[key] ?? (key === 'lainnya' ? 'Pengurus Lainnya' : humanizeBoard(key)),
      members: [],
    }
    bucket.members.push({
      name,
      position: String(content.position ?? '').trim(),
      order: typeof item.order === 'number' ? item.order : bucket.members.length,
    })
    buckets.set(key, bucket)
  })

  const knownFirst = BOARD_ORDER.filter((k) => buckets.has(k))
  const rest = [...buckets.keys()].filter((k) => !BOARD_ORDER.includes(k))
  return [...knownFirst, ...rest].map((board) => {
    const bucket = buckets.get(board)!
    const members = bucket.members
      .map((m, i) => ({ m, i }))
      .sort((a, b) => a.m.order - b.m.order || a.i - b.i)
      .map(({ m }) => ({ name: m.name, position: m.position }))
    return { board, title: bucket.title, members }
  })
}
