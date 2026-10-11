'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, formatTime12Hour } from '@/lib/timetableUtils';
import {
  aggregateFacultyWeeklyTimetable,
  AggregatedFacultySession,
  formatFacultyBatchDegreeAndBranch,
  formatFacultyCombinedBatchLabel,
} from '@/lib/facultyUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ConnectBatchModal } from './ConnectBatchModal';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  BookOpen,
} from 'lucide-react';
import { clsx } from 'clsx';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyWeeklyTimetable: React.FC = () => {
  const { profile } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  const [isConnectBatchOpen, setIsConnectBatchOpen] = useState(false);
  const [batchesTimetableData, setBatchesTimetableData] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek() || 'Monday');

  // Real-time listener for each connected batch's shared timetable doc
  useEffect(() => {
    if (linkedBatches.length === 0) {
      setBatchesTimetableData({});
      return;
    }

    const unsubs: (() => void)[] = [];

    linkedBatches.forEach((batch) => {
      const bRef = doc(db, 'shared_timetables', batch.batchKey);
      const unsub = onSnapshot(
        bRef,
        (snap) => {
          if (snap.exists()) {
            setBatchesTimetableData((prev) => ({
              ...prev,
              [batch.batchKey]: snap.data(),
            }));
          }
        },
        (err) => {
          console.error(`Error listening to batch ${batch.batchKey}:`, err);
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches]);

  const currentDay = getCurrentDayOfWeek();

  // Aggregate strictly filtered to faculty's selected subjects
  const allWeekSessions = aggregateFacultyWeeklyTimetable(linkedBatches, batchesTimetableData);

  const sessionsForDay = allWeekSessions[selectedDay] || [];

  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-full">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-[10px] font-mono font-bold uppercase tracking-wider">
                Faculty Schedule
              </span>
              <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-[#FFFFFF]">
              Teaching Timetable
            </h2>
            <p className="text-xs text-[#6F6F6F] dark:text-[#A1A1AA]">
              View your synchronized teaching slots across all connected batches.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsConnectBatchOpen(true)}
            className="px-4 py-2.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer rounded-[8px] shadow-2xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Another Batch</span>
          </button>
        </div>
      </div>

      {/* Main Schedule Container */}
      {linkedBatches.length === 0 ? (
        <div className="w-full bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] p-8 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <BookOpen className="w-10 h-10 opacity-30 text-black dark:text-white" />
          <h3 className="text-base font-bold text-[#111111] dark:text-[#FFFFFF]">
            No Batches Connected Yet
          </h3>
          <p className="text-xs text-[#6F6F6F] dark:text-[#A1A1AA] max-w-md">
            Enter your 6-digit batch code and select the subjects you teach. Your teaching schedule will sync here instantly.
          </p>
          <button
            type="button"
            onClick={() => setIsConnectBatchOpen(true)}
            className="mt-2 px-5 py-2.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer rounded-[8px]"
          >
            Enter Batch Code
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Day Pills Bar */}
          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#111111] dark:text-white" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white">
                {selectedDay}
              </span>
              <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                ({sessionsForDay.length} {sessionsForDay.length === 1 ? 'lecture' : 'lectures'})
              </span>
            </div>

            {/* Day Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {DAYS.map((day) => {
                const isSelected = selectedDay === day;
                const isToday = currentDay === day;
                const count = (allWeekSessions[day] || []).length;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-full border ${
                      isSelected
                        ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                        : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    <span>{day.substring(0, 3)}</span>
                    {count > 0 && (
                      <span className={`ml-1 text-[10px] font-mono ${isSelected ? 'opacity-85' : 'opacity-50'}`}>
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
          <div className="flex flex-col gap-3.5">
            {sessionsForDay.length === 0 ? (
              <div className="py-12 bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-2 shadow-xs">
                <BookOpen className="w-8 h-8 opacity-30" />
                <span>No lectures scheduled for {selectedDay}.</span>
              </div>
            ) : (
              sessionsForDay.map((agg) => {
                const {
                  session,
                  batch,
                  subjectName,
                  subjectCode,
                  isCancelled,
                  isRescheduled,
                  rescheduleMeta,
                  isLive,
                } = agg;

                const theme = getSubjectCardTheme({
                  subjectName,
                  subjectCode,
                  isLab: session.isLab,
                  isCancelled,
                  isRescheduled,
                });

                const { pillLabel, detailLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
                const cardKey = `${session.id}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;

                return (
                  <div
                    key={cardKey}
                    className={clsx(
                      "group relative flex flex-col p-4 sm:p-[18px] text-left transition-all rounded-[12px] overflow-hidden shadow-xs hover:shadow-md",
                      isLive
                        ? "bg-[#111111] dark:bg-[#111111] border-2 border-[#18A889] shadow-[0_0_24px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30"
                        : isCancelled
                        ? "border border-rose-200 dark:border-rose-900/40 opacity-75"
                        : isRescheduled
                        ? "border border-amber-200 dark:border-amber-900/40"
                        : "border border-black/[0.05] dark:border-[color:var(--card-accent-border)]"
                    )}
                    style={{
                      ['--card-accent-border' as any]: `${theme.accent}45`,
                      borderColor: isLive ? '#18A889' : undefined,
                    }}
                  >
                    {/* Pastel backgrounds (exact student ClassCard) */}
                    {!isLive && (
                      <>
                        <div
                          className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[11px]"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div
                          className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[11px]"
                          style={{
                            background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                          }}
                        />
                      </>
                    )}

                    <div className="relative z-10 flex flex-col">
                      {/* Top Bar: Badge, Timing, Batch */}
                      <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none font-mono"
                            style={{ color: isLive ? '#18A889' : theme.accent }}
                          >
                            {isLive
                              ? 'LIVE NOW'
                              : isCancelled
                              ? 'CANCELLED'
                              : isRescheduled
                              ? 'RESCHEDULED'
                              : session.isLab
                              ? 'LAB SESSION'
                              : (subjectCode || 'LECTURE')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-bold font-mono leading-none ${isLive ? 'text-white' : 'text-[#151515] dark:text-[#F4F4F6]'}`}>
                            {formatTime12Hour(session.startTime)} - {formatTime12Hour(session.endTime)}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                            {pillLabel}
                          </span>
                        </div>
                      </div>

                      {/* Subject Name */}
                      <h3 className={`text-[18px] sm:text-[20px] font-bold leading-[24px] mb-2 pr-4 line-clamp-2 ${isCancelled ? 'line-through opacity-70' : ''} ${isLive ? 'text-white' : 'text-[#151515] dark:text-[#F4F4F6]'}`}>
                        {subjectName}
                      </h3>

                      {/* Rescheduled Notice */}
                      {isRescheduled && rescheduleMeta?.originalStartTime && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-mono font-medium mb-2.5 self-start">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Rescheduled from {formatTime12Hour(rescheduleMeta.originalStartTime)} - {formatTime12Hour(rescheduleMeta.originalEndTime)}
                            {rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Room */}
                      <div className={`flex items-center gap-3 text-[12px] font-mono flex-wrap ${isLive ? 'text-white/70' : 'text-black/60 dark:text-[#A1A1AA]'}`}>
                        <span className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 opacity-70" />
                          {session.room || 'Room TBA'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Connect Batch Modal */}
      <ConnectBatchModal
        isOpen={isConnectBatchOpen}
        onClose={() => setIsConnectBatchOpen(false)}
      />
    </div>
  );
};
