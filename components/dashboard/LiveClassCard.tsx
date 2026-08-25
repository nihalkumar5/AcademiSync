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

  // High-Contrast Brutalist Holiday Display (On-Theme)
  if (todayHoliday) {
    return (
      <div className="glass-card p-5 sm:p-6 text-left relative overflow-hidden border border-black dark:border-white !bg-yellow-50 dark:!bg-yellow-900/20">
        
        <div className="flex items-center gap-5 sm:gap-6 min-w-0 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black dark:bg-white flex flex-col items-center justify-center shrink-0 border border-black dark:border-white">
            <span className="font-mono text-lg sm:text-xl font-black uppercase tracking-widest text-white dark:text-black">OFF</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center mb-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white">
                Campus Holiday
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight uppercase leading-none mt-1">
              {todayHoliday.title}
            </h3>
            <p className="text-sm text-black/75 dark:text-white/75 mt-2 leading-relaxed font-medium">
              {todayHoliday.description || "Take a break! All regular lectures and labs are suspended today."}
            </p>
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
