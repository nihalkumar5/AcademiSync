'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { AggregatedFacultySession, rescheduleFacultyClass } from '@/lib/facultyUtils';
import { getTodayDateString } from '@/lib/timetableUtils';
import { Clock, MapPin, Users, AlertCircle, Sparkles } from 'lucide-react';

interface FacultyRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregatedSession: AggregatedFacultySession | null;
  onSuccess?: () => void;
}

export const FacultyRescheduleModal: React.FC<FacultyRescheduleModalProps> = ({
  isOpen,
  onClose,
  aggregatedSession,
  onSuccess,
}) => {
  const { profile, user, showToast } = useApp();

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (aggregatedSession) {
      setStartTime(aggregatedSession.session.startTime || '09:00');
      setEndTime(aggregatedSession.session.endTime || '10:00');
      setRoom(aggregatedSession.session.room || '');
      setReason(aggregatedSession.rescheduleMeta?.reason || '');
    }
  }, [aggregatedSession]);

  if (!isOpen || !aggregatedSession) return null;

  const { session, batch, subjectName, subjectCode } = aggregatedSession;
  const todayStr = getTodayDateString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      showToast('Time Required', 'Please provide start and end time.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await rescheduleFacultyClass({
        batchKey: batch.batchKey,
        sessionId: session.id,
        subjectName,
        batchName: batch.batchName,
        facultyName: profile.name || 'Faculty',
        facultyTitle: profile.facultyTitle || 'Prof.',
        userId: user?.id,
        dateStr: todayStr,
        newStartTime: startTime,
        newEndTime: endTime,
        newRoom: room.trim() || undefined,
        reason: reason.trim() || undefined,
      });

      showToast(
        'Lecture Rescheduled',
        `${subjectName} moved to ${startTime}–${endTime}. Batch students notified.`,
        'success'
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to reschedule:', err);
      showToast('Reschedule Failed', err.message || 'Failed to reschedule lecture.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121317] border border-black dark:border-white max-w-md w-full p-6 flex flex-col gap-5 text-left shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-black dark:text-white" />
            <h3 className="text-base font-black uppercase tracking-tight text-black dark:text-white">
              Reschedule Lecture
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">
            TODAY ONLY
          </span>
        </div>

        {/* Current Details Banner */}
        <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-black dark:text-white">
              {subjectName}
            </span>
            <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
              {subjectCode}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60 font-mono flex-wrap">
            <span className="flex items-center gap-1 font-bold text-black/80 dark:text-white/80">
              <Users className="w-3 h-3 opacity-60" />
              {batch.batchName}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              Original: {session.startTime} - {session.endTime}
            </span>
            {session.room && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 opacity-60" />
                  {session.room}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                New Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="px-3 py-2 border border-black/20 dark:border-white/20 bg-transparent text-sm font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                New End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="px-3 py-2 border border-black/20 dark:border-white/20 bg-transparent text-sm font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
              New Room / Lab (Optional)
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. LT-102, Lab-3"
              className="px-3 py-2 border border-black/20 dark:border-white/20 bg-transparent text-sm font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
              Reason / Message for Students (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Moved slot due to lab conflict"
              className="px-3 py-2 border border-black/20 dark:border-white/20 bg-transparent text-xs font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase text-black/70 dark:text-white/70 hover:border-black dark:hover:border-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Rescheduling...' : 'Save & Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
