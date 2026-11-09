'use client';

import { routinesForDay, isDoneOn } from '@/lib/routines';
import React, { useEffect, useState } from 'react';
import {
  House,
  CalendarDays,
  CheckSquare,
  User,
  Users,
  LayoutGrid,
  ClipboardList,
  Utensils,
  CalendarRange,
  BookOpen,
  Bell,
  ChevronRight,
  Repeat,
  UserCheck,
  GraduationCap,
  FileText,
} from '@/components/ui/icons';
import { useApp, ActiveView } from '@/context/AppContext';
import { dedupeNotifications } from '@/lib/notificationDedupe';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

type MoreItem = { id: ActiveView; label: string; hint: string; icon: React.ReactNode; badge?: number };

// Soft tinted tiles for the More sheet: pastel fill + deeper ink of the same hue (dark mode uses a
// low-alpha fill and a lighter ink so they glow without shouting). Full class strings so Tailwind keeps them.
const MORE_TONES: Record<string, string> = {
  carry: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
  friends: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  papers: 'bg-cyan-50 text-cyan-700 border-cyan-200/70 dark:bg-cyan-400/10 dark:text-cyan-300 dark:border-cyan-400/20',
  attendance: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/70 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:border-fuchsia-400/20',
  routines: 'bg-teal-50 text-teal-700 border-teal-200/70 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20',
  exams: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20',
  mess: 'bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/20',
  calendar: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/20',
  faculty: 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20',
  subjects: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  notifications: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-400/20',
  settings: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-white/[0.06] dark:text-stone-300 dark:border-white/10',
};

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, homework, profile, exams, notifications, routines } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isFaculty = profile?.role === 'faculty';

  const pendingHomework = homework.filter((h) => h.status !== 'Completed').length;
  const unreadNotifs = dedupeNotifications(notifications).filter((n) => !n.read).length;
  const routinesLeftToday = routinesForDay(routines, new Date()).filter((r) => !isDoneOn(r, new Date())).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAhead = todayStart.getTime() + 8 * 24 * 60 * 60 * 1000;
  const examsThisWeek = exams.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= todayStart.getTime() && t < weekAhead;
  }).length;

  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <House className="w-5 h-5" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-5 h-5" /> },
    ...(isFaculty ? [{ id: 'attendance' as ActiveView, label: 'Attendance', icon: <UserCheck className="w-5 h-5" /> }] : []),
    {
      id: 'homework',
      label: isFaculty ? 'Assignments' : 'Tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: !isFaculty && pendingHomework > 0 ? pendingHomework : undefined,
    },
    ...(isFaculty ? [] : [{ id: 'routines' as ActiveView, label: 'Routines', icon: <Repeat className="w-5 h-5" />, badge: routinesLeftToday || undefined }]),
  ];

  // Everything that isn't a daily destination lives one tap away under "More"
  const moreItems: MoreItem[] = [
    ...(isFaculty
      ? [
          { id: 'carry' as ActiveView, label: 'Batches', hint: 'Linked batches & class codes', icon: <Users className="w-5 h-5" /> },
          { id: 'routines' as ActiveView, label: 'Routines', hint: 'Your reminders & repeating to-dos', icon: <Repeat className="w-5 h-5" />, badge: routinesLeftToday || undefined },
          { id: 'papers' as ActiveView, label: 'Question papers', hint: 'Past papers for your college', icon: <FileText className="w-5 h-5" /> },
        ]
      : [
          { id: 'friends' as ActiveView, label: 'Friends', hint: "See who's free right now", icon: <Users className="w-5 h-5" /> },
          { id: 'attendance' as ActiveView, label: 'Attendance', hint: 'See how many classes you can skip', icon: <UserCheck className="w-5 h-5" /> },
        ]),
    ...(isFaculty ? [] : [
      { id: 'exams' as ActiveView, label: 'Exams', hint: 'Dates, rooms & countdowns', icon: <ClipboardList className="w-5 h-5" />, badge: examsThisWeek || undefined },
      { id: 'papers' as ActiveView, label: 'Question papers', hint: 'Past papers of your branch', icon: <FileText className="w-5 h-5" /> },
      { id: 'mess' as ActiveView, label: 'Mess Menu', hint: "Today's meals & timings", icon: <Utensils className="w-5 h-5" /> },
    ]),
    { id: 'calendar', label: 'Academic Calendar', hint: 'Holidays, events & breaks', icon: <CalendarRange className="w-5 h-5" /> },
    ...(isFaculty ? [] : [
      { id: 'faculty' as ActiveView, label: 'Faculty', hint: 'Your teachers & campus faculty', icon: <GraduationCap className="w-5 h-5" /> },
      { id: 'subjects' as ActiveView, label: 'Subjects', hint: 'Faculty, rooms & what to carry', icon: <BookOpen className="w-5 h-5" /> },
    ]),
    { id: 'notifications', label: 'Notifications', hint: 'Batch alerts & reminders', icon: <Bell className="w-5 h-5" />, badge: unreadNotifs || undefined },
    { id: 'settings', label: 'Profile & Settings', hint: 'Account, batch & preferences', icon: <User className="w-5 h-5" /> },
  ];

  const isMoreActive = moreItems.some((item) => item.id === activeView);
  const moreBadge = moreItems.reduce((sum, item) => sum + (item.badge || 0), 0);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMoreOpen]);

  const goTo = (view: ActiveView) => {
    setIsMoreOpen(false);
    setActiveView(view);
  };

  const renderTab = (id: string, label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, badge?: number) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      aria-label={badge ? `${label}, ${badge} pending` : label}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'flex flex-col items-center justify-center relative cursor-pointer flex-1 h-full min-w-[56px] select-none gap-1 transition-colors active:scale-95',
        isActive
          ? 'text-fg'
          : 'text-faint hover:text-fg'
      )}
    >
      {/* Active tab: a soft tile slides behind the icon (shared layoutId animates between tabs) */}
      <div className="relative w-[52px] h-8 flex items-center justify-center">
        {isActive && (
          <motion.div
            layoutId="mobile-nav-indicator"
            className="absolute inset-0 bg-ink/[0.07] dark:bg-white/[0.1] ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08]"
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          />
        )}
        <span className="relative">{icon}</span>
        {badge !== undefined && (
          <span className="absolute -top-1 right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[10px] font-bold tabular-nums flex items-center justify-center leading-none rounded-full ring-2 ring-surface dark:ring-canvas">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      <span className={clsx('text-[11px] leading-none transition-colors', isActive ? 'font-semibold text-fg' : 'font-medium')}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              className="md:hidden fixed inset-0 z-[38] bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="More sections"
              className="md:hidden fixed left-0 right-0 bottom-0 z-[39] bg-surface border-t border-line pt-3 px-4"
              style={{ paddingBottom: 'calc(max(calc(env(safe-area-inset-bottom, 0px) + 8px), 20px) + 68px)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D9D9D6] dark:bg-white/15" />
              <p className="text-[12px] font-bold text-muted mb-2 px-1">More</p>
              <ul className="max-w-md mx-auto divide-y divide-line-soft">
                {moreItems.map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className="w-full flex items-center gap-3.5 py-3 px-1 min-h-[56px] text-left cursor-pointer active:bg-[#F4F4F2] dark:active:bg-white/[0.04]"
                      >
                        <span className={clsx(
                          'w-10 h-10 flex items-center justify-center shrink-0 border',
                          isActive
                            ? 'bg-ink text-on-ink border-line-strong'
                            : MORE_TONES[item.id] || 'bg-surface-2 text-fg border-line-soft'
                        )}>
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold text-fg leading-tight">{item.label}</span>
                          <span className="block text-[13px] text-muted leading-snug mt-0.5 truncate">{item.hint}</span>
                        </span>
                        {item.badge ? (
                          <span className="min-w-[22px] h-[22px] px-1.5 bg-rose-500 text-white text-[12px] font-bold tabular-nums flex items-center justify-center rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                        <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        id="mobile-nav"
        aria-label="Main"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/85 dark:bg-canvas/85 backdrop-blur-xl backdrop-saturate-150 border-t border-line-soft px-2 pt-1.5 select-none shadow-[0_-10px_30px_-12px_rgba(17,17,17,0.10)] dark:shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.6)]"
        style={{
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 8px), 20px)',
        }}
      >
        <div className="flex items-center justify-around max-w-md mx-auto relative h-[58px]">
          {tabs.map((tab) =>
            renderTab(tab.id, tab.label, tab.icon, !isMoreOpen && activeView === tab.id, () => goTo(tab.id), tab.badge)
          )}
          {renderTab(
            'more',
            'More',
            <LayoutGrid className="w-5 h-5" />,
            isMoreOpen || isMoreActive,
            () => setIsMoreOpen((open) => !open),
            moreBadge || undefined
          )}
        </div>
      </nav>
    </>
  );
};
