'use client';

import { Illustration } from '@/components/ui/Illustration';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BookOpen,
  Calendar,
  Bell,
  Settings,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  Command,
  GraduationCap,
  Users,
  Repeat,
  UserCheck,
} from '@/components/ui/icons';
import { useApp, ActiveView } from '@/context/AppContext';

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveView,
    settings,
    updateSettings,
    profile,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  const navigationCommands: {
    id: string;
    title: string;
    category: string;
    icon: React.ReactNode;
    action: () => void;
  }[] = [
    {
      id: 'nav_home',
      title: 'Home Dashboard',
      category: 'Navigation',
      icon: <LayoutDashboard className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('home');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_timetable',
      title: 'Weekly Timetable',
      category: 'Navigation',
      icon: <CalendarDays className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('timetable');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_homework',
      title: 'Homework & Tasks',
      category: 'Navigation',
      icon: <CheckSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('homework');
        setCommandPaletteOpen(false);
      },
    },
    ...(profile?.role === 'faculty'
      ? [
          {
            id: 'nav_carry',
            title: 'My Batches & Classes',
            category: 'Navigation',
            icon: <Users className="w-[18px] h-[18px]" strokeWidth={1.5} />,
            action: () => {
              setActiveView('carry');
              setCommandPaletteOpen(false);
            },
          },
        ]
      : []),
    {
      id: 'nav_attendance',
      title: profile?.role === 'faculty' ? 'Take Attendance' : 'My Attendance',
      category: 'Navigation',
      icon: <UserCheck className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('attendance');
        setCommandPaletteOpen(false);
      },
    },
    ...(profile?.role === 'faculty'
      ? []
      : [
          {
            id: 'nav_faculty',
            title: 'Campus Faculty',
            category: 'Navigation',
            icon: <GraduationCap className="w-[18px] h-[18px]" strokeWidth={1.5} />,
            action: () => {
              setActiveView('faculty');
              setCommandPaletteOpen(false);
            },
          },
        ]),
    {
      id: 'nav_routines',
      title: 'Routines & Reminders',
      category: 'Navigation',
      icon: <Repeat className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('routines');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_calendar',
      title: 'Academic Calendar',
      category: 'Navigation',
      icon: <Calendar className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('calendar');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_mess',
      title: 'Mess Menu',
      category: 'Navigation',
      icon: <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('mess');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_exams',
      title: 'Exam Timetable',
      category: 'Navigation',
      icon: <GraduationCap className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('exams');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_subjects',
      title: 'Subject Directory',
      category: 'Navigation',
      icon: <BookOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('subjects');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_notifications',
      title: 'Notification Inbox',
      category: 'Navigation',
      icon: <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('notifications');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_settings',
      title: 'Settings & Profile',
      category: 'Navigation',
      icon: <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        setActiveView('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act_theme',
      title: `Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Preferences',
      icon: settings.theme === 'dark' ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.5} />,
      action: () => {
        updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filtered = navigationCommands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-16 sm:pt-24 p-4 select-none font-sans">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm"
          />

          {/* Minimalist Spotlight Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] bg-[#FCFCFA] dark:bg-[#121317] border border-[#EAEAE6] dark:border-white/[0.08] rounded-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden z-10 text-left flex flex-col"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 h-[48px] sm:h-[50px] border-b border-line-soft bg-[#FCFCFA] dark:bg-[#121317]">
              <Search className="w-[18px] h-[18px] text-[#8A8A88] dark:text-[#A1A1AA] shrink-0" strokeWidth={1.5} />
              
              <input
                autoFocus
                type="text"
                placeholder="Search pages, tools, commands..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-[15px] font-medium text-fg placeholder:text-[#8A8A88] dark:placeholder:text-[#71717A] focus:outline-none tracking-tight"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-none border border-[#E2E2DC] dark:border-white/10 bg-[#F2F2EE] dark:bg-white/[0.06] text-[#6E6E6A] dark:text-[#A1A1AA] shadow-2xs">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results Command List */}
            <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[#8A8A88] dark:text-[#A1A1AA]">
                  <Illustration name="search" className="h-[90px] w-auto" />
                  <p className="text-xs font-semibold">No results found for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between w-full min-h-[48px] sm:min-h-[50px] px-3.5 py-2.5 rounded-none text-xs font-semibold transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-[#111111] text-white shadow-xs'
                          : 'bg-transparent text-[#202020] dark:text-[#F4F4F6] hover:bg-[#F3F3F0] dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'text-white'
                              : 'text-[#6E6E6A] dark:text-[#A1A1AA]'
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <span className="text-[14px] font-semibold tracking-tight truncate">
                          {cmd.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                        <span
                          className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                            isSelected
                              ? 'border-white/25 bg-white/10 text-white/80'
                              : 'border-line text-muted font-normal'
                          }`}
                        >
                          {cmd.category}
                        </span>
                        {isSelected ? (
                          <ArrowRight className="w-4 h-4 text-white shrink-0" strokeWidth={1.5} />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="flex items-center justify-between px-4 h-[36px] bg-[#F3F3F1] dark:bg-[#16171B] border-t border-[#E8E8E4] dark:border-white/[0.06] text-muted">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[11px] font-medium">
                  <kbd className="font-mono text-[11px] bg-surface px-1.5 py-0.5 rounded-none border border-line text-muted shadow-2xs">
                    ↑
                  </kbd>
                  <kbd className="font-mono text-[11px] bg-surface px-1.5 py-0.5 rounded-none border border-line text-muted shadow-2xs">
                    ↓
                  </kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium">
                  <kbd className="font-mono text-[11px] bg-surface px-1.5 py-0.5 rounded-none border border-line text-muted shadow-2xs">
                    ↵
                  </kbd>
                  <span>Open</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                <kbd className="text-[11px] bg-surface px-1.5 py-0.5 rounded-none border border-line text-muted shadow-2xs flex items-center gap-0.5">
                  <Command className="w-2.5 h-2.5" strokeWidth={2} />
                </kbd>
                <span>Spotlight</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
