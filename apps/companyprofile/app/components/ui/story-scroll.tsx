'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'aria-label'?: string;
  id?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  'aria-label': ariaLabel,
  id,
}) => (
  <section
    id={id}
    data-flow-section
    aria-label={ariaLabel}
    className={cx('relative w-full overflow-hidden', className)}
    style={style}
  >
    <div
      data-flow-inner
      className="flow-art-container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 py-[clamp(3.5rem,9vw,6.5rem)]"
    >
      {children}
    </div>
  </section>
);

export interface FlowArtProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const childCount = (children: React.ReactNode) => React.Children.count(children);

const FlowArt: React.FC<FlowArtProps> = ({
  children,
  className,
  'aria-label': ariaLabel = 'Story scroll',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current || reducedMotion) return;

      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>('[data-flow-section]'),
      );
      if (sections.length === 0) return;

      const triggers: ScrollTrigger[] = [];

      // Seluruh band (background + isi) naik & fade sebagai satu unit,
      // digerakkan langsung oleh posisi scroll (scrub) — effect selalu
      // terlihat dan teks tidak pernah tertinggal dari background-nya.
      sections.forEach((section) => {
        const tween = gsap.fromTo(
          section,
          { autoAlpha: 0, y: 96 },
          {
            autoAlpha: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top 96%',
              end: 'top 55%',
              scrub: 0.4,
            },
          },
        );
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((t) => t.kill());
      };
    },
    { scope: containerRef, dependencies: [childCount(children), reducedMotion] },
  );

  return (
    <main
      ref={containerRef}
      aria-label={ariaLabel}
      className={cx('w-full overflow-x-hidden', className)}
    >
      {children}
    </main>
  );
};

export default FlowArt;
