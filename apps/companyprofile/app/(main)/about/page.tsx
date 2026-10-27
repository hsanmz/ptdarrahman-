import type { Metadata } from 'next'
import AboutClient from './AboutClient'
import { getLeadership } from '@/app/lib/api'
import { fallbackLeadershipBoards } from '@/app/data/leadership'
import type { LeadershipBoard } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description:
    'Temukan kisah, visi, dan misi Pesantren Tahfidz Qur\'an dan Digital Arrahman. Berdiri sejak 2021, kami membentuk generasi pemimpin yang unggul dalam nilai-nilai Al-Quran dan inovasi digital.',
  openGraph: {
    title: 'Tentang Kami | PTDARRAHMAN',
    description:
      'Temukan kisah, visi, dan misi Pesantren Tahfidz Qur\'an dan Digital Arrahman.',
    images: [
      {
        url: 'https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png',
        width: 512,
        height: 512,
        alt: 'Logo Ar-Rahman',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tentang Kami | PTDARRAHMAN',
    description:
      'Temukan kisah, visi, dan misi Pesantren Tahfidz Qur\'an dan Digital Arrahman.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function AboutPage() {
  // Struktur organisasi: CMS tab "Struktur Organisasi"; fallback ke data resmi
  // statis saat CMS kosong/gagal agar halaman tidak pernah tampil tanpa pengurus.
  let leadership: LeadershipBoard[] | null = null
  try { leadership = await getLeadership() } catch { leadership = null }
  return <AboutClient leadership={leadership ?? fallbackLeadershipBoards} />
}
