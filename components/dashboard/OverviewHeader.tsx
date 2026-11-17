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
  const { profile, myTimetable, homework, carryItems, events, exams, setActiveView, myExtraSessions, isSessionCancelled, cancelledSessions } = useApp();

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
  const regularToday = myTimetable.filter((s) => s.day === todayDay && !isSessionCancelled(s.id, dateTodayStr));
  const extraToday = Object.values(myExtraSessions || {}).filter((ex) => ex && ex.date === dateTodayStr);
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

      {/* Today at a glance: three soft tiles, all on the same neutral background. Only the number
          and label take colour, and only for urgency (exam day, a deadline within 3 days). Each tile opens its section. */}
      <div className="grid grid-cols-3 gap-2.5">
        {(() => {
          const classCount = hasActiveExamToday ? todayExamsList.length : todayClasses.length;
          const neutral = {
            tile: 'bg-surface-2 dark:bg-white/[0.04]',
            value: 'text-fg',
            label: 'text-fg-2',
          };
          const stats = [
            {
              key: 'classes',
              value: classCount,
              label: hasActiveExamToday ? (classCount === 1 ? 'Exam' : 'Exams') : classCount === 1 ? 'Class' : 'Classes',
              caption: todayHoliday ? 'Holiday' : hasActiveExamToday ? 'Exam day' : 'today',
              theme: hasActiveExamToday
                ? { ...neutral, value: 'text-amber-600 dark:text-amber-400', label: 'text-amber-700 dark:text-amber-300' }
                : neutral,
              go: () => setActiveView(hasActiveExamToday ? 'exams' : 'timetable'),
            },
            {
              key: 'assignments',
              value: pendingHw.length,
              label: pendingHw.length === 1 ? 'Assignment' : 'Assignments',
              caption: 'pending',
              theme: neutral,
              go: () => setActiveView('homework'),
            },
            {
              key: 'deadlines',
              value: upcomingDeadlines.length,
              label: upcomingDeadlines.length === 1 ? 'Deadline' : 'Deadlines',
              caption: 'next 3 days',
              theme: upcomingDeadlines.length > 0
                ? { ...neutral, value: 'text-rose-600 dark:text-rose-400', label: 'text-rose-700 dark:text-rose-300' }
                : neutral,
              go: () => setActiveView('homework'),
            },
          ];
          return stats.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={s.go}
              aria-label={`${s.value} ${s.label} ${s.caption}`}
              className={`min-w-0 rounded-2xl px-3.5 pt-3.5 pb-3 sm:px-4 sm:pt-4 flex flex-col items-start text-left cursor-pointer transition-[filter,transform] duration-150 hover:brightness-[0.97] dark:hover:brightness-125 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25 ${s.theme.tile}`}
            >
              <span
                className={`text-[30px] sm:text-[34px] font-semibold tabular-nums tracking-[-0.03em] leading-none ${
                  s.value === 0 ? 'text-fg/35' : s.theme.value
                }`}
              >
                {s.value}
              </span>
              <span className={`mt-2 w-full truncate text-[12.5px] font-medium leading-[16px] ${s.theme.label}`}>{s.label}</span>
              <span className="w-full truncate text-[11px] leading-[14px] text-muted">{s.caption}</span>
            </button>
          ));
        })()}
      </div>
    </div>
  );
};
