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
        <h2 className="text-[40px] text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          <span className="font-normal">{greeting},</span><br />
          <span className="font-medium inline-flex items-baseline gap-2">
            {profile.name.split(' ')[0]}
            <span>👋</span>
          </span>
        </h2>
        
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px]">
            {dateFormatted} · {timeFormatted}
          </p>

          {(profile.programme || profile.branch) && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              <span className="text-[13px] leading-[18px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider truncate">
                SEM {profile.semester} · {profile.programme}{profile.branch ? ` · ${profile.branch.replace(/AND ARTIFICIAL INTELLIGENCE/i, '& AI').replace(/ARTIFICIAL INTELLIGENCE/i, 'AI').replace(/\s*\(DS\s*&\s*AI\)/i, '')}` : ''}
              </span>
              <span className="text-[11px] leading-[16px] font-normal text-[#777777] uppercase truncate tracking-wide">
                {profile.rollNumber ? `${profile.rollNumber} · ` : ''}{profile.college && profile.college.toLowerCase().includes('shyama') ? 'IIIT NAYA RAIPUR' : profile.college || 'IIIT NAYA RAIPUR'}
              </span>
              
              <button
                onClick={() => setActiveView('timetable')}
                className="text-[11px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-widest flex items-center mt-3 hover:opacity-70 transition-opacity w-fit"
              >
                BATCH · {profile.isBatchSynced && profile.batchKey ? `${profile.programme} ${profile.branch?.replace(/AND ARTIFICIAL INTELLIGENCE/i, '& AI').replace(/ARTIFICIAL INTELLIGENCE/i, 'AI').replace(/\s*\(DS\s*&\s*AI\)/i, '')} · ${profile.year || new Date().getFullYear() + 2}` : 'NOT CONNECTED'} <span className="ml-2 font-normal opacity-50">→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Brutalist Stats Grid */}
      <div className="grid grid-cols-3 gap-0 py-4 mt-4 border-y border-black dark:border-white relative">
        {/* Vertical dividers (~70% height) */}
        <div className="absolute left-1/3 top-[15%] bottom-[15%] w-px bg-black/20 dark:bg-white/20" />
        <div className="absolute left-[66.666%] top-[15%] bottom-[15%] w-px bg-black/20 dark:bg-white/20" />

        {/* Classes */}
        <button
          onClick={() => setActiveView('timetable')}
          className="flex flex-col items-center justify-center group hover:opacity-70 transition-opacity text-center"
        >
          <span className="text-[32px] font-medium text-black dark:text-white tracking-tighter leading-none mb-1">
            {todayClasses.length}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-medium text-black/60 dark:text-white/60 leading-tight">
              Classes
            </span>
            {todayHoliday ? (
              <span className="text-[13px] text-black/50 dark:text-white/50 leading-tight">
                Holiday
              </span>
            ) : (
              <span className="text-[13px] text-transparent leading-tight select-none" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </div>
        </button>

        {/* Homework */}
        <button
          onClick={() => setActiveView('homework')}
          className="flex flex-col items-center justify-center group hover:opacity-70 transition-opacity text-center"
        >
          <span className="text-[32px] font-medium text-black dark:text-white tracking-tighter leading-none mb-1">
            {pendingHw.length}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-medium text-black/60 dark:text-white/60 leading-tight">
              Tasks Due
            </span>
            <span className="text-[13px] text-transparent leading-tight select-none" aria-hidden="true">
              &nbsp;
            </span>
          </div>
        </button>

        {/* Exams */}
        <button
          onClick={() => setActiveView('homework')}
          className="flex flex-col items-center justify-center group hover:opacity-70 transition-opacity text-center"
        >
          <span className="text-[32px] font-medium text-black dark:text-white tracking-tighter leading-none mb-1">
            {upcomingDeadlines.length}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-medium text-black/60 dark:text-white/60 leading-tight">
              Deadlines
            </span>
            <span className="text-[13px] text-transparent leading-tight select-none" aria-hidden="true">
              &nbsp;
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
