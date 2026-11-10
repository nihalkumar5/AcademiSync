'use client';

import { HandwrittenText } from '@/components/ui/HandwrittenText';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bell, CheckSquare, Clock, GraduationCap, Link as LinkIcon, Loader2, MapPin, Users } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { Illustration, IllustrationName } from '@/components/ui/Illustration';
import { TimetableImportModal } from '@/components/timetable/TimetableImportModal';
import { SelectBatchModal } from '@/components/batch/SelectBatchModal';

// First-run flow. Three steps, one job each:
//   1. Welcome: what this is, in one line.
//   2. Preview: show the payoff (a real-looking Home), not a feature list.
//   3. Connect: the one action that makes the app useful, joining your class batch.
// "Skip" on the intro steps jumps to Connect instead of leaving, so nobody lands on an empty app by accident.

type Step = 0 | 1 | 2;
const STEPS = 3;

const ART: Record<Step, IllustrationName> = { 0: 'launch', 1: 'attendance', 2: 'friends' };
const SIDE_COPY: Record<Step, { kicker: string; line: string }> = {
  0: { kicker: 'Welcome', line: 'Every academic day, clear and predictable.' },
  1: { kicker: 'Your day', line: 'Classes, attendance, tasks and exams, all lined up before you ask.' },
  2: { kicker: 'Your class', line: 'Your CR keeps the timetable fresh. Changes reach you on their own.' },
};

export const OnboardingModal = () => {
  const { profile, updateProfile, joinBatchTimetable, showToast, user, isClerkLoaded, setShowOnboarding } = useApp();
  const reduceMotion = useReducedMotion();
  const isSignedIn = !!user;

  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [joining, setJoining] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const inviteRef = useRef<HTMLInputElement>(null);

  // Auto-connect a batch invite that was opened before signing in
  useEffect(() => {
    if (!isSignedIn || !isClerkLoaded) return;
    const pending = localStorage.getItem('pending_join_invite');
    if (pending) {
      localStorage.removeItem('pending_join_invite');
      joinBatchTimetable(pending, undefined, true)
        .then(() => updateProfile({ onboardingCompleted: true }))
        .catch((e) => console.warn('Auto invite join failed:', e));
    }
  }, [isSignedIn, isClerkLoaded]);

  useEffect(() => {
    if (inviteOpen) setTimeout(() => inviteRef.current?.focus(), 60);
  }, [inviteOpen]);

  if (profile?.onboardingCompleted || profile?.role === 'faculty') return null;

  const go = (to: Step) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const next = () => step < 2 && go((step + 1) as Step);
  const back = () => step > 0 && go((step - 1) as Step);

  const finish = () => {
    updateProfile({ onboardingCompleted: true });
    setShowOnboarding(false);
  };

  const joinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteCode.trim();
    if (!code) {
      setInviteError('Paste the code or link your CR shared.');
      return;
    }
    setInviteError('');
    if (code.includes('invite=')) code = new URLSearchParams(code.split('?')[1] || '').get('invite') || code;
    else if (code.includes('/')) code = code.split('/').pop() || code;

    if (!isSignedIn) {
      try {
        localStorage.setItem('pending_join_invite', code);
      } catch {}
      showToast('Sign in to join', "We'll connect you to this batch right after.", 'info');
      window.location.href = '/sign-in';
      return;
    }

    setJoining(true);
    try {
      try {
        localStorage.setItem('pending_join_invite', code);
      } catch {}
      await joinBatchTimetable(code);
      finish();
    } catch (err: any) {
      setInviteError(err?.message || "That code didn't work. Check it with your CR.");
    } finally {
      setJoining(false);
    }
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * 24 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
    exit: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * -24, transition: { duration: 0.16 } }),
  };

  // ---------- Step content ----------
  const content: Record<Step, React.ReactNode> = {
    0: (
      <>
        <p className="text-[13px] font-semibold text-muted">Welcome to Intersemester</p>
        <h1 className="mt-2 text-[34px] sm:text-[42px] leading-[1.06] tracking-tight text-fg">
          Your whole semester,
          <span className="block mt-1.5 -rotate-1 origin-left">
            <HandwrittenText text="one calm app." playKey="onboarding-welcome" delay={0.45} className="text-[46px] sm:text-[56px] leading-[1] font-semibold text-fg" />
          </span>
        </h1>
        <p className="mt-4 text-[16px] leading-[24px] text-muted max-w-[420px]">
          Timetable, attendance, tasks and exams in one place that keeps itself up to date.
        </p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {[
            { icon: Clock, text: 'Know your next class before the bell' },
            { icon: Bell, text: 'Reminders for classes, tasks and exams' },
            { icon: Users, text: 'Always in sync with your class' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-[15px] text-fg">
              <span className="w-8 h-8 shrink-0 flex items-center justify-center border border-line bg-surface">
                <Icon className="w-4 h-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </>
    ),
    1: (
      <>
        <p className="text-[13px] font-semibold text-muted">Your day, at a glance</p>
        <h1 className="mt-2 text-[32px] sm:text-[40px] leading-[1.06] tracking-tight text-fg">
          Open the app,
          <span className="block mt-1 -rotate-1 origin-left">
            <HandwrittenText text="know your day." playKey="onboarding-day" delay={0.35} className="text-[42px] sm:text-[50px] leading-[1] font-semibold text-fg" />
          </span>
        </h1>
        <p className="mt-3 text-[15px] leading-[22px] text-muted max-w-[420px]">This is your Home once you&apos;re connected. No digging, no asking around.</p>
        <DayPreview reduceMotion={!!reduceMotion} />
      </>
    ),
    2: (
      <>
        <SyncScene reduceMotion={!!reduceMotion} />
        <p className="mt-4 text-[13px] font-semibold text-muted">Last step</p>
        <h1 className="mt-2 text-[32px] sm:text-[40px] leading-[1.06] tracking-tight text-fg">
          Join your class,
          <span className="block mt-1 -rotate-1 origin-left">
            <HandwrittenText text="your CR does the rest." playKey="onboarding-connect" delay={0.35} className="text-[36px] sm:text-[44px] leading-[1] font-semibold text-fg" />
          </span>
        </h1>
        <p className="mt-3 text-[15px] leading-[22px] text-muted max-w-[420px]">
          Timetable, subjects and holidays arrive ready-made. When your CR moves a class, your phone knows in seconds.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {/* Primary: find the class */}
          <button
            type="button"
            onClick={() => setBatchOpen(true)}
            className="group w-full text-left border border-ink bg-ink text-on-ink p-4 flex items-center gap-4 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-on-ink/10 border border-on-ink/15">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[16px] font-semibold">Find my class</span>
              <span className="block text-[13px] opacity-70 mt-0.5">College, branch and semester</span>
            </span>
            <ArrowRight className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Secondary: invite code */}
          <div className="border border-line bg-surface">
            {!inviteOpen ? (
              <button type="button" onClick={() => setInviteOpen(true)} className="w-full p-4 flex items-center gap-4 text-left cursor-pointer hover:bg-surface-2 transition-colors">
                <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-surface-2 border border-line-soft">
                  <LinkIcon className="w-5 h-5 text-fg" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-semibold text-fg">I have an invite code</span>
                  <span className="block text-[13px] text-muted mt-0.5">From your CR or a classmate</span>
                </span>
                <ArrowRight className="w-5 h-5 shrink-0 text-muted" />
              </button>
            ) : (
              <form onSubmit={joinWithCode} className="p-4" noValidate>
                <label htmlFor="onb-invite" className="text-[13px] font-semibold text-fg">
                  Invite code or link
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="onb-invite"
                    ref={inviteRef}
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      if (inviteError) setInviteError('');
                    }}
                    placeholder="e.g. 7KQ2XD"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={!!inviteError}
                    className={`flex-1 min-w-0 h-12 px-3.5 bg-surface border text-[15px] text-fg font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-faint focus:outline-none ${
                      inviteError ? 'border-danger' : 'border-line focus:border-fg'
                    }`}
                  />
                  <button type="submit" disabled={joining} className="btn btn-primary h-12 px-5">
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                  </button>
                </div>
                {inviteError && <p className="mt-2 text-[13px] text-danger">{inviteError}</p>}
              </form>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={finish}
          className="mt-5 self-start text-[14px] font-medium text-muted hover:text-fg underline underline-offset-4 cursor-pointer"
        >
          Skip for now, I&apos;ll add my classes myself
        </button>
      </>
    ),
  };

  const primaryLabel = step === 0 ? 'Get started' : 'Continue';

  return (
    <div className="fixed inset-0 z-[100] bg-canvas text-fg w-full h-[100dvh] overflow-hidden lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" role="dialog" aria-modal="true" aria-label="Welcome to Intersemester">
      {/* ===== Desktop side panel ===== */}
      <aside className="hidden lg:flex sheen-ink relative overflow-hidden bg-ink text-on-ink flex-col justify-between p-12 xl:p-16">
        <div className="flex items-center gap-3">
          <span className="text-[24px] leading-none tracking-tighter font-sans" aria-label="intersemester">
            <span className="font-extrabold">inter</span>
            <span className="font-normal opacity-80">semester</span>
          </span>
        </div>
        <div className="max-w-[500px]">
          <div className="bg-surface border border-white/10 h-[340px] p-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={ART[step]}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="h-full flex items-center justify-center"
              >
                <Illustration name={ART[step]} className="h-full w-auto" />
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.12em] opacity-60">{SIDE_COPY[step].kicker}</p>
          <p className="mt-2 text-[24px] leading-[1.25] tracking-tight max-w-[440px]">{SIDE_COPY[step].line}</p>
        </div>
        <Progress step={step} onInk />
      </aside>

      {/* ===== Main column ===== */}
      <main className="h-[100dvh] flex flex-col">
        {/* Top bar */}
        <header className="shrink-0 px-5 sm:px-8 pt-[max(env(safe-area-inset-top),16px)]">
          <div className="relative h-12 flex items-center justify-between">
            {step > 0 ? (
              <button type="button" onClick={back} aria-label="Back" className="-ml-2 w-10 h-10 flex items-center justify-center text-fg hover:bg-surface-2 cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2 lg:invisible">
                <span className="text-[21px] leading-none text-fg tracking-tighter font-sans" aria-label="intersemester">
                  <span className="font-extrabold">inter</span>
                  <span className="font-normal opacity-80">semester</span>
                </span>
              </div>
            )}
            {step < 2 ? (
              <button type="button" onClick={() => go(2)} className="h-10 px-2 -mr-2 text-[14px] font-medium text-muted hover:text-fg cursor-pointer">
                Skip
              </button>
            ) : (
              <span />
            )}
          </div>
          <div className="lg:hidden mt-1">
            <Progress step={step} />
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="min-h-full flex flex-col px-5 sm:px-8">
            <div className="w-full max-w-[460px] mx-auto my-auto py-6">
              {/* Phone illustration (not on the preview step, which has its own visual) */}
              {step === 0 && (
                <div className="lg:hidden flex justify-center mb-6">
                  <Illustration name={ART[step]} className={step === 0 ? 'h-[200px] w-auto' : 'h-[150px] w-auto'} />
                </div>
              )}
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col">
                  {content[step]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom action (steps 1–2; the last step's actions live in the content) */}
        {step < 2 && (
          <footer className="shrink-0 px-5 sm:px-8 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+12px),20px)] border-t border-line-soft bg-canvas">
            <div className="w-full max-w-[460px] mx-auto">
              <button type="button" onClick={next} className="btn btn-primary btn-lg w-full">
                {primaryLabel}
                <ArrowRight className="w-4 h-4" />
              </button>
              {step === 0 && !isSignedIn && (
                <p className="mt-3 text-center text-[14px] text-muted">
                  Already using Intersemester?{' '}
                  <a href="/sign-in" className="font-semibold text-fg underline underline-offset-4">
                    Log in
                  </a>
                </p>
              )}
            </div>
          </footer>
        )}
      </main>

      <TimetableImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      <SelectBatchModal isOpen={batchOpen} onClose={() => setBatchOpen(false)} />
    </div>
  );
};

// ---------- Pieces ----------

const Progress: React.FC<{ step: Step; onInk?: boolean }> = ({ step, onInk }) => (
  <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS}`}>
    {Array.from({ length: STEPS }).map((_, i) => (
      <span key={i} className={`h-1 flex-1 ${onInk ? 'max-w-[56px]' : ''} ${onInk ? 'bg-on-ink/20' : 'bg-line'} relative overflow-hidden`}>
        <span
          className={`absolute inset-y-0 left-0 ${onInk ? 'bg-on-ink' : 'bg-fg'} transition-[width] duration-500 ease-out`}
          style={{ width: i <= step ? '100%' : '0%' }}
        />
      </span>
    ))}
  </div>
);



// ---------- Handwritten callouts ----------

/** A short hand-drawn arrow; draws itself after `delay` seconds (uses the .nf-draw stroke animation). */
const DrawnArrow: React.FC<{ d: string; head: string; delay: number; className?: string; viewBox: string }> = ({ d, head, delay, className, viewBox }) => (
  <svg viewBox={viewBox} className={className} fill="none" aria-hidden="true">
    <path d={d} pathLength={1} className="stroke-fg nf-draw" strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: `${delay}s` }} />
    <path
      d={head}
      pathLength={1}
      className="stroke-fg nf-draw"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animationDelay: `${delay + 0.55}s`, animationDuration: '250ms' }}
    />
  </svg>
);

function useCountUp(to: number, ms: number, delayMs: number, reduce: boolean) {
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delayMs;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delayMs, reduce]);
  return v;
}

/** A living picture of Home: the next class counting down, attendance filling up, what's due, with notes in the margin. */
const DayPreview: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const item = (i: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { delay: reduceMotion ? 0 : 0.15 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  });
  const attendance = useCountUp(82, 1100, 550, reduceMotion);

  // "in 15 min" ticks down to 12 once, so the card feels live
  const [mins, setMins] = useState(reduceMotion ? 12 : 15);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setMins((m) => (m > 12 ? m - 1 : m)), 520);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="relative mt-4 pt-10 pb-12" aria-label="Example of your Home screen">
      {/* note: next class */}
      <div className="absolute top-0 right-[106px] rotate-[3deg] text-[21px] leading-none text-fg whitespace-nowrap" aria-hidden="true">
        <HandwrittenText text="before the bell!" playKey="onb-note-bell" delay={1.1} />
      </div>
      <DrawnArrow
        viewBox="0 0 48 46"
        className="absolute top-[4px] right-[52px] w-[48px] h-[46px] z-10 pointer-events-none"
        d="M 2 8 C 28 0, 44 16, 36 38"
        head="M 29 32 L 36 40 L 43 33"
        delay={1.9}
      />

      <div className="flex flex-col gap-2.5">
        {/* Next class */}
        <motion.div {...item(0)} className="sheen-ink relative overflow-hidden bg-ink text-on-ink border border-ink p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.08em] opacity-70">
            <span>NEXT CLASS</span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 bg-emerald-400 animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 bg-emerald-400" />
              </span>
              in {mins} min
            </span>
          </div>
          <p className="mt-2 text-[20px] font-semibold leading-tight">Data Structures</p>
          <div className="mt-2 flex items-center gap-4 text-[13px] opacity-80">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 10:00 – 10:55 AM
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Room 204
            </span>
          </div>
          {/* time-to-class bar */}
          <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-on-ink/10">
            <motion.span
              className="block h-full bg-emerald-400"
              initial={{ width: reduceMotion ? '78%' : '55%' }}
              animate={{ width: '78%' }}
              transition={{ delay: 0.5, duration: 1.6, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Reminder */}
        <motion.div {...item(1)} className="border border-line bg-surface px-3.5 py-3 flex items-center gap-3">
          <span className="onb-ring w-8 h-8 shrink-0 flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20">
            <Bell className="w-4 h-4" />
          </span>
          <p className="text-[13px] leading-[18px] text-fg">
            <span className="font-semibold">Tomorrow: 4 classes from 9:00 AM.</span> <span className="text-muted">Lab at 2:00 PM.</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Attendance */}
          <motion.div {...item(2)} className="border border-line bg-surface p-3.5">
            <p className="text-[12px] font-semibold text-muted">Attendance</p>
            <p className="mt-1 text-[24px] font-semibold text-fg tabular-nums leading-none">{attendance}%</p>
            <div className="mt-2.5 h-1.5 bg-surface-2 relative">
              <span className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${attendance}%` }} />
              <span className="absolute -top-0.5 -bottom-0.5 w-px bg-fg/50" style={{ left: '75%' }} />
            </div>
            <p className="mt-2 text-[12px] text-emerald-700 dark:text-emerald-300 font-semibold">Safe above 75%</p>
          </motion.div>

          {/* Task */}
          <motion.div {...item(3)} className="border border-line bg-surface p-3.5 flex flex-col">
            <p className="text-[12px] font-semibold text-muted">Due tomorrow</p>
            <p className="mt-1 text-[15px] font-semibold text-fg leading-snug">DBMS assignment</p>
            <p className="mt-auto pt-2 flex items-center gap-1.5 text-[12px] text-muted">
              <CheckSquare className="w-3.5 h-3.5" /> By 11:59 PM
            </p>
          </motion.div>
        </div>
      </div>

      {/* note: attendance */}
      <DrawnArrow
        viewBox="0 0 44 44"
        className="absolute bottom-[8px] left-[14px] w-[44px] h-[44px] pointer-events-none"
        d="M 40 34 C 16 40, 8 24, 14 5"
        head="M 8 12 L 14 4 L 20 11"
        delay={2.6}
      />
      <div className="absolute bottom-0 left-[58px] -rotate-2 text-[21px] leading-none text-fg whitespace-nowrap" aria-hidden="true">
        <HandwrittenText text="can bunk 2 more, safely ;)" playKey="onb-note-bunk" delay={1.9} />
      </div>
    </div>
  );
};

// ---------- Connect scene: the CR's timetable flowing out to the class ----------

const TINTS = [
  'fill-[#DCE8FB] dark:fill-[#1D2A3E]',
  'fill-[#FBE3D2] dark:fill-[#3A281D]',
  'fill-[#DDF1E3] dark:fill-[#1C3226]',
  'fill-[#EEE2FA] dark:fill-[#2D2340]',
  'fill-[#FBF0C9] dark:fill-[#3A3218]',
];

const PEERS = [
  { x: 46, y: 46, d: 'M 132 68 C 104 58, 86 46, 68 46', tint: 1 },
  { x: 46, y: 134, d: 'M 132 100 C 104 112, 86 134, 68 134', tint: 2 },
  { x: 294, y: 46, d: 'M 208 68 C 236 58, 254 46, 272 46', tint: 3 },
  { x: 294, y: 134, d: 'M 208 100 C 236 112, 254 134, 272 134', tint: 0, you: true },
];
const PERIOD = 2.8;

const SyncScene: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => (
  <div className="relative w-full max-w-[360px] mx-auto aspect-[340/190] select-none" aria-hidden="true">
    <svg viewBox="0 0 340 190" className="absolute inset-0 w-full h-full overflow-visible">
      {/* links */}
      {PEERS.map((p, i) => (
        <path key={`l${i}`} d={p.d} fill="none" className={`${p.you ? 'stroke-fg' : 'stroke-line-strong'} nf-trail`} strokeWidth={p.you ? 1.5 : 1.3} strokeDasharray="2 6" strokeLinecap="round" />
      ))}

      {/* CR's timetable */}
      <g className="nf-float">
        <rect x="136" y="46" width="76" height="68" className="fill-line-soft" />
        <rect x="132" y="42" width="76" height="68" className="fill-surface stroke-fg" strokeWidth="1.3" />
        <rect x="132" y="42" width="76" height="14" className="fill-ink" />
        {[0, 1, 2].map((c) =>
          [0, 1, 2].map((r) =>
            (c + r) % 4 === 3 ? null : (
              <rect key={`${c}${r}`} x={139 + c * 22} y={62 + r * 15} width="18" height="11" rx="1.5" className={TINTS[(c + r * 2) % TINTS.length]} />
            ),
          ),
        )}
        {/* CR badge */}
        <circle cx="208" cy="42" r="12" className="fill-ink" />
        <text x="208" y="46" textAnchor="middle" className="fill-on-ink" style={{ font: '700 10px var(--font-sans, system-ui)' }}>
          CR
        </text>
      </g>

      {/* classmates */}
      {PEERS.map((p, i) => (
        <g key={`p${i}`}>
          {!reduceMotion && (
            <circle cx={p.x} cy={p.y} r="20" fill="none" className="stroke-fg onb-arrive" strokeWidth="1.2" style={{ animationDelay: `${i * 0.5}s`, animationDuration: `${PERIOD}s` }} />
          )}
          <circle cx={p.x} cy={p.y} r="20" className={`${TINTS[p.tint]} ${p.you ? 'stroke-fg' : 'stroke-line-strong'}`} strokeWidth={p.you ? 2 : 1.2} />
          <circle cx={p.x} cy={p.y - 5} r="6.5" className="fill-fg/75" />
          <path d={`M ${p.x - 11} ${p.y + 14} C ${p.x - 10} ${p.y + 3}, ${p.x + 10} ${p.y + 3}, ${p.x + 11} ${p.y + 14} Z`} className="fill-fg/75" />
          {p.you && (
            <g className="onb-pop" style={{ animationDelay: '1.4s' }}>
              <circle cx={p.x + 15} cy={p.y - 15} r="7.5" className="fill-emerald-500 stroke-surface" strokeWidth="2" />
              <path d={`M ${p.x + 11.5} ${p.y - 15} l 2.4 2.4 l 4.6 -4.6`} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
      ))}

      {/* timetable packets travelling out */}
      {!reduceMotion &&
        PEERS.map((p, i) => (
          <rect key={`k${i}`} x="-4" y="-4" width="8" height="8" rx="1" className="fill-fg" opacity="0">
            <animateMotion dur={`${PERIOD}s`} begin={`${i * 0.5 - PERIOD}s`} repeatCount="indefinite" path={p.d} keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" />
            <animate attributeName="opacity" dur={`${PERIOD}s`} begin={`${i * 0.5 - PERIOD}s`} repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;0.1;0.72;0.8;1" />
          </rect>
        ))}

      {/* note arrow → you */}
      <path d="M 236 172 C 262 178, 278 168, 286 160" pathLength={1} fill="none" className="stroke-fg nf-draw" strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: '1.9s' }} />
      <path d="M 278 158 L 287 159 L 285 168" pathLength={1} fill="none" className="stroke-fg nf-draw" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: '2.45s', animationDuration: '250ms' }} />
    </svg>
    <div className="absolute left-[44%] top-[90%] -translate-y-1/2 -rotate-2 text-[21px] leading-none text-fg whitespace-nowrap">
      <HandwrittenText text="that's you!" playKey="onb-note-you" delay={1.1} />
    </div>
  </div>
);
