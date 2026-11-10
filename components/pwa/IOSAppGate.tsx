'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { ArrowDown } from '@/components/ui/icons';
import { GateShell } from './GateShell';
import { IOSGateArt, useIOSStep } from './GateArt';

const STEPS = [
  { title: 'Tap Share', body: 'The square with an arrow, in Safari’s bottom bar.' },
  { title: 'Choose “Add to Home Screen”', body: 'Scroll down a little if it’s hidden, then tap Add.' },
  { title: 'Open it from your Home Screen', body: 'Full screen with class alerts, like any app.' },
];

// iPhone Safari: Intersemester installs from the Home Screen (no App Store needed).
// The installed app (standalone) skips this.
export const IOSAppGate: React.FC = () => {
  const [show, setShow] = useState(false);
  const reduce = !!useReducedMotion();
  const [step, setStep] = useIOSStep(reduce || !show);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !/Macintosh/i.test(navigator.userAgent);
    const isStandalone =
      (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches || Capacitor.isNativePlatform();
    if (new URLSearchParams(window.location.search).get('preview') === 'ios') {
      setShow(true);
      return;
    }
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) return;
    if (isIOS && !isStandalone) setShow(true);
  }, []);

  if (!show) return null;
  const s = STEPS[step];

  return (
    <GateShell label="Add Intersemester to your Home Screen" art={<IOSGateArt step={step} />}>
      <h2 className="text-[28px] leading-[1.08] font-semibold tracking-tight text-fg">
        Install in 3 taps.
        <br />
        <span className="text-muted">No App Store needed.</span>
      </h2>

      {/* story-style progress, one bar per step */}
      <div className="mt-5 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Install steps">
        {STEPS.map((x, i) => (
          <button
            key={x.title}
            type="button"
            role="tab"
            aria-selected={i === step}
            aria-label={`Step ${i + 1}: ${x.title}`}
            onClick={() => setStep(i)}
            className="py-2 cursor-pointer"
          >
            <span className="block h-[3px] bg-line overflow-hidden">
              <span
                key={i === step ? `on-${step}` : 'off'}
                className={`block h-full bg-fg ${i < step ? 'w-full' : i === step ? (reduce ? 'w-full' : 'gate-bar') : 'w-0'}`}
              />
            </span>
          </button>
        ))}
      </div>

      <div key={step} className="gate-caption mt-1 min-h-[70px]" aria-live="polite">
        <p className="text-[12px] font-semibold text-muted tabular-nums">Step {step + 1} of 3</p>
        <p className="mt-1 text-[18px] font-semibold text-fg leading-snug">{s.title}</p>
        <p className="mt-0.5 text-[14px] text-muted leading-snug">{s.body}</p>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-fg-2">
        <ArrowDown className={`w-4 h-4 text-[#0A84FF] ${reduce ? '' : 'animate-bounce'}`} />
        Share is in Safari&apos;s bar, right below
      </p>
    </GateShell>
  );
};
