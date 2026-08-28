'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour, getTodayDateString } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';

export const LiveClassCard: React.FC = () => {
  const { timetable, subjects, events, isSessionCancelled, rescheduledSessions } = useApp();
  
  const now = new Date();
  const dateTodayStr = getTodayDateString();
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');

  const getActiveTimetable = () => timetable.filter((s) => !isSessionCancelled(s.id, dateTodayStr));

  const [status, setStatus] = useState(() => getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions));

  useEffect(() => {
    setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions));
    const interval = setInterval(() => {
      setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions));
    }, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects, isSessionCancelled, rescheduledSessions]);

  // High-Contrast Brutalist Holiday Display (Minimal Design with Subtle Animation)
  if (todayHoliday) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full p-5 relative overflow-hidden bg-[#FFF8E7] border border-[#D8CCB4] rounded-none"
      >
        {/* Subtle Background Monochrome Vector Illustration */}
        <div className="absolute -bottom-1 -right-2 opacity-[0.12] pointer-events-none select-none z-0">
          <MonochromeIllustration type="holiday" size={90} className="!text-[#D8C9A8] dark:!text-[#D8C9A8]" />
        </div>
        
        <div className="relative z-10 flex flex-col w-full h-full">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[#D99A2B] text-[11px] leading-none">●</span>
            <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-[1.4px] leading-none">
              Campus Holiday
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[24px] font-bold text-[#111111] uppercase leading-[1.1] tracking-tight pt-0.5">
                {todayHoliday.title}
              </h3>
              <div className="w-[52px] h-[52px] bg-[#111111] flex flex-col items-center justify-center shrink-0">
                <span className="font-mono text-base font-black uppercase tracking-widest text-white">OFF</span>
              </div>
            </div>
            <p className="text-[14px] text-[#6B665D] leading-snug line-clamp-2 max-w-[260px]">
              {todayHoliday.description || "No regular lectures or labs today."}
            </p>
          </div>
        </div>
      </motion.div>
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
