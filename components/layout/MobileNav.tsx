'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Backpack,
  User,
  Users,
  LayoutGrid,
  ClipboardList,
  Utensils,
  CalendarRange,
  BookOpen,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useApp, ActiveView } from '@/context/AppContext';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

type MoreItem = { id: ActiveView; label: string; hint: string; icon: React.ReactNode; badge?: number };

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, homework, carryItems, profile, exams, notifications } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isFaculty = profile?.role === 'faculty';

  const pendingHomework = homework.filter((h) => h.status !== 'Completed').length;
  const unpackedCarry = carryItems.filter((i) => !i.isPacked).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAhead = todayStart.getTime() + 8 * 24 * 60 * 60 * 1000;
  const examsThisWeek = exams.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= todayStart.getTime() && t < weekAhead;
  }).length;

  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-5 h-5" /> },
    {
      id: 'homework',
      label: isFaculty ? 'Assignments' : 'Tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingHomework > 0 ? pendingHomework : undefined,
    },
    {
      id: 'carry',
      label: isFaculty ? 'Batches' : 'Bag',
      icon: isFaculty ? <Users className="w-5 h-5" /> : <Backpack className="w-5 h-5" />,
      badge: isFaculty ? undefined : (unpackedCarry > 0 ? unpackedCarry : undefined),
    },
  ];

  // Everything that isn't a daily destination lives one tap away under "More"
  const moreItems: MoreItem[] = [
    ...(isFaculty ? [] : [
      { id: 'exams' as ActiveView, label: 'Exams', hint: 'Dates, rooms & countdowns', icon: <ClipboardList className="w-5 h-5" />, badge: examsThisWeek || undefined },
      { id: 'mess' as ActiveView, label: 'Mess Menu', hint: "Today's meals & timings", icon: <Utensils className="w-5 h-5" /> },
    ]),
    { id: 'calendar', label: 'Academic Calendar', hint: 'Holidays, events & breaks', icon: <CalendarRange className="w-5 h-5" /> },
    ...(isFaculty ? [] : [
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
        'flex flex-col items-center justify-center relative cursor-pointer flex-1 h-full min-w-[56px] select-none gap-1 transition-colors',
        isActive
          ? 'text-[#111111] dark:text-[#F4F4F6]'
          : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-[#F4F4F6]'
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-1 bg-[#111111] dark:bg-white text-white dark:text-[#090A0C] font-mono text-[11px] font-bold flex items-center justify-center leading-none rounded-full border-2 border-white dark:border-[#090A0C]">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      <span className={clsx('text-[11px] tracking-wide leading-none', isActive ? 'font-bold' : 'font-medium')}>
        {label}
      </span>

      <div className="h-[2px] w-[16px] relative flex justify-center">
        {isActive && (
          <motion.div
            layoutId="mobile-nav-indicator"
            className="absolute inset-0 bg-[#111111] dark:bg-[#F4F4F6] dark:shadow-[0_0_8px_rgba(255,255,255,0.7)]"
          />
        )}
      </div>
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
              className="md:hidden fixed left-0 right-0 bottom-0 z-[39] bg-white dark:bg-[#111111] border-t border-[#D9D9D6] dark:border-white/[0.08] pt-3 px-4"
              style={{ paddingBottom: 'calc(max(calc(env(safe-area-inset-bottom, 0px) + 8px), 20px) + 68px)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D9D9D6] dark:bg-white/15" />
              <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#6B6B6B] dark:text-[#A1A1AA] mb-2 px-1">More</p>
              <ul className="max-w-md mx-auto divide-y divide-[#ECECEA] dark:divide-white/[0.06]">
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
                            ? 'bg-[#111111] text-white border-[#111111] dark:bg-[#F4F4F6] dark:text-[#111111] dark:border-[#F4F4F6]'
                            : 'bg-[#F7F7F5] text-[#111111] border-[#ECECEA] dark:bg-white/[0.04] dark:text-[#F4F4F6] dark:border-white/[0.06]'
                        )}>
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold text-[#111111] dark:text-[#F4F4F6] leading-tight">{item.label}</span>
                          <span className="block text-[13px] text-[#6B6B6B] dark:text-[#A1A1AA] leading-snug mt-0.5 truncate">{item.hint}</span>
                        </span>
                        {item.badge ? (
                          <span className="min-w-[22px] h-[22px] px-1.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-mono text-[12px] font-bold flex items-center justify-center rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                        <ChevronRight className="w-4 h-4 text-[#6B6B6B] dark:text-[#A1A1AA] shrink-0" aria-hidden="true" />
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/95 dark:bg-[#090A0C]/95 backdrop-blur-xl border-t border-[#D9D9D6] dark:border-white/[0.08] px-2 pt-2 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.4)]"
        style={{
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 8px), 20px)',
        }}
      >
        <div className="flex items-center justify-around max-w-md mx-auto relative h-[56px]">
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
