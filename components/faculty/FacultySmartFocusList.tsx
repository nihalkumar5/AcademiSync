'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AggregatedFacultySession, formatFacultyCombinedBatchLabel, formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { BatchProposedTask } from '@/lib/types';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTaskCardTheme } from '@/lib/cardColors';
import { Check, CheckCircle2, Calendar } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { formatTime12Hour } from '@/lib/timetableUtils';

interface FacultySmartFocusListProps {
  targetSessions: AggregatedFacultySession[];
  isAfter8PM?: boolean;
}

interface FacultyFocusItem {
  id: string;
  title: string;
  type: 'assignment' | 'lab';
  urgency: 'high' | 'medium' | 'low';
  tag: string;
  deadlineText?: string;
  originalPriority?: 'Low' | 'Medium' | 'High';
  isCompleted?: boolean;
}

export const FacultySmartFocusList: React.FC<FacultySmartFocusListProps> = ({
  targetSessions,
  isAfter8PM = false,
}) => {
  const { profile, user, setActiveView } = useApp();
  const linkedBatches = profile?.facultyLinkedBatches || [];

  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [assignments, setAssignments] = useState<BatchProposedTask[]>([]);

  // Listen to active faculty assignments across all connected batches
  useEffect(() => {
    if (linkedBatches.length === 0) {
      setAssignments([]);
      return;
    }

    const unsubs: (() => void)[] = [];
    const tasksByBatch: Record<string, BatchProposedTask[]> = {};

    linkedBatches.forEach((batch) => {
      const propRef = collection(db, 'shared_timetables', batch.batchKey, 'proposed_tasks');
      const q = query(propRef);

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: BatchProposedTask[] = [];
          snap.forEach((d) => {
            const data = d.data() as BatchProposedTask;
            if (
              data.isFacultyAssignment ||
              data.creatorRole === 'faculty' ||
              (user?.id && data.creatorId === user.id)
            ) {
              list.push({ ...data, id: d.id, batchKey: batch.batchKey });
            }
          });

          tasksByBatch[batch.batchKey] = list;
          const allTasks = Object.values(tasksByBatch).flat();
          setAssignments(allTasks);
        },
        (err) => {
          console.warn('Error listening to faculty focus tasks:', err);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches, user?.id]);

  // Compute Today's / Tomorrow's Focus priorities for faculty
  const focusItems = useMemo(() => {
    const items: FacultyFocusItem[] = [];
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    // 1. Assignment deadlines and submissions to collect/grade
    assignments.forEach((task) => {
      if (!task.deadline) return;
      const deadlineDate = new Date(task.deadline);
      const timeDiff = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

      // Only show tasks due in <= 5 days or already overdue
      if (diffDays > 5) return;

      const isDueToday = deadlineDate.toDateString() === today.toDateString();
      const isDueTomorrow = deadlineDate.toDateString() === tomorrow.toDateString();
      const isOverdue = diffDays < 0;

      let urgency: 'high' | 'medium' | 'low' = 'medium';
      let deadlineText = '';
      let title = task.title;

      if (isOverdue) {
        urgency = 'high';
        deadlineText = 'Overdue';
        title = `Review Submissions: ${task.title}`;
      } else if (isDueToday) {
        urgency = 'high';
        deadlineText = 'Due Today';
        title = `Submissions Due: ${task.title}`;
      } else if (isDueTomorrow) {
        urgency = 'high';
        deadlineText = 'Due Tomorrow';
        title = `Submissions Due: ${task.title}`;
      } else {
        urgency = 'medium';
        deadlineText = `Due ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }

      const linkedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
      const batchLabel = linkedBatch ? formatFacultyBatchDegreeAndBranch(linkedBatch) : 'Batch';

      items.push({
        id: `task_${task.id}`,
        title,
        type: 'assignment',
        urgency,
        tag: `${task.subjectName || 'Assignment'} · ${batchLabel}`,
        deadlineText,
        originalPriority: urgency === 'high' ? 'High' : 'Medium',
      });
    });

    // 2. Practical Labs scheduled today/tomorrow (high prep priority)
    targetSessions
      .filter((s) => s.session.isLab && !s.isCancelled)
      .forEach((lab) => {
        const { pillLabel } = formatFacultyCombinedBatchLabel(lab.linkedBatches, lab.batch);
        items.push({
          id: `lab_${lab.session.id}`,
          title: `Conduct Practical: ${lab.subjectName}`,
          type: 'lab',
          urgency: 'high',
          tag: `Lab Practical · ${pillLabel}`,
          deadlineText: `${formatTime12Hour(lab.session.startTime)} – ${formatTime12Hour(lab.session.endTime)} · Room ${lab.session.room || 'TBA'}`,
          originalPriority: 'High',
        });
      });

    return items;
  }, [assignments, targetSessions, linkedBatches]);

  const toggleCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const headerTitle = isAfter8PM ? "TOMORROW'S FOCUS" : "TODAY'S FOCUS";

  if (focusItems.length === 0) {
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-center justify-between px-1 mb-6">
          <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
            {headerTitle}
          </h3>
        </div>
        <EmptyState
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          title="You're all caught up!"
          description={
            isAfter8PM
              ? 'No pending lab practicals or urgent batch tasks for tomorrow.'
              : 'No pending lab practicals or urgent batch tasks for today.'
          }
          actionLabel="View All Tasks"
          onAction={() => setActiveView('homework')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-6">
        <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
          {headerTitle}
        </h3>
        <span className="text-[11px] font-bold text-[#808080] uppercase tracking-wider">
          {focusItems.length} {focusItems.length === 1 ? 'PRIORITY' : 'PRIORITIES'}
        </span>
      </div>

      {/* Task Items */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {focusItems.map((item, idx) => {
            const isCompleted = completedIds.has(item.id);
            const isOverdue = item.urgency === 'high' && item.deadlineText?.toLowerCase().includes('overdue');
            const isUrgent = item.urgency === 'high';

            const theme = getTaskCardTheme({
              isDone: isCompleted,
              isOverdue,
              isInProgress: false,
              priority: item.originalPriority,
            });

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  if (item.type === 'assignment') {
                    setActiveView('homework');
                  } else {
                    setActiveView('timetable');
                  }
                }}
                className={clsx(
                  'relative flex flex-col p-4 sm:p-[18px] rounded-[12px] border border-black/[0.05] dark:border-[color:var(--card-accent-border)] w-full overflow-hidden transition-all cursor-pointer group shadow-xs',
                  isCompleted ? 'opacity-65' : 'opacity-100'
                )}
                style={{
                  ['--card-accent-border' as any]: `${theme.accent}45`,
                }}
              >
                {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
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

                <div className="relative z-10 flex flex-col h-full">
                  {/* Number and Top Right Toolbar */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="text-[44px] font-bold leading-[40px] tracking-tighter font-mono select-none pointer-events-none"
                      style={{ color: theme.numberColor }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-center gap-1.5 self-start">
                      {item.originalPriority === 'High' && !isCompleted && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#FFF0E8] text-[#C96B45] text-[9.5px] font-bold uppercase tracking-wider">
                          HIGH
                        </span>
                      )}
                      {item.originalPriority === 'Medium' && !isCompleted && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#FFF0E8]/70 text-[#C96B45]/90 text-[9.5px] font-bold uppercase tracking-wider">
                          MED
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#D2F1E8] text-[#18A889] text-[9.5px] font-bold uppercase tracking-wider">
                          DONE
                        </span>
                      )}

                      {/* Complete Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleCompleted(item.id, e)}
                        className={clsx(
                          'w-6 h-6 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer ml-1',
                          isCompleted
                            ? 'bg-[#18A889] border-[#18A889] text-white'
                            : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-white/40 dark:bg-black/20'
                        )}
                        title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    </div>
                  </div>

                  {/* Tag */}
                  <span className="text-[10.5px] font-bold uppercase tracking-[1.3px] text-[#737373] dark:text-[#94A3B8] break-words pr-2 mt-3.5">
                    {item.tag}
                  </span>

                  {/* Title Row */}
                  <div className="flex items-start mt-2.5">
                    <div className="flex flex-col">
                      <h4
                        className={clsx(
                          'text-[16px] sm:text-[17px] font-bold leading-[22px] tracking-tight group-hover:opacity-80 transition-opacity',
                          isCompleted
                            ? 'text-[#737373] dark:text-[#64748B] line-through'
                            : 'text-[#151515] dark:text-[#F4F4F6]'
                        )}
                      >
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bottom row metadata pill */}
                  <div className="flex items-center justify-between mt-[16px]">
                    {item.deadlineText ? (
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[10.5px] font-bold font-mono uppercase tracking-wider',
                          isUrgent
                            ? 'bg-[#FFF0E8] text-[#C96B45] border border-[#F5D8CC]'
                            : isOverdue
                            ? 'bg-[#FCEBED] text-[#C94B5C] border border-[#F5CBD1]'
                            : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#737373] dark:text-[#94A3B8] border border-black/[0.04] dark:border-white/[0.06]'
                        )}
                      >
                        <Calendar className="w-3 h-3 shrink-0" />
                        {item.deadlineText.toUpperCase()}
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
