'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Backpack,
  BookOpen,
  Calendar,
  Bell,
  Settings,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';
import { useApp, ActiveView } from '@/context/AppContext';

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveView,
    settings,
    updateSettings,
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
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => {
        setActiveView('home');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_timetable',
      title: 'Weekly Timetable',
      category: 'Navigation',
      icon: <CalendarDays className="w-4 h-4" />,
      action: () => {
        setActiveView('timetable');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_homework',
      title: 'Homework & Tasks',
      category: 'Navigation',
      icon: <CheckSquare className="w-4 h-4" />,
      action: () => {
        setActiveView('homework');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_carry',
      title: "Tomorrow's Carry Bag",
      category: 'Navigation',
      icon: <Backpack className="w-4 h-4" />,
      action: () => {
        setActiveView('carry');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_calendar',
      title: 'Academic Calendar',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        setActiveView('calendar');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_subjects',
      title: 'Subject Directory',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => {
        setActiveView('subjects');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_notifications',
      title: 'Notification Inbox',
      category: 'Navigation',
      icon: <Bell className="w-4 h-4" />,
      action: () => {
        setActiveView('notifications');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_settings',
      title: 'Settings & Profile',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        setActiveView('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act_theme',
      title: `Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Preferences',
      icon: settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
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
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-16 sm:pt-24 p-4 select-none">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md"
          />

          {/* Premium Spotlight Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-lg bg-[#FAF8F5]/95 dark:bg-[#181716]/95 backdrop-blur-2xl border border-[#E3DBD0] dark:border-[#2E2B28] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden z-10 text-left flex flex-col font-sans"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3.5 px-5 py-4 border-b border-[#E8E0D5] dark:border-[#292624]">
              <div className="w-8 h-8 rounded-xl bg-[#EFE8DD] dark:bg-[#252321] text-[#8C6B5D] dark:text-[#A89280] flex items-center justify-center border border-[#DFD6C8] dark:border-[#383430] shrink-0">
                <Search className="w-4 h-4" strokeWidth={2.4} />
              </div>
              
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
                className="w-full bg-transparent text-[15px] font-medium text-[#1A1918] dark:text-[#F4F1EA] placeholder:text-[#9E9084] dark:placeholder:text-[#7A736C] focus:outline-none tracking-tight"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="text-[11px] font-mono font-semibold bg-[#EFE8DD] dark:bg-[#252321] text-[#7A6352] dark:text-[#A89280] px-2 py-1 rounded-md border border-[#DFD6C8] dark:border-[#383430] shadow-2xs">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results Command List */}
            <div className="max-h-[340px] overflow-y-auto p-2.5 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[#8C7E72] dark:text-[#7D766F]">
                  <Sparkles className="w-6 h-6 opacity-50" />
                  <p className="text-xs font-medium">No results found for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <motion.button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      animate={{
                        backgroundColor: isSelected
                          ? 'rgba(235, 226, 214, 0.95)'
                          : 'transparent',
                      }}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                        isSelected
                          ? 'text-[#1A1918] dark:text-white dark:!bg-[#282522] border border-[#DDD0C0] dark:border-[#3A3632] shadow-xs'
                          : 'text-[#5C4F44] dark:text-[#BDB4AA] border border-transparent hover:bg-[#F2ECE3]/70 dark:hover:bg-[#201E1C]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#8C6B5D] text-[#FAF8F5] shadow-xs'
                              : 'bg-[#EFE8DE]/80 dark:bg-[#22201E] text-[#7A6352] dark:text-[#9E9084] border border-[#DFD6C8]/60 dark:border-[#302D2A]'
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <span className="text-[13px] tracking-tight">{cmd.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-[#DDD0C0] dark:bg-[#34302C] text-[#5C4838] dark:text-[#C4B7AB]'
                              : 'bg-[#EAE1D4]/60 dark:bg-[#201E1C] text-[#8C7A6B] dark:text-[#7A736C]'
                          }`}
                        >
                          {cmd.category}
                        </span>
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 text-[#8C6B5D] dark:text-[#C4B7AB] animate-pulse" />
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#F2ECE2]/80 dark:bg-[#131211]/80 border-t border-[#E5DDD2] dark:border-[#282624] text-[11px] text-[#7A6B5F] dark:text-[#8C837B]">
              <div className="flex items-center gap-3 font-medium">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-[#EAE2D6] dark:bg-[#242220] px-1.5 py-0.5 rounded border border-[#D8CEBF] dark:border-[#383430] text-[10px]">
                    ↑
                  </kbd>
                  <kbd className="font-mono bg-[#EAE2D6] dark:bg-[#242220] px-1.5 py-0.5 rounded border border-[#D8CEBF] dark:border-[#383430] text-[10px]">
                    ↓
                  </kbd>
                  <span className="ml-0.5">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-[#EAE2D6] dark:bg-[#242220] px-1.5 py-0.5 rounded border border-[#D8CEBF] dark:border-[#383430] text-[10px]">
                    ↵
                  </kbd>
                  <span className="ml-0.5">Open</span>
                </span>
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px] text-[#96887C] dark:text-[#6E665E]">
                <Command className="w-3 h-3" /> Spotlight
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
