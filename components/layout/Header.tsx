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
  User,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
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
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-4 bg-[#FAFAF8]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/10 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 select-none">
          <h1 className="text-xl sm:text-2xl text-[#1A1918] dark:text-[#F4F1EA] tracking-tighter font-sans">
            <span className="font-extrabold">inter</span>
            <span className="font-normal opacity-80">semester</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-sm font-medium tracking-tight text-black dark:text-white">
          {/* Live Clock Pill */}
          {currentTime && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-white text-xs font-mono">
              <span className="w-2 h-2 bg-black dark:bg-white animate-pulse" />
              <span>{currentTime}</span>
            </div>
          )}

          {/* Quick Search Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-2 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title="Open Command Palette (⌘K)"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] font-mono border border-current px-1 py-0.5 opacity-60">
              ⌘K
            </kbd>
          </button>

          {/* Quick Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 border border-transparent hover:border-black dark:hover:border-white transition-all"
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* User Account Button for Mobile & Desktop */}
          <div className="flex items-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#8C6B5D] hover:bg-[#785B4E] text-white transition-all cursor-pointer shadow-2xs">
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setActiveView('notifications')}
            className="relative p-1.5 border border-transparent hover:border-black dark:hover:border-white transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </button>
          
          {/* Quick Create Dropdown */}
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="flex items-center justify-center p-1.5 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black hover:bg-transparent hover:text-black dark:hover:text-white transition-colors"
            >
              <Plus className={`w-4 h-4 transition-transform ${addMenuOpen ? 'rotate-45' : ''}`} />
            </button>

            {addMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-black border border-black dark:border-white shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)] py-2 z-50 text-left">
                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowAddHwModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-left"
                  >
                    <CheckSquare className="w-4 h-4" />
                    New Homework
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowHwScanModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-left"
                  >
                    <Sparkles className="w-4 h-4" />
                    Scan Homework (AI)
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowAddCarryModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-left"
                  >
                    <Backpack className="w-4 h-4" />
                    Add Bag Item
                  </button>

                  <div className="my-1 border-t border-black dark:border-white mx-0" />

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowTimetableImportModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-left"
                  >
                    <Upload className="w-4 h-4" />
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
