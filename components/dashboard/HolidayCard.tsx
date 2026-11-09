'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { formatTime12Hour } from '@/lib/timetableUtils';
import { PartyPopper } from '@/components/ui/icons';
import { AcademicEvent } from '@/lib/types';

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(d.getDate() + n);
  return next;
};

export const HolidayCard: React.FC<{ holiday: AcademicEvent }> = ({ holiday }) => {
  const { events, timetable, subjects } = useApp();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isHolidayOn = (d: Date) => events.some((e) => e.type === 'holiday' && e.date === keyOf(d));

  // Length of this break, and which day of it we're on
  let daysBefore = 0;
  while (daysBefore < 30 && isHolidayOn(addDays(today, -(daysBefore + 1)))) daysBefore++;
  let daysAfter = 0;
  while (daysAfter < 30 && isHolidayOn(addDays(today, daysAfter + 1))) daysAfter++;
  const breakLength = daysBefore + 1 + daysAfter;
  const dayOfBreak = daysBefore + 1;

  // First working day with classes after the break
  const resume = (() => {
    for (let i = 1; i <= 21; i++) {
      const d = addDays(today, i);
      if (isHolidayOn(d)) continue;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const sessions = timetable
        .filter((s) => s.day === dayName)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (sessions.length > 0) {
        const first = sessions[0];
        const subject = subjects.find((s) => s.id === first.subjectId);
        return { date: d, session: first, subjectName: subject?.name || first.subjectName || 'Class', inDays: i };
      }
    }
    return null;
  })();

  const resumeDayLabel = resume
    ? resume.inDays === 1
      ? 'Tomorrow'
      : resume.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : null;

  return (
    <motion.section
      aria-label="Holiday"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full overflow-hidden bg-[linear-gradient(160deg,#161B18_0%,#0E1110_100%)] border border-white/[0.08] dark:border-emerald-500/20 text-white shadow-[0_20px_44px_-22px_rgba(0,0,0,0.55)] dark:shadow-none"
    >
      {/* Fine grid that fades out, echoing the app background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(52,211,153,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 100% 0%, black 20%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 90% 80% at 100% 0%, black 20%, transparent 75%)',
        }}
      />
      <div aria-hidden="true" className="absolute -top-28 -right-20 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute -bottom-6 -right-5 pointer-events-none select-none text-emerald-200/20 rotate-[-12deg]">
        <PartyPopper className="w-[150px] h-[150px]" strokeWidth={1} />
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            Holiday
          </span>
          <span className="text-[13px] text-white/60">
            {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <h3 className="mt-4 max-w-[85%] text-[30px] sm:text-[34px] font-semibold leading-[1.05] tracking-tight">
          {holiday.title}
        </h3>
        {holiday.description ? (
          <p className="mt-2 max-w-[75%] text-[15px] leading-snug text-white/70">{holiday.description}</p>
        ) : (
          <p className="mt-2 max-w-[80%] font-cursive text-[24px] leading-tight font-semibold text-emerald-200 -rotate-1">
            No classes today. Enjoy the break!
          </p>
        )}

        {breakLength > 1 && (
          <div className="mt-5 max-w-[80%]">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-white">Day {dayOfBreak} of {breakLength}</span>
              <span className="text-white/60">
                {daysAfter === 0 ? 'Last day of the break' : `${daysAfter} more ${daysAfter === 1 ? 'day' : 'days'} off`}
              </span>
            </div>
            <div className="mt-2 flex gap-1" role="img" aria-label={`Day ${dayOfBreak} of a ${breakLength}-day break`}>
              {Array.from({ length: breakLength }).map((_, i) => (
                <span key={i} className={`h-1 flex-1 ${i < dayOfBreak ? 'bg-emerald-400' : 'bg-white/15'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 max-w-[80%]">
          <p className="text-[12px] font-semibold text-white/50">Classes resume</p>
          {resume ? (
            <>
              <p className="mt-1.5 text-[17px] font-semibold">{resumeDayLabel}</p>
              <p className="mt-0.5 text-[13px] text-white/70 truncate">
                {formatTime12Hour(resume.session.startTime)} · {resume.subjectName}
                {resume.session.room ? ` · ${resume.session.room}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[15px] text-white/80">No classes in the next three weeks.</p>
          )}
        </div>
      </div>
    </motion.section>
  );
};
