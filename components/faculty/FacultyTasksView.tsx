'use client';

import { FacultyPageHeader, FacultyNoBatches, FacultyStatTile } from './FacultyUI';
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { BatchProposedTask, FacultyLinkedBatch } from '@/lib/types';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  CheckSquare,
  Plus,
  Eye,
  Calendar,
  Users,
  Search,
  ExternalLink,
  Link2,
  Trash2,
  Share2,
  Clock,
  BookOpen,
  X,
} from '@/components/ui/icons';
import { getTaskCardTheme } from '@/lib/cardColors';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { AssignmentReadTrackerModal } from './AssignmentReadTrackerModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonochromeIllustration } from '@/components/ui/MonochromeIllustration';
import { clsx } from 'clsx';

export const FacultyTasksView: React.FC = () => {
  const { profile, user, showToast, setActiveView } = useApp();
  const linkedBatches = profile?.facultyLinkedBatches || [];

  const [assignments, setAssignments] = useState<BatchProposedTask[]>([]);
  const [selectedTaskForTracking, setSelectedTaskForTracking] = useState<BatchProposedTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener for proposed_tasks across all connected batches
  useEffect(() => {
    if (linkedBatches.length === 0) {
      setAssignments([]);
      setIsLoading(false);
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
            if (
              data.isFacultyAssignment ||
              data.creatorRole === 'faculty' ||
              (user?.id && data.creatorId === user.id)
            ) {
              list.push({ ...data, id: d.id, batchKey: batch.batchKey });
            }
          });

          tasksByBatch[batch.batchKey] = list;

          // Combine and sort by deadline ascending
          const allTasks = Object.values(tasksByBatch).flat();
          allTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          setAssignments(allTasks);
          setIsLoading(false);
        },
        (err) => {
          console.warn('Error listening to faculty assignments:', err);
          setIsLoading(false);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches, user?.id]);

  // Filter assignments by search query and batch
  const filteredAssignments = useMemo(() => {
    return assignments.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchSubject = (task.subjectName || '').toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchDesc) return false;
      }

      // 2. Batch Filter
      if (selectedBatchFilter !== 'all' && task.batchKey !== selectedBatchFilter) {
        return false;
      }

      return true;
    });
  }, [assignments, searchQuery, selectedBatchFilter]);

  const [assignmentToDelete, setAssignmentToDelete] = useState<BatchProposedTask | null>(null);

  const handleDeleteAssignment = (task: BatchProposedTask) => {
    setAssignmentToDelete(task);
  };

  const confirmDeleteAssignment = async (task: BatchProposedTask) => {
    setAssignmentToDelete(null);
    try {
      await deleteDoc(doc(db, 'shared_timetables', task.batchKey, 'proposed_tasks', task.id));
      showToast('Assignment Deleted', `"${task.title}" was removed.`, 'info');
    } catch (err: any) {
      console.error('Failed to delete assignment:', err);
      showToast('Error', err.message || 'Failed to delete assignment.', 'error');
    }
  };

  const handleShareWhatsApp = (task: BatchProposedTask) => {
    const matchedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
    const batchLabel = matchedBatch ? formatFacultyBatchDegreeAndBranch(matchedBatch).degreeAndBranch : 'Batch';
    const teacherName = profile?.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty';
    const deadlineStr = new Date(task.deadline).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const lines = [
      `📚 *NEW ASSIGNMENT / TASK*`,
      ``,
      `Batch: *${batchLabel}*`,
      `Subject: *${task.subjectName || 'Coursework'}*`,
      `Title: *${task.title}*`,
      task.description ? `Details: ${task.description}` : '',
      `Due Date: ⏰ *${deadlineStr}*`,
      task.priority === 'High' ? `Priority: 🔴 *HIGH PRIORITY*` : '',
      task.attachmentUrl ? `Link: ${task.attachmentUrl}` : '',
      `Faculty: *${teacherName}*`,
      ``,
      `Tracked via Intersemester.`,
    ].filter(Boolean);

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n'))}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  useEffect(() => {
    const open = () => setIsCreateModalOpen(true);
    window.addEventListener('faculty:new-assignment', open);
    return () => window.removeEventListener('faculty:new-assignment', open);
  }, []);

  return (
    <div className="flex flex-col gap-f5 text-left max-w-4xl mx-auto w-full pb-f7">
      <FacultyPageHeader
        eyebrow="Assignments"
        title="Coursework"
        description="Post work to your batches and see who has opened it."
        action={
          linkedBatches.length > 0 && (
            <button type="button" onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> New assignment
            </button>
          )
        }
      />

      {linkedBatches.length === 0 && (
        <FacultyNoBatches
          onConnect={() => setActiveView('carry')}
          title="Link a batch first"
          body="Assignments go to the batches you teach. Connect one and you can post right away."
          note="One code away from your first post."
        />
      )}

      {linkedBatches.length > 0 && (<>
      {/* Search Bar */}
      <div className="relative w-full">
        <div className="flex items-center gap-3 px-4 py-2.5 h-[44px] rounded-none bg-surface border border-line shadow-xs">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            type="text"
            placeholder="Search assignments, topics, or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[14px] text-fg placeholder:text-[#6F6F6F] dark:placeholder:text-[#71717A] focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-none text-[#6B6B6B] hover:text-fg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Batch Tabs */}
      {linkedBatches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedBatchFilter('all')}
            className={clsx(
 'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap border',
 selectedBatchFilter === 'all'
 ? 'bg-ink text-on-ink border-line-strong shadow-xs'
 : 'bg-transparent text-muted border-line hover:border-black/30 dark:hover:border-white/30'
 )}
          >
            <span>All Batches</span>
            <span className="ml-1 opacity-60 font-mono">({assignments.length})</span>
          </button>
          {linkedBatches.map((batch) => {
            const bLabel = formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch;
            const isSel = selectedBatchFilter === batch.batchKey;
            const batchCount = assignments.filter((a) => a.batchKey === batch.batchKey).length;
            return (
              <button
                key={batch.batchKey}
                type="button"
                onClick={() => setSelectedBatchFilter(batch.batchKey)}
                className={clsx(
 'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap border',
 isSel
 ? 'bg-ink text-on-ink border-line-strong shadow-xs'
 : 'bg-transparent text-muted border-line hover:border-black/30 dark:hover:border-white/30'
 )}
              >
                <span>{bLabel}</span>
                <span className="ml-1 opacity-60 font-mono">({batchCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Assignment Cards List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-faint">
            Loading assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-8 px-4">
            <EmptyState
              illustration="papers"
              title={assignments.length === 0 ? "No assignments published" : "No assignments for this batch"}
              description={
                assignments.length === 0
                  ? "Create an assignment to broadcast submission deadlines to students."
                  : "No assignments published for the selected batch."
              }
              actionLabel={assignments.length === 0 ? "Create Assignment" : "Show All Batches"}
              onAction={() => {
                if (assignments.length === 0) {
                  setIsCreateModalOpen(true);
                } else {
                  setSearchQuery('');
                  setSelectedBatchFilter('all');
                }
              }}
            />
          </div>
        ) : (
          filteredAssignments.map((task, idx) => {
            const readCount = task.readReceipts ? Object.keys(task.readReceipts).length : 0;
            const matchedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
            const batchLabel = matchedBatch
              ? formatFacultyBatchDegreeAndBranch(matchedBatch).degreeAndBranch
              : 'Batch';

            const deadlineDate = new Date(task.deadline);
            const isOverdue = deadlineDate.getTime() < new Date().getTime();

            const theme = getTaskCardTheme({
              isOverdue,
              priority: task.priority || 'Medium',
            });
            const formattedIndex = String(idx + 1).padStart(2, '0');

            return (
              <div
                key={task.id}
                className="relative flex flex-col p-4 sm:p-[18px] rounded-none border border-black/[0.05] dark:border-[color:var(--card-accent-border)] transition-all w-full overflow-hidden shadow-xs hover:shadow-md"
                style={{
                  ['--card-accent-border' as any]: `${theme.accent}45`,
                }}
              >
                {/* Pastel backgrounds (exact match to HomeworkCard) */}
                <div
                  className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-none"
                  style={{ backgroundColor: theme.bg }}
                />
                <div
                  className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-none"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                  }}
                />

                <div className="relative z-10 flex flex-col gap-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[28px] sm:text-[32px] font-bold leading-none tracking-tighter font-mono select-none text-[var(--num-light)] dark:text-[var(--num-dark)]"
                        style={{ '--num-light': theme.numberColor, '--num-dark': `${theme.accent}66` } as any}
                      >
                        {formattedIndex}
                      </span>

                      {/* Batch Pill */}
                      <span className="px-2 py-0.5 rounded-none text-[11px] font-mono font-bold uppercase bg-ink text-on-ink">
                        {batchLabel}
                      </span>

                      {/* Subject */}
                      <span className="px-2 py-0.5 rounded-none text-[12px] font-mono font-bold bg-black/5 dark:bg-white/10 text-fg-2 border border-line-soft">
                        {task.subjectName || 'Coursework'}
                      </span>

                      {/* Priority if High */}
                      {task.priority === 'High' && (
                        <span className="px-2 py-0.5 rounded-none bg-[#FFF0E8] text-[#C96B45] text-[12px] font-bold font-mono dark:bg-orange-500/15 dark:text-orange-300">
                          High priority
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Deadline */}
                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>Deadline: {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(task)}
                        className="p-1 rounded-none text-black/60 dark:text-white/30 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Assignment" aria-label="Delete Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Assignment Title & Description */}
                  <div>
                    <h3 className="text-base sm:text-[17px] font-bold text-fg leading-snug">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-black/65 dark:text-white/65 mt-1 leading-relaxed break-words">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-line-soft flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {/* Read Tracker Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="h-7 px-2.5 rounded-none bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                        title="View student reads" aria-label="View student reads"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{readCount} Opened</span>
                      </button>

                      {/* Attachment Link */}
                      {task.attachmentUrl && (
                        <a
                          href={task.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2.5 rounded-none bg-surface-2 text-fg-2 hover:bg-surface-3 flex items-center gap-1 transition-colors text-[11px] font-medium"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Attachment</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Notice Share */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(task)}
                        className="h-7 px-2.5 rounded-none border border-line hover:bg-surface-2 text-fg-2 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Share to WhatsApp" aria-label="Share to WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>

                      {/* Track Reads Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="h-7 px-2.5 rounded-none bg-ink text-on-ink font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Track</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>)}

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <AssignmentReadTrackerModal
        isOpen={!!selectedTaskForTracking}
        onClose={() => setSelectedTaskForTracking(null)}
        task={selectedTaskForTracking}
      />
      <ConfirmModal
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={async () => { if (assignmentToDelete) await confirmDeleteAssignment(assignmentToDelete); }}
        title="Delete assignment?"
        description="Students in this batch will no longer see it."
        highlightText={assignmentToDelete?.title}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
