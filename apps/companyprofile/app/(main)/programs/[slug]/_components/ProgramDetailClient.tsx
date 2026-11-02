'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Program } from '@/app/lib/types'
import type { ProgramMenuLink } from '@/app/lib/programs'
import { API_BASE } from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'
import { Clock, Layers, Check, BookOpen, Cpu, Globe, Award, ArrowRight, ExternalLink } from 'lucide-react'
import { resolvePortalUrl } from '@repo/ui'
import PpdbWaveBanner from '@/app/components/ui/PpdbWaveBanner'

const iconMap: Record<string, typeof BookOpen> = {
  'book-quran': BookOpen,
  'laptop-code': Cpu,
  language: Globe,
  users: Award,
}

interface Props {
  program: Program
  /** Program lain dari CMS, dipakai sidebar "Program Lainnya". */
  others?: ProgramMenuLink[]
  wave?: import('@/app/lib/ppdb').ActivePpdbWave | null
}

export default function ProgramDetailClient({ program, others = [], wave = null }: Props) {
  useEffect(() => {
    if (program.content) {
      document.title = `${program.content.title || ''} | PTDARRAHMAN`
    }
  }, [program])

  const info = program.content ?? {}
  const Icon = iconMap[program.icon] || BookOpen
  const highlights = info.highlights ?? []
  const curriculum = info.curriculum ?? []
  const outcomes = info.outcomes ?? []

  const meta = [
    info.duration ? { key: 'durasi', icon: Clock, label: 'Durasi', value: info.duration } : null,
    info.level ? { key: 'tingkat', icon: Layers, label: 'Tingkat', value: info.level } : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  // Memastikan scroll di atas card kanan tetap menggulir konten halaman / kolom kiri
  const handleRightWheel = useCallback((e: React.WheelEvent) => {
    window.scrollBy({ top: e.deltaY, behavior: 'auto' })
  }, [])

  return (
    <div className="relative bg-[var(--bg)] min-h-screen pt-24 md:pt-28 pb-16 md:pb-24">
      {/* Garis aksen tipis di tepi atas */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--accent), var(--accent-gold), var(--accent), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* Kolom Kiri: Header Program + Seluruh Uraian Detail (Satu-satunya yang di-scroll) */}
          <div className="lg:col-span-2 space-y-10 sm:space-y-12">
            {/* Header: Breadcrumb, Judul, Tagline, & Meta */}
            <div className="space-y-6">
              <nav aria-label="Breadcrumb" className="text-sm text-[var(--text-muted)]">
                <Link href="/" className="transition-colors hover:text-[var(--accent)]">
                  Beranda
                </Link>
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
                <Link href="/programs" className="transition-colors hover:text-[var(--accent)]">
                  Program
                </Link>
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
                <span className="text-[var(--text-secondary)]">{info.title}</span>
              </nav>

              <div className="flex items-start gap-4 sm:gap-5">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] sm:h-14 sm:w-14">
                  <Icon className="h-6 w-6 text-[var(--accent)] sm:h-7 sm:w-7" />
                </span>
                <div className="min-w-0">
                  <h1 className="font-[var(--font-display)] text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-[var(--text)] break-words sm:text-4xl md:text-5xl">
                    {info.title}
                  </h1>
                  {info.tagline && (
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                      {info.tagline}
                    </p>
                  )}
                </div>
              </div>

              {meta.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {meta.map((m) => (
                    <div
                      key={m.key}
                      className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--bg-elevated)] px-4 py-2"
                    >
                      <m.icon className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                      <span className="text-xs text-[var(--text-muted)]">{m.label}:</span>
                      <span className="font-[var(--font-heading)] text-sm font-semibold">{m.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Banner Gambar Program */}
              {program.image && (
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-md bg-[var(--bg-secondary)]">
                  <img
                    src={resolveImageSrc(program.image, API_BASE)}
                    alt={info.title || ''}
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              )}
            </div>

            {/* Gambaran Program */}
            {info.desc && (
              <div>
                <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl text-[var(--text)]">
                  Gambaran Program
                </h2>
                <p className="mt-4 max-w-prose text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg whitespace-pre-line">
                  {info.desc}
                </p>
              </div>
            )}

            {/* Keunggulan Program */}
            {highlights.length > 0 && (
              <div>
                <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl text-[var(--text)]">
                  Keunggulan Program
                </h2>
                <ul className="mt-5 grid gap-3.5 sm:grid-cols-2">
                  {highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)] p-4"
                    >
                      <Check className="h-4 w-4 flex-shrink-0 text-[var(--accent)] mt-0.5" />
                      <span className="text-sm font-medium text-[var(--text)] leading-relaxed">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Struktur Kurikulum */}
            {curriculum.length > 0 && (
              <div>
                <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl text-[var(--text)]">
                  Struktur Kurikulum
                </h2>
                <ul className="mt-5 grid gap-3.5 sm:grid-cols-2">
                  {curriculum.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)] p-4"
                    >
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white text-xs font-bold font-mono">
                        0{i + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text)]">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Capaian Kelulusan */}
            {outcomes.length > 0 && (
              <div>
                <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl text-[var(--text)]">
                  Target Capaian Kelulusan
                </h2>
                <div className="mt-5 space-y-3">
                  {outcomes.map((o, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3.5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] p-5"
                    >
                      <Award className="h-5 w-5 flex-shrink-0 text-[var(--accent)] mt-0.5" />
                      <span className="text-sm sm:text-base font-medium text-[var(--text)] leading-relaxed">
                        {o}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan (2 Card: Card Nama Program + Card Program Lainnya)
              Posisi netap (sticky top-28) dan tidak dapat di-scroll mandiri.
              Scroll dari manapun (termasuk di atas card ini) akan menggulir kolom kiri. */}
          <div className="lg:col-span-1" onWheel={handleRightWheel}>
            <div className="lg:sticky lg:top-28 space-y-5">
              <PpdbWaveBanner wave={wave} variant="compact" />

              {/* Kartu 1: Program PTDARRAHMAN & Aksi Pendaftaran (CTA) */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--bg-elevated)] p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                      Program PTDARRAHMAN
                    </div>
                    <div className="font-[var(--font-heading)] font-bold text-sm leading-tight text-[var(--text)] truncate">
                      {info.title}
                    </div>
                  </div>
                </div>

                <div className="my-5 h-px bg-[var(--color-border)]" />

                <div className="space-y-3">
                  <a
                    href={resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center text-sm py-2.5 shadow"
                  >
                    Daftar PPDB Online
                    <ExternalLink className="h-4 w-4 ml-1.5" />
                  </a>
                  <Link href="/contact" className="btn-ghost w-full justify-center text-sm py-2.5">
                    Ajukan Pertanyaan
                  </Link>
                </div>
              </div>

              {/* Kartu 2: Program Lainnya */}
              {others.length > 0 && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--bg-elevated)] p-6 shadow-sm">
                  <h3 className="font-[var(--font-heading)] text-sm font-bold text-[var(--text)]">
                    Program Lainnya
                  </h3>
                  <ul className="mt-4 space-y-1">
                    {others.map((o) => (
                      <li key={o.href}>
                        <Link
                          href={o.href}
                          className="group -mx-2 flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
                        >
                          <span className="min-w-0 truncate">{o.label}</span>
                          <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/programs"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    Lihat semua program
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
