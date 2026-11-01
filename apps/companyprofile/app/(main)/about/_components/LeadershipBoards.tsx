import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SectionTitle from '@/app/components/ui/SectionTitle'
import type { LeadershipBoard } from '@/app/lib/types'

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
}

/**
 * Struktur organisasi halaman `/about` — dua kelompok pengurus (Yayasan &
 * Ar Rahman Islamic Center), terpisah dari data Guru & Staff (halaman `/staff`).
 * Kartu list modern: foto profil (jika ada) + inisial fallback + nama + jabatan.
 */
export default function LeadershipBoards({ boards }: { boards: LeadershipBoard[] }) {
  return (
    <section className="py-16 sm:py-20 md:py-28 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionTitle
          center
          badge="STRUKTUR ORGANISASI"
          title="Susunan Pengurus"
          subtitle="Kepemimpinan lembaga dalam dua naungan: yayasan dan Islamic Center."
        />

        {boards.length === 0 ? (
          <div className="solid-card text-center p-10 text-sm text-[var(--text-secondary)]">
            {'Data struktur organisasi segera diperbarui oleh panitia.'}
          </div>
        ) : (
          boards.map((board, i) => (
            <div key={board.board} className={i > 0 ? 'mt-14' : ''}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-5">
                <span className="text-sm font-bold tracking-[0.18em] text-[var(--accent-gold)]">
                  {`0${i + 1}`}
                </span>
                <h3 className="font-[var(--font-heading)] text-xl md:text-2xl font-semibold text-[var(--text)]">
                  {board.title}
                </h3>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {`${board.members.length} Pengurus`}
                </span>
              </div>
              <hr className="border-none border-t border-[var(--border-strong)] mb-6" />

              <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {board.members.map((member) => {
                  const photo = (member as { image?: string }).image
                  return (
                    <li
                      key={`${member.name}-${member.position}`}
                      className="group flex items-center gap-3.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-3.5 transition-all duration-300 hover:shadow-md hover:border-[var(--accent)]/30 hover:-translate-y-0.5"
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={member.name}
                          className="w-10 h-10 shrink-0 rounded-full object-cover border-2 border-[var(--border-strong)] group-hover:border-[var(--accent)]/40 transition-colors"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="w-10 h-10 shrink-0 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-[11px] font-bold flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors duration-300"
                        >
                          {monogram(member.name)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-[var(--font-heading)] text-[15px] font-semibold leading-snug text-[var(--text)]">
                          {member.name}
                        </span>
                        <span className="block mt-0.5 text-[11px] sm:text-xs font-semibold leading-snug text-[var(--accent)]">
                          {member.position}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}

        <div className="text-center mt-12">
          <Link href="/staff" className="btn-ghost">
            {'Lihat Semua Guru & Staff'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
