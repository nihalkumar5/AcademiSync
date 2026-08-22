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
    <div className="flex flex-col gap-4 text-left px-1">
      {/* Top Greeting & Real-time Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div className="flex flex-col">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
            <span>{greeting},</span>
            <span className="text-[#6366F1] dark:text-[#818CF8]">
              {profile.name.split(' ')[0]} 👋
            </span>
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-slate-400 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>{profile.college || 'Your College'} • Sem {profile.semester}</span>
            <span>•</span>
            <span className="font-mono">{dateFormatted}</span>
          </div>
        </div>

        {/* Minimal Time Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
          <span className="text-sm font-black font-mono text-[#0F172A] dark:text-white tracking-tight">
            {timeFormatted}
          </span>
        </div>
      </div>

      {/* Today's Overview Container (Design System Card) */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white tracking-tight">
            Today&apos;s Overview
          </span>
          <span className="text-[11px] font-mono font-bold text-[#6366F1] bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
            {todayDay}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Stat 1: Classes */}
          <button
            onClick={() => setActiveView('timetable')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#1E293B]/50 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 border border-slate-200/60 dark:border-slate-700/50 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-[#6366F1] dark:text-[#818CF8] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {todayClasses.length}
            </span>
            <span className="text-[10.5px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 mt-0.5">
              Classes
            </span>
          </button>

          {/* Stat 2: Tasks */}
          <button
            onClick={() => setActiveView('homework')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#1E293B]/50 hover:bg-purple-50/70 dark:hover:bg-purple-950/50 border border-slate-200/60 dark:border-slate-700/50 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {pendingHw.length}
            </span>
            <span className="text-[10.5px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 mt-0.5">
              Tasks
            </span>
          </button>

          {/* Stat 3: Deadlines */}
          <button
            onClick={() => setActiveView('homework')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#1E293B]/50 hover:bg-rose-50/70 dark:hover:bg-rose-950/50 border border-slate-200/60 dark:border-slate-700/50 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {upcomingDeadlines.length}
            </span>
            <span className="text-[10.5px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 mt-0.5">
              Deadlines
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
