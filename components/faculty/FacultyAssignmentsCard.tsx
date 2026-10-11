'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { BatchProposedTask, FacultyLinkedBatch } from '@/lib/types';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CheckSquare, Plus, Eye, Calendar, Users, FileText, ExternalLink, Link2 } from 'lucide-react';
import { getTaskCardTheme } from '@/lib/cardColors';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { AssignmentReadTrackerModal } from './AssignmentReadTrackerModal';
import { clsx } from 'clsx';

interface FacultyAssignmentsCardProps {
  onOpenCreateModal: () => void;
  onAssignmentsCountChange?: (count: number) => void;
}

export const FacultyAssignmentsCard: React.FC<FacultyAssignmentsCardProps> = ({
  onOpenCreateModal,
  onAssignmentsCountChange,
}) => {
  const { profile, user } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  const [assignments, setAssignments] = useState<BatchProposedTask[]>([]);
  const [selectedTaskForTracking, setSelectedTaskForTracking] = useState<BatchProposedTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (linkedBatches.length === 0) {
      setAssignments([]);
      if (onAssignmentsCountChange) onAssignmentsCountChange(0);
      return;
    }

    setIsLoading(true);
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
            // Match assignments created by this faculty or flagged as faculty assignments for this batch
            if (
              data.isFacultyAssignment ||
              data.creatorRole === 'faculty' ||
              (user?.id && data.creatorId === user.id)
            ) {
              list.push({ ...data, id: d.id, batchKey: batch.batchKey });
            }
          });

          tasksByBatch[batch.batchKey] = list;

          // Flatten and sort by deadline ascending
          const allTasks = Object.values(tasksByBatch).flat();
          allTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          setAssignments(allTasks);
          if (onAssignmentsCountChange) onAssignmentsCountChange(allTasks.length);
          setIsLoading(false);
        },
        (err) => {
          console.warn('Error listening to batch assignments:', err);
          setIsLoading(false);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches, user?.id, onAssignmentsCountChange]);

  return (
    <>
      <div className="w-full bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] p-5 sm:p-6 text-left flex flex-col gap-5 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#111111] dark:text-white" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
              Assignments &amp; Tasks
            </h3>
            <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
              ({assignments.length} active)
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-1.5 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Assignment</span>
          </button>
        </div>

        {/* Assignments List */}
        <div className="flex flex-col gap-3.5">
          {assignments.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-2">
              <FileText className="w-7 h-7 opacity-30" />
              <span>No assignments posted yet. Tap &quot;Post Assignment&quot; to publish one.</span>
            </div>
          ) : (
            assignments.map((task, idx) => {
              const readCount = task.readReceipts ? Object.keys(task.readReceipts).length : 0;
              const matchedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
              const batchName = matchedBatch ? formatFacultyBatchDegreeAndBranch(matchedBatch).degreeAndBranch : 'Batch';

              const deadlineDate = new Date(task.deadline);
              const diffDays = Math.ceil(
                (deadlineDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
              );
              const isOverdue = diffDays < 0;

              const theme = getTaskCardTheme({
                isOverdue,
                priority: task.priority || 'Medium',
              });

              const formattedIndex = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={task.id}
                  className="relative flex flex-col p-4 sm:p-[18px] rounded-[12px] border border-black/[0.05] dark:border-[color:var(--card-accent-border)] transition-all w-full overflow-hidden shadow-xs hover:shadow-md"
                  style={{
                    ['--card-accent-border' as any]: `${theme.accent}45`,
                  }}
                >
                  {/* Pastel background tints */}
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

                  <div className="relative z-10 flex flex-col gap-2.5">
                    {/* Top Row: Index number & Action Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="text-[36px] sm:text-[40px] font-bold leading-[34px] tracking-tighter font-mono select-none pointer-events-none"
                        style={{ color: theme.numberColor }}
                      >
                        {formattedIndex}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap self-start">
                        <span className="px-2 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {batchName}
                        </span>

                        {task.priority === 'High' && (
                          <span className="px-2 py-0.5 rounded-[4px] bg-[#FFF0E8] text-[#C96B45] text-[9.5px] font-bold uppercase tracking-wider">
                            HIGH
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/5 text-[10px] font-mono text-black/70 dark:text-white/70 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {diffDays <= 2 && diffDays >= 0 && (
                            <span className="text-red-500 font-bold ml-0.5">({diffDays}d left)</span>
                          )}
                          {isOverdue && (
                            <span className="text-red-500 font-bold ml-0.5">(Overdue)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Title & Subject */}
                    <div>
                      <span
                        className="text-[11px] font-mono font-bold uppercase tracking-wider block"
                        style={{ color: theme.accent }}
                      >
                        {task.subjectName || 'Subject'}
                      </span>
                      <h4 className="text-sm sm:text-[15px] font-bold text-black dark:text-white leading-snug mt-0.5">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-black/70 dark:text-white/70 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Read Tracker Bar & Action */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-black/10 dark:border-white/10 mt-1 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{readCount} Opened</span>
                        </div>

                        {task.attachmentUrl && (
                          <a
                            href={task.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-[6px] bg-black/5 dark:bg-white/5 text-[11px] font-medium text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 transition-colors"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Attachment</span>
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="px-3 py-1.5 rounded-[8px] text-xs font-bold uppercase tracking-wider text-black dark:text-white border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Track Reads</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Read Receipts Modal */}
      <AssignmentReadTrackerModal
        isOpen={!!selectedTaskForTracking}
        onClose={() => setSelectedTaskForTracking(null)}
        task={selectedTaskForTracking}
      />
    </>
  );
};

