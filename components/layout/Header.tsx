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
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-4 bg-transparent">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl text-black dark:text-white tracking-tighter font-medium">
            intersemester
          </h1>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium tracking-tight text-black dark:text-white">
          <button onClick={() => setCommandPaletteOpen(true)} className="hover:underline">Search</button>
          <button onClick={toggleTheme} className="hover:underline">Theme</button>
          <button onClick={() => setActiveView('notifications')} className="hover:underline relative">
            Alerts
            {unreadNotifs > 0 && <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-black dark:bg-white rounded-full"></span>}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="hover:underline"
            >
              New
            </button>

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
