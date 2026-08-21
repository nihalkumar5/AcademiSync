'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const LiveClassCard: React.FC = () => {
  const { timetable, subjects } = useApp();
  const [status, setStatus] = useState(() => getLiveClassStatus(timetable, subjects));

  useEffect(() => {
    setStatus(getLiveClassStatus(timetable, subjects));
    const interval = setInterval(() => {
      setStatus(getLiveClassStatus(timetable, subjects));
    }, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects]);

  const { currentClass, nextClass } = status;

  if (currentClass) {
    const sub = currentClass.subject;
    const session = currentClass.session;
    return (
      <div className="w-full rounded-[28px] overflow-hidden bg-zinc-900 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-800/80 relative">
        {/* Dynamic ambient glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-[50px] pointer-events-none" />
        
        <div className="p-5 sm:p-6 flex flex-col gap-5 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Live Now
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono tracking-tighter text-blue-400">
                {currentClass.remainingMinutes}
              </span>
              <span className="text-xs text-zinc-400 font-medium ml-1">min left</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {sub?.name || 'Class Session'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
              <span className="text-sm font-mono text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-zinc-400 font-medium">
                <MapPin className="w-4 h-4 text-zinc-500" />
                {session.room}
              </span>
            </div>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
              style={{ width: `${currentClass.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (nextClass) {
    const sub = nextClass.subject;
    const session = nextClass.session;
    return (
      <div className="bento-card p-5 sm:p-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400">
              Up Next
            </span>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
              {formatTime12Hour(session.startTime)}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            {sub?.name || 'Class Session'}
          </h3>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {session.room}
            </span>
            {session.faculty && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {session.faculty}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <span className="text-2xl font-black font-mono tracking-tighter leading-none">
              {nextClass.minutesUntilStart}
            </span>
            <span className="text-[10px] font-bold uppercase mt-1">Mins</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card p-5 sm:p-6 text-left flex items-center gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-zinc-900 dark:to-zinc-900/50">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 shadow-inner">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          No active classes
        </h4>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
          You&apos;re currently free. Enjoy your time!
        </p>
      </div>
    </div>
  );
};
