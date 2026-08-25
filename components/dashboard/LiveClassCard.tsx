'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour, getTodayDateString } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight } from 'lucide-react';

export const LiveClassCard: React.FC = () => {
  const { timetable, subjects, events, isSessionCancelled } = useApp();
  
  const now = new Date();
  const dateTodayStr = getTodayDateString();
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');

  const getActiveTimetable = () => timetable.filter((s) => !isSessionCancelled(s.id));

  const [status, setStatus] = useState(() => getLiveClassStatus(getActiveTimetable(), subjects));

  useEffect(() => {
    setStatus(getLiveClassStatus(getActiveTimetable(), subjects));
    const interval = setInterval(() => {
      setStatus(getLiveClassStatus(getActiveTimetable(), subjects));
    }, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects, isSessionCancelled]);

  // 🌴 Premium Holiday Display
  if (todayHoliday) {
    return (
      <div className="w-full rounded-2xl p-6 sm:p-7 text-left relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-emerald-500/10 dark:from-amber-500/15 dark:via-orange-500/10 dark:to-emerald-500/15 border border-amber-300/70 dark:border-amber-700/60 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.12)]">
        {/* Subtle decorative background glow */}
        <div className="absolute right-[-20px] top-[-20px] w-36 h-36 bg-amber-400/20 dark:bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <span>🌴</span>
                <span>Campus Holiday</span>
              </span>
              <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-300/80">
                • Academic Calendar
              </span>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {todayHoliday.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-xl font-medium leading-relaxed">
                {todayHoliday.description || "Today is an official campus holiday. All regular lectures, labs, and academic sessions are suspended. Enjoy your break!"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-amber-200 dark:border-amber-800/60 text-xs font-bold text-amber-900 dark:text-amber-200">
                🎉 No Classes Today
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Relax & recharge ✨
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-3xl sm:text-4xl shadow-md shadow-amber-500/20">
              🌴
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { currentClass, nextClass } = status;

  if (currentClass) {
    const sub = currentClass.subject;
    const session = currentClass.session;

    // Check if there is an upcoming class starting within 30 mins OR continuous with current class
    let showUpcoming = false;
    if (nextClass) {
      const [currEndH, currEndM] = session.endTime.split(':').map(Number);
      const [nextStartH, nextStartM] = nextClass.session.startTime.split(':').map(Number);
      const gapMinutes = (nextStartH * 60 + nextStartM) - (currEndH * 60 + currEndM);
      
      showUpcoming = nextClass.minutesUntilStart <= 30 || gapMinutes <= 30;
    }

    return (
      <div className="w-full border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black relative overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col gap-4 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white dark:bg-black rounded-full animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/70 dark:text-black/70">
                Live Now
              </span>
            </div>
            <div className="text-right flex items-center gap-1 border border-white/30 dark:border-black/30 px-3 py-1">
              <span className="text-sm font-black font-mono tracking-tight">
                {currentClass.remainingMinutes}m
              </span>
              <span className="text-[10px] text-white/60 dark:text-black/60 font-medium">left</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              {sub?.name || 'Class Session'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-white/70 dark:text-black/60">
              <span className="font-mono border border-white/30 dark:border-black/30 px-2 py-0.5 font-semibold">
                {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {session.room}
              </span>
              {session.faculty && (
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5" />
                  {session.faculty}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar — brutalist flat */}
          <div className="w-full border border-white/20 dark:border-black/20 h-2 overflow-hidden">
            <div
              className="bg-white dark:bg-black h-2 transition-all duration-1000"
              style={{ width: `${currentClass.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Compact Upcoming Class Bar */}
        {showUpcoming && nextClass && (
          <div className="border-t border-white/20 dark:border-black/20 bg-white/10 dark:bg-black/10 px-5 py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 dark:bg-black/20 text-white dark:text-black shrink-0">
                Up Next • {formatTime12Hour(nextClass.session.startTime)}
              </span>
              <span className="font-semibold truncate text-white dark:text-black">
                {nextClass.subject?.name || 'Next Class'}
              </span>
            </div>
            <div className="text-[11px] font-mono font-medium text-white/80 dark:text-black/80 shrink-0">
              {nextClass.session.room ? `@ ${nextClass.session.room}` : ''} ({nextClass.minutesUntilStart}m)
            </div>
          </div>
        )}
      </div>
    );
  }

  if (nextClass) {
    const sub = nextClass.subject;
    const session = nextClass.session;
    return (
      <div className="glass-card p-5 sm:p-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono font-bold border border-black dark:border-white text-black dark:text-white px-2 py-0.5">
              {formatTime12Hour(session.startTime)}
            </span>
            <span className="text-[11px] font-bold text-black/50 dark:text-white/50 uppercase tracking-widest">Next Class</span>
          </div>

          <h3 className="text-lg font-bold text-black dark:text-white tracking-tight mt-1">
            {sub?.name || 'Class Session'}
          </h3>

          <div className="flex items-center gap-3 text-xs text-black/50 dark:text-white/50 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {session.room}
            </span>
            {session.faculty && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {session.faculty}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex items-center sm:flex-col justify-center px-4 py-2 sm:p-3 border border-black dark:border-white text-black dark:text-white">
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
    <div className="glass-card p-5 sm:p-6 text-left flex items-center gap-4">
      <div className="w-11 h-11 border border-black dark:border-white text-black dark:text-white flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm sm:text-base font-bold text-black dark:text-white tracking-tight">
          No active classes right now
        </h4>
        <p className="text-xs text-black/50 dark:text-white/50 mt-0.5 font-medium">
          You&apos;re currently free. Enjoy your break or check upcoming tasks!
        </p>
      </div>
    </div>
  );
};
