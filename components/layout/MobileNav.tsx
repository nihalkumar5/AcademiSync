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
    <nav 
      id="mobile-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#090A0C]/90 backdrop-blur-xl border-t border-[#D9D9D6] dark:border-white/[0.08] px-2 pt-2 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.4)]"
      style={{
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 8px), 20px)',
      }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative h-[52px]">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className="flex flex-col items-center justify-center relative cursor-pointer flex-1 h-full select-none gap-0.5 transition-colors"
            >
              <div className={clsx(
                "relative mb-0.5 transition-colors",
                isActive ? "text-[#111111] dark:text-[#FFFFFF]" : "text-[#808080] dark:text-[#71717A]"
              )}>
                {tab.icon}

                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 bg-[#111111] dark:bg-white text-white dark:text-[#090A0C] font-mono text-[9px] font-bold flex items-center justify-center leading-none rounded-full border border-white dark:border-[#090A0C]">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={clsx(
                'text-[10px] tracking-wide leading-none transition-colors',
                isActive
                  ? 'font-bold text-[#111111] dark:text-[#FFFFFF]'
                  : 'font-medium text-[#808080] dark:text-[#94A3B8]'
              )}>
                {tab.label}
              </span>
              
              <div className="h-[2px] w-[16px] mt-1 relative flex justify-center">
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-[#111111] dark:bg-[#FFFFFF] dark:shadow-[0_0_8px_rgba(255,255,255,0.7)]"
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
