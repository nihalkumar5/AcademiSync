'use client';

import React from 'react';
import {
  Sparkles,
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
    { id: 'mess', label: 'Hostel Mess', icon: <Sparkles className="w-4 h-4" /> },
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
    <aside className="hidden md:flex flex-col w-64 bg-[#FAFAF8] dark:bg-[#111110] border-r border-black dark:border-white h-screen sticky top-0 select-none p-4 justify-between z-20">
      <div className="flex flex-col gap-4">
        {/* Workspace Brand / Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <IntersemesterLogo size="md" showTagline={true} taglineText="Student Edition" />
          </div>
        </div>

        {/* Quick Search trigger button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-none bg-transparent border border-black dark:border-white text-black/60 dark:text-white/60 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <span className="font-semibold">Search or jump...</span>
          </span>
          <kbd className="text-[10px] font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-none border border-black/20 dark:border-white/20 text-black/50 dark:text-white/50">
            ⌘K
          </kbd>
        </button>

        {/* Main Navigation links */}
        <div className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 font-mono">
            Academic
          </span>
          {mainNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-none text-xs font-semibold transition-all group border',
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white border-transparent'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={clsx(isActive ? 'text-white dark:text-black' : 'text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white')}>
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className={clsx(
                      'text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded-none',
                      isActive
                        ? 'bg-white dark:bg-black text-black dark:text-white border-white dark:border-black'
                        : 'bg-black/10 dark:bg-white/10 border-black/15 dark:border-white/15 text-black/70 dark:text-white/70'
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
          <span className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 font-mono">
            Management
          </span>
          {secondaryNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-none text-xs font-semibold transition-all group border',
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white border-transparent'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={clsx(isActive ? 'text-white dark:text-black' : 'text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white')}>
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className={clsx(
                      'text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded-none bg-rose-500 text-white',
                      isActive ? 'border-white dark:border-black' : 'border-rose-600'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Theme Toggle */}
      <div className="flex flex-col gap-2 pt-3 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between p-2 rounded-none bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-black dark:text-white truncate">
                  {profile.name}
                </span>
                <span className="text-[10px] text-black/50 dark:text-white/50 font-mono truncate">
                  Clerk Secure Auth
                </span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-none border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-none text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/15 dark:hover:border-white/15 transition-all"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-black/75" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
