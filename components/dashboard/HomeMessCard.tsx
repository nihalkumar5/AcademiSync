'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Utensils, Clock, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
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
        timingStr: resolveMealTimingForDay(nextBreakfast.rawTiming, tomorrow) || 'Tomorrow Morning',
        items: items.length > 0 ? items : ['Menu items updating soon'],
        dayLabel: 'Tomorrow',
      });
    };

    updateMeal();
    const interval = setInterval(updateMeal, 30000);
    return () => clearInterval(interval);
  }, [messMenu]);

  // If no mess menu is uploaded yet, show a subtle prompt card
  if (!messMenu || !mealInfo) {
    return (
      <div 
        onClick={() => setActiveView('mess')}
        className="w-full p-4 rounded-xl border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#1A1A1A] hover:border-[#111111] dark:hover:border-white transition-all flex items-center justify-between cursor-pointer group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5F5F3] dark:bg-[#262626] flex items-center justify-center text-[#111111] dark:text-white shrink-0 group-hover:scale-105 transition-transform">
            <Utensils className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-[#111111] dark:text-white">
              Hostel Mess Menu
            </span>
            <span className="text-[12px] text-[#737373] dark:text-[#A3A3A3]">
              Track live meals, timings & weekly food schedule
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[12.5px] font-medium text-[#111111] dark:text-white group-hover:translate-x-0.5 transition-transform">
          <span>View Menu</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    );
  }

  const isLive = mealInfo.status === 'LIVE';

  return (
    <div 
      onClick={() => setActiveView('mess')}
      className={`w-full rounded-2xl border transition-all cursor-pointer group shadow-sm overflow-hidden ${
        isLive 
          ? 'bg-[#FFFFFF] dark:bg-[#181818] border-emerald-500/40 dark:border-emerald-500/40 hover:border-emerald-500' 
          : 'bg-[#FFFFFF] dark:bg-[#181818] border-[#E8E8E8] dark:border-[#262626] hover:border-[#BDBDBD] dark:hover:border-[#444444]'
      }`}
    >
      {/* Top Thin Banner Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-[#F0F0F0] dark:border-[#262626]/70">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 text-[10.5px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Meal Now
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 text-[10.5px] font-bold uppercase tracking-wider">
              <Clock className="w-3 h-3 text-neutral-500" />
              {mealInfo.status === 'TOMORROW' ? 'Tomorrow Morning' : 'Upcoming Meal'}
            </span>
          )}

          <span className="text-[12px] font-medium text-[#737373] dark:text-[#A3A3A3]">
            {messMenu.name || 'Mess Menu'}
          </span>
        </div>

        {/* Time Badge */}
        <span className="text-[11.5px] font-semibold text-[#111111] dark:text-white bg-[#F5F5F5] dark:bg-[#252525] px-2.5 py-0.5 rounded-md">
          {mealInfo.timeLeft}
        </span>
      </div>

      {/* Main Meal Content Body */}
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isLive 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}>
              <Utensils className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="text-[16px] font-bold text-[#111111] dark:text-white tracking-tight leading-none">
                  {mealInfo.mealName}
                </h4>
                {mealInfo.timingStr && (
                  <span className="text-[11.5px] text-[#737373] dark:text-[#8E8E8E] font-medium">
                    ({mealInfo.timingStr})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#737373] group-hover:text-[#111111] dark:group-hover:text-white transition-colors">
            <span>Full Menu</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Food Items Pill Row */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {mealInfo.items.slice(0, 6).map((item, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[#F7F7F6] dark:bg-[#222222] text-[#222222] dark:text-[#E0E0E0] border border-[#EBEBEA] dark:border-[#2E2E2E]"
            >
              {item}
            </span>
          ))}
          {mealInfo.items.length > 6 && (
            <span className="text-[11px] font-semibold text-[#888888] dark:text-[#777777] self-center pl-1">
              +{mealInfo.items.length - 6} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
