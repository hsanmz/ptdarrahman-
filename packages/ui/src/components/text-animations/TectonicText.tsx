'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface TectonicTextProps {
  /** Teks lengkap (akan otomatis dipotong menjadi dua baris jika topText/bottomText kosong) */
  text?: string;
  /** Baris teks pertama (meluncur dari kiri) */
  topText?: string;
  /** Baris teks kedua (meluncur dari kanan) */
  bottomText?: string;
  /** Custom class untuk kontainer pembungkus utama */
  className?: string;
  /** Custom class untuk baris atas */
  topClassName?: string;
  /** Custom class untuk baris bawah */
  bottomClassName?: string;
  /** Durasi animasi slide (detik), default 0.85s untuk pergerakan lempeng yang megah & smooth */
  duration?: number;
  /** Jarak offset luncuran awal (misal: '-60%', '-100%'), default '-50%' */
  slideOffset?: string;
  /** Apakah hanya dipicu saat masuk viewport layar */
  useInView?: boolean;
  /** Key opsional untuk me-reset / trigger ulang animasi */
  replayKey?: string | number;
}

export const TectonicText: React.FC<TectonicTextProps> = ({
  text,
  topText,
  bottomText,
  className,
  topClassName,
  bottomClassName,
  duration = 0.85,
  slideOffset = '-50%',
  useInView = true,
  replayKey,
}) => {
  // Parsing teks menjadi 2 bagian jika tidak disuplai terpisah
  let line1 = topText;
  let line2 = bottomText;

  if (!line1 && !line2 && text) {
    if (text.includes('\n')) {
      const parts = text.split('\n');
      line1 = parts[0];
      line2 = parts.slice(1).join(' ');
    } else {
      const words = text.trim().split(/\s+/);
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }
  }

  // Kurva bezier ultra-halus (luxurious deceleration, tidak patah/abrupt)
  const smoothEase = [0.16, 1, 0.3, 1] as const;

  const topVariants: Variants = {
    hidden: {
      x: slideOffset,
      opacity: 0,
      filter: 'blur(8px)',
    },
    visible: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: smoothEase,
      },
    },
  };

  const reverseOffset = slideOffset.startsWith('-')
    ? slideOffset.slice(1)
    : `-${slideOffset}`;

  const bottomVariants: Variants = {
    hidden: {
      x: reverseOffset,
      opacity: 0,
      filter: 'blur(8px)',
    },
    visible: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: smoothEase,
      },
    },
  };

  return (
    <motion.div
      key={replayKey}
      className={cn(
        'w-full overflow-hidden flex flex-col items-center justify-center py-2 select-none',
        className
      )}
      initial="hidden"
      {...(useInView
        ? {
            whileInView: 'visible',
            viewport: { once: true, margin: '-60px' },
          }
        : { animate: 'visible' })}
    >
      {/* Baris Atas: Meluncur dari kiri */}
      <motion.div
        className={cn(
          'w-full text-center font-black tracking-tight text-3xl sm:text-5xl md:text-6xl uppercase leading-none text-slate-900 dark:text-white',
          topClassName
        )}
        variants={topVariants}
      >
        {line1}
      </motion.div>

      {/* Baris Bawah: Meluncur dari kanan */}
      <motion.div
        className={cn(
          'w-full text-center font-black tracking-tight text-3xl sm:text-5xl md:text-6xl uppercase leading-none text-slate-900 dark:text-white mt-1',
          bottomClassName
        )}
        variants={bottomVariants}
      >
        {line2}
      </motion.div>
    </motion.div>
  );
};
