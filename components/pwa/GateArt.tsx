'use client';

import React, { useEffect, useState } from 'react';
import { HandwrittenText } from '@/components/ui/HandwrittenText';
import { Bell, Calendar } from '@/components/ui/icons';

// Illustrations for the "get the app" gates: a phone drawn in the app's own style
// (sharp cards, ink + soft subject tints), animated with CSS so it stays light.

const Phone: React.FC<{ children: React.ReactNode; island?: boolean }> = ({ children, island }) => (
  <div className="relative h-full aspect-[9/19] shrink-0">
    <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-[30px] bg-line-soft" aria-hidden="true" />
    <div className="absolute inset-0 rounded-[30px] border-[5px] border-fg bg-surface overflow-hidden">
      {/* status bar */}
      <div className="relative h-6 flex items-center justify-between px-4 text-[8px] font-semibold text-fg tabular-nums">
        <span>9:41</span>
        {island ? (
          <span className="absolute left-1/2 top-1 -translate-x-1/2 w-12 h-3.5 rounded-full bg-fg" />
        ) : (
          <span className="absolute left-1/2 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-fg" />
        )}
        <span className="flex items-center gap-0.5">
          <span className="w-2.5 h-1.5 bg-fg/80" />
          <span className="w-1 h-1.5 bg-fg/40" />
        </span>
      </div>
      {children}
    </div>
  </div>
);

const MiniHome: React.FC = () => (
  <div className="px-2.5 pt-1 flex flex-col gap-1.5">
    <p className="text-[9px] leading-none text-fg tracking-tighter">
      <span className="font-extrabold">inter</span>
      <span className="opacity-80">semester</span>
    </p>
    <p className="mt-1 text-[11px] font-semibold text-fg leading-none">Good morning</p>
    <div className="mt-1 bg-ink text-on-ink p-2">
      <div className="flex items-center justify-between text-[6.5px] font-semibold opacity-70 tracking-wider">
        <span>NEXT CLASS</span>
        <span className="flex items-center gap-0.5">
          <span className="w-1 h-1 bg-emerald-400 animate-pulse" /> 12 MIN
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold leading-tight">Data Structures</p>
      <p className="mt-0.5 text-[7px] opacity-70">10:00 · Room 204</p>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      <div className="border border-line p-1.5">
        <p className="text-[6.5px] font-semibold text-muted">Attendance</p>
        <p className="text-[11px] font-semibold text-fg leading-tight tabular-nums">82%</p>
        <div className="mt-1 h-[3px] bg-surface-2">
          <div className="gate-fill h-full bg-emerald-500" />
        </div>
      </div>
      <div className="border border-line p-1.5">
        <p className="text-[6.5px] font-semibold text-muted">Due tomorrow</p>
        <p className="text-[8px] font-semibold text-fg leading-tight">DBMS assignment</p>
      </div>
    </div>
    {['bg-[#DCE8FB] dark:bg-[#1D2A3E]', 'bg-[#FBE3D2] dark:bg-[#3A281D]', 'bg-[#DDF1E3] dark:bg-[#1C3226]', 'bg-[#EEE2FA] dark:bg-[#2D2340]', 'bg-[#FBF0C9] dark:bg-[#3A3218]'].map((t, i) => (
      <div key={i} className="flex items-center gap-1.5 border border-line-soft p-1.5">
        <span className={`w-1 self-stretch ${t}`} />
        <span className="flex-1">
          <span className="block h-1 w-3/4 bg-fg/25" />
          <span className="mt-1 block h-1 w-1/2 bg-fg/10" />
        </span>
      </div>
    ))}
  </div>
);

/** Android: the app's Home on a tilted phone, with pieces of the app floating out of it. */
const Chip: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ className = '', style, children }) => (
  <div
    className={`ai-float absolute z-10 flex items-center gap-1.5 bg-surface border border-line px-2.5 py-2 text-[11px] font-semibold text-fg whitespace-nowrap shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)] ${className}`}
    style={style}
  >
    {children}
  </div>
);

export const AndroidGateArt: React.FC = () => (
  <div className="relative h-full flex items-center justify-center" aria-hidden="true">
    {/* soft glow */}
    <div className="absolute w-[78%] aspect-square rounded-full bg-[radial-gradient(closest-side,rgba(147,197,253,0.35),rgba(196,181,253,0.18),transparent)] dark:bg-[radial-gradient(closest-side,rgba(96,165,250,0.18),rgba(167,139,250,0.10),transparent)]" />
    <div className="relative h-full">
      <div className="h-full -rotate-[4deg]">
        <Phone>
          <MiniHome />
          <div className="gate-notif absolute left-1.5 right-1.5 top-7 bg-surface border border-fg shadow-lg p-1.5 flex items-start gap-1.5">
            <span className="w-4 h-4 shrink-0 bg-ink text-on-ink text-[7px] font-bold flex items-center justify-center">is</span>
            <span className="min-w-0">
              <span className="block text-[7.5px] font-semibold text-fg leading-tight">Class moved</span>
              <span className="block text-[7px] text-muted leading-tight">DBMS is now in Room 204</span>
            </span>
          </div>
        </Phone>
      </div>

      <Chip className="-left-[58px] top-[4%] -rotate-[3deg]" style={{ animationDelay: '0.2s' }}>
        <span className="w-5 h-5 flex items-center justify-center bg-[#DCE8FB] dark:bg-[#1D2A3E]">
          <Calendar className="w-3 h-3" />
        </span>
        Live timetable
      </Chip>

      {/* home-screen widget */}
      <div
        className="ai-float absolute z-10 -right-[46px] top-[47%] w-[84px] rounded-[16px] bg-ink text-on-ink p-2.5 shadow-[0_14px_30px_-14px_rgba(0,0,0,0.5)] rotate-[3deg]"
        style={{ animationDelay: '0.9s' }}
      >
        <p className="text-[7px] font-semibold tracking-wider opacity-60">NEXT · 12 MIN</p>
        <p className="mt-1 text-[12px] font-semibold leading-tight">Data Structures</p>
        <p className="mt-1 text-[8px] opacity-70">Room 204</p>
      </div>

      <Chip className="-left-[50px] bottom-[14%] rotate-[2deg]" style={{ animationDelay: '1.5s' }}>
        <span className="w-5 h-5 flex items-center justify-center bg-[#FBE3D2] dark:bg-[#3A281D]">
          <Bell className="w-3 h-3" />
        </span>
        Exam in 3 days
      </Chip>

      {/* note */}
      <div className="absolute -right-[50px] top-[31%] w-max rotate-[5deg] text-[19px] leading-none text-fg whitespace-nowrap z-20 bg-canvas px-1 py-0.5 [&_*]:whitespace-nowrap">
        <HandwrittenText text="widget!" playKey="gate-android-3" delay={0.8} />
      </div>
      <svg viewBox="0 0 40 60" className="absolute -right-[30px] top-[35%] w-[22px] h-[34px] overflow-visible z-20" fill="none">
        <path d="M 14 4 C 34 18, 36 38, 22 54" pathLength={1} className="stroke-fg nf-draw" strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: '1.7s' }} />
        <path d="M 16 46 L 21 55 L 30 50" pathLength={1} className="stroke-fg nf-draw" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: '2.25s', animationDuration: '250ms' }} />
      </svg>
    </div>
  </div>
);

// ---------- iOS ----------

export const IOS_STEPS = 3;

/** Cycles 0 → 1 → 2 so the picture and the step list move together. */
export function useIOSStep(reduce: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep((s) => (s + 1) % IOS_STEPS), 2600);
    return () => clearInterval(id);
  }, [reduce]);
  return [step, setStep] as const;
}

const ShareGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
  </svg>
);

const PlusGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const IOSGateArt: React.FC<{ step: number }> = ({ step }) => (
  <div className="relative h-full flex items-center justify-center" aria-hidden="true">
    <div className="absolute w-[78%] aspect-square rounded-full bg-[radial-gradient(closest-side,rgba(147,197,253,0.35),rgba(196,181,253,0.18),transparent)] dark:bg-[radial-gradient(closest-side,rgba(96,165,250,0.18),rgba(167,139,250,0.10),transparent)]" />
    <div className="relative h-full">
      <Phone island>
        {/* page in Safari, or the home screen on the last step */}
        <div className={`absolute inset-x-0 top-6 bottom-0 transition-opacity duration-500 ${step === 2 ? 'opacity-0' : 'opacity-100'}`}>
          <MiniHome />
          {/* Safari bottom bar */}
          <div className="absolute inset-x-0 bottom-0 h-9 bg-surface-2 border-t border-line flex items-center justify-around px-3 text-fg/60">
            <span className="text-[10px]">‹</span>
            <span className="text-[10px]">›</span>
            <span className={`relative flex items-center justify-center w-6 h-6 ${step === 0 ? 'text-[#0A84FF]' : ''}`}>
              {step === 0 && <span className="absolute inset-0 rounded-full border-2 border-[#0A84FF] gate-ping" />}
              <ShareGlyph className="w-3.5 h-3.5" />
            </span>
            <span className="w-2.5 h-2.5 border border-current" />
            <span className="w-2.5 h-2.5 border border-current" />
          </div>
          {/* share sheet */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-surface border-t border-line rounded-t-[14px] p-2 transition-transform duration-500 ease-out ${
              step === 1 ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <span className="block mx-auto w-6 h-1 rounded-full bg-line-strong mb-1.5" />
            {['Copy', 'Add to Home Screen', 'Add Bookmark'].map((r) => {
              const on = r === 'Add to Home Screen';
              return (
                <div
                  key={r}
                  className={`flex items-center justify-between px-1.5 py-1.5 text-[7.5px] font-medium border-b border-line-soft last:border-0 ${
                    on ? 'bg-[#0A84FF]/10 text-[#0A84FF] font-semibold' : 'text-fg'
                  }`}
                >
                  {r}
                  {on ? <PlusGlyph className="w-3 h-3" /> : <span className="w-2 h-2 border border-current opacity-50" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* home screen */}
        <div className={`absolute inset-x-0 top-6 bottom-0 p-3 transition-opacity duration-500 bg-gradient-to-b from-[#DCE8FB] to-[#EEE2FA] dark:from-[#1D2A3E] dark:to-[#2D2340] ${step === 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {Array.from({ length: 11 }).map((_, i) => (
              <span key={i} className="aspect-square rounded-[7px] bg-white/60 dark:bg-white/10" />
            ))}
            <span className={`relative aspect-square ${step === 2 ? 'gate-pop' : 'opacity-0'}`}>
              <span className="absolute inset-0 rounded-[7px] bg-white overflow-hidden flex items-center justify-center shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo51.png" alt="" className="w-full h-full object-cover scale-[1.75]" draggable={false} />
              </span>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[6px] font-medium text-fg whitespace-nowrap">Intersemester</span>
            </span>
          </div>
        </div>
      </Phone>

    </div>
  </div>
);
