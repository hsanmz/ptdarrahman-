import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, FileText } from 'lucide-react'
import PageHeader from '@/app/components/layout/PageHeader'
import ShapeDivider from '@/app/components/ui/ShapeDivider'
import TermsToc from './_components/TermsToc'
import { termMeta, termsDocument, type TermBlock } from '@/app/data/terms'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description:
    "Dokumen Ketentuan dan Syarat (T&C) penyusunan Company Profile Pesantren Tahfidz Qur'an dan Digital Ar-Rahman (TNC-CPS-2026): standar identitas, legalitas, substansi profil, klasifikasi industri, serta kemitraan DUDI.",
  openGraph: {
    title: 'Syarat & Ketentuan | PTDARRAHMAN',
    description:
      'Dokumen Ketentuan dan Syarat (T&C) penyusunan Company Profile PTDARRAHMAN (TNC-CPS-2026).',
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
    title: 'Syarat & Ketentuan | PTDARRAHMAN',
    description:
      'Dokumen Ketentuan dan Syarat (T&C) penyusunan Company Profile PTDARRAHMAN (TNC-CPS-2026).',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

const metaRows = [
  { label: 'Kode Dokumen', value: termMeta.kode },
  { label: 'Tanggal Berlaku', value: termMeta.tanggalBerlaku },
  { label: 'Versi Dokumen', value: termMeta.versi },
  { label: 'Status', value: termMeta.status },
  { label: 'Unit Penanggung Jawab', value: termMeta.unit },
  { label: 'Institusi', value: termMeta.institusi },
]

/**
 * Urai penanda **tebal** pada konten statis menjadi <strong>. Sumber data
 * ditulis sendiri di app/data/terms.ts (bukan konten eksternal), sehingga
 * cukup aman tanpa parser HTML.
 */
function Inline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-[var(--text)]">
            {part}
          </strong>
        ) : part ? (
          <span key={i}>{part}</span>
        ) : null,
      )}
    </>
  )
}

const PROSE_P =
  'text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)] mb-4'

function TermBlocks({ blocks }: { blocks: TermBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.t) {
          case 'p':
            return (
              <p key={i} className={PROSE_P}>
                <Inline text={block.text} />
              </p>
            )
          case 'label':
            return (
              <p key={i} className="text-[13px] font-bold uppercase tracking-wide text-[var(--text)] mb-2">
                {block.text}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 mb-5 marker:text-[var(--accent)]">
                {block.items.map((item, j) => (
                  <li key={j} className="text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)]">
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="list-decimal pl-5 space-y-1.5 mb-5 marker:font-semibold marker:text-[var(--accent)]">
                {block.items.map((item, j) => (
                  <li key={j} className="text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)] pl-1">
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            )
          case 'h3':
            return (
              <h3 key={i} className="font-[var(--font-heading)] text-base sm:text-lg font-bold text-[var(--text)] mt-6 mb-3">
                {block.text}
              </h3>
            )
        }
      })}
    </>
  )
}

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Syarat & Ketentuan"
        subtitle="Dokumen Ketentuan dan Syarat (T&C) penyusunan Company Profile PTDARRAHMAN. Acuan internal bagi seluruh unit kerja dalam pengumpulan data, penyusunan materi, verifikasi, hingga penerbitan Company Profile."
        badge="KETENTUAN & SYARAT"
      />

      {/* `clip`, bukan `hidden`: elemen `overflow: hidden` di rantai ancestor
          mematikan `position: sticky` (sidebar daftar isi ikut terscroll). */}
      <section className="relative overflow-clip pt-40 sm:pt-44 pb-16 sm:pb-20 bg-[var(--bg)]">
        {/* Tear meneruskan gradien PageHeader ke section berlatar ivory. */}
        <ShapeDivider fill="var(--bg-secondary)" />
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.04]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Kartu metadata dokumen */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 mb-10 sm:mb-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold text-[var(--text)] leading-tight mb-1">
                  Dokumen Ketentuan dan Syarat (T&amp;C)
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Penyusunan Company Profile {termMeta.institusi}
                </p>
              </div>
            </div>
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metaRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)]/50 p-4">
                  <dt className="text-[10px] font-[var(--font-heading)] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-medium text-[var(--text)] leading-relaxed">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Daftar isi mobile */}
          <details className="lg:hidden glass-card rounded-2xl mb-8 overflow-hidden group">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-[var(--font-heading)] font-bold text-[var(--text)] flex items-center justify-between">
              Daftar Isi
            </summary>
            <div className="px-5 pb-5">
              <TermsToc />
            </div>
          </details>

          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-10 lg:gap-14">
            {/* Daftar isi desktop: nempel mengikuti layar; kalau isinya lebih
                tinggi dari viewport bisa digulir sendiri di dalam panel. */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto no-scrollbar glass-card rounded-2xl p-5">
                <TermsToc />
              </div>
            </aside>

            {/* Isi dokumen */}
            <div className="min-w-0 space-y-14">
              {termsDocument.map((chapter) => (
                <article key={chapter.id} id={chapter.id} className="scroll-mt-28">
                  <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text)] leading-tight pb-3 mb-6 border-b-2 border-[var(--accent)]/20">
                    {chapter.heading}
                  </h2>
                  {chapter.intro && (
                    <p className={`${PROSE_P} mb-6`}>
                      <Inline text={chapter.intro} />
                    </p>
                  )}
                  <div className="space-y-8">
                    {chapter.subsections.map((section) => (
                      <div key={section.id} id={section.id} className="scroll-mt-28">
                        <h3 className="font-[var(--font-heading)] text-lg sm:text-xl font-bold text-[var(--text)] mb-3">
                          {section.heading}
                        </h3>
                        <TermBlocks blocks={section.blocks} />
                      </div>
                    ))}
                  </div>
                </article>
              ))}

              {/* Penutup: ajakan ke halaman kontak */}
              <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                  Pertanyaan mengenai dokumen ini, kemitraan, atau kualifikasi institusi dapat diajukan
                  kepada{' '}
                  <strong className="font-semibold text-[var(--text)]">{termMeta.unit}</strong>{' '}
                  {termMeta.institusi}.
                </p>
                <Link href="/contact" className="btn-primary">
                  Hubungi Kami
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
