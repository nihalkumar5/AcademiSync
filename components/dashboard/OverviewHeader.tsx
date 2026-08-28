'use client';
import { motion } from "framer-motion";


import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getCurrentDayOfWeek, formatCollegeBadge, getTodayDateString } from '@/lib/timetableUtils';
import {
  BookOpen,
  CheckSquare,
  AlertCircle,
  Backpack,
  MapPin,
  Sparkles,
  Hash,
  User,
  GraduationCap,
  Building2,
  IdCard,
} from 'lucide-react';

export const OverviewHeader: React.FC = () => {
  const { profile, timetable, homework, carryItems, events, setActiveView } = useApp();

  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateTodayStr = getTodayDateString();
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');


  const todayDay = getCurrentDayOfWeek();
  const todayClasses = todayHoliday ? [] : timetable.filter((s) => s.day === todayDay);
  const pendingHw = homework.filter((h) => h.status !== 'Completed');
  const upcomingDeadlines = homework.filter((h) => {
    const diff = Math.ceil(
      (new Date(h.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    );
    return h.status !== 'Completed' && diff <= 3;
  });
  const unpackedCarry = carryItems.filter((i) => !i.isPacked);

  const hour = time ? time.getHours() : new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const dateFormatted = time
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(time)
    : 'Loading date...';

  const timeFormatted = time
    ? time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '--:--';

  const seconds = time ? time.getSeconds().toString().padStart(2, '0') : '00';

  return (
    <div className="flex flex-col gap-6 mt-8 mb-4">
      {/* Huge Greeting */}
      <div>
        <h2 className="text-[40px] font-normal text-black dark:text-white tracking-tight leading-[44px]">
          {greeting},<br />
          <span className="inline-flex items-baseline gap-2">
            {profile.name.split(' ')[0]}
            <span>👋</span>
          </span>
        </h2>
        
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4">
          {dateFormatted} · {timeFormatted}
        </p>

        <div className="mt-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] relative group">
          {/* Minimal accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white" />
            
            {/* Programme & Branch */}
            {(profile.programme || profile.branch) && (
              <div className="flex flex-col gap-1 pl-2 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" />
                  Academic Profile
                </span>
                <span className="text-[13px] font-bold text-black dark:text-white uppercase tracking-wide leading-snug">
                  {profile.programme} {profile.branch ? `• ${profile.branch}` : ''}
                </span>
              </div>
            )}
            
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pl-2 md:pl-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[11px] font-bold tracking-wide text-black/70 dark:text-white/70 uppercase shadow-sm">
                <BookOpen size={12} strokeWidth={2.5} />
                Sem {profile.semester}
              </span>
              {profile.rollNumber && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[11px] font-bold tracking-wide text-black/70 dark:text-white/70 uppercase font-mono shadow-sm">
                  <User size={12} strokeWidth={2.5} />
                  {profile.rollNumber}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[11px] font-bold tracking-wide uppercase shadow-sm truncate max-w-[160px]">
                <Building2 size={12} strokeWidth={2.5} />
                <span className="truncate">{formatCollegeBadge(profile.college)}</span>
              </span>
            </div>
          </div>
      </div>

      {/* Brutalist Stats Grid */}
      <div className="grid grid-cols-3 gap-6 py-4 mt-4 border-y border-black dark:border-white">
        {/* Classes */}
        <button
          onClick={() => setActiveView('timetable')}
          className="flex flex-col items-start justify-center group hover:opacity-70 transition-opacity text-left"
        >
          <span className="text-4xl sm:text-5xl font-medium text-black dark:text-white tracking-tighter leading-none mb-2">
            {todayClasses.length}
          </span>
          <span className="text-sm font-medium text-black/60 dark:text-white/60">
            {todayHoliday ? 'Classes (Holiday)' : 'Classes Today'}
          </span>
        </button>

        {/* Homework */}
        <button
          onClick={() => setActiveView('homework')}
          className="flex flex-col items-start justify-center border-l border-black dark:border-white pl-6 group hover:opacity-70 transition-opacity text-left"
        >
          <span className="text-4xl sm:text-5xl font-medium text-black dark:text-white tracking-tighter leading-none mb-2">
            {pendingHw.length}
          </span>
          <span className="text-sm font-medium text-black/60 dark:text-white/60">
            Tasks Due
          </span>
        </button>

        {/* Exams */}
        <button
          onClick={() => setActiveView('homework')}
          className="flex flex-col items-start justify-center border-l border-black dark:border-white pl-6 group hover:opacity-70 transition-opacity text-left"
        >
          <span className="text-4xl sm:text-5xl font-medium text-black dark:text-white tracking-tighter leading-none mb-2">
            {upcomingDeadlines.length}
          </span>
          <span className="text-sm font-medium text-black/60 dark:text-white/60">
            Deadlines
          </span>
        </button>
      </div>
    </div>
  );
};
