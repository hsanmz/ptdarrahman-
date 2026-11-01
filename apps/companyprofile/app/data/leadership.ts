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
      { name: 'Indra Setiawan', position: 'Pembina', image: 'https://arrahmanic.org/assets/images/pengurus/Pa%20Indra%20Setiawan.png' },
      { name: 'Tri Indra Basoeki', position: 'Pembina' },
      { name: 'Rini Widiastuti Rahayu', position: 'Pengawas', image: 'https://arrahmanic.org/assets/images/pengurus/Bu%20Rini%20Widiastuti.png' },
      { name: 'Eko Santoso', position: 'Ketua', image: 'https://arrahmanic.org/assets/images/pengurus/Pa%20Eko.png' },
      { name: 'Chandra Sari Nugraheni', position: 'Bendahara', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20chandra.png' },
      { name: 'Noor Kartika Muliawati', position: 'Sekretaris', image: 'https://arrahmanic.org/assets/images/pengurus/Bu%20Noor.png' },
      { name: 'Rachmania Kurniawati', position: 'Sekretaris', image: 'https://arrahmanic.org/assets/images/pengurus/Bu%20Rachmania.png' },
    ],
  },
  {
    board: 'islamic-center',
    title: BOARD_TITLES['islamic-center'],
    members: [
      { name: 'Chandra Sari Nugraheni', position: 'President Director', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20chandra.png' },
      { name: 'Fathya Irsalina M', position: 'AVP Performance Management', image: 'https://arrahmanic.org/assets/images/pengurus/ka%20fathya.png' },
      { name: 'Mira Susanti', position: 'AVP Internal Auditor', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20mira.png' },
      { name: 'Leo Latul Agusta', position: 'Director of Education Center', image: 'https://arrahmanic.org/assets/images/pengurus/pa%20leo.png' },
      { name: 'Ahmad Mahfud', position: 'Director of Support & Development', image: 'https://arrahmanic.org/assets/images/pengurus/pa%20mahfud.png' },
      { name: 'Dewi Nareswari', position: 'Vice President of Branding & Development', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20dewi.png' },
      { name: 'Dahniar', position: 'Vice President of Finance & Support', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20niar.png' },
      { name: 'Ruswandri', position: 'Head of Lembaga Pengelolaan Ziswaf', image: 'https://arrahmanic.org/assets/images/pengurus/pa%20ruswandri.png' },
      { name: 'Silvi Laeli Kodaria', position: 'Head of Sekolah Alam Qurani Ar Rahman', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20silvi.png' },
      // Nama resmi lembaga sesuai standar naming: Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
      { name: 'Ziyad Khairy', position: "Head of Pesantren Tahfidz Qur'an dan Digital Ar-Rahman", image: 'https://arrahmanic.org/assets/images/pengurus/ustd%20ziyad.png' },
      { name: 'Ahmad Khaeruddin', position: 'Head of Lembaga Pendidikan Al Quran', image: 'https://arrahmanic.org/assets/images/pengurus/ustd%20ahmad.png' },
      { name: 'Susilawati', position: 'Head of Lembaga Pembinaan Masyarakat', image: 'https://arrahmanic.org/assets/images/pengurus/bu%20susi.png' },
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
    { title: string; members: Array<{ name: string; position: string; image?: string; order: number }> }
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
      image: typeof content.image === 'string' ? content.image : undefined,
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
      .map(({ m }) => ({ name: m.name, position: m.position, image: m.image }))
    return { board, title: bucket.title, members }
  })
}
