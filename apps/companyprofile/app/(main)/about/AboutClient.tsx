'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Bookmark, BookOpen, CheckCircle2, Cpu, Heart, ShieldCheck, Sparkles, Target, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '@/app/components/layout/PageHeader'
import LeadershipBoards from './_components/LeadershipBoards'
import type { AboutContent, AboutContentData, LeadershipBoard } from '@/app/lib/types'
import { resolvePortalUrl } from '@repo/ui'
import { resolveImageSrc } from '@/app/lib/image-file'
import { API_BASE } from '@/app/lib/api'

const ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  cpu: Cpu,
  heart: Heart,
  'shield-check': ShieldCheck,
  users: Users,
}

function rowsFor(rows: AboutContent[], section: string): AboutContent[] {
  return rows
    .filter((row) => row.section === section)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function firstRow(rows: AboutContent[], section: string): AboutContentData {
  return rowsFor(rows, section)[0]?.content ?? {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function paragraphs(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  const single = text(value)
  return single.split(/\r?\n+/).map((item) => item.trim()).filter(Boolean)
}

function items(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
}

export default function AboutClient({
  leadership,
  aboutContent,
}: {
  leadership: LeadershipBoard[]
  aboutContent: AboutContent[]
}) {
  useEffect(() => {
    document.title = 'Tentang Kami | PTDARRAHMAN'
  }, [])

  const rows = aboutContent
  const hero = firstRow(rows, 'hero')
  const storyHeading = firstRow(rows, 'story-heading')
  const vision = firstRow(rows, 'vision')
  const mission = firstRow(rows, 'mission')
  const goals = firstRow(rows, 'goals')
  const valuesHeading = firstRow(rows, 'values-heading')
  const studentProfile = firstRow(rows, 'student-profile')
  const leadershipHeading = firstRow(rows, 'leadership-heading')
  const cta = firstRow(rows, 'cta')
  const portalUrl = resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL)
  const heroImage = text(hero.image)

  const visionText =
    text(vision.body) ||
    'Menjadi Lembaga Pendidikan Terbaik bagi generasi Islam dengan memberikan penghayatan dan bekal hidup agar dapat berkembang menjadi generasi Islam yang berakhlak mulia, berkepribadian kuat, memiliki kompetensi hafizh Al-Quran dan IT serta berjiwa mandiri...'

  // Copywriting profesional: padat, berbobot, selaras 1 baris persis antara Misi dan Tujuan
  const defaultMissionItems = [
    'Menciptakan lingkungan islami, bersih, dan nyaman',
    'Membina akidah lurus, akhlak mulia, dan pribadi tangguh',
    'Mencetak generasi penerus yang hafal Al-Qur\'an',
    'Menguasai kecakapan bidang informasi dan teknologi',
  ]

  const defaultGoalItems = [
    'Membangun peradaban Islam mulia di muka bumi',
    'Menumbuhkan kecintaan pada Allah dan Rasul-Nya',
    'Meningkatkan mutu umat melalui teknologi mutakhir',
    'Mencetak para pemimpin muslim dan penggerak dakwah',
  ]

  // Normalisasi teks agar tidak jomplang bila data DB lama masih memuat kalimat bertele-tele
  const normalizeMissionLine = (line: string, idx: number) => {
    if (!line) return defaultMissionItems[idx] || ''
    if (line.includes('bersahabat') || line.includes('lingkungan yang islami')) {
      return 'Menciptakan lingkungan islami, bersih, dan nyaman'
    }
    if (line.includes('akidah') && (line.includes('berkepribadian') || line.includes('kuat'))) {
      return 'Membina akidah lurus, akhlak mulia, dan pribadi tangguh'
    }
    if (line.includes('hafal Al-Quran') || line.includes('hafal Al-Qur\'an')) {
      return 'Mencetak generasi penerus yang hafal Al-Qur\'an'
    }
    if (line.includes('informasi') || line.includes('teknologi')) {
      return 'Menguasai kecakapan bidang informasi dan teknologi'
    }
    return line
  }

  const normalizeGoalLine = (line: string, idx: number) => {
    if (!line) return defaultGoalItems[idx] || ''
    if (line.includes('peradaban Islam')) {
      return 'Membangun peradaban Islam mulia di muka bumi'
    }
    if (line.includes('kecintaan pada Allah')) {
      return 'Menumbuhkan kecintaan pada Allah dan Rasul-Nya'
    }
    if (line.includes('mutu') && line.includes('teknologi')) {
      return 'Meningkatkan mutu umat melalui teknologi mutakhir'
    }
    if (line.includes('pemimpin') || line.includes('penggerak dakwah')) {
      return 'Mencetak para pemimpin muslim dan penggerak dakwah'
    }
    return line
  }

  const rawMissionItems = items(mission.items)
  const missionItems =
    rawMissionItems.length >= 4
      ? rawMissionItems.slice(0, 4).map(normalizeMissionLine)
      : defaultMissionItems

  const rawGoalItems = items(goals.items)
  const goalItems =
    rawGoalItems.length >= 4
      ? rawGoalItems.slice(0, 4).map(normalizeGoalLine)
      : defaultGoalItems

  return (
    <>
      <PageHeader
        variant="editorial"
        title={text(hero.page_title) || 'Tentang Kami'}
        subtitle={text(hero.subtitle) || 'Mengenal arah pendidikan dan orang-orang yang menghidupkan Pesantren Tahfidz Qur\'an dan Digital Ar-Rahman.'}
        badge={text(hero.badge) || 'PROFIL INSTITUSI'}
      />

      <main className="bg-[var(--bg)] text-[var(--text)]">
        <section className="border-b border-[var(--color-border)] bg-[var(--bg-secondary)]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{text(hero.kicker)}</p>
              <h2 className="mt-4 max-w-xl font-[var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{text(hero.title)}</h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">{text(hero.subtitle)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={text(hero.cta_href) || '#perjalanan'} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#145337]">{text(hero.cta_label) || 'Kenali perjalanan kami'}<ArrowRight className="h-4 w-4" /></Link>
                <Link href={portalUrl} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">{text(hero.secondary_cta_label) || 'Pendaftaran PPDB'}</Link>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-[0_20px_50px_-30px_rgba(26,107,71,0.45)] transition-all duration-300 hover:shadow-[0_25px_60px_-25px_rgba(26,107,71,0.5)]">
              <div className="relative overflow-hidden bg-[var(--accent-subtle)]">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL gambar dikelola admin CMS.
                  <img
                    src={resolveImageSrc(heroImage, API_BASE)}
                    alt={text(hero.image_alt) || `${text(hero.image_name) || 'Eko Santoso'} — ${text(hero.image_role) || 'Ketua Yayasan Generasi Cerdas Akhlak Mulia'}`}
                    className="aspect-[4/3] w-full object-cover object-[center_top] transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[var(--accent-subtle)] text-sm text-[var(--text-muted)]">
                    Gambar profil belum diatur.
                  </div>
                )}
              </div>

              {/* Posisi Eko Santoso & Ketua Yayasan Generasi Cerdas Akhlak Mulia di bawah gambar */}
              <div className="border-t border-[var(--color-border)] bg-gradient-to-b from-white via-white to-[var(--bg-secondary)]/50 p-6 sm:p-7">
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] leading-snug">
                    {text(hero.image_name) || 'Eko Santoso'}
                  </h3>
                  <p className="font-[var(--font-heading)] text-sm sm:text-base font-semibold text-[var(--accent)] leading-relaxed">
                    {text(hero.image_role) || 'Ketua Yayasan Generasi Cerdas Akhlak Mulia'}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[var(--color-border)]/70 flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                  <span>Badan Penyelenggara Resmi</span>
                  <span className="text-[var(--accent)] font-semibold font-mono tracking-wider">
                    PTDARRAHMAN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="perjalanan" className="scroll-mt-24 bg-[var(--bg)] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)] text-fade-breathe">{text(storyHeading.eyebrow)}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">{text(storyHeading.title)}</h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{text(storyHeading.body)}</p>
            </motion.div>
            <ol className="mt-10 grid gap-4 md:grid-cols-2">
              {rowsFor(rows, 'story').map((chapter, index) => {
                const content = chapter.content ?? {}
                return (
                  <motion.li
                    key={chapter.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.15 }}
                    transition={{ duration: 0.55, delay: (index % 2) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
                  >
                    <div className="flex items-center gap-3"><span className="font-mono text-xs font-bold tracking-[0.18em] text-[var(--accent-gold)]">{String(index + 1).padStart(2, '0')}</span><span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden /><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{text(content.kicker)}</span></div>
                    <h3 className="mt-5 text-xl font-bold text-[var(--text)]">{text(content.title)}</h3>
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">{paragraphs(content.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                  </motion.li>
                )
              })}
            </ol>
          </div>
        </section>

        {/* Section Visi, Misi & Tujuan Resmi — Desain Simetris, Antislop & Tipografi Editorial */}
        <section id="vision" className="scroll-mt-24 bg-[var(--bg-secondary)] py-16 sm:py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl mb-10 sm:mb-14"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)] font-mono text-fade-breathe">
                KOMITMEN &amp; ARAH LEMBAGA
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text)] tracking-tight">
                Visi, Misi &amp; Tujuan
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
                Fondasi nilai luhur, arah ikhtiar, dan cita-cita peradaban Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman dalam menyiapkan generasi Rahmatan lil &apos;Alamin.
              </p>
            </motion.div>

            {/* Card Visi: Heroic Statement Card dengan Deep Forest Emerald & Gold Accent */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0F3523] via-[#164E33] to-[#0D2E1F] text-white p-8 sm:p-10 md:p-14 shadow-2xl border border-white/10 overflow-hidden group"
            >
              {/* Radial glow dekoratif lembut di sudut */}
              <div
                aria-hidden="true"
                className="absolute top-0 right-0 w-96 h-96 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(circle at top right, rgba(244, 213, 140, 0.15), transparent 70%)',
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider uppercase bg-[#F4D58C]/15 text-[#F4D58C] border border-[#F4D58C]/30 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    VISI UTAMA LEMBAGA
                  </span>
                  <span
                    aria-hidden="true"
                    className="select-none text-[#F4D58C]/40 text-4xl sm:text-5xl font-serif font-black leading-none"
                  >
                    &ldquo;&ldquo;
                  </span>
                </div>

                <p className="font-[var(--font-display)] text-xl sm:text-2xl md:text-3xl lg:text-[2rem] leading-[1.45] text-white/95 font-medium tracking-tight max-w-5xl">
                  &ldquo;{visionText}&rdquo;
                </p>

                {/* 3 Pilar Inti di bagian bawah Visi */}
                <div className="mt-8 sm:mt-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-white/80 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F4D58C]" />
                    Pondasi Tahfidz Al-Qur&apos;an 30 Juz
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Kecakapan Rekayasa Digital &amp; IT Terapan
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white/80" />
                    Kemandirian Akhlak &amp; Kepemimpinan Umat
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Dua Card Simetris Sempurna: Misi Kami (Kiri) & Tujuan Kami (Kanan) */}
            <div className="mt-6 sm:mt-8 grid gap-6 sm:gap-8 md:grid-cols-2 items-stretch">
              {/* Card 1: MISI KAMI */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col justify-between h-full rounded-3xl sm:rounded-[2.5rem] border border-[var(--color-border)] bg-white p-7 sm:p-9 md:p-10 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              >
                {/* Aksen garis atas saat hover */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent)] to-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex items-center gap-3.5 mb-6 sm:mb-8 pb-4 border-b border-[var(--color-border)]/60">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Target className="w-6 h-6 text-[var(--accent)]" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--accent)] block">
                        IKHTIAR &amp; PENGABDIAN
                      </span>
                      <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text)] tracking-tight">
                        MISI KAMI
                      </h3>
                    </div>
                  </div>

                  {/* 4 Poin Misi Kami — Single line presisi, seimbang & berbobot */}
                  <ol className="space-y-3 sm:space-y-3.5">
                    {missionItems.map((item, idx) => (
                      <li
                        key={item}
                        className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--bg)]/50 px-4 py-3 sm:py-3.5 flex items-center gap-3.5 min-h-[58px] hover:border-[var(--accent)]/40 hover:bg-white hover:shadow-xs transition-all"
                      >
                        <span className="shrink-0 font-mono text-xs sm:text-sm font-bold text-[var(--accent)] bg-[var(--accent-subtle)] border border-[var(--accent)]/25 px-2.5 py-1 rounded-lg">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm sm:text-[15px] font-medium text-[var(--text)] leading-snug">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                  <span>Fokus ekosistem pendidikan</span>
                  <span className="text-[var(--accent)] font-semibold font-mono">ARRAHMAN</span>
                </div>
              </motion.div>

              {/* Card 2: TUJUAN KAMI */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15 }}
                transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col justify-between h-full rounded-3xl sm:rounded-[2.5rem] border border-[var(--color-border)] bg-white p-7 sm:p-9 md:p-10 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              >
                {/* Aksen garis atas saat hover */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-[#F4D58C] opacity-80 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex items-center gap-3.5 mb-6 sm:mb-8 pb-4 border-b border-[var(--color-border)]/60">
                    <div className="w-12 h-12 rounded-2xl bg-[#FBF3DC] text-[#A67C1E] border border-[#E8D49E]/50 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Bookmark className="w-6 h-6 text-[#A67C1E]" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#A67C1E] block">
                        CITA-CITA &amp; PERADABAN
                      </span>
                      <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text)] tracking-tight">
                        TUJUAN KAMI
                      </h3>
                    </div>
                  </div>

                  {/* 4 Poin Tujuan Kami — Single line presisi, seimbang & berbobot */}
                  <ol className="space-y-3 sm:space-y-3.5">
                    {goalItems.map((item, idx) => (
                      <li
                        key={item}
                        className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--bg)]/50 px-4 py-3 sm:py-3.5 flex items-center gap-3.5 min-h-[58px] hover:border-amber-400/40 hover:bg-white hover:shadow-xs transition-all"
                      >
                        <span className="shrink-0 font-mono text-xs sm:text-sm font-bold text-[#A67C1E] bg-[#FBF3DC] border border-[#E8D49E]/60 px-2.5 py-1 rounded-lg">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm sm:text-[15px] font-medium text-[var(--text)] leading-snug">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                  <span>Cita-cita kepemimpinan umat</span>
                  <span className="text-[#A67C1E] font-semibold font-mono">PTDARRAHMAN</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--bg)] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)] text-fade-breathe">{text(valuesHeading.eyebrow)}</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">{text(valuesHeading.title)}</h2>
                <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{text(valuesHeading.body)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {rowsFor(rows, 'value').map((value) => {
                  const content = value.content ?? {}
                  const Icon = ICONS[text(content.icon)] ?? CheckCircle2
                  return (
                    <article key={value.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]"><Icon className="h-5 w-5" /></span>
                      <h3 className="mt-4 text-base font-bold">{text(content.title)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{text(content.description)}</p>
                    </article>
                  )
                })}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="mt-16 rounded-3xl border border-[var(--color-border)] bg-[var(--bg-secondary)] p-7 sm:p-9"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)] text-fade-breathe">{text(studentProfile.eyebrow)}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-bold sm:text-3xl">{text(studentProfile.title)}</h2>
                </div>
                <Users className="h-8 w-8 shrink-0 text-[var(--accent-gold)]" />
              </div>
              <div className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {items(studentProfile.items).map((item) => (
                  <p key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <LeadershipBoards boards={leadership} heading={leadershipHeading} />
        <section className="bg-[var(--accent)] py-14 sm:py-16"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-white sm:px-6 md:flex-row md:items-center md:justify-between"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">{text(cta.eyebrow)}</p><h2 className="mt-3 font-[var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">{text(cta.title)}</h2><p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-base">{text(cta.body)}</p></div><Link href={text(cta.button_href) || portalUrl} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[#F7F5F0]">{text(cta.button_label) || 'Mulai pendaftaran'}<ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
    </>
  )
}
