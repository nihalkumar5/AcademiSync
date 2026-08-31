'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';

const DEFAULT_TIMINGS: Record<string, string> = {
  Breakfast: '8:00 - 10:00',
  Lunch: '12:30 - 2:30',
  Snacks: '4:30 - 5:30',
  Dinner: '7:30 - 9:30',
};

function resolveMealTimingForDay(timingStr: string, day: string): string {
  if (!timingStr) return '';
  const isWeekend = day === 'Saturday' || day === 'Sunday';

  if (timingStr.includes('/') || timingStr.includes('(Mon') || timingStr.includes('(Sat') || timingStr.includes('Weekend')) {
    const parts = timingStr.split(/[/|]/).map(s => s.trim());
    if (isWeekend) {
      const weekendPart = parts.find(p => /sat|sun|weekend/i.test(p));
      if (weekendPart) return weekendPart.replace(/\([^)]*\)/g, '').trim();
    } else {
      const weekdayPart = parts.find(p => /mon|tue|wed|thu|fri|weekday/i.test(p));
      if (weekdayPart) return weekdayPart.replace(/\([^)]*\)/g, '').trim();
    }
    return parts[0].replace(/\([^)]*\)/g, '').trim();
  }

  return timingStr.replace(/\([^)]*\)/g, '').trim();
}

function parseTimeToMinutes(timeStr: string, defaultStart: number, defaultEnd: number) {
  if (!timeStr || !timeStr.includes('-')) return { start: defaultStart, end: defaultEnd };
  const cleanTime = timeStr.replace(/\([^)]*\)/g, '').trim();
  const parts = cleanTime.split('-').map(s => s.trim());
  if (parts.length !== 2) return { start: defaultStart, end: defaultEnd };

  const parseOne = (t: string, fallbackH: number) => {
    const isPM = t.toLowerCase().includes('pm');
    const isAM = t.toLowerCase().includes('am');
    const clean = t.replace(/(am|pm)/gi, '').trim();
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (isNaN(h)) return fallbackH;

    if (!isPM && !isAM) {
      if (h >= 1 && h <= 6) h += 12;
      else if (fallbackH >= 18 * 60 && h >= 7 && h <= 11) h += 12;
    } else if (isPM && h < 12) {
      h += 12;
    } else if (isAM && h === 12) {
      h = 0;
    }
    return h * 60 + m;
  };

  return {
    start: parseOne(parts[0], defaultStart),
    end: parseOne(parts[1], defaultEnd),
  };
}

export const HomeMessCard: React.FC = () => {
  const { messMenu, setActiveView } = useApp();
  const [mealInfo, setMealInfo] = useState<{
    status: 'LIVE' | 'UPCOMING' | 'TOMORROW';
    mealName: string;
    timeLeft: string;
    timingStr: string;
    items: string[];
    dayLabel: string;
  } | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (!messMenu?.menu) {
      setMealInfo(null);
      return;
    }

    const updateMeal = () => {
      const now = new Date();
      const today = format(now, 'EEEE');
      const tomorrowIndex = (now.getDay() + 1) % 7;
      const tomorrow = daysOfWeek[tomorrowIndex];

      const timings = { ...DEFAULT_TIMINGS, ...(messMenu.timings || {}) };
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const activeTimings = [
        { name: 'Breakfast', rawTiming: timings.Breakfast, ...parseTimeToMinutes(resolveMealTimingForDay(timings.Breakfast, today), 8 * 60, 10 * 60) },
        { name: 'Lunch', rawTiming: timings.Lunch, ...parseTimeToMinutes(resolveMealTimingForDay(timings.Lunch, today), 12 * 60 + 30, 14 * 60 + 30) },
        { name: 'Snacks', rawTiming: timings.Snacks, ...parseTimeToMinutes(resolveMealTimingForDay(timings.Snacks, today), 16 * 60 + 30, 17 * 60 + 30) },
        { name: 'Dinner', rawTiming: timings.Dinner, ...parseTimeToMinutes(resolveMealTimingForDay(timings.Dinner, today), 19 * 60 + 30, 21 * 60 + 30) },
      ];

      // 1. Check if any meal is currently SERVING NOW
      const live = activeTimings.find(m => currentMins >= m.start && currentMins < m.end);
      if (live) {
        const diff = live.end - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const todayMenu = messMenu.menu?.[today] || {};
        const items = todayMenu[live.name] || [];

        setMealInfo({
          status: 'LIVE',
          mealName: live.name,
          timeLeft: h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`,
          timingStr: resolveMealTimingForDay(live.rawTiming, today) || 'Serving Now',
          items: items.length > 0 ? items : ['Meal prepared as per hostel schedule'],
          dayLabel: 'Today',
        });
        return;
      }

      // 2. Check for upcoming meal TODAY
      const upcoming = activeTimings.find(m => m.start > currentMins);
      if (upcoming) {
        const diff = upcoming.start - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const todayMenu = messMenu.menu?.[today] || {};
        const items = todayMenu[upcoming.name] || [];

        setMealInfo({
          status: 'UPCOMING',
          mealName: upcoming.name,
          timeLeft: h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`,
          timingStr: resolveMealTimingForDay(upcoming.rawTiming, today) || '',
          items: items.length > 0 ? items : ['Menu items updating soon'],
          dayLabel: 'Today',
        });
        return;
      }

      // 3. Fallback to Tomorrow's Breakfast
      const nextBreakfast = activeTimings[0];
      const diff = (24 * 60 - currentMins) + nextBreakfast.start;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      const tomorrowMenu = messMenu.menu?.[tomorrow] || {};
      const items = tomorrowMenu['Breakfast'] || [];

      setMealInfo({
        status: 'TOMORROW',
        mealName: 'Breakfast',
        timeLeft: `Starts in ${h}h ${m}m`,
        timingStr: resolveMealTimingForDay(nextBreakfast.rawTiming, tomorrow) || '08:00 - 09:30',
        items: items.length > 0 ? items : ['Menu items updating soon'],
        dayLabel: 'Tomorrow',
      });
    };

    updateMeal();
    const interval = setInterval(updateMeal, 30000);
    return () => clearInterval(interval);
  }, [messMenu]);

  // If no mess menu is uploaded yet
  if (!messMenu || !mealInfo) {
    return (
      <div 
        onClick={() => setActiveView('mess')}
        className="w-full p-4 sm:p-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] flex items-center justify-between rounded-none cursor-pointer transition-opacity hover:opacity-95"
      >
        <div className="flex flex-col pr-4 min-w-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70 mb-1">
            HOSTEL MESS MENU
          </span>
          <span className="text-[14px] font-medium leading-snug">
            Track live meals & weekly food chart.
          </span>
        </div>
        <div className="px-4 py-2 bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider font-bold text-[11px] shrink-0 flex items-center justify-center text-center">
          VIEW MENU
        </div>
      </div>
    );
  }

  const isLive = mealInfo.status === 'LIVE';

  return (
    <div 
      onClick={() => setActiveView('mess')}
      className="w-full p-4 sm:p-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] flex items-center justify-between rounded-none cursor-pointer transition-opacity hover:opacity-95 text-left"
    >
      {/* Left Column: Kicker + Food Items */}
      <div className="flex flex-col pr-4 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-600 text-[10px] font-mono font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600 animate-pulse" />
              LIVE · {mealInfo.mealName.toUpperCase()} {mealInfo.timingStr ? `(${mealInfo.timingStr})` : ''}
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70">
              {mealInfo.status === 'TOMORROW' ? 'TOMORROW MORNING' : 'UPCOMING'} · {mealInfo.mealName.toUpperCase()} {mealInfo.timingStr ? `(${mealInfo.timingStr})` : ''}
            </span>
          )}
        </div>

        <span className="text-[14px] sm:text-[15px] font-medium leading-snug truncate">
          {mealInfo.items.length > 0 ? mealInfo.items.join(' · ') : 'Menu items updating soon'}
        </span>
      </div>

      {/* Right Column: Exact Brutalist Button Box */}
      <div className="px-4 py-2 bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider font-bold text-[11px] shrink-0 flex items-center justify-center text-center">
        {mealInfo.timeLeft}
      </div>
    </div>
  );
};
