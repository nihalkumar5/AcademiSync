'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, ScanQr } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { formatTime12Hour } from '@/lib/timetableUtils';
import { OpenCheckin, fetchOpenCheckins } from '@/lib/attendanceLive';
import { PENDING_CHECKIN_KEY, ScanAttendanceSheet } from './CheckIn';

// Student Home: when a teacher opens QR check-in for your class, this says so and opens the
// scanner in one tap. Nothing shows the rest of the time.
// It asks when the app comes to the front (students open it when the teacher says "scan"), and
// otherwise only now and then, so a whole college with the app open stays light on the server.
const REFRESH_MS = 45_000;

export const CheckInBanner: React.FC = () => {
  const { user, profile } = useApp();
  const [open, setOpen] = useState<OpenCheckin[]>([]);
  const [scan, setScan] = useState(false);
  const eligible = !!user?.id && profile?.role !== 'faculty' && !!profile?.batchKey;
  const batchKey = profile?.batchKey;

  const refresh = useCallback(() => {
    if (!eligible || document.visibilityState !== 'visible') return;
    fetchOpenCheckins(batchKey)
      .then(setOpen)
      .catch(() => {});
  }, [eligible, batchKey]);

  useEffect(() => {
    if (!eligible) return setOpen([]);
    refresh();
    const t = setInterval(refresh, REFRESH_MS);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('checkin:done', refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('checkin:done', refresh);
    };
  }, [eligible, refresh]);

  // Came back from signing in after scanning a link: go straight to the scanner (the code has changed by now)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const at = Number(localStorage.getItem(PENDING_CHECKIN_KEY) || 0);
      if (at) localStorage.removeItem(PENDING_CHECKIN_KEY);
      if (at && Date.now() - at < 10 * 60_000) setScan(true);
    } catch {}
  }, [user?.id]);

  const todo = open.find((o) => !o.checkedIn);
  const done = !todo ? open.find((o) => o.checkedIn) : undefined;

  return (
    <>
      {todo && (
        <section className="sheen-ink relative overflow-hidden bg-[#111111] dark:bg-[#15171D] dark:border dark:border-white/[0.08] text-white p-f4 sm:p-f5" aria-live="polite">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1.4px] text-[#5EE0C2]">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#5EE0C2] opacity-70 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#5EE0C2]" />
            </span>
            Attendance is open
          </p>
          <h3 className="mt-2 text-[22px] leading-tight font-semibold tracking-tight">{todo.subjectName}</h3>
          <p className="mt-1 text-[14px] text-white/60">
            {todo.facultyName} is taking attendance{todo.startTime ? ` · ${formatTime12Hour(todo.startTime)}` : ''}
          </p>
          <button type="button" onClick={() => setScan(true)} className="rounded-full mt-f4 h-12 w-full inline-flex items-center justify-center gap-2 bg-white text-[#111111] text-[15px] font-semibold hover:opacity-90 active:scale-[0.99] transition cursor-pointer">
            <ScanQr className="w-5 h-5" /> Scan the QR
          </button>
        </section>
      )}
      {done && (
        <div className="rounded-tile flex items-center gap-3 px-f4 py-3 border border-[#18A889]/35 bg-[#18A889]/[0.07] text-[14px]">
          <span className="w-7 h-7 shrink-0 rounded-full bg-[#18A889] text-white flex items-center justify-center">
            <Check className="w-4 h-4" />
          </span>
          <span className="min-w-0 truncate text-fg">
            Checked in · <span className="font-medium">{done.subjectName}</span>
          </span>
        </div>
      )}
      <ScanAttendanceSheet
        isOpen={scan}
        onClose={() => {
          setScan(false);
          refresh();
        }}
      />
    </>
  );
};
