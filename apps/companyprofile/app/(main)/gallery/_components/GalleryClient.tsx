'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect, useMemo } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { GalleryItem } from '@/app/lib/types'
import { X, Play } from 'lucide-react'
import { CoverflowCarousel } from '@/app/components/ui/CoverflowCarousel'
import EmptyState from '@/app/components/ui/EmptyState'
import GalleryPhotoGrid from './GalleryPhotoGrid'
import { galleryCategoryLabel, galleryFilterOptions } from '@/app/lib/gallery-categories'

function BodyLock({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const scrollY = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return null
}

function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <>
      <BodyLock onClose={onClose} />
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.92) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
          <button
            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video"
            className="w-full h-full rounded-xl shadow-2xl"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer"
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.93)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <BodyLock onClose={onClose} />
      {children}
    </motion.div>
  )
}

export default function GalleryClient({ gallery }: { gallery: GalleryItem[] }) {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [selectionOrigin, setSelectionOrigin] = useState<'carousel' | 'grid'>('carousel')
  const [videoModal, setVideoModal] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Semua' },
      ...galleryFilterOptions(gallery.map((item) => item.category)),
    ],
    [gallery],
  )

  const filtered = filter === 'all' ? gallery : gallery.filter((g) => g.category === filter)

  const slides = useMemo(
    () =>
      filtered.slice(0, 5).map((item) => ({
        id: item.id,
        src: item.image,
        alt: item.content?.title ?? 'Galeri',
        title: item.content?.title,
        subtitle: galleryCategoryLabel(item.category),
      })),
    [filtered],
  )

  const closeAll = () => { setSelected(null); setVideoModal(null) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
      if (e.key === 'ArrowRight' && selected) {
        const idx = filtered.findIndex((g) => g.id === selected.id)
        if (idx < filtered.length - 1) setSelected(filtered[idx + 1])
      }
      if (e.key === 'ArrowLeft' && selected) {
        const idx = filtered.findIndex((g) => g.id === selected.id)
        if (idx > 0) setSelected(filtered[idx - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, filtered])

  useEffect(() => {
    document.title = 'Galeri | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.06 })

  const selectedIndex = selected ? filtered.findIndex((g) => g.id === selected.id) : -1

  return (
    <>
      <PageHeader
        title="Galeri"
        subtitle="Jelajahi momen dan kenangan dari seluruh pesantren dan komunitas kami"
        badge="MOMEN"
        align="center"
      />

      <section ref={sectionRef} className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === cat.value
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--color-border)] hover:text-[var(--accent)]'
                }`}
                aria-label={`Filter ${cat.label}`}
                aria-pressed={filter === cat.value}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <CoverflowCarousel
              key={filter}
              slides={slides}
              showCaption
              showPagination
              showNavigation
              onSlideClick={(index) => {
                setSelectionOrigin('carousel')
                setSelected(filtered[index])
              }}
              label="Galeri Pesantren"
            />
          ) : (
            <EmptyState
              title="Belum ada foto di kategori ini"
              description="Foto pada kategori tersebut belum tersedia. Silakan pilih kategori lain."
            />
          )}

          {filtered.length > 0 && (
            <GalleryPhotoGrid
              key={`grid-${filter}`}
              items={filtered}
              onSelect={(item) => {
                setSelectionOrigin('grid')
                setSelected(item)
              }}
            />
          )}

          <div className="mt-12 sm:mt-16 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <Play className="w-6 sm:w-8 h-6 sm:h-8 text-[var(--accent)]" />
                <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold">
                  Video Kehidupan Pesantren
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 max-w-lg">
                Ikuti tur virtual dan lihat pesantren, fasilitas, dan kehidupan santri kami.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'D0ylXygFwbc', title: 'Sorotan Kampus' },
                  { id: 'CthN0Nj8eZ4', title: 'Kehidupan Santri' },
                  { id: 'taEXb6Rzy_8', title: 'Marhaban Ya Ramadhan' },
                  { id: 'FKuNibcjM48', title: 'Sumpah Pemuda' },
                  { id: 'y0MtIjq5vUo', title: 'Progress PTD Arrahman' },
                  { id: 'Uy6D5AyCdWo', title: 'Hafidz Quran' },
                ].map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setVideoModal(video.id)}
                    className="rounded-xl overflow-hidden shadow-md bg-[var(--bg)] text-left w-full group cursor-pointer"
                  >
                    <div className="aspect-[16/9] relative">
                      <Image
                        src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-all">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-[var(--accent)] ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold font-[var(--font-heading)] truncate">{video.title}</p>
                      <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">YouTube</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {videoModal && (
        <VideoModal videoId={videoModal} onClose={() => setVideoModal(null)} />
      )}

      <AnimatePresence>
        {selected && (
          <ModalOverlay key="gallery-lightbox" onClose={() => setSelected(null)}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
              <div className="relative w-full max-w-6xl max-h-[95vh] rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl transform overflow-hidden transition-all duration-500 ease-out hover:scale-100 hover:opacity-100">
                <button
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/30 transition-all"
                  onClick={() => setSelected(null)}
                  aria-label="Tutup Lightbox"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="relative group">
                  {selected.image ? (
                    <Image
                      src={selected.image}
                      alt={selected.content?.title || ''}
                      width={600}
                      height={600}
                      className="w-full h-[600px] object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 60vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[600px] text-white/60">
                      <span className="text-lg">No Image</span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-end p-8 transition-all duration-300 group-hover:bg-white/80">
                    <div className="w-full max-w-3xl mx-auto">
                      <span className="text-xs sm:text-sm font-semibold tracking-wider text-[var(--accent)] uppercase mb-1">
                        {galleryCategoryLabel(selected.category)}
                      </span>
                      <h3 className="mt-3 text-2xl sm:text-4xl font-bold text-[var(--text)] leading-tight mb-4">
                        {selected.content?.title || 'Galeri'}
                      </h3>
                      
                      {selected.content?.desc ? (
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
                          {selected.content.desc}
                        </p>
                      ) : (
                        <p className="text-[var(--text-muted)] text-sm italic">
                          Tidak ada deskripsi.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center text-[var(--text)]">
                  <div className="flex gap-2">
                    <button
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-all hover:bg-white/30"
                      onClick={() => selectedIndex > 0 && setSelected(filtered[selectedIndex - 1])}
                      disabled={selectedIndex === 0}
                      aria-label="Sebelumnya"
                    >
                      <span className="text-2xl">‹</span>
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-all hover:bg-white/30"
                      onClick={() => selectedIndex < filtered.length - 1 && setSelected(filtered[selectedIndex + 1])}
                      disabled={selectedIndex === filtered.length - 1}
                      aria-label="Selanjutnya"
                    >
                      <span className="text-xl">›</span>
                    </button>
                  </div>
                  <div className="text-xs sm:text-sm font-medium">
                    {selectedIndex + 1} / {filtered.length}
                  </div>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </>
  )
}
