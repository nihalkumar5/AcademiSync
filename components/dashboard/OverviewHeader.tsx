'use client';
import { motion } from "framer-motion";


import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getCurrentDayOfWeek } from '@/lib/timetableUtils';
import {
  BookOpen,
  CheckSquare,
  AlertCircle,
  Backpack,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const OverviewHeader: React.FC = () => {
  const { profile, timetable, homework, carryItems, setActiveView } = useApp();

  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDay = getCurrentDayOfWeek();
  const todayClasses = timetable.filter((s) => s.day === todayDay);
  const pendingHw = homework.filter((h) => h.status !== 'Completed');
  const upcomingDeadlines = homework.filter((h) => {
    if (h.status === 'Completed') return false;
    const diff = Math.ceil(
      (new Date(h.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff <= 1;
  });
  const unpackedCarry = carryItems.filter((i) => !i.isPacked);

  const hour = time ? time.getHours() : new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  const dateFormatted = time
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(time)
    : 'Loading date...';

  const timeFormatted = time
    ? time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '--:--';

  const seconds = time ? time.getSeconds().toString().padStart(2, '0') : '00';

  return (
    <div className="flex flex-col gap-4 text-left px-1">
      
      {/* Hero Greeting Card (iOS Weather/Wallet Style) */}
      <div className="hero-mesh-card p-6 sm:p-8 flex flex-col gap-6 w-full">
        {/* Decorative blurry orbs for dynamic aesthetic */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400/20 dark:bg-indigo-500/30 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-400/20 dark:bg-pink-500/30 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex justify-between items-start z-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {greeting},
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                {profile.name.split(' ')[0]}!
              </span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{profile.college || 'Your College'} • Sem {profile.semester}</span>
            </div>
          </div>

          {/* Minimalist Live Clock */}
          <div className="flex flex-col items-end text-right">
            <div className="text-3xl sm:text-4xl font-bold tracking-tighter text-slate-900 dark:text-white flex items-baseline">
              {timeFormatted.split(' ')[0]}
              <span className="text-sm font-semibold text-slate-500 ml-1">
                {seconds}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
              {dateFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats (iOS Widgets) */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {/* Widget 1: Classes Today */}
        <motion.button 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
          }}
          onClick={() => setActiveView('timetable')}
          className="bento-card p-5 flex flex-col gap-3 justify-between text-left hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {todayClasses.length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
              Classes Today
            </span>
          </div>
        </motion.button>

        {/* Widget 2: Pending Tasks */}
        <motion.button 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
          }}
          onClick={() => setActiveView('homework')}
          className="bento-card p-5 flex flex-col gap-3 justify-between text-left hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {pendingHw.length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
              Tasks
            </span>
          </div>
        </motion.button>

        {/* Widget 3: Deadlines */}
        <motion.button 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
          }}
          onClick={() => setActiveView('homework')}
          className="bento-card p-5 flex flex-col gap-3 justify-between relative overflow-hidden text-left hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
        >
          {upcomingDeadlines.length > 0 && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl" />
          )}
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {upcomingDeadlines.length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
              Due Soon
            </span>
          </div>
        </motion.button>

        {/* Widget 4: Carry Bag */}
        <motion.button 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
          }}
          onClick={() => setActiveView('carry')}
          className="bento-card p-5 flex flex-col gap-3 justify-between text-left hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <Backpack className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {unpackedCarry.length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
              To Pack
            </span>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};
