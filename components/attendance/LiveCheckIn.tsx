'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFullscreenOverlay } from '@/lib/useFullscreenOverlay';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, Maximize, Minimize, RefreshCw, Smartphone, X } from '@/components/ui/icons';
import { Capacitor } from '@capacitor/core';
import { QrCode } from '@/components/friends/QrCode';
import { formatTime12Hour } from '@/lib/timetableUtils';
import { rollTail } from '@/lib/attendance';
import {
  LIVE,
  LiveCheckin,
  LiveError,
  LiveInfo,
  LiveStray,
  clockOffset,
  closeLive,
  currentTick,
  makeCodeClock,
  openLive,
  pollLive,
  qrLink,
  slotProgress,
} from '@/lib/attendanceLive';

// The teacher's QR screen ("no roll call"). Show it on the projector or hold up the phone: students
// scan from their seats and their names come in live. Done → the review screen, where the teacher
// fixes anyone without a phone and saves to the register. Nothing is saved until then.

export interface LiveResult {
  liveId: string;
  checkins: LiveCheckin[];
  strays: LiveStray[];
}

const firstName = (n: string) => (n || '').trim().split(/\s+/)[0] || 'Student';

export const LiveCheckIn: React.FC<{
  batchKey: string;
  batchLabel: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime?: string;
  onDone: (r: LiveResult) => void;
  onCancel: () => void;
  /** Add someone who scanned but isn't on the class list (they joined this batch). */
  onAddStray?: (s: LiveStray) => Promise<boolean>;
}> = ({ batchKey, batchLabel, subjectName, date, startTime, endTime, onDone, onCancel, onAddStray }) => {
  const [phase, setPhase] = useState<'opening' | 'live' | 'error' | 'closing'>('opening');
  const [error, setError] = useState<LiveError | null>(null);
  const [live, setLive] = useState<LiveInfo | null>(null);
  const [code, setCode] = useState('');
  const [tick, setTick] = useState(0);
  const [checkins, setCheckins] = useState<LiveCheckin[]>([]);
  const [strays, setStrays] = useState<LiveStray[]>([]);
  const [shaky, setShaky] = useState(false); // polling is failing (keeps showing the QR)
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState<string | null>(null);
  const [fs, setFs] = useState(false);

  const offset = useRef(0);
  const bestRtt = useRef(Infinity);
  const lastServerNow = useRef(0);
  const clock = useRef<ReturnType<typeof makeCodeClock> | null>(null);
  const tickRef = useRef(-1);
  const ins = useRef(new Map<string, LiveCheckin>());
  const outs = useRef(new Map<string, LiveStray>());
  const closing = useRef(false);

  const merge = useCallback((c: LiveCheckin[] = [], s: LiveStray[] = []) => {
    let changed = false;
    c.forEach((x) => {
      if (!ins.current.has(x.uid)) changed = true;
      ins.current.set(x.uid, x);
      if (outs.current.delete(x.uid)) changed = true;
    });
    s.forEach((x) => {
      if (ins.current.has(x.uid)) return;
      const prev = outs.current.get(x.uid);
      if (!prev || prev.inBatch !== x.inBatch) changed = true;
      outs.current.set(x.uid, x);
    });
    if (changed) {
      setCheckins(Array.from(ins.current.values()).sort((a, b) => b.at - a.at));
      setStrays(Array.from(outs.current.values()).sort((a, b) => b.at - a.at));
    }
  }, []);

  const measure = (serverNow: number, sentAt: number) => {
    const gotAt = Date.now();
    const rtt = gotAt - sentAt;
    // Trust the quickest replies most: a slow reply says less about the clock
    if (rtt <= bestRtt.current * 1.5 || bestRtt.current === Infinity) {
      offset.current = clockOffset(serverNow, sentAt, gotAt);
      bestRtt.current = Math.min(bestRtt.current, rtt);
    }
    lastServerNow.current = serverNow;
  };

  const open = useCallback(async () => {
    setPhase('opening');
    setError(null);
    const sentAt = Date.now();
    try {
      const r = await openLive({ batchKey, batchLabel, subjectName, date, startTime, ...(endTime ? { endTime } : {}) });
      measure(r.serverNow, sentAt);
      clock.current = makeCodeClock(r.live.id, r.secret);
      if (!clock.current.available) throw new LiveError('error', "This browser can't show the QR. Open Intersemester in Chrome or the app.");
      tickRef.current = -1;
      setLive(r.live);
      merge(r.checkins, r.strays);
      setPhase('live');
    } catch (e: any) {
      setError(e instanceof LiveError ? e : new LiveError('error', 'Something went wrong. Try again.'));
      setPhase('error');
    }
  }, [batchKey, batchLabel, subjectName, date, startTime, endTime, merge]);

  useEffect(() => {
    open();
  }, [open]);

  // The QR: a new code every 3 s, made on this device on the server's clock
  useEffect(() => {
    if (phase !== 'live' || !live) return;
    const step = () => {
      const t = currentTick(offset.current);
      setNow(Date.now());
      if (t === tickRef.current) return;
      tickRef.current = t;
      clock.current?.code(t).then((c) => {
        if (tickRef.current === t) {
          setCode(c);
          setTick(t);
        }
      });
    };
    step();
    const id = setInterval(step, 200);
    return () => clearInterval(id);
  }, [phase, live]);

  // Who has checked in: ask every 2 s (a little overlap so nobody is missed)
  useEffect(() => {
    if (phase !== 'live' || !live) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const sentAt = Date.now();
      try {
        const r = await pollLive(live.id, lastServerNow.current - 8000);
        if (stop) return;
        measure(r.serverNow, sentAt);
        merge(r.checkins, r.strays);
        setLive((l) => (l && (l.status !== r.live.status || l.expiresAt !== r.live.expiresAt) ? r.live : l));
        setShaky(false);
      } catch {
        if (!stop) setShaky(true);
      }
      if (!stop) timer = setTimeout(run, LIVE.pollMs);
    };
    timer = setTimeout(run, LIVE.pollMs);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [phase, live?.id, merge]);

  // Keep the screen awake while the QR is up
  useEffect(() => {
    let lock: any = null;
    let gone = false;
    const req = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
      } catch {}
    };
    req();
    const onVis = () => document.visibilityState === 'visible' && !gone && req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.().catch(() => {});
    };
  }, []);

  const canFs = typeof document !== 'undefined' && !!document.fullscreenEnabled && !Capacitor.isNativePlatform();
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);
  const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  const finish = useCallback(async () => {
    if (closing.current) return;
    if (!live) return onCancel();
    closing.current = true;
    setPhase('closing');
    try {
      const r = await closeLive(live.id);
      merge(r.checkins, r.strays);
    } catch {
      // Offline: review what arrived; the check-in closes by itself in a few minutes
    }
    onDone({ liveId: live.id, checkins: Array.from(ins.current.values()), strays: Array.from(outs.current.values()) });
  }, [live, merge, onCancel, onDone]);

  // Android back / Escape go to the review (nothing is lost)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const addStray = async (s: LiveStray) => {
    if (!onAddStray) return;
    setAdding(s.uid);
    try {
      if (await onAddStray(s)) {
        // They scanned with a valid code already: count them, and refresh the list the server checks
        ins.current.set(s.uid, { uid: s.uid, key: s.uid, name: s.name, roll: s.roll, at: s.at });
        outs.current.delete(s.uid);
        setCheckins(Array.from(ins.current.values()).sort((a, b) => b.at - a.at));
        setStrays(Array.from(outs.current.values()).sort((a, b) => b.at - a.at));
        openLive({ batchKey, batchLabel, subjectName, date, startTime, ...(endTime ? { endTime } : {}) })
          .then((r) => setLive(r.live))
          .catch(() => {});
      }
    } finally {
      setAdding(null);
    }
  };

  useFullscreenOverlay();

  const serverNow = now + offset.current;
  const expired = !!live && (live.status === 'closed' || serverNow >= live.expiresAt);
  const left = live ? Math.max(0, live.expiresAt - serverNow) : 0;
  const leftText = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  const count = checkins.length;
  const total = live?.total || 0;
  const withoutApp = live ? Math.max(0, live.total - live.onApp) : 0;
  const elapsed = slotProgress(offset.current) * LIVE.periodMs;

  // On <body>, above everything: the app shell animates its views with transforms, which would
  // otherwise trap a fixed overlay inside the content column
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0B0B0C] text-white font-sans select-none" role="dialog" aria-modal="true" aria-label="QR attendance">
      <header className="shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[1400px] mx-auto w-full h-14 px-f4 flex items-center gap-2">
          <button type="button" onClick={finish} aria-label="Close" className="rounded-full w-11 h-11 -ml-2 flex items-center justify-center text-white/90 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold truncate">{subjectName}</p>
            <p className="text-[12px] text-white/55 truncate">
              {[batchLabel, formatTime12Hour(startTime)].filter(Boolean).join(' · ')}
            </p>
          </div>
          {shaky && phase === 'live' && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reconnecting
            </span>
          )}
          {canFs && (
            <button type="button" onClick={toggleFs} className="hidden sm:inline-flex h-9 px-3 items-center gap-1.5 border border-white/15 text-[13px] font-medium text-white/85 hover:border-white/35 cursor-pointer">
              {fs ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />} {fs ? 'Exit full screen' : 'Full screen'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {phase === 'opening' && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/70 text-[14px]">
            <Loader2 className="w-6 h-6 animate-spin" /> Starting QR check-in…
          </div>
        )}

        {phase === 'error' && (
          <div className="h-full flex flex-col items-center justify-center px-f5 text-center">
            <AlertTriangle className="w-7 h-7 text-amber-300" />
            <p className="mt-3 text-[18px] font-semibold">Couldn&apos;t start QR check-in</p>
            <p className="mt-1.5 text-[14px] text-white/60 max-w-sm">{error?.message}</p>
            <div className="mt-f4 flex gap-2">
              <button type="button" onClick={onCancel} className="rounded-full h-11 px-4 border border-white/20 text-[14px] font-semibold cursor-pointer">
                Close
              </button>
              {error?.code !== 'no-roster' && error?.code !== 'permission-denied' && (
                <button type="button" onClick={open} className="rounded-full h-11 px-4 bg-white text-[#111] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer">
                  <RefreshCw className="w-4 h-4" /> Try again
                </button>
              )}
            </div>
          </div>
        )}

        {(phase === 'live' || phase === 'closing') && live && (
          <div className="min-h-full max-w-[1400px] mx-auto px-f4 py-f3 lg:py-f4 flex flex-col lg:flex-row items-center justify-center gap-f5 lg:gap-f6">
            {/* The QR */}
            <section className="flex flex-col items-center w-full max-w-[min(100%,60vh)] lg:max-w-none lg:w-auto">
              <div className="rounded-tile relative bg-white p-3 sm:p-4 w-full aspect-square lg:w-[min(70vh,52vw)]">
                {code ? (
                  <QrCode value={qrLink(code)} className={`w-full h-full transition-opacity duration-300 ${expired ? 'opacity-10' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#111]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
                {expired && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-[#111]">
                    <p className="text-[18px] font-semibold">Check-in has closed</p>
                    <p className="mt-1 text-[14px] text-[#555]">It closes by itself after {LIVE.openMinutes} minutes.</p>
                    <button type="button" onClick={open} className="rounded-full mt-4 h-11 px-4 bg-[#111] text-white text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer">
                      <RefreshCw className="w-4 h-4" /> Reopen
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-full mt-3 w-full h-[3px] bg-white/10 overflow-hidden" aria-hidden="true">
                {!expired && code && <div key={tick} className="qr-slot h-full bg-[#18A889]" style={{ animationDuration: `${LIVE.periodMs}ms`, animationDelay: `-${Math.round(elapsed)}ms` }} />}
              </div>
              <p className="mt-2 text-[12px] text-white/45 text-center">The code changes every 3 seconds, so a photo sent to a friend won&apos;t work.</p>
            </section>

            {/* Count, who just came in, and anything that needs the teacher */}
            <section className="w-full max-w-[min(100%,60vh)] lg:max-w-[400px] lg:w-[400px] flex flex-col">
              <div aria-live="polite">
                <p className="flex items-baseline gap-2 leading-none">
                  <motion.span key={count} initial={{ scale: 1.18, color: '#5EE0C2' }} animate={{ scale: 1, color: '#FFFFFF' }} transition={{ duration: 0.5 }} className="inline-block origin-left text-[64px] lg:text-[96px] font-semibold tabular-nums tracking-tight">
                    {count}
                  </motion.span>
                  <span className="text-[20px] lg:text-[26px] text-white/45 tabular-nums">/ {total}</span>
                </p>
                <p className="mt-2 text-[15px] text-white/70">checked in</p>
              </div>
              <div className="rounded-full mt-f3 h-1.5 bg-white/10 overflow-hidden">
                <div className="h-full bg-[#18A889] transition-[width] duration-700" style={{ width: `${total ? Math.min(100, (count / total) * 100) : 0}%` }} />
              </div>

              <div className="mt-f4 flex items-start gap-3 text-[14px] text-white/70">
                <Smartphone className="w-5 h-5 shrink-0 mt-0.5 text-white/50" />
                <p>
                  <span className="text-white font-medium">Students:</span> open Intersemester and tap <span className="text-white font-medium">Scan</span>, or point your phone camera at the code.
                </p>
              </div>

              {checkins.length > 0 && (
                <ul className="mt-f4 flex flex-wrap gap-1.5" aria-label="Just checked in">
                  <AnimatePresence initial={false}>
                    {checkins.slice(0, 10).map((c) => (
                      <motion.li
                        key={c.uid}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-tile inline-flex items-center gap-1.5 h-8 px-2.5 bg-white/[0.07] border border-white/10 text-[13px]"
                      >
                        <Check className="w-3.5 h-3.5 text-[#5EE0C2]" />
                        {firstName(c.name)}
                        {c.roll && <span className="text-white/45 tabular-nums">{rollTail(c.roll)}</span>}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {checkins.length > 10 && <li className="inline-flex items-center h-8 px-2 text-[13px] text-white/45">+{checkins.length - 10} more</li>}
                </ul>
              )}

              {strays.length > 0 && (
                <details className="mt-f4 border border-amber-300/25 bg-amber-300/[0.07]">
                  <summary className="px-3 py-2.5 text-[13px] text-amber-200 cursor-pointer">
                    {strays.length} scanned but {strays.length === 1 ? "isn't" : "aren't"} on your class list
                  </summary>
                  <ul className="divide-y divide-white/10 border-t border-amber-300/20">
                    {strays.map((s) => (
                      <li key={s.uid} className="flex items-center gap-3 px-3 py-2">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] truncate">{s.name}</span>
                          <span className="block text-[12px] text-white/50 font-mono truncate">{s.roll || 'No roll number'}</span>
                        </span>
                        {s.inBatch && onAddStray ? (
                          <button type="button" disabled={adding === s.uid} onClick={() => addStray(s)} className="rounded-full shrink-0 h-9 px-3 bg-white text-[#111] text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer">
                            {adding === s.uid && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add to list
                          </button>
                        ) : (
                          <span className="shrink-0 text-[12px] text-white/45">Not in this batch</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {withoutApp > 0 && (
                <p className="mt-f3 text-[13px] text-white/50">
                  {withoutApp} on your list {withoutApp === 1 ? "doesn't" : "don't"} use the app. Mark them in the review.
                </p>
              )}
            </section>
          </div>
        )}
      </main>

      {(phase === 'live' || phase === 'closing') && live && (
        <footer className="shrink-0 border-t border-white/10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
          <div className="max-w-[1400px] mx-auto w-full px-f4 pt-3 flex items-center gap-f3">
            <p className="text-[13px] text-white/50 tabular-nums">{expired ? 'Closed' : `Closes in ${leftText}`}</p>
            <button type="button" onClick={finish} disabled={phase === 'closing'} className="rounded-full ml-auto h-12 px-5 bg-white text-[#111111] text-[15px] font-semibold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-70 cursor-pointer">
              {phase === 'closing' && <Loader2 className="w-4 h-4 animate-spin" />}
              Done · review {count}
            </button>
          </div>
        </footer>
      )}
    </div>,
    document.body
  );
};
