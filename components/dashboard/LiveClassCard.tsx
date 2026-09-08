'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour, getTodayDateString, getCurrentDayOfWeek } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { getSubjectCardTheme } from '@/lib/cardColors';

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
        className="w-full p-5 relative overflow-hidden bg-[#FFF8E7] dark:bg-[#16130B] border border-[#D8CCB4] dark:border-amber-900/40 rounded-none shadow-xs"
      >
        {/* Subtle Background Monochrome Vector Illustration */}
        <div className="absolute -bottom-1 -right-2 opacity-[0.12] pointer-events-none select-none z-0">
          <MonochromeIllustration type="holiday" size={90} className="!text-[#D8C9A8] dark:!text-amber-500/20" />
        </div>
        
        <div className="relative z-10 flex flex-col w-full h-full">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[#D99A2B] text-[11px] leading-none">●</span>
            <span className="text-[11px] font-semibold text-[#111111] dark:text-[#FDE68A] uppercase tracking-[1.4px] leading-none">
              Campus Holiday
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[24px] font-bold text-[#111111] dark:text-[#F4F4F6] uppercase leading-[1.1] tracking-tight">
                {todayHoliday.title}
              </h3>
              <div className="w-[50px] h-[50px] bg-[#111111] dark:bg-amber-400 flex flex-col items-center justify-center shrink-0">
                <span className="font-mono text-base font-black uppercase tracking-widest text-white dark:text-[#16130B]">OFF</span>
              </div>
            </div>
            <p className="text-[14px] text-[#6B665D] dark:text-[#94A3B8] leading-snug line-clamp-2 max-w-[260px]">
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
      <div className="w-full bg-[#111111] border border-[#111111] rounded-[3px] p-5 flex flex-col cursor-pointer relative group shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#18A889] animate-pulse" />
            <span className="text-[11px] font-bold text-[#18A889] uppercase tracking-[1.4px] leading-none">
              LIVE NOW
            </span>
          </div>
          <span className="text-[13px] font-bold text-[#FFFFFF] font-mono leading-none">
            {currentClass.remainingMinutes}m left
          </span>
        </div>

        {/* Subject */}
        <h3 className="text-[20px] sm:text-[22px] font-bold text-[#FFFFFF] leading-[26px] mb-2 line-clamp-2 tracking-tight">
          {sub?.name || 'Class Session'}
        </h3>

        {/* Time */}
        <div className="text-[13px] text-[#FFFFFF]/90 font-mono font-medium leading-none mb-3">
          {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-[12px] text-[#A8A8A8] leading-none mb-5">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] leading-none opacity-80">◉</span>
            {session.room}
          </span>
          {session.faculty && (
            <>
              <span className="opacity-40 shrink-0">·</span>
              <span className="truncate">{renderFaculty(session.faculty)}</span>
            </>
          )}
        </div>

        {/* Progress Bar (3px) */}
        <div className="w-full bg-[#3A3A3A] h-[3px] overflow-hidden mb-5 rounded-full">
          <div
            className="bg-[#18A889] h-full transition-all duration-1000"
            style={{ width: `${currentClass.progressPercentage}%` }}
          />
        </div>

        {/* Up Next */}
        {nextClass && (
          <div className="flex items-center justify-between border-t border-[#262626] pt-3.5">
            <div className="flex flex-col gap-1.5 min-w-0 pr-4">
              <span className="text-[11px] font-bold text-[#A8A8A8] uppercase tracking-[1.4px] leading-none">
                NEXT · {formatTime12Hour(nextClass.session.startTime)}
              </span>
              <span className="text-[14px] text-[#FFFFFF] font-semibold truncate leading-none">
                {nextClass.subject?.name || 'Next Class'}
              </span>
              {(nextClass.session.room || nextClass.minutesUntilStart !== undefined) && (
                <span className="text-[12px] text-[#A8A8A8] leading-none mt-0.5">
                  {nextClass.session.room ? `${nextClass.session.room} · ` : ''}{nextClass.minutesUntilStart}m
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-[#FFFFFF] shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
    );
  }

  if (nextClass) {
    const sub = nextClass.subject;
    const session = nextClass.session;
    const isLab = session.isLab || sub?.isLab;
    const isSpecial = session.isExtra || sub?.name?.toLowerCase().includes('elective') || session.notes?.toLowerCase().includes('elective');
    
    const theme = getSubjectCardTheme({
      subjectName: sub?.name,
      subjectCode: sub?.code,
      subjectColor: sub?.color,
      isLab,
      isSpecial,
    });
    
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

    const typeLabel = isLab ? 'NEXT LAB' : isSpecial ? 'NEXT ELECTIVE' : 'NEXT CLASS';

    return (
      <div 
        className="w-full border shadow-none rounded-[3px] p-4 sm:p-5 flex flex-col cursor-pointer relative group transition-all overflow-hidden"
        style={{
          borderColor: theme.border || 'rgba(0,0,0,0.06)',
          borderLeft: `4px solid ${theme.accent}`,
        }}
      >
        {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
        <div 
          className="dark:hidden absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundColor: theme.bg }}
        />
        <div 
          className="hidden dark:block absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundColor: theme.darkBg }}
        />

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span 
                className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none"
                style={{ color: theme.accent }}
              >
                {typeLabel}
              </span>
              {isLab && (
                <span 
                  className="text-[9.5px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-[2px]"
                  style={{
                    color: theme.badgeText,
                    backgroundColor: theme.badgeBg,
                  }}
                >
                  LAB
                </span>
              )}
            </div>
            <span className="text-[12px] font-bold text-[#151515] dark:text-[#F4F4F6] font-mono leading-none">
              {formatTime12Hour(session.startTime)}
            </span>
          </div>

          <h3 className="text-[18px] sm:text-[20px] font-bold text-[#151515] dark:text-[#F4F4F6] leading-[24px] mb-2 pr-8 line-clamp-2">
            {sub?.name || 'Class Session'}
          </h3>

          <div className="flex items-center gap-2 text-[12px] text-[#6F737C] dark:text-[#94A3B8] leading-none mb-4">
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] leading-none opacity-80">◉</span>
              {session.room}
            </span>
            {session.faculty && (
              <>
                <span className="opacity-40 shrink-0">·</span>
                <span className="truncate">{renderFaculty(session.faculty)}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span 
              className="text-[13px] font-bold leading-none"
              style={{ color: theme.accent }}
            >
              {formatCountdown(nextClass.minutesUntilStart)}
            </span>
            <div style={{ color: theme.accent }}>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
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
    <div className="w-full bg-[#FAFAFA] dark:bg-[#121317] border border-[#E0E0E0] dark:border-white/[0.08] rounded-none p-5 flex flex-col">
      <span className="text-[11px] font-semibold text-[#808080] dark:text-[#94A3B8] uppercase tracking-[1.4px] leading-none mb-3">
        SCHEDULE COMPLETE
      </span>
      <h3 className="text-[16px] font-semibold text-[#111111] dark:text-[#F4F4F6] leading-snug mb-2">
        You&apos;re done for today.
      </h3>
      <span className="text-[13px] text-[#6B6B6B] dark:text-[#94A3B8] leading-none">
        {totalToday === 0
          ? 'No classes scheduled for today.'
          : `${totalToday} ${totalToday === 1 ? 'class' : 'classes'} · ${completedToday} completed${
              cancelledToday > 0 ? ` (${cancelledToday} cancelled)` : ''
            }`}
      </span>
    </div>
  );
};
