'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { campusSignatureFor, lookupCampusPlace } from '@/lib/campusSignature';
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
    // shortest longest-line wins; ties prefer lines that get shorter towards the end
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

const STAGGER_MS = 70;
const DRAW_MS = 900;
// The pen starts once most of the drawing is on screen
const WRITE_DELAY_S = (STROKES.length * STAGGER_MS * 0.7 + 200) / 1000;

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

  // Fit the handwriting to the space we actually have
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
  const lineDelays = lines.map((_, i) => WRITE_DELAY_S + lines.slice(0, i).reduce((s, l) => s + l.length * SECONDS_PER_CHAR, 0));
  const placeDelay = WRITE_DELAY_S + lines.reduce((s, l) => s + l.length * SECONDS_PER_CHAR, 0) + 0.2;

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
      aria-label={`${sig.name}${place ? `, ${place}` : ''}`}
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
          className="campus-sig__place mt-1.5 text-[12px] font-medium text-muted tracking-[0.02em]"
          style={phase === 'playing' ? { animationDelay: `${placeDelay}s` } : undefined}
        >
          {place}
        </p>
      )}
    </section>
  );
};
