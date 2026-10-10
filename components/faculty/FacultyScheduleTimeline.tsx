'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString, formatTime12Hour } from '@/lib/timetableUtils';
import {
  AggregatedFacultySession,
  cancelOrRestoreFacultyClass,
  revertFacultyReschedule,
} from '@/lib/facultyUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { FacultyRescheduleModal } from './FacultyRescheduleModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  XCircle,
  Share2,
  BookOpen,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FacultyScheduleTimelineProps {
  allWeekSessions: Record<DayOfWeek, AggregatedFacultySession[]>;
  onRefresh?: () => void;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyScheduleTimeline: React.FC<FacultyScheduleTimelineProps> = ({
  allWeekSessions,
  onRefresh,
}) => {
  const { profile, user, showToast } = useApp();
  const currentDay = getCurrentDayOfWeek();
  const todayStr = getTodayDateString();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(currentDay || 'Monday');
  const [selectedBatchKey, setSelectedBatchKey] = useState<string>('ALL');
  const [sessionToReschedule, setSessionToReschedule] = useState<AggregatedFacultySession | null>(null);

  const uniqueBatches = React.useMemo(() => {
    const map = new Map<string, FacultyLinkedBatch>();
    Object.values(allWeekSessions).forEach((daySessions) => {
      daySessions.forEach((s) => {
        if (!map.has(s.batch.batchKey)) {
          map.set(s.batch.batchKey, s.batch);
        }
      });
    });
    return Array.from(map.values());
  }, [allWeekSessions]);

  const rawSessionsForDay = allWeekSessions[selectedDay] || [];
  const sessionsForDay = rawSessionsForDay.filter(
    (s) => selectedBatchKey === 'ALL' || s.batch.batchKey === selectedBatchKey
  );

  const handleToggleCancel = async (agg: AggregatedFacultySession) => {
    try {
      const { session, batch, subjectName, isCancelled } = agg;
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
        action === 'cancel' ? 'Class Cancelled' : 'Class Restored',
        `${subjectName} updated. Notification sent to batch.`,
        action === 'cancel' ? 'info' : 'success'
      );

      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error toggling cancel:', err);
      showToast('Error', err.message || 'Failed to update class status.', 'error');
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
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error reverting reschedule:', err);
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
        `Synced via AcademiSync.`;
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
    <div className="w-full bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] p-5 sm:p-6 text-left flex flex-col gap-5 shadow-xs">
      {/* Header & Day Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#111111] dark:text-white" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
            Teaching Schedule
          </h3>
          <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
            ({sessionsForDay.length} lectures)
          </span>
        </div>

        {/* Day Pills (matching student timetable rounded-full pills) */}
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
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-full border ${
                  isSelected
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                    : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                }`}
              >
                <span>{day.substring(0, 3)}</span>
                {count > 0 && (
                  <span className={`ml-1 text-[9.5px] font-mono ${isSelected ? 'opacity-85' : 'opacity-50'}`}>
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

      {/* Batch Filter Pills (if multiple batches connected) */}
      {uniqueBatches.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A1A1AA] mr-1 shrink-0">
            Batch:
          </span>
          <button
            type="button"
            onClick={() => setSelectedBatchKey('ALL')}
            className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-full border shrink-0 ${
              selectedBatchKey === 'ALL'
                ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
            }`}
          >
            All Batches
          </button>
          {uniqueBatches.map((b) => (
            <button
              key={b.batchKey}
              type="button"
              onClick={() => setSelectedBatchKey(b.batchKey)}
              className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-full border shrink-0 truncate max-w-[200px] ${
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

      {/* Sessions List */}
      <div className="flex flex-col gap-3">
        {sessionsForDay.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-2">
            <BookOpen className="w-6 h-6 opacity-30" />
            <span>No lectures scheduled for {selectedDay}.</span>
          </div>
        ) : (
          sessionsForDay.map((agg) => {
            const { session, batch, subjectName, subjectCode, isCancelled, isRescheduled, rescheduleMeta } = agg;

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
                  "group relative flex flex-col p-3.5 sm:p-4 text-left transition-all rounded-[12px] overflow-hidden",
                  isCancelled
                    ? "border border-rose-200 dark:border-rose-900/40"
                    : isRescheduled
                    ? "border border-amber-200 dark:border-amber-900/40"
                    : "border border-black/[0.05] dark:border-[color:var(--card-accent-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md"
                )}
                style={{
                  ['--card-accent-border' as any]: `${theme.accent}45`,
                }}
              >
                {/* Pastel backgrounds */}
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

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2 bg-white/60 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-[6px] shrink-0">
                      <span className="text-xs font-mono font-bold text-[#111111] dark:text-[#FFFFFF]">
                        {formatTime12Hour(session.startTime)}
                      </span>
                      <span className="text-[10px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                        {formatTime12Hour(session.endTime)}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#111111] dark:text-[#FFFFFF] truncate">
                          {subjectName}
                        </span>
                        {isRescheduled && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-mono font-bold uppercase tracking-wider rounded-[3px]">
                            RESCHEDULED
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-[3px]">
                            CANCELLED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#6F6F6F] dark:text-[#A1A1AA] font-mono mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 opacity-70" />
                          {session.room || 'Room TBA'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 opacity-60" />
                          {batch.batchName}
                        </span>
                        {subjectCode && (
                          <>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/10 rounded-[3px] text-[10px]">
                              {subjectCode}
                            </span>
                          </>
                        )}
                        {isRescheduled && rescheduleMeta?.originalStartTime && (
                          <>
                            <span>·</span>
                            <span className="text-amber-700 dark:text-amber-300 font-bold">
                              (Was: {formatTime12Hour(rescheduleMeta.originalStartTime)})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 flex-wrap">
                    {/* WhatsApp Notice */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsAppNotice(agg)}
                      className="p-1.5 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-[6px] transition-colors cursor-pointer shadow-2xs"
                      title="Share Notice via WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Reschedule / Revert Actions */}
                    {isRescheduled ? (
                      <button
                        type="button"
                        onClick={() => handleRevertReschedule(agg)}
                        className="px-2 py-1 bg-amber-500 text-black text-[10.5px] font-bold uppercase tracking-wider rounded-[6px] hover:bg-amber-600 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Revert to original slot"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert</span>
                      </button>
                    ) : (
                      !isCancelled && (
                        <button
                          type="button"
                          onClick={() => setSessionToReschedule(agg)}
                          className="px-2 py-1 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-black/10 dark:border-white/10 text-black dark:text-white text-[10.5px] font-bold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Reschedule</span>
                        </button>
                      )
                    )}

                    {/* Cancel / Restore Action */}
                    <button
                      type="button"
                      onClick={() => handleToggleCancel(agg)}
                      className={`px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer shadow-2xs border ${
                        isCancelled
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/60 hover:bg-rose-600 hover:text-white'
                      }`}
                    >
                      {isCancelled ? 'Restore' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reschedule Modal */}
      <FacultyRescheduleModal
        isOpen={sessionToReschedule !== null}
        onClose={() => setSessionToReschedule(null)}
        aggregatedSession={sessionToReschedule}
        onSuccess={onRefresh}
      />
    </div>
  );
};
