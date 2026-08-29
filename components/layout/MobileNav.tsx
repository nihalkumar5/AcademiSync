'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Backpack,
  User,
} from 'lucide-react';
import { useApp, ActiveView } from '@/context/AppContext';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, homework, carryItems } = useApp();

  const pendingHomework = homework.filter((h) => h.status !== 'Completed').length;
  const unpackedCarry = carryItems.filter((i) => !i.isPacked).length;

  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
    {
      id: 'homework',
      label: 'Tasks',
      icon: <CheckSquare className="w-[18px] h-[18px]" />,
      badge: pendingHomework > 0 ? pendingHomework : undefined,
    },
    {
      id: 'carry',
      label: 'Bag Carry',
      icon: <Backpack className="w-[18px] h-[18px]" />,
      badge: unpackedCarry > 0 ? unpackedCarry : undefined,
    },
    { id: 'settings', label: 'Profile', icon: <User className="w-[18px] h-[18px]" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] dark:bg-[#111111] border-t border-[#D9D9D6] dark:border-[#333333] px-2 pt-2 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto relative h-[56px]">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center relative cursor-pointer flex-1 h-full select-none',
                isActive
                  ? 'text-[#111111] dark:text-[#FFFFFF]'
                  : 'text-[#8A8A8A] dark:text-[#8A8A8A] hover:text-[#111111] dark:hover:text-[#FFFFFF]'
              )}
            >
              <div className="relative mb-1">
                {tab.icon}

                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] font-mono text-[9px] font-bold flex items-center justify-center leading-none rounded-full border border-white dark:border-[#111111]">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={clsx(
                'text-[10px] tracking-wide',
                isActive ? 'font-bold' : 'font-medium'
              )}>
                {tab.label}
              </span>
              
              <div className="h-[2px] w-[16px] mt-1 relative flex justify-center">
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-[#111111] dark:bg-[#FFFFFF]"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
