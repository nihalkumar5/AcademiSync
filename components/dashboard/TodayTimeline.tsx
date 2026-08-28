'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { getCurrentDayOfWeek, timeToMinutes, getTodayDateString, getTomorrowDayOfWeek, getTomorrowDateString, getSubjectThemeStyle } from '@/lib/timetableUtils';
import { MapPin, User, Clock, FlaskConical, Ban, RotateCcw, MoreVertical } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Subject, ClassSession } from '@/lib/types';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { Modal } from '../ui/Modal';

// 10 distinct, elegant & engaging pastel paper colors (slightly lighter shades)
const ELEGANT_PASTEL_PALETTE = [
  'bg-[#FEF9C3]/80 dark:bg-[#78350F]/25 border-[#FDE047]/60 dark:border-[#FACC15]/30', // Golden Cream
  'bg-[#E0F2FE]/80 dark:bg-[#0C4A6E]/25 border-[#7DD3FC]/60 dark:border-[#38BDF8]/30', // Ice Denim Blue
  'bg-[#FCE7F3]/80 dark:bg-[#831843]/25 border-[#F9A8D4]/60 dark:border-[#F472B6]/30', // Soft Rose Pink
  'bg-[#DCFCE7]/80 dark:bg-[#064E3B]/25 border-[#86EFAC]/60 dark:border-[#4ADE80]/30', // Fresh Sage Mint
  'bg-[#FFEDD5]/80 dark:bg-[#7C2D12]/25 border-[#FDBA74]/60 dark:border-[#FB923C]/30', // Peach Terracotta
  'bg-[#F3E8FF]/80 dark:bg-[#3B0764]/25 border-[#D8B4FE]/60 dark:border-[#C084FC]/30', // Soft Lavender
  'bg-[#CCFBF1]/80 dark:bg-[#134E4A]/25 border-[#5EEAD4]/60 dark:border-[#2DD4BF]/30', // Soft Teal
  'bg-[#FFE4E6]/80 dark:bg-[#881337]/25 border-[#FDA4AF]/60 dark:border-[#FB7185]/30', // Blush Coral
  'bg-[#FEF3C7]/80 dark:bg-[#78350F]/25 border-[#FCD34D]/60 dark:border-[#F59E0B]/30', // Warm Amber
  'bg-[#ECFCCB]/80 dark:bg-[#365314]/25 border-[#BEF264]/60 dark:border-[#A3E635]/30', // Soft Lime
];

const getSubjectPastelStyle = (sub?: Subject, fallbackId: string = '') => {
  const key = sub?.name || sub?.id || fallbackId;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % ELEGANT_PASTEL_PALETTE.length;
  }
  return ELEGANT_PASTEL_PALETTE[Math.abs(hash)];
};

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
      <div className="flex flex-col gap-3 text-left">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold tracking-widest uppercase text-black dark:text-white">
            {isAfter8PM ? "Tomorrow's Schedule" : "Today's Schedule"}
          </h3>
          <span className="text-[10px] font-mono font-bold border border-black dark:border-white px-2 py-0.5 uppercase">
            {isAfter8PM ? "Tomorrow" : targetDay} · Holiday
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
      <div className="flex flex-col gap-3 text-left">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight pl-1">
          {isAfter8PM ? "Tomorrow's Schedule" : "Today's Schedule"}
        </h3>
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

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
          {isAfter8PM ? "Tomorrow's Schedule" : "Today's Schedule"}
        </h3>
        <span className="text-xs font-semibold text-slate-400 bg-slate-200/50 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
          {isAfter8PM ? `Tomorrow (${targetDay})` : targetDay}
        </span>
      </div>
      <div className="bento-card p-4 sm:p-5">
        <div className="relative flex flex-col gap-0 border-l-[3px] border-slate-100 dark:border-zinc-800 ml-3 py-2">
          {targetSessions.map((session) => {
            const sub = subjectMap.get(session.subjectId);
            const reschedule = rescheduledSessions[`${targetDateStr}_${session.id}`];
            const start = timeToMinutes(reschedule ? reschedule.startTime : session.startTime);
            const end = timeToMinutes(reschedule ? reschedule.endTime : session.endTime);
            const isCancelled = isSessionCancelled(session.id, targetDateStr);
            const isNow = !isAfter8PM && !isCancelled && currentMinutes >= start && currentMinutes < end;
            const isPassed = isCancelled || (isAfter8PM ? false : currentMinutes >= end);
            
            // Dynamic theme dot color
            const subjectColor = isCancelled ? '#94A3B8' : (sub?.color || '#8C6B5D');

            return (
              <div key={session.id} className="relative pl-6 pb-6 last:pb-0 group">
                {/* Node Dot */}
                <div 
                  className={`absolute left-[-6px] top-[2px] w-3 h-3 rounded-full border-2 border-white dark:border-[#1C1C1E] shadow-sm z-10 ${
                    isCancelled ? 'bg-zinc-400 dark:bg-zinc-600' : ''
                  }`}
                  style={{ backgroundColor: isCancelled ? undefined : (isPassed ? '#94A3B8' : subjectColor) }}
                />
                
                {isNow && (
                  <div 
                    className="absolute left-[-9px] top-[-1px] w-[18px] h-[18px] rounded-full animate-ping opacity-40 z-0"
                    style={{ backgroundColor: subjectColor }}
                  />
                )}

                 {(() => {
                  let cardColorClass = '';
                  if (isCancelled) {
                    cardColorClass = 'bg-zinc-100/90 dark:bg-zinc-900/60 border-zinc-300/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 opacity-70';
                  } else if (isNow) {
                    cardColorClass = 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10 border-transparent ring-1 ring-black/5 dark:ring-white/5';
                  } else {
                    cardColorClass = 'text-black dark:text-white';
                  }

                  const customStyle = isCancelled || isNow ? undefined : getSubjectThemeStyle(sub?.color, settings.theme || 'light');

                  return (
                    <div className={`flex flex-col sm:flex-row gap-3 transition-all ${isPassed && !isCancelled ? 'opacity-55' : 'opacity-100'}`}>
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
                      <div className={`flex-1 rounded-none p-3 sm:p-4 border transition-all ${cardColorClass}`} style={customStyle}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-[15px] font-bold truncate ${
                                isCancelled ? 'line-through text-zinc-500 dark:text-zinc-400' : (isNow ? 'text-white dark:text-black' : 'text-black dark:text-white')
                              }`}>
                                {sub?.name || 'Class Session'}
                              </h4>
                              
                              {isCancelled ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">
                                  Cancelled
                                </span>
                              ) : isNow ? (
                                <span className="px-2 py-0.5 rounded-none bg-white text-black dark:bg-black dark:text-white text-[10px] font-bold uppercase tracking-wider animate-pulse border border-current">
                                  Now
                                </span>
                              ) : reschedule ? (
                                <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider border ${
                                  isNow ? 'bg-black text-white border-white' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                                }`}>
                                  Rescheduled
                                </span>
                              ) : null}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs opacity-75 font-medium flex-wrap mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {reschedule?.room || session.room}
                              </span>
                              {session.faculty && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {session.faculty}
                                </span>
                              )}
                              {session.isLab && (
                                <span className="flex items-center gap-1 font-bold font-mono text-[10px] px-1.5 border border-current">
                                  <FlaskConical className="w-3 h-3" />
                                  Lab
                                </span>
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
                                            setRescheduleTimeStart(session.startTime.split(' ')[0]);
                                            setRescheduleTimeEnd(session.endTime.split(' ')[0]);
                                            setRescheduleRoom(session.room);
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
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={rescheduleTarget !== null}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Class"
        description={`Reschedule this session for ${isAfter8PM ? 'tomorrow' : 'today'}. Changes will only reflect on the dashboard alerts and schedule.`}
      >
        <form onSubmit={handleRescheduleSubmit} className="flex flex-col gap-4 mt-3">
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
