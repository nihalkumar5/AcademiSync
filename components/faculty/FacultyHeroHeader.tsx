'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName } from '@/lib/timetableUtils';

interface FacultyHeroHeaderProps {
  onOpenConnectBatch?: () => void;
  /** No longer shown on Home (assignments are created from the Assignments tab) */
  onOpenCreateAssignment?: () => void;
  todayLecturesCount: number;
  tomorrowLecturesCount?: number;
  isAfter8PM?: boolean;
  activeAssignmentsCount: number;
}

// Same greeting system as the student home: handwritten date, two-line greeting, identity chips, stat strip.
export const FacultyHeroHeader: React.FC<FacultyHeroHeaderProps> = ({
  onOpenCreateAssignment,
  todayLecturesCount,
  tomorrowLecturesCount = 0,
  isAfter8PM = false,
  activeAssignmentsCount,
}) => {
  const { profile, setActiveView } = useApp();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const hour = time ? time.getHours() : new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateFormatted = time ? time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const timeFormatted = time ? time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  const facultyTitle = profile.facultyTitle || 'Prof.';
  const lastName = (profile.name || 'Faculty').trim().split(/\s+/).slice(-1)[0];
  const linkedBatchesCount = profile.facultyLinkedBatches?.length || 0;
  const hasBatches = linkedBatchesCount > 0;

  const chips = [
    'Faculty',
    profile.facultyDepartment || null,
    profile.facultyOfficeRoom ? `Cabin ${profile.facultyOfficeRoom}` : null,
    profile.college ? getShortCollegeName(profile.college) : null,
  ].filter(Boolean) as string[];

  const classCount = isAfter8PM ? tomorrowLecturesCount : todayLecturesCount;
  const stats = [
    { value: classCount, label: classCount === 1 ? 'Class' : 'Classes', caption: isAfter8PM ? 'tomorrow' : 'today', view: 'timetable' as const },
    { value: linkedBatchesCount, label: linkedBatchesCount === 1 ? 'Batch' : 'Batches', caption: 'linked', view: 'carry' as const },
    { value: activeAssignmentsCount, label: activeAssignmentsCount === 1 ? 'Assignment' : 'Assignments', caption: 'open', view: 'homework' as const },
  ];

  return (
    <div className="flex flex-col gap-f5 text-left">
      <div>
        <div className="flex items-baseline justify-between gap-3 text-[13px] leading-none">
          <span className="font-semibold text-fg-2">{dateFormatted}</span>
          <span className="font-medium text-muted tabular-nums">{timeFormatted}</span>
        </div>

        <h2 className="mt-3 tracking-tight">
          <span className="block text-[34px] leading-[40px] sm:text-[44px] sm:leading-[50px] font-normal text-muted">{greeting},</span>
          <span className="block mt-0.5 text-[44px] leading-[50px] sm:text-[56px] sm:leading-[62px] font-semibold text-fg break-words">
            {facultyTitle} {lastName}{' '}
            <span aria-hidden="true" className="inline-block origin-[70%_70%] animate-[wave_1.8s_ease-in-out_1]">👋</span>
          </span>
        </h2>

        <ul className="mt-f4 flex flex-wrap gap-f2" aria-label="Your profile">
          {chips.map((chip, i) => (
            <li
              key={chip}
              className={
                i === 0
                  ? 'px-2.5 py-1 rounded-full text-[12px] font-semibold bg-ink text-on-ink'
                  : 'px-2.5 py-1 rounded-full text-[12px] font-medium text-fg border border-line bg-white/70 dark:bg-white/[0.03]'
              }
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      {/* Same soft tiles as the student Home: one neutral background, each opens its section */}
      {hasBatches && (
        <div className="grid grid-cols-3 gap-f3">
          {stats.map((s) => (
            <button
              key={s.view}
              type="button"
              onClick={() => setActiveView(s.view)}
              aria-label={`${s.value} ${s.label} ${s.caption}`}
              className="min-w-0 rounded-2xl p-f3 sm:p-f4 flex flex-col items-start text-left cursor-pointer transition-[filter,transform] duration-150 hover:brightness-[0.97] dark:hover:brightness-125 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25 bg-surface-2 dark:bg-gradient-to-b dark:from-white/[0.03] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_0_0_1px_rgba(255,255,255,0.045)]"
            >
              <span className={`text-[30px] sm:text-[34px] font-semibold tabular-nums tracking-[-0.03em] leading-none ${s.value === 0 ? 'text-fg/35' : 'text-fg'}`}>{s.value}</span>
              <span className="mt-f2 w-full truncate text-[12.5px] font-medium leading-[16px] text-fg-2">{s.label}</span>
              <span className="mt-0.5 w-full truncate text-[11px] leading-[14px] text-muted">{s.caption}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
