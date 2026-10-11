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
      {/* Minimal Header */}
      <div className="flex items-center justify-between gap-3 pt-2 sm:pt-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              Faculty Hub · {linkedBatches.length} {linkedBatches.length === 1 ? 'Batch' : 'Batches'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight mt-0.5">
            Assignments
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs sm:text-sm flex items-center gap-1.5 hover:opacity-85 active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Micro-metrics Row */}
      <div className="flex items-center gap-2 text-xs font-mono text-black/60 dark:text-white/60">
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
          {activeCount} Active
        </span>
        <span>·</span>
        <span>{assignments.length} Total</span>
        {dueSoonCount > 0 && (
          <>
            <span>·</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{dueSoonCount} Due Soon</span>
          </>
        )}
      </div>

      {/* Unified Search & Segmented Filter Bar */}
      <div className="flex flex-col gap-2.5">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-black/40 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments, topics, or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#111215] text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Status Pill Bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All', count: assignments.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'due_soon', label: 'Due Soon', count: dueSoonCount },
            { id: 'overdue', label: 'Past Due', count: overdueCount },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
                  isActive
                    ? 'bg-white text-black dark:bg-[#1C1E24] dark:text-white shadow-2xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-60">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Batch Pills (if multiple batches connected) */}
        {linkedBatches.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedBatchFilter('all')}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap',
                selectedBatchFilter === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
              )}
            >
              All Batches
            </button>
            {linkedBatches.map((batch) => {
              const bLabel = formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch;
              const isSel = selectedBatchFilter === batch.batchKey;
              return (
                <button
                  key={batch.batchKey}
                  type="button"
                  onClick={() => setSelectedBatchFilter(batch.batchKey)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    isSel
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
                  )}
                >
                  {bLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Cards List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-black/50 dark:text-white/50">
            Loading assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] flex flex-col items-center justify-center p-6 gap-2">
            <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/40 dark:text-white/40">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-black dark:text-white">
              {assignments.length === 0 ? 'No Assignments Published' : 'No Matching Assignments'}
            </span>
            <p className="text-xs text-black/50 dark:text-white/50 max-w-xs">
              {assignments.length === 0
                ? 'Create an assignment to broadcast submission deadlines to students.'
                : 'Try clearing your search query or filter.'}
            </p>
            {assignments.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 px-3.5 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
              >
                + New Assignment
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBatchFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-1 text-xs font-semibold text-black dark:text-white underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredAssignments.map((task) => {
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

            return (
              <div
                key={task.id}
                className="p-4 sm:p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#111215] flex flex-col gap-3 transition-all hover:border-black/20 dark:hover:border-white/20 shadow-2xs"
              >
                {/* Header: Batch Tag, Subject, Deadline, Priority, Delete */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Batch Pill */}
                    <span className="px-2 py-0.5 rounded-[5px] text-xs font-mono font-bold uppercase bg-black text-white dark:bg-white dark:text-black">
                      {batchLabel}
                    </span>

                    {/* Subject */}
                    <span className="px-2 py-0.5 rounded-[5px] text-xs font-semibold bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                      {task.subjectName || 'Coursework'}
                    </span>

                    {/* Priority if High */}
                    {task.priority === 'High' && (
                      <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 uppercase">
                        High Priority
                      </span>
                    )}

                    {/* Deadline */}
                    <span className="text-[11px] font-mono text-black/50 dark:text-white/50 flex items-center gap-1">
                      <Calendar className="w-3 h-3 opacity-60" />
                      <span>Due {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {diffDays <= 2 && diffDays >= 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">({diffDays}d left)</span>
                      )}
                      {isOverdue && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">(Past Due)</span>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAssignment(task)}
                    className="p-1 rounded-md text-black/30 dark:text-white/30 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                    title="Delete Assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Assignment Title & Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-black dark:text-white leading-snug">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 mt-1 leading-relaxed break-words">
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
                      className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
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
                        className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 transition-colors text-[11px] font-medium"
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
                      className="px-2.5 py-1 rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Share to WhatsApp"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>

                    {/* Track Reads Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => setSelectedTaskForTracking(task)}
                      className="px-2.5 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-1"
                    >
                      <span>Track</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
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
