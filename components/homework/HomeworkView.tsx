'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkStatus, HomeworkPriority } from '@/lib/types';
import { HomeworkCard } from './HomeworkCard';
import { AddHomeworkModal } from './AddHomeworkModal';
import { HomeworkScanModal } from './HomeworkScanModal';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Sparkles, Search, CheckSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const filterTabs = [
    { id: 'All', label: 'All', count: homework.length },
    { id: 'Not Started', label: 'To Do', count: homework.filter((h) => h.status === 'Not Started').length },
    { id: 'In Progress', label: 'Doing', count: homework.filter((h) => h.status === 'In Progress').length },
    { id: 'Completed', label: 'Done', count: completedCount },
  ] as const;

  return (
    <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full pb-10">
      {/* Mobile-App Styled Top Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 sm:pt-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tighter text-black dark:text-white">
              Tasks & To-Do
            </h1>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-none border border-black dark:border-white text-black dark:text-white">
              {pendingCount} pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-black/70 dark:text-white/70 mt-1 font-medium">
            Manage your assignments, project submissions, and daily priorities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-semibold cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-current" />
            <span>AI Scanner</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-none bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </motion.button>
        </div>
      </div>

      {/* iOS Style Rounded Search Bar */}
      <div className="relative w-full">
        <div className="flex items-center gap-3 px-4 py-3 rounded-none bg-white dark:bg-zinc-950 border border-black dark:border-white">
          <Search className="w-4 h-4 text-black/50 dark:text-white/50 shrink-0" />
          <input
            type="text"
            placeholder="Search assignments, topics, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-none text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Pill Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {filterTabs.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-none'
                  : 'bg-white text-black/70 border-black/20 hover:border-black dark:bg-zinc-950 dark:text-white/70 dark:border-white/20 dark:hover:border-white'
              }`}
            >
              <span className="relative z-10">{tab.label}</span>
              <span
                className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-none border ${
                  isSelected
                    ? 'bg-white text-black border-white dark:bg-black dark:text-white dark:border-black'
                    : 'bg-black/5 dark:bg-white/5 border-transparent opacity-75'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 px-4">
          <EmptyState
            icon={<CheckSquare className="w-5 h-5 text-[#8C6B5D]" />}
            title="All caught up!"
            description={
              searchQuery
                ? 'No tasks matched your search query.'
                : 'You have no pending assignments in this view. Great job!'
            }
            actionLabel="Create Task"
            onAction={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
          />
        </div>
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
