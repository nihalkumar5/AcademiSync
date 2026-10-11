'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString, getDateStringForDayOfWeek, formatTime12Hour } from '@/lib/timetableUtils';
import {
  AggregatedFacultySession,
  cancelOrRestoreFacultyClass,
  revertFacultyReschedule,
  formatFacultyBatchDegreeAndBranch,
  formatFacultyCombinedBatchLabel,
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
  MoreVertical,
  Ban,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FacultyScheduleTimelineProps {
  allWeekSessions: Record<DayOfWeek, AggregatedFacultySession[]>;
  onRefresh?: () => void;
}

export const FacultyScheduleTimeline: React.FC<FacultyScheduleTimelineProps> = ({
  allWeekSessions,
  onRefresh,
}) => {
  const { profile, user, showToast } = useApp();
  const currentDay = getCurrentDayOfWeek();
  const todayStr = getTodayDateString();

  const [sessionToReschedule, setSessionToReschedule] = useState<AggregatedFacultySession | null>(null);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  const sessionsForToday = allWeekSessions[currentDay] || [];

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
      const targetDate = agg.session.day ? getDateStringForDayOfWeek(agg.session.day) : todayStr;

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
      const targetDate = agg.session.day ? getDateStringForDayOfWeek(agg.session.day) : todayStr;

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

    let text = '';
    if (isCancelled) {
      text = `📢 *NOTICE: CLASS CANCELLED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `Time: *${session.startTime} - ${session.endTime}*\n` +
        `Status: *CANCELLED TODAY*\n` +
        `Faculty: *${teacherName}*\n\n` +
        `Synced via AcademiSync.`;
    } else if (isRescheduled) {
      text = `⏰ *NOTICE: CLASS RESCHEDULED*\n\n` +
        `Batch: *${batchLabel}*\n` +
        `Subject: *${subjectName}* (${session.subjectCode || ''})\n` +
        `New Time: *${session.startTime} - ${session.endTime}* (Original: ${rescheduleMeta?.originalStartTime} - ${rescheduleMeta?.originalEndTime})\n` +
        `Room: *${session.room || 'TBA'}*\n` +
        `Faculty: *${teacherName}*\n` +
        (rescheduleMeta?.reason ? `Note: *${rescheduleMeta.reason}*\n` : '') +
        `\nUpdated on AcademiSync.`;
    } else {
      text = `📌 *CLASS UPDATE*\n\n` +
        `Batch: *${batchLabel}*\n` +
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
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#111111] dark:text-white" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
            Today&apos;s Schedule
          </h3>
          <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
            ({sessionsForToday.length} {sessionsForToday.length === 1 ? 'lecture' : 'lectures'})
          </span>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex flex-col gap-3">
        {sessionsForToday.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-2.5">
            <BookOpen className="w-7 h-7 opacity-30" />
            <span>No lectures scheduled for today.</span>
          </div>
        ) : (
          sessionsForToday.map((agg) => {
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

            return (
              <div
                key={cardKey}
                className={clsx(
                  "group relative flex flex-col p-3.5 sm:p-4 text-left transition-all rounded-[12px]",
                  openMenuSessionId === cardKey ? "overflow-visible z-40" : "overflow-hidden z-0",
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

                <div className="relative z-10 flex items-start justify-between gap-3">
                  {/* Left Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2 bg-white/60 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-[6px] shrink-0">
                      <span className="text-xs font-mono font-bold text-[#111111] dark:text-[#FFFFFF]">
                        {formatTime12Hour(session.startTime)}
                      </span>
                      <span className="text-[10px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                        {formatTime12Hour(session.endTime)}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx("text-sm font-bold text-[#111111] dark:text-[#FFFFFF] truncate", isCancelled && "line-through opacity-70")}>
                          {subjectName}
                        </span>
                        {agg.linkedBatches && agg.linkedBatches.length > 1 && (
                          <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-[9.5px] font-bold uppercase rounded-[3px] font-mono text-black/70 dark:text-white/70">
                            {pillLabel}
                          </span>
                        )}
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
                        {subjectCode && !subjectName.toLowerCase().includes(subjectCode.toLowerCase()) && (
                          <>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/10 rounded-[3px] text-[10px]">
                              {subjectCode}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Cancelled text */}
                      {isCancelled && (
                        <span className="text-[11px] font-mono text-[#C94B5C] mt-1 font-semibold block">
                          Cancelled for today
                        </span>
                      )}

                      {/* Soft Peach Info Area for Rescheduled Class */}
                      {isRescheduled && !isCancelled && (
                        <div className="flex items-start gap-2 bg-[#FDECE4] dark:bg-[#2C1813] border border-[#F5D8CC] dark:border-[#C85F3D]/30 p-2.5 rounded-[6px] mt-2.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C85F3D] mt-0.5 shrink-0" />
                          <div className="flex flex-col text-xs leading-snug">
                            <span className="font-semibold text-[#C85F3D] dark:text-[#E88C6E]">
                              Rescheduled from {rescheduleMeta?.originalStartTime ? formatTime12Hour(rescheduleMeta.originalStartTime) : session.startTime}–{rescheduleMeta?.originalEndTime ? formatTime12Hour(rescheduleMeta.originalEndTime) : session.endTime}
                            </span>
                            {rescheduleMeta?.reason && (
                              <span className="text-[11px] text-[#A65437] dark:text-[#E88C6E]/80 mt-0.5 font-normal">
                                Reason: {rescheduleMeta.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options Dropdown Menu (CR Pattern) */}
                  <div className="shrink-0 flex items-center gap-1.5 self-start relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuSessionId(openMenuSessionId === cardKey ? null : cardKey);
                      }}
                      className="p-1.5 text-[#A0A0A0] hover:text-[#151515] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer rounded-[4px]"
                      title="More Options"
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
