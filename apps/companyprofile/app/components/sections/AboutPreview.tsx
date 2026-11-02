/* eslint-disable @next/next/no-img-element -- gambar beranda berasal dari URL CMS yang dapat memakai domain eksternal. */
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import MagneticButton from '../ui/MagneticButton'

import { ArrowRight, BookOpen, Cpu, Heart } from 'lucide-react'
import {
  ScrollExpand,
  ScrollExpandInset,
  ScrollExpandSticky,
} from '@/components/ui/scroll-expand'
import { API_BASE } from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'
import type { AboutContentData } from '@/app/lib/types'

const iconMap = { 'book-open': BookOpen, cpu: Cpu, heart: Heart }

export default function AboutPreview({ settings = {}, content = null }: { settings?: Record<string, string>; content?: AboutContentData | null }) {
  const defaultImages = [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop',
  ]

  const images = [
    String(content?.image_1 || settings.about_img_1 || defaultImages[0]),
    String(content?.image_2 || settings.about_img_2 || defaultImages[1]),
    String(content?.image_3 || settings.about_img_3 || defaultImages[2]),
    String(content?.image_4 || settings.about_img_4 || defaultImages[3]),
  ]

  const badge = String(content?.badge || 'SIAPA KAMI')
  const title = String(content?.title || 'Lima Tahun Melahirkan Generasi Unggul')
  const aboutText = String(content?.body || settings.about_text || 'Sejak 2021, Ar-Rahman telah menjadi pelopor model pendidikan unik yang mengintegrasikan kebijaksanaan abadi Al-Quran dengan teknologi digital mutakhir. Kami tidak hanya mengajar — kami menginspirasi generasi pemimpin yang kokoh secara spiritual dan kompetitif secara global.')
  const coreValues = [1, 2, 3].map((index) => ({
    icon: iconMap[String(content?.[`value_${index}_icon`] || '') as keyof typeof iconMap] || BookOpen,
    idn: String(content?.[`value_${index}_title`] || ['Al-Quran Utama', 'Berbasis Teknologi', 'Berbasis Karakter'][index - 1]),
    description: String(content?.[`value_${index}_description`] || ''),
  }))

  return (
    <ScrollExpand className="bg-[var(--bg-secondary)]">
      <ScrollExpandSticky>
        <ScrollExpandInset origin=".section-badge">
          <section className="relative py-16 md:py-32 bg-[var(--bg)]">
            <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
              <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
                {/* Left - Image Mosaic */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="img-overlay aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                      <img src={resolveImageSrc(images[0], API_BASE)} alt="Boarding School" className="h-full w-full object-cover" />
                    </div>
                    <div className="img-overlay aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                      <img src={resolveImageSrc(images[1], API_BASE)} alt="Students" className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-4 pt-4 sm:pt-8">
                    <div className="img-overlay aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                      <img src={resolveImageSrc(images[2], API_BASE)} alt="Technology Lab" className="h-full w-full object-cover" />
                    </div>
                    <div className="img-overlay aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                      <img src={resolveImageSrc(images[3], API_BASE)} alt="Sports" className="h-full w-full object-cover" />
                    </div>
                  </div>
                </div>

                {/* Right - Content */}
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="section-badge">
                    {badge}
                  </span>
                  <h2 className="section-title mb-4 sm:mb-6">
                    {title}
                  </h2>
                  <p className="text-[var(--text-secondary)] leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">
                    {aboutText}
                  </p>

                  <div className="flex flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8">
                    {coreValues.map((v) => (
                      <div key={v.idn} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
                          <v.icon className="w-5 h-5 text-[var(--accent)] group-hover:text-white transition-colors duration-300" />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold font-[var(--font-heading)] group-hover:text-[var(--accent)] transition-colors duration-300">
                            {v.idn}
                          </span>
                          {v.description ? <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)]">{v.description}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2">
                    <MagneticButton strength={0.3}>
                      <Link
                        href="/about"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:gap-3 transition-all group py-1.5 px-3 rounded-full hover:bg-[var(--accent-subtle)]/50 cursor-pointer"
                      >
                        <span>Pelajari Lebih Lanjut</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                      </Link>
                    </MagneticButton>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </ScrollExpandInset>
      </ScrollExpandSticky>
    </ScrollExpand>
  )
}
