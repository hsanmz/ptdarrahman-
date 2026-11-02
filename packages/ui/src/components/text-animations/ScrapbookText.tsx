'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ScrapbookTextProps {
  /** Teks yang akan ditampilkan */
  text: string;
  /** Custom class untuk kontainer utama */
  className?: string;
  /** Custom class untuk setiap kata / stiker */
  wordClassName?: string;
  /** Waktu jeda kemunculan antar kata (detik), default 0.1 */
  stagger?: number;
  /** Kekakuan spring (semakin rendah semakin halus/smooth), default 160 */
  stiffness?: number;
  /** Redaman spring (semakin tinggi semakin stabil/tidak bergetar), default 20 */
  damping?: number;
  /** Seed/daftar rotasi statis dalam derajat (-4° s/d 4° untuk kesan rapi & smooth) */
  customRotations?: number[];
  /** Apakah hanya dipicu saat masuk viewport layar */
  useInView?: boolean;
  /** Key opsional untuk me-reset / trigger ulang animasi */
  replayKey?: string | number;
}

// Rotasi halus yang dinamis namun tetap elegan (-4° s/d 4°)
const DEFAULT_ROTATIONS = [-3, 2.5, -4, 3.5, -2, 4, -3.5, 3, -2.5, 2];

export const ScrapbookText: React.FC<ScrapbookTextProps> = ({
  text,
  className,
  wordClassName,
  stagger = 0.1,
  stiffness = 160,
  damping = 20,
  customRotations = DEFAULT_ROTATIONS,
  useInView = true,
  replayKey,
}) => {
  const words = text.trim().split(/\s+/);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: 0.05,
      },
    },
  };

  const getWordVariants = (rotation: number): Variants => ({
    hidden: {
      opacity: 0,
      scale: 0.6,
      rotate: rotation * 2,
      y: 12,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: rotation,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness,
        damping,
        mass: 0.8,
      },
    },
  });

  return (
    <motion.div
      key={replayKey}
      className={cn('inline-flex flex-wrap items-center gap-y-2 py-1', className)}
      variants={containerVariants}
      initial="hidden"
      {...(useInView
        ? {
            whileInView: 'visible',
            viewport: { once: true, margin: '-40px' },
          }
        : { animate: 'visible' })}
    >
      {words.map((word, index) => {
        const rotation = customRotations[index % customRotations.length] ?? 0;

        return (
          <motion.span
            key={`${word}-${index}`}
            className={cn(
              'inline-block bg-white text-slate-900 font-extrabold uppercase px-2.5 py-1 mx-1 rounded-md',
              'shadow-[3px_3px_0px_rgba(15,23,42,0.85)] border border-slate-900/90 select-none text-sm md:text-base tracking-wide',
              wordClassName
            )}
            variants={getWordVariants(rotation)}
          >
            {word}
          </motion.span>
        );
      })}
    </motion.div>
  );
};
