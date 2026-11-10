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

      {/* Today at a glance: big tabular numbers, quiet labels, one-line context.
          Zero reads muted (nothing to do); urgency gets colour; each stat opens its section. */}
      <div className="grid grid-cols-3 py-f3 border-y border-line-soft relative">
        <div aria-hidden="true" className="absolute left-1/3 top-1/4 bottom-1/4 w-px bg-line-soft" />
        <div aria-hidden="true" className="absolute left-2/3 top-1/4 bottom-1/4 w-px bg-line-soft" />

        {(() => {
          const classCount = hasActiveExamToday ? todayExamsList.length : todayClasses.length;
          const stats = [
            {
              key: 'classes',
              value: classCount,
              label: hasActiveExamToday ? (classCount === 1 ? 'Exam' : 'Exams') : classCount === 1 ? 'Class' : 'Classes',
              caption: todayHoliday ? 'Holiday' : hasActiveExamToday ? 'Exam day' : 'today',
              tone: hasActiveExamToday ? 'text-amber-600 dark:text-amber-400' : '',
              captionTone: hasActiveExamToday ? 'text-amber-600 dark:text-amber-400 font-semibold' : '',
              go: () => setActiveView(hasActiveExamToday ? 'exams' : 'timetable'),
            },
            {
              key: 'assignments',
              value: pendingHw.length,
              label: pendingHw.length === 1 ? 'Assignment' : 'Assignments',
              caption: 'pending',
              tone: '',
              captionTone: '',
              go: () => setActiveView('homework'),
            },
            {
              key: 'deadlines',
              value: upcomingDeadlines.length,
              label: upcomingDeadlines.length === 1 ? 'Deadline' : 'Deadlines',
              caption: 'next 3 days',
              tone: upcomingDeadlines.length > 0 ? 'text-rose-600 dark:text-rose-400' : '',
              captionTone: upcomingDeadlines.length > 0 ? 'text-rose-600/80 dark:text-rose-400/80' : '',
              go: () => setActiveView('homework'),
            },
          ];
          return stats.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={s.go}
              aria-label={`${s.value} ${s.label} ${s.caption}`}
              className="mx-1.5 py-2.5 flex flex-col items-center justify-center text-center rounded-[14px] cursor-pointer transition-[background-color,transform] duration-150 hover:bg-surface-2 active:scale-[0.96] active:bg-surface-3"
            >
              <span
                className={`text-[30px] sm:text-[34px] font-semibold tabular-nums tracking-[-0.03em] leading-none ${
                  s.tone || (s.value === 0 ? 'text-fg/30' : 'text-fg')
                }`}
              >
                {s.value}
              </span>
              <span className="mt-2 text-[13px] font-medium text-fg-2 leading-none">{s.label}</span>
              <span className={`mt-1 text-[11px] leading-none ${s.captionTone || 'text-faint'}`}>{s.caption}</span>
            </button>
          ));
        })()}
      </div>
    </div>
  );
};
