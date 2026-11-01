'use client'

import { useEffect, useState } from 'react'

export default function LoaderScreen({ logoUrl }: { logoUrl?: string }) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(18)
  const [isExiting, setIsExiting] = useState(false)
  const [isDestroyed, setIsDestroyed] = useState(false)
  const [statusText, setStatusText] = useState('Memuat konten pesantren...')

  useEffect(() => {
    setMounted(true)

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      const quickTimer = window.setTimeout(() => {
        setIsDestroyed(true)
      }, 200)
      return () => window.clearTimeout(quickTimer)
    }

    // Step 1: Rapid progress progression
    const t1 = window.setTimeout(() => {
      setProgress(48)
    }, 180)

    const t2 = window.setTimeout(() => {
      setProgress(82)
      setStatusText('Menyiapkan pengalaman terbaik...')
    }, 450)

    const t3 = window.setTimeout(() => {
      setProgress(100)
    }, 750)

    // Step 2: Smooth exit sequence (fade & subtle scale)
    const t4 = window.setTimeout(() => {
      setIsExiting(true)
    }, 950)

    // Step 3: Clean unmount after transition completes
    const t5 = window.setTimeout(() => {
      setIsDestroyed(true)
    }, 1550)

    // Listener for document load if still within timeout
    const handleLoad = () => {
      setProgress(100)
    }
    if (document.readyState === 'complete') {
      setProgress(100)
    } else {
      window.addEventListener('load', handleLoad, { once: true })
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      window.clearTimeout(t5)
      window.removeEventListener('load', handleLoad)
    }
  }, [])

  if (isDestroyed) return null

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden px-4 select-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      style={{ backgroundColor: 'var(--bg, #F7F5F0)' }}
      role="status"
      aria-live="polite"
      aria-label="Memuat portal Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
    >
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[420px] md:w-[600px] h-[420px] md:h-[600px] rounded-full bg-emerald-600/8 blur-[100px] animate-pulse" />
        <div className="w-[280px] md:w-[380px] h-[280px] md:h-[380px] rounded-full bg-amber-400/8 blur-[80px] -translate-y-8" />
        
        {/* Subtle geometric watermark motif */}
        <svg
          className="absolute w-[500px] h-[500px] text-emerald-900/[0.025] dark:text-emerald-400/[0.03] animate-loader-orbit"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <polygon points="100,10 120,60 175,60 130,95 150,150 100,115 50,150 70,95 25,60 80,60" />
          <circle cx="100" cy="100" r="70" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="88" strokeDasharray="1 5" />
        </svg>
      </div>

      {/* Main card */}
      <div
        className={`relative z-10 flex flex-col items-center max-w-sm w-full mx-auto p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-[#0c2217]/70 backdrop-blur-xl border border-emerald-800/10 dark:border-emerald-500/20 shadow-2xl shadow-emerald-950/5 transition-all duration-500 ease-out ${
          mounted
            ? isExiting
              ? 'opacity-0 -translate-y-3 scale-95'
              : 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        {/* Emblem & Orbit Container */}
        <div className="relative flex items-center justify-center w-28 h-28 my-1">
          {/* Outer Orbit (Emerald) */}
          <div className="absolute inset-0 rounded-full border border-emerald-600/25 border-dashed animate-loader-orbit" />
          
          {/* Accent orbit bead */}
          <div className="absolute inset-0 rounded-full animate-loader-orbit">
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          {/* Inner Reverse Orbit (Gold Accent) */}
          <div className="absolute inset-2 rounded-full border border-transparent border-t-amber-500/70 border-r-amber-500/30 animate-loader-orbit-reverse" />

          {/* Center Logo / Crest Container */}
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-b from-white to-[#F7F5F0] dark:from-[#112d1f] dark:to-[#0c2217] shadow-inner border border-emerald-900/10 dark:border-emerald-600/20 flex items-center justify-center p-2.5 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo PTDARRAHMAN"
                className="max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-700 hover:scale-105"
              />
            ) : (
              /* Fallback Crest: Quran + Digital circuitry */
              <div className="flex flex-col items-center justify-center text-emerald-800 dark:text-emerald-300">
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Open Book */}
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  {/* Digital node / star */}
                  <circle cx="12" cy="7" r="1.5" className="fill-amber-400 stroke-amber-500" />
                  <line x1="12" y1="8.5" x2="12" y2="12" className="stroke-amber-500" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Institution Brand Identity */}
        <div className="mt-4 text-center">
          <span className="inline-block text-[9.5px] md:text-[10px] font-bold tracking-[0.22em] text-emerald-800 dark:text-emerald-400 uppercase">
            Pesantren Tahfidz Qur&apos;an &amp; Digital
          </span>
          <h2 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-wide mt-0.5">
            AR-RAHMAN
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-wide">
            Tradisi Qur&apos;ani &bull; Keunggulan Digital
          </p>
        </div>

        {/* Modern Progress Track */}
        <div className="w-48 sm:w-56 mt-6">
          <div className="h-1.5 w-full bg-emerald-950/10 dark:bg-emerald-100/10 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-amber-400 to-emerald-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(26,107,71,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status text & pulsing dot */}
          <div className="flex items-center justify-center gap-2 mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 tracking-wide">
              {statusText}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
