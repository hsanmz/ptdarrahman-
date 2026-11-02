'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface FunBouncyTextProps {
  /** Teks yang akan dianimasikan */
  text: string;
  /** Custom class untuk heading kontainer utama */
  className?: string;
  /** Custom class untuk tiap karakter */
  charClassName?: string;
  /** Jeda staggered antar huruf (detik), default 0.05 */
  stagger?: number;
  /** Nilai kekakuan spring (sangat elastis = 400), default 400 */
  stiffness?: number;
  /** Nilai redaman spring (redaman rendah = banyak pantulan wobbly), default 8 */
  damping?: number;
  /** Key opsional untuk me-reset / trigger ulang animasi */
  replayKey?: string | number;
}

export const FunBouncyText: React.FC<FunBouncyTextProps> = ({
  text,
  className,
  charClassName,
  stagger = 0.05,
  stiffness = 400,
  damping = 8,
  replayKey,
}) => {
  const characters = Array.from(text);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
      },
    },
  };

  const charVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness,
        damping,
      },
    },
  };

  return (
    <motion.h1
      key={replayKey}
      className={cn(
        'inline-flex flex-wrap items-center justify-center font-black tracking-tight text-5xl md:text-6xl select-none',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {characters.map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className={cn(
            'inline-block origin-center',
            charClassName ??
              'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm'
          )}
          variants={charVariants}
        >
          {/* Tangani whitespace agar tidak collapse di layout inline-block */}
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.h1>
  );
};
