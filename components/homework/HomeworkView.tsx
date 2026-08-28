'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkStatus, HomeworkPriority } from '@/lib/types';
import { HomeworkCard } from './HomeworkCard';
import { AddHomeworkModal } from './AddHomeworkModal';
import { HomeworkScanModal } from './HomeworkScanModal';
import { ProposedBatchTasksVoting } from './ProposedBatchTasksVoting';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Sparkles, Search, CheckSquare, X } from 'lucide-react';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

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
  const [prefilledData, setPrefilledData] = useState<Partial<Homework> | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const taskParam = params.get('task');
      if (taskParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(taskParam)));
          setPrefilledData({
            subjectName: decoded.s || '',
            title: decoded.t || '',
            description: decoded.d || '',
            deadline: decoded.dl || new Date().toISOString(),
            priority: decoded.p || 'Medium',
            status: 'Not Started',
          });
          setEditHomework(null);
          setShowAddModal(true);
          
          // Remove the task from URL
          const url = new URL(window.location.href);
          url.searchParams.delete('task');
          window.history.replaceState({}, '', url);
        } catch (e) {
          console.error('Failed to parse shared task:', e);
        }
      }
    }
  }, []);

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

  const handleShareTask = async (hw: Homework) => {
    const shareData = {
      t: hw.title,
      d: hw.description,
      p: hw.priority,
      dl: hw.deadline,
      s: hw.subjectName,
    };
    try {
      const b64 = btoa(encodeURIComponent(JSON.stringify(shareData)));
      const shareUrl = `${window.location.origin}/?task=${b64}`;
      const shareTitle = `Task: ${hw.title}`;
      const shareText = `Here is a task I shared with you from AcademiSync.`;
      
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
          dialogTitle: 'Share Task',
        });
      } else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Task share link copied to clipboard!'); // Basic fallback
      }
    } catch (e: any) {
      if (e.name !== 'AbortError' && e.message !== 'Share canceled') {
        console.error('Share error:', e);
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full pb-10">
      {/* Editorial Stacked Header — matches Weekly Timetable style */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        {/* Large stacked heading with badge inline */}
        <div>
          <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
            Tasks,<br />To-Do,<br />Pending
          </h2>
          <div className="flex items-center gap-3 mt-5">
            <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-black dark:text-white uppercase tracking-wider">
              {pendingCount} pending
            </span>
          </div>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-md">
            Manage your assignments, project submissions, and daily priorities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowScanModal(true)}
            className="flex items-center px-5 py-3 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-sm font-medium cursor-pointer"
          >
            Magic Scanner
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-none border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 text-sm font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Task
          </motion.button>
        </div>
      </div>

      <ProposedBatchTasksVoting />

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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filterTabs.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as 'All' | HomeworkStatus)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 ${
                isSelected
                  ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] dark:bg-white dark:text-black dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]'
                  : 'rounded-none bg-white text-black/70 border-black/20 hover:border-black dark:bg-zinc-950 dark:text-white/70 dark:border-white/20 dark:hover:border-white'
              }`}
            >
              <span className="relative z-10">{tab.label}</span>
              <span
                className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-none border ${
                  isSelected
                    ? 'bg-white/20 text-white border-white/30'
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
            icon={<MonochromeIllustration type="no-homework" size={48} />}
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
              onShare={handleShareTask}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddHomeworkModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPrefilledData(null);
        }}
        homeworkToEdit={editHomework}
        prefilledData={prefilledData}
      />

      <HomeworkScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
      />
    </div>
  );
};
