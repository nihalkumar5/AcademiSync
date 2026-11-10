'use client';

import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowRight } from '@/components/ui/icons';
import { GateShell } from './GateShell';
import { AndroidGateArt } from './GateArt';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.intersemester.app';
const INTENT_URL = `intent://open#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;

/** Google Play's four-colour triangle. */
const PlayMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 26" className={className} aria-hidden="true">
    <path d="M1.2 1.1 13 13 1.2 24.9c-.4-.2-.7-.7-.7-1.3V2.4c0-.6.3-1.1.7-1.3z" fill="#2196F3" />
    <path d="M17.1 8.9 13 13 1.2 1.1c.4-.2 1-.2 1.5.1z" fill="#4CAF50" />
    <path d="M17.1 17.1 2.7 24.8c-.5.3-1.1.3-1.5.1L13 13z" fill="#F44336" />
    <path d="M21.6 11.6c1 .6 1 2.2 0 2.8l-4.5 2.7L13 13l4.1-4.1z" fill="#FFC107" />
  </svg>
);

// Android browsers get the app instead of the website (the app is the full experience:
// alarms, widget, notifications). The native app and an installed PWA skip this.
export const AndroidAppGate: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isStandalone =
      (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches || Capacitor.isNativePlatform();
    if (new URLSearchParams(window.location.search).get('preview') === 'android') {
      setShow(true);
      return;
    }
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) return;
    if (isAndroid && !isStandalone) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <GateShell label="Get the Intersemester app" art={<AndroidGateArt />}>
      <h2 className="text-[28px] leading-[1.08] font-semibold tracking-tight text-fg">
        Your semester,
        <br />
        in your pocket.
      </h2>
      <p className="mt-2 text-[14px] leading-[21px] text-muted">Live timetable, class alerts and a home-screen widget. Free on Android.</p>

      <div className="mt-5 flex flex-col gap-2.5">
        <a href={INTENT_URL} className="btn btn-primary btn-lg w-full">
          Open Intersemester <ArrowRight className="w-4 h-4" />
        </a>
        <a
          href={PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 w-full flex items-center justify-center gap-3 border border-line-strong bg-surface text-fg hover:bg-surface-2 transition-colors"
        >
          <PlayMark className="w-5 h-5" />
          <span className="text-left leading-none">
            <span className="block text-[9px] font-semibold tracking-[0.08em] text-muted">GET IT ON</span>
            <span className="block mt-0.5 text-[16px] font-semibold tracking-tight">Google Play</span>
          </span>
        </a>
      </div>
      <p className="mt-3 text-center text-[12px] text-muted">Don&apos;t have it yet? &ldquo;Open&rdquo; takes you to Google Play.</p>
    </GateShell>
  );
};
