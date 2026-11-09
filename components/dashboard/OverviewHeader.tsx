'use client';
import { motion } from "framer-motion";


import React, { useState, useEffect } from 'react';
// Trigger Vercel sync build for academi-sync-chi
import { useApp } from '@/context/AppContext';
import { getCurrentDayOfWeek, formatCollegeBadge, getTodayDateString, getShortCollegeName, isGenericExamTitle, getLiveExamSchedule, sanitizeExamSubjectName } from '@/lib/timetableUtils';
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
} from '@/components/ui/icons';

export const OverviewHeader: React.FC = () => {
  const { profile, timetable, homework, carryItems, events, exams, setActiveView, extraSessions, isSessionCancelled, cancelledSessions } = useApp();

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
  const todayExamsList = (() => {
    const list = exams.filter(ex => ex.date && ex.date.split('T')[0] === dateTodayStr && !isGenericExamTitle(ex.subjectName));
    if (list.length > 0) return list;
    return events.filter(ev => ev.date === dateTodayStr && ev.type === 'exam' && !isGenericExamTitle(ev.title));
  })();

  const todaySchedule = getLiveExamSchedule(
    todayExamsList.map(e => ({
      id: e.id,
      subjectName: sanitizeExamSubjectName((e as any).subjectName || (e as any).title),
      date: e.date,
      time: (e as any).time || (e as any).startTime || '09:30 AM',
      room: (e as any).room || (e as any).location,
      durationMinutes: (e as any).durationMinutes
    })),
    time || new Date()
  );

  // Exam mode on overview header only active if an exam is currently LIVE or UPCOMING today.
  // Once today's exams are completed (or no real exams), regular classes resume!
  const hasActiveExamToday = !todaySchedule.allCompletedToday && (todaySchedule.liveExam !== null || todaySchedule.upcomingExam !== null);

  const todayDay = getCurrentDayOfWeek();
  const regularToday = timetable.filter((s) => s.day === todayDay && !isSessionCancelled(s.id, dateTodayStr));
  const extraToday = Object.values(extraSessions || {}).filter((ex) => ex && ex.date === dateTodayStr);
  const todayClasses = (todayHoliday || hasActiveExamToday) ? [] : [...regularToday, ...extraToday];
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
    <div className="flex flex-col gap-f5">
      {/* Greeting: date strip, two-tone greeting, and wrapping profile chips */}
      <div>
        <div className="flex items-baseline justify-between gap-3 text-[13px] leading-none">
          <span className="font-semibold text-fg-2">{dateFormatted}</span>
          <span className="font-medium text-muted tabular-nums">{timeFormatted}</span>
        </div>

        <h2 className="mt-3 tracking-tight">
          <span className="block text-[34px] leading-[40px] sm:text-[44px] sm:leading-[50px] font-normal text-muted">{greeting},</span>
          <span className="block mt-0.5 text-[44px] leading-[50px] sm:text-[56px] sm:leading-[62px] font-semibold text-fg break-words">
            {(profile?.name || 'Student').split(' ')[0]}{' '}
            <span aria-hidden="true" className="inline-block origin-[70%_70%] animate-[wave_1.8s_ease-in-out_1]">👋</span>
          </span>
        </h2>

        {(profile?.programme || profile?.branch || profile?.rollNumber) && (
          <ul className="mt-f4 flex flex-wrap gap-f2" aria-label="Your profile">
            {[
              profile?.semester ? `Sem ${profile.semester}` : null,
              [profile?.programme, profile?.branch?.replace(/AND ARTIFICIAL INTELLIGENCE/i, '& AI').replace(/ARTIFICIAL INTELLIGENCE/i, 'AI').replace(/\s*\(DS\s*&\s*AI\)/i, '')]
                .filter(Boolean)
                .join(' · ') || null,
              profile?.rollNumber || null,
              profile?.college ? getShortCollegeName(profile.college) : null,
            ]
              .filter(Boolean)
              .map((chip, i) => (
                <li
                  key={i}
                  className={i === 0
                    ? 'px-2.5 py-1 text-[12px] font-semibold bg-ink text-on-ink'
                    : 'px-2.5 py-1 text-[12px] font-medium text-fg border border-line bg-white/70 dark:bg-white/[0.03]'}
                >
                  {chip}
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Brutalist Stats Grid */}
      <div className="grid grid-cols-3 gap-0 py-f4 border-y border-line relative">
        {/* Vertical dividers (~70% height) */}
        <div className="absolute left-1/3 top-[15%] bottom-[15%] w-px bg-surface-3" />
        <div className="absolute left-[66.666%] top-[15%] bottom-[15%] w-px bg-surface-3" />

        {/* Classes or Exams */}
        <button
          onClick={() => setActiveView(hasActiveExamToday ? 'exams' : 'timetable')}
          className="flex flex-col items-center justify-center group hover:opacity-70 transition-opacity text-center cursor-pointer"
        >
          <span className="text-[28px] sm:text-[32px] font-medium text-fg tracking-tighter leading-none mb-1">
            {hasActiveExamToday ? todayExamsList.length : todayClasses.length}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-medium text-muted leading-tight">
              {hasActiveExamToday ? (todayExamsList.length === 1 ? 'Exam' : 'Exams') : 'Classes'}
            </span>
            {todayHoliday ? (
              <span className="text-[13px] text-muted leading-tight">
                Holiday
              </span>
            ) : hasActiveExamToday ? (
              <span className="text-[13px] text-amber-600 dark:text-amber-400 font-semibold leading-tight">
                Exam Day
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
          className="flex flex-col items-center justify-center group hover:opacity-70 transition-opacity text-center cursor-pointer"
        >
          <span className="text-[28px] sm:text-[32px] font-medium text-fg tracking-tighter leading-none mb-1">
            {pendingHw.length}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-medium text-muted leading-tight">
              Assignments
            </span>
            <span className="text-[13px] text-transparent leading-tight select-none" aria-hidden="true">
              &nbsp;
            </span>
          </div>
        </button>

        {/* Exams */}
        <button
          onClick={() => setActiveView('homework')}
          className="flex flex-col items-center justify-center group hover:opacity-70 transition-opacity text-center cursor-pointer"
        >
          <span className="text-[28px] sm:text-[32px] font-medium text-fg tracking-tighter leading-none mb-1">
            {upcomingDeadlines.length}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-medium text-muted leading-tight">
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
