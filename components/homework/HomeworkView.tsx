'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkStatus, HomeworkPriority } from '@/lib/types';
import { HomeworkCard } from './HomeworkCard';
import { HomeworkDetailModal } from './HomeworkDetailModal';
import { AddHomeworkModal } from './AddHomeworkModal';
import { HomeworkScanModal } from './HomeworkScanModal';
import { ClassroomBridgeCard } from '@/components/classroom/ClassroomBridgeCard';
import { ProposedBatchTasksVoting } from './ProposedBatchTasksVoting';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Sparkles, Search, CheckSquare, X, Check } from '@/components/ui/icons';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { PLAY_STORE_URL } from '@/lib/shareUtils';

export const HomeworkView: React.FC = () => {
  const {
    homework,
    subjects,
    toggleHomeworkStatus,
    updateHomework,
    deleteHomework,
    showToast,
    profile,
    isBatchCR,
    isBatchPilot,
  } = useApp();

  const isPilot =
    (isBatchCR || isBatchPilot || profile?.role === 'cr') &&
    profile?.isBatchSynced &&
    !!profile?.batchKey;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HomeworkStatus>('Not Started');
  const [priorityFilter, setPriorityFilter] = useState<'All' | HomeworkPriority>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [editHomework, setEditHomework] = useState<Homework | null>(null);
  const [selectedDetailHomework, setSelectedDetailHomework] = useState<Homework | null>(null);
  const [prefilledData, setPrefilledData] = useState<Partial<Homework> | null>(null);

  React.useEffect(() => {
    const handleTaskParam = (taskParam: string) => {
      // If on Android mobile browser, try to launch app natively, fallback to web view
      const ua = navigator.userAgent;
      const isAndroidBrowser = /Android/i.test(ua) && !Capacitor.isNativePlatform();
      
      if (isAndroidBrowser) {
        const intentUrl = `intent://task?task=${taskParam}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
        // Clear param so if fallback hits we just show the task in web without endless loop
        const fallbackUrl = new URL(window.location.href);
        fallbackUrl.searchParams.delete('task');
        window.history.replaceState({}, '', fallbackUrl);
        
        window.location.href = intentUrl;
        return;
      }

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
    };

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const taskParam = params.get('task');
      if (taskParam) {
        handleTaskParam(taskParam);
      }

      // Listen for task intents while already mounted
      const intentListener = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          handleTaskParam(customEvent.detail);
        }
      };
      window.addEventListener('app_task_intent', intentListener);
      return () => window.removeEventListener('app_task_intent', intentListener);
    }
  }, []);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Auto-purge stale assignments older than 3 days post-deadline
  const isPastThreeDays = (hw: Homework) => {
    if (!hw.deadline) return false;
    const dl = new Date(hw.deadline).getTime();
    if (isNaN(dl)) return false;
    return Date.now() - dl > 3 * 24 * 60 * 60 * 1000;
  };

  React.useEffect(() => {
    const stale = homework.filter(isPastThreeDays);
    if (stale.length > 0) {
      stale.forEach((st) => deleteHomework(st.id));
    }
  }, [homework, deleteHomework]);

  const activeHomework = homework.filter((h) => !isPastThreeDays(h));

  const filtered = activeHomework.filter((hw) => {
    // Search query match
    if (
      searchQuery &&
      !hw.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !hw.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    // Status filter (only To Do, Doing, Done)
    if (hw.status !== statusFilter) {
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

  const pendingCount = activeHomework.filter((h) => h.status !== 'Completed').length;
  const completedCount = activeHomework.filter((h) => h.status === 'Completed').length;

  const filterTabs = [
    { id: 'Not Started', label: 'To Do', count: activeHomework.filter((h) => h.status === 'Not Started').length },
    { id: 'In Progress', label: 'Doing', count: activeHomework.filter((h) => h.status === 'In Progress').length },
    { id: 'Completed', label: 'Done', count: completedCount },
  ] as const;

  const dueTodayTask = activeHomework.find((h) => {
    if (h.status === 'Completed' || !h.deadline) return false;
    const diffDays = Math.ceil((new Date(h.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays <= 0;
  });

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
      const shareText = `Here is a task I shared with you from Intersemester.\n\n📲 Download App on Play Store: ${PLAY_STORE_URL}`;
      
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
        showToast('Copied', 'Task share link copied to clipboard!', 'success');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError' && e.message !== 'Share canceled') {
        console.error('Share error:', e);
      }
    }
  };

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-4xl mx-auto w-full min-h-[70vh] pb-f7">
      {/* Editorial Stacked Header — matches Weekly Timetable style */}
      <div className="flex flex-col gap-f4">
        {/* Large stacked heading with badge inline */}
        <div>
          <h2 className="page-title">
            Assignments,<br />Labs,<br />Deadlines
          </h2>
          <div className="flex items-center gap-3 mt-5">
            <span className="tag bg-surface">
              {pendingCount} pending
            </span>
          </div>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-md">
            Manage your assignments, project submissions, and daily priorities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="page-actions mb-1">
          <button
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New assignment
          </button>

          <button
            onClick={() => setShowScanModal(true)}
            className="btn btn-secondary"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
        </div>
      </div>

      {isPilot && <ClassroomBridgeCard />}

      <ProposedBatchTasksVoting />

      {/* AI Deadline Check-in Card (Proactive Prompt) */}
      {dueTodayTask && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border border-line bg-surface-2 gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-fg leading-tight">
                Hey! Did you complete <span className="font-bold underline">"{dueTodayTask.title}"</span>?
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Marked due today. Let us know so your timetable stays updated.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => {
                updateHomework(dueTodayTask.id, {
                  status: 'Completed',
                  completedAt: new Date().toISOString(),
                });
                showToast('Completed', `"${dueTodayTask.title}" marked as complete! 🎉`, 'success');
              }}
              className="px-3 h-9 text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3 stroke-[3]" /> Yes, Done
            </button>
            <button
              onClick={() => {
                updateHomework(dueTodayTask.id, { status: 'In Progress' });
                showToast('In Progress', 'Marked as Doing ⏳', 'info');
              }}
              className="px-2.5 h-9 text-[13px] font-semibold border border-line text-muted hover:bg-surface-2 cursor-pointer"
            >
              Still Doing
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full">
        <div className="flex items-center gap-3 px-4 h-12 bg-surface border border-line focus-within:border-line-strong transition-colors">
          <Search className="w-[18px] h-[18px] text-muted shrink-0" />
          <input
            type="text"
            placeholder="Search assignments"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search assignments" className="w-full bg-transparent text-[15px] text-fg placeholder:text-[#6B6B6B] dark:placeholder:text-[#A1A1AA] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-none text-[#6B6B6B] hover:text-fg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Only 3: TO DO, DOING, DONE) */}
      <div role="tablist" aria-label="Task status" className="grid grid-cols-3 w-full mt-1 border border-line bg-surface">
        {filterTabs.map((tab, idx) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setStatusFilter(tab.id as HomeworkStatus)}
              className={`h-11 flex items-center justify-center gap-2 text-[14px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                idx > 0 ? 'border-l border-line-soft' : ''
              } ${
                isSelected
                  ? 'bg-ink text-on-ink font-semibold'
                  : 'text-fg hover:bg-surface-2'
              }`}
            >
              <span className="capitalize">{tab.label.toLowerCase()}</span>
              <span className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[12px] font-semibold tabular-nums ${
                isSelected ? 'bg-white/20 dark:bg-black/10' : 'bg-black/[0.05] dark:bg-white/[0.08] text-muted'
              }`}>
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
            illustration={searchQuery ? 'search' : 'trophy'}
            title={searchQuery ? 'No matches' : 'All caught up'}
            note={!searchQuery && pendingCount === 0 ? 'Nothing pending. Go enjoy your evening!' : undefined}
            description={
              searchQuery
                ? 'No assignments match your search.'
                : 'Nothing due right now. Add one to keep track of it.'
            }
            actionLabel="Add assignment"
            onAction={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] mt-2">
          {filtered.map((hw, index) => (
            <HomeworkCard
              key={hw.id}
              index={index}
              homework={hw}
              subject={subjectMap.get(hw.subjectId)}
              onToggleStatus={toggleHomeworkStatus}
              onEdit={(h) => {
                setEditHomework(h);
                setShowAddModal(true);
              }}
              onViewDetail={(h) => setSelectedDetailHomework(h)}
              onDelete={deleteHomework}
              onShare={handleShareTask}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <HomeworkDetailModal
        isOpen={Boolean(selectedDetailHomework)}
        onClose={() => setSelectedDetailHomework(null)}
        homework={
          selectedDetailHomework
            ? homework.find((h) => h.id === selectedDetailHomework.id) || selectedDetailHomework
            : null
        }
        onEdit={(h) => {
          setSelectedDetailHomework(null);
          setEditHomework(h);
          setShowAddModal(true);
        }}
        onDelete={(id) => {
          setSelectedDetailHomework(null);
          deleteHomework(id);
        }}
        onShare={handleShareTask}
      />

      <AddHomeworkModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPrefilledData(null);
        }}
        homeworkToEdit={editHomework || undefined}
        prefilledData={prefilledData || undefined}
      />

      <HomeworkScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
      />
    </div>
  );
};
