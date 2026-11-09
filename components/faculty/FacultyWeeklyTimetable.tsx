'use client';

import { FacultyPageHeader, FacultyNoBatches, FacultyStatTile } from './FacultyUI';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { MonochromeIllustration } from '@/components/ui/MonochromeIllustration';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  BookOpen,
  MoreVertical,
  MoreHorizontal,
  RotateCcw,
  Ban,
  Share2,
} from '@/components/ui/icons';
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
        `Synced via Intersemester.`;
    } else if (isRescheduled) {
      text = `⏰ *NOTICE: CLASS RESCHEDULED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day & Time: *${session.day}, ${session.startTime} - ${session.endTime}* (Original: ${rescheduleMeta?.originalStartTime} - ${rescheduleMeta?.originalEndTime})\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n` +
        (rescheduleMeta?.reason ? `Note: *${rescheduleMeta.reason}*\n` : '') +
        `\nUpdated on Intersemester.`;
    } else {
      text = `📌 *CLASS UPDATE*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day & Time: *${session.day}, ${session.startTime} - ${session.endTime}*\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via Intersemester.`;
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
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left w-full max-w-full">
      <FacultyPageHeader
        eyebrow="Teaching timetable"
        title="Your week"
        description="Only the subjects you teach, across every batch you've linked."
        action={
          linkedBatches.length > 0 && (
            <button type="button" onClick={() => setIsConnectBatchOpen(true)} className="btn btn-secondary btn-sm">
              <Plus className="w-4 h-4" /> Add batch
            </button>
          )
        }
      />

      {/* Main Schedule Container */}
      {linkedBatches.length === 0 ? (
        <FacultyNoBatches
          onConnect={() => setIsConnectBatchOpen(true)}
          title="No lectures yet"
          body="Link a batch with its code and pick your subjects. Your teaching slots appear here straight away."
          note="Your week starts here."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Mobile Day Tabs (< 768px) - Exact match to student theme */}
          <div className="flex md:hidden items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = currentDay === day;
              const count = (allWeekSessions[day] || []).length;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={clsx(
                    'flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 rounded-[3px] transition-all border cursor-pointer shrink-0',
                    isSelected
                      ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                      : 'bg-surface border-[#E5E5E0] dark:border-white/[0.08] text-fg hover:bg-surface-2'
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[13px] font-bold tracking-tight">{day.slice(0, 3)}</span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#18A889] shrink-0" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      'text-[11px] font-normal mt-0.5 tracking-tight',
                      isSelected ? 'text-white/70' : 'text-muted'
                    )}
                  >
                    {count} {count === 1 ? 'class' : 'classes'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile Schedule List (< 768px) */}
          <div className="flex md:hidden flex-col gap-3.5">
            {sessionsForDay.length === 0 ? (
              <EmptyState
                illustration="no-classes"
                title={`No lectures on ${selectedDay}`}
                description="No teaching sessions scheduled for this day."
                actionLabel="Connect Another Batch"
                onAction={() => setIsConnectBatchOpen(true)}
              />
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

                const { pillLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
                const cardKey = `${session.id}_${selectedDay}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;
                const categoryLabel = isLive
                  ? 'LIVE NOW'
                  : isCancelled
                  ? 'CANCELLED'
                  : isRescheduled
                  ? 'RESCHEDULED'
                  : session.isLab
                  ? 'LAB SESSION'
                  : (subjectCode || 'LECTURE');

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
                    {!isLive && (
                      <>
                        <div
                          className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-none"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div
                          className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-none"
                          style={{
                            background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                          }}
                        />
                      </>
                    )}

                    <div className="relative z-10 flex flex-col">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none">
                            <span className="dark:hidden inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-white/80 text-slate-800 text-[11px] font-bold tracking-wider font-mono border border-black/[0.05] shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isLive ? '#18A889' : theme.accent }} />
                              {categoryLabel}
                            </span>
                            <span className="hidden dark:inline font-mono" style={{ color: isLive ? '#18A889' : (theme.darkAccent || theme.accent) }}>
                              {categoryLabel}
                            </span>
                          </span>

                          {session.isLab && (
                            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-none bg-white/80 dark:bg-[rgba(24,168,137,0.18)] text-emerald-800 dark:text-[#18A889] border border-emerald-600/20 dark:border-transparent shadow-xs dark:shadow-none">
                              LAB
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] sm:text-[13px] font-bold font-mono tracking-tight whitespace-nowrap ${isLive ? 'text-white' : 'text-slate-600 dark:text-[#F4F4F6]'}`}>
                            {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
                          </span>

                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuSessionId(openMenuSessionId === cardKey ? null : cardKey)
                              }
                              className="p-1 rounded-none text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                              title="Class Options" aria-label="Class Options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openMenuSessionId === cardKey && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenMenuSessionId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-line rounded-none shadow-xl py-1.5 z-40 text-left font-sans flex flex-col">
                                  <div className="px-3 py-1 text-[12px] font-mono text-muted border-b border-line-soft mb-1 flex items-center gap-1.5">
                                    <span>🎓</span>
                                    <span>Faculty Actions</span>
                                  </div>

                                  {isRescheduled ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSessionId(null);
                                        handleRevertReschedule(agg);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
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
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
                                      >
                                        <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                        <span>Reschedule / Edit</span>
                                      </button>
                                    )
                                  )}

                                  {isCancelled ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuSessionId(null);
                                        handleToggleCancel(agg);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
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
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5 shrink-0" />
                                      <span>Cancel Class for Batch</span>
                                    </button>
                                  )}

                                  <div className="h-px bg-surface-3 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSessionId(null);
                                      handleShareWhatsAppNotice(agg);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
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

                      <h4 className={`text-[16px] sm:text-[17px] leading-[22px] font-bold tracking-tight break-words mb-2 ${isCancelled ? 'line-through opacity-70' : ''} ${isLive ? 'text-white' : 'text-fg'}`}>
                        {subjectName}
                      </h4>

                      {isRescheduled && rescheduleMeta?.originalStartTime && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-mono font-medium mb-2.5 self-start">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Rescheduled from {formatTime12Hour(rescheduleMeta.originalStartTime)} – {formatTime12Hour(rescheduleMeta.originalEndTime)}
                            {rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-center gap-1.5 text-[12px] font-medium truncate ${isLive ? 'text-white/80' : 'text-muted'}`}>
                        <span className="shrink-0 flex items-center gap-1">
                          <span className="text-[11px] leading-none opacity-80 text-muted">◉</span> {session.room || 'Room TBA'}
                        </span>
                        <span className="shrink-0 opacity-40">·</span>
                        <span className="truncate px-2 py-0.5 rounded-none bg-black/5 dark:bg-white/10 text-[11px] font-bold uppercase tracking-wider text-fg-2 inline-flex items-center font-mono border border-line-soft">
                          {pillLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Weekly Grid (>= 768px) - Exact match to student timetable */}
          <div
            className="hidden md:grid gap-4 items-start"
            style={{ gridTemplateColumns: `repeat(${DAYS.length}, minmax(0, 1fr))` }}
          >
            {DAYS.map((day) => {
              const isToday = currentDay === day;
              const daySessions = allWeekSessions[day] || [];

              return (
                <div
                  key={day}
                  className={clsx(
                    "flex flex-col gap-4 p-4 border transition-all rounded-none",
                    isToday
                      ? "bg-surface border-[#111111] dark:border-emerald-500/40 dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.12)] shadow-xs"
                      : "bg-surface border-line"
                  )}
                >
                  <div className="flex items-center justify-between px-1 pb-3 border-b border-line-soft">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold tracking-tight text-fg">
                          {day}
                        </span>
                        {isToday && (
                          <span className="text-[12px] font-bold text-white dark:text-emerald-400 bg-[#111111] dark:bg-emerald-500/20 dark:border dark:border-emerald-500/30 px-2 py-0.5 font-mono">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-muted">
                        {daySessions.length} {daySessions.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-h-[400px]">
                    {daySessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center bg-surface-2 border border-dashed border-line">
                        <CalendarDays className="w-6 h-6 text-[#6B6B6B] mb-2 opacity-50" />
                        <span className="text-xs font-semibold text-muted">No Lectures</span>
                      </div>
                    ) : (
                      daySessions.map((agg) => {
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

                        const { pillLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
                        const cardKey = `desk_${session.id}_${day}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;
                        const categoryLabel = isLive
                          ? 'LIVE NOW'
                          : isCancelled
                          ? 'CANCELLED'
                          : isRescheduled
                          ? 'RESCHEDULED'
                          : session.isLab
                          ? 'LAB'
                          : (subjectCode || 'LECTURE');

                        return (
                          <div
                            key={cardKey}
                            className={clsx(
                              "group relative flex flex-col p-3.5 text-left transition-all rounded-[10px] shadow-xs hover:shadow-md",
                              openMenuSessionId === cardKey ? "overflow-visible z-40" : "overflow-hidden z-0",
                              isLive
                                ? "bg-[#111111] dark:bg-[#111111] border-2 border-[#18A889] shadow-[0_0_20px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30"
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
                            {!isLive && (
                              <>
                                <div
                                  className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-none"
                                  style={{ backgroundColor: theme.bg }}
                                />
                                <div
                                  className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-none"
                                  style={{
                                    background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                                  }}
                                />
                              </>
                            )}

                            <div className="relative z-10 flex flex-col">
                              <div className="flex items-center justify-between gap-1.5 mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
                                  <span className="dark:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-white/80 text-slate-800 text-[11px] font-bold font-mono border border-black/[0.05] shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isLive ? '#18A889' : theme.accent }} />
                                    {categoryLabel}
                                  </span>
                                  <span className="hidden dark:inline font-mono text-[11px]" style={{ color: isLive ? '#18A889' : (theme.darkAccent || theme.accent) }}>
                                    {categoryLabel}
                                  </span>
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[11px] font-bold font-mono tracking-tight whitespace-nowrap ${isLive ? 'text-white' : 'text-slate-600 dark:text-[#F4F4F6]'}`}>
                                    {formatTime12Hour(session.startTime)}
                                  </span>

                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenMenuSessionId(openMenuSessionId === cardKey ? null : cardKey)
                                      }
                                      className="p-1 rounded-none text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                                      title="Class Options" aria-label="Class Options"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>

                                    {openMenuSessionId === cardKey && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-30"
                                          onClick={() => setOpenMenuSessionId(null)}
                                        />
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-line rounded-none shadow-xl py-1 z-40 text-left font-sans flex flex-col">
                                          {isRescheduled ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenMenuSessionId(null);
                                                handleRevertReschedule(agg);
                                              }}
                                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                              <span>Revert</span>
                                            </button>
                                          ) : (
                                            !isCancelled && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenMenuSessionId(null);
                                                  setSessionToReschedule(agg);
                                                }}
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
                                              >
                                                <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                                <span>Reschedule</span>
                                              </button>
                                            )
                                          )}

                                          {isCancelled ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenMenuSessionId(null);
                                                handleToggleCancel(agg);
                                              }}
                                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                              <span>Restore</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenMenuSessionId(null);
                                                handleToggleCancel(agg);
                                              }}
                                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                                            >
                                              <Ban className="w-3.5 h-3.5 shrink-0" />
                                              <span>Cancel</span>
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenMenuSessionId(null);
                                              handleShareWhatsAppNotice(agg);
                                            }}
                                            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
                                          >
                                            <Share2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                            <span>WhatsApp</span>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <h4 className={`text-[14px] leading-[18px] font-bold tracking-tight break-words mb-1.5 ${isCancelled ? 'line-through opacity-70' : ''} ${isLive ? 'text-white' : 'text-fg'}`}>
                                {subjectName}
                              </h4>

                              <div className={`flex items-center gap-1.5 text-[11px] font-medium truncate ${isLive ? 'text-white/80' : 'text-muted'}`}>
                                <span className="shrink-0 flex items-center gap-1">
                                  <span className="text-[11px] leading-none opacity-80 text-muted">◉</span> {session.room || 'TBA'}
                                </span>
                                <span className="shrink-0 opacity-40">·</span>
                                <span className="truncate text-[11px] font-mono opacity-80">
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
              );
            })}
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
