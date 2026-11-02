'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface TumbleTextProps {
  /** Teks yang akan dianimasikan */
  text: string;
  /** Custom class untuk kontainer utama */
  className?: string;
  /** Custom class untuk setiap kata */
  wordClassName?: string;
  /** Jeda staggered antar kata (detik), default 0.08 */
  stagger?: number;
  /** Massa objek untuk bobot ayunan yang seimbang, default 1.1 */
  mass?: number;
  /** Kekakuan spring (semakin rendah semakin lembut), default 110 */
  stiffness?: number;
  /** Redaman spring (tingkat redaman yang menyerap getaran kasar), default 18 */
  damping?: number;
  /** Sudut miring awal (derajat), default -22° */
  initialRotation?: number;
  /** Jarak jatuh awal sumbu Y (pixel), default -50 */
  initialY?: number;
  /** Apakah hanya dipicu saat masuk viewport layar */
  useInView?: boolean;
  /** Key opsional untuk me-reset / trigger ulang animasi */
  replayKey?: string | number;
}

export const TumbleText: React.FC<TumbleTextProps> = ({
  text,
  className,
  wordClassName,
  stagger = 0.08,
  mass = 1.1,
  stiffness = 110,
  damping = 18,
  initialRotation = -22,
  initialY = -50,
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

  const wordVariants: Variants = {
    hidden: {
      opacity: 0,
      y: initialY,
      rotate: initialRotation,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      rotate: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        mass,
        stiffness,
        damping,
      },
    },
  };

  return (
    <motion.div
      key={replayKey}
      className={cn('inline-flex flex-wrap items-center py-1 select-none', className)}
      variants={containerVariants}
      initial="hidden"
      {...(useInView
        ? {
            whileInView: 'visible',
            viewport: { once: true, margin: '-50px' },
          }
        : { animate: 'visible' })}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className={cn(
            'inline-block font-bold text-2xl sm:text-3xl md:text-4xl mr-2.5 origin-bottom text-slate-800 dark:text-slate-100',
            wordClassName
          )}
          style={{ transformOrigin: 'bottom center' }}
          variants={wordVariants}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};
