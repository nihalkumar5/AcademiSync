'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { getCurrentDayOfWeek, timeToMinutes, getTodayDateString, getTomorrowDayOfWeek, getTomorrowDateString, getSubjectThemeStyle } from '@/lib/timetableUtils';
import { MapPin, User, Clock, FlaskConical, Ban, RotateCcw, MoreVertical, ChevronDown, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Subject, ClassSession } from '@/lib/types';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { Modal } from '../ui/Modal';



export const TodayTimeline: React.FC = () => {
  const { 
    timetable, 
    subjects, 
    events, 
    setActiveView, 
    isSessionCancelled, 
    toggleSessionCancelled, 
    settings,
    rescheduledSessions,
    rescheduleSession,
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

  const now = new Date();
  const currentHour = now.getHours();
  
  // Decide whether to show today's schedule or tomorrow's schedule (switch at 8 PM / 20:00)
  const isAfter8PM = currentHour >= 20;

  const targetDay = isAfter8PM ? getTomorrowDayOfWeek() : getCurrentDayOfWeek();
  const targetDateStr = isAfter8PM ? getTomorrowDateString() : getTodayDateString();
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

  const targetSessions = timetable
    .filter((s) => s.day === targetDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (targetHoliday) {
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-center justify-between px-1 mb-8">
          <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
            {isAfter8PM ? "TOMORROW'S SCHEDULE" : "TODAY'S SCHEDULE"}
          </h3>
          <span className="text-[11px] font-bold text-[#808080] uppercase tracking-wider">
            {targetDay}
          </span>
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
              <span>No Lectures Scheduled</span>
            </div>
            <p className="text-sm text-black/75 dark:text-white/75 leading-relaxed font-medium mt-1">
              Campus is observing <span className="font-black text-black dark:text-white uppercase">{targetHoliday.title}</span>. Enjoy your break!
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (targetSessions.length === 0) {
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-center justify-between px-1 mb-8">
          <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
            {isAfter8PM ? "TOMORROW'S SCHEDULE" : "TODAY'S SCHEDULE"}
          </h3>
          <span className="text-[11px] font-bold text-[#808080] uppercase tracking-wider">
            {targetDay}
          </span>
        </div>
        <EmptyState
          icon={<MonochromeIllustration type="no-classes" size={48} />}
          title={isAfter8PM ? "No classes tomorrow" : "No classes scheduled today"}
          description={isAfter8PM ? "You don't have any classes tomorrow. Enjoy your break!" : "You don't have any classes on your timetable. Enjoy your break!"}
          actionLabel="View Full Timetable"
          onAction={() => setActiveView('timetable')}
        />
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
      <div className="flex items-center justify-between px-1 mb-8">
        <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
          {isAfter8PM ? "TOMORROW'S SCHEDULE" : "LATER TODAY"}
        </h3>
        <span className="text-[11px] font-bold text-[#808080] uppercase tracking-wider">
          {targetDay}
        </span>
      </div>
      <div className="relative flex flex-col gap-0 border-l-[3px] border-slate-100 dark:border-zinc-800 ml-3">
          {(() => {
            return displaySessions.map((session) => {
              const reschedule = rescheduledSessions[`${targetDateStr}_${session.id}`];
              const activeSubjectId = reschedule?.subjectId || session.subjectId;
              const sub = subjectMap.get(activeSubjectId);
              const start = timeToMinutes(reschedule ? reschedule.startTime : session.startTime);
              const end = timeToMinutes(reschedule ? reschedule.endTime : session.endTime);
              const isCancelled = isSessionCancelled(session.id, targetDateStr);
              const isNow = !isAfter8PM && !isCancelled && currentMinutes >= start && currentMinutes < end;
              const isPassed = isCancelled || (isAfter8PM ? false : currentMinutes >= end);
              const isNextClass = session.id === firstValidVisibleId;

              let dotClass = '';
              if (isCancelled) {
                dotClass = 'bg-[#FCA5A5] dark:bg-[#7f1d1d]'; // Muted red dot
              } else if (isNow) {
                dotClass = 'bg-[#111111] dark:bg-[#FFFFFF]'; // Black filled
              } else if (isNextClass) {
                dotClass = 'bg-[#111111] dark:bg-[#FFFFFF]'; // Black dot
              } else {
                dotClass = 'bg-[#D4D4D4] dark:bg-[#444444]'; // Grey dot
              }

              let cardColorClass = '';
              let textColorClass = '';
              if (isCancelled) {
                cardColorClass = 'bg-[#FEF2F2] dark:bg-[#450a0a] border-[#FCA5A5] dark:border-[#7f1d1d] opacity-70';
                textColorClass = 'text-[#991B1B] dark:text-[#fca5a5]';
              } else if (isNow) {
                cardColorClass = 'bg-[#111111] dark:bg-[#FFFFFF] border-[#111111] dark:border-[#FFFFFF] shadow-lg';
                textColorClass = 'text-[#FFFFFF] dark:text-[#111111]';
              } else if (isPassed) {
                cardColorClass = 'bg-[#FAFAFA] dark:bg-[#1a1a1a] border-[#E0E0E0] dark:border-[#333333] opacity-60'; // Completed -> Light grey
                textColorClass = 'text-[#111111] dark:text-[#FFFFFF]';
              } else if (isNextClass) {
                cardColorClass = 'bg-[#F9F9F9] dark:bg-[#1f1f1f] border-[#BDBDBD] dark:border-[#555555]'; // Next -> Very subtle accent
                textColorClass = 'text-[#111111] dark:text-[#FFFFFF]';
              } else {
                cardColorClass = 'bg-[#FFFFFF] dark:bg-[#111111] border-[#E0E0E0] dark:border-[#333333]'; // Normal -> White
                textColorClass = 'text-[#111111] dark:text-[#FFFFFF]';
              }

              return (
                <div key={session.id} className="relative pl-6 pb-6 last:pb-0 group">
                  {/* Node Dot */}
                  <div 
                    className={`absolute left-[-6px] top-[2px] w-3 h-3 rounded-full border-2 border-white dark:border-[#1C1C1E] shadow-sm z-10 ${dotClass}`}
                  />
                  
                  {isNow && (
                    <div 
                      className="absolute left-[-9px] top-[-1px] w-[18px] h-[18px] rounded-full animate-ping opacity-40 z-0 bg-[#111111] dark:bg-[#FFFFFF]"
                    />
                  )}

                  <div className={`flex flex-col gap-3 transition-all`}>
                      {/* Time */}
                      <div className="w-16 shrink-0 flex flex-col pt-0.5">
                        {reschedule ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] line-through opacity-40 font-mono font-bold leading-none mb-0.5">
                              {session.startTime}
                            </span>
                            <span className="text-[13px] font-black tracking-tighter font-mono text-black dark:text-white leading-none">
                              {reschedule.startTime}
                            </span>
                          </div>
                        ) : (
                          <span className={`text-[13px] font-black tracking-tighter font-mono ${
                            isCancelled ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-slate-800 dark:text-zinc-100'
                          }`}>
                            {session.startTime}
                          </span>
                        )}
                      </div>

                      {/* Class Info Box */}
                      <div className={`flex-1 rounded-none p-3 border transition-all ${cardColorClass}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h4 className={`text-[16px] leading-[21px] font-semibold line-clamp-2 ${textColorClass} ${isCancelled ? 'line-through opacity-70' : ''}`}>
                                {sub?.name || 'Class Session'}
                              </h4>
                              
                              {isCancelled ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FEF2F2] dark:bg-[#450a0a] text-[#991B1B] dark:text-[#fca5a5] border border-[#FCA5A5] dark:border-[#7f1d1d] shrink-0">
                                  Cancelled
                                </span>
                              ) : isNow ? (
                                <span className="px-2 py-0.5 rounded-none bg-white text-black dark:bg-black dark:text-white text-[10px] font-bold uppercase tracking-wider animate-pulse border border-current shrink-0">
                                  Now
                                </span>
                              ) : reschedule ? (
                                <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                                  isNow ? 'bg-black text-white border-white' : 'bg-[#FFFBEB] dark:bg-[#422006] text-[#B45309] dark:text-[#FCD34D] border-[#FDE68A] dark:border-[#78350F]'
                                }`}>
                                  Rescheduled
                                </span>
                              ) : null}
                            </div>
                            
                            <div className={`flex items-center gap-[6px] text-[12px] leading-[18px] font-normal flex-wrap mt-[4px] ${isNow ? textColorClass : 'text-[#666666] dark:text-[#A0A0A0]'} ${isNow ? 'opacity-80' : ''}`}>
                              <span className="flex items-center gap-[4px]">
                                <MapPin className="w-[14px] h-[14px]" />
                                {reschedule?.room || session.room}
                              </span>
                              {session.faculty && (
                                <>
                                  <span className="opacity-50">·</span>
                                  <span className="flex items-center gap-[4px]">
                                    {session.faculty}
                                  </span>
                                </>
                              )}
                              {session.isLab && (
                                <>
                                  <span className="opacity-50">·</span>
                                  <span className="flex items-center gap-[4px] font-medium text-[12px]">
                                    <FlaskConical className="w-[14px] h-[14px]" />
                                    Lab
                                  </span>
                                </>
                              )}
                            </div>

                            {reschedule && (
                              <span className="text-[10px] font-mono opacity-60 mt-1 font-semibold block">
                                Rescheduled from {session.startTime} - {session.endTime}
                              </span>
                            )}
                          </div>

                          {/* Options Dropdown Menu */}
                          <div className="shrink-0 flex items-center gap-1.5 self-start relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuSessionId(openMenuSessionId === session.id ? null : session.id)}
                              className="p-1.5 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer rounded-none border border-transparent hover:border-black/10"
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
                                <div className="absolute right-0 mt-6 w-52 rounded-none bg-white dark:bg-zinc-950 border border-black dark:border-white shadow-lg py-1 z-30 text-left overflow-hidden">
                                  {profile.isBatchSynced && !isBatchCR ? (
                                    <div className="p-3 text-[11px] text-black/70 dark:text-white/70 flex flex-col gap-1">
                                      <div className="font-bold text-black dark:text-white flex items-center gap-1.5 uppercase text-[10px]">
                                        <Ban className="w-3.5 h-3.5 text-amber-500" />
                                        <span>CR Managed Schedule</span>
                                      </div>
                                      <p className="text-[10px] text-black/60 dark:text-white/60 leading-tight mt-0.5">
                                        Only your Class Representative (CR) can cancel or reschedule classes for this batch.
                                      </p>
                                    </div>
                                  ) : isCancelled ? (
                                    <>
                                      {profile.isBatchSynced && (
                                        <div className="px-3 py-1 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[9px] font-mono font-bold uppercase text-black/60 dark:text-white/60">
                                          👑 CR Live Action
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
                                        <div className="px-3 py-1 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[9px] font-mono font-bold uppercase text-black/60 dark:text-white/60">
                                          👑 CR Live Controls
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
                                      
                                      <div className="h-px bg-black/10 dark:bg-white/10 my-0.5"></div>
                                      
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
                                          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors cursor-pointer"
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
            });
          })()}
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
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              Subject / Course
            </label>
            
            <button
              type="button"
              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[#18181B] border border-black dark:border-white text-sm focus:outline-none rounded-none text-[#111111] dark:text-[#FFFFFF] transition-colors cursor-pointer text-left shadow-xs"
            >
              <span className="truncate font-medium">
                {(() => {
                  const sel = subjects.find((s) => s.id === rescheduleSubjectId);
                  if (!sel) return 'Select a subject';
                  return `${sel.code && sel.code !== 'UNK' ? `[${sel.code}] ` : ''}${sel.name}`;
                })()}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-black/60 dark:text-white/60 transition-transform duration-200 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSubjectDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsSubjectDropdownOpen(false)} 
                />
                <div className="absolute top-[100%] left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto bg-white dark:bg-[#18181B] border border-black dark:border-white shadow-2xl flex flex-col divide-y divide-black/5 dark:divide-white/5">
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
                            ? 'bg-black/10 dark:bg-white/15 font-bold text-black dark:text-white' 
                            : 'text-[#222222] dark:text-[#E0E0E0] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate leading-tight">
                            {sub.code && sub.code !== 'UNK' && (
                              <span className="font-mono font-bold text-black/60 dark:text-white/60 mr-1.5">
                                [{sub.code}]
                              </span>
                            )}
                            {sub.name}
                          </span>
                          {sub.facultyName && (
                            <span className="text-[10.5px] text-black/40 dark:text-white/40 truncate mt-0.5">
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
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              New Start Time
            </label>
            <input 
              type="time" 
              value={rescheduleTimeStart}
              onChange={(e) => setRescheduleTimeStart(e.target.value)}
              required
              className="px-3 py-2 bg-transparent border border-black dark:border-white text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              New End Time
            </label>
            <input 
              type="time" 
              value={rescheduleTimeEnd}
              onChange={(e) => setRescheduleTimeEnd(e.target.value)}
              required
              className="px-3 py-2 bg-transparent border border-black dark:border-white text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              New Room (Optional)
            </label>
            <input 
              type="text" 
              value={rescheduleRoom}
              onChange={(e) => setRescheduleRoom(e.target.value)}
              placeholder="e.g. LT-2, Lab-3"
              className="px-3 py-2 bg-transparent border border-black dark:border-white text-sm focus:outline-none rounded-none"
            />
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="px-4 py-2 border border-black dark:border-white text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
