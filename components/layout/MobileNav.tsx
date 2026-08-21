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
      id: 'exams', label: 'Exams', icon: <CalendarDays className="w-4 h-4" /> },
  {
    id: 'homework',
      label: 'Tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingHomework > 0 ? pendingHomework : undefined,
    },
    {
      id: 'carry',
      label: 'Carry',
      icon: <Backpack className="w-5 h-5" />,
      badge: unpackedCarry > 0 ? unpackedCarry : undefined,
    },
    { id: 'settings', label: 'Profile', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/40 dark:bg-zinc-950/40 border-t border-slate-200/50 dark:border-zinc-800/50 backdrop-blur-2xl saturate-150 px-2 py-1.5 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.05)] dark:shadow-none">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center py-2 px-3 rounded-2xl relative transition-all duration-300',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50'
              )}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-blue-600 dark:ring-blue-900">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
