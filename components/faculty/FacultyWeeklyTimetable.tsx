'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString } from '@/lib/timetableUtils';
import { aggregateFacultyWeeklyTimetable, AggregatedFacultySession } from '@/lib/facultyUtils';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { broadcastBatchPushNotification } from '@/lib/pushNotifications';
import { shareLink } from '@/lib/shareUtils';
import { ConnectBatchModal } from './ConnectBatchModal';
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
  CheckCircle,
  Sparkles,
} from 'lucide-react';

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
      const bRef = doc(db, 'shared_timetables', batch.batchKey);
      const cancelKey = `${todayStr}_${session.id}`;

      const snap = await getDoc(bRef);
      const currentCancelled: string[] = snap.exists() ? snap.data().cancelledSessions || [] : [];
      const currentMeta: Record<string, any> = snap.exists() ? snap.data().cancelledSessionsMeta || {} : {};

      const updatedCancelled = Array.from(new Set([...currentCancelled, cancelKey]));
      const updatedMeta = {
        ...currentMeta,
        [cancelKey]: {
          by: profile.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty',
          role: 'faculty',
          reason: cancelReason.trim() || 'Class cancelled by Faculty',
          timestamp: new Date().toISOString(),
        },
      };

      await setDoc(
        bRef,
        {
          cancelledSessions: updatedCancelled,
          cancelledSessionsMeta: updatedMeta,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Instant push notification to enrolled batch students
      try {
        await broadcastBatchPushNotification({
          batchKey: batch.batchKey,
          title: `Class Cancelled: ${subjectName}`,
          body: `${profile.facultyTitle || 'Prof.'} ${profile.name || 'Faculty'} has cancelled ${subjectName} class scheduled today (${session.startTime} - ${session.endTime}).`,
          type: 'class_cancelled',
          senderId: user?.id,
          senderName: profile.name || 'Faculty',
        });
      } catch (pushErr) {
        console.warn('Push broadcast error:', pushErr);
      }

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

  const handleShareWhatsAppNotice = (agg: AggregatedFacultySession) => {
    const { session, batch, subjectName, isCancelled } = agg;
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
      <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] font-bold uppercase tracking-widest">
                FACULTY SCHEDULE
              </span>
              <span className="text-xs font-mono text-black/50 dark:text-white/50">
                {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white">
              Teaching Timetable
            </h2>
            <p className="text-xs text-black/60 dark:text-white/60">
              Filtered exclusively to the subjects and sections you teach.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsConnectBatchOpen(true)}
            className="px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Another Batch</span>
          </button>
        </div>

        {/* Batch Filter Pills (if multiple batches) */}
        {linkedBatches.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-black/10 dark:border-white/10 scrollbar-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50 shrink-0">
              Filter Batch:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBatchKey('ALL')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
                selectedBatchKey === 'ALL'
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
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
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 truncate max-w-[240px] ${
                  selectedBatchKey === b.batchKey
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                    : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                }`}
              >
                {b.batchName.split('·').pop()?.trim() || b.batchName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Schedule Card */}
      {linkedBatches.length === 0 ? (
        <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-8 text-center flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-10 h-10 opacity-30 text-black dark:text-white" />
          <h3 className="text-base font-bold uppercase text-black dark:text-white">
            No Batches Connected Yet
          </h3>
          <p className="text-xs text-black/60 dark:text-white/60 max-w-md">
            Enter your 6-digit batch code and pick the subjects you teach. Your teaching schedule will automatically sync here.
          </p>
          <button
            type="button"
            onClick={() => setIsConnectBatchOpen(true)}
            className="mt-2 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer"
          >
            Enter Batch Code
          </button>
        </div>
      ) : (
        <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-5 flex flex-col gap-5">
          {/* Day Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-black/70 dark:text-white/70" />
              <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                {selectedDay} Schedule
              </span>
              <span className="text-xs font-mono text-black/40 dark:text-white/40">
                ({sessionsForDay.length} {sessionsForDay.length === 1 ? 'lecture' : 'lectures'})
              </span>
            </div>

            {/* Day Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
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
          <div className="flex flex-col gap-3">
            {sessionsForDay.length === 0 ? (
              <div className="py-12 text-center text-xs text-black/40 dark:text-white/40 flex flex-col items-center justify-center gap-2">
                <BookOpen className="w-8 h-8 opacity-25" />
                <span>No lectures scheduled on {selectedDay} for your selected subjects.</span>
              </div>
            ) : (
              sessionsForDay.map((agg) => {
                const { session, batch, subjectName, subjectCode, isCancelled, isLive, isUpcoming } = agg;

                return (
                  <div
                    key={`${session.id}_${batch.id}`}
                    className={`p-4 border transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                      isCancelled
                        ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                        : isLive
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700/60 shadow-sm'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    {/* Left Info */}
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Time Block */}
                      <div className="flex flex-col items-center justify-center min-w-[85px] py-2 px-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0 text-center">
                        <span className="text-sm font-mono font-black text-black dark:text-white">
                          {session.startTime}
                        </span>
                        <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                          {session.endTime}
                        </span>
                      </div>

                      {/* Subject & Details */}
                      <div className="flex flex-col min-w-0 gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-black dark:text-white truncate">
                            {subjectName}
                          </h4>
                          {isLive && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9.5px] font-mono font-bold uppercase tracking-wider animate-pulse">
                              LIVE NOW
                            </span>
                          )}
                          {isCancelled && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-[9.5px] font-mono font-bold uppercase tracking-wider">
                              CANCELLED TODAY
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-black/70 dark:text-white/70 font-mono flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-black dark:text-white">
                            <Users className="w-3.5 h-3.5 opacity-60" />
                            {batch.batchName}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 opacity-60" />
                            {session.room || 'Room TBA'}
                          </span>
                          {subjectCode && (
                            <>
                              <span>·</span>
                              <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/5 text-[10.5px]">
                                {subjectCode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5 w-full md:w-auto justify-end">
                      {/* Share WhatsApp Notice */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsAppNotice(agg)}
                        className="px-3 py-1.5 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Share Notice to WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Cancel Class Action */}
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => setSessionToCancel(agg)}
                          className="px-3 py-1.5 border border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-700 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Class</span>
                        </button>
                      )}
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
          <div className="bg-white dark:bg-[#121317] border border-black dark:border-white max-w-md w-full p-6 flex flex-col gap-4 text-left shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">
                Cancel Class Today?
              </h3>
            </div>

            <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed">
              This will officially mark <strong>{sessionToCancel.subjectName}</strong> at{' '}
              <strong>{sessionToCancel.session.startTime}</strong> for{' '}
              <strong>{sessionToCancel.batch.batchName}</strong> as cancelled for today.
              Enrolled students will receive an instant notification.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                Reason / Note (Optional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Unavoidable meeting / Sick leave"
                className="w-full px-3 py-2 border border-black/20 dark:border-white/20 bg-transparent text-xs font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToCancel(null)}
                disabled={isCancelling}
                className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase text-black/70 dark:text-white/70 hover:border-black dark:hover:border-white cursor-pointer"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelClass}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
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
