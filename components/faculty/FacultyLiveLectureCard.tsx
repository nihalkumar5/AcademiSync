'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString, getDateStringForDayOfWeek, formatTime12Hour, timeToMinutes } from '@/lib/timetableUtils';
import {
  AggregatedFacultySession,
  revertFacultyReschedule,
  cancelOrRestoreFacultyClass,
  formatFacultyBatchDegreeAndBranch,
  formatFacultyCombinedBatchLabel,
} from '@/lib/facultyUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { FacultyRescheduleModal } from './FacultyRescheduleModal';
import {
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Share2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  UserCheck,
} from '@/components/ui/icons';
import { clsx } from 'clsx';

export type { AggregatedFacultySession };

interface FacultyLiveLectureCardProps {
  aggregatedSessions: AggregatedFacultySession[];
  tomorrowSessions?: AggregatedFacultySession[];
  isAfter8PM?: boolean;
  tomorrowDay?: DayOfWeek;
  onRefresh?: () => void;
}

export const FacultyLiveLectureCard: React.FC<FacultyLiveLectureCardProps> = ({
  aggregatedSessions,
  tomorrowSessions = [],
  isAfter8PM = false,
  tomorrowDay,
  onRefresh,
}) => {
  const { profile, user, showToast, setActiveView } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const todayStr = getTodayDateString();

  const activeSession =
    aggregatedSessions.find((s) => s.isLive) ||
    aggregatedSessions.find((s) => s.isUpcoming) ||
    null;

  if (!profile.facultyLinkedBatches || profile.facultyLinkedBatches.length === 0) {
    return null;
  }

  if (!activeSession) {
    const tomorrowCount = tomorrowSessions.filter((s) => !s.isCancelled).length;

    return (
      <div className="card w-full p-5 flex flex-col text-left">
        <span className="text-[12px] font-semibold text-muted leading-none mb-3">
          Schedule complete
        </span>
        <h3 className="text-[16px] font-semibold text-fg leading-snug mb-2">
          You&apos;re done for today.
        </h3>
        <span className="text-[13px] text-muted leading-none">
          {isAfter8PM
            ? (tomorrowCount === 0
                ? 'No classes scheduled for tomorrow.'
                : `${tomorrowCount} ${tomorrowCount === 1 ? 'lecture' : 'lectures'} scheduled for tomorrow.`)
            : (aggregatedSessions.length === 0
                ? 'No classes scheduled for today.'
                : `${aggregatedSessions.length} ${aggregatedSessions.length === 1 ? 'lecture' : 'lectures'} scheduled for today.`)}
        </span>
      </div>
    );
  }

  const {
    session,
    batch,
    subjectName,
    subjectCode,
    isCancelled,
    isRescheduled,
    rescheduleMeta,
    isLive,
    minutesUntilStart,
  } = activeSession;
  const facultyName = `${profile.facultyTitle || 'Prof.'} ${profile.name || 'Faculty'}`;
  const { pillLabel, detailLabel } = formatFacultyCombinedBatchLabel(activeSession.linkedBatches, activeSession.batch);

  const theme = getSubjectCardTheme({
    subjectName,
    subjectCode,
    isLab: session.isLab,
    isCancelled,
    isRescheduled,
  });

  const handleToggleCancel = async () => {
    setIsProcessing(true);
    try {
      const action = isCancelled ? 'restore' : 'cancel';
      const batchMap = new Map<string, { batch: FacultyLinkedBatch; session: ClassSession }>();
      (activeSession.linkedBatches || [activeSession.batch]).forEach((b) => {
        batchMap.set(b.batchKey, { batch: b, session: activeSession.session });
      });
      (activeSession.batchSessions || []).forEach((bs) => {
        batchMap.set(bs.batch.batchKey, bs);
      });
      const targets = Array.from(batchMap.values());
      const targetDate = activeSession.session.day ? getDateStringForDayOfWeek(activeSession.session.day) : todayStr;

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
            sessionDay: activeSession.session.day,
            originalStartTime: activeSession.session.startTime,
          })
        )
      );

      showToast(
        action === 'cancel' ? 'Lecture Cancelled' : 'Lecture Restored',
        `${subjectName} updated for ${targets.length > 1 ? `${targets.length} batches` : batch.batchName}. Notification broadcast to batch.`,
        action === 'cancel' ? 'info' : 'success'
      );

      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error updating lecture status:', err);
      showToast('Update Failed', err.message || 'Could not update lecture status on server.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevertReschedule = async () => {
    setIsProcessing(true);
    try {
      const batchMap = new Map<string, { batch: FacultyLinkedBatch; session: ClassSession }>();
      (activeSession.linkedBatches || [activeSession.batch]).forEach((b) => {
        batchMap.set(b.batchKey, { batch: b, session: activeSession.session });
      });
      (activeSession.batchSessions || []).forEach((bs) => {
        batchMap.set(bs.batch.batchKey, bs);
      });
      const targets = Array.from(batchMap.values());
      const targetDate = activeSession.session.day ? getDateStringForDayOfWeek(activeSession.session.day) : todayStr;

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
            sessionDay: activeSession.session.day,
            originalStartTime: activeSession.session.startTime,
          })
        )
      );

      showToast('Reschedule Reverted', 'Lecture reverted to original schedule.', 'success');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error reverting reschedule:', err);
      showToast('Revert Failed', err.message || 'Could not revert reschedule.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareWhatsAppNotice = () => {
    let statusText = '🕒 REGULAR CLASS ON SCHEDULE';
    if (isCancelled) statusText = '🚫 CANCELLED FOR TODAY';
    else if (isRescheduled) statusText = `⏰ RESCHEDULED: ${session.startTime} - ${session.endTime}`;

    const batchLabel = detailLabel;
    const message = [
      `📢 *Official Class Announcement*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Subject:* ${subjectName} (${subjectCode || 'Class'})`,
      `*Batch:* ${batchLabel}`,
      `*Faculty:* ${facultyName}`,
      `*Time:* ${session.startTime} - ${session.endTime}${isRescheduled && rescheduleMeta ? ` (Original: ${rescheduleMeta.originalStartTime} - ${rescheduleMeta.originalEndTime})` : ''}`,
      `*Room:* ${session.room || 'TBA'}`,
      `*Status:* ${statusText}`,
      rescheduleMeta?.reason ? `*Note:* ${rescheduleMeta.reason}` : '',
      `━━━━━━━━━━━━━━━━━━`,
      `Synced via Intersemester.`,
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    }
  };

  // If class is LIVE RIGHT NOW -> Identical to Student LiveClassCard (dark brutalist card with progress bar)
  if (isLive) {
    const startMins = timeToMinutes(session.startTime);
    const endMins = timeToMinutes(session.endTime);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const totalDuration = Math.max(1, endMins - startMins);
    const elapsed = Math.max(0, currentMinutes - startMins);
    const remainingMinutes = Math.max(0, endMins - currentMinutes);
    const progressPercentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    const nextSession = aggregatedSessions.find((s) => s !== activeSession && s.isUpcoming && !s.isCancelled);

    return (
      <>
        <div
          className={clsx(
            "w-full bg-[#111111] dark:bg-gradient-to-br dark:from-[#0D2620] dark:via-[#091D18] dark:to-[#071713] border border-[#111111] dark:border-[#18A889]/40 rounded-[12px] p-5 flex flex-col relative group shadow-lg dark:shadow-[0_4px_24px_rgba(24,168,137,0.15)] text-left transition-all",
            menuOpen ? "overflow-visible z-30" : "overflow-hidden z-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18A889] animate-pulse" />
              <span className="text-[12px] font-bold text-[#18A889] leading-none">
                Live now
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[#FFFFFF] font-mono leading-none">
                {remainingMinutes}m left
              </span>

              {/* Options Menu */}
              <div className="relative shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  className="p-1 rounded-none text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Class Options" aria-label="Class Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                    />
                    <div
                      className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-line shadow-[0_12px_36px_rgba(0,0,0,0.22)] py-1.5 z-50 text-left overflow-hidden rounded-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3.5 py-1.5 bg-surface-2 border-b border-line-soft text-[12px] font-mono font-bold text-muted flex items-center gap-1.5">
                        <span>🎓</span>
                        <span>Faculty Actions</span>
                      </div>

                      {/* Reschedule / Revert Actions */}
                      {isRescheduled ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            setMenuOpen(false);
                            handleRevertReschedule();
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
                            disabled={isProcessing}
                            onClick={() => {
                              setMenuOpen(false);
                              setIsRescheduleModalOpen(true);
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>Reschedule Class</span>
                          </button>
                        )
                      )}

                      {/* Cancel / Restore Actions */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => {
                          setMenuOpen(false);
                          handleToggleCancel();
                        }}
                        className={clsx(
                          "flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-left transition-colors cursor-pointer",
                          isCancelled
                            ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        )}
                      >
                        {isCancelled ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span>Restore Class</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Cancel Class</span>
                          </>
                        )}
                      </button>

                      {/* WhatsApp Notice */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handleShareWhatsAppNotice();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-slate-800 dark:text-[#F4F4F6] hover:bg-surface-2 text-left transition-colors cursor-pointer border-t border-line-soft"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="flex flex-col leading-tight"><span>Share on WhatsApp</span><span className="text-[12px] font-normal text-muted">Pick your class group</span></span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <h3 className="text-[20px] sm:text-[22px] font-bold text-[#FFFFFF] leading-[26px] mb-2 line-clamp-2 tracking-tight">
            {subjectName}
          </h3>

          {/* Time and Reschedule / Batch Badge */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="text-[13px] text-[#FFFFFF]/90 font-mono font-medium leading-none">
              {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
            </div>
            {isRescheduled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Clock className="w-2.5 h-2.5" />
                Rescheduled
                {rescheduleMeta?.originalStartTime ? ` (Was ${formatTime12Hour(rescheduleMeta.originalStartTime)})` : ''}
              </span>
            )}
            {session.isLab && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-[#18A889]/20 text-[#18A889] text-[12px] font-mono font-bold ">
                Lab
              </span>
            )}
            <span className="px-2 py-0.5 rounded-none bg-white/10 text-[11px] font-mono font-bold uppercase tracking-wider text-white/80">
              {pillLabel}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-[12px] text-[#6B6B6B] leading-none mb-5 flex-wrap">
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] leading-none opacity-80">◉</span>
              {session.room ? (session.room.toLowerCase().startsWith('room') ? session.room : `Room ${session.room}`) : 'Room TBA'}
            </span>
            {subjectCode && (
              <>
                <span className="opacity-40 shrink-0">·</span>
                <span className="truncate">{subjectCode}</span>
              </>
            )}
          </div>

          {/* Progress Bar (3px) */}
          <div className="w-full bg-[#3A3A3A] h-[3px] overflow-hidden rounded-full">
            <div
              className="bg-[#18A889] h-full transition-all duration-1000"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* The one thing a faculty does mid-lecture: straight into marking */}
          {!isCancelled && (
            <button
              type="button"
              onClick={() => {
                setActiveView('attendance');
                const detail = { batchKey: batch.batchKey, subjectName, startTime: session.startTime, endTime: session.endTime };
                setTimeout(() => window.dispatchEvent(new CustomEvent('attendance:take', { detail })), 60);
              }}
              className="mt-f4 h-11 w-full inline-flex items-center justify-center gap-2 bg-white text-[#111111] text-[14px] font-semibold rounded-none hover:opacity-90 active:scale-[0.99] transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Take attendance
            </button>
          )}
        </div>

        <FacultyRescheduleModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          aggregatedSession={activeSession}
          onSuccess={onRefresh}
        />
      </>
    );
  }

  // Next / Upcoming Class -> Exactly matches student theme with pro graphic designer polish
  const formatCountdown = (minutes: number) => {
    if (minutes <= 0) return 'Starting now';
    if (minutes < 60) return `Starts in ${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `Starts in ${hrs}h`;
    return `Starts in ${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const startsSoon = !isCancelled && minutesUntilStart <= 15;
  const durationMins = Math.max(0, timeToMinutes(session.endTime) - timeToMinutes(session.startTime));
  const durationLabel =
    durationMins >= 60 ? `${Math.floor(durationMins / 60)}h${durationMins % 60 ? ` ${durationMins % 60}m` : ''}` : `${durationMins}m`;
  const roomLabel = session.room ? session.room.replace(/^room\s*/i, '') : 'TBA';
  const eyebrow = isCancelled ? 'Cancelled today' : isRescheduled ? 'Rescheduled' : session.isLab ? 'Next lab' : 'Next lecture';
  const countdown = isCancelled ? 'Students notified' : formatCountdown(minutesUntilStart);

  return (
    <>
      <div
        className={clsx(
          'w-full text-left relative border border-[color:var(--card-line)] shadow-[var(--elev-2)]',
          menuOpen ? 'overflow-visible z-30' : 'overflow-hidden z-0'
        )}
        style={
          {
            '--card-accent': theme.accent,
            '--card-accent-dark': theme.darkAccent || theme.accent,
            '--card-line': `${theme.accent}33`,
          } as React.CSSProperties
        }
      >
        {/* Subject colour: solid pastel in light, a soft tinted gradient in dark */}
        <div className="dark:hidden absolute inset-0 pointer-events-none" style={{ backgroundColor: theme.bg }} aria-hidden="true" />
        <div
          className="hidden dark:block absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${theme.accent}2E 0%, ${theme.accent}12 100%), #13151D` }}
          aria-hidden="true"
        />
        <div className="relative">
        {/* Top: status + countdown */}
        <div className="flex items-center justify-between gap-3 px-f4 pt-f4">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[color:var(--card-accent)] dark:text-[color:var(--card-accent-dark)]">
            <span className="relative flex w-2 h-2" aria-hidden="true">
              {startsSoon && <span className="absolute inset-0 rounded-full bg-current opacity-40 animate-ping" />}
              <span className="relative w-2 h-2 rounded-full bg-current" />
            </span>
            {eyebrow}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={clsx(
                'tag tabular-nums',
                startsSoon
                  ? 'bg-[color:var(--card-accent)] dark:bg-[color:var(--card-accent-dark)] text-white dark:text-[#0A0B0F] border-transparent'
                  : 'bg-white/70 dark:bg-white/[0.06] text-[color:var(--card-accent)] dark:text-[color:var(--card-accent-dark)] border-[color:var(--card-line)]'
              )}
            >
              {countdown}
            </span>
            {/* 3-Dots Action Menu */}
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="btn btn-ghost btn-sm btn-icon -mr-2"
                title="Lecture actions" aria-label="Lecture actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                    />
                    <div
                      className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-line rounded-none shadow-xl py-1.5 z-40 text-left font-sans flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-1 text-[12px] font-mono text-muted border-b border-line-soft mb-1 flex items-center gap-1.5">
                        <span>🎓</span>
                        <span>Faculty Actions</span>
                      </div>

                      {/* Reschedule / Revert Actions */}
                      {isRescheduled ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            setMenuOpen(false);
                            handleRevertReschedule();
                          }}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Revert Schedule</span>
                        </button>
                      ) : (
                        !isCancelled && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setMenuOpen(false);
                              setIsRescheduleModalOpen(true);
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-fg hover:bg-surface-2 text-left transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>Reschedule Class</span>
                          </button>
                        )
                      )}

                      {/* Cancel / Restore Actions */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => {
                          setMenuOpen(false);
                          handleToggleCancel();
                        }}
                        className={clsx(
                          "flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-left transition-colors cursor-pointer",
                          isCancelled
                            ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        )}
                      >
                        {isCancelled ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span>Restore Lecture</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Cancel Today</span>
                          </>
                        )}
                      </button>

                      {/* WhatsApp Notice */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handleShareWhatsAppNotice();
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-semibold text-slate-800 dark:text-[#F4F4F6] hover:bg-surface-2 text-left transition-colors cursor-pointer border-t border-line-soft"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="flex flex-col leading-tight"><span>Share on WhatsApp</span><span className="text-[12px] font-normal text-muted">Pick your class group</span></span>
                      </button>
                    </div>
                  </>
                )}
              </div>
          </div>
        </div>

        {/* Subject */}
        <div className="px-f4 pt-f3">
          <h3 className={clsx('text-[24px] leading-[1.15] font-semibold tracking-tight text-fg line-clamp-2', isCancelled && 'line-through decoration-1 text-muted')}>
            {subjectName}
          </h3>
          {isRescheduled && rescheduleMeta?.originalStartTime && (
            <p className="mt-f2 text-[13px] text-fg-2">
              Moved from {formatTime12Hour(rescheduleMeta.originalStartTime)} – {formatTime12Hour(rescheduleMeta.originalEndTime)}
              {rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
            </p>
          )}
        </div>

        {/* Facts: time, room, code */}
        <dl className="mt-f4 grid grid-cols-3 border-t border-[color:var(--card-line)] divide-x divide-[color:var(--card-line)]">
          <div className="pl-f4 pr-f3 py-f3 min-w-0">
            <dt className="text-[12px] text-muted whitespace-nowrap">Time · {durationLabel}</dt>
            <dd className="mt-1 text-[15px] font-semibold text-fg tabular-nums whitespace-nowrap">{formatTime12Hour(session.startTime)}</dd>
          </div>
          <div className="px-f3 py-f3 min-w-0">
            <dt className="text-[12px] text-muted">Room</dt>
            <dd className="mt-1 text-[15px] font-semibold text-fg truncate">{roomLabel}</dd>
          </div>
          <div className="px-f3 py-f3 min-w-0">
            <dt className="text-[12px] text-muted">{subjectCode ? 'Code' : 'Ends'}</dt>
            <dd className="mt-1 text-[15px] font-semibold text-fg truncate tabular-nums">
              {subjectCode || formatTime12Hour(session.endTime)}
            </dd>
          </div>
        </dl>
        </div>
      </div>

      <FacultyRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        aggregatedSession={activeSession}
        onSuccess={onRefresh}
      />
    </>
  );
};
