'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight } from 'lucide-react';

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
    const timeString = formatTime12Hour(session.startTime);
    const [timeValue, ampm] = timeString.split(' ');

    return (
      <div className="bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-[20px] p-2.5 sm:p-3 flex flex-row items-center justify-between gap-3 w-full shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        
        {/* Left: Time Box */}
        <div className="bg-black text-white dark:bg-white dark:text-black rounded-[14px] w-[55px] h-[55px] sm:w-[60px] sm:h-[60px] flex flex-col items-center justify-center shrink-0">
          <span className="text-[15px] sm:text-[17px] font-bold leading-none mb-0.5 tracking-tight">{timeValue}</span>
          <span className="text-[10px] sm:text-[11px] font-bold opacity-90 uppercase leading-none">{ampm}</span>
        </div>

        {/* Middle: Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-1">
          <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 dark:text-zinc-100 truncate">
            {sub?.name || 'Class Session'}
          </h3>
          <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium truncate">
            <span className="shrink-0">{session.room ? `Room ${session.room}` : 'No Room'}</span>
            <span className="shrink-0">•</span>
            <span className="truncate">{session.faculty || 'No Faculty'}</span>
          </div>
        </div>

        {/* Right: Countdown & Chevron */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2 sm:pl-4 border-l border-black/10 dark:border-white/10 pr-1 sm:pr-2">
          <div className="flex flex-col items-center justify-center min-w-[32px]">
            <span className="text-[18px] sm:text-[22px] font-bold text-slate-900 dark:text-zinc-100 leading-none mb-1">
              {nextClass.minutesUntilStart}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-zinc-400 leading-none tracking-wide">
              MINS
            </span>
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-zinc-500 shrink-0" />
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
