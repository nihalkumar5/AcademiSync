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

          {/* Minimalist Spotlight Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-black/20 dark:border-white/20 rounded-none shadow-2xl overflow-hidden z-10 text-left flex flex-col font-sans"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10">
              <div className="w-8 h-8 rounded-none bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 flex items-center justify-center border border-black/10 dark:border-white/10 shrink-0">
                <Search className="w-4 h-4" strokeWidth={2.5} />
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
                className="w-full bg-transparent text-[15px] font-medium text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none tracking-tight"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="text-[10px] font-mono font-bold bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 px-2 py-0.5 rounded-none border border-black/10 dark:border-white/10 shadow-sm">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results Command List */}
            <div className="max-h-[340px] overflow-y-auto p-2 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-black/40 dark:text-white/40">
                  <Sparkles className="w-5 h-5 opacity-70" />
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
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-none text-xs font-semibold transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-none flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'text-white dark:text-black'
                              : 'text-black/60 dark:text-white/60'
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <span className="text-[13px] tracking-tight">{cmd.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                            isSelected
                              ? 'border-white/30 dark:border-black/30'
                              : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
                          }`}
                        >
                          {cmd.category}
                        </span>
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 text-[10px] text-black/60 dark:text-white/60 font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-white dark:bg-black px-1.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 text-[9px] shadow-sm">
                    ↑
                  </kbd>
                  <kbd className="font-mono bg-white dark:bg-black px-1.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 text-[9px] shadow-sm">
                    ↓
                  </kbd>
                  <span className="ml-0.5 normal-case font-medium text-[11px]">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-white dark:bg-black px-1.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 text-[9px] shadow-sm">
                    ↵
                  </kbd>
                  <span className="ml-0.5 normal-case font-medium text-[11px]">Open</span>
                </span>
              </div>

              <div className="flex items-center gap-1 font-mono text-[9px] opacity-60">
                <Command className="w-3 h-3" /> Spotlight
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
