'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getLiveClassStatus, formatTime12Hour, getTodayDateString, getCurrentDayOfWeek, deduplicateTimetableSessions, isGenericExamTitle, getLiveExamSchedule, sanitizeExamSubjectName } from '@/lib/timetableUtils';
import { Clock, MapPin, User, CheckCircle2, ChevronRight, ArrowRight, MoreVertical, Ban, RotateCcw, ChevronDown, Check, Camera, Pencil } from '@/components/ui/icons';
import { openClassNotes } from '@/lib/classNotes';
import { motion } from 'framer-motion';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { HolidayCard } from './HolidayCard';
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
    exams,
    isSessionCancelled, 
    toggleSessionCancelled,
    rescheduledSessions, 
    rescheduleSession,
    deleteExtraSession,
    extraSessions, 
    cancelledSessions, 
    profile,
    isBatchCR,
    currentBatchData,
  } = useApp();
  
  const now = new Date();
  const dateTodayStr = getTodayDateString();
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');

  // Real, non-generic subject exams for today
  const todayRealExams = (exams || [])
    .filter((e) => e.date && e.date.split('T')[0] === dateTodayStr && !isGenericExamTitle(e.subjectName))
    .map((e) => ({
      id: e.id,
      subjectName: sanitizeExamSubjectName(e.subjectName),
      date: e.date,
      time: e.time || '09:30 AM',
      room: e.room,
      durationMinutes: e.durationMinutes,
    }));

  const todaySchedule = getLiveExamSchedule(todayRealExams, now);
  // Classes only suspended if a real exam is currently LIVE or UPCOMING today.
  // Once the exam schedule is complete (or no real exams today), regular timetable resumes!
  const hasActiveExamToday = !todaySchedule.allCompletedToday && (todaySchedule.liveExam !== null || todaySchedule.upcomingExam !== null);

  const getActiveTimetable = () => {
    if (hasActiveExamToday) return [];
    return deduplicateTimetableSessions(timetable.filter((s) => {
      if (isSessionCancelled(s.id, dateTodayStr)) return false;
      const sub = subjects.find((subj) => subj.id === s.subjectId);
      if (sub?.isElective && profile.enrolledElectiveIds && !profile.enrolledElectiveIds.includes(sub.id)) {
        return false;
      }
      return true;
    })).cleaned;
  };

  const [status, setStatus] = useState(() => 
    getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions, isSessionCancelled)
  );

  useEffect(() => {
    setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions, isSessionCancelled));
    const interval = setInterval(() => {
      setStatus(getLiveClassStatus(getActiveTimetable(), subjects, undefined, dateTodayStr, rescheduledSessions, extraSessions, isSessionCancelled));
    }, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects, isSessionCancelled, rescheduledSessions, extraSessions, cancelledSessions, currentBatchData, profile.enrolledElectiveIds]);

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

  const getRescheduledForSession = (session: ClassSession, dateStr: string) => {
    const direct = rescheduledSessions[`${dateStr}_${session.id}`];
    if (direct) return direct;
    for (const [k, r] of Object.entries(rescheduledSessions || {})) {
      if (k.startsWith(`${dateStr}_`)) {
        const candId = k.split('_').slice(1).join('_');
        const candSess = timetable.find((cand) => cand.id === candId);
        if (
          candSess &&
          candSess.day === session.day &&
          candSess.startTime === session.startTime &&
          (candSess.subjectId === session.subjectId || candSess.faculty === session.faculty)
        ) {
          return r;
        }
      }
    }
    return null;
  };

  const renderOptionsMenu = (session: ClassSession, isDarkTheme: boolean) => {
    const isCancelled = isSessionCancelled(session.id, dateTodayStr);
    const isRescheduled = !!getRescheduledForSession(session, dateTodayStr);

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
              : "text-muted hover:text-fg hover:bg-surface-2"
          )}
          title="Class Options" aria-label="Class Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {openMenuSessionId === session.id && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuSessionId(null);
              }}
            />
            <div
              className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-line shadow-[0_12px_36px_rgba(0,0,0,0.22)] py-1.5 z-50 text-left overflow-hidden rounded-none"
              onClick={(e) => e.stopPropagation()}
            >
              {session.isExtra ? (
                <>
                  {profile.isBatchSynced && (
                    <div className="px-3.5 py-1.5 bg-surface-2 border-b border-line-soft text-[12px] font-mono font-bold text-muted flex items-center gap-1.5">
                      <span>👑</span>
                      <span>BP Extra Slot</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      deleteExtraSession(session.id);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    <span>Delete Extra Class</span>
                  </button>
                </>
              ) : profile.isBatchSynced && !isBatchCR ? (
                <div className="p-3 text-[11px] text-muted flex flex-col gap-1">
                  <div className="font-bold text-fg flex items-center gap-1.5 text-[12px]">
                    <Ban className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Pilot Managed Schedule</span>
                  </div>
                  <p className="text-[11px] text-muted leading-tight mt-0.5">
                    Only a verified Batch Pilot can cancel or reschedule classes for this batch.
                  </p>
                </div>
              ) : isCancelled ? (
                <>
                  {profile.isBatchSynced && (
                    <div className="px-3.5 py-1.5 bg-surface-2 border-b border-line-soft text-[12px] font-mono font-bold text-muted flex items-center gap-1.5">
                      <span>🚀</span>
                      <span>Pilot Live Action</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      toggleSessionCancelled(session.id, dateTodayStr);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Restore Class for Batch</span>
                  </button>
                </>
              ) : (
                <>
                  {profile.isBatchSynced && (
                    <div className="px-3.5 py-1.5 bg-surface-2 border-b border-line-soft text-[12px] font-mono font-bold text-muted flex items-center gap-1.5">
                      <span>👑</span>
                      <span>BP Live Controls</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      toggleSessionCancelled(session.id, dateTodayStr);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    <span>Cancel Class for Batch</span>
                  </button>

                  <div className="h-px bg-surface-3 my-1" />

                  {isRescheduled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuSessionId(null);
                        rescheduleSession(session.id, null, dateTodayStr);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Revert Reschedule</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuSessionId(null);
                        const currentReschedule = getRescheduledForSession(session, dateTodayStr);
                        setRescheduleTimeStart(currentReschedule?.startTime || session.startTime.split(' ')[0]);
                        setRescheduleTimeEnd(currentReschedule?.endTime || session.endTime.split(' ')[0]);
                        setRescheduleRoom(currentReschedule?.room || session.room || '');
                        setRescheduleSubjectId(currentReschedule?.subjectId || session.subjectId);
                        setRescheduleTarget(session);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
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
          <label className="text-[12px] font-mono font-bold text-muted">
            Subject / Course
          </label>
          
          <button
            type="button"
            onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-surface border border-line text-sm focus:outline-none rounded-none text-fg transition-colors cursor-pointer text-left shadow-xs"
          >
            <span className="truncate font-medium">
              {(() => {
                const sel = subjects.find((s) => s.id === rescheduleSubjectId);
                if (!sel) return 'Select a subject';
                return `${sel.code && sel.code !== 'UNK' ? `[${sel.code}] ` : ''}${sel.name}`;
              })()}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-muted transition-transform duration-200 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSubjectDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsSubjectDropdownOpen(false)} 
              />
              <div className="absolute top-[100%] left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto bg-surface border border-line shadow-2xl flex flex-col divide-y divide-line-soft">
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
                          ? 'bg-surface-3 font-bold text-fg' 
                          : 'text-fg hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate leading-tight">
                          {s.code && s.code !== 'UNK' && (
                            <span className="font-mono font-bold text-muted mr-1.5">
                              [{s.code}]
                            </span>
                          )}
                          {s.name}
                        </span>
                        {s.facultyName && (
                          <span className="text-[11px] text-muted truncate mt-0.5">
                            {s.facultyName}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0 text-fg" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[12px] font-mono font-bold text-muted">
            New Start Time
          </label>
          <input 
            type="time" 
            value={rescheduleTimeStart}
            onChange={(e) => setRescheduleTimeStart(e.target.value)}
            required
            className="px-3 py-2 bg-transparent border border-line dark:text-[#F4F4F6] text-sm focus:outline-none rounded-none"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[12px] font-mono font-bold text-muted">
            New End Time
          </label>
          <input 
            type="time" 
            value={rescheduleTimeEnd}
            onChange={(e) => setRescheduleTimeEnd(e.target.value)}
            required
            className="px-3 py-2 bg-transparent border border-line dark:text-[#F4F4F6] text-sm focus:outline-none rounded-none"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[12px] font-mono font-bold text-muted">
            New Room (Optional)
          </label>
          <input 
            type="text" 
            value={rescheduleRoom}
            onChange={(e) => setRescheduleRoom(e.target.value)}
            placeholder="e.g. LT-2, Lab-3"
            className="px-3 py-2 bg-transparent border border-line dark:text-[#F4F4F6] placeholder:dark:text-[#A1A1AA] text-sm focus:outline-none rounded-none"
          />
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={() => setRescheduleTarget(null)}
            className="px-4 h-9 border border-line dark:text-[#A1A1AA] text-[13px] font-semibold hover:bg-surface-2 transition-colors cursor-pointer rounded-none"
          >
            Cancel
          </button>
          <Button type="submit" size="sm" className="rounded-none font-bold text-xs">
            Broadcast Reschedule
          </Button>
        </div>
      </form>
    </Modal>
  );

  // On examination day, regular timetable is suspended only while an exam is live/upcoming.
  if (hasActiveExamToday) {
    return null;
  }

  if (todayHoliday) {
    return <HolidayCard holiday={todayHoliday} />;
  }

  const { currentClass, nextClass } = status;

  if (currentClass) {
    const sub = currentClass.subject;
    const session = currentClass.session;
    const currentReschedule = getRescheduledForSession(session, dateTodayStr);
    const origSession = timetable.find(s => s.id === session.id);

    const renderFaculty = (facultyStr: string) => {
      const faculties = facultyStr.split(/[,/&]/).map(f => f.trim()).filter(Boolean);
      return faculties.join(' / ');
    };

    return (
      <>
        <div className="sheen-ink w-full bg-[#111111] dark:bg-[#15171D] border border-[#111111] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col relative group transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18A889] animate-pulse" />
              <span className="text-[12px] font-bold text-[#18A889] leading-none">
                Live now
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

        {/* Time and Reschedule Badge */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="text-[13px] text-[#FFFFFF]/90 font-mono font-medium leading-none">
            {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
          </div>
          {currentReschedule && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Clock className="w-2.5 h-2.5" />
              Rescheduled by {currentReschedule.by || 'Pilot'}
              {origSession && (origSession.startTime !== session.startTime || origSession.endTime !== session.endTime) ? ` (Was ${formatTime12Hour(origSession.startTime)})` : ''}
            </span>
          )}
          {session.isExtra && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-blue-500/20 text-blue-300 text-[12px] font-mono font-bold ">
              Extra Class
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-[12px] text-[#A8A8A8] leading-none mb-5">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] leading-none opacity-80">◉</span>
            {session.room}
          </span>
          {session.faculty && (
            <>
              <span className="opacity-40 shrink-0">·</span>
              <span className="truncate">{renderFaculty(session.faculty)}</span>
            </>
          )}
        </div>

        {/* Lecture snaps & quick notes, saved straight to this class */}
        <div className="flex gap-2 mb-5">
          {(['camera', 'text'] as const).map((focus) => (
            <button
              key={focus}
              type="button"
              onClick={() =>
                openClassNotes({
                  subjectId: sub?.id || session.subjectId,
                  subjectName: sub?.name || 'Class',
                  date: dateTodayStr,
                  startTime: session.startTime,
                  endTime: session.endTime,
                  room: session.room,
                  focus,
                })
              }
              className="flex-1 h-10 inline-flex items-center justify-center gap-2 border border-white/20 text-[13px] font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {focus === 'camera' ? <Camera className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              {focus === 'camera' ? 'Snap board' : 'Add note'}
            </button>
          ))}
        </div>

        {/* Progress Bar (3px) */}
        <div className="w-full bg-[#3A3A3A] h-[3px] overflow-hidden rounded-full">
          <div
            className="bg-[#18A889] h-full transition-all duration-1000"
            style={{ width: `${currentClass.progressPercentage}%` }}
          />
        </div>
      </div>
      {renderRescheduleModal()}
    </>
  );
  }

  if (nextClass) {
    const sub = nextClass.subject;
    const session = nextClass.session;
    const nextReschedule = getRescheduledForSession(session, dateTodayStr);
    const nextOrigSession = timetable.find(s => s.id === session.id);
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
          className={clsx(
            "w-full border border-line bg-surface p-4 sm:p-5 flex flex-col relative group transition-all",
            openMenuSessionId === session.id ? "overflow-visible z-40" : "overflow-hidden z-0"
          )}
        >

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
                    className="text-[12px] font-bold px-1.5 py-0.5 border"
                    style={{
                      color: theme.accent,
                      borderColor: `${theme.accent}55`,
                    }}
                  >
                    LAB
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-fg font-mono leading-none">
                  {formatTime12Hour(session.startTime)}
                </span>
                {renderOptionsMenu(session, false)}
              </div>
            </div>

            <h3 className="text-[20px] sm:text-[22px] font-semibold text-fg leading-[26px] mb-2 pr-8 line-clamp-2 tracking-tight">
              {sub?.name || (session as any).subjectName || 'Class Session'}
            </h3>

            {nextReschedule && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-mono font-medium mb-3">
                <Clock className="w-3 h-3 shrink-0" />
                <span>
                  Rescheduled by {nextReschedule.by || 'Pilot'}
                  {nextOrigSession && (nextOrigSession.startTime !== session.startTime || nextOrigSession.endTime !== session.endTime)
                    ? ` (Was ${formatTime12Hour(nextOrigSession.startTime)})`
                    : ''}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[12px] text-[#6F737C] dark:text-[#A1A1AA] leading-none mb-4">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] leading-none opacity-80">◉</span>
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
    <div className="card w-full p-5 flex flex-col">
      <span className="text-[12px] font-semibold text-muted leading-none mb-3">
        Schedule complete
      </span>
      <h3 className="text-[16px] font-semibold text-fg leading-snug mb-2">
        You&apos;re done for today.
      </h3>
      <span className="text-[13px] text-muted leading-none">
        {totalToday === 0
          ? 'No classes scheduled for today.'
          : `${totalToday} ${totalToday === 1 ? 'class' : 'classes'} · ${completedToday} completed${
              cancelledToday > 0 ? ` (${cancelledToday} cancelled)` : ''
            }`}
      </span>
    </div>
  );
};
