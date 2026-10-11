'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString, formatTime12Hour } from '@/lib/timetableUtils';
import {
  AggregatedFacultySession,
  revertFacultyReschedule,
  cancelOrRestoreFacultyClass,
  formatFacultyBatchDegreeAndBranch,
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
} from 'lucide-react';
import { clsx } from 'clsx';

export type { AggregatedFacultySession };

interface FacultyLiveLectureCardProps {
  aggregatedSessions: AggregatedFacultySession[];
  onRefresh?: () => void;
}

export const FacultyLiveLectureCard: React.FC<FacultyLiveLectureCardProps> = ({
  aggregatedSessions,
  onRefresh,
}) => {
  const { profile, user, showToast } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const todayStr = getTodayDateString();

  const activeSession =
    aggregatedSessions.find((s) => s.isLive) ||
    aggregatedSessions.find((s) => s.isUpcoming) ||
    null;

  if (!profile.facultyLinkedBatches || profile.facultyLinkedBatches.length === 0) {
    return null;
  }

  if (!activeSession) {
    return (
      <div className="w-full border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#13151D] rounded-[12px] p-5 text-left shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                No More Lectures Today
              </span>
              <span className="text-[12px] text-[#6F6F6F] dark:text-[#A1A1AA]">
                All scheduled lectures completed or free day.
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#8A8A8A] dark:text-[#71717A] px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-full">
            {aggregatedSessions.length} total classes today
          </span>
        </div>
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
      await cancelOrRestoreFacultyClass({
        batchKey: batch.batchKey,
        sessionId: session.id,
        subjectName,
        batchName: batch.batchName,
        facultyName: profile.name || 'Faculty',
        facultyTitle: profile.facultyTitle || 'Prof.',
        userId: user?.id,
        dateStr: todayStr,
        action,
      });

      showToast(
        action === 'cancel' ? 'Lecture Cancelled' : 'Lecture Restored',
        `${subjectName} updated for ${batch.batchName}. Notification broadcast to batch.`,
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

    const batchLabel = formatFacultyBatchDegreeAndBranch(batch).fullLabel;
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

  // If class is LIVE RIGHT NOW -> Sleek High-Contrast Dark Card with Emerald Pulse (exact student live class style)
  if (isLive) {
    return (
      <>
        <div className="w-full bg-[#111111] dark:bg-[#111111] border-2 border-[#18A889] rounded-[12px] p-5 sm:p-6 flex flex-col relative group shadow-[0_0_24px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30 text-white text-left">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18A889] animate-pulse" />
              <span className="text-[11px] font-bold text-[#18A889] uppercase tracking-[1.4px] leading-none">
                LIVE NOW
              </span>
              {session.isLab && (
                <span className="text-[9.5px] font-bold tracking-widest px-1.5 py-0.5 uppercase bg-blue-500/20 text-blue-400 rounded-[3px]">
                  LAB
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold font-mono text-white/90">
                {formatTime12Hour(session.startTime)} - {formatTime12Hour(session.endTime)}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10.5px] font-bold text-white/80 uppercase tracking-wider">
                {formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch}
              </span>
            </div>
          </div>

          {/* Subject Title */}
          <h3 className="text-[22px] sm:text-[24px] font-bold text-white leading-[28px] mb-2 pr-4 tracking-tight">
            {subjectName}
          </h3>

          {/* Meta Details */}
          <div className="flex items-center gap-3 text-[13px] text-white/70 font-mono mb-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-white/90 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#18A889]" />
              {session.room || 'Room TBA'}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-white/80">
              <Users className="w-3.5 h-3.5 opacity-70" />
              {formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch}
              {formatFacultyBatchDegreeAndBranch(batch).semText ? ` · ${formatFacultyBatchDegreeAndBranch(batch).semText}` : ''}
            </span>
            {subjectCode && (
              <>
                <span>·</span>
                <span className="px-1.5 py-0.5 bg-white/10 rounded-[3px] text-[11px]">
                  {subjectCode}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleShareWhatsAppNotice}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Notice</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsRescheduleModalOpen(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Reschedule</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleToggleCancel}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Class</span>
              </button>
            </div>

            <span className="text-[11px] text-white/50 font-mono">
              Synced with batch
            </span>
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

  // Next / Upcoming Class -> Exactly matches student theme (creamy pastel light, rich gradient dark)
  return (
    <>
      <div
        className={clsx(
          "w-full border shadow-xs rounded-[12px] p-5 sm:p-6 flex flex-col relative group transition-all overflow-hidden text-left",
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none"
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

              {minutesUntilStart > 0 && !isCancelled && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">
                  in {minutesUntilStart}m
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-[#151515] dark:text-[#F4F4F6] font-mono leading-none">
                {formatTime12Hour(session.startTime)} - {formatTime12Hour(session.endTime)}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                {formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch}
              </span>
            </div>
          </div>

          {/* Subject Title */}
          <h3 className="text-[20px] sm:text-[22px] font-bold text-[#151515] dark:text-[#F4F4F6] leading-[26px] mb-2 pr-4 tracking-tight">
            {subjectName}
          </h3>

          {/* Rescheduled Pill */}
          {isRescheduled && rescheduleMeta?.originalStartTime && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-mono font-medium mb-3 self-start">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Rescheduled from {formatTime12Hour(rescheduleMeta.originalStartTime)} - {formatTime12Hour(rescheduleMeta.originalEndTime)}
                {rescheduleMeta.reason ? ` · ${rescheduleMeta.reason}` : ''}
              </span>
            </div>
          )}

          {/* Details Row */}
          <div className="flex items-center gap-3 text-[12px] text-black/60 dark:text-[#A1A1AA] font-mono mb-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-black/80 dark:text-white/90 font-medium">
              <MapPin className="w-3.5 h-3.5 opacity-70" />
              {session.room || 'Room TBA'}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 opacity-60" />
              {formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch}
              {formatFacultyBatchDegreeAndBranch(batch).semText ? ` · ${formatFacultyBatchDegreeAndBranch(batch).semText}` : ''}
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

          {/* Actions Row */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/5 dark:border-white/5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* WhatsApp Notice */}
              <button
                type="button"
                onClick={handleShareWhatsAppNotice}
                className="px-3 py-1.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-black dark:text-white rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Notice</span>
              </button>

              {/* Reschedule / Revert Actions */}
              {isRescheduled ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRevertReschedule}
                  className="px-3 py-1.5 bg-amber-500 text-black hover:bg-amber-600 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert Schedule</span>
                </button>
              ) : (
                !isCancelled && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setIsRescheduleModalOpen(true)}
                    className="px-3 py-1.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-black dark:text-white rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Reschedule</span>
                  </button>
                )
              )}

              {/* Cancel / Restore Actions */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleToggleCancel}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs border ${
                  isCancelled
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/60 hover:bg-rose-600 hover:text-white'
                }`}
              >
                {isCancelled ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Lecture</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Today</span>
                  </>
                )}
              </button>
            </div>

            <span className="text-[11px] text-[#6F6F6F] dark:text-[#A1A1AA] font-mono">
              Syncs to {batch.batchName.split('·').pop()?.trim() || 'batch'}
            </span>
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
