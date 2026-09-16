'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour, getTodayDateString, getCurrentDayOfWeek } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight, ArrowRight, MoreVertical, Ban, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClassSession } from '@/lib/types';
import { clsx } from 'clsx';

export const LiveClassCard: React.FC = () => {
  const { 
    timetable, 
    subjects, 
    events, 
    isSessionCancelled, 
    toggleSessionCancelled,
    rescheduledSessions, 
    rescheduleSession,
    deleteExtraSession,
    extraSessions, 
    cancelledSessions, 
    profile,
    isBatchCR,
  } = useApp();
  
  const now = new Date();
  const dateTodayStr = getTodayDateString();
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');

  const getActiveTimetable = () => timetable.filter((s) => {
    if (isSessionCancelled(s.id, dateTodayStr)) return false;
    const sub = subjects.find((subj) => subj.id === s.subjectId);
    if (sub?.isElective && profile.enrolledElectiveIds && !profile.enrolledElectiveIds.includes(sub.id)) {
      return false;
    }
    return true;
  });

  const [status, setStatus] = useState(() => 
    getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions, isSessionCancelled)
  );

  useEffect(() => {
    setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions, isSessionCancelled));
    const interval = setInterval(() => {
      setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions, isSessionCancelled));
    }, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects, isSessionCancelled, rescheduledSessions, extraSessions, cancelledSessions, profile.enrolledElectiveIds]);

  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSession | null>(null);
  const [rescheduleSubjectId, setRescheduleSubjectId] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [rescheduleTimeStart, setRescheduleTimeStart] = useState('09:00');
  const [rescheduleTimeEnd, setRescheduleTimeEnd] = useState('10:00');
  const [rescheduleRoom, setRescheduleRoom] = useState('');

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
      dateTodayStr
    );
    setRescheduleTarget(null);
  };

  const renderOptionsMenu = (session: ClassSession, isDarkTheme: boolean) => {
    const isCancelled = isSessionCancelled(session.id, dateTodayStr);
    const isRescheduled = !!rescheduledSessions[`${dateTodayStr}_${session.id}`];

    return (
      <div className="relative shrink-0 flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuSessionId(openMenuSessionId === session.id ? null : session.id);
          }}
          className={clsx(
            "p-1.5 rounded-[2px] transition-colors cursor-pointer",
            isDarkTheme
              ? "text-white/60 hover:text-white hover:bg-white/10"
              : "text-black/50 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
          )}
          title="Class Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {openMenuSessionId === session.id && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuSessionId(null);
              }}
            />
            <div
              className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#121317] border border-black/10 dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)] py-1 z-50 text-left overflow-hidden rounded-none"
              onClick={(e) => e.stopPropagation()}
            >
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
                      toggleSessionCancelled(session.id, dateTodayStr);
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
                      toggleSessionCancelled(session.id, dateTodayStr);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Class for Batch</span>
                  </button>

                  <div className="h-px bg-black/10 dark:bg-white/[0.08] my-0.5" />

                  {isRescheduled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuSessionId(null);
                        rescheduleSession(session.id, null, dateTodayStr);
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
                        const currentReschedule = rescheduledSessions[`${dateTodayStr}_${session.id}`];
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
    );
  };

  const renderRescheduleModal = () => (
    <Modal
      isOpen={rescheduleTarget !== null}
      onClose={() => setRescheduleTarget(null)}
      title="Reschedule / Swap Class"
      description="Modify time, room, or swap subject for today. Changes will reflect on live alerts and timeline."
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
                {subjects.map((s) => {
                  const isSelected = s.id === rescheduleSubjectId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setRescheduleSubjectId(s.id);
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
                          {s.code && s.code !== 'UNK' && (
                            <span className="font-mono font-bold text-black/60 dark:text-[#94A3B8] mr-1.5">
                              [{s.code}]
                            </span>
                          )}
                          {s.name}
                        </span>
                        {s.facultyName && (
                          <span className="text-[10.5px] text-black/40 dark:text-[#71717A] truncate mt-0.5">
                            {s.facultyName}
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
          <Button type="submit" size="sm" className="rounded-none font-bold uppercase tracking-wider text-xs">
            Broadcast Reschedule
          </Button>
        </div>
      </form>
    </Modal>
  );

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
      <>
        <div className="w-full bg-[#111111] border border-[#111111] rounded-[3px] p-5 flex flex-col relative group shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18A889] animate-pulse" />
              <span className="text-[11px] font-bold text-[#18A889] uppercase tracking-[1.4px] leading-none">
                LIVE NOW
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[#FFFFFF] font-mono leading-none">
                {currentClass.remainingMinutes}m left
              </span>
              {renderOptionsMenu(session, true)}
            </div>
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
      {renderRescheduleModal()}
    </>
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
      <>
        <div 
          className="w-full border shadow-none rounded-[3px] p-4 sm:p-5 flex flex-col relative group transition-all"
          style={{
            borderColor: theme.border || 'rgba(0,0,0,0.06)',
            borderLeft: `4px solid ${theme.accent}`,
          }}
        >
          {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
          <div 
            className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[2px]"
            style={{ backgroundColor: theme.bg }}
          />
          <div 
            className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[2px]"
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
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#151515] dark:text-[#F4F4F6] font-mono leading-none">
                  {formatTime12Hour(session.startTime)}
                </span>
                {renderOptionsMenu(session, false)}
              </div>
            </div>

            <h3 className="text-[18px] sm:text-[20px] font-bold text-[#151515] dark:text-[#F4F4F6] leading-[24px] mb-2 pr-8 line-clamp-2">
              {sub?.name || (session as any).subjectName || 'Class Session'}
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
        {renderRescheduleModal()}
      </>
    );
  }

  const currentDay = getCurrentDayOfWeek();
  const rawTodayRegular = timetable.filter((s) => {
    if (s.day !== currentDay) return false;
    const sub = subjects.find((subj) => subj.id === s.subjectId);
    if (sub?.isElective && profile.enrolledElectiveIds && !profile.enrolledElectiveIds.includes(sub.id)) {
      return false;
    }
    return true;
  });
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
