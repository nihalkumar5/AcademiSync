'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';

// Handwriting that writes itself (tegaki, Caveat). Only for small moments of delight:
// "All done", the onboarding welcome. Never for data like dates or times.
//
// - The renderer and font data (~700 KB) load only when one of these shows up.
// - Each `playKey` animates once per session; after that it's plain Caveat text.
// - Reduced motion, or anything failing to load: plain Caveat text, no animation.

type Loaded = { Renderer: React.ComponentType<any>; font: unknown };
let loading: Promise<Loaded> | null = null;
const loadTegaki = () =>
  (loading ??= Promise.all([import('tegaki/react'), import('tegaki/fonts/caveat')]).then(([r, f]) => ({
    Renderer: r.TegakiRenderer as React.ComponentType<any>,
    font: (f as any).default ?? f,
  })));

const playedKey = (k: string) => `tegaki_played_${k}`;

export const HandwrittenText: React.FC<{
  text: string;
  /** Animate once per session for this key. */
  playKey: string;
  className?: string;
  /** Seconds before the pen starts. */
  delay?: number;
  speed?: number;
}> = ({ text, playKey, className, delay = 0.15, speed = 1.15 }) => {
  const [lib, setLib] = useState<Loaded | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let alive = true;
    let played = false;
    try {
      played = sessionStorage.getItem(playedKey(playKey)) === '1';
    } catch {}
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (played || reduce) return;
    loadTegaki()
      .then((l) => {
        if (!alive) return;
        setLib(l);
        setAnimate(true);
        try {
          sessionStorage.setItem(playedKey(playKey), '1');
        } catch {}
      })
      .catch(() => {
        loading = null; // try again next time; plain text for now
      });
    return () => {
      alive = false;
    };
  }, [playKey]);

  if (!animate || !lib) {
    return <span className={clsx('font-cursive', className)}>{text}</span>;
  }
  const { Renderer, font } = lib;
  return (
    <span className={clsx('relative inline-block', className)} role="img" aria-label={text}>
      <Renderer
        as="span"
        aria-hidden="true"
        font={font}
        time={{ mode: 'uncontrolled', speed, delay }}
        reducedMotion="user"
        fallbackFont="'Caveat', cursive"
        style={{ display: 'inline-block' }}
      >
        {text}
      </Renderer>
    </span>
  );
};
