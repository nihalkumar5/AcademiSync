'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getTodayDateString, getShortCollegeName } from '@/lib/timetableUtils';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  CheckSquare,
  Plus,
  MapPin,
  Sparkles,
  Award,
} from 'lucide-react';

interface FacultyHeroHeaderProps {
  onOpenConnectBatch: () => void;
  onOpenCreateAssignment: () => void;
  todayLecturesCount: number;
  activeAssignmentsCount: number;
}

export const FacultyHeroHeader: React.FC<FacultyHeroHeaderProps> = ({
  onOpenConnectBatch,
  onOpenCreateAssignment,
  todayLecturesCount,
  activeAssignmentsCount,
}) => {
  const { profile } = useApp();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const facultyTitle = profile.facultyTitle || 'Prof.';
  const facultyName = profile.name ? profile.name.trim() : 'Faculty';
  const linkedBatchesCount = profile.facultyLinkedBatches?.length || 0;

  return (
    <div className="flex flex-col gap-6 mt-6 mb-3 text-left">
      {/* Top Greeting & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] px-2.5 py-0.5 text-[9.5px] font-bold tracking-[1.3px] uppercase">
              <Award className="w-3 h-3" />
              FACULTY PORTAL
            </span>

            {profile.facultyEmployeeId && (
              <span className="inline-flex items-center gap-1 bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 px-2 py-0.5 text-[10px] font-mono uppercase">
                ID: {profile.facultyEmployeeId}
              </span>
            )}
          </div>

          <h2 className="text-[34px] sm:text-[40px] text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px] sm:leading-[44px]">
            <span className="font-normal">{greeting},</span>
            <br />
            <span className="font-medium inline-flex items-baseline gap-2">
              {facultyTitle} {facultyName.split(' ')[0]}
              <span>👋</span>
            </span>
          </h2>

          <div className="flex flex-col gap-1.5 mt-2.5">
            <p className="text-[14px] font-normal text-[#6F6F6F] dark:text-[#A1A1AA] leading-[20px]">
              {dateFormatted} · {timeFormatted}
            </p>

            <div className="flex flex-col text-[13px] leading-[18px]">
              <span className="font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider truncate">
                {profile.facultyDepartment || 'Faculty Member'}
                {profile.college ? ` · ${getShortCollegeName(profile.college)}` : ''}
              </span>
              {profile.facultyOfficeRoom && (
                <span className="text-[#6F6F6F] dark:text-[#A1A1AA] flex items-center gap-1 text-[12px] mt-0.5">
                  <MapPin className="w-3 h-3 text-[#111111] dark:text-[#FFFFFF]" />
                  {profile.facultyOfficeRoom}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={onOpenConnectBatch}
            className="px-3.5 py-2 border border-black dark:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Batch</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateAssignment}
            className="px-3.5 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* Brutalist Stats Grid */}
      <div className="grid grid-cols-3 gap-0 py-4 mt-2 border-y border-black/10 dark:border-white/[0.08] relative">
        <div className="absolute left-1/3 top-[15%] bottom-[15%] w-px bg-black/10 dark:bg-white/[0.08]" />
        <div className="absolute left-[66.666%] top-[15%] bottom-[15%] w-px bg-black/10 dark:bg-white/[0.08]" />

        {/* Lectures Today */}
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[32px] font-medium text-black dark:text-[#F4F4F6] tracking-tighter leading-none mb-1 font-mono">
            {todayLecturesCount}
          </span>
          <span className="text-[13px] font-medium text-black/60 dark:text-[#A1A1AA] leading-tight">
            Today&apos;s Lectures
          </span>
        </div>

        {/* Connected Batches */}
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[32px] font-medium text-black dark:text-[#F4F4F6] tracking-tighter leading-none mb-1 font-mono">
            {linkedBatchesCount}
          </span>
          <span className="text-[13px] font-medium text-black/60 dark:text-[#A1A1AA] leading-tight">
            Batches Linked
          </span>
        </div>

        {/* Active Assignments */}
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[32px] font-medium text-black dark:text-[#F4F4F6] tracking-tighter leading-none mb-1 font-mono">
            {activeAssignmentsCount}
          </span>
          <span className="text-[13px] font-medium text-black/60 dark:text-[#A1A1AA] leading-tight">
            Active Tasks
          </span>
        </div>
      </div>
    </div>
  );
};
