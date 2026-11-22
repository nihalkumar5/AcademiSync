'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { campusSignatureFor, lookupCampusPlace } from '@/lib/campusSignature';
import { HandwrittenText } from '@/components/ui/HandwrittenText';

// End-of-Home sign-off: the campus drawn line by line with quiet fills settling in after,
// then the college name written by hand. Sits on the page, no card.
// Plays once per session when scrolled into view; otherwise it is static.

type Phase = 'waiting' | 'playing' | 'done';

const playedKey = (slug: string) => `campus_sig_played_${slug}`;

// Outline strokes, drawn in order. Every stroke has pathLength=1 so one dash animation fits all.
// `t` marks the teal accents (trees, flag).
const STROKES: { el: 'path' | 'rect' | 'circle'; p: Record<string, string | number>; t?: boolean }[] = [
  // ground
  { el: 'path', p: { d: 'M14 150 H306' } },
  // wings
  { el: 'path', p: { d: 'M58 150 V104 H120 M200 104 H262 V150' } },
  { el: 'path', p: { d: 'M54 104 H124 M196 104 H266' } },
  // centre block and pediment
  { el: 'path', p: { d: 'M120 150 V80 H200 V150' } },
  { el: 'path', p: { d: 'M112 80 L160 50 L208 80 Z' } },
  { el: 'circle', p: { cx: 160, cy: 67, r: 6.5 } },
  { el: 'path', p: { d: 'M160 63.5 V67 L162.5 68.5' } },
  // flag
  { el: 'path', p: { d: 'M160 50 V24' } },
  { el: 'path', p: { d: 'M160 24 C166 21 172 28 180 25 V35 C172 38 166 31 160 34' }, t: true },
  // columns and door
  { el: 'path', p: { d: 'M130 88 V140 M142 88 V140 M178 88 V140 M190 88 V140' } },
  { el: 'path', p: { d: 'M151 140 V125 a9 9 0 0 1 18 0 V140' } },
  // steps
  { el: 'path', p: { d: 'M116 140 H204 M110 145 H210' } },
  // wing windows
  ...[68, 84, 100, 210, 226, 242].map((x) => ({ el: 'rect' as const, p: { x, y: 114, width: 10, height: 14, rx: 5 } })),
  // trees
  { el: 'path', p: { d: 'M34 150 V128' } },
  { el: 'path', p: { d: 'M34 92 C46 100 48 120 34 128 C20 120 22 100 34 92 Z' }, t: true },
  { el: 'path', p: { d: 'M288 150 V132' } },
  { el: 'path', p: { d: 'M288 104 C298 110 300 126 288 132 C276 126 278 110 288 104 Z' }, t: true },
  // birds
  { el: 'path', p: { d: 'M60 40 q4 -4 8 0 q4 -4 8 0 M84 30 q3 -3 6 0 q3 -3 6 0' } },
];

// Handwritten name sizing. Caveat averages ~0.34em per character; a little slack on top.
const MAX_PX = 34;
const MIN_PX = 20;
const CHAR_EM = 0.38;
const SIDE_PAD_PX = 28; // breathing room so a line never kisses the edge
const PEN_SPEED = 2; // tegaki speed for the name
const SECONDS_PER_CHAR = 0.06; // rough pen time per letter at PEN_SPEED, for chaining lines

/** 1 line up to 18 letters, 2 up to 36, otherwise 3 — split at spaces so the longest line is as short as possible. */
function splitName(name: string): string[] {
  const words = name.split(' ').filter(Boolean);
  const want = name.length <= 18 ? 1 : name.length <= 36 ? 2 : 3;
  const k = Math.min(want, words.length);
  if (k <= 1) return [name];
  let best: string[] = [name];
  let bestScore = Infinity;
  const tryCuts = (cuts: number[]) => {
    const bounds = [0, ...cuts, words.length];
    const lines = bounds.slice(1).map((end, i) => words.slice(bounds[i], end).join(' '));
    const longest = Math.max(...lines.map((l) => l.length));
    const score = longest * 100 + Math.abs(lines[0].length - lines[lines.length - 1].length);
    if (score < bestScore) {
      bestScore = score;
      best = lines;
    }
  };
  for (let i = 1; i < words.length; i++) {
    if (k === 2) tryCuts([i]);
    else for (let j = i + 1; j < words.length; j++) tryCuts([i, j]);
  }
  return best;
}

const STAGGER_MS = 60;
const DRAW_MS = 900;
const FILL_DELAY_S = (STROKES.length * STAGGER_MS + 300) / 1000;
const NAME_DELAY_S = (STROKES.length * STAGGER_MS * 0.7 + 200) / 1000; // pen starts once most of the drawing is there

export const CampusSignature: React.FC = () => {
  const { profile } = useApp();
  const sig = campusSignatureFor(profile?.college);
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [width, setWidth] = useState(320);

  // Address under the name: from the college name when it carries one, otherwise looked up once
  const [lookedUpPlace, setLookedUpPlace] = useState<string | null>(null);
  useEffect(() => {
    setLookedUpPlace(null);
    if (!sig || sig.place || !profile?.college) return;
    let alive = true;
    lookupCampusPlace(profile.college, sig.slug).then((p) => alive && setLookedUpPlace(p));
    return () => {
      alive = false;
    };
  }, [sig?.slug, sig?.place, profile?.college]);
  const place = sig?.place || lookedUpPlace || undefined;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lines = sig ? splitName(sig.name) : [];
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fontSize = Math.max(MIN_PX, Math.min(MAX_PX, Math.floor((width - SIDE_PAD_PX) / (longest * CHAR_EM))));
  const lineDelays = lines.map((_, i) => NAME_DELAY_S + lines.slice(0, i).reduce((s, l) => s + l.length * SECONDS_PER_CHAR, 0));
  const placeDelay = NAME_DELAY_S + lines.reduce((s, l) => s + l.length * SECONDS_PER_CHAR, 0) + 0.2;

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

  const fillStyle = phase === 'playing' ? { animationDelay: `${FILL_DELAY_S}s` } : undefined;

  return (
    <section
      ref={ref}
      aria-label={`${sig.name}${place ? `, ${place}` : ''}`}
      className={`campus-sig campus-sig--${phase} pt-f4 pb-f2 flex flex-col items-center text-center select-none`}
    >
      {sig.art ? (
        <img src={sig.art} alt="" aria-hidden="true" className="campus-sig__art w-full max-w-[300px] h-auto" />
      ) : (
        <svg viewBox="0 0 320 162" aria-hidden="true" className="w-full max-w-[300px] h-auto" fill="none">
          {/* Quiet fills under the outline: white building faces, warm windows, teal tree crowns */}
          <g className="campus-sig__fill" style={fillStyle}>
            <ellipse cx="160" cy="151" rx="130" ry="4" className="fill-fg/[0.06]" />
            <path d="M58 150 V104 H262 V150 Z M120 150 V80 H200 V150 Z M112 80 L160 50 L208 80 Z" className="fill-surface" />
            {[68, 84, 100, 210, 226, 242].map((x) => (
              <rect key={x} x={x} y={114} width={10} height={14} rx={5} className="fill-[#F6C77F]/80 dark:fill-[#E9B15F]/60" />
            ))}
            <path d="M151 140 V125 a9 9 0 0 1 18 0 V140 Z" className="fill-[#F6C77F]/80 dark:fill-[#E9B15F]/60" />
            <path d="M34 92 C46 100 48 120 34 128 C20 120 22 100 34 92 Z" className="fill-[#00a3a3]/15 dark:fill-[#2fd1c5]/20" />
            <path d="M288 104 C298 110 300 126 288 132 C276 126 278 110 288 104 Z" className="fill-[#00a3a3]/15 dark:fill-[#2fd1c5]/20" />
            <path d="M160 24 C166 21 172 28 180 25 V35 C172 38 166 31 160 34 Z" className="fill-[#00a3a3]/20 dark:fill-[#2fd1c5]/30" />
          </g>
          <g stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="text-fg/70">
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
          </g>
        </svg>
      )}

      {/* Name: written by hand once the drawing is mostly there; plain Caveat otherwise.
          Long names go on two balanced lines, and the size shrinks so the longest line always fits. */}
      <div
        className="mt-1 w-full flex flex-col items-center justify-center gap-1 leading-[1.05] text-fg"
        style={{ fontSize, minHeight: lines.length * fontSize * 1.1 + 4 }}
      >
        {lines.map((line, i) =>
          phase === 'playing' ? (
            <HandwrittenText key={i} text={line} playKey={`campus-sig-${sig.slug}-${i}`} delay={lineDelays[i]} speed={PEN_SPEED} className="whitespace-nowrap" />
          ) : phase === 'done' ? (
            <span key={i} className="font-cursive whitespace-nowrap">{line}</span>
          ) : null
        )}
      </div>

      {place && (
        <p
          className="campus-sig__place mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-muted"
          style={phase === 'playing' ? { animationDelay: `${placeDelay}s` } : undefined}
        >
          <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
          {place}
        </p>
      )}
    </section>
  );
};
