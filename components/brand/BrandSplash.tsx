'use client';

import React, { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';

// College builds: an animated "seal" splash on the first open of a session.
//
// Choreography (ms from first paint):
//   0     soft dawn light (saffron + green from the crest, navy at the edges) breathes in
//   80    a hairline ring inscribes itself around where the crest will sit, like a seal being drawn
//   420   the crest blooms out of a blur with a gentle overshoot
//   1080  a light sheen sweeps across the crest
//   900   the name rises letter by letter, then the tagline settles as its tracking tightens
//   1250  a saffron-white-green hairline draws out from the centre under the name
//   1350  "Powered by intersemester" fades in at the bottom
//   2150  exit: an iris opens from the crest's centre and reveals the app underneath
//
// It is rendered in the server HTML so it covers the page from the very first paint. Everything is
// CSS (transform/opacity/mask), so it stays smooth while the app hydrates behind it.

const KEY = 'brand_splash_seen';
const HOLD_MS = 2150;
const EXIT_MS = 650;

export const BrandSplash: React.FC = () => {
  const [phase, setPhase] = useState<'show' | 'leave' | 'gone'>('show');

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
      sessionStorage.setItem(KEY, '1');
    } catch {}
    if (seen) return setPhase('gone');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const hold = reduce ? 700 : HOLD_MS;
    const t1 = setTimeout(() => setPhase('leave'), hold);
    const t2 = setTimeout(() => setPhase('gone'), hold + EXIT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!BRAND.poweredBy || !BRAND.logo || phase === 'gone') return null;

  const letters = Array.from(BRAND.name);

  return (
    <div aria-hidden="true" className={`bs ${phase === 'leave' ? 'bs--leave' : ''}`}>
      {/* Aurora: three soft blobs in the crest's colours drifting behind everything */}
      <div className="bs__aurora">
        <span className="bs__blob bs__blob--a" />
        <span className="bs__blob bs__blob--b" />
        <span className="bs__blob bs__blob--c" />
      </div>
      <div className="bs__grain" />

      <div className="bs__stage">
        <div className="bs__seal">
          <span className="bs__halo" />
          <span className="bs__orbit" />
          <svg className="bs__ring" viewBox="0 0 200 200">
            <circle className="bs__ring-a" cx="100" cy="100" r="96" pathLength={1} />
          </svg>
          <div className="bs__crest">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" draggable={false} />
            <span className="bs__sheen" />
          </div>
        </div>

        <p className="bs__name" aria-label={BRAND.name} data-text={BRAND.name}>
          {letters.map((ch, i) => (
            <span key={i} className="bs__ch" style={{ animationDelay: `${880 + i * 32}ms` }}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </p>
        <p className="bs__tagline">{BRAND.tagline}</p>
      </div>

      <div className="bs__foot">
        <span className="bs__pill">
          <span className="bs__foot-label">Powered by</span>
          <span className="bs__foot-mark">
            <span className="font-extrabold">inter</span>
            <span className="opacity-80">semester</span>
          </span>
        </span>
        <span className="bs__progress"><span /></span>
      </div>
    </div>
  );
};
