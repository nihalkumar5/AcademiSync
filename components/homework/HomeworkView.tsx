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
      <div className="flex flex-col gap-6 mt-8 mb-4">
        <div>
          <h2 className="text-5xl sm:text-7xl font-medium text-black dark:text-white tracking-tighter leading-[1.1]">
            Homework,<br />
            Projects,<br />
            Assignments,<br />
            To-Do
          </h2>
          <p className="text-lg text-black/70 dark:text-white/70 mt-6 max-w-sm leading-snug">
            Keep track of submissions, project deadlines, and lab journal writeups. You have {pendingCount} pending tasks.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowScanModal(true)}
            className="rounded-none border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            AI Scanner
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="rounded-none bg-black text-white dark:bg-white dark:text-black border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors"
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-y border-black dark:border-white">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-5 h-5 text-black dark:text-white absolute left-0 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-base bg-transparent border-none text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto">
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
                  'text-lg font-medium shrink-0 transition-colors flex items-center gap-2',
                  isSelected
                    ? 'text-black dark:text-white underline decoration-2 underline-offset-4'
                    : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                )}
              >
                <span>{status}</span>
                <span className="text-sm">({count})</span>
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
