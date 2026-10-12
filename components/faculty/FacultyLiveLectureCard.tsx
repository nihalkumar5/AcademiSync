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
} from 'lucide-react';
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
  const { profile, user, showToast } = useApp();
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
      <div className="w-full bg-[#FAFAFA] dark:bg-[#121317] border border-[#E0E0E0] dark:border-white/[0.08] rounded-none p-5 flex flex-col text-left">
        <span className="text-[11px] font-semibold text-[#808080] dark:text-[#94A3B8] uppercase tracking-[1.4px] leading-none mb-3">
          SCHEDULE COMPLETE
        </span>
        <h3 className="text-[16px] font-semibold text-[#111111] dark:text-[#F4F4F6] leading-snug mb-2">
          You&apos;re done for today.
        </h3>
        <span className="text-[13px] text-[#6B6B6B] dark:text-[#94A3B8] leading-none">
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
      `Synced via AcademiSync.`,
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
              <span className="text-[11px] font-bold text-[#18A889] uppercase tracking-[1.4px] leading-none">
                LIVE NOW
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
                  className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Class Options"
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
                      className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#18191E] border border-black/10 dark:border-white/[0.1] shadow-[0_12px_36px_rgba(0,0,0,0.22)] py-1.5 z-50 text-left overflow-hidden rounded-[10px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3.5 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.08] text-[9.5px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-[#A1A1AA] flex items-center gap-1.5">
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
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
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
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
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
                          "flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-left transition-colors cursor-pointer",
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
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-slate-800 dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer border-t border-black/5 dark:border-white/5"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp Notice</span>
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
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
                <Clock className="w-2.5 h-2.5" />
                Rescheduled
                {rescheduleMeta?.originalStartTime ? ` (Was ${formatTime12Hour(rescheduleMeta.originalStartTime)})` : ''}
              </span>
            )}
            {session.isLab && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-[#18A889]/20 text-[#18A889] text-[10.5px] font-mono font-bold uppercase tracking-wider">
                Lab
              </span>
            )}
            <span className="px-2 py-0.5 rounded-[2px] bg-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-white/80">
              {pillLabel}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-[12px] text-[#A8A8A8] leading-none mb-5 flex-wrap">
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] leading-none opacity-80">◉</span>
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

  return (
    <>
      <div
        className={clsx(
          "w-full border shadow-xs rounded-[12px] p-5 flex flex-col relative group transition-all text-left",
          menuOpen ? "overflow-visible z-30" : "overflow-hidden z-0",
          isCancelled
            ? "border-rose-200 dark:border-rose-900/40"
            : isRescheduled
            ? "border-amber-200 dark:border-amber-900/40"
            : "border-black/[0.06] dark:border-[color:var(--card-accent-border)]"
        )}
        style={{
          ['--card-accent-border' as any]: `${theme.accent}45`,
        }}
      >
        {/* Pastel backgrounds: Light mode solid pastel, Dark mode subtle 16% gradient */}
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

        <div className="relative z-10 flex flex-col">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none shrink-0"
                style={{ color: theme.accent }}
              >
                {isCancelled
                  ? 'CANCELLED TODAY'
                  : isRescheduled
                  ? 'RESCHEDULED'
                  : session.isLab
                  ? 'NEXT LAB'
                  : 'NEXT LECTURE'}
              </span>

              {session.isLab && (
                <span
                  className="text-[9.5px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-[2px] bg-black/5 dark:bg-white/10 shrink-0"
                  style={{ color: theme.accent }}
                >
                  LAB
                </span>
              )}

              <span className="px-2 py-0.5 rounded-[3px] bg-black/5 dark:bg-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 whitespace-nowrap">
                {pillLabel}
              </span>
            </div>

            {/* 3-Dots Action Menu */}
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="p-1 rounded-[2px] text-slate-500 hover:text-slate-900 dark:text-[#CBD5E1] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Lecture actions"
              >
                <MoreHorizontal className="w-4 h-4" />
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
                      className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#16171D] border border-black/10 dark:border-white/10 rounded-[4px] shadow-xl py-1.5 z-40 text-left font-sans flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 border-b border-black/5 dark:border-white/5 mb-1 flex items-center gap-1.5">
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
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-colors cursor-pointer"
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
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
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
                          "flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-left transition-colors cursor-pointer",
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
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-slate-800 dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer border-t border-black/5 dark:border-white/5"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp Notice</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          {/* Subject Title */}
          <h3 className="text-[19px] sm:text-[21px] font-bold text-[#151515] dark:text-[#F4F4F6] leading-[26px] mb-2 pr-4 tracking-tight line-clamp-2">
            {subjectName}
          </h3>

          {/* Rescheduled Pill */}
          {isRescheduled && rescheduleMeta?.originalStartTime && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10.5px] font-mono font-medium mb-3 self-start">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                Rescheduled from {formatTime12Hour(rescheduleMeta.originalStartTime)} – {formatTime12Hour(rescheduleMeta.originalEndTime)}
                {rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
              </span>
            </div>
          )}

          {/* Details Row */}
          <div className="flex items-center gap-2 text-[12px] text-black/60 dark:text-[#A1A1AA] font-mono leading-none mb-4 flex-wrap">
            <span className="flex items-center gap-1.5 shrink-0 text-black/80 dark:text-white/90 font-medium">
              <span className="text-[10px] leading-none opacity-80">◉</span>
              {session.room ? (session.room.toLowerCase().startsWith('room') ? session.room : `Room ${session.room}`) : 'Room TBA'}
            </span>
            {subjectCode && (
              <>
                <span className="opacity-40 shrink-0">·</span>
                <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded-[3px] text-[10.5px] font-mono font-medium">
                  {subjectCode}
                </span>
              </>
            )}
            <span className="opacity-40 shrink-0">·</span>
            <span>
              {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
            </span>
          </div>

          {/* Footer Anchor */}
          <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.08] pt-3.5 mt-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isCancelled ? '#E11D48' : theme.accent }}
              />
              <span
                className="text-[12.5px] font-bold font-mono tracking-tight leading-none"
                style={{ color: isCancelled ? '#E11D48' : theme.accent }}
              >
                {isCancelled ? 'Cancelled for today' : formatCountdown(minutesUntilStart)}
              </span>
            </div>
            <div
              style={{ color: isCancelled ? '#E11D48' : theme.accent }}
              className="flex items-center gap-1 text-[11px] font-mono font-medium opacity-70 group-hover:opacity-100 transition-opacity"
            >
              <span>{isCancelled ? 'Notice Sent' : 'Upcoming'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
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
