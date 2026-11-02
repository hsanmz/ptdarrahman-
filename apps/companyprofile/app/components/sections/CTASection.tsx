'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { resolvePortalUrl } from '@repo/ui'
import MagneticButton from '../ui/MagneticButton'
import type { HomeCtaContent } from '@/app/lib/types'
import type { ActivePpdbWave } from '@/app/lib/ppdb'
import PpdbCountdown from '../ui/PpdbCountdown'

export default function CTASection({ content, wave = null }: { content: HomeCtaContent; wave?: ActivePpdbWave | null }) {
  const alignRight = content.layout === 'right'
  const buttonHref =
    content.button_url && !content.button_url.startsWith('/ppdb')
      ? content.button_url
      : resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL) || content.button_url || '/ppdb'

  return (
    <section className="relative z-10 px-4 py-8 sm:px-6 sm:py-12 bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--accent-gold)]/30 bg-gradient-to-br from-[var(--accent)] via-[#155738] to-[#0D3823] p-7 text-white shadow-2xl sm:p-10 md:p-12">
          {/* Background ambient decorative shapes */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[var(--accent-gold)]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between ${alignRight ? 'md:flex-row-reverse' : ''}`}
          >
            {/* Left / Main text content */}
            <div className={`max-w-2xl ${alignRight ? 'md:text-right' : ''}`}>
              <div className={`inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/35 bg-[var(--accent-gold)]/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)] ${alignRight ? 'md:ml-auto' : ''}`}>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Penerimaan Santri Baru</span>
              </div>
              <h2 className="mt-4 font-[var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl md:text-4xl text-white">
                {content.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                {content.description}
              </p>

              {/* Countdown timer */}
              <div className={`mt-6 ${alignRight ? 'md:[&>div]:justify-end' : ''}`}>
                <PpdbCountdown wave={wave} />
              </div>
            </div>

            {/* Right / CTA Action Button */}
            <div className={`flex flex-col sm:flex-row md:flex-col items-start justify-center gap-3 shrink-0 ${alignRight ? 'md:items-start' : 'md:items-end'}`}>
              <MagneticButton strength={0.35}>
                <Link
                  href={buttonHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[#E5BE64] px-7 py-3.5 text-sm font-bold text-[#143021] shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:from-[#E5BE64] hover:to-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                >
                  <span>{content.button_text}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </MagneticButton>
              <span className="text-xs text-white/70">
                Kuota terbatas untuk gelombang aktif
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
