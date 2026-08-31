'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_TIMINGS: Record<string, string> = {
  Breakfast: '8:00 - 10:00',
  Lunch: '12:30 - 2:30',
  Snacks: '4:30 - 5:30',
  Dinner: '7:30 - 9:30',
};

function normalizeItems(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  if (typeof val === 'string') return val.split(/[,·|•\n]/).map(s => s.trim()).filter(Boolean);
  return [];
}

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
    items: string[];
  } | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    try {
      if (!messMenu || !messMenu.menu) {
        setMealInfo(null);
        return;
      }

      const updateMeal = () => {
        try {
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
            const diff = Math.max(0, live.end - currentMins);
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            const todayMenu = messMenu.menu?.[today] || {};
            const rawItems = todayMenu[live.name];
            const items = normalizeItems(rawItems);

            setMealInfo({
              status: 'LIVE',
              mealName: live.name,
              timeLeft: h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`,
              items: items.length > 0 ? items : ['Meal prepared as per schedule'],
            });
            return;
          }

          // 2. Check for upcoming meal TODAY
          const upcoming = activeTimings.find(m => m.start > currentMins);
          if (upcoming) {
            const diff = Math.max(0, upcoming.start - currentMins);
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            const todayMenu = messMenu.menu?.[today] || {};
            const rawItems = todayMenu[upcoming.name];
            const items = normalizeItems(rawItems);

            setMealInfo({
              status: 'UPCOMING',
              mealName: upcoming.name,
              timeLeft: h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`,
              items: items.length > 0 ? items : ['Menu updating soon'],
            });
            return;
          }

          // 3. Fallback to Tomorrow's Breakfast
          const nextBreakfast = activeTimings[0];
          const diff = Math.max(0, (24 * 60 - currentMins) + nextBreakfast.start);
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          const tomorrowMenu = messMenu.menu?.[tomorrow] || {};
          const rawItems = tomorrowMenu['Breakfast'];
          const items = normalizeItems(rawItems);

          setMealInfo({
            status: 'TOMORROW',
            mealName: 'Breakfast',
            timeLeft: `Starts in ${h}h ${m}m`,
            items: items.length > 0 ? items : ['Menu updating soon'],
          });
        } catch (e) {
          console.error('Error updating meal:', e);
        }
      };

      updateMeal();
      const interval = setInterval(updateMeal, 30000);
      return () => clearInterval(interval);
    } catch (err) {
      console.error('Mess card init error:', err);
    }
  }, [messMenu]);

  // If no mess menu is uploaded yet, don't show or show simple button
  if (!messMenu || !messMenu.menu) {
    return null;
  }

  if (!mealInfo) {
    return null;
  }

  const isLive = mealInfo.status === 'LIVE';
  const displayItems = Array.isArray(mealInfo.items) ? mealInfo.items : [];

  return (
    <div 
      onClick={() => setActiveView('mess')}
      className="w-full p-5 sm:p-6 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] border border-[#111111] dark:border-[#FFFFFF] rounded-none cursor-pointer transition-all hover:bg-[#1A1A1A] dark:hover:bg-[#F5F5F3] text-left flex flex-col gap-3.5 group shadow-sm mt-2"
    >
      {/* Row 1: Header Status + Countdown Box */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isLive ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-mono text-[11px] sm:text-[11.5px] font-black uppercase tracking-[1.6px] text-emerald-400 dark:text-emerald-600">
                SERVING NOW · {mealInfo.mealName.toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[1.4px] text-[#A0A0A0] dark:text-[#666666]">
              <span className="text-[9px]">●</span>
              <span>{mealInfo.status === 'TOMORROW' ? 'TOMORROW' : 'UPCOMING'}</span>
              <span>·</span>
              <span className="text-white dark:text-black font-extrabold">{mealInfo.mealName.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Right Time Badge */}
        <div className="px-3.5 py-1.5 bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider font-mono font-black text-[11px] sm:text-[11.5px] shrink-0 shadow-sm flex items-center justify-center text-center">
          {mealInfo.timeLeft}
        </div>
      </div>

      {/* Row 2: Food Items + Full Menu Action */}
      <div className="flex items-center justify-between gap-4 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0 flex-1">
          {displayItems.length > 0 ? (
            displayItems.map((item, idx) => (
              <span 
                key={idx} 
                className="text-[15px] sm:text-[16px] font-bold tracking-tight leading-snug"
              >
                {item}
                {idx < displayItems.length - 1 && (
                  <span className="opacity-30 ml-2.5 font-normal">·</span>
                )}
              </span>
            ))
          ) : (
            <span className="text-[14px] font-medium opacity-60">
              Menu items updating soon
            </span>
          )}
        </div>

        {/* Action Link Arrow */}
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-widest text-[#A0A0A0] dark:text-[#666666] group-hover:text-white dark:group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0">
          <span>FULL MENU</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
