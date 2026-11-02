import { ShieldCheck, Users, Award } from 'lucide-react'
import SectionTitle from '@/app/components/ui/SectionTitle'
import type { AboutContentData, LeadershipBoard } from '@/app/lib/types'
import { resolveImageSrc } from '@/app/lib/image-file'
import { API_BASE } from '@/app/lib/api'

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
 * Struktur organisasi halaman `/about` — menampilkan seluruh jajaran kepengurusan
 * Yayasan Generasi Cerdas Akhlak Mulia serta Pimpinan & Manajemen Lembaga PTDARRAHMAN secara lengkap.
 */
export default function LeadershipBoards({
  boards,
  heading = {},
}: {
  boards: LeadershipBoard[]
  heading?: AboutContentData
}) {
  const rawSubtitle = (heading.body as string) || ''
  const subtitle =
    !rawSubtitle || rawSubtitle.includes('dua naungan') || rawSubtitle.includes('Islamic Center')
      ? 'Susunan lengkap kepengurusan Yayasan Generasi Cerdas Akhlak Mulia beserta pimpinan dan manajemen lembaga PTDARRAHMAN.'
      : rawSubtitle

  return (
    <section className="py-14 sm:py-16 md:py-20 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionTitle
          center
          badge={heading.eyebrow || 'STRUKTUR ORGANISASI'}
          title={heading.title || 'Struktur Organisasi & Kepengurusan'}
          subtitle={subtitle}
        />

        {boards.length === 0 ? (
          <div className="solid-card text-center p-10 text-sm text-[var(--text-secondary)]">
            Data struktur organisasi segera diperbarui oleh panitia.
          </div>
        ) : (
          boards.map((board, i) => {
            // Normalisasi judul board agar konsisten dengan institusi tunggal
            let displayTitle = board.title.replace(/—.*$/, '').trim()
            if (
              displayTitle.toLowerCase().includes('islamic center') ||
              board.board === 'islamic-center'
            ) {
              displayTitle = 'Pimpinan & Manajemen Lembaga PTDARRAHMAN'
            }

            return (
              <div key={board.board} className={i > 0 ? 'mt-14 sm:mt-16' : 'mt-8 sm:mt-10'}>
                {/* Header Tiap Kelompok Organisasi */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 pb-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center font-bold font-mono">
                      {i === 0 ? <Users className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-[var(--font-heading)] text-lg sm:text-xl md:text-2xl font-bold text-[var(--text)]">
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">
                        {i === 0
                          ? 'Badan Penyelenggara Resmi PTDARRAHMAN'
                          : 'Manajemen Operasional & Pendidikan Pesantren'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--color-border)] text-[var(--accent)] font-mono">
                    {board.members.length} Pengurus
                  </span>
                </div>

                {/* Grid Kartu Pengurus yang Lebih Besar, Berwibawa & Jelas Terbaca */}
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
                  {board.members.map((member) => {
                    const photo = member.image
                    return (
                      <li
                        key={`${member.name}-${member.position}`}
                        className="group relative flex flex-col justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--bg-elevated)] p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-[var(--accent)]/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                      >
                        {/* Aksen garis atas tipis saat hover */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div>
                          {/* Avatar / Foto Profil Berukuran Besar */}
                          <div className="flex items-center gap-4 sm:gap-5 mb-5">
                            {photo ? (
                              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl overflow-hidden border-2 border-[var(--accent)]/30 group-hover:border-[var(--accent)] shadow-md transition-all duration-300">
                                <img
                                  src={resolveImageSrc(photo, API_BASE)}
                                  alt={member.name}
                                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                />
                              </div>
                            ) : (
                              <div
                                aria-hidden="true"
                                className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-[var(--accent-subtle)] to-[var(--bg-secondary)] border-2 border-[var(--accent)]/30 group-hover:border-[var(--accent)] text-[var(--accent)] font-bold font-[var(--font-display)] text-xl sm:text-2xl flex items-center justify-center shadow-md group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300"
                              >
                                {monogram(member.name)}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold font-mono tracking-wide bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 mb-2 shadow-xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {member.position === 'Ketua' && board.board === 'yayasan' ? 'Ketua Yayasan' : member.position}
                              </div>
                              <h4 className="font-[var(--font-display)] text-lg sm:text-xl font-bold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                                {member.name}
                              </h4>
                            </div>
                          </div>

                          {/* Garis pemisah halus */}
                          <div className="h-px w-full bg-[var(--color-border)] mb-3.5" />

                          {/* Keterangan Lembaga Resmi */}
                          <div className="flex items-center justify-between text-[11px] sm:text-xs text-[var(--text-muted)] font-medium">
                            <span className="truncate">Yayasan Generasi Cerdas Akhlak Mulia</span>
                            <span className="text-[var(--accent)] font-semibold shrink-0">
                              PTDARRAHMAN
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })
        )}

        {/* Tombol ke halaman /staff dihapus sesuai arahan: seluruh jajaran pengurus & tim ditampilkan lengkap di sini */}
      </div>
    </section>
  )
}
