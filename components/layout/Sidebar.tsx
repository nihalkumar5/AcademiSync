'use client';

import React from 'react';
import {
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
  Command,
  GraduationCap,
} from 'lucide-react';
import { useApp, ActiveView } from '@/context/AppContext';
import { clsx } from 'clsx';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { IntersemesterLogo } from '../ui/IntersemesterLogo';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    profile,
    homework,
    notifications,
    settings,
    updateSettings,
    setCommandPaletteOpen,
  } = useApp();

  const pendingHomeworkCount = homework.filter((h) => h.status !== 'Completed').length;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const mainNav: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-4 h-4" /> },
    {
      id: 'exams', label: 'Exam Timetable', icon: <CalendarDays className="w-4 h-4" /> },
    {
      id: 'homework',
      label: 'Homework & Tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingHomeworkCount > 0 ? pendingHomeworkCount : undefined,
    },
    { id: 'carry', label: 'Bag Carry', icon: <Backpack className="w-4 h-4" /> },
    { id: 'calendar', label: 'Academic Calendar', icon: <Calendar className="w-4 h-4" /> },
  ];

  const secondaryNav: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'subjects', label: 'Subject Directory', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
    { id: 'settings', label: 'Settings & Profile', icon: <Settings className="w-4 h-4" /> },
  ];

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/80 dark:bg-zinc-950/80 border-r border-slate-200/80 dark:border-zinc-800/80 h-screen sticky top-0 select-none p-3.5 justify-between backdrop-blur-md z-20">
      <div className="flex flex-col gap-4">
        {/* Workspace Brand / Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <IntersemesterLogo size="md" showTagline={true} taglineText="Student Edition" />
          </div>
        </div>

        {/* Quick Search trigger button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 text-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group text-left shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Search or jump...</span>
          </span>
          <kbd className="text-[10px] font-mono bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Main Navigation links */}
        <div className="flex flex-col gap-1">
          <span className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono">
            Academic
          </span>
          {mainNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-zinc-900/60 hover:text-slate-900 dark:hover:text-zinc-200'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={clsx(isActive ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300')}>
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className={clsx(
                      'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm',
                      isActive
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="flex flex-col gap-1">
          <span className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono">
            Management
          </span>
          {secondaryNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-zinc-900/60 hover:text-slate-900 dark:hover:text-zinc-200'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={clsx(isActive ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300')}>
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Theme Toggle */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-200/70 dark:border-zinc-800/70">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-zinc-800/50 shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {profile.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                  Clerk Secure Auth
                </span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-xs font-bold bg-[#6366F1] hover:bg-[#4F46E5] text-white px-3 py-1.5 rounded-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
