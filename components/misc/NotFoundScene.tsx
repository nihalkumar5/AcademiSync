'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HandwrittenText } from '@/components/ui/HandwrittenText';

// 404: a timetable sheet with one slot missing, a paper plane looping around it,
// and a handwritten note pointing at the gap.

const COLS = 5;
const ROWS = 4;
const X0 = 72;
const Y0 = 76;
const STEP_X = 44;
const STEP_Y = 34;
const CW = 38;
const CH = 28;
const MISSING = { c: 3, r: 3 };

// Subject tints (light / dark) in the same family as the app's subject colours.
const TINTS = [
  'fill-[#DCE8FB] dark:fill-[#1D2A3E]',
  'fill-[#FBE3D2] dark:fill-[#3A281D]',
  'fill-[#DDF1E3] dark:fill-[#1C3226]',
  'fill-[#EEE2FA] dark:fill-[#2D2340]',
  'fill-[#FBF0C9] dark:fill-[#3A3218]',
];
// Which slots are free periods (no block drawn).
const FREE = new Set(['0-2', '2-0', '4-1', '1-3']);

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

const LOOP = 'M 34 168 C 10 60, 150 6, 250 22 C 352 38, 356 150, 318 214 C 280 276, 120 286, 60 236 C 40 220, 38 196, 34 168 Z';

function Illustration() {
  const reduce = useReducedMotion();
  const mx = X0 + MISSING.c * STEP_X;
  const my = Y0 + MISSING.r * STEP_Y;

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-[360/300] select-none" aria-hidden="true">
      <svg viewBox="0 0 360 300" className="absolute inset-0 w-full h-full overflow-visible">
        {/* flight trail */}
        <path d={LOOP} fill="none" className="stroke-line-strong nf-trail" strokeWidth="1.4" strokeDasharray="2 7" strokeLinecap="round" />

        <g className="nf-float">
          {/* sheet shadow + sheet */}
          <rect x="64" y="38" width="240" height="190" className="fill-line-soft" />
          <rect x="58" y="32" width="240" height="190" className="fill-surface stroke-line-strong" strokeWidth="1.2" />
          {/* header */}
          <rect x="58" y="32" width="240" height="30" className="fill-surface-2" />
          <line x1="58" y1="62" x2="298" y2="62" className="stroke-line" strokeWidth="1" />
          {['M', 'T', 'W', 'T', 'F'].map((d, i) => (
            <text
              key={i}
              x={X0 + i * STEP_X + CW / 2}
              y="52"
              textAnchor="middle"
              className="fill-muted"
              style={{ font: '600 10px var(--font-sans, system-ui)', letterSpacing: '0.06em' }}
            >
              {d}
            </text>
          ))}
          {/* binder holes */}
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={98 + i * 80} cy="32" r="3.2" className="fill-canvas stroke-line-strong" strokeWidth="1" />
          ))}

          {/* class blocks */}
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((__, c) => {
              if (c === MISSING.c && r === MISSING.r) return null;
              if (FREE.has(`${c}-${r}`)) return null;
              const x = X0 + c * STEP_X;
              const y = Y0 + r * STEP_Y;
              return (
                <g key={`${c}-${r}`} className="nf-pop" style={{ animationDelay: `${120 + (r * COLS + c) * 35}ms` }}>
                  <rect x={x} y={y} width={CW} height={CH} rx="2" className={TINTS[(c + r * 2) % TINTS.length]} />
                  <rect x={x + 5} y={y + 7} width={CW - 16} height="3" rx="1.5" className="fill-fg/25" />
                  <rect x={x + 5} y={y + 15} width={CW - 24} height="3" rx="1.5" className="fill-fg/10" />
                </g>
              );
            }),
          )}

          {/* the missing slot */}
          <g className="nf-missing">
            <rect x={mx} y={my} width={CW} height={CH} rx="2" fill="none" className="stroke-fg" strokeWidth="1.4" strokeDasharray="4 3" />
            <text x={mx + CW / 2} y={my + 19} textAnchor="middle" className="fill-fg" style={{ font: '700 14px var(--font-sans, system-ui)' }}>
              ?
            </text>
          </g>

          {/* hand-drawn arrow from the note to the gap */}
          <path
            d={`M 132 268 C 170 274, ${mx + 8} 262, ${mx + 16} ${my + CH + 8}`}
            fill="none"
            className="stroke-fg nf-draw"
            strokeWidth="1.6"
            strokeLinecap="round"
            pathLength={1}
          />
          <path
            d={`M ${mx + 9} ${my + CH + 15} L ${mx + 16} ${my + CH + 7} L ${mx + 22} ${my + CH + 16}`}
            fill="none"
            className="stroke-fg nf-draw nf-draw-late"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
        </g>

        {/* paper plane */}
        <g>
          <g className="nf-plane">
            <path d="M -11 -7 L 12 0 L -11 7 L -6 0 Z" className="fill-surface stroke-fg" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M -6 0 L 12 0" className="stroke-fg" strokeWidth="1" />
          </g>
          {reduce ? (
            <animateMotion dur="0.01s" fill="freeze" path={LOOP} keyPoints="0.18;0.18" keyTimes="0;1" rotate="auto" />
          ) : (
            <animateMotion dur="11s" repeatCount="indefinite" path={LOOP} rotate="auto" />
          )}
        </g>
      </svg>

      {/* handwritten note */}
      <div className="absolute left-[2%] top-[83%] -translate-y-1/2 -rotate-3 text-fg text-[22px] sm:text-[24px] leading-none whitespace-nowrap">
        <HandwrittenText text="not on your timetable!" playKey="not_found" delay={0.9} />
      </div>
    </div>
  );
}

export default function NotFoundScene() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <main className="nf-paper relative min-h-[100dvh] w-full flex items-center justify-center bg-canvas text-fg px-f4 py-f6 overflow-hidden">
      <div className="relative w-full max-w-md flex flex-col items-center text-center">
        <Illustration />

        <div className="nf-rise mt-f4 flex flex-col items-center" style={{ animationDelay: '250ms' }}>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <span className="h-px w-5 bg-line-strong" />
            Error 404
            <span className="h-px w-5 bg-line-strong" />
          </span>
          <h1 className="mt-3 text-[26px] sm:text-[30px] font-bold tracking-tight leading-tight">This page skipped class.</h1>
          <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-fg-2">
            The link may be old, or the page has moved. Your timetable is right where you left it.
          </p>
        </div>

        <div className="nf-rise mt-f5 flex w-full max-w-[320px] flex-col-reverse gap-2 sm:flex-row" style={{ animationDelay: '380ms' }}>
          <button type="button" onClick={goBack} className="btn btn-secondary btn-lg w-full sm:flex-1">
            Go back
          </button>
          <Link href="/" className="btn btn-primary btn-lg w-full sm:flex-1">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
