'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName } from '@/lib/timetableUtils';
import { Plus } from '@/components/ui/icons';

interface FacultyHeroHeaderProps {
  onOpenConnectBatch?: () => void;
  onOpenCreateAssignment: () => void;
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

  const stats = [
    { value: isAfter8PM ? tomorrowLecturesCount : todayLecturesCount, label: isAfter8PM ? 'Tomorrow' : 'Classes today', view: 'timetable' as const },
    { value: linkedBatchesCount, label: linkedBatchesCount === 1 ? 'Batch' : 'Batches', view: 'carry' as const },
    { value: activeAssignmentsCount, label: 'Open tasks', view: 'homework' as const },
  ];

  return (
    <div className="flex flex-col gap-f5 text-left">
      <div>
        <div className="flex items-baseline justify-between gap-3 font-cursive text-[19px] leading-none font-semibold text-muted">
          <span>{dateFormatted}</span>
          <span className="tabular-nums">{timeFormatted}</span>
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
                  ? 'px-2.5 py-1 text-[12px] font-semibold bg-ink text-on-ink'
                  : 'px-2.5 py-1 text-[12px] font-medium text-fg border border-line bg-white/70 dark:bg-white/[0.03]'
              }
            >
              {chip}
            </li>
          ))}
        </ul>

        {/* One clear primary action, only once there's a batch to post to */}
        {hasBatches && (
          <button
            type="button"
            onClick={onOpenCreateAssignment}
            className="btn btn-primary mt-f4"
          >
            <Plus className="w-4 h-4" /> New assignment
          </button>
        )}
      </div>

      {hasBatches && (
        <div className="grid grid-cols-3 gap-0 py-f4 border-y border-line relative">
          <div className="absolute left-1/3 top-[15%] bottom-[15%] w-px bg-surface-3" />
          <div className="absolute left-[66.666%] top-[15%] bottom-[15%] w-px bg-surface-3" />
          {stats.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActiveView(s.view)}
              className="flex flex-col items-center justify-center hover:opacity-70 transition-opacity text-center cursor-pointer"
            >
              <span className="text-[28px] sm:text-[32px] font-medium text-fg tracking-tighter leading-none mb-1 tabular-nums">{s.value}</span>
              <span className="text-[14px] font-medium text-muted leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
