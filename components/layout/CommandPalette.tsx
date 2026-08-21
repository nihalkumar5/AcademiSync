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
  Plus,
  Sparkles,
  Sun,
  Moon,
  Upload,
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
      title: 'Go to Home Dashboard',
      category: 'Navigation',
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => {
        setActiveView('home');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_timetable',
      title: 'Go to Weekly Timetable',
      category: 'Navigation',
      icon: <CalendarDays className="w-4 h-4" />,
      action: () => {
        setActiveView('timetable');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_homework',
      title: 'Go to Homework & Tasks',
      category: 'Navigation',
      icon: <CheckSquare className="w-4 h-4" />,
      action: () => {
        setActiveView('homework');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_carry',
      title: "Go to Tomorrow's Carry Bag",
      category: 'Navigation',
      icon: <Backpack className="w-4 h-4" />,
      action: () => {
        setActiveView('carry');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_calendar',
      title: 'Go to Academic Calendar',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        setActiveView('calendar');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_subjects',
      title: 'Go to Subject Directory',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => {
        setActiveView('subjects');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_notifications',
      title: 'Go to Notification Inbox',
      category: 'Navigation',
      icon: <Bell className="w-4 h-4" />,
      action: () => {
        setActiveView('notifications');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_settings',
      title: 'Open Settings & Academic Profile',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        setActiveView('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act_theme',
      title: `Switch Theme to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`,
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', duration: 0.2, bounce: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10 text-left"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or jump to screen..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              />
              <kbd className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-400">
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No commands found matching &quot;{query}&quot;
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isSelected ? 'text-white' : 'text-zinc-400'}>
                          {cmd.icon}
                        </span>
                        <span>{cmd.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-blue-200' : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {cmd.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
              <span>Navigate with <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd></span>
              <span>Select with <kbd className="font-mono">↵</kbd></span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
