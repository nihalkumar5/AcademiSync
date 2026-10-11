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
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { getTaskCardTheme } from '@/lib/cardColors';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { AssignmentReadTrackerModal } from './AssignmentReadTrackerModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { clsx } from 'clsx';

export const FacultyTasksView: React.FC = () => {
  const { profile, user, showToast } = useApp();
  const linkedBatches = profile?.facultyLinkedBatches || [];

  const [assignments, setAssignments] = useState<BatchProposedTask[]>([]);
  const [selectedTaskForTracking, setSelectedTaskForTracking] = useState<BatchProposedTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'due_soon' | 'overdue'>('all');
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
            // Include assignments created by faculty or assigned to this batch
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

  // Compute status metrics
  const now = new Date().getTime();
  const activeCount = assignments.filter((a) => new Date(a.deadline).getTime() >= now).length;
  const overdueCount = assignments.filter((a) => new Date(a.deadline).getTime() < now).length;
  const dueSoonCount = assignments.filter((a) => {
    const diff = (new Date(a.deadline).getTime() - now) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 2;
  }).length;

  // Filter assignments
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

      // 3. Status Filter
      const taskTime = new Date(task.deadline).getTime();
      const diffDays = (taskTime - now) / (1000 * 3600 * 24);

      if (statusFilter === 'active' && taskTime < now) return false;
      if (statusFilter === 'overdue' && taskTime >= now) return false;
      if (statusFilter === 'due_soon' && (diffDays < 0 || diffDays > 2)) return false;

      return true;
    });
  }, [assignments, searchQuery, selectedBatchFilter, statusFilter, now]);

  const handleDeleteAssignment = async (task: BatchProposedTask) => {
    const confirmed = window.confirm(`Are you sure you want to delete assignment "${task.title}"?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'shared_timetables', task.batchKey, 'proposed_tasks', task.id));
      showToast('Assignment Deleted', `"${task.title}" was removed from the batch.`, 'info');
    } catch (err: any) {
      console.error('Failed to delete assignment:', err);
      showToast('Error', err.message || 'Failed to delete assignment.', 'error');
    }
  };

  const handleShareWhatsApp = (task: BatchProposedTask) => {
    const matchedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
    const batchLabel = matchedBatch ? formatFacultyBatchDegreeAndBranch(matchedBatch).degreeAndBranch : 'Batch';
    const teacherName = profile.name ? `${profile.facultyTitle || 'Prof.'} ${profile.name}` : 'Faculty';
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
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full min-h-[70vh] pb-36 sm:pb-28">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-[4px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-[10px] font-mono font-bold uppercase tracking-wider">
              Faculty Hub
            </span>
            <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
              {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
            </span>
          </div>
          <h2 className="text-[34px] sm:text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[40px] sm:leading-[44px]">
            Assignments,<br />Tasks,<br />Broadcasts
          </h2>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-black dark:text-white uppercase tracking-wider">
              {activeCount} active
            </span>
            <span className="text-[11px] font-mono text-[#6B6B6B]">
              {assignments.length} total across batches
            </span>
          </div>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-3 max-w-lg">
            Create, publish, and track student submission deadlines and view receipts in real time.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 h-[38px] px-4 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#090A0C] hover:opacity-90 transition-opacity text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* Search & Batch Filters */}
      <div className="flex flex-col gap-3">
        {/* Search Bar */}
        <div className="relative w-full">
          <div className="flex items-center gap-3 px-4 py-2.5 h-[44px] bg-white dark:bg-[#121317] border border-[#D9D9D6] dark:border-white/[0.08] shadow-xs rounded-[8px]">
            <Search className="w-4 h-4 text-[#6F6F6F] dark:text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Search assignments, topics, or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[#111111] dark:text-[#F4F4F6] placeholder-[#8A8A8A] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#8A8A8A] hover:text-black dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Batch Pills Bar (if multiple batches connected) */}
        {linkedBatches.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-mono font-medium text-[#8A8A8A] shrink-0 mr-1">
              Batch:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBatchFilter('all')}
              className={clsx(
                "px-3 py-1 rounded-[6px] text-xs font-mono font-semibold uppercase tracking-wider shrink-0 transition-colors cursor-pointer",
                selectedBatchFilter === 'all'
                  ? "bg-[#111111] text-white dark:bg-white dark:text-[#111111]"
                  : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10"
              )}
            >
              All Batches ({assignments.length})
            </button>
            {linkedBatches.map((batch) => {
              const bLabel = formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch;
              const count = assignments.filter((a) => a.batchKey === batch.batchKey).length;
              return (
                <button
                  key={batch.batchKey}
                  type="button"
                  onClick={() => setSelectedBatchFilter(batch.batchKey)}
                  className={clsx(
                    "px-3 py-1 rounded-[6px] text-xs font-mono font-semibold uppercase tracking-wider shrink-0 transition-colors cursor-pointer",
                    selectedBatchFilter === batch.batchKey
                      ? "bg-[#111111] text-white dark:bg-white dark:text-[#111111]"
                      : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10"
                  )}
                >
                  {bLabel} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center border-b border-[#EEEEEC] dark:border-white/[0.08] overflow-x-auto gap-4 sm:gap-6 pt-1">
          {[
            { id: 'all', label: 'All', count: assignments.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'due_soon', label: 'Due Soon', count: dueSoonCount },
            { id: 'overdue', label: 'Past Deadline', count: overdueCount },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={clsx(
                  "pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 flex items-center gap-1.5",
                  isActive
                    ? "text-[#111111] dark:text-white border-b-2 border-[#111111] dark:border-white"
                    : "text-[#8A8A8A] hover:text-[#111111] dark:hover:text-white"
                )}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-70">({tab.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignment Cards List */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="py-16 text-center text-xs font-mono text-[#8A8A8A]">
            Loading synchronized batch assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-[12px] border border-dashed border-[#D9D9D6] dark:border-white/[0.08]">
            <CheckSquare className="w-8 h-8 opacity-30" />
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="font-bold text-sm text-[#111111] dark:text-white">
                {assignments.length === 0 ? 'No Assignments Published' : 'No Matching Assignments'}
              </span>
              <span className="text-xs text-[#8A8A8A]">
                {assignments.length === 0
                  ? 'Publish an assignment to automatically notify students and track their submission deadlines.'
                  : 'Try clearing your search query or switching filters.'}
              </span>
            </div>
            {assignments.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
              >
                + Post Assignment
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBatchFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-1 text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredAssignments.map((task, idx) => {
            const readCount = task.readReceipts ? Object.keys(task.readReceipts).length : 0;
            const matchedBatch = linkedBatches.find((b) => b.batchKey === task.batchKey);
            const batchLabel = matchedBatch
              ? formatFacultyBatchDegreeAndBranch(matchedBatch).degreeAndBranch
              : 'Batch';

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
                className="relative flex flex-col p-4 sm:p-5 rounded-[12px] border border-black/[0.06] dark:border-[color:var(--card-accent-border)] transition-all w-full overflow-hidden shadow-xs hover:shadow-md"
                style={{
                  ['--card-accent-border' as any]: `${theme.accent}45`,
                }}
              >
                {/* Background tints */}
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
                  {/* Top Bar: Index number & Metadata pills */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="text-[34px] sm:text-[38px] font-bold leading-none tracking-tighter font-mono select-none pointer-events-none"
                      style={{ color: theme.numberColor }}
                    >
                      {formattedIndex}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap self-start">
                      {/* Batch Pill */}
                      <span className="px-2.5 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-mono flex items-center gap-1">
                        <Users className="w-3 h-3 opacity-70" />
                        {batchLabel}
                      </span>

                      {/* Priority */}
                      {task.priority === 'High' && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#FFF0E8] dark:bg-[#341A14] text-[#C96B45] text-[9.5px] font-bold uppercase tracking-wider font-mono">
                          HIGH
                        </span>
                      )}

                      {/* Deadline badge */}
                      <span className="px-2 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/5 text-[10px] font-mono text-black/70 dark:text-white/70 flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-70" />
                        Due {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {diffDays <= 2 && diffDays >= 0 && (
                          <span className="text-red-500 font-bold ml-0.5">({diffDays}d left)</span>
                        )}
                        {isOverdue && (
                          <span className="text-red-500 font-bold ml-0.5">(Past Due)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Subject & Title */}
                  <div>
                    <span
                      className="text-[11px] font-mono font-bold uppercase tracking-wider block"
                      style={{ color: theme.accent }}
                    >
                      {task.subjectName || 'Coursework'}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-black dark:text-white leading-snug mt-0.5">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-black/75 dark:text-white/75 mt-1.5 leading-relaxed break-words">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10 mt-1 flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Opened count */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="px-2.5 py-1 rounded-[6px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Click to view which students opened this assignment"
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
                          className="px-2.5 py-1 rounded-[6px] bg-black/5 dark:bg-white/5 text-[11px] font-medium text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Attachment</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Share WhatsApp Notice */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(task)}
                        className="p-1.5 rounded-[6px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors cursor-pointer"
                        title="Share Notice to WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Track Reads */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForTracking(task)}
                        className="px-3 py-1.5 rounded-[6px] text-xs font-bold uppercase tracking-wider text-black dark:text-white border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Track</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>

                      {/* Delete Assignment */}
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(task)}
                        className="p-1.5 rounded-[6px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
