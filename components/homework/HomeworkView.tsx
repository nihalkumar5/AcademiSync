'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkStatus, HomeworkPriority } from '@/lib/types';
import { HomeworkCard } from './HomeworkCard';
import { HomeworkDetailModal } from './HomeworkDetailModal';
import { AddHomeworkModal } from './AddHomeworkModal';
import { HomeworkScanModal } from './HomeworkScanModal';
import { GoogleClassroomSyncModal } from './GoogleClassroomSyncModal';
import {
  getStoredClassroomToken,
  checkUnimportedClassroomAssignments,
  getClassroomConnectionInfo,
} from '@/lib/googleClassroom';
import { ProposedBatchTasksVoting } from './ProposedBatchTasksVoting';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Sparkles, Search, CheckSquare, X, GraduationCap, ArrowRight, Check } from 'lucide-react';
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
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomConnected, setClassroomConnected] = useState(false);
  const [editHomework, setEditHomework] = useState<Homework | null>(null);
  const [selectedDetailHomework, setSelectedDetailHomework] = useState<Homework | null>(null);
  const [prefilledData, setPrefilledData] = useState<Partial<Homework> | null>(null);
  const [pilotPendingCount, setPilotPendingCount] = useState<number | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = getClassroomConnectionInfo();
      setClassroomConnected(info.isConnected);
    }
  }, [showClassroomModal]);

  // On-Open check for Batch Pilot
  React.useEffect(() => {
    if (!isPilot) return;

    const token = getStoredClassroomToken();
    if (!token) return;

    // Rate-limit silent check to once every 15 mins per session
    const lastCheck = Number(sessionStorage.getItem('last_classroom_pilot_check') || '0');
    if (Date.now() - lastCheck < 15 * 60 * 1000) return;

    let mounted = true;
    sessionStorage.setItem('last_classroom_pilot_check', Date.now().toString());

    checkUnimportedClassroomAssignments(token, subjects, homework)
      .then((items) => {
        if (mounted && items.length > 0) {
          setPilotPendingCount(items.length);
          showToast(
            'New Classroom Tasks',
            `Found ${items.length} new unbroadcasted assignment(s) for your batch.`,
            'info'
          );
        }
      })
      .catch((err) => {
        console.warn('Classroom silent check error:', err);
      });

    return () => {
      mounted = false;
    };
  }, [isPilot, subjects, homework, showToast]);

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
    <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full min-h-[70vh] pb-36 sm:pb-28">
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
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center justify-center h-[36px] px-[14px] rounded-none border border-[#D9D9D6] dark:border-white/[0.1] text-[#111111] dark:text-[#F4F4F6] bg-transparent hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors text-[12px] font-semibold cursor-pointer w-auto gap-2"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>

          <button
            onClick={() => setShowClassroomModal(true)}
            className={`flex items-center justify-center h-[36px] px-[14px] rounded-none border text-[#111111] dark:text-[#F4F4F6] transition-colors text-[12px] font-semibold cursor-pointer w-auto gap-2 ${
              classroomConnected
                ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                : 'border-[#D9D9D6] dark:border-white/[0.1] bg-transparent hover:bg-black/5 dark:hover:bg-white/[0.06]'
            }`}
          >
            {classroomConnected ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{classroomConnected ? 'Classroom Synced' : 'Classroom Sync'}</span>
            {isPilot && (
              <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase">
                PILOT
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setEditHomework(null);
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-1.5 h-[36px] px-[14px] rounded-none bg-[#111111] text-[#FFFFFF] dark:bg-white dark:text-[#090A0C] hover:opacity-90 transition-opacity text-[12px] font-semibold cursor-pointer w-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Task
          </button>
        </div>
      </div>

      {isPilot && (
        pilotPendingCount && pilotPendingCount > 0 ? (
          <div className="flex items-center justify-between p-3 border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-xs animate-in fade-in slide-in-from-top-1 w-full overflow-hidden">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#111111] dark:text-[#FFFFFF] text-[12.5px] leading-tight truncate">
                  📢 {pilotPendingCount} New Assignment{pilotPendingCount > 1 ? 's' : ''} Detected!
                </p>
                <p className="text-[#6B6B6B] dark:text-[#94A3B8] text-[11px] mt-0.5 truncate">
                  Ready to review and broadcast to your batch.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowClassroomModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 cursor-pointer shrink-0 ml-2 shadow-xs"
            >
              Review & Push <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 text-xs w-full overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-[#111111] dark:text-[#F4F4F6] text-[12px] leading-snug">
                <span className="font-bold">Pilot Bridge:</span> {classroomConnected ? 'Classroom connected. Broadcast assignments to your batch.' : 'Sync and broadcast Classroom assignments to your batch.'}
              </p>
            </div>
            <button
              onClick={() => setShowClassroomModal(true)}
              className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 border border-emerald-500/25 cursor-pointer shrink-0 ml-2"
            >
              Broadcast
            </button>
          </div>
        )
      )}

      <ProposedBatchTasksVoting />

      {/* AI Deadline Check-in Card (Proactive Prompt) */}
      {dueTodayTask && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-[12.5px] font-semibold text-[#111111] dark:text-[#FFFFFF] leading-tight">
                Hey! Did you complete <span className="font-bold underline">"{dueTodayTask.title}"</span>?
              </p>
              <p className="text-[11px] text-[#6B6B6B] dark:text-[#94A3B8] mt-0.5">
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
              className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3 stroke-[3]" /> Yes, Done
            </button>
            <button
              onClick={() => {
                updateHomework(dueTodayTask.id, { status: 'In Progress' });
                showToast('In Progress', 'Marked as Doing ⏳', 'info');
              }}
              className="px-2.5 py-1.5 text-[11px] font-semibold border border-black/10 dark:border-white/10 text-[#6B6B6B] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Still Doing
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full">
        <div className="flex items-center gap-3 px-4 py-2.5 h-[44px] rounded-none bg-white dark:bg-[#121317] border border-[#D9D9D6] dark:border-white/[0.08] shadow-xs">
          <Search className="w-4 h-4 text-[#6F6F6F] dark:text-[#94A3B8] shrink-0" />
          <input
            type="text"
            placeholder="Search assignments, topics, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] placeholder:text-[#6F6F6F] dark:placeholder:text-[#64748B] focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-none text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Only 3: TO DO, DOING, DONE) */}
      <div className="flex items-center w-full mt-4 mb-2 h-[44px] border-b border-[#D9D9D6] dark:border-white/[0.08]">
        {filterTabs.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as HomeworkStatus)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 h-full text-[11px] font-semibold tracking-[1px] uppercase transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'text-[#111111] dark:text-[#F4F4F6]'
                  : 'text-[#6F6F6F] dark:text-[#94A3B8] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[11px] font-bold">{tab.count}</span>
              {isSelected && (
                <span className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-[38px] h-[2px] bg-[#111111] dark:bg-[#F4F4F6]" />
              )}
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

      <GoogleClassroomSyncModal
        isOpen={showClassroomModal}
        onClose={() => setShowClassroomModal(false)}
      />
    </div>
  );
};
