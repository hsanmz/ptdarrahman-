'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, MessageCircleQuestion } from 'lucide-react'
import PageHeader from '@/app/components/layout/PageHeader'
import ShapeDivider from '@/app/components/ui/ShapeDivider'
import type { FaqItem } from '@/app/lib/types'
import { getFaqs } from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'

function FaqItem({ item, index, defaultOpen }: { item: FaqItem; index: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const panelId = `faq-panel-${index}`
  const buttonId = `faq-button-${index}`

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <h3>
        <button
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-4 p-5 text-left"
        >
          <span className="flex-1 text-sm font-[var(--font-heading)] font-semibold pr-2">
            {item.question}
          </span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      {/* grid-rows agar tinggi jawaban ikut animasi tanpa batas max-h. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden" aria-hidden={!open}>
          <p className="px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqClient({ items }: { items: FaqItem[] }) {
  const [faqList, setFaqList] = useState<FaqItem[]>(items)

  // Langganan SSE real-time untuk modul companyprofile
  useSSE('companyprofile')

  useEffect(() => {
    setFaqList(items)
  }, [items])

  useEffect(() => {
    const handleRefresh = async () => {
      try {
        const fresh = await getFaqs()
        if (fresh && Array.isArray(fresh)) {
          setFaqList(fresh)
        }
      } catch {
        // Abaikan error saat refresh di background
      }
    }

    eventBus.on('companyprofile:refresh', handleRefresh)
    return () => {
      eventBus.off('companyprofile:refresh', handleRefresh)
    }
  }, [])

  return (
    <>
      <PageHeader
        variant="clean-blur"
        title="Pertanyaan Umum"
        subtitle="Kumpulan jawaban atas pertanyaan yang paling sering diajukan tentang PTDARRAHMAN, pendaftaran, program, dan kemitraan."
        badge="FAQ"
      />

      <section className="relative overflow-hidden pt-40 sm:pt-44 pb-16 sm:pb-20 bg-[var(--bg)]">
        {/* Tear meneruskan gradien PageHeader ke section berlatar ivory. */}
        <ShapeDivider fill="var(--bg-secondary)" />
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.04]" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          {faqList.length > 0 ? (
            <div className="space-y-3">
              {faqList.map((item, i) => (
                <FaqItem key={`${item.question}-${i}`} item={item} index={i} defaultOpen={i === 0} />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl px-6 py-14 sm:px-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-5">
                <MessageCircleQuestion className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h2 className="font-[var(--font-heading)] text-lg sm:text-xl font-bold mb-2">
                Daftar pertanyaan umum sedang disiapkan
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto mb-7">
                Kami masih menyiapkan data FAQ yang lengkap dan terverifikasi. Sementara itu, silakan
                ajukan pertanyaan Anda langsung kepada tim kami.
              </p>
              <Link href="/contact" className="btn-primary">
                Hubungi Kami
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
