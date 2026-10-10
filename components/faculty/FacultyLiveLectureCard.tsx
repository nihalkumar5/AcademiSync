'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString } from '@/lib/timetableUtils';
import {
  AggregatedFacultySession,
  revertFacultyReschedule,
  cancelOrRestoreFacultyClass,
} from '@/lib/facultyUtils';
import { FacultyRescheduleModal } from './FacultyRescheduleModal';
import {
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  Share2,
  XCircle,
  RotateCcw,
  BookOpen,
  Calendar,
} from 'lucide-react';

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

  // Pick the active or next upcoming session
  const activeSession =
    aggregatedSessions.find((s) => s.isLive) ||
    aggregatedSessions.find((s) => s.isUpcoming) ||
    null;

  if (!profile.facultyLinkedBatches || profile.facultyLinkedBatches.length === 0) {
    return null; // Empty state handled by BatchesCard
  }

  if (!activeSession) {
    return (
      <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              No More Lectures Today
            </span>
          </div>
          <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
            {aggregatedSessions.length} total classes completed or none scheduled
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

    const message = [
      `📢 *Official Class Announcement*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Subject:* ${subjectName} (${subjectCode || 'Class'})`,
      `*Batch:* ${batch.batchName}`,
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

  return (
    <div
      className={`border transition-all p-5 sm:p-6 text-left flex flex-col gap-4 ${
        isCancelled
          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900/50'
          : isRescheduled
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs'
          : isLive
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700/60 shadow-xs'
          : 'bg-white dark:bg-[#121317] border-black/10 dark:border-white/[0.08]'
      }`}
    >
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isLive ? (
            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE RIGHT NOW
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white text-[10px] font-bold uppercase tracking-wider">
              NEXT UP {minutesUntilStart > 0 ? `· IN ${minutesUntilStart}m` : ''}
            </span>
          )}

          {isRescheduled && (
            <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              RESCHEDULED TODAY
            </span>
          )}

          {isCancelled && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
              CANCELLED
            </span>
          )}

          <span className="text-[11px] font-mono text-black/60 dark:text-white/60">
            {session.startTime} - {session.endTime}
            {isRescheduled && rescheduleMeta?.originalStartTime && (
              <span className="line-through opacity-60 ml-1.5">
                ({rescheduleMeta.originalStartTime} - {rescheduleMeta.originalEndTime})
              </span>
            )}
          </span>
        </div>

        {/* Batch Badge */}
        <span className="px-2.5 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-black/80 dark:text-white/80 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {batch.batchName}
        </span>
      </div>

      {/* Main Details */}
      <div className="flex flex-col gap-1">
        <h3 className="text-[22px] font-bold text-black dark:text-white tracking-tight leading-tight">
          {subjectName}
        </h3>
        <div className="flex items-center gap-3 text-xs text-black/70 dark:text-white/70 font-mono mt-1 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
            {session.room || 'Room TBA'}
          </span>
          <span>·</span>
          <span>Code: {subjectCode || 'N/A'}</span>
          {session.isLab && (
            <>
              <span>·</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">LAB SESSION</span>
            </>
          )}
          {rescheduleMeta?.reason && (
            <>
              <span>·</span>
              <span className="text-amber-700 dark:text-amber-300">Note: {rescheduleMeta.reason}</span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/10 dark:border-white/10 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Reschedule / Revert Reschedule */}
          {isRescheduled ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRevertReschedule}
              className="px-3 py-1.5 border border-amber-600 bg-amber-500 text-black hover:bg-amber-600 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
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
                className="px-3 py-1.5 border border-black dark:border-white text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Reschedule Class</span>
              </button>
            )
          )}

          {/* 1-Click Cancel / Restore Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleToggleCancel}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
              isCancelled
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
            }`}
          >
            {isCancelled ? 'Restore Lecture' : 'Cancel Lecture Today'}
          </button>

          {/* Share to CR WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsAppNotice}
            className="px-3 py-1.5 border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>WhatsApp Notice</span>
          </button>
        </div>

        <span className="text-[10.5px] text-black/50 dark:text-white/50">
          Syncs real-time to {batch.batchName}
        </span>
      </div>

      {/* Reschedule Modal */}
      <FacultyRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        aggregatedSession={activeSession}
        onSuccess={onRefresh}
      />
    </div>
  );
};
