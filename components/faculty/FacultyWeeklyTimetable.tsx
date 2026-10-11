'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, getTomorrowDayOfWeek, formatTime12Hour, getDateStringForDayOfWeek, getTodayDateString } from '@/lib/timetableUtils';
import {
  aggregateFacultyWeeklyTimetable,
  AggregatedFacultySession,
  formatFacultyBatchDegreeAndBranch,
  formatFacultyCombinedBatchLabel,
  cancelOrRestoreFacultyClass,
  revertFacultyReschedule,
} from '@/lib/facultyUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ConnectBatchModal } from './ConnectBatchModal';
import { FacultyRescheduleModal } from './FacultyRescheduleModal';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  BookOpen,
  MoreVertical,
  RotateCcw,
  Ban,
  Share2,
} from 'lucide-react';
import { clsx } from 'clsx';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyWeeklyTimetable: React.FC = () => {
  const { profile, user, showToast } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  const [isConnectBatchOpen, setIsConnectBatchOpen] = useState(false);
  const [batchesTimetableData, setBatchesTimetableData] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const now = new Date();
    if (now.getHours() >= 20) {
      const tomorrow = getTomorrowDayOfWeek();
      if (DAYS.includes(tomorrow)) return tomorrow;
      return 'Monday';
    }
    const curr = getCurrentDayOfWeek();
    if (DAYS.includes(curr)) return curr;
    return 'Monday';
  });

  const [sessionToReschedule, setSessionToReschedule] = useState<AggregatedFacultySession | null>(null);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  const handleToggleCancel = async (agg: AggregatedFacultySession) => {
    try {
      const { subjectName, isCancelled } = agg;
      const batchMap = new Map<string, { batch: FacultyLinkedBatch; session: ClassSession }>();
      (agg.linkedBatches || [agg.batch]).forEach((b) => {
        batchMap.set(b.batchKey, { batch: b, session: agg.session });
      });
      (agg.batchSessions || []).forEach((bs) => {
        batchMap.set(bs.batch.batchKey, bs);
      });
      const targets = Array.from(batchMap.values());
      const action = isCancelled ? 'restore' : 'cancel';
      const targetDate = agg.session.day ? getDateStringForDayOfWeek(agg.session.day) : getTodayDateString();

      await Promise.all(
        targets.map((t) =>
          cancelOrRestoreFacultyClass({
            batchKey: t.batch.batchKey,
            sessionId: t.session.id,
            subjectName,
            batchName: t.batch.batchName,
            facultyName: profile.name || 'Faculty',
            facultyTitle: profile.facultyTitle || 'Prof.',
            userId: user?.id,
            dateStr: targetDate,
            action,
            sessionDay: agg.session.day,
            originalStartTime: agg.session.startTime,
          })
        )
      );

      showToast(
        action === 'cancel' ? 'Class Cancelled' : 'Class Restored',
        `${subjectName} updated across ${targets.length > 1 ? `${targets.length} batches` : 'batch'}.`,
        action === 'cancel' ? 'info' : 'success'
      );
    } catch (err: any) {
      console.error('Error toggling cancel:', err);
      showToast('Error', err.message || 'Failed to update class status.', 'error');
    }
  };

  const handleRevertReschedule = async (agg: AggregatedFacultySession) => {
    try {
      const { subjectName } = agg;
      const batchMap = new Map<string, { batch: FacultyLinkedBatch; session: ClassSession }>();
      (agg.linkedBatches || [agg.batch]).forEach((b) => {
        batchMap.set(b.batchKey, { batch: b, session: agg.session });
      });
      (agg.batchSessions || []).forEach((bs) => {
        batchMap.set(bs.batch.batchKey, bs);
      });
      const targets = Array.from(batchMap.values());
      const targetDate = agg.session.day ? getDateStringForDayOfWeek(agg.session.day) : getTodayDateString();

      await Promise.all(
        targets.map((t) =>
          revertFacultyReschedule({
            batchKey: t.batch.batchKey,
            sessionId: t.session.id,
            subjectName,
            batchName: t.batch.batchName,
            facultyName: profile.name || 'Faculty',
            facultyTitle: profile.facultyTitle || 'Prof.',
            userId: user?.id,
            dateStr: targetDate,
            sessionDay: agg.session.day,
            originalStartTime: agg.session.startTime,
          })
        )
      );

      showToast('Schedule Reverted', `${subjectName} reverted to original time.`, 'success');
    } catch (err: any) {
      console.error('Error reverting reschedule:', err);
      showToast('Error', err.message || 'Failed to revert reschedule.', 'error');
    }
  };

  const handleShareWhatsAppNotice = (agg: AggregatedFacultySession) => {
    const { session, subjectName, isCancelled, isRescheduled, rescheduleMeta } = agg;
    const { detailLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
    const teacherName = profile.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty';
    const batchLabel = detailLabel;

    let text = '';
    if (isCancelled) {
      text = `📢 *NOTICE: CLASS CANCELLED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day & Time: *${session.day}, ${session.startTime} - ${session.endTime}*\n` +
        `Status: *CANCELLED*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via AcademiSync.`;
    } else if (isRescheduled) {
      text = `⏰ *NOTICE: CLASS RESCHEDULED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day & Time: *${session.day}, ${session.startTime} - ${session.endTime}* (Original: ${rescheduleMeta?.originalStartTime} - ${rescheduleMeta?.originalEndTime})\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n` +
        (rescheduleMeta?.reason ? `Note: *${rescheduleMeta.reason}*\n` : '') +
        `\nUpdated on AcademiSync.`;
    } else {
      text = `📌 *CLASS UPDATE*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day & Time: *${session.day}, ${session.startTime} - ${session.endTime}*\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via AcademiSync.`;
    }

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

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
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 mt-6 sm:mt-8 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 rounded-[3px]">
                FACULTY SCHEDULE
              </span>
              <span className="text-[12px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
              </span>
            </div>
            <h2 className="text-[32px] sm:text-[36px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px] sm:leading-[42px]">
              Teaching Timetable
            </h2>
            <p className="text-[14px] font-normal text-[#6B6B6B] dark:text-[#A1A1AA] leading-[20px] mt-1.5">
              View your synchronized teaching slots across all connected batches.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsConnectBatchOpen(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] hover:opacity-90 transition-opacity text-[13px] font-semibold cursor-pointer shadow-xs rounded-[3px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Connect Batch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Schedule Container */}
      {linkedBatches.length === 0 ? (
        <div className="w-full bg-[#FFFFFF] dark:bg-[#121317] border border-black/10 dark:border-white/10 rounded-[4px] p-8 text-center flex flex-col items-center justify-center gap-3">
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
            className="mt-2 h-9 px-4 bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer rounded-[3px]"
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
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-[4px] border ${
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
                const cardKey = `${session.id}_${selectedDay}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;

                return (
                  <div
                    key={cardKey}
                    className={clsx(
                      "group relative flex flex-col p-4 sm:p-[18px] text-left transition-all rounded-[12px] shadow-xs hover:shadow-md",
                      openMenuSessionId === cardKey ? "overflow-visible z-40" : "overflow-hidden z-0",
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
                      {/* Top Bar: Badge, Timing, 3-dot Menu */}
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

                          {/* 3-Dot Action Dropdown Menu */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuSessionId(openMenuSessionId === cardKey ? null : cardKey)
                              }
                              className="p-1 rounded-[6px] text-[#6F6F6F] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Class Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuSessionId === cardKey && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenMenuSessionId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#16171D] border border-black/10 dark:border-white/10 rounded-[8px] shadow-xl py-1.5 z-40 text-left font-sans flex flex-col">
                                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 border-b border-black/5 dark:border-white/5 mb-1 flex items-center gap-1.5">
                                    <span>🎓</span>
                                    <span>Faculty Actions</span>
                                  </div>

                                  {/* Reschedule / Edit Timing Action */}
                                  {isRescheduled ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSessionId(null);
                                        handleRevertReschedule(agg);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                      <span>Revert Reschedule</span>
                                    </button>
                                  ) : (
                                    !isCancelled && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSessionId(null);
                                          setSessionToReschedule(agg);
                                        }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                                      >
                                        <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                        <span>Reschedule / Edit</span>
                                      </button>
                                    )
                                  )}

                                  {/* Cancel / Restore Action */}
                                  {isCancelled ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSessionId(null);
                                        handleToggleCancel(agg);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                      <span>Restore Class for Batch</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSessionId(null);
                                        handleToggleCancel(agg);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5 shrink-0" />
                                      <span>Cancel Class for Batch</span>
                                    </button>
                                  )}

                                  <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />

                                  {/* Share Notice via WhatsApp */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSessionId(null);
                                      handleShareWhatsAppNotice(agg);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                                  >
                                    <Share2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                    <span>Share Notice via WhatsApp</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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
                      <div className={`flex items-center gap-1.5 text-[12px] font-mono font-medium ${isLive ? 'text-white/70' : 'text-black/60 dark:text-[#A1A1AA]'}`}>
                        <MapPin className="w-3.5 h-3.5 opacity-70" />
                        <span>{session.room || 'Room TBA'}</span>
                      </div>

                      {/* Connected Batch Pill below Room */}
                      <div className="mt-2.5 flex items-center">
                        <span className="px-2.5 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 inline-flex items-center font-mono border border-black/5 dark:border-white/5">
                          {pillLabel}
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

      {/* Reschedule Modal */}
      <FacultyRescheduleModal
        isOpen={sessionToReschedule !== null}
        onClose={() => setSessionToReschedule(null)}
        aggregatedSession={sessionToReschedule}
      />

      {/* Connect Batch Modal */}
      <ConnectBatchModal
        isOpen={isConnectBatchOpen}
        onClose={() => setIsConnectBatchOpen(false)}
      />
    </div>
  );
};
