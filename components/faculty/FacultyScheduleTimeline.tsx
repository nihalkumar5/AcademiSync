'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import {
  getCurrentDayOfWeek,
  getTomorrowDayOfWeek,
  getTodayDateString,
  getTomorrowDateString,
  getDateStringForDayOfWeek,
  formatTime12Hour,
} from '@/lib/timetableUtils';
import {
  AggregatedFacultySession,
  cancelOrRestoreFacultyClass,
  revertFacultyReschedule,
  formatFacultyBatchDegreeAndBranch,
  formatFacultyCombinedBatchLabel,
} from '@/lib/facultyUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { FacultyRescheduleModal } from './FacultyRescheduleModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonochromeIllustration } from '@/components/ui/MonochromeIllustration';
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
  MoreVertical,
  Ban,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FacultyScheduleTimelineProps {
  allWeekSessions: Record<DayOfWeek, AggregatedFacultySession[]>;
  isAfter8PM?: boolean;
  targetDay?: DayOfWeek;
  onRefresh?: () => void;
}

export const FacultyScheduleTimeline: React.FC<FacultyScheduleTimelineProps> = ({
  allWeekSessions,
  isAfter8PM: propIsAfter8PM,
  targetDay: propTargetDay,
  onRefresh,
}) => {
  const { profile, user, showToast, setActiveView } = useApp();

  const now = new Date();
  const isAfter8PM = propIsAfter8PM ?? (now.getHours() >= 20);
  const currentDay = getCurrentDayOfWeek();
  const tomorrowDay = getTomorrowDayOfWeek();
  const targetDay = propTargetDay ?? (isAfter8PM ? tomorrowDay : currentDay);
  const targetDateStr = isAfter8PM ? getTomorrowDateString() : getTodayDateString();

  const [sessionToReschedule, setSessionToReschedule] = useState<AggregatedFacultySession | null>(null);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  const sessionsForTarget = allWeekSessions[targetDay] || [];

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
      const targetDate = agg.session.day ? getDateStringForDayOfWeek(agg.session.day) : targetDateStr;

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
        action === 'cancel' ? 'Class Cancelled' : 'Class Restored',
        `${subjectName} updated. Notification sent to ${targets.length > 1 ? `${targets.length} batches` : 'batch'}.`,
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
      const { subjectName } = agg;
      const batchMap = new Map<string, { batch: FacultyLinkedBatch; session: ClassSession }>();
      (agg.linkedBatches || [agg.batch]).forEach((b) => {
        batchMap.set(b.batchKey, { batch: b, session: agg.session });
      });
      (agg.batchSessions || []).forEach((bs) => {
        batchMap.set(bs.batch.batchKey, bs);
      });
      const targets = Array.from(batchMap.values());
      const targetDate = agg.session.day ? getDateStringForDayOfWeek(agg.session.day) : targetDateStr;

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
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error reverting reschedule:', err);
      showToast('Error', err.message || 'Failed to revert reschedule.', 'error');
    }
  };

  const handleShareWhatsAppNotice = (agg: AggregatedFacultySession) => {
    const { session, subjectName, isCancelled, isRescheduled, rescheduleMeta } = agg;
    const { detailLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
    const teacherName = profile.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty';
    const batchLabel = detailLabel;
    const dayLabel = isAfter8PM ? `Tomorrow (${targetDay})` : `Today (${targetDay})`;

    let text = '';
    if (isCancelled) {
      text = `📢 *NOTICE: CLASS CANCELLED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day: *${dayLabel}*\n` +
        `Time: *${session.startTime} - ${session.endTime}*\n` +
        `Status: *CANCELLED*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via AcademiSync.`;
    } else if (isRescheduled) {
      text = `⏰ *NOTICE: CLASS RESCHEDULED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day: *${dayLabel}*\n` +
        `New Time: *${session.startTime} - ${session.endTime}* (Original: ${rescheduleMeta?.originalStartTime} - ${rescheduleMeta?.originalEndTime})\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n` +
        (rescheduleMeta?.reason ? `Note: *${rescheduleMeta.reason}*\n` : '') +
        `\nUpdated on AcademiSync.`;
    } else {
      text = `📌 *CLASS UPDATE*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Day: *${dayLabel}*\n` +
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
    <div className="flex flex-col text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1 mb-6">
        <div className="flex flex-col min-w-0">
          <h3 className="text-[12px] sm:text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-[1.5px] uppercase truncate">
            {isAfter8PM ? "TOMORROW'S SCHEDULE" : "TODAY'S SCHEDULE"}
          </h3>
          <span className="text-[10px] sm:text-[11px] font-mono font-medium text-[#808080] uppercase tracking-wider mt-0.5">
            {targetDay}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveView('timetable')}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-[#111111] text-white dark:bg-[#FFFFFF] dark:text-[#111111] text-[10.5px] font-mono font-bold uppercase tracking-wider rounded-none hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap shadow-xs"
        >
          <span>+ EXTRA CLASS</span>
        </button>
      </div>

      {sessionsForTarget.length === 0 ? (
        <EmptyState
          icon={<MonochromeIllustration type="no-classes" size={48} />}
          title={isAfter8PM ? "No classes tomorrow" : "No classes scheduled today"}
          description={
            isAfter8PM
              ? `You don't have any classes scheduled tomorrow (${targetDay}). Enjoy your break!`
              : "You don't have any classes scheduled on your timetable today. Enjoy your break!"
          }
          actionLabel="View Full Timetable"
          onAction={() => setActiveView('timetable')}
        />
      ) : (
        <div className="relative flex flex-col gap-0 border-l-[2px] border-slate-200 dark:border-white/[0.08] ml-3">
          {sessionsForTarget.map((agg) => {
            const { session, batch, subjectName, subjectCode, isCancelled, isRescheduled, rescheduleMeta } = agg;

            const theme = getSubjectCardTheme({
              subjectName,
              subjectCode,
              isLab: session.isLab,
              isCancelled,
              isRescheduled,
            });

            const { pillLabel, detailLabel } = formatFacultyCombinedBatchLabel(agg.linkedBatches, agg.batch);
            const cardKey = `${session.id}_${agg.linkedBatches?.map((b) => b.batchKey).join('_') || batch.batchKey}`;

            const isLive = agg.isLive;
            const dotColor = isLive ? '#18A889' : theme.accent;

            return (
              <div key={cardKey} className="relative pl-6 pb-6 last:pb-0 group">
                {/* Node Dot */}
                <div 
                  className="absolute left-[-7px] top-[2px] w-3 h-3 rounded-full border-2 border-white dark:border-[#090A0C] shadow-sm z-10"
                  style={{ backgroundColor: dotColor }}
                />

                {isLive && (
                  <div 
                    className="absolute left-[-10px] top-[-1px] w-[18px] h-[18px] rounded-full animate-ping opacity-40 z-0 bg-[#18A889]"
                  />
                )}

                <div className="flex flex-col gap-2.5 transition-all">
                  {/* Time */}
                  <div className="w-24 shrink-0 flex flex-col pt-0.5">
                    {isRescheduled && rescheduleMeta?.originalStartTime ? (
                      <div className="flex flex-col">
                        <span className="text-[11px] line-through text-[#9CA3AF] font-mono font-medium leading-none mb-1">
                          {formatTime12Hour(rescheduleMeta.originalStartTime)}
                        </span>
                        <span className="text-[13px] font-bold tracking-tighter font-mono text-[#C85F3D] leading-none">
                          {formatTime12Hour(session.startTime)}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-[13px] font-bold tracking-tighter font-mono ${
                        isCancelled ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-[#151515] dark:text-zinc-100'
                      }`}>
                        {formatTime12Hour(session.startTime)}
                      </span>
                    )}
                  </div>

                  {/* Class Info Box */}
                  <div 
                    className={clsx(
                      "relative flex-1 rounded-[14px] p-4 sm:p-[18px] border transition-all",
                      openMenuSessionId === cardKey ? "overflow-visible z-40" : "overflow-hidden z-0",
                      isLive
                        ? "bg-[#111111] dark:bg-[#111111] border-2 border-[#18A889] shadow-[0_0_24px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30"
                        : isCancelled
                        ? "border-rose-200 dark:border-rose-900/40"
                        : isRescheduled
                        ? "border-[#F5D8CC] dark:border-[#C85F3D]/25"
                        : "border-black/[0.05] dark:border-[color:var(--card-accent-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                    )}
                    style={{
                      ['--card-accent-border' as any]: isLive ? '#18A889' : `${theme.accent}45`,
                      backgroundColor: isLive ? '#111111' : undefined,
                    }}
                  >
                    {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                    {!isLive && (
                      <>
                        <div 
                          className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[13px]"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div 
                          className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[13px]"
                          style={{ 
                            background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                          }}
                        />
                      </>
                    )}

                    <div className="relative z-10 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4 
                            className={`text-[16px] sm:text-[17px] leading-[22px] font-bold tracking-tight line-clamp-2 ${
                              isLive ? 'text-white' : 'text-[#151515] dark:text-white'
                            } ${isCancelled ? 'line-through opacity-70' : ''}`}
                          >
                            {subjectName}
                          </h4>

                          {isCancelled ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FAD3D9] text-[#C94B5C] rounded-[2px] shrink-0">
                              Cancelled
                            </span>
                          ) : isLive ? (
                            <span className="px-2 py-0.5 rounded-[2px] bg-[#18A889]/20 text-[#18A889] text-[10px] font-bold uppercase tracking-wider animate-pulse border border-[#18A889]/40 shrink-0">
                              Live
                            </span>
                          ) : isRescheduled ? (
                            <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-[#FCE0D5] text-[#C85F3D] shrink-0">
                              Rescheduled
                            </span>
                          ) : session.isLab ? (
                            <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-[#D2F1E8] text-[#18A889] shrink-0">
                              Lab
                            </span>
                          ) : null}
                        </div>

                        {/* Metadata row: ◉ Room No 319 · M.TECH · DS & AI */}
                        <div 
                          className={`flex items-center gap-1.5 text-[12px] font-medium flex-wrap mt-1 ${
                            isLive ? 'text-[#A8A8A8]' : 'text-[#737373] dark:text-[#CBD5E1]'
                          }`}
                        >
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] leading-none opacity-80">◉</span>
                            {session.room ? (session.room.toLowerCase().startsWith('room') ? session.room : `Room No ${session.room}`) : 'Room TBA'}
                          </span>
                          <span className="opacity-40">·</span>
                          <span className="font-semibold text-black/80 dark:text-white/80">
                            {pillLabel}
                          </span>
                          {session.isLab && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="font-semibold text-[11px] text-[#18A889]">
                                Practical Lab
                              </span>
                            </>
                          )}
                        </div>

                        {isRescheduled && rescheduleMeta?.reason && (
                          <div className="text-[11px] font-mono font-medium text-[#C85F3D] dark:text-[#E07A5F] mt-1">
                            Note: {rescheduleMeta.reason}
                          </div>
                        )}
                      </div>

                      {/* Options 3-dots Menu Button */}
                      <div className="shrink-0 flex items-center gap-1.5 self-start relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuSessionId(openMenuSessionId === cardKey ? null : cardKey);
                          }}
                          className="p-1.5 text-[#A0A0A0] hover:text-[#151515] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer rounded-[4px]"
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuSessionId === cardKey && (
                          <>
                            <div
                              className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuSessionId(null);
                              }}
                            />
                            <div
                              className="absolute right-0 top-full mt-1.5 w-52 rounded-[10px] bg-white dark:bg-[#18191E] border border-black/10 dark:border-white/[0.1] shadow-[0_12px_36px_rgba(0,0,0,0.22)] py-1.5 z-50 text-left overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3.5 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.08] text-[9.5px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-[#A1A1AA] flex items-center gap-1.5">
                                <span>🎓</span>
                                <span>Faculty Actions</span>
                              </div>

                              {/* Cancel / Restore Action */}
                              {isCancelled ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSessionId(null);
                                    handleToggleCancel(agg);
                                  }}
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                  <span>Restore Class for Batch</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSessionId(null);
                                    handleToggleCancel(agg);
                                  }}
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5 shrink-0" />
                                  <span>Cancel Class for Batch</span>
                                </button>
                              )}

                              <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />

                              {/* Reschedule / Revert Action */}
                              {isRescheduled ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSessionId(null);
                                    handleRevertReschedule(agg);
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
                                    onClick={() => {
                                      setOpenMenuSessionId(null);
                                      setSessionToReschedule(agg);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                    <span>Reschedule Class</span>
                                  </button>
                                )
                              )}

                              <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />

                              {/* Share Notice via WhatsApp */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuSessionId(null);
                                  handleShareWhatsAppNotice(agg);
                                }}
                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                              >
                                <Share2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                <span>Share Notice via WhatsApp</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
