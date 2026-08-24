'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { getCurrentDayOfWeek, timeToMinutes } from '@/lib/timetableUtils';
import { MapPin, User, Clock, FlaskConical } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

// Pastel paper color presets mapped to subject colors
const PASTEL_COLOR_MAP: Record<string, { light: string }> = {
  '#7A8B99': { light: 'bg-[#F0F4F8] dark:bg-[#1A2128] border-[#CBD6E2] dark:border-[#2B3744]' }, // Ice Blue
  '#9C8E80': { light: 'bg-[#F7F3EF] dark:bg-[#24201C] border-[#DFD5CB] dark:border-[#3A332C]' }, // Cocoa Sand
  '#B88B8C': { light: 'bg-[#FDF1F1] dark:bg-[#281B1C] border-[#F4C7C7] dark:border-[#42282A]' }, // Rose Crayon
  '#C79F6F': { light: 'bg-[#FEF8EE] dark:bg-[#282015] border-[#F6E2C6] dark:border-[#42331E]' }, // Ochre Peach
  '#7C897A': { light: 'bg-[#F1F6F3] dark:bg-[#1A231C] border-[#D0DEC7] dark:border-[#2B3B2E]' }, // Sage Mint
  '#C08A76': { light: 'bg-[#FAF1EC] dark:bg-[#281C17] border-[#F2D3C5] dark:border-[#422C23]' }, // Terracotta
};

const PASTEL_FALLBACK_CLASSES = [
  'bg-[#FEF8EE] dark:bg-[#282015] border-[#F6E2C6] dark:border-[#42331E]', // Cream Ochre
  'bg-[#F1F6F3] dark:bg-[#1A231C] border-[#D0DEC7] dark:border-[#2B3B2E]', // Sage Mint
  'bg-[#FDF1F1] dark:bg-[#281B1C] border-[#F4C7C7] dark:border-[#42282A]', // Rose Pink
  'bg-[#F0F4F8] dark:bg-[#1A2128] border-[#CBD6E2] dark:border-[#2B3744]', // Ice Blue
  'bg-[#FAF1EC] dark:bg-[#281C17] border-[#F2D3C5] dark:border-[#422C23]', // Peach Coral
  'bg-[#F7F3EF] dark:bg-[#24201C] border-[#DFD5CB] dark:border-[#3A332C]', // Warm Cocoa
];

export const TodayTimeline: React.FC = () => {
  const { timetable, subjects, setActiveView } = useApp();

  const todayDay = getCurrentDayOfWeek();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const todaySessions = timetable
    .filter((s) => s.day === todayDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

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
          {todaySessions.map((session, index) => {
            const sub = subjectMap.get(session.subjectId);
            const start = timeToMinutes(session.startTime);
            const end = timeToMinutes(session.endTime);
            const isNow = currentMinutes >= start && currentMinutes < end;
            const isPassed = currentMinutes >= end;
            
            // Dynamic theme dot color
            const subjectColor = sub?.color || '#8C6B5D';

            return (
              <div key={session.id} className="relative pl-6 pb-6 last:pb-0">
                {/* Node Dot */}
                <div 
                  className="absolute left-[-6px] top-[2px] w-3 h-3 rounded-full border-2 border-white dark:border-[#1C1C1E] shadow-sm z-10"
                  style={{ backgroundColor: isPassed ? '#94A3B8' : subjectColor }}
                />
                
                {isNow && (
                  <div 
                    className="absolute left-[-9px] top-[-1px] w-[18px] h-[18px] rounded-full animate-ping opacity-40 z-0"
                    style={{ backgroundColor: subjectColor }}
                  />
                )}

                {(() => {
                  const colorKey = sub?.color ? sub.color.toUpperCase() : '';
                  const matchedStyle = PASTEL_COLOR_MAP[colorKey] || PASTEL_COLOR_MAP[sub?.color || ''];
                  let cardColorClass = '';
                  if (isNow) {
                    cardColorClass = 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)]';
                  } else if (matchedStyle) {
                    cardColorClass = `${matchedStyle.light} text-black dark:text-white`;
                  } else {
                    const charSum = (sub?.name || session.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                    const fallbackClass = PASTEL_FALLBACK_CLASSES[charSum % PASTEL_FALLBACK_CLASSES.length];
                    cardColorClass = `${fallbackClass} text-black dark:text-white`;
                  }

                  return (
                    <div className={`flex flex-col sm:flex-row gap-3 transition-opacity ${isPassed ? 'opacity-50' : 'opacity-100'}`}>
                      {/* Time */}
                      <div className="w-16 shrink-0 flex flex-col pt-0.5">
                        <span className="text-[13px] font-black text-slate-800 dark:text-zinc-100 tracking-tighter font-mono">
                          {session.startTime}
                        </span>
                      </div>

                      {/* Class Info Box */}
                      <div className={`flex-1 rounded-none p-3 sm:p-4 border transition-colors ${cardColorClass}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-[15px] font-bold ${isNow ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                                {sub?.name || 'Class Session'}
                              </h4>
                              {isNow && (
                                <span className="px-2 py-0.5 rounded-none bg-white text-black dark:bg-black dark:text-white text-[10px] font-bold uppercase tracking-wider animate-pulse border border-current">
                                  Now
                                </span>
                              )}
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
                            </div>
                          </div>

                          {session.isLab && (
                            <div className="flex items-center gap-1 px-2 py-0.5 border border-current text-xs font-bold">
                              <FlaskConical className="w-3.5 h-3.5" />
                              Lab
                            </div>
                          )}
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
