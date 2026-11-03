/* eslint-disable @next/next/no-img-element -- URL gambar berasal dari CMS dan dapat memakai domain eksternal. */
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import type { Program } from '@/app/lib/types'
import { API_BASE } from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'
import {
  BookOpen,
  Cpu,
  Globe,
  Award,
  Clock,
  Layers,
  Check,
  ArrowRight,
  Shield,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { resolvePortalUrl } from '@repo/ui'

const iconMap: Record<string, typeof BookOpen> = {
  'book-quran': BookOpen,
  'laptop-code': Cpu,
  language: Globe,
  users: Award,
}

export default function ProgramsClient({ programs }: { programs: Program[] }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    document.title = 'Program Kami | PTDARRAHMAN'
  }, [])

  const count = programs?.length ?? 0

  const onTabKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      e.preventDefault()
      const next = e.key === 'ArrowRight' ? (idx + 1) % count : (idx - 1 + count) % count
      setActiveIndex(next)
      tabRefs.current[next]?.focus()
    },
    [count],
  )

  if (!programs || programs.length === 0) return null

  const activeProg = programs[activeIndex]
  const info = activeProg.content ?? {}
  const Icon = iconMap[activeProg.icon] || BookOpen

  return (
    <>
      <PageHeader
        variant="editorial"
        title="Program Unggulan Kami"
        subtitle="Kurikulum terpadu 6 tahun yang mengintegrasikan kedalaman Al-Qur'an, keahlian rekayasa teknologi digital, kecakapan bahasa global, dan integritas kepemimpinan santri"
        badge="KURIKULUM & AKADEMIK PTDARRAHMAN"
      />

      <section className="py-12 sm:py-16 md:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* 1. Selector 4 Program Terpadu */}
          <div className="mb-10 sm:mb-14">
            <div className="text-center sm:text-left mb-5">
              <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent)]">
                PILIH PILAR PROGRAM
              </span>
              <h2 className="text-xl sm:text-2xl font-[var(--font-display)] font-bold text-[var(--text)] mt-1">
                Jelajahi 4 Pilar Pendidikan PTDARRAHMAN
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Daftar Program Unggulan"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              {programs.map((prog, idx) => {
                const TabIcon = iconMap[prog.icon] || BookOpen
                const isActive = activeIndex === idx
                return (
                  <button
                    key={prog.id}
                    ref={(el) => {
                      tabRefs.current[idx] = el
                    }}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="panel-program"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveIndex(idx)}
                    onKeyDown={(e) => onTabKeyDown(e, idx)}
                    className={`group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      isActive
                        ? 'bg-[var(--accent-subtle)] border-[var(--accent)] shadow-lg shadow-[var(--accent)]/10'
                        : 'bg-[var(--bg-secondary)] border-[var(--color-border)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-[var(--accent)] text-white shadow-md'
                            : 'bg-[var(--bg)] text-[var(--text-secondary)] group-hover:text-[var(--accent)] group-hover:bg-[var(--accent-subtle)]'
                        }`}
                      >
                        <TabIcon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                            : 'text-[var(--text-muted)] bg-[var(--bg)]'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-bold font-[var(--font-heading)] leading-snug line-clamp-2 transition-colors ${
                        isActive
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text)] group-hover:text-[var(--accent)]'
                      }`}
                    >
                      {prog.content?.title || 'Program'}
                    </h3>

                    {prog.content?.level && (
                      <div className="mt-2 text-[11px] font-medium text-[var(--text-muted)] truncate">
                        {prog.content.level}
                      </div>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="active-indicator-bar"
                        className="absolute bottom-0 left-4 right-4 h-1 bg-[var(--accent)] rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Main Detail Card Program */}
          <div
            id="panel-program"
            role="tabpanel"
            aria-live="polite"
            className="rounded-3xl border border-[var(--color-border)] bg-[var(--bg-elevated)] shadow-xl p-5 sm:p-8 md:p-10"
          >
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Kolom Kiri: Visual Banner, Ringkasan Spesifikasi & Aksi (Netap / Sticky) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
                {/* Visual Image Banner */}
                <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--color-border)] shadow-md">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={activeProg.id}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0"
                    >
                      {activeProg.image ? (
                        <img
                          src={resolveImageSrc(activeProg.image, API_BASE)}
                          alt={info.title || ''}
                          className="h-full w-full object-cover"
                          loading="eager"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-3 bg-[var(--bg-secondary)]">
                          <Icon className="w-16 h-16 opacity-30 text-[var(--accent)]" />
                          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                            PTDARRAHMAN Program
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 text-white">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow">
                            <Icon className="w-3.5 h-3.5" />
                            PILAR 0{activeIndex + 1}
                          </span>
                          {info.duration && (
                            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white/90 text-[11px] font-medium border border-white/10">
                              {info.duration}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold font-[var(--font-display)] leading-snug drop-shadow-sm line-clamp-2">
                          {info.title}
                        </h3>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Ringkasan Parameter Program */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        Durasi
                      </div>
                      <div className="text-xs sm:text-sm font-bold font-[var(--font-heading)] text-[var(--text)] truncate">
                        {info.duration || 'Program 6 Tahun'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        Target Level
                      </div>
                      <div className="text-xs sm:text-sm font-bold font-[var(--font-heading)] text-[var(--text)] truncate">
                        {info.level || 'Standar Mutqin'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        Sistem
                      </div>
                      <div className="text-xs sm:text-sm font-bold font-[var(--font-heading)] text-[var(--text)] truncate">
                        Berasrama Penuh
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        Sertifikasi
                      </div>
                      <div className="text-xs sm:text-sm font-bold font-[var(--font-heading)] text-[var(--text)] truncate">
                        Resmi & Portofolio
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="space-y-3">
                  <a
                    href={resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center text-sm py-3 shadow-md"
                  >
                    Daftar Santri Baru (PPDB Online)
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href={`/programs/${activeProg.slug}`}
                      className="btn-ghost justify-center text-xs sm:text-sm py-2.5 text-center"
                    >
                      Detail Program
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                    <Link
                      href="/contact"
                      className="btn-ghost justify-center text-xs sm:text-sm py-2.5 text-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                      Tanya Panitia
                    </Link>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Uraian Detail, Keunggulan, Kurikulum & Output */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`content-${activeProg.id}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-8 sm:space-y-10"
                  >
                    {/* Judul & Tagline Header */}
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold mb-3 text-fade-breathe">
                        <Sparkles className="w-3.5 h-3.5" />
                        PILAR PENDIDIKAN KE-0{activeIndex + 1}
                      </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-[var(--font-display)] font-bold text-[var(--text)] leading-tight">
                      {info.title}
                    </h2>
                    {info.tagline && (
                      <p className="mt-3 text-base sm:text-lg text-[var(--accent)] font-medium italic border-l-2 border-[var(--accent)] pl-4">
                        &ldquo;{info.tagline}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Gambaran Program */}
                  {info.desc && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                      <h3 className="text-base sm:text-lg font-[var(--font-heading)] font-bold text-[var(--text)] mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        Gambaran Komprehensif Program
                      </h3>
                      <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed whitespace-pre-line">
                        {info.desc}
                      </p>
                    </div>
                  )}

                  {/* Keunggulan Utama */}
                  {info.highlights && info.highlights.length > 0 && (
                    <div>
                      <h3 className="text-lg sm:text-xl font-[var(--font-display)] font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Check className="w-5 h-5 text-[var(--accent)]" />
                        Keunggulan & Kekhasan Program
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3 sm:gap-3.5">
                        {info.highlights.map((h, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] hover:border-[var(--accent)]/40 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                              {h}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Struktur Kurikulum */}
                  {info.curriculum && info.curriculum.length > 0 && (
                    <div>
                      <h3 className="text-lg sm:text-xl font-[var(--font-display)] font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-[var(--accent)]" />
                        Struktur Kurikulum & Tahapan Belajar
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {info.curriculum.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] hover:border-[var(--accent)]/30 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm font-mono">
                              0{i + 1}
                            </div>
                            <span className="text-xs sm:text-sm text-[var(--text)] font-semibold">
                              {c}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Pencapaian & Output */}
                  {info.outcomes && info.outcomes.length > 0 && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30">
                      <div className="flex items-center gap-2.5 mb-3 text-[var(--accent)]">
                        <Award className="w-6 h-6 shrink-0" />
                        <h3 className="text-base sm:text-lg font-[var(--font-display)] font-bold">
                          Target Kelulusan & Output Santri
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {info.outcomes.map((o, i) => (
                          <p
                            key={i}
                            className="text-sm sm:text-base text-[var(--text)] font-medium leading-relaxed pl-2 border-l-2 border-[var(--accent)]"
                          >
                            {o}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 3. Sinergi 4 Pilar & Alur Pendidikan Terpadu */}
          <div className="mt-16 sm:mt-24 pt-12 border-t border-[var(--color-border)]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent)] text-fade-breathe">
                INTEGRASI KURIKULUM
              </span>
              <h2 className="text-2xl sm:text-3xl font-[var(--font-display)] font-bold text-[var(--text)] mt-2">
                Sinergi 4 Pilar Pendidikan PTDARRAHMAN
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Seluruh santri menempuh integrasi kurikulum terpadu tanpa dikotomi ilmu agama dan sains modern
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.15 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="grid md:grid-cols-3 gap-6"
            >
              <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] text-left hover:border-[var(--accent)]/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-[var(--font-heading)] text-[var(--text)] mb-2">
                  Al-Qur&apos;an Sebagai Pondasi
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Menanamkan aqidah shahihah, hafalan 30 juz mutqin, dan akhlak qur&apos;ani sebagai landasan moral setiap langkah kehidupan santri.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] text-left hover:border-[var(--accent)]/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-[var(--font-heading)] text-[var(--text)] mb-2">
                  Teknologi Sebagai Instrumen
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Santri dibekali keterampilan rekayasa software, basis data, dan IoT untuk memecahkan persoalan nyata dan berkarya di era digital.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] text-left hover:border-[var(--accent)]/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-[var(--font-heading)] text-[var(--text)] mb-2">
                  Bahasa & Adab Pemimpin
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Percaya diri berpidato dan berkomunikasi dalam Bahasa Arab serta Inggris untuk berdakwah dan berjejaring di tingkat global.
                </p>
              </div>
            </motion.div>

            {/* Banner Ajakan PPDB */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-elevated)] to-[var(--bg-secondary)] border border-[var(--accent)]/30 shadow-lg text-center max-w-4xl mx-auto"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-bold tracking-wider mb-4 text-fade-breathe">
                PENERIMAAN SANTRI BARU (PPDB)
              </span>
              <h3 className="text-2xl sm:text-3xl font-[var(--font-display)] font-bold text-[var(--text)] mb-3">
                Siap Menjadi Bagian Dari PTDARRAHMAN?
              </h3>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto mb-6">
                Pendaftaran santri baru dilakukan secara mandiri melalui portal resmi PPDB PTDARRAHMAN dengan kuota terbatas setiap gelombangnya.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href={resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm px-6 py-3"
                >
                  Daftar PPDB Online Sekarang
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
                <Link href="/ppdb" className="btn-ghost text-sm px-6 py-3">
                  Informasi Gelombang & Biaya
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
