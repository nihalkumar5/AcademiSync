'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour, getTodayDateString, getCurrentDayOfWeek } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';

export const LiveClassCard: React.FC = () => {
  const { timetable, subjects, events, isSessionCancelled, rescheduledSessions, extraSessions } = useApp();
  
  const now = new Date();
  const dateTodayStr = getTodayDateString();
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');

  const getActiveTimetable = () => timetable.filter((s) => !isSessionCancelled(s.id, dateTodayStr));

  const [status, setStatus] = useState(() => getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions));

  useEffect(() => {
    setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions));
    const interval = setInterval(() => {
      setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions));
    }, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects, isSessionCancelled, rescheduledSessions, extraSessions]);

  // High-Contrast Brutalist Holiday Display (Minimal Design with Subtle Animation)
  if (todayHoliday) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full p-5 relative overflow-hidden bg-[#FFF8E7] border border-[#D8CCB4] rounded-none"
      >
        {/* Subtle Background Monochrome Vector Illustration */}
        <div className="absolute -bottom-1 -right-2 opacity-[0.12] pointer-events-none select-none z-0">
          <MonochromeIllustration type="holiday" size={90} className="!text-[#D8C9A8] dark:!text-[#D8C9A8]" />
        </div>
        
        <div className="relative z-10 flex flex-col w-full h-full">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[#D99A2B] text-[11px] leading-none">●</span>
            <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-[1.4px] leading-none">
              Campus Holiday
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[24px] font-bold text-[#111111] uppercase leading-[1.1] tracking-tight">
                {todayHoliday.title}
              </h3>
              <div className="w-[50px] h-[50px] bg-[#111111] flex flex-col items-center justify-center shrink-0">
                <span className="font-mono text-base font-black uppercase tracking-widest text-white">OFF</span>
              </div>
            </div>
            <p className="text-[14px] text-[#6B665D] leading-snug line-clamp-2 max-w-[260px]">
              {todayHoliday.description || "No regular lectures or labs today."}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const { currentClass, nextClass } = status;

  if (currentClass) {
    const sub = currentClass.subject;
    const session = currentClass.session;

    const renderFaculty = (facultyStr: string) => {
      const faculties = facultyStr.split(/[,/&]/).map(f => f.trim()).filter(Boolean);
      return faculties.join(' / ');
    };

    return (
      <div className="w-full bg-[#111111] border border-[#111111] rounded-none p-5 flex flex-col cursor-pointer relative group">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[#FFFFFF] text-[10px] animate-pulse">●</span>
            <span className="text-[11px] font-semibold text-[#FFFFFF] uppercase tracking-[1.4px] leading-none">
              LIVE NOW
            </span>
          </div>
          <span className="text-[13px] font-semibold text-[#FFFFFF] leading-none">
            {currentClass.remainingMinutes}m left
          </span>
        </div>

        {/* Subject */}
        <h3 className="text-[20px] font-semibold text-[#FFFFFF] leading-[24px] mb-[12px] line-clamp-2">
          {sub?.name || 'Class Session'}
        </h3>

        {/* Time */}
        <div className="text-[13px] text-[#FFFFFF] font-medium leading-none mb-[8px]">
          {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-[12px] text-[#999999] leading-none mb-5">
          <span className="flex items-center gap-1.5 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
            {session.room}
          </span>
          {session.faculty && (
            <>
              <span className="opacity-50 shrink-0">·</span>
              <span className="truncate">{renderFaculty(session.faculty)}</span>
            </>
          )}
        </div>

        {/* Progress Bar (3px) */}
        <div className="w-full bg-white/20 h-[3px] overflow-hidden mb-5">
          <div
            className="bg-[#FFFFFF] h-full transition-all duration-1000"
            style={{ width: `${currentClass.progressPercentage}%` }}
          />
        </div>

        {/* Up Next */}
        {nextClass && (
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5 min-w-0 pr-4">
              <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-[1.4px] leading-none">
                NEXT · {formatTime12Hour(nextClass.session.startTime)}
              </span>
              <span className="text-[14px] text-[#FFFFFF] font-medium truncate leading-none">
                {nextClass.subject?.name || 'Next Class'}
              </span>
              {(nextClass.session.room || nextClass.minutesUntilStart !== undefined) && (
                <span className="text-[12px] text-[#808080] leading-none mt-0.5">
                  {nextClass.session.room ? `${nextClass.session.room} · ` : ''}{nextClass.minutesUntilStart}m
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-[#BDBDBD] shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
    );
  }

  if (nextClass) {
    const sub = nextClass.subject;
    const session = nextClass.session;
    
    const formatCountdown = (minutes: number) => {
      if (minutes <= 0) return "Starting now";
      if (minutes < 60) return `Starts in ${minutes} min`;
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `Starts in ${hrs}h ${mins.toString().padStart(2, '0')}m`;
    };

    const renderFaculty = (facultyStr: string) => {
      const faculties = facultyStr.split(/[,/&]/).map(f => f.trim()).filter(Boolean);
      return faculties.join(' / ');
    };

    return (
      <div 
        className="w-full bg-[#FFFFFF] dark:bg-[#111111] border border-[#BDBDBD] dark:border-[#333333] rounded-none p-4 flex flex-col cursor-pointer relative group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-[1.4px] leading-none">NEXT CLASS</span>
          <span className="text-[12px] font-semibold text-[#111111] dark:text-[#FFFFFF] leading-none">{formatTime12Hour(session.startTime)}</span>
        </div>

        <h3 className="text-[20px] font-semibold text-[#111111] dark:text-[#FFFFFF] leading-[24px] mb-[10px] pr-8 line-clamp-2">
          {sub?.name || 'Class Session'}
        </h3>

        <div className="flex items-center gap-2 text-[12px] text-[#6B6B6B] dark:text-[#999999] leading-none mb-4">
          <span className="flex items-center gap-1.5 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
            {session.room}
          </span>
          {session.faculty && (
            <>
              <span className="opacity-50 shrink-0">·</span>
              <span className="truncate">{renderFaculty(session.faculty)}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-[#111111] dark:text-[#FFFFFF]">
          <span className="text-[13px] font-medium leading-none">
            {formatCountdown(nextClass.minutesUntilStart)}
          </span>
          <ArrowRight className="w-4 h-4 text-[#BDBDBD] dark:text-[#666666] transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    );
  }

  const currentDay = getCurrentDayOfWeek();
  const rawTodayRegular = timetable.filter((s) => s.day === currentDay);
  const extraToday = Object.values(extraSessions || {}).filter((ex) => ex && ex.date === dateTodayStr);
  const rawTodaySessions = [...rawTodayRegular, ...extraToday];
  const totalToday = rawTodaySessions.length;
  const cancelledToday = rawTodayRegular.filter((s) => isSessionCancelled(s.id, dateTodayStr)).length;
  const completedToday = totalToday - cancelledToday;
  
  return (
    <div className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E0E0E0] dark:border-[#333333] rounded-none p-5 flex flex-col">
      <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-[1.4px] leading-none mb-3">
        SCHEDULE COMPLETE
      </span>
      <h3 className="text-[16px] font-semibold text-[#111111] dark:text-[#FFFFFF] leading-snug mb-2">
        You&apos;re done for today.
      </h3>
      <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999] leading-none">
        {totalToday === 0
          ? 'No classes scheduled for today.'
          : `${totalToday} ${totalToday === 1 ? 'class' : 'classes'} · ${completedToday} completed${
              cancelledToday > 0 ? ` (${cancelledToday} cancelled)` : ''
            }`}
      </span>
    </div>
  );
};
