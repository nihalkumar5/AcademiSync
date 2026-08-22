'use client';
import { motion } from "framer-motion";


import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getCurrentDayOfWeek } from '@/lib/timetableUtils';
import {
  BookOpen,
  CheckSquare,
  AlertCircle,
  Backpack,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const OverviewHeader: React.FC = () => {
  const { profile, timetable, homework, carryItems, setActiveView } = useApp();

  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDay = getCurrentDayOfWeek();
  const todayClasses = timetable.filter((s) => s.day === todayDay);
  const pendingHw = homework.filter((h) => h.status !== 'Completed');
  const upcomingDeadlines = homework.filter((h) => {
    if (h.status === 'Completed') return false;
    const diff = Math.ceil(
      (new Date(h.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff <= 1;
  });
  const unpackedCarry = carryItems.filter((i) => !i.isPacked);

  const hour = time ? time.getHours() : new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

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
          {profile.name.split(' ')[0]}
        </h2>
        <p className="text-lg text-black/70 dark:text-white/70 mt-6 max-w-sm leading-snug">
          It is {timeFormatted} on {dateFormatted}. You are currently in Sem {profile.semester} at {profile.college || 'Your College'}.
        </p>
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
            Classes Today
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
