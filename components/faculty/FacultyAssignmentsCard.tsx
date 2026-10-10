'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { BatchProposedTask, FacultyLinkedBatch } from '@/lib/types';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CheckSquare, Plus, Eye, Calendar, Users, FileText, ExternalLink } from 'lucide-react';
import { AssignmentReadTrackerModal } from './AssignmentReadTrackerModal';

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
      <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-5 text-left flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-black/70 dark:text-white/70" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
              Assignments &amp; Tasks
            </h3>
            <span className="text-xs text-black/40 dark:text-white/40">
              ({assignments.length} active)
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Assignment</span>
          </button>
        </div>

        {/* Assignments List */}
        <div className="flex flex-col gap-3">
          {assignments.length === 0 ? (
            <div className="py-8 text-center text-xs text-black/40 dark:text-white/40 flex flex-col items-center justify-center gap-2">
              <FileText className="w-6 h-6 opacity-30" />
              <span>No assignments posted yet. Tap &quot;Post Assignment&quot; to publish one.</span>
            </div>
          ) : (
            assignments.map((task) => {
              const readCount = task.readReceipts ? Object.keys(task.readReceipts).length : 0;
              const matchedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
              const batchName = matchedBatch?.batchName || 'Batch';

              const deadlineDate = new Date(task.deadline);
              const diffDays = Math.ceil(
                (deadlineDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
              );

              return (
                <div
                  key={task.id}
                  className="p-3.5 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2.5 transition-all hover:border-black/20 dark:hover:border-white/20"
                >
                  {/* Top: Batch + Deadline */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-black/5 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {batchName}
                    </span>

                    <span className="text-[11px] font-mono text-black/60 dark:text-white/60 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {diffDays <= 2 && diffDays >= 0 && (
                        <span className="text-red-500 font-bold ml-1">({diffDays}d left)</span>
                      )}
                    </span>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h4 className="text-sm font-bold text-black dark:text-white leading-snug">
                      {task.title}
                    </h4>
                    <span className="text-[11px] font-mono text-black/60 dark:text-white/60">
                      {task.subjectName || 'Subject'}
                    </span>
                    {task.description && (
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Read Tracker Bar & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10 mt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{readCount} Opened</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTaskForTracking(task)}
                      className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black dark:text-white border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Track Reads</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
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
