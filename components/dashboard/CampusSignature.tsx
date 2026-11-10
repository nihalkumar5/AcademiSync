'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { campusSignatureFor } from '@/lib/campusSignature';
import { HandwrittenText } from '@/components/ui/HandwrittenText';

// End-of-Home sign-off: the campus draws itself line by line, then the college name is
// written by hand. Plays once per session when scrolled into view; otherwise it is static.

type Phase = 'waiting' | 'playing' | 'done';

const playedKey = (slug: string) => `campus_sig_played_${slug}`;

// Shared campus drawing. Every stroke has pathLength=1 so one dash animation fits all.
// `t` marks the teal accents (trees, flag), matching the app's illustration palette.
const STROKES: { el: 'path' | 'rect' | 'circle'; p: Record<string, string | number>; t?: boolean }[] = [
  { el: 'path', p: { d: 'M16 134 H304' } },
  { el: 'path', p: { d: 'M118 134 V72 H202 V134' } },
  { el: 'path', p: { d: 'M110 72 L160 44 L210 72 Z' } },
  { el: 'circle', p: { cx: 160, cy: 61, r: 6 } },
  { el: 'path', p: { d: 'M160 44 V20' } },
  { el: 'path', p: { d: 'M160 20 L180 25.5 L160 31' }, t: true },
  { el: 'path', p: { d: 'M150 134 V115 a10 10 0 0 1 20 0 V134' } },
  { el: 'path', p: { d: 'M127 80 V134 M139 80 V134 M181 80 V134 M193 80 V134' } },
  { el: 'path', p: { d: 'M56 134 V94 H118 M202 94 H264 V134' } },
  { el: 'rect', p: { x: 66, y: 102, width: 9, height: 9, rx: 1 } },
  { el: 'rect', p: { x: 82, y: 102, width: 9, height: 9, rx: 1 } },
  { el: 'rect', p: { x: 98, y: 102, width: 9, height: 9, rx: 1 } },
  { el: 'rect', p: { x: 213, y: 102, width: 9, height: 9, rx: 1 } },
  { el: 'rect', p: { x: 229, y: 102, width: 9, height: 9, rx: 1 } },
  { el: 'rect', p: { x: 245, y: 102, width: 9, height: 9, rx: 1 } },
  { el: 'path', p: { d: 'M36 134 V114' } },
  { el: 'circle', p: { cx: 36, cy: 102, r: 13 }, t: true },
  { el: 'path', p: { d: 'M286 134 V117' } },
  { el: 'circle', p: { cx: 286, cy: 106, r: 11 }, t: true },
  { el: 'path', p: { d: 'M226 34 q4.5 -4.5 9 0 q4.5 -4.5 9 0 M248 24 q3.5 -3.5 7 0 q3.5 -3.5 7 0' } },
];

const STAGGER_MS = 70;
const DRAW_MS = 900;
// The pen starts once most of the drawing is on screen
const WRITE_DELAY_S = (STROKES.length * STAGGER_MS * 0.7 + 200) / 1000;

export const CampusSignature: React.FC = () => {
  const { profile } = useApp();
  const sig = campusSignatureFor(profile?.college);
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('waiting');

  useEffect(() => {
    if (!sig) return;
    let played = false;
    try {
      played = sessionStorage.getItem(playedKey(sig.slug)) === '1';
    } catch {}
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (played || reduce || typeof IntersectionObserver === 'undefined') {
      setPhase('done');
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setPhase('playing');
        try {
          sessionStorage.setItem(playedKey(sig.slug), '1');
        } catch {}
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sig?.slug]);

  if (!sig) return null;

  return (
    <section
      ref={ref}
      aria-label={`${sig.name}${sig.place ? `, ${sig.place}` : ''}`}
      className={`campus-sig campus-sig--${phase} pt-f4 pb-f2 flex flex-col items-center text-center select-none`}
    >
      {sig.art ? (
        <img src={sig.art} alt="" aria-hidden="true" className="campus-sig__art w-full max-w-[300px] h-auto" />
      ) : (
        <svg
          viewBox="0 0 320 146"
          aria-hidden="true"
          className="w-full max-w-[300px] h-auto text-fg/70"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {STROKES.map(({ el: Tag, p, t }, i) => (
            <Tag
              key={i}
              {...(p as any)}
              pathLength={1}
              className={`campus-sig__line${t ? ' text-[#00a3a3] dark:text-[#2fd1c5]' : ''}`}
              stroke={t ? 'currentColor' : undefined}
              style={{ animationDelay: `${i * STAGGER_MS}ms`, animationDuration: `${DRAW_MS}ms` }}
            />
          ))}
        </svg>
      )}

      {/* Name: written by hand once the drawing is mostly there; plain Caveat otherwise */}
      <div className="mt-1 min-h-[44px] flex items-center justify-center text-[34px] leading-none text-fg">
        {phase === 'playing' ? (
          <HandwrittenText text={sig.name} playKey={`campus-sig-${sig.slug}`} delay={WRITE_DELAY_S} speed={1.25} />
        ) : phase === 'done' ? (
          <span className="font-cursive">{sig.name}</span>
        ) : null}
      </div>

      {sig.place && (
        <p className={`campus-sig__place mt-1.5 text-[12px] font-medium text-muted tracking-[0.02em]`}>{sig.place}</p>
      )}
    </section>
  );
};
