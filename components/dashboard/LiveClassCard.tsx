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
      <div className="w-full rounded-3xl overflow-hidden bg-[#0F172A] text-white shadow-xl shadow-indigo-950/20 border border-slate-800 relative">
        {/* Dynamic ambient glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#6366F1]/30 rounded-full blur-[40px] pointer-events-none" />

        <div className="p-5 sm:p-6 flex flex-col gap-4 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#6366F1]/20 text-[#818CF8]">
                <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Live Now
              </span>
            </div>
            <div className="text-right flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
              <span className="text-sm font-black font-mono tracking-tight text-[#818CF8]">
                {currentClass.remainingMinutes}m
              </span>
              <span className="text-[10px] text-slate-300 font-medium">left</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-sans">
              {sub?.name || 'Class Session'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-300">
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md font-semibold">
                {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#818CF8]" />
                {session.room}
              </span>
              {session.faculty && (
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {session.faculty}
                </span>
              )}
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
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
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono font-extrabold text-[#6366F1] bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
              {formatTime12Hour(session.startTime)}
            </span>
            <span className="text-[11px] font-bold text-slate-400">Next Class</span>
          </div>

          <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white tracking-tight mt-1 font-sans">
            {sub?.name || 'Class Session'}
          </h3>

          <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#6366F1]" />
              {session.room}
            </span>
            {session.faculty && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {session.faculty}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex items-center sm:flex-col justify-center px-4 py-2 sm:p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 text-[#6366F1] dark:text-[#818CF8] border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none mr-1 sm:mr-0">
              {nextClass.minutesUntilStart}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {nextClass.minutesUntilStart === 1 ? 'min' : 'mins'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 text-left flex items-center gap-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#6366F1] flex items-center justify-center shadow-inner">
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white tracking-tight">
          No active classes right now
        </h4>
        <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 font-medium">
          You&apos;re currently free. Enjoy your break or check upcoming tasks!
        </p>
      </div>
    </div>
  );
};
