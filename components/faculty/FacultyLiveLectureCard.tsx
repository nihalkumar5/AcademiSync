'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString } from '@/lib/timetableUtils';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { broadcastBatchPushNotification } from '@/lib/pushNotifications';
import { shareLink } from '@/lib/shareUtils';
import {
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  Share2,
  XCircle,
  ArrowRight,
  BookOpen,
  Calendar,
} from 'lucide-react';

export interface AggregatedFacultySession {
  session: ClassSession;
  batch: FacultyLinkedBatch;
  subjectName: string;
  subjectCode: string;
  isCancelled: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  minutesUntilStart: number;
}

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

  const { session, batch, subjectName, subjectCode, isCancelled, isLive, minutesUntilStart } = activeSession;
  const facultyName = `${profile.facultyTitle || 'Prof.'} ${profile.name || 'Faculty'}`;

  const handleToggleCancel = async () => {
    setIsProcessing(true);
    try {
      const batchRef = doc(db, 'shared_timetables', batch.batchKey);
      const batchSnap = await getDoc(batchRef);
      if (!batchSnap.exists()) {
        showToast('Error', 'Batch document not found in database.', 'error');
        setIsProcessing(false);
        return;
      }

      const bData = batchSnap.data();
      const existingCancelled: string[] = Array.isArray(bData.cancelledSessions) ? bData.cancelledSessions : [];
      const cancelKey = `${todayStr}_${session.id}`;

      let updatedCancelled: string[];
      let actionType: 'cancel' | 'restore';

      if (existingCancelled.includes(cancelKey)) {
        updatedCancelled = existingCancelled.filter((k) => k !== cancelKey);
        actionType = 'restore';
      } else {
        updatedCancelled = [...existingCancelled, cancelKey];
        actionType = 'cancel';
      }

      const alertPayload = {
        id: `fac_${actionType}_${session.id}_${Date.now()}`,
        title: actionType === 'cancel' ? '🚫 Lecture Cancelled by Faculty' : '✅ Lecture Restored by Faculty',
        body: `${subjectName} (${batch.batchName}) is ${actionType === 'cancel' ? 'CANCELLED' : 'BACK ON SCHEDULE'} today by ${facultyName}`,
        type: actionType,
        sessionId: session.id,
        date: todayStr,
        by: facultyName,
        createdAt: new Date().toISOString(),
      };

      const existingAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];
      const trimmedAlerts = [...existingAlerts.slice(-19), alertPayload];

      await setDoc(
        batchRef,
        {
          cancelledSessions: updatedCancelled,
          batchAlerts: trimmedAlerts,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Trigger push notification to batch students
      broadcastBatchPushNotification({
        batchKey: batch.batchKey,
        title: alertPayload.title,
        body: alertPayload.body,
        type: alertPayload.type,
        senderId: user?.id,
        senderName: facultyName,
      });

      showToast(
        actionType === 'cancel' ? 'Lecture Cancelled' : 'Lecture Restored',
        `${subjectName} updated for ${batch.batchName}. Notification broadcast to batch.`,
        actionType === 'cancel' ? 'info' : 'success'
      );

      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error updating lecture status:', err);
      showToast('Update Failed', 'Could not update lecture status on server.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareWhatsAppNotice = () => {
    const statusText = isCancelled ? '🚫 CANCELLED FOR TODAY' : '🕒 REGULAR CLASS ON SCHEDULE';
    const message = [
      `📢 *Official Class Announcement*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Subject:* ${subjectName} (${subjectCode || 'Class'})`,
      `*Batch:* ${batch.batchName}`,
      `*Time:* ${session.startTime} - ${session.endTime}`,
      `*Room:* ${session.room || 'TBA'}`,
      `*Status:* ${statusText}`,
      `━━━━━━━━━━━━━━━━━━`,
      `— *${facultyName}*`,
      `_Updated via AcademiSync_`,
    ].join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div
      className={`border text-left p-5 flex flex-col gap-4 relative transition-colors ${
        isCancelled
          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900/50'
          : isLive
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/40 dark:border-emerald-500/30'
          : 'bg-white dark:bg-[#121317] border-black/15 dark:border-white/[0.08]'
      }`}
    >
      {/* Top Banner: Status + Batch Pill */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isCancelled ? (
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              CANCELLED TODAY
            </span>
          ) : isLive ? (
            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE NOW
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white text-[10px] font-bold uppercase tracking-wider">
              NEXT UP {minutesUntilStart > 0 ? `· IN ${minutesUntilStart}m` : ''}
            </span>
          )}

          <span className="text-[11px] font-mono text-black/60 dark:text-white/60">
            {session.startTime} - {session.endTime}
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
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/10 dark:border-white/10 flex-wrap">
        <div className="flex items-center gap-2">
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
    </div>
  );
};
