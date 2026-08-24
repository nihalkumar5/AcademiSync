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
import { motion } from 'framer-motion';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, homework, carryItems } = useApp();

  const pendingHomework = homework.filter((h) => h.status !== 'Completed').length;
  const unpackedCarry = carryItems.filter((i) => !i.isPacked).length;

  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-4.5 h-4.5" /> },
    {
      id: 'homework',
      label: 'Tasks',
      icon: <CheckSquare className="w-4.5 h-4.5" />,
      badge: pendingHomework > 0 ? pendingHomework : undefined,
    },
    {
      id: 'carry',
      label: 'Bag Carry',
      icon: <Backpack className="w-4.5 h-4.5" />,
      badge: unpackedCarry > 0 ? unpackedCarry : undefined,
    },
    { id: 'settings', label: 'Profile', icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 dark:bg-[#111110]/95 backdrop-blur-xl border-t border-black/10 dark:border-white/10 px-2 py-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-3 relative transition-all duration-150 cursor-pointer rounded-none select-none',
                isActive
                  ? 'text-black dark:text-white font-bold'
                  : 'text-black/45 dark:text-white/45 hover:text-black dark:hover:text-white'
              )}
            >
              <div className="relative">
                <div className={clsx(
                  'p-1 transition-all',
                  isActive ? 'scale-110' : 'scale-100'
                )}>
                  {tab.icon}
                </div>

                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-black dark:bg-white text-white dark:text-black text-[9px] font-mono font-bold rounded-none px-1 py-0 border border-black dark:border-white flex items-center justify-center leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={clsx(
                'text-[10px] tracking-tight mt-0.5 font-mono',
                isActive ? 'font-black' : 'font-medium'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
