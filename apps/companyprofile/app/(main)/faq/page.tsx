import type { Metadata } from 'next'
import { Suspense } from 'react'
import FaqClient from './_components/FaqClient'
import { getFaqs } from '@/app/lib/api'
import { faqs } from '@/app/data/faq'
import type { FaqItem } from '@/app/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Pertanyaan Umum',
  description:
    "Daftar pertanyaan umum (FAQ) tentang PTDARRAHMAN: pendaftaran PPDB, program tahfidz, kompetensi digital, biaya, dan kemitraan industri.",
  openGraph: {
    title: 'Pertanyaan Umum | PTDARRAHMAN',
    description:
      'Daftar pertanyaan umum (FAQ) tentang PTDARRAHMAN: pendaftaran, program tahfidz, kompetensi digital, dan kemitraan industri.',
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
    title: 'Pertanyaan Umum | PTDARRAHMAN',
    description:
      'Daftar pertanyaan umum (FAQ) tentang PTDARRAHMAN: pendaftaran, program tahfidz, kompetensi digital, dan kemitraan industri.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function FaqPage() {
  let items: FaqItem[] = []
  try { items = await getFaqs() } catch { items = faqs.map((item, index) => ({ ...item, id: `fallback-${index}`, order: index })) }
  return (
    <Suspense>
      <FaqClient items={items} />
    </Suspense>
  )
}
