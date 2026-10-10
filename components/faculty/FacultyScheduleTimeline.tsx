'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString } from '@/lib/timetableUtils';
import { AggregatedFacultySession } from './FacultyLiveLectureCard';
import { Calendar, Clock, MapPin, Users, XCircle, Share2, BookOpen } from 'lucide-react';

interface FacultyScheduleTimelineProps {
  allWeekSessions: Record<DayOfWeek, AggregatedFacultySession[]>;
  onRefresh?: () => void;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyScheduleTimeline: React.FC<FacultyScheduleTimelineProps> = ({
  allWeekSessions,
  onRefresh,
}) => {
  const currentDay = getCurrentDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(currentDay || 'Monday');

  const sessionsForDay = allWeekSessions[selectedDay] || [];

  return (
    <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-5 text-left flex flex-col gap-5">
      {/* Header & Day Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-black/70 dark:text-white/70" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
            Teaching Timetable
          </h3>
          <span className="text-xs text-black/40 dark:text-white/40">
            ({sessionsForDay.length} lectures)
          </span>
        </div>

        {/* Day Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = currentDay === day;
            const count = allWeekSessions[day]?.length || 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                    : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                }`}
              >
                <span>{day.substring(0, 3)}</span>
                {count > 0 && (
                  <span className={`ml-1 text-[9px] font-mono ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                    {count}
                  </span>
                )}
                {isToday && !isSelected && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block align-middle" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex flex-col gap-2.5">
        {sessionsForDay.length === 0 ? (
          <div className="py-8 text-center text-xs text-black/40 dark:text-white/40 flex flex-col items-center justify-center gap-2">
            <BookOpen className="w-6 h-6 opacity-30" />
            <span>No lectures scheduled for {selectedDay}.</span>
          </div>
        ) : (
          sessionsForDay.map(({ session, batch, subjectName, subjectCode, isCancelled }) => (
            <div
              key={`${session.id}_${batch.id}`}
              className={`p-3.5 border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                isCancelled
                  ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 opacity-75'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex flex-col items-center justify-center min-w-[70px] py-1 px-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0">
                  <span className="text-xs font-mono font-bold text-black dark:text-white">
                    {session.startTime}
                  </span>
                  <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                    {session.endTime}
                  </span>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-black dark:text-white truncate">
                      {subjectName}
                    </span>
                    {isCancelled && (
                      <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                        CANCELLED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-black/60 dark:text-white/60 font-mono mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 opacity-60" />
                      {session.room || 'Room TBA'}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-black/80 dark:text-white/80 font-bold">
                      <Users className="w-3 h-3 opacity-60" />
                      {batch.batchName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Tag */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="text-[10.5px] font-mono text-black/50 dark:text-white/50 px-2 py-0.5 bg-black/5 dark:bg-white/5">
                  {subjectCode || 'CLASS'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
