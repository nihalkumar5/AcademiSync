'use client';

import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { format } from 'date-fns';
import { Share, Sparkles, Clock, Edit3, X, Check, ArrowRight, UtensilsCrossed, Coffee, Sun, Cookie, Moon, Pencil } from '@/components/ui/icons';
import { Modal } from '../ui/Modal';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const DEFAULT_TIMINGS: Record<string, string> = {
  Breakfast: '8:00 - 10:00',
  Lunch: '12:30 - 2:30',
  Snacks: '4:30 - 5:30',
  Dinner: '7:30 - 9:30',
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper to resolve timing for a specific day (e.g. Mon-Fri vs Sat-Sun)
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

// Helper to convert time strings into minute bounds
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
      if (h >= 1 && h <= 6) h += 12; // 1:00 to 6:00 is afternoon/evening
      else if (fallbackH >= 18 * 60 && h >= 7 && h <= 11) h += 12; // Dinner 7-11 is PM
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

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const;
const MEAL_ICONS: Record<string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  Breakfast: Coffee,
  Lunch: Sun,
  Snacks: Cookie,
  Dinner: Moon,
};
const MEAL_DEFAULTS: Record<string, [number, number]> = {
  Breakfast: [8 * 60, 10 * 60],
  Lunch: [12 * 60 + 30, 14 * 60 + 30],
  Snacks: [16 * 60 + 30, 17 * 60 + 30],
  Dinner: [19 * 60 + 30, 21 * 60 + 30],
};

function getMealWindows(timings: Record<string, string>, day: string) {
  return MEAL_ORDER.map((name) => ({
    name,
    ...parseTimeToMinutes(resolveMealTimingForDay(timings?.[name], day), MEAL_DEFAULTS[name][0], MEAL_DEFAULTS[name][1]),
  }));
}

function formatMinutes(mins: number) {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Which of today's meals is being served, and which comes next (minute precision)
function useMealClock(timings: Record<string, string>, today: string) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  const windows = getMealWindows(timings, today);
  if (now === null) return { now: null, windows, serving: null, next: null };
  const serving = windows.find((w) => now >= w.start && now < w.end) || null;
  const next = windows.find((w) => w.start > now) || null;
  return { now, windows, serving, next };
}

const LiveMealCard = ({
  todayMenu,
  timings,
  today,
}: {
  todayMenu: any;
  timings: Record<string, string>;
  today: string;
}) => {
  const { now, windows, serving, next } = useMealClock(timings, today);
  if (now === null) return null;

  const tomorrowBreakfast = !serving && !next;
  const focus = serving || next || windows[0];
  const items: string[] = (todayMenu?.[focus.name] || []) as string[];
  const total = Math.max(1, focus.end - focus.start);
  const progress = serving ? Math.min(100, Math.max(0, ((now - serving.start) / total) * 100)) : 0;
  const status = serving ? 'Serving now' : tomorrowBreakfast ? 'Tomorrow' : 'Up next';
  const countdown = serving
    ? `Ends in ${formatDuration(serving.end - now)}`
    : tomorrowBreakfast
    ? `Starts in ${formatDuration(24 * 60 - now + windows[0].start)}`
    : `Starts in ${formatDuration(focus.start - now)}`;
  const after = serving ? windows.find((w) => w.start >= serving.end) : null;

  // Each meal gets its own time-of-day mood; colour stays in the glow, not the text
  const mood = {
    Breakfast: { base: '#14110B', glow: 'rgba(251,191,36,0.22)', accent: '#FBBF24', grid: 'rgba(251,191,36,0.07)' },
    Lunch: { base: '#14100C', glow: 'rgba(251,146,60,0.22)', accent: '#FB923C', grid: 'rgba(251,146,60,0.07)' },
    Snacks: { base: '#140C10', glow: 'rgba(244,114,182,0.20)', accent: '#F472B6', grid: 'rgba(244,114,182,0.07)' },
    Dinner: { base: '#0C0D17', glow: 'rgba(129,140,248,0.24)', accent: '#818CF8', grid: 'rgba(129,140,248,0.07)' },
  }[focus.name as 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'] || { base: '#111111', glow: 'rgba(255,255,255,0.08)', accent: '#34D399', grid: 'rgba(255,255,255,0.05)' };
  const FocusIcon = MEAL_ICONS[focus.name] || UtensilsCrossed;
  const AfterIcon = after ? MEAL_ICONS[after.name] || UtensilsCrossed : null;

  return (
    <section
      aria-label="Current meal"
      className="relative w-full overflow-hidden border border-white/[0.08] text-left text-white"
      style={{ backgroundColor: mood.base }}
    >
      {/* Atmosphere: fading grid, a meal-coloured glow and a large icon watermark */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${mood.grid} 1px, transparent 1px), linear-gradient(90deg, ${mood.grid} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 100% 0%, black 15%, transparent 70%)',
          maskImage: 'radial-gradient(ellipse 85% 80% at 100% 0%, black 15%, transparent 70%)',
        }}
      />
      <div aria-hidden="true" className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: mood.glow }} />
      <div aria-hidden="true" className="absolute -bottom-5 -right-4 pointer-events-none select-none opacity-[0.08] rotate-[-10deg]">
        <FocusIcon className="w-[96px] h-[96px]" aria-hidden="true" />
      </div>

      <div className="relative p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span
            className="inline-flex items-center gap-2 h-6 px-2 text-[12px] font-semibold uppercase tracking-[1.2px] border"
            style={{ color: serving ? '#6EE7B7' : 'rgba(255,255,255,0.85)', borderColor: serving ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.18)', backgroundColor: serving ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.05)' }}
          >
            <span className="relative flex h-2 w-2">
              {serving && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${serving ? 'bg-emerald-400' : 'bg-white/70'}`} />
            </span>
            {status}
          </span>
          <span className="text-[13px] font-semibold text-white tabular-nums">{countdown}</span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[26px] font-semibold leading-none tracking-tight">
            <span style={{ color: mood.accent }}><FocusIcon className="w-5 h-5 shrink-0" aria-hidden="true" /></span>
            {focus.name}
          </h3>
          <span className="text-[13px] text-white/70 tabular-nums whitespace-nowrap">
            {formatMinutes(focus.start)} – {formatMinutes(focus.end)}
          </span>
        </div>

        {serving && (
          <div className="mt-3">
            <div className="h-1 w-full bg-white/[0.12] overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Serving time elapsed">
              <div
                className="h-full transition-[width] duration-700"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${mood.accent}99, ${mood.accent})`, boxShadow: `0 0 12px ${mood.accent}80` }}
              />
            </div>
          </div>
        )}

        {items.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="On the menu">
            {items.map((dish, idx) => (
              <li key={idx} className="flex items-center gap-2 text-[15px] font-medium text-white">
                <span className="w-1.5 h-1.5 shrink-0 rotate-45" style={{ backgroundColor: mood.accent }} aria-hidden="true" />
                {dish}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[14px] text-white/70">Menu not added for this meal yet.</p>
        )}

        {after && AfterIcon && (
          <div className="mt-4 pt-3 border-t border-white/[0.10] flex items-center justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-2 text-white/70">
              <AfterIcon className="w-4 h-4" aria-hidden="true" />
              Next up: <span className="text-white font-semibold">{after.name}</span>
            </span>
            <span className="text-white/70 tabular-nums">{formatMinutes(after.start)}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export const MessView: React.FC = () => {
  const { messMenu, updateMessMenu, showToast, user } = useApp();

  // Only the publisher may update a shared mess doc. Anyone else's edits are saved as their own
  // copy under a new code, so they can't overwrite the menu everyone else joined.
  const saveSharedMess = async (updatedMess: any) => {
    if (!user?.id || !updatedMess.id) return updatedMess;

    if (updatedMess.creatorId === user.id) {
      await setDoc(doc(db, 'messes', updatedMess.id), updatedMess, { merge: true }).catch(() => {});
      return updatedMess;
    }

    const ownCopy = {
      ...updatedMess,
      id: Math.random().toString(36).substring(2, 6).toUpperCase(),
      creatorId: user.id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'messes', ownCopy.id), ownCopy);
      return ownCopy;
    } catch {
      return updatedMess;
    }
  };

  const today = format(new Date(), 'EEEE');
  const [selectedDay, setSelectedDay] = useState(today);
  const mealClock = useMealClock({ ...DEFAULT_TIMINGS, ...(messMenu?.timings || {}) }, today);
  // Dates of this week's Monday..Sunday for the day picker
  const weekDates = (() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return days.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  })();
  const [isImporting, setIsImporting] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditTimingsModal, setShowEditTimingsModal] = useState(false);
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Single meal quick edit state
  const [quickEditMeal, setQuickEditMeal] = useState<{ day: string; meal: string; dishes: string; timing: string } | null>(null);

  // Edit Timings local state
  const [tempTimings, setTempTimings] = useState<Record<string, string>>(DEFAULT_TIMINGS);
  // Edit Menu local state
  const [tempMenu, setTempMenu] = useState<any>({});

  useEffect(() => {
    if (messMenu?.timings) {
      setTempTimings({ ...DEFAULT_TIMINGS, ...messMenu.timings });
    }
    if (messMenu?.menu) {
      setTempMenu(messMenu.menu);
    }
  }, [messMenu]);

  if (!messMenu || isImporting) {
    return <MessOnboarding onCancel={messMenu ? () => setIsImporting(false) : undefined} initialAction={isImporting ? 'import' : null} />;
  }

  const effectiveTimings = { ...DEFAULT_TIMINGS, ...(messMenu.timings || {}) };
  const selectedMenu = messMenu.menu?.[selectedDay] || {};

  const handleShare = async () => {
    const code = messMenu.id;
    const shareText = `🍛 *Join our Hostel Mess Menu on Intersemester!*

🔑 *Mess Code:* ${code}

🍽️ Live Meal Countdowns, Daily Dishes & Serving Hours

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Go to Mess tab → Enter Code: *${code}*`;

    const res = await shareLink({
      title: 'Hostel Mess Menu',
      text: shareText,
      dialogTitle: 'Share Mess Code via',
    });
    if (res === 'copied') {
      showToast('Copied', `Mess code copied: ${code}`, 'success');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteInput.trim();
    if (!code) return;

    if (code.includes('/join/')) {
      code = code.split('/join/').pop()?.split('?')[0]?.split('#')[0] || code;
    }

    setIsJoining(true);
    try {
      const docRef = doc(db, 'messes', code);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const newMessData = docSnap.data();
        updateMessMenu(newMessData);
        setShowJoinModal(false);
        setInviteInput('');
        showToast('Joined Mess', 'Mess menu successfully updated!', 'success');
      } else {
        showToast('Invalid Code', 'Could not find a mess menu with this code.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Join Error', 'Failed to connect to mess service.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSaveTimings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMess = {
      ...messMenu,
      timings: tempTimings,
    };
    updateMessMenu(updatedMess);
    const savedMess = await saveSharedMess(updatedMess);
    if (savedMess !== updatedMess) updateMessMenu(savedMess);
    setShowEditTimingsModal(false);
    showToast('Timings Updated', 'Meal timings have been saved and synced across devices.', 'success');
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMess = {
      ...messMenu,
      menu: tempMenu,
    };
    updateMessMenu(updatedMess);
    const savedMess = await saveSharedMess(updatedMess);
    if (savedMess !== updatedMess) updateMessMenu(savedMess);
    setShowEditMenuModal(false);
    showToast('Menu Updated', 'Weekly menu changes saved and synced.', 'success');
  };

  const handleSaveQuickMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditMeal) return;

    const { day, meal, dishes, timing } = quickEditMeal;
    const itemsArray = dishes.split(',').map(s => s.trim()).filter(Boolean);

    const updatedMenu = {
      ...(messMenu.menu || {}),
      [day]: {
        ...(messMenu.menu?.[day] || {}),
        [meal]: itemsArray,
      },
    };

    const updatedTimings = {
      ...effectiveTimings,
      [meal]: timing.trim(),
    };

    const updatedMess = {
      ...messMenu,
      menu: updatedMenu,
      timings: updatedTimings,
    };

    updateMessMenu(updatedMess);
    const savedMess = await saveSharedMess(updatedMess);
    if (savedMess !== updatedMess) updateMessMenu(savedMess);

    setQuickEditMeal(null);
    showToast('Meal Saved', `${meal} updated for ${day}.`, 'success');
  };

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-4xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <h2 className="page-title">
            Mess,<br />Hostel,<br />Food,<br />Menu
          </h2>
          <p className="text-[14px] font-normal text-muted leading-[20px] mt-4">
            Weekly breakfast, lunch, snacks, and dinner menu with live meal countdowns.
          </p>
        </div>

        <div className="page-actions mt-2">
          <button
            onClick={handleShare}
            className="btn btn-secondary"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn btn-secondary"
          >
            Join Mess
          </button>
          <button
            onClick={() => setIsImporting(true)}
            className="btn btn-primary"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
        </div>
      </div>

      <LiveMealCard 
        todayMenu={messMenu.menu?.[today] || {}} 
        timings={effectiveTimings} 
        today={today}
      />

      {/* Day picker: the whole week fits on one row, today is marked */}
      <div role="tablist" aria-label="Day of week" className="grid grid-cols-7 border border-line bg-surface">
        {days.map((day, idx) => {
          const isSelected = selectedDay === day;
          const isToday = today === day;
          const date = weekDates[idx];
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`${day}${isToday ? ', today' : ''}`}
              onClick={() => setSelectedDay(day)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 cursor-pointer transition-colors ${
                idx > 0 ? 'border-l border-line-soft' : ''
              } ${
                isSelected
                  ? 'bg-ink text-on-ink'
                  : 'text-fg hover:bg-surface-2'
              }`}
            >
              <span className={`text-[11px] font-semibold uppercase tracking-[1px] ${isSelected ? 'opacity-80' : 'text-muted'}`}>
                {day.slice(0, 3)}
              </span>
              <span className="text-[17px] font-semibold leading-none tabular-nums">{date.getDate()}</span>
              <span className={`h-1 w-1 rounded-full ${isToday ? (isSelected ? 'bg-surface' : 'bg-ink') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {/* Meals for the selected day */}
      <section aria-label={`${selectedDay} menu`}>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[17px] font-semibold text-fg tracking-tight">
            {selectedDay === today ? "Today's menu" : `${selectedDay}'s menu`}
          </h3>
          <span className="text-[13px] text-muted">
            Code <span className="font-mono font-semibold text-fg">{messMenu.id}</span>
          </span>
        </div>

        <ol className="border border-line bg-surface divide-y divide-line-soft">
          {MEAL_ORDER.map((meal) => {
            const items: string[] = Array.isArray(selectedMenu[meal]) ? selectedMenu[meal] : (selectedMenu[meal] ? [selectedMenu[meal]] : []);
            const rawTiming = effectiveTimings[meal] || '';
            const window = getMealWindows(effectiveTimings, selectedDay).find((w) => w.name === meal)!;
            const MealIcon = MEAL_ICONS[meal];
            const isTodaySelected = selectedDay === today && mealClock.now !== null;
            const state = !isTodaySelected
              ? null
              : mealClock.serving?.name === meal
              ? 'now'
              : mealClock.now! >= window.end
              ? 'done'
              : mealClock.next?.name === meal
              ? 'next'
              : null;

            return (
              <li key={meal} className={`flex gap-4 p-4 sm:p-5 ${state === 'done' ? 'opacity-60' : ''}`}>
                <span className={`w-10 h-10 shrink-0 flex items-center justify-center border ${
                  state === 'now'
                    ? 'bg-ink border-line-strong text-on-ink'
                    : 'bg-surface-2 border-line-soft text-fg'
                }`}>
                  <MealIcon className="w-5 h-5" aria-hidden="true" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[16px] font-semibold text-fg leading-tight">{meal}</h4>
                        {state === 'now' && (
                          <span className="px-2 py-0.5 text-[12px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Serving now</span>
                        )}
                        {state === 'next' && (
                          <span className="px-2 py-0.5 text-[12px] font-semibold bg-surface-3 text-fg">Up next</span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-muted tabular-nums">
                        {formatMinutes(window.start)} – {formatMinutes(window.end)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickEditMeal({
                          day: selectedDay,
                          meal,
                          dishes: items.join(', '),
                          timing: rawTiming,
                        });
                      }}
                      title={`Edit ${meal}`} aria-label={`Edit ${selectedDay} ${meal}`}
                      className="w-9 h-9 -mr-2 -mt-1.5 shrink-0 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  {items.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {items.map((dish, idx) => (
                        <li key={idx} className="px-2.5 py-1 text-[14px] text-fg bg-surface-2 border border-line-soft">
                          {dish}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[14px] text-muted">Not added yet. Tap edit to add dishes.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* QUICK SINGLE MEAL & TIMING EDIT MODAL */}
      <Modal 
        isOpen={!!quickEditMeal} 
        onClose={() => setQuickEditMeal(null)} 
        title={`Edit ${quickEditMeal?.meal} (${quickEditMeal?.day})`}
      >
        {quickEditMeal && (
          <form onSubmit={handleSaveQuickMeal} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-fg">
                Serving Hours
              </label>
              <input
                type="text"
                value={quickEditMeal.timing}
                onChange={(e) =>
                  setQuickEditMeal({
                    ...quickEditMeal,
                    timing: e.target.value,
                  })
                }
                placeholder="e.g. 8:00 - 10:00 or 08:00 - 09:30 (Mon-Fri) / 08:00 - 10:00 (Sat-Sun)"
                className="w-full px-3.5 py-2 border border-line bg-transparent text-[13px] text-fg focus:outline-none"
                required
              />
              <p className="text-[11px] text-[#6B6B6B]">
                Supports single timing or day formats like (Mon-Fri) / (Sat-Sun).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-fg">
                Dishes (comma-separated)
              </label>
              <textarea
                rows={4}
                value={quickEditMeal.dishes}
                onChange={(e) =>
                  setQuickEditMeal({
                    ...quickEditMeal,
                    dishes: e.target.value,
                  })
                }
                placeholder="e.g. Dosa, Sambar, Coconut Chutney"
                className="w-full px-3.5 py-2 border border-line bg-transparent text-[13px] text-fg focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setQuickEditMeal(null)}
                className="h-11 px-4 border border-line text-[14px] font-semibold text-fg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Meal
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* EDIT TIMINGS MODAL */}
      <Modal isOpen={showEditTimingsModal} onClose={() => setShowEditTimingsModal(false)} title="Edit Meal Timings">
        <form onSubmit={handleSaveTimings} className="flex flex-col gap-4 text-left">
          <p className="text-[13px] text-[#6B6B6B]">
            Configure the serving hours for each meal. Supports single timing or weekday/weekend rules.
          </p>

          <div className="grid grid-cols-1 gap-3.5">
            {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => (
              <div key={meal} className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-fg">
                  {meal} Timing
                </label>
                <input
                  type="text"
                  value={tempTimings[meal] || ''}
                  onChange={(e) =>
                    setTempTimings({
                      ...tempTimings,
                      [meal]: e.target.value,
                    })
                  }
                  placeholder="e.g. 8:00 - 10:00 or 08:00 - 09:30 (Mon-Fri) / 08:00 - 10:00 (Sat-Sun)"
                  className="w-full px-3.5 py-2 border border-line bg-transparent text-[13px] text-fg focus:outline-none focus:border-line-strong"
                  required
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowEditTimingsModal(false)}
              className="h-11 px-4 border border-line text-[14px] font-semibold text-fg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save Timings
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MENU MODAL */}
      <Modal isOpen={showEditMenuModal} onClose={() => setShowEditMenuModal(false)} title="Edit Weekly Menu" maxWidth="2xl">
        <form onSubmit={handleSaveMenu} className="flex flex-col gap-5 text-left max-h-[75vh] overflow-y-auto pr-1">
          <p className="text-[13px] text-[#6B6B6B]">
            Edit dishes for any day of the week. Separate multiple items with commas.
          </p>

          <div className="flex flex-col gap-6">
            {days.map((day) => {
              const dayData = tempMenu[day] || {};
              return (
                <div key={day} className="p-4 border border-line bg-[#FAFAFA] dark:bg-[#161616]">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-fg mb-3 border-b border-line pb-1">
                    {day}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => {
                      const items = dayData[meal] || [];
                      const valStr = Array.isArray(items) ? items.join(', ') : items;
                      return (
                        <div key={meal} className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                            {meal}
                          </label>
                          <input
                            type="text"
                            value={valStr}
                            onChange={(e) => {
                              const newItems = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              setTempMenu({
                                ...tempMenu,
                                [day]: {
                                  ...dayData,
                                  [meal]: newItems,
                                },
                              });
                            }}
                            placeholder="e.g. Roti, Dal, Rice"
                            className="w-full px-3 py-1.5 border border-line bg-surface text-[12px] text-fg focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 sticky bottom-0 bg-surface pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setShowEditMenuModal(false)}
              className="h-11 px-4 border border-line text-[14px] font-semibold text-fg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save Menu Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* JOIN MESS DIRECT MODAL */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Another Mess Menu">
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 text-left">
          <p className="text-[13px] text-[#6B6B6B]">
            Enter a mess invite code or paste an invite link to switch to that shared menu.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g., ext_... or 4-digit code"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#ECECEA] dark:border-[#333333] bg-transparent text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="h-11 px-4 border border-line text-[14px] font-semibold text-fg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining}
              className="btn btn-primary"
            >
              {isJoining ? 'Joining...' : 'Join & Overwrite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
