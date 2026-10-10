'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString, formatTime12Hour } from '@/lib/timetableUtils';
import {
  aggregateFacultyWeeklyTimetable,
  AggregatedFacultySession,
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
  Share2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyWeeklyTimetable: React.FC = () => {
  const { profile, user, showToast } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  const [isConnectBatchOpen, setIsConnectBatchOpen] = useState(false);
  const [batchesTimetableData, setBatchesTimetableData] = useState<Record<string, any>>({});
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek() || 'Monday');
  const [selectedBatchKey, setSelectedBatchKey] = useState<string>('ALL');

  // Cancel class modal state
  const [sessionToCancel, setSessionToCancel] = useState<AggregatedFacultySession | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule class modal state
  const [sessionToReschedule, setSessionToReschedule] = useState<AggregatedFacultySession | null>(null);

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
  const todayStr = getTodayDateString();

  // Aggregate strictly filtered to faculty's selected subjects
  const allWeekSessions = aggregateFacultyWeeklyTimetable(linkedBatches, batchesTimetableData);

  // Filter for chosen batch
  const rawSessionsForDay = allWeekSessions[selectedDay] || [];
  const sessionsForDay = rawSessionsForDay.filter(
    (s) => selectedBatchKey === 'ALL' || s.batch.batchKey === selectedBatchKey
  );

  const handleConfirmCancelClass = async () => {
    if (!sessionToCancel) return;
    setIsCancelling(true);

    try {
      const { session, batch, subjectName } = sessionToCancel;

      await cancelOrRestoreFacultyClass({
        batchKey: batch.batchKey,
        sessionId: session.id,
        subjectName,
        batchName: batch.batchName,
        facultyName: profile.name || 'Faculty',
        facultyTitle: profile.facultyTitle || 'Prof.',
        userId: user?.id,
        dateStr: todayStr,
        action: 'cancel',
        reason: cancelReason.trim() || undefined,
      });

      showToast(
        'Class Cancelled',
        `${subjectName} class cancelled. Batch students have been notified.`,
        'success'
      );

      setSessionToCancel(null);
      setCancelReason('');
    } catch (err: any) {
      console.error('Failed to cancel class:', err);
      showToast('Error', err.message || 'Failed to cancel class. Please retry.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRestoreClass = async (agg: AggregatedFacultySession) => {
    try {
      const { session, batch, subjectName } = agg;
      await cancelOrRestoreFacultyClass({
        batchKey: batch.batchKey,
        sessionId: session.id,
        subjectName,
        batchName: batch.batchName,
        facultyName: profile.name || 'Faculty',
        facultyTitle: profile.facultyTitle || 'Prof.',
        userId: user?.id,
        dateStr: todayStr,
        action: 'restore',
      });

      showToast('Class Restored', `${subjectName} restored on schedule.`, 'success');
    } catch (err: any) {
      console.error('Failed to restore class:', err);
      showToast('Error', err.message || 'Failed to restore class.', 'error');
    }
  };

  const handleRevertReschedule = async (agg: AggregatedFacultySession) => {
    try {
      const { session, batch, subjectName } = agg;
      await revertFacultyReschedule({
        batchKey: batch.batchKey,
        sessionId: session.id,
        subjectName,
        batchName: batch.batchName,
        facultyName: profile.name || 'Faculty',
        facultyTitle: profile.facultyTitle || 'Prof.',
        userId: user?.id,
        dateStr: todayStr,
      });

      showToast('Schedule Reverted', `${subjectName} reverted to original time.`, 'success');
    } catch (err: any) {
      console.error('Failed to revert reschedule:', err);
      showToast('Error', err.message || 'Failed to revert reschedule.', 'error');
    }
  };

  const handleShareWhatsAppNotice = (agg: AggregatedFacultySession) => {
    const { session, batch, subjectName, isCancelled, isRescheduled, rescheduleMeta } = agg;
    const teacherName = profile.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty';

    let text = '';
    if (isCancelled) {
      text = `📢 *NOTICE: CLASS CANCELLED*\n\n` +
        `Batch: *${batch.batchName}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Time: *${session.startTime} - ${session.endTime}*\n` +
        `Status: *CANCELLED TODAY*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Please check updated schedule on AcademiSync.`;
    } else if (isRescheduled) {
      text = `⏰ *NOTICE: CLASS RESCHEDULED*\n\n` +
        `Batch: *${batch.batchName}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `New Time: *${session.startTime} - ${session.endTime}* (Original: ${rescheduleMeta?.originalStartTime} - ${rescheduleMeta?.originalEndTime})\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n` +
        (rescheduleMeta?.reason ? `Note: *${rescheduleMeta.reason}*\n` : '') +
        `\nUpdated on AcademiSync.`;
    } else {
      text = `📌 *CLASS UPDATE*\n\n` +
        `Batch: *${batch.batchName}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Time: *${session.startTime} - ${session.endTime}*\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via AcademiSync.`;
    }

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full text-left">
      {/* Top Header */}
      <div className="w-full bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-mono text-[9.5px] font-bold uppercase tracking-widest rounded-[4px]">
                FACULTY SCHEDULE
              </span>
              <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-[#FFFFFF]">
              Teaching Timetable
            </h2>
            <p className="text-xs text-[#6F6F6F] dark:text-[#A1A1AA]">
              Real-time schedule with instant cancel, reschedule, and notification broadcast.
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

        {/* Batch Filter Pills (rounded-full) */}
        {linkedBatches.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-black/[0.06] dark:border-white/[0.08] scrollbar-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A1A1AA] shrink-0">
              Filter Batch:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBatchKey('ALL')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-full border shrink-0 ${
                selectedBatchKey === 'ALL'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                  : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
              }`}
            >
              All Batches
            </button>
            {linkedBatches.map((b) => (
              <button
                key={b.batchKey}
                type="button"
                onClick={() => setSelectedBatchKey(b.batchKey)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-full border shrink-0 truncate max-w-[240px] ${
                  selectedBatchKey === b.batchKey
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                    : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                }`}
              >
                {b.batchName.split('·').pop()?.trim() || b.batchName}
              </button>
            ))}
          </div>
        )}
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
          {/* Day Pills Bar (matches student WeeklyTimetable exactly) */}
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
                const daySessions = (allWeekSessions[day] || []).filter(
                  (s) => selectedBatchKey === 'ALL' || s.batch.batchKey === selectedBatchKey
                );
                const count = daySessions.length;

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
              <div className="py-12 bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-2">
                <BookOpen className="w-8 h-8 opacity-25" />
                <span>No lectures scheduled on {selectedDay} for your selected subjects.</span>
              </div>
            ) : (
              sessionsForDay.map((agg) => {
                const { session, batch, subjectName, subjectCode, isCancelled, isRescheduled, rescheduleMeta, isLive } = agg;

                const theme = getSubjectCardTheme({
                  subjectName,
                  subjectCode,
                  isLab: session.isLab,
                  isCancelled,
                  isRescheduled,
                });

                return (
                  <div
                    key={`${session.id}_${batch.id}`}
                    className={clsx(
                      "group relative flex flex-col p-4 sm:p-[18px] text-left transition-all rounded-[12px] overflow-hidden",
                      isLive
                        ? "bg-[#111111] dark:bg-[#111111] border-2 border-[#18A889] shadow-[0_0_24px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30 text-white"
                        : "border border-black/[0.05] dark:border-[color:var(--card-accent-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all"
                    )}
                    style={{
                      ['--card-accent-border' as any]: isLive ? '#18A889' : `${theme.accent}45`,
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
                            className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none"
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
                            {batch.batchName.split('·').pop()?.trim() || batch.batchName}
                          </span>
                        </div>
                      </div>

                      {/* Subject Name */}
                      <h3 className={`text-[18px] sm:text-[20px] font-bold leading-[24px] mb-2 pr-4 line-clamp-2 ${isLive ? 'text-white' : 'text-[#151515] dark:text-[#F4F4F6]'}`}>
                        {subjectName}
                      </h3>

                      {/* Rescheduled Notice */}
                      {isRescheduled && rescheduleMeta?.originalStartTime && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-mono font-medium mb-3 self-start">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Rescheduled from {formatTime12Hour(rescheduleMeta.originalStartTime)} - {formatTime12Hour(rescheduleMeta.originalEndTime)}
                            {rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Room & Batch Meta */}
                      <div className={`flex items-center gap-3 text-[12px] font-mono mb-3.5 flex-wrap ${isLive ? 'text-white/70' : 'text-black/60 dark:text-[#A1A1AA]'}`}>
                        <span className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 opacity-70" />
                          {session.room || 'Room TBA'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 opacity-60" />
                          {batch.batchName}
                        </span>
                        {subjectCode && (
                          <>
                            <span>·</span>
                            <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded-[3px] text-[10.5px]">
                              {subjectCode}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Actions Toolbar */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/5 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsAppNotice(agg)}
                            className="px-3 py-1.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-black dark:text-white rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            title="Share Notice to WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          {/* Reschedule / Revert */}
                          {isRescheduled ? (
                            <button
                              type="button"
                              onClick={() => handleRevertReschedule(agg)}
                              className="px-3 py-1.5 bg-amber-500 text-black hover:bg-amber-600 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revert Schedule</span>
                            </button>
                          ) : (
                            !isCancelled && (
                              <button
                                type="button"
                                onClick={() => setSessionToReschedule(agg)}
                                className="px-3 py-1.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-black dark:text-white rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Reschedule</span>
                              </button>
                            )
                          )}

                          {/* Cancel / Restore */}
                          {isCancelled ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreClass(agg)}
                              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Restore Class</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSessionToCancel(agg)}
                              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60 hover:bg-rose-600 hover:text-white text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel Class</span>
                            </button>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                          {batch.batchName.split('·').pop()?.trim() || 'Batch'}
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

      {/* Cancel Class Confirmation Modal */}
      {sessionToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18191E] border border-black/10 dark:border-white/15 max-w-md w-full p-6 flex flex-col gap-4 text-left shadow-2xl rounded-[16px]">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[#111111] dark:text-[#FFFFFF]">
                Cancel Class Today?
              </h3>
            </div>

            <p className="text-xs text-[#6F6F6F] dark:text-[#A1A1AA] leading-relaxed">
              This will officially cancel <strong>{sessionToCancel.subjectName}</strong> at{' '}
              <strong>{sessionToCancel.session.startTime}</strong> for{' '}
              <strong>{sessionToCancel.batch.batchName}</strong> for today.
              Enrolled students will receive an instant push alert.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                Reason / Note (Optional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Faculty meeting / Medical leave"
                className="w-full px-3 py-2 border border-black/15 dark:border-white/15 bg-transparent text-xs font-mono text-black dark:text-white rounded-[8px] focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToCancel(null)}
                disabled={isCancelling}
                className="px-4 py-2 border border-black/15 dark:border-white/15 text-xs font-bold uppercase text-black/70 dark:text-white/70 hover:border-black dark:hover:border-white rounded-[8px] cursor-pointer"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelClass}
                disabled={isCancelling}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors rounded-[8px] cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
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
