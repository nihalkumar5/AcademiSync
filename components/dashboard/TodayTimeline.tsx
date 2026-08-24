'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { getCurrentDayOfWeek, timeToMinutes } from '@/lib/timetableUtils';
import { MapPin, User, Clock, FlaskConical, Ban, RotateCcw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Subject } from '@/lib/types';

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
  const { timetable, subjects, events, setActiveView, isSessionCancelled, toggleSessionCancelled } = useApp();

  const now = new Date();
  const todayDay = getCurrentDayOfWeek();
  const dateTodayStr = now.toISOString().split('T')[0];
  const todayHoliday = events.find((e) => e.date === dateTodayStr && e.type === 'holiday');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const todaySessions = timetable
    .filter((s) => s.day === todayDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (todayHoliday) {
    return (
      <div className="flex flex-col gap-3 text-left">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight pl-1">
          Today&apos;s Schedule
        </h3>
        <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-center flex flex-col items-center justify-center gap-2">
          <span className="text-3xl">🌴</span>
          <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
            Holiday: {todayHoliday.title}
          </h4>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 max-w-sm">
            All lectures and labs are suspended for today. Enjoy your break!
          </p>
        </div>
      </div>
    );
  }

  if (todaySessions.length === 0) {
    return (
      <div className="flex flex-col gap-3 text-left">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight pl-1">
          Today&apos;s Schedule
        </h3>
        <EmptyState
          icon={<Clock className="w-6 h-6 text-indigo-400" />}
          title="No classes scheduled today"
          description="You don't have any classes on your timetable. Enjoy your break!"
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
          Today&apos;s Schedule
        </h3>
        <span className="text-xs font-semibold text-slate-400 bg-slate-200/50 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
          {todayDay}
        </span>
      </div>

      <div className="bento-card p-4 sm:p-5">
        <div className="relative flex flex-col gap-0 border-l-[3px] border-slate-100 dark:border-zinc-800 ml-3 py-2">
          {todaySessions.map((session) => {
            const sub = subjectMap.get(session.subjectId);
            const start = timeToMinutes(session.startTime);
            const end = timeToMinutes(session.endTime);
            const isCancelled = isSessionCancelled(session.id);
            const isNow = !isCancelled && currentMinutes >= start && currentMinutes < end;
            const isPassed = isCancelled || currentMinutes >= end;
            
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
                    cardColorClass = `${getSubjectPastelStyle(sub, session.id)} text-black dark:text-white`;
                  }

                  return (
                    <div className={`flex flex-col sm:flex-row gap-3 transition-all ${isPassed && !isCancelled ? 'opacity-55' : 'opacity-100'}`}>
                      {/* Time */}
                      <div className="w-16 shrink-0 flex flex-col pt-0.5">
                        <span className={`text-[13px] font-black tracking-tighter font-mono ${
                          isCancelled ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-slate-800 dark:text-zinc-100'
                        }`}>
                          {session.startTime}
                        </span>
                      </div>

                      {/* Class Info Box */}
                      <div className={`flex-1 rounded-none p-3 sm:p-4 border transition-all ${cardColorClass}`}>
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
                              ) : null}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs opacity-75 font-medium flex-wrap mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {session.room}
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
                          </div>

                          {/* Quick Cancel / Restore Toggle Button */}
                          <div className="shrink-0 flex items-center gap-1.5 self-start">
                            {isCancelled ? (
                              <button
                                type="button"
                                onClick={() => toggleSessionCancelled(session.id)}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                title="Restore this class for today"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleSessionCancelled(session.id)}
                                className={`flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold border transition-all cursor-pointer ${
                                  isNow
                                    ? 'border-white/40 text-white/80 hover:bg-white/10 hover:text-white dark:border-black/40 dark:text-black/80 dark:hover:bg-black/10'
                                    : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-rose-500 hover:text-rose-600 dark:hover:border-rose-400 dark:hover:text-rose-400 bg-white/40 dark:bg-black/20'
                                }`}
                                title="Mark class as cancelled for today"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
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
    </div>
  );
};
