'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { GalleryItem } from '@/app/lib/types'
import { galleryCategoryLabel } from '@/app/lib/gallery-categories'

const INITIAL_VISIBLE = 12

interface GalleryPhotoGridProps {
  items: GalleryItem[]
  onSelect: (item: GalleryItem) => void
}

/**
 * Grid dokumentasi di bawah coverflow. `key` di GalleryClient dibuat dari
 * filter aktif supaya tombol "Lihat semua" kembali ringkas saat filter ganti.
 */
export default function GalleryPhotoGrid({ items, onSelect }: GalleryPhotoGridProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE)
  const hasMore = items.length > INITIAL_VISIBLE

  return (
    <section aria-labelledby="galeri-dokumentasi" className="mt-14 sm:mt-20">
      <div className="mb-6 sm:mb-8">
        <h2
          id="galeri-dokumentasi"
          className="font-[var(--font-display)] text-xl sm:text-2xl font-bold text-[var(--text)]"
        >
          Dokumentasi Kegiatan
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          {items.length} foto
          {hasMore && !expanded ? ` · menampilkan ${INITIAL_VISIBLE} pertama` : ''}
        </p>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {visible.map((item) => {
          const title = item.content?.title?.trim() || 'Galeri'
          const description = item.content?.desc?.trim() || `Dokumentasi ${title.toLowerCase()}.`
          const category = galleryCategoryLabel(item.category)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                aria-label={`Buka foto ${title}${category ? ` (${category})` : ''}`}
                className="group relative block w-full aspect-[4/3] overflow-hidden rounded-xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                {item.image ? (
                  <motion.div layoutId={`gallery-grid-image-${item.id}`} className="absolute inset-0">
                    <Image
                      src={item.image}
                      alt={title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </motion.div>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                    <ImageOff className="w-5 h-5" aria-hidden="true" />
                  </span>
                )}

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity duration-300 group-hover:from-black/85"
                />

                <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left">
                  <span className="block truncate text-xs sm:text-sm font-semibold text-white">
                    {title}
                  </span>
                  {category && (
                    <span className="mt-0.5 block truncate text-[10px] sm:text-xs uppercase tracking-wide text-white/75">
                      {category}
                    </span>
                  )}
                  {description && (
                    <span className="mt-1 block line-clamp-2 text-[10px] leading-snug text-white/80">
                      {description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <div className="mt-6 sm:mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="px-5 py-2.5 rounded-full text-sm font-medium border border-[var(--color-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-expanded={expanded}
          >
            {expanded
              ? 'Tampilkan lebih sedikit'
              : `Lihat semua ${items.length} foto`}
          </button>
        </div>
      )}
    </section>
  )
}
