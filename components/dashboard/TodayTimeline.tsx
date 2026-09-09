'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { getCurrentDayOfWeek, timeToMinutes, getTodayDateString, getTomorrowDayOfWeek, getTomorrowDateString, getSubjectThemeStyle } from '@/lib/timetableUtils';
import { MapPin, User, Clock, FlaskConical, Ban, RotateCcw, MoreVertical, ChevronDown, Check, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Subject, ClassSession } from '@/lib/types';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { Modal } from '../ui/Modal';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { clsx } from 'clsx';



export const TodayTimeline: React.FC = () => {
  const { 
    timetable, 
    subjects, 
    events, 
    setActiveView, 
    isSessionCancelled, 
    getCancelledSessionMeta,
    toggleSessionCancelled, 
    settings,
    rescheduledSessions,
    rescheduleSession,
    extraSessions,
    addExtraSession,
    deleteExtraSession,
    profile,
    isBatchCR,
  } = useApp();

  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSession | null>(null);
  const [rescheduleSubjectId, setRescheduleSubjectId] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [rescheduleTimeStart, setRescheduleTimeStart] = useState('09:00');
  const [rescheduleTimeEnd, setRescheduleTimeEnd] = useState('10:00');
  const [rescheduleRoom, setRescheduleRoom] = useState('');

  // Extra Class Modal State
  const [isAddExtraOpen, setIsAddExtraOpen] = useState(false);
  const [extraSubjectId, setExtraSubjectId] = useState('');
  const [extraIsSubjectDropdownOpen, setExtraIsSubjectDropdownOpen] = useState(false);
  const [extraTimeStart, setExtraTimeStart] = useState('14:00');
  const [extraTimeEnd, setExtraTimeEnd] = useState('15:00');
  const [extraRoom, setExtraRoom] = useState('');
  const [extraFaculty, setExtraFaculty] = useState('');
  const [extraIsLab, setExtraIsLab] = useState(false);
  const [extraNotes, setExtraNotes] = useState('');

  const now = new Date();
  const currentHour = now.getHours();
  
  // Decide whether to show today's schedule or tomorrow's schedule (switch at 8 PM / 20:00)
  const isAfter8PM = currentHour >= 20;

  const targetDay = isAfter8PM ? getTomorrowDayOfWeek() : getCurrentDayOfWeek();
  const targetDateStr = isAfter8PM ? getTomorrowDateString() : getTodayDateString();
  const [extraDate, setExtraDate] = useState(targetDateStr);
  const targetHoliday = events.find((e) => e.date === targetDateStr && e.type === 'holiday');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    rescheduleSession(
      rescheduleTarget.id,
      {
        startTime: rescheduleTimeStart,
        endTime: rescheduleTimeEnd,
        room: rescheduleRoom || rescheduleTarget.room,
        subjectId: rescheduleSubjectId || rescheduleTarget.subjectId,
      },
      targetDateStr
    );
    setRescheduleTarget(null);
  };

  const handleAddExtraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraSubjectId) return;
    const selectedSub = subjects.find(s => s.id === extraSubjectId);
    
    await addExtraSession({
      date: extraDate || targetDateStr,
      day: targetDay,
      subjectId: extraSubjectId,
      startTime: extraTimeStart,
      endTime: extraTimeEnd,
      room: extraRoom || selectedSub?.room || '',
      faculty: extraFaculty || selectedSub?.facultyName || '',
      isLab: extraIsLab || selectedSub?.isLab || false,
      notes: extraNotes || undefined,
    });

    setIsAddExtraOpen(false);
    setExtraNotes('');
  };

  // Merge regular timetable slots for targetDay with any extra classes for targetDateStr
  const extraListForTarget: ClassSession[] = Object.values(extraSessions || {})
    .filter((ex) => ex && ex.date === targetDateStr)
    .map((ex) => ({
      id: ex.id,
      subjectId: ex.subjectId,
      day: ex.day || targetDay,
      startTime: ex.startTime,
      endTime: ex.endTime,
      room: ex.room || '',
      faculty: ex.faculty,
      isLab: ex.isLab,
      notes: ex.notes,
      isExtra: true,
      by: ex.by,
      date: ex.date,
    }));

  const targetSessions = [
    ...timetable.filter((s) => s.day === targetDay),
    ...extraListForTarget,
  ].sort((a, b) => {
    const aResched = rescheduledSessions[`${targetDateStr}_${a.id}`];
    const bResched = rescheduledSessions[`${targetDateStr}_${b.id}`];
    const aStart = timeToMinutes(aResched ? aResched.startTime : a.startTime);
    const bStart = timeToMinutes(bResched ? bResched.startTime : b.startTime);
    return aStart - bStart;
  });

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const renderAddExtraModal = () => (
    <Modal
      isOpen={isAddExtraOpen}
      onClose={() => setIsAddExtraOpen(false)}
      title="Schedule Extra Class"
      description={`Add a one-off extra / compensatory lecture for ${isAfter8PM ? "tomorrow's" : "today's"} schedule (${targetDateStr}).`}
    >
      <form onSubmit={handleAddExtraSubmit} className="flex flex-col gap-4 mt-3">
        {/* Custom Theme-Aware Subject Dropdown */}
        <div className="flex flex-col gap-1.5 text-left relative">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
            Subject / Course
          </label>
          
          <button
            type="button"
            onClick={() => setExtraIsSubjectDropdownOpen(!extraIsSubjectDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[#16171D] border border-black/15 dark:border-white/[0.1] text-sm focus:outline-none rounded-none text-[#111111] dark:text-[#F4F4F6] transition-colors cursor-pointer text-left shadow-xs"
          >
            <span className="truncate font-medium">
              {(() => {
                const sel = subjects.find((s) => s.id === extraSubjectId);
                if (!sel) return 'Select a subject';
                return `${sel.code && sel.code !== 'UNK' ? `[${sel.code}] ` : ''}${sel.name}`;
              })()}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-black/60 dark:text-[#A1A1AA] transition-transform duration-200 ${extraIsSubjectDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {extraIsSubjectDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setExtraIsSubjectDropdownOpen(false)} 
              />
              <div className="absolute top-[100%] left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto bg-white dark:bg-[#16171D] border border-black/15 dark:border-white/[0.1] shadow-2xl flex flex-col divide-y divide-black/5 dark:divide-white/[0.06]">
                {subjects.map((sub) => {
                  const isSelected = sub.id === extraSubjectId;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setExtraSubjectId(sub.id);
                        setExtraRoom(sub.room || '');
                        setExtraFaculty(sub.facultyName || '');
                        setExtraIsLab(sub.isLab || false);
                        setExtraIsSubjectDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs sm:text-sm transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-black/10 dark:bg-white/[0.1] font-bold text-black dark:text-white' 
                          : 'text-[#222222] dark:text-[#E2E8F0] hover:bg-black/5 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate leading-tight">
                          {sub.code && sub.code !== 'UNK' && (
                            <span className="font-mono font-bold text-black/60 dark:text-[#94A3B8] mr-1.5">
                              [{sub.code}]
                            </span>
                          )}
                          {sub.name}
                        </span>
                        {sub.facultyName && (
                          <span className="text-[10.5px] text-black/40 dark:text-[#71717A] truncate mt-0.5">
                            {sub.facultyName}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0 text-black dark:text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              Start Time
            </label>
            <input 
              type="time" 
              value={extraTimeStart}
              onChange={(e) => setExtraTimeStart(e.target.value)}
              required
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              End Time
            </label>
            <input 
              type="time" 
              value={extraTimeEnd}
              onChange={(e) => setExtraTimeEnd(e.target.value)}
              required
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] text-sm focus:outline-none rounded-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              Room / Venue
            </label>
            <input 
              type="text" 
              value={extraRoom}
              onChange={(e) => setExtraRoom(e.target.value)}
              placeholder="e.g. LT-2, Lab-3"
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] placeholder:dark:text-[#71717A] text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              Faculty (Optional)
            </label>
            <input 
              type="text" 
              value={extraFaculty}
              onChange={(e) => setExtraFaculty(e.target.value)}
              placeholder="Prof. Name"
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] placeholder:dark:text-[#71717A] text-sm focus:outline-none rounded-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
            Notes / Reason (Optional)
          </label>
          <input 
            type="text" 
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            placeholder="e.g. Compensatory lecture for Monday"
            className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] placeholder:dark:text-[#71717A] text-sm focus:outline-none rounded-none"
          />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            id="extraIsLab"
            checked={extraIsLab}
            onChange={(e) => setExtraIsLab(e.target.checked)}
            className="w-4 h-4 accent-black dark:accent-white cursor-pointer"
          />
          <label htmlFor="extraIsLab" className="text-xs font-semibold cursor-pointer text-black dark:text-[#F4F4F6]">
            Practical / Lab Session
          </label>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={() => setIsAddExtraOpen(false)}
            className="px-4 py-2 border border-black/15 dark:border-white/[0.1] dark:text-[#A1A1AA] text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white dark:bg-white/[0.1] dark:text-white border border-black dark:border-white/20 text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:bg-white/20 transition-colors cursor-pointer rounded-none"
          >
            Add Extra Class
          </button>
        </div>
      </form>
    </Modal>
  );

  if (targetHoliday) {
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-center justify-between gap-3 px-1 mb-6">
          <div className="flex flex-col min-w-0">
            <h3 className="text-[12px] sm:text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-[1.5px] uppercase truncate">
              {isAfter8PM ? "TOMORROW'S SCHEDULE" : "TODAY'S SCHEDULE"}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono font-medium text-[#808080] uppercase tracking-wider mt-0.5">
              {targetDay}
            </span>
          </div>

          {isBatchCR && (
            <button
              type="button"
              onClick={() => {
                setExtraDate(targetDateStr);
                if (subjects.length > 0 && !extraSubjectId) {
                  setExtraSubjectId(subjects[0].id);
                  setExtraRoom(subjects[0].room || '');
                  setExtraFaculty(subjects[0].facultyName || '');
                  setExtraIsLab(subjects[0].isLab || false);
                }
                setIsAddExtraOpen(true);
              }}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-[#111111] text-white dark:bg-[#FFFFFF] dark:text-[#111111] text-[10.5px] font-mono font-bold uppercase tracking-wider rounded-none hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap shadow-xs"
            >
              <span>+ Extra Class</span>
            </button>
          )}
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-6 text-left relative overflow-hidden border border-black dark:border-white"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-1">
              <span className="w-2 h-2 bg-black dark:bg-white inline-block" />
              <span>No Regular Lectures Scheduled</span>
            </div>
            <p className="text-sm text-black/75 dark:text-white/75 leading-relaxed font-medium mt-1">
              Campus is observing <span className="font-black text-black dark:text-white uppercase">{targetHoliday.title}</span>. Enjoy your break!
            </p>
          </div>
        </motion.div>
        {renderAddExtraModal()}
      </div>
    );
  }

  if (targetSessions.length === 0) {
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-center justify-between gap-3 px-1 mb-6">
          <div className="flex flex-col min-w-0">
            <h3 className="text-[12px] sm:text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-[1.5px] uppercase truncate">
              {isAfter8PM ? "TOMORROW'S SCHEDULE" : "TODAY'S SCHEDULE"}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono font-medium text-[#808080] uppercase tracking-wider mt-0.5">
              {targetDay}
            </span>
          </div>

          {isBatchCR && (
            <button
              type="button"
              onClick={() => {
                setExtraDate(targetDateStr);
                if (subjects.length > 0 && !extraSubjectId) {
                  setExtraSubjectId(subjects[0].id);
                  setExtraRoom(subjects[0].room || '');
                  setExtraFaculty(subjects[0].facultyName || '');
                  setExtraIsLab(subjects[0].isLab || false);
                }
                setIsAddExtraOpen(true);
              }}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-[#111111] text-white dark:bg-[#FFFFFF] dark:text-[#111111] text-[10.5px] font-mono font-bold uppercase tracking-wider rounded-none hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap shadow-xs"
            >
              <span>+ Extra Class</span>
            </button>
          )}
        </div>
        <EmptyState
          icon={<MonochromeIllustration type="no-classes" size={48} />}
          title={isAfter8PM ? "No classes tomorrow" : "No classes scheduled today"}
          description={isAfter8PM ? "You don't have any classes tomorrow. Enjoy your break!" : "You don't have any classes on your timetable. Enjoy your break!"}
          actionLabel={isBatchCR ? "Schedule Extra Class" : "View Full Timetable"}
          onAction={() => {
            if (isBatchCR) {
              setExtraDate(targetDateStr);
              if (subjects.length > 0 && !extraSubjectId) {
                setExtraSubjectId(subjects[0].id);
                setExtraRoom(subjects[0].room || '');
                setExtraFaculty(subjects[0].facultyName || '');
                setExtraIsLab(subjects[0].isLab || false);
              }
              setIsAddExtraOpen(true);
            } else {
              setActiveView('timetable');
            }
          }}
        />
        {renderAddExtraModal()}
      </div>
    );
  }

  let promotedClassId: string | null = null;
  
  if (!isAfter8PM) {
    const liveSession = targetSessions.find(s => {
      const isCancelled = isSessionCancelled(s.id, targetDateStr);
      const reschedule = rescheduledSessions[`${targetDateStr}_${s.id}`];
      const start = timeToMinutes(reschedule ? reschedule.startTime : s.startTime);
      const end = timeToMinutes(reschedule ? reschedule.endTime : s.endTime);
      return !isCancelled && currentMinutes >= start && currentMinutes < end;
    });

    const nextSession = targetSessions.find(s => {
      const isCancelled = isSessionCancelled(s.id, targetDateStr);
      const reschedule = rescheduledSessions[`${targetDateStr}_${s.id}`];
      const start = timeToMinutes(reschedule ? reschedule.startTime : s.startTime);
      return !isCancelled && currentMinutes < start;
    });

    if (liveSession) {
      promotedClassId = liveSession.id;
    } else if (nextSession) {
      promotedClassId = nextSession.id;
    }
  }

  const displaySessions = targetSessions.filter(session => {
    if (isAfter8PM) return true;
    if (session.id === promotedClassId) return false;
    const reschedule = rescheduledSessions[`${targetDateStr}_${session.id}`];
    const end = timeToMinutes(reschedule ? reschedule.endTime : session.endTime);
    if (currentMinutes >= end) return false;
    return true;
  });

  if (!isAfter8PM && displaySessions.length === 0) {
    return null;
  }

  let firstValidVisibleId: string | null = null;
  if (!isAfter8PM) {
    const firstValid = displaySessions.find(s => !isSessionCancelled(s.id, targetDateStr));
    if (firstValid) firstValidVisibleId = firstValid.id;
  }

  return (
    <div className="flex flex-col text-left">
      <div className="flex items-center justify-between gap-3 px-1 mb-6">
        <div className="flex flex-col min-w-0">
          <h3 className="text-[12px] sm:text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-[1.5px] uppercase truncate">
            {isAfter8PM ? "TOMORROW'S SCHEDULE" : "LATER TODAY"}
          </h3>
          <span className="text-[10px] sm:text-[11px] font-mono font-medium text-[#808080] uppercase tracking-wider mt-0.5">
            {targetDay}
          </span>
        </div>

        {isBatchCR && (
          <button
            type="button"
            onClick={() => {
              setExtraDate(targetDateStr);
              if (subjects.length > 0 && !extraSubjectId) {
                setExtraSubjectId(subjects[0].id);
                setExtraRoom(subjects[0].room || '');
                setExtraFaculty(subjects[0].facultyName || '');
                setExtraIsLab(subjects[0].isLab || false);
              }
              setIsAddExtraOpen(true);
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-[#111111] text-white dark:bg-[#FFFFFF] dark:text-[#111111] text-[10.5px] font-mono font-bold uppercase tracking-wider rounded-none hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap shadow-xs"
            >
              <span>+ Extra Class</span>
            </button>
          )}
        </div>
        <div className="relative flex flex-col gap-0 border-l-[2px] border-slate-200 dark:border-white/[0.08] ml-3">
          {displaySessions.map((session, index) => {
            const reschedule = rescheduledSessions[`${targetDateStr}_${session.id}`];
            const effectiveSubjectId = reschedule?.subjectId || session.subjectId;
            const sub = subjectMap.get(effectiveSubjectId);
            const start = timeToMinutes(reschedule ? reschedule.startTime : session.startTime);
            const end = timeToMinutes(reschedule ? reschedule.endTime : session.endTime);

                const isCancelled = isSessionCancelled(session.id, targetDateStr);
                const cancelledMeta = isCancelled ? getCancelledSessionMeta(session.id, targetDateStr) : null;
                const isNow = !isAfter8PM && !isCancelled && currentMinutes >= start && currentMinutes < end;
                const isPassed = isCancelled || (isAfter8PM ? false : currentMinutes >= end);
                const isNextClass = session.id === firstValidVisibleId;
                const isLab = session.isLab || sub?.isLab;
                const isSpecial = session.isExtra || sub?.name?.toLowerCase().includes('elective') || session.notes?.toLowerCase().includes('elective');
                const isRescheduled = !!reschedule && !isCancelled;

                const theme = getSubjectCardTheme({
                  subjectName: sub?.name,
                  subjectCode: sub?.code,
                  subjectColor: sub?.color,
                  isLab,
                  isCancelled,
                  isRescheduled,
                  isSpecial,
                });

                const dotColor = isNow ? '#18A889' : theme.accent;
                const titleColor = isNow ? '#FFFFFF' : '#151515';
                const subTextColor = isNow ? '#A8A8A8' : '#737373';

                return (
                  <div key={session.id} className="relative pl-6 pb-6 last:pb-0 group">
                    {/* Node Dot */}
                    <div 
                      className="absolute left-[-7px] top-[2px] w-3 h-3 rounded-full border-2 border-white dark:border-[#090A0C] shadow-sm z-10"
                      style={{ backgroundColor: dotColor }}
                    />
                    
                    {isNow && (
                      <div 
                        className="absolute left-[-10px] top-[-1px] w-[18px] h-[18px] rounded-full animate-ping opacity-40 z-0 bg-[#18A889]"
                      />
                    )}

                    <div className="flex flex-col gap-2.5 transition-all">
                        {/* Time */}
                        <div className="w-16 shrink-0 flex flex-col pt-0.5">
                          {reschedule ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] line-through text-[#9CA3AF] font-mono font-medium leading-none mb-1">
                                {session.startTime}
                              </span>
                              <span className="text-[13px] font-bold tracking-tighter font-mono text-[#C85F3D] leading-none">
                                {reschedule.startTime}
                              </span>
                            </div>
                          ) : (
                            <span className={`text-[13px] font-bold tracking-tighter font-mono ${
                              isCancelled ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-[#151515] dark:text-zinc-100'
                            }`}>
                              {session.startTime}
                            </span>
                          )}
                        </div>

                        {/* Class Info Box */}
                        <div 
                          className={clsx(
                            "relative flex-1 rounded-[4px] p-4 sm:p-[18px] border transition-all",
                            openMenuSessionId === session.id ? "z-30" : "z-0",
                            isNow
                              ? "bg-[#111111] border-[#111111] shadow-md"
                              : isRescheduled
                              ? "border-[#F5D8CC] dark:border-[#C85F3D]/25 shadow-none"
                              : "shadow-none"
                          )}
                          style={{
                            backgroundColor: isNow ? '#111111' : undefined,
                            borderColor: isNow ? '#111111' : isRescheduled ? undefined : (theme.border || 'rgba(0,0,0,0.06)'),
                            borderLeft: isNow ? '4px solid #18A889' : `4px solid ${theme.accent}`,
                          }}
                        >
                          {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                          {!isNow && (
                            <>
                              <div 
                                className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[3px]"
                                style={{ backgroundColor: theme.bg }}
                              />
                              <div 
                                className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[3px]"
                                style={{ backgroundColor: theme.darkBg }}
                              />
                            </>
                          )}

                          <div className="relative z-10 flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-start gap-2 flex-wrap">
                                <h4 
                                  className={`text-[16px] sm:text-[17px] leading-[22px] font-bold tracking-tight line-clamp-2 ${isCancelled ? 'line-through opacity-70' : ''}`}
                                  style={{ color: titleColor }}
                                >
                                  {sub?.name || 'Class Session'}
                                </h4>
                                
                                {isCancelled ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FAD3D9] text-[#C94B5C] rounded-[2px] shrink-0">
                                    Cancelled
                                  </span>
                                ) : isNow ? (
                                  <span className="px-2 py-0.5 rounded-[2px] bg-[#18A889]/20 text-[#18A889] text-[10px] font-bold uppercase tracking-wider animate-pulse border border-[#18A889]/40 shrink-0">
                                    Now
                                  </span>
                                ) : reschedule ? (
                                  <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-[#FCE0D5] text-[#C85F3D] shrink-0">
                                    Rescheduled
                                  </span>
                                ) : isLab ? (
                                  <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-[#D2F1E8] text-[#18A889] shrink-0">
                                    Lab
                                  </span>
                                ) : session.isExtra ? (
                                  <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-[#E4D8F8] text-[#8067B5] shrink-0">
                                    Extra Class
                                  </span>
                                ) : null}
                              </div>
                              
                              <div 
                                className="flex items-center gap-1.5 text-[12px] font-medium flex-wrap mt-1"
                                style={{ color: subTextColor }}
                              >
                                <span className="flex items-center gap-1">
                                  <span className="text-[10px] leading-none opacity-80">◉</span>
                                  {reschedule?.room || session.room}
                                </span>
                                {session.faculty && (
                                  <>
                                    <span className="opacity-40">·</span>
                                    <span>
                                      {session.faculty}
                                    </span>
                                  </>
                                )}
                                {session.isLab && (
                                  <>
                                    <span className="opacity-40">·</span>
                                    <span className="font-semibold text-[11px] text-[#18A889]">
                                      Practical Lab
                                    </span>
                                  </>
                                )}
                              </div>

                              {session.notes && (
                                <span 
                                  className="text-[11.5px] font-mono mt-1 block italic opacity-80"
                                  style={{ color: titleColor }}
                                >
                                  Note: {session.notes}
                                </span>
                              )}

                              {isCancelled && (
                                <span className="text-[11px] font-mono text-[#C94B5C] mt-1 font-semibold block">
                                  Cancelled for today {cancelledMeta?.by ? `· by ${cancelledMeta.by} (BP)` : ''}
                                </span>
                              )}

                              {/* Separate Soft Peach Info Area for Rescheduled Class */}
                              {reschedule && !isCancelled && (
                                <div className="flex items-start gap-2 bg-[#FDECE4] dark:bg-[#2C1813] border border-[#F5D8CC] dark:border-[#C85F3D]/30 p-2.5 rounded-[4px] mt-2.5">
                                  <Calendar className="w-3.5 h-3.5 text-[#C85F3D] mt-0.5 shrink-0" />
                                  <div className="flex flex-col text-xs leading-snug">
                                    <span className="font-semibold text-[#C85F3D] dark:text-[#E88C6E]">
                                      Rescheduled from {session.startTime}–{session.endTime}
                                    </span>
                                    {reschedule.by && (
                                      <span className="text-[11px] text-[#A65437] dark:text-[#E88C6E]/80 mt-0.5 font-normal">
                                        by {reschedule.by} (BP)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                          {/* Options Dropdown Menu */}
                          <div className="shrink-0 flex items-center gap-1.5 self-start relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuSessionId(openMenuSessionId === session.id ? null : session.id)}
                              className="p-1 text-[#A0A0A0] hover:text-[#151515] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer rounded-[2px]"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuSessionId === session.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenMenuSessionId(null)}
                                />
                                <div className="absolute right-0 mt-6 w-52 rounded-none bg-white dark:bg-[#121317] border border-black/10 dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] py-1 z-30 text-left overflow-hidden">
                                  {session.isExtra ? (
                                    <>
                                      {profile.isBatchSynced && (
                                        <div className="px-3 py-1 bg-black/5 dark:bg-white/[0.04] border-b border-black/10 dark:border-white/[0.08] text-[9px] font-mono font-bold uppercase text-black/60 dark:text-[#A1A1AA]">
                                          👑 BP Extra Slot
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSessionId(null);
                                          deleteExtraSession(session.id);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Delete Extra Class</span>
                                      </button>
                                    </>
                                  ) : profile.isBatchSynced && !isBatchCR ? (
                                    <div className="p-3 text-[11px] text-black/70 dark:text-[#A1A1AA] flex flex-col gap-1">
                                      <div className="font-bold text-black dark:text-white flex items-center gap-1.5 uppercase text-[10px]">
                                        <Ban className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Pilot Managed Schedule</span>
                                      </div>
                                      <p className="text-[10px] text-black/60 dark:text-[#71717A] leading-tight mt-0.5">
                                        Only a verified Batch Pilot can cancel or reschedule classes for this batch.
                                      </p>
                                    </div>
                                  ) : isCancelled ? (
                                    <>
                                      {profile.isBatchSynced && (
                                        <div className="px-3 py-1 bg-black/5 dark:bg-white/[0.04] border-b border-black/10 dark:border-white/[0.08] text-[9px] font-mono font-bold uppercase text-black/60 dark:text-[#A1A1AA]">
                                          🚀 Pilot Live Action
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSessionId(null);
                                          toggleSessionCancelled(session.id, targetDateStr);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Restore Class for Batch</span>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {profile.isBatchSynced && (
                                        <div className="px-3 py-1 bg-black/5 dark:bg-white/[0.04] border-b border-black/10 dark:border-white/[0.08] text-[9px] font-mono font-bold uppercase text-black/60 dark:text-[#A1A1AA]">
                                          👑 BP Live Controls
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSessionId(null);
                                          toggleSessionCancelled(session.id, targetDateStr);
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Cancel Class for Batch</span>
                                      </button>
                                      
                                      <div className="h-px bg-black/10 dark:border-white/[0.08] my-0.5"></div>
                                      
                                      {reschedule ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuSessionId(null);
                                            rescheduleSession(session.id, null, targetDateStr);
                                          }}
                                          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          <span>Revert Reschedule</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuSessionId(null);
                                            const currentReschedule = rescheduledSessions[`${targetDateStr}_${session.id}`];
                                            setRescheduleTimeStart(currentReschedule?.startTime || session.startTime.split(' ')[0]);
                                            setRescheduleTimeEnd(currentReschedule?.endTime || session.endTime.split(' ')[0]);
                                            setRescheduleRoom(currentReschedule?.room || session.room || '');
                                            setRescheduleSubjectId(currentReschedule?.subjectId || session.subjectId);
                                            setRescheduleTarget(session);
                                          }}
                                          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-black dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                                        >
                                          <Clock className="w-3.5 h-3.5 opacity-60" />
                                          <span>Reschedule Class</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              );
            })}
        </div>


      <Modal
        isOpen={rescheduleTarget !== null}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule / Swap Class"
        description={`Modify time, room, or swap subject for ${isAfter8PM ? 'tomorrow' : 'today'}. Changes will reflect on live alerts and timeline.`}
      >
        <form onSubmit={handleRescheduleSubmit} className="flex flex-col gap-4 mt-3">
          {/* Custom Theme-Aware Subject Dropdown */}
          <div className="flex flex-col gap-1.5 text-left relative">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              Subject / Course
            </label>
            
            <button
              type="button"
              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[#16171D] border border-black/15 dark:border-white/[0.1] text-sm focus:outline-none rounded-none text-[#111111] dark:text-[#F4F4F6] transition-colors cursor-pointer text-left shadow-xs"
            >
              <span className="truncate font-medium">
                {(() => {
                  const sel = subjects.find((s) => s.id === rescheduleSubjectId);
                  if (!sel) return 'Select a subject';
                  return `${sel.code && sel.code !== 'UNK' ? `[${sel.code}] ` : ''}${sel.name}`;
                })()}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-black/60 dark:text-[#A1A1AA] transition-transform duration-200 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSubjectDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsSubjectDropdownOpen(false)} 
                />
                <div className="absolute top-[100%] left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto bg-white dark:bg-[#16171D] border border-black/15 dark:border-white/[0.1] shadow-2xl flex flex-col divide-y divide-black/5 dark:divide-white/[0.06]">
                  {subjects.map((sub) => {
                    const isSelected = sub.id === rescheduleSubjectId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setRescheduleSubjectId(sub.id);
                          setIsSubjectDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs sm:text-sm transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-black/10 dark:bg-white/[0.1] font-bold text-black dark:text-white' 
                            : 'text-[#222222] dark:text-[#E2E8F0] hover:bg-black/5 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate leading-tight">
                            {sub.code && sub.code !== 'UNK' && (
                              <span className="font-mono font-bold text-black/60 dark:text-[#94A3B8] mr-1.5">
                                [{sub.code}]
                              </span>
                            )}
                            {sub.name}
                          </span>
                          {sub.facultyName && (
                            <span className="text-[10.5px] text-black/40 dark:text-[#71717A] truncate mt-0.5">
                              {sub.facultyName}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 shrink-0 text-black dark:text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              New Start Time
            </label>
            <input 
              type="time" 
              value={rescheduleTimeStart}
              onChange={(e) => setRescheduleTimeStart(e.target.value)}
              required
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              New End Time
            </label>
            <input 
              type="time" 
              value={rescheduleTimeEnd}
              onChange={(e) => setRescheduleTimeEnd(e.target.value)}
              required
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
              New Room (Optional)
            </label>
            <input 
              type="text" 
              value={rescheduleRoom}
              onChange={(e) => setRescheduleRoom(e.target.value)}
              placeholder="e.g. LT-2, Lab-3"
              className="px-3 py-2 bg-transparent border border-black/15 dark:border-white/[0.1] dark:text-[#F4F4F6] placeholder:dark:text-[#71717A] text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="px-4 py-2 border border-black/15 dark:border-white/[0.1] dark:text-[#A1A1AA] text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white dark:bg-white/[0.1] dark:text-white border border-black dark:border-white/20 text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:bg-white/20 transition-colors cursor-pointer rounded-none"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>

      {renderAddExtraModal()}
    </div>
  );
};
