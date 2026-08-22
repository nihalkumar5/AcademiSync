'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Plus,
  Calendar,
  CheckSquare,
  Backpack,
  Upload,
  Sparkles,
  Sun,
  Moon,
  Clock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '../ui/Button';
import { IntersemesterMonogram } from '../ui/IntersemesterLogo';
import { AddHomeworkModal } from '../homework/AddHomeworkModal';
import { AddCustomItemModal } from '../carry/AddCustomItemModal';
import { TimetableImportModal } from '../timetable/TimetableImportModal';
import { HomeworkScanModal } from '../homework/HomeworkScanModal';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    notifications,
    settings,
    updateSettings,
    setCommandPaletteOpen,
  } = useApp();

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showAddHwModal, setShowAddHwModal] = useState(false);
  const [showAddCarryModal, setShowAddCarryModal] = useState(false);
  const [showTimetableImportModal, setShowTimetableImportModal] = useState(false);
  const [showHwScanModal, setShowHwScanModal] = useState(false);

  // Header Real-time live clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const viewTitles: Record<string, string> = {
    home: 'Home Dashboard',
    timetable: 'Weekly Timetable',
    exams: 'Exam Timetable',
    homework: 'Homework & Tasks',
    carry: "Tomorrow's Schedule & Bag",
    subjects: 'Subject Directory',
    calendar: 'Academic Calendar',
    notifications: 'Notification Inbox',
    settings: 'Settings & Profile',
  };

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-zinc-800/60 shadow-sm">
        <div className="flex items-center gap-2.5">
          <IntersemesterMonogram size={28} />
          <h1 className="text-lg sm:text-xl text-[#0F172A] dark:text-zinc-100 tracking-tight font-sans">
            <span className="font-extrabold">Inter</span>
            <span className="font-medium text-slate-600 dark:text-slate-400">semester</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock Pill */}
          {currentTime && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 text-xs font-mono font-bold text-slate-700 dark:text-zinc-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
              <span>{currentTime}</span>
            </div>
          )}

          {/* Quick Search Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 text-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
            title="Open Command Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Quick Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all"
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setActiveView('notifications')}
            className="relative p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6366F1] ring-2 ring-white dark:ring-zinc-950 animate-pulse" />
            )}
          </button>

          {/* Quick Create Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setAddMenuOpen((prev) => !prev)}
              className="gap-1.5 px-3.5 rounded-xl shadow-sm bg-[#6366F1] hover:bg-[#4F46E5] text-white border-none font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Create</span>
            </Button>

            {addMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-[#0F172A]/95 dark:bg-[#1E1B4B]/95 backdrop-blur-xl border border-indigo-400/20 shadow-2xl shadow-indigo-950/30 py-2 z-50 text-left overflow-hidden">
                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowAddHwModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <CheckSquare className="w-4 h-4 text-indigo-300" />
                    New Homework
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowHwScanModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    Scan Homework (AI)
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowAddCarryModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Backpack className="w-4 h-4 text-emerald-300" />
                    Add Bag Item
                  </button>

                  <div className="my-1 border-t border-slate-700/50 mx-3" />

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowTimetableImportModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Upload className="w-4 h-4 text-amber-300" />
                    Import Timetable (AI)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <AddHomeworkModal isOpen={showAddHwModal} onClose={() => setShowAddHwModal(false)} />
      <AddCustomItemModal isOpen={showAddCarryModal} onClose={() => setShowAddCarryModal(false)} />
      <TimetableImportModal isOpen={showTimetableImportModal} onClose={() => setShowTimetableImportModal(false)} />
      <HomeworkScanModal isOpen={showHwScanModal} onClose={() => setShowHwScanModal(false)} />
    </>
  );
};
