'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkStatus, HomeworkPriority } from '@/lib/types';
import { HomeworkCard } from './HomeworkCard';
import { AddHomeworkModal } from './AddHomeworkModal';
import { HomeworkScanModal } from './HomeworkScanModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Sparkles, Search, CheckSquare, Filter, Layers } from 'lucide-react';
import { clsx } from 'clsx';

export const HomeworkView: React.FC = () => {
  const {
    homework,
    subjects,
    toggleHomeworkStatus,
    deleteHomework,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | HomeworkStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | HomeworkPriority>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [editHomework, setEditHomework] = useState<Homework | null>(null);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const filtered = homework.filter((hw) => {
    // Search query match
    if (
      searchQuery &&
      !hw.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !hw.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'All' && hw.status !== statusFilter) {
      return false;
    }
    // Priority filter
    if (priorityFilter !== 'All' && hw.priority !== priorityFilter) {
      return false;
    }
    // Subject filter
    if (subjectFilter !== 'All' && hw.subjectId !== subjectFilter) {
      return false;
    }
    return true;
  });

  const pendingCount = homework.filter((h) => h.status !== 'Completed').length;
  const completedCount = homework.filter((h) => h.status === 'Completed').length;

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Homework & Assignments
            </h2>
            <Badge variant="neutral" size="sm">
              {pendingCount} pending
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Keep track of submissions, project deadlines, and lab journal writeups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScanModal(true)}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>AI Scanner</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Not Started', 'In Progress', 'Completed'] as const).map((status) => {
            const count =
              status === 'All'
                ? homework.length
                : homework.filter((h) => h.status === status).length;
            const isSelected = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5',
                  isSelected
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                <span>{status}</span>
                <span
                  className={clsx(
                    'text-[10px] font-mono rounded-full px-1.5 py-0.2',
                    isSelected
                      ? 'bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Homework Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-5 h-5 text-zinc-400" />}
          title="No tasks match your filters"
          description={
            homework.length === 0
              ? "You don't have any homework tasks yet. Create one or scan an assignment sheet with AI."
              : 'Try clearing your search query or adjusting status filters.'
          }
          actionLabel="Create Task"
          onAction={() => {
            setEditHomework(null);
            setShowAddModal(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((hw) => (
            <HomeworkCard
              key={hw.id}
              homework={hw}
              subject={subjectMap.get(hw.subjectId)}
              onToggleStatus={toggleHomeworkStatus}
              onEdit={(h) => {
                setEditHomework(h);
                setShowAddModal(true);
              }}
              onDelete={deleteHomework}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddHomeworkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        homeworkToEdit={editHomework}
      />

      <HomeworkScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
      />
    </div>
  );
};
