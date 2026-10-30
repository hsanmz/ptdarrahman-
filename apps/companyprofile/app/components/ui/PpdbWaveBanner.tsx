'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buildSchedule, type ActivePpdbWave } from '@/app/lib/ppdb'
import PpdbCountdown from './PpdbCountdown'
import { resolvePortalUrl } from '@repo/ui'

interface Props {
  wave?: ActivePpdbWave | null
  /** 'compact' = badge ringkas, 'prominent' = card penuh dengan countdown. */
  variant?: 'compact' | 'prominent'
}

/**
 * Komponen CTA PPDB dinamis yang menampilkan info gelombang aktif.
 *
 * - `compact`: label gelombang + tombol Daftar ke `/ppdb`
 * - `prominent`: card emerald dengan tahun ajaran, kuota, countdown, dan CTA
 *
 * Mengembalikan `null` jika tidak ada gelombang aktif.
 */
export default function PpdbWaveBanner({ wave = null, variant = 'compact' }: Props) {
  const ppdb = buildSchedule(wave)
  if (!wave) return null

  // Wave aktif tapi belum buka pendaftaran → tampilkan countdown ke tanggal buka
  const isBeforeStart = ppdb.start && ppdb.start.getTime() > Date.now()
  const isAfterEnd = ppdb.end ? ppdb.end.getTime() < Date.now() : false
  const isOpen = !isBeforeStart && !isAfterEnd

  if (variant === 'compact') {
    return (
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {'Pendaftaran '}
              {ppdb.waveName ? `Gelombang ${ppdb.waveName}` : 'PPDB'}
            </span>
            <p className="text-sm text-[var(--text-secondary)]">
              {ppdb.academicYear ? (
                <>Tahun Ajaran <strong className="text-[var(--text)]">{ppdb.academicYear}</strong></>
              ) : (
                'Tahun ajaran terbaru'
              )}
              {ppdb.quota ? ` · Kuota ${ppdb.quota} peserta` : ''}
            </p>
            {!isOpen && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {isBeforeStart ? 'Pendaftaran belum dibuka' : 'Pendaftaran telah ditutup'}
              </p>
            )}
          </div>
          <Link
            href={resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL) || '/ppdb'}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--accent)] text-white text-xs font-bold rounded-full shadow-md hover:shadow-lg hover:bg-[#15803D] transition-all whitespace-nowrap"
          >
            {isOpen ? 'Daftar Sekarang' : 'Info PPDB'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // prominent: card penuh dengan countdown
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-5 sm:p-6 text-white shadow-xl">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">📚</span>
        </span>
        <div>
          <h3 className="font-bold text-base leading-tight">
            {ppdb.waveName ? `Gelombang ${ppdb.waveName}` : 'Pendaftaran PPDB'}
          </h3>
          {ppdb.academicYear && (
            <p className="text-emerald-200 text-sm mt-0.5">Tahun Ajaran {ppdb.academicYear}</p>
          )}
        </div>
      </div>

      <p className="text-emerald-100 text-sm leading-relaxed mb-4">
        {isOpen
          ? `Bergabunglah bersama PTDARRAHMAN. ${ppdb.quota ? `Sisa ${ppdb.quota} slot tersedia.` : 'Kuota terbatas.'}`
          : isBeforeStart
            ? 'Pendaftaran akan segera dibuka. Siapkan dokumen dan tunggu pengumuman gelombang.'
            : 'Pendaftaran gelombang ini telah ditutup. Silakan cek gelombang berikutnya.'
        }
      </p>

      {isOpen && ppdb.end && (
        <div className="mb-4">
          <PpdbCountdown wave={wave} />
        </div>
      )}

      <Link
        href={resolvePortalUrl(process.env.NEXT_PUBLIC_PORTAL_URL) || '/ppdb'}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-white text-emerald-800 px-5 py-2.5 text-sm font-bold shadow-md hover:shadow-lg hover:bg-emerald-50 transition-all"
      >
        {isOpen ? 'Daftar Sekarang' : 'Lihat Informasi PPDB'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
