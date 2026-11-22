'use client';

import { FacultyPageHeader, FacultyNoBatches, FacultyStatTile } from './FacultyUI';
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { formatTime12Hour, getTodayDateString } from '@/lib/timetableUtils';
import {
  aggregateFacultyWeeklyTimetable,
  AggregatedFacultySession,
  formatFacultyBatchDegreeAndBranch,
  formatFacultyCombinedBatchLabel,
  cancelOrRestoreFacultyClass,
  revertFacultyReschedule,
  undoFacultyExtraClass,
  teachingWeekDates,
  formatClassDate,
  dayOfWeekForDate,
  addDaysToDateStr,
  parseDateStr,
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
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from '@/components/ui/icons';
import { clsx } from 'clsx';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyWeeklyTimetable: React.FC = () => {
  const { profile, user, showToast } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  const [isConnectBatchOpen, setIsConnectBatchOpen] = useState(false);
  const [batchesTimetableData, setBatchesTimetableData] = useState<Record<string, any>>({});
  // The date shown. After 8 pm it opens on tomorrow; on Sunday, on Monday.
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    let d = getTodayDateString();
    if (new Date().getHours() >= 20) d = addDaysToDateStr(d, 1);
    if (dayOfWeekForDate(d) === 'Sunday') d = addDaysToDateStr(d, 1);
    return d;
  });
  const todayStr = getTodayDateString();
  const weekDates = teachingWeekDates(selectedDate);
  const selectedDay = dayOfWeekForDate(selectedDate);
  const setSelectedDay = (day: DayOfWeek) => setSelectedDate(weekDates[day]);
  const datePickerRef = useRef<HTMLInputElement>(null);

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
      const targetDate = agg.date;
      if (action === 'cancel' && !window.confirm(`Cancel ${subjectName} on ${formatClassDate(targetDate, { relative: false })}? Students are notified.`)) return;

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
        action === 'cancel' ? 'Class Cancelled' : agg.movedTo ? 'Move Undone' : 'Class Restored',
        `${subjectName} · ${formatClassDate(targetDate)}${targets.length > 1 ? ` · ${targets.length} batches` : ''}. Students notified.`,
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
      const targetDate = agg.date;

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

  // A one-off class: remove it. If it was moved here, the lecture goes back to its own date.
  const handleUndoExtra = async (agg: AggregatedFacultySession) => {
    const { subjectName, movedFrom } = agg;
    const question = movedFrom
      ? `Undo the move? ${subjectName} goes back to ${formatClassDate(movedFrom.date, { relative: false })}, ${formatTime12Hour(movedFrom.startTime)}.`
      : `Remove this extra ${subjectName} class on ${formatClassDate(agg.date, { relative: false })}?`;
    if (!window.confirm(question)) return;
    try {
      const refs = agg.batchSessions?.length ? agg.batchSessions : [{ batch: agg.batch, session: agg.session }];
      await Promise.all(
        refs.map((r) =>
          undoFacultyExtraClass({
            batchKey: r.batch.batchKey,
            extraId: r.session.id,
            subjectName,
            batchName: r.batch.batchName,
            facultyName: profile.name || 'Faculty',
            facultyTitle: profile.facultyTitle || 'Prof.',
            userId: user?.id,
          })
        )
      );
      showToast(movedFrom ? 'Move Undone' : 'Extra Class Removed', `${subjectName}. Students notified.`, 'success');
    } catch (err: any) {
      console.error('Error undoing extra class:', err);
      showToast('Error', err.message || 'Could not undo that.', 'error');
    }
  };

  // What changed for this one date, shown under the subject
  const renderChangeNote = (agg: AggregatedFacultySession, compact = false) => {
    const { isRescheduled, rescheduleMeta, movedTo, movedFrom, isExtra, isCancelled, cancelReason } = agg;
    const base = clsx(
      'inline-flex items-center gap-1.5 rounded-full border font-mono font-medium self-start',
      compact ? 'px-1.5 py-0.5 text-[10px] mb-1.5' : 'px-2.5 py-1 text-[11px] mb-2.5'
    );
    if (movedTo) {
      return (
        <div className={clsx(base, 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300')}>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span>Moved to {formatClassDate(movedTo.date)}, {formatTime12Hour(movedTo.startTime)}</span>
        </div>
      );
    }
    if (isExtra) {
      return (
        <div className={clsx(base, 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300')}>
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span>{movedFrom ? `Moved from ${formatClassDate(movedFrom.date)}, ${formatTime12Hour(movedFrom.startTime)}` : 'Extra class'}</span>
        </div>
      );
    }
    if (isRescheduled && rescheduleMeta?.originalStartTime) {
      return (
        <div className={clsx(base, 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300')}>
          <Clock className="w-3 h-3 shrink-0" />
          <span>
            {compact ? 'From' : 'Rescheduled from'} {formatTime12Hour(rescheduleMeta.originalStartTime)}
            {!compact && rescheduleMeta.originalEndTime ? ` – ${formatTime12Hour(rescheduleMeta.originalEndTime)}` : ''}
            {!compact && rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
          </span>
        </div>
      );
    }
    if (isCancelled && cancelReason && !compact && cancelReason !== 'Class cancelled by Faculty') {
      return (
        <div className={clsx(base, 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300')}>
          <Ban className="w-3 h-3 shrink-0" />
          <span>{cancelReason}</span>
        </div>
      );
    }
    return null;
  };

  // Faculty actions for one class on one date (same on phone and desktop)
  const renderMenuItems = (agg: AggregatedFacultySession, compact = false) => {
    const isPast = agg.date < todayStr;
    const item = clsx(
      'flex items-center gap-2.5 w-full text-left font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
      compact ? 'px-3 py-1.5 text-[12px]' : 'px-3.5 py-2 text-[13px]'
    );
    const run = (fn: () => void) => () => {
      setOpenMenuSessionId(null);
      fn();
    };
    return (
      <>
        <div className={clsx('font-mono text-muted border-b border-line-soft mb-1', compact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1 text-[12px]')}>
          {formatClassDate(agg.date, { relative: false })}
          {isPast ? ' · past' : ''}
        </div>
        {agg.isExtra ? (
          <button type="button" disabled={isPast} onClick={run(() => handleUndoExtra(agg))} className={clsx(item, 'text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30')}>
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>{agg.movedFrom ? 'Undo move' : 'Remove extra class'}</span>
          </button>
        ) : (
          <>
            {agg.isRescheduled ? (
              <button type="button" disabled={isPast} onClick={run(() => handleRevertReschedule(agg))} className={clsx(item, 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30')}>
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Back to usual time</span>
              </button>
            ) : (
              !agg.isCancelled && (
                <button type="button" disabled={isPast} onClick={run(() => setSessionToReschedule(agg))} className={clsx(item, 'text-fg hover:bg-surface-2')}>
                  <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <span>Reschedule or move</span>
                </button>
              )
            )}
            {agg.isCancelled ? (
              <button type="button" disabled={isPast} onClick={run(() => handleToggleCancel(agg))} className={clsx(item, 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30')}>
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>{agg.movedTo ? 'Undo move' : 'Restore class'}</span>
              </button>
            ) : (
              <button type="button" disabled={isPast} onClick={run(() => handleToggleCancel(agg))} className={clsx(item, 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30')}>
                <Ban className="w-3.5 h-3.5 shrink-0" />
                <span>Cancel this class</span>
              </button>
            )}
          </>
        )}
        <div className="h-px bg-surface-3 my-1" />
        <button type="button" onClick={run(() => handleShareWhatsAppNotice(agg))} className={clsx(item, 'text-fg hover:bg-surface-2')}>
          <Share2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
          <span>{compact ? 'WhatsApp' : 'Share Notice via WhatsApp'}</span>
        </button>
      </>
    );
  };

  const handleShareWhatsAppNotice = (agg: AggregatedFacultySession) => {
    const { session, subjectName, isCancelled, isRescheduled, rescheduleMeta } = agg;
    const dayLabel = formatClassDate(agg.date, { relative: false });
    const { detailLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
    const teacherName = profile.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty';
    const batchLabel = detailLabel;

    let text = '';
    if (isCancelled && agg.movedTo) {
      text = `📅 *NOTICE: CLASS MOVED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}*\n` +
        `From: *${dayLabel}, ${session.startTime} - ${session.endTime}*\n` +
        `To: *${formatClassDate(agg.movedTo.date, { relative: false })}, ${agg.movedTo.startTime} - ${agg.movedTo.endTime}*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Updated on Intersemester.`;
    } else if (isCancelled) {
      text = `📢 *NOTICE: CLASS CANCELLED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Date & Time: *${dayLabel}, ${session.startTime} - ${session.endTime}*\n` +
        `Status: *CANCELLED*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via Intersemester.`;
    } else if (isRescheduled) {
      text = `⏰ *NOTICE: CLASS RESCHEDULED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Date & Time: *${dayLabel}, ${session.startTime} - ${session.endTime}* (Original: ${rescheduleMeta?.originalStartTime} - ${rescheduleMeta?.originalEndTime})\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n` +
        (rescheduleMeta?.reason ? `Note: *${rescheduleMeta.reason}*\n` : '') +
        `\nUpdated on Intersemester.`;
    } else {
      text = `📌 *CLASS UPDATE*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Date & Time: *${dayLabel}, ${session.startTime} - ${session.endTime}*\n` +
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

  // Aggregate strictly filtered to faculty's selected subjects, for the dates of the week shown
  const allWeekSessions = aggregateFacultyWeeklyTimetable(linkedBatches, batchesTimetableData, weekDates, user?.id);
  const days: DayOfWeek[] =
    selectedDay === 'Sunday' || (allWeekSessions.Sunday || []).length > 0 ? [...DAYS, 'Sunday'] : DAYS;
  const weekLabel = `${parseDateStr(weekDates.Monday).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${parseDateStr(weekDates[days[days.length - 1]]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  const isThisWeek = teachingWeekDates(todayStr).Monday === weekDates.Monday;
  const dayNum = (day: DayOfWeek) => parseDateStr(weekDates[day]).getDate();

  const sessionsForDay = allWeekSessions[selectedDay] || [];

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left w-full max-w-full">
      <FacultyPageHeader
        eyebrow="Teaching timetable"
        title="Your week"
        description="Pick any date to cancel, reschedule or move a class. Students hear about it straight away."
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
          {/* Week navigator: any date, not just this week */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setSelectedDate(addDaysToDateStr(selectedDate, -7))} className="rounded-full w-9 h-9 inline-flex items-center justify-center border border-line bg-surface hover:bg-surface-2 cursor-pointer" aria-label="Previous week">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[120px] text-center text-[14px] font-semibold tracking-tight text-fg tabular-nums">{weekLabel}</span>
              <button type="button" onClick={() => setSelectedDate(addDaysToDateStr(selectedDate, 7))} className="rounded-full w-9 h-9 inline-flex items-center justify-center border border-line bg-surface hover:bg-surface-2 cursor-pointer" aria-label="Next week">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {!isThisWeek && (
                <button type="button" onClick={() => setSelectedDate(dayOfWeekForDate(todayStr) === 'Sunday' ? addDaysToDateStr(todayStr, 1) : todayStr)} className="rounded-full h-9 px-3 text-[13px] font-semibold border border-line bg-surface hover:bg-surface-2 cursor-pointer">
                  Today
                </button>
              )}
              <label className="rounded-full relative h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-semibold border border-line bg-surface hover:bg-surface-2 cursor-pointer">
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Pick a date</span>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  onClick={() => {
                    try {
                      datePickerRef.current?.showPicker?.();
                    } catch {}
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Pick a date"
                />
              </label>
            </div>
          </div>

          {/* Mobile Day Tabs (< 768px) - Exact match to student theme */}
          <div className="flex md:hidden items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {days.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = weekDates[day] === todayStr;
              const count = (allWeekSessions[day] || []).length;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={clsx(
                    'flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 rounded-xl transition-all border cursor-pointer shrink-0',
                    weekDates[day] < todayStr && !isSelected && 'opacity-55',
                    isSelected
                      ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                      : 'bg-surface border-[#E5E5E0] dark:border-white/[0.08] text-fg hover:bg-surface-2'
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[13px] font-bold tracking-tight">{day.slice(0, 3)} {dayNum(day)}</span>
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
                illustration="free-day"
                title={`No lectures ${formatClassDate(selectedDate) === 'Today' ? 'today' : `on ${formatClassDate(selectedDate, { relative: false })}`}`}
                description="No teaching sessions scheduled for this date."
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
                const cardKey = `${session.id}_${agg.date}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;
                const categoryLabel = isLive
                  ? 'LIVE NOW'
                  : isCancelled
                  ? (agg.movedTo ? 'MOVED' : 'CANCELLED')
                  : agg.isExtra
                  ? (agg.movedFrom ? 'MOVED HERE' : 'EXTRA CLASS')
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
                          className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-card"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div
                          className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-card"
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
                            <span className="dark:hidden inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/80 text-slate-800 text-[11px] font-bold tracking-wider font-mono border border-black/[0.05] shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isLive ? '#18A889' : theme.accent }} />
                              {categoryLabel}
                            </span>
                            <span className="hidden dark:inline font-mono" style={{ color: isLive ? '#18A889' : (theme.darkAccent || theme.accent) }}>
                              {categoryLabel}
                            </span>
                          </span>

                          {session.isLab && (
                            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-[rgba(24,168,137,0.18)] text-emerald-800 dark:text-[#18A889] border border-emerald-600/20 dark:border-transparent shadow-xs dark:shadow-none">
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
                              className="p-1 rounded-full text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
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
                                <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface border border-line rounded-card overflow-hidden shadow-xl py-1.5 z-40 text-left font-sans flex flex-col">
                                  {renderMenuItems(agg)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <h4 className={`text-[16px] sm:text-[17px] leading-[22px] font-bold tracking-tight break-words mb-2 ${isCancelled ? 'line-through opacity-70' : ''} ${isLive ? 'text-white' : 'text-fg'}`}>
                        {subjectName}
                      </h4>

                      {renderChangeNote(agg)}

                      <div className={`flex items-center gap-1.5 text-[12px] font-medium truncate ${isLive ? 'text-white/80' : 'text-muted'}`}>
                        <span className="shrink-0 flex items-center gap-1">
                          <span className="text-[11px] leading-none opacity-80 text-muted">◉</span> {session.room || 'Room TBA'}
                        </span>
                        <span className="shrink-0 opacity-40">·</span>
                        <span className="truncate px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-bold uppercase tracking-wider text-fg-2 inline-flex items-center font-mono border border-line-soft">
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
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {days.map((day) => {
              const isToday = weekDates[day] === todayStr;
              const daySessions = allWeekSessions[day] || [];

              return (
                <div
                  key={day}
                  className={clsx(
                    "flex flex-col gap-4 p-4 border transition-all rounded-card",
                    isToday
                      ? "bg-surface border-[#111111] dark:border-emerald-500/40 dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.12)] shadow-xs"
                      : "bg-surface border-line"
                  )}
                >
                  <div className="flex items-center justify-between px-1 pb-3 border-b border-line-soft">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-[14px] font-bold tracking-tight text-fg', weekDates[day] < todayStr && 'opacity-55')}>
                          {day.slice(0, 3)} {dayNum(day)}
                        </span>
                        {isToday && (
                          <span className="rounded-full text-[12px] font-bold text-white dark:text-emerald-400 bg-[#111111] dark:bg-emerald-500/20 dark:border dark:border-emerald-500/30 px-2 py-0.5 font-mono">
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
                      <div className="rounded-card flex flex-col items-center justify-center h-48 text-center bg-surface-2 border border-dashed border-line">
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
                        const cardKey = `desk_${session.id}_${agg.date}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;
                        const categoryLabel = isLive
                          ? 'LIVE NOW'
                          : isCancelled
                          ? (agg.movedTo ? 'MOVED' : 'CANCELLED')
                          : agg.isExtra
                          ? (agg.movedFrom ? 'MOVED HERE' : 'EXTRA')
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
                                  className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-card"
                                  style={{ backgroundColor: theme.bg }}
                                />
                                <div
                                  className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-card"
                                  style={{
                                    background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                                  }}
                                />
                              </>
                            )}

                            <div className="relative z-10 flex flex-col">
                              <div className="flex items-center justify-between gap-1.5 mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
                                  <span className="dark:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/80 text-slate-800 text-[11px] font-bold font-mono border border-black/[0.05] shadow-xs">
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
                                      className="p-1 rounded-full text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
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
                                        <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-line rounded-card overflow-hidden shadow-xl py-1 z-40 text-left font-sans flex flex-col">
                                          {renderMenuItems(agg, true)}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <h4 className={`text-[14px] leading-[18px] font-bold tracking-tight break-words mb-1.5 ${isCancelled ? 'line-through opacity-70' : ''} ${isLive ? 'text-white' : 'text-fg'}`}>
                                {subjectName}
                              </h4>

                              {renderChangeNote(agg, true)}

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
