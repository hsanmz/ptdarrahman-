'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Award } from 'lucide-react'

export type PageHeaderVariant = 'default' | 'gold-shimmer' | 'emerald-glow' | 'editorial' | 'clean-blur'

interface Props {
  title: string
  subtitle: string
  badge?: string
  align?: 'left' | 'center'
  variant?: PageHeaderVariant
}

export default function PageHeader({
  title,
  subtitle,
  badge,
  align = 'left',
  variant = 'default',
}: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const orb = orbRef.current
    if (!section || !orb) return

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)

        gsap.to(orb, {
          y: 60,
          scale: 1.2,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      })
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg) 50%, var(--bg-secondary) 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 8s ease infinite',
      }}
    >
      {align === 'left' && (
        <>
          <div
            ref={orbRef}
            className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--color-emerald) 0%, var(--color-gold) 40%, transparent 70%)',
              opacity: 0.04,
              transform: 'translateX(30%) translateY(-20%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--color-gold) 0%, transparent 70%)',
              opacity: 0.03,
            }}
          />
        </>
      )}

      <div className={`max-w-4xl mx-auto px-4 sm:px-6 relative z-10 ${align === 'center' ? 'text-center' : ''}`}>
        {/* Eyebrow Badge dengan animasi masuk bertahap */}
        {badge && (
          <div className={`mb-3 inline-flex ${align === 'center' ? 'justify-center w-full' : ''}`}>
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`inline-flex ${align === 'center' ? 'justify-center w-full' : ''}`}
            >
              {variant === 'gold-shimmer' ? (
                <span className="floating-badge-1 section-badge justify-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] text-xs font-semibold tracking-wider uppercase shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                  {badge}
                </span>
              ) : variant === 'emerald-glow' ? (
                <span className="section-badge justify-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold tracking-wider uppercase shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-[var(--accent-gold)]" />
                  {badge}
                </span>
              ) : (
                <span className={`section-badge ${align === 'center' ? 'justify-center' : ''}`}>
                  {badge}
                </span>
              )}
            </motion.div>
          </div>
        )}

        {/* Heading H1 dengan variasi tipografi dinamis per varian */}
        <motion.h1
          initial={{ opacity: 0, y: 22, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.75, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`font-[var(--font-display)] text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-3 sm:mb-4 tracking-[-0.03em] ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        >
          {variant === 'gold-shimmer' ? (
            <span className="text-shimmer-gold drop-shadow-xs">{title}</span>
          ) : variant === 'emerald-glow' ? (
            <span className="bg-gradient-to-r from-emerald-600 via-[var(--accent)] to-[var(--accent-gold)] bg-clip-text text-transparent font-extrabold drop-shadow-xs">
              {title}
            </span>
          ) : variant === 'editorial' ? (
            <span className="relative inline-block text-[var(--text)]">
              {title}
              <span className="block h-1 w-20 bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent)] rounded-full mt-2" />
            </span>
          ) : (
            <span className="text-[var(--text)]">{title}</span>
          )}
        </motion.h1>

        {/* Subtitle dengan kemunculan mengalir halus */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`text-sm sm:text-base md:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  )
}
