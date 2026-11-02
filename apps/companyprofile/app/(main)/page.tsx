import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import HeroSection from '@/app/components/sections/HeroSection'
import AboutPreview from '@/app/components/sections/AboutPreview'
import ProgramsPreview from '@/app/components/sections/ProgramsPreview'
import StatsSection from '@/app/components/sections/StatsSection'
import { getAboutContentRows, getHeroSlides, getTestimonials, getPrograms, getSettings } from '@/app/lib/api'
import { getTestimonialsDummyFallback } from '@/app/lib/dummyTestimonials'
import { fetchActivePpdbWave } from '@/app/lib/ppdb'
import type { AboutContent, HeroSlide, Program, SettingsItem, HomeCtaContent } from '@/app/lib/types'
import { resolvePortalUrl } from '@repo/ui'

const TestimonialsCarousel = dynamic(() => import('@/app/components/sections/TestimonialsCarousel'))
const CTASection = dynamic(() => import('@/app/components/sections/CTASection'))

export const metadata: Metadata = {
  description:
    "Pesantren Tahfidz Qur\'an dan Digital Arrahman — Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi, Jawa Barat.",
  openGraph: {
    title: 'Pesantren Tahfidz Qur\'an dan Digital Arrahman',
    description:
      'Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi.',
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
    title: 'Pesantren Tahfidz Qur\'an dan Digital Arrahman',
    description:
      'Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function Home() {
  const [wave, heroSlides, rawTestimonials, programs, settings, aboutRows] = await Promise.all([
    fetchActivePpdbWave().catch(() => null),
    getHeroSlides().catch(() => [] as HeroSlide[]),
    getTestimonials().catch(() => null),
    getPrograms().catch(() => [] as Program[]),
    getSettings().catch(() => [] as SettingsItem[]),
    getAboutContentRows().catch(() => [] as AboutContent[]),
  ])

  const testimonials = getTestimonialsDummyFallback(rawTestimonials)

  // Map settings ke object dictionary
  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value
    return acc
  }, {} as Record<string, string>)
  const homeAbout = aboutRows.find((row) => row.section === 'home-preview')?.content ?? null
  let homeCta: HomeCtaContent | null = null
  try {
    const parsed = JSON.parse(settingsMap.home_cta || 'null') as HomeCtaContent | null
    if (parsed?.enabled && parsed.title && parsed.description && parsed.button_text) {
      homeCta = { ...parsed, button_url: resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL) }
    }
  } catch {
    homeCta = null
  }

  return (
    <>
      <HeroSection slides={heroSlides} />
      {homeCta ? <CTASection content={homeCta} wave={wave} /> : null}

      <div className="verse-divider" />
      <AboutPreview settings={settingsMap} content={homeAbout} />
      <StatsSection content={homeAbout} />
      <ProgramsPreview programs={programs ?? []} />
      <TestimonialsCarousel testimonials={testimonials ?? []} />
    </>
  )
}
