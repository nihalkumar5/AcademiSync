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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1918] dark:text-[#F4F1EA]">
              Tasks & To-Do
            </h1>
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-[#8C6B5D]/15 text-[#8C6B5D] dark:text-[#CBB5A1] dark:bg-[#8C6B5D]/30">
              {pendingCount} pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C] mt-1 font-medium">
            Manage your assignments, project submissions, and daily priorities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#EFEAE2]/80 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#322F2C] text-xs font-semibold text-[#5C4D40] dark:text-[#D1C7BD] hover:bg-[#EAE3DA] transition-all shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#8C6B5D]" />
            <span>AI Scanner</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8C6B5D] hover:bg-[#7A5B4D] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </motion.button>
        </div>
      </div>

      {/* iOS Style Rounded Search Bar */}
      <div className="relative w-full">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F0EBE2]/70 dark:bg-[#1C1B19] border border-[#E0D7CB] dark:border-[#2C2926] shadow-2xs">
          <Search className="w-4 h-4 text-[#8C7D70] dark:text-[#7A726A] shrink-0" />
          <input
            type="text"
            placeholder="Search assignments, topics, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#1A1918] dark:text-[#F4F1EA] placeholder:text-[#9A8D80] dark:placeholder:text-[#6C665F] focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-[#8C7D70] hover:text-[#1A1918] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Pill Tabs Filter */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#EFEAE2]/60 dark:bg-[#1E1C1A] border border-[#E0D7CB]/70 dark:border-[#2C2926] overflow-x-auto no-scrollbar">
        {filterTabs.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'text-[#1A1918] dark:text-white'
                  : 'text-[#7A6D61] dark:text-[#8E867E] hover:text-[#1A1918] dark:hover:text-white'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeTaskTab"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 bg-white dark:bg-[#2B2825] rounded-xl shadow-xs border border-[#DDD3C6] dark:border-[#383430]"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              <span
                className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isSelected
                    ? 'bg-[#EFEAE2] dark:bg-[#1C1B19] text-[#7A6D61] dark:text-[#C7BDB3]'
                    : 'bg-black/5 dark:bg-white/5 opacity-75'
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
