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
        <h2 className="text-5xl sm:text-7xl font-medium text-black dark:text-white tracking-tighter leading-[1.1]">
          {greeting},<br />
          <span className="inline-flex items-baseline gap-2">
            {profile.name.split(' ')[0]}
            <span className="text-4xl sm:text-5xl">👋</span>
          </span>
        </h2>
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-lg text-black/70 dark:text-white/70 leading-snug">
            It is {timeFormatted} on {dateFormatted}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-semibold tracking-wide text-black/70 dark:text-white/70 uppercase">
              <BookOpen size={11} strokeWidth={2.5} />
              Sem {profile.semester}
            </span>
            {profile.rollNumber && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-semibold tracking-wide text-black/70 dark:text-white/70 uppercase font-mono">
                <Hash size={11} strokeWidth={2.5} />
                {profile.rollNumber}
              </span>
            )}
            {(profile.programme || profile.branch) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-semibold tracking-wide text-black/70 dark:text-white/70 uppercase">
                <GraduationCap size={11} strokeWidth={2.5} />
                {profile.programme} {profile.branch}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-semibold tracking-wide text-black/70 dark:text-white/70 uppercase truncate max-w-[220px]">
              <Building2 size={11} strokeWidth={2.5} />
              {formatCollegeBadge(profile.college)}
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
