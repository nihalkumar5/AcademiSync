'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Backpack,
  Settings,
} from 'lucide-react';
import { useApp, ActiveView } from '@/context/AppContext';
import { clsx } from 'clsx';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, homework, carryItems } = useApp();

  const pendingHomework = homework.filter((h) => h.status !== 'Completed').length;
  const unpackedCarry = carryItems.filter((i) => !i.isPacked).length;

  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-5 h-5" /> },
    {
      id: 'homework',
      label: 'Tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingHomework > 0 ? pendingHomework : undefined,
    },
    {
      id: 'carry',
      label: 'Tomorrow',
      icon: <Backpack className="w-5 h-5" />,
      badge: unpackedCarry > 0 ? unpackedCarry : undefined,
    },
    { id: 'settings', label: 'Profile', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0B0F19]/80 border-t border-slate-200/60 dark:border-zinc-800/60 backdrop-blur-2xl px-2 py-1.5 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl relative transition-all duration-200',
                isActive
                  ? 'text-[#6366F1] dark:text-[#818CF8] font-bold bg-indigo-50/70 dark:bg-indigo-950/40'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              )}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white dark:ring-[#0B0F19]">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
