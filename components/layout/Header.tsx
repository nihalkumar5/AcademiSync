'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { CalendarImportModal } from '../calendar/CalendarImportModal';

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    if (addMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [addMenuOpen]);
  const [showAddHwModal, setShowAddHwModal] = useState(false);
  const [showAddCarryModal, setShowAddCarryModal] = useState(false);
  const [showTimetableImportModal, setShowTimetableImportModal] = useState(false);
  const [showHwScanModal, setShowHwScanModal] = useState(false);
  const [showCalendarImportModal, setShowCalendarImportModal] = useState(false);

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
      <header
        className="sticky top-0 z-40 w-full flex items-center justify-center px-4 sm:px-8 bg-[#FAFAF8]/65 dark:bg-[#111110]/65 backdrop-blur-xl border-b border-[#D8D8D8]/40 dark:border-[#333333]/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 28px)',
          paddingBottom: '12px',
        }}
      >
        <div className="flex items-center justify-between w-full max-w-6xl mx-auto relative">
          <div className="flex items-center gap-3 select-none">
          {/* Logo only shown on mobile where sidebar is hidden */}
          <h1 className="md:hidden text-xl sm:text-2xl text-[#1A1918] dark:text-[#F4F1EA] tracking-tighter font-sans">
            <span className="font-extrabold">inter</span>
            <span className="font-normal opacity-80">semester</span>
          </h1>

          {/* Desktop Breadcrumb indicator so logo is never duplicated */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs">
            <span className="text-black/35 dark:text-white/35 uppercase">Workspace /</span>
            <span className="font-bold uppercase tracking-wider text-black dark:text-white">
              {viewTitles[activeView] || 'Dashboard'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 text-sm font-medium tracking-tight text-black dark:text-white">
          {/* Live Clock Pill */}
          {currentTime && (
            <div className="hidden lg:flex items-center gap-2 h-8 px-3 border border-[#D9D9D6] dark:border-[#333333] bg-black/[0.02] dark:bg-white/[0.03] text-[11.5px] font-mono text-[#555555] dark:text-[#AAAAAA] rounded-none">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="tracking-wide">{currentTime}</span>
            </div>
          )}

          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 h-8 px-2.5 sm:px-3 border border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-black/[0.02] dark:bg-white/[0.03] text-[#555555] dark:text-[#AAAAAA] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-all cursor-pointer rounded-none active:scale-95"
            title="Search (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[12px] font-medium">Search</span>
            <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 border border-[#D9D9D6] dark:border-[#444444] bg-black/5 dark:bg-white/5 opacity-75">
              ⌘K
            </kbd>
          </button>

          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hidden md:flex items-center justify-center w-8 h-8 border border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-black/[0.02] dark:bg-white/[0.03] text-[#111111] dark:text-[#FFFFFF] transition-all cursor-pointer rounded-none active:scale-95"
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Notifications Bell with Numeric Badge */}
          <button
            type="button"
            onClick={() => setActiveView('notifications')}
            className="relative flex items-center justify-center w-8 h-8 border border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-black/[0.02] dark:bg-white/[0.03] text-[#111111] dark:text-[#FFFFFF] transition-all cursor-pointer rounded-none active:scale-95"
            title={`Notifications (${unreadNotifs} unread)`}
          >
            <Bell className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF]" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-black dark:bg-white text-white dark:text-black font-mono text-[9px] font-bold flex items-center justify-center border border-[#FAFAF8] dark:border-[#111110] leading-none rounded-full">
                {unreadNotifs > 99 ? '99+' : unreadNotifs}
              </span>
            )}
          </button>
          
          {/* Quick Create Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="flex items-center justify-center w-8 h-8 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] hover:opacity-85 transition-all cursor-pointer rounded-none active:scale-95 shadow-xs"
              title="Add New Action"
            >
              <Plus className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${addMenuOpen ? 'rotate-45' : ''}`} />
            </button>

            {addMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setAddMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-[280px] sm:w-[320px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-2 z-50 text-left rounded-none">
                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowAddHwModal(true);
                    }}
                    className="flex items-center gap-4 w-full px-[18px] h-[56px] text-[16px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors text-left cursor-pointer"
                  >
                    <CheckSquare className="w-5 h-5" />
                    New Homework
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowHwScanModal(true);
                    }}
                    className="flex items-center gap-4 w-full px-[18px] h-[56px] text-[16px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors text-left cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    Scan Homework
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowAddCarryModal(true);
                    }}
                    className="flex items-center gap-4 w-full px-[18px] h-[56px] text-[16px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors text-left cursor-pointer"
                  >
                    <Backpack className="w-5 h-5" />
                    Add Bag Item
                  </button>

                  <div className="my-2 border-t border-[#D8D8D8] dark:border-[#333333] mx-0" />

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowTimetableImportModal(true);
                    }}
                    className="flex items-center gap-4 w-full px-[18px] h-[56px] text-[16px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors text-left cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                    Import Timetable
                  </button>

                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      setShowCalendarImportModal(true);
                    }}
                    className="flex items-center gap-4 w-full px-[18px] h-[56px] text-[16px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors text-left cursor-pointer"
                  >
                    <Calendar className="w-5 h-5" />
                    Import Academic Calendar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* Modals */}
      <AddHomeworkModal isOpen={showAddHwModal} onClose={() => setShowAddHwModal(false)} />
      <AddCustomItemModal isOpen={showAddCarryModal} onClose={() => setShowAddCarryModal(false)} />
      <TimetableImportModal isOpen={showTimetableImportModal} onClose={() => setShowTimetableImportModal(false)} />
      <HomeworkScanModal isOpen={showHwScanModal} onClose={() => setShowHwScanModal(false)} />
      <CalendarImportModal isOpen={showCalendarImportModal} onClose={() => setShowCalendarImportModal(false)} />
    </>
  );
};
