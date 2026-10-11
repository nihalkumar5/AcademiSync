'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { BatchProposedTask, FacultyLinkedBatch } from '@/lib/types';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
} from 'lucide-react';
import { getTaskCardTheme } from '@/lib/cardColors';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { AssignmentReadTrackerModal } from './AssignmentReadTrackerModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonochromeIllustration } from '@/components/ui/MonochromeIllustration';
import { clsx } from 'clsx';

export const FacultyTasksView: React.FC = () => {
  const { profile, user, showToast } = useApp();
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

  const handleDeleteAssignment = async (task: BatchProposedTask) => {
    const confirmed = window.confirm(`Delete assignment "${task.title}"?`);
    if (!confirmed) return;

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
      `Tracked via AcademiSync.`,
    ].filter(Boolean);

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n'))}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full pb-32 sm:pb-24">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 rounded-[3px]">
                FACULTY ASSIGNMENTS
              </span>
              <span className="text-[12px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
              </span>
            </div>
            <h2 className="text-[32px] sm:text-[36px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px] sm:leading-[42px]">
              Assignments & Tasks
            </h2>
            <p className="text-[14px] font-normal text-[#6B6B6B] dark:text-[#A1A1AA] leading-[20px] mt-1.5">
              Publish assignments, track student submission deadlines & read receipts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] hover:opacity-90 transition-opacity text-[13px] font-semibold cursor-pointer shadow-xs rounded-[3px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <div className="flex items-center gap-3 px-4 py-2.5 h-[44px] rounded-[3px] bg-white dark:bg-[#121317] border border-[#D9D9D6] dark:border-white/[0.08] shadow-xs">
          <Search className="w-4 h-4 text-[#6F6F6F] dark:text-[#94A3B8] shrink-0" />
          <input
            type="text"
            placeholder="Search assignments, topics, or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] placeholder:text-[#6F6F6F] dark:placeholder:text-[#64748B] focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-none text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors"
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
              'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border',
              selectedBatchFilter === 'all'
                ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
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
                  'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border',
                  isSel
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                    : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
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
          <div className="py-12 text-center text-xs font-mono text-black/50 dark:text-white/50">
            Loading assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-8 px-4">
            <EmptyState
              icon={<MonochromeIllustration type="no-homework" size={48} />}
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
                className="relative flex flex-col p-4 sm:p-[18px] rounded-[12px] border border-black/[0.05] dark:border-[color:var(--card-accent-border)] transition-all w-full overflow-hidden shadow-xs hover:shadow-md"
                style={{
                  ['--card-accent-border' as any]: `${theme.accent}45`,
                }}
              >
                {/* Pastel backgrounds (exact match to HomeworkCard) */}
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

                <div className="relative z-10 flex flex-col gap-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[28px] sm:text-[32px] font-bold leading-none tracking-tighter font-mono select-none"
                        style={{ color: theme.numberColor }}
                      >
                        {formattedIndex}
                      </span>

                      {/* Batch Pill */}
                      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase bg-black text-white dark:bg-white dark:text-black">
                        {batchLabel}
                      </span>

                      {/* Subject */}
                      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/80 border border-black/5 dark:border-white/5">
                        {task.subjectName || 'Coursework'}
                      </span>

                      {/* Priority if High */}
                      {task.priority === 'High' && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#FFF0E8] text-[#C96B45] text-[9.5px] font-bold uppercase tracking-wider font-mono">
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Deadline */}
                      <span className="text-[11px] font-mono text-black/60 dark:text-white/60 flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>Deadline: {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(task)}
                        className="p-1 rounded text-black/30 dark:text-white/30 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Assignment Title & Description */}
                  <div>
                    <h3 className="text-base sm:text-[17px] font-bold text-black dark:text-white leading-snug">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-black/65 dark:text-white/65 mt-1 leading-relaxed break-words">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-black/5 dark:border-white/5 flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {/* Read Tracker Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="h-7 px-2.5 rounded-[3px] bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                        title="View student reads"
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
                          className="h-7 px-2.5 rounded-[3px] bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 transition-colors text-[11px] font-medium"
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
                        className="h-7 px-2.5 rounded-[3px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Share to WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>

                      {/* Track Reads Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="h-7 px-2.5 rounded-[3px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-xs"
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
    </div>
  );
};
