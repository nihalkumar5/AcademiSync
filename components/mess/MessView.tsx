'use client';

import { shareLink } from '@/lib/shareUtils';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MessOnboarding } from './MessOnboarding';
import { format } from 'date-fns';
import { Share, Sparkles, Clock, Edit3, X, Check, ArrowRight } from 'lucide-react';
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

const LiveMealCard = ({ 
  todayMenu, 
  timings,
  today,
  onEditTime,
  onEditMenu 
}: { 
  todayMenu: any; 
  timings: Record<string, string>;
  today: string;
  onEditTime: () => void;
  onEditMenu: () => void;
}) => {
  const [timeState, setTimeState] = React.useState<{ status: string; meal: string; timeLeft: string; items: string[] } | null>(null);

  React.useEffect(() => {
    const activeTimings = [
      { name: 'Breakfast', ...parseTimeToMinutes(resolveMealTimingForDay(timings?.Breakfast, today), 8 * 60, 10 * 60) },
      { name: 'Lunch', ...parseTimeToMinutes(resolveMealTimingForDay(timings?.Lunch, today), 12 * 60 + 30, 14 * 60 + 30) },
      { name: 'Snacks', ...parseTimeToMinutes(resolveMealTimingForDay(timings?.Snacks, today), 16 * 60 + 30, 17 * 60 + 30) },
      { name: 'Dinner', ...parseTimeToMinutes(resolveMealTimingForDay(timings?.Dinner, today), 19 * 60 + 30, 21 * 60 + 30) },
    ];

    const update = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const serving = activeTimings.find(m => currentMins >= m.start && currentMins < m.end);
      if (serving) {
        const diff = serving.end - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[serving.name] || [];
        setTimeState({
          status: 'SERVING NOW',
          meal: serving.name,
          timeLeft: h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`,
          items: items,
        });
        return;
      }

      const upcoming = activeTimings.find(m => m.start > currentMins);
      if (upcoming) {
        const diff = upcoming.start - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[upcoming.name] || [];
        setTimeState({
          status: 'UPCOMING MEAL',
          meal: upcoming.name,
          timeLeft: h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`,
          items: items,
        });
        return;
      }

      const nextBreakfast = activeTimings[0];
      const diff = (24 * 60 - currentMins) + nextBreakfast.start;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setTimeState({
        status: 'NEXT MEAL TOMORROW',
        meal: 'Breakfast',
        timeLeft: `Starts in ${h}h ${m}m`,
        items: todayMenu?.['Breakfast'] || [],
      });
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [todayMenu, timings, today]);

  if (!timeState) return null;

  return (
    <div className="w-full bg-[#111111] dark:bg-[#1A1A1A] border border-[#111111] dark:border-[#333333] rounded-none p-5 sm:p-6 flex flex-col relative text-left text-white shadow-lg mb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {timeState.status === 'SERVING NOW' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${timeState.status === 'SERVING NOW' ? 'bg-emerald-400' : 'bg-white'}`}></span>
          </span>
          <span className="text-[11px] font-bold tracking-[1.6px] uppercase text-[#FFFFFF] leading-none">
            {timeState.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-semibold text-[#FFFFFF] bg-white/10 px-2.5 py-1 border border-white/20">
            {timeState.timeLeft}
          </span>
        </div>
      </div>

      {/* Meal Name & Quick Actions */}
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[26px] sm:text-[28px] font-bold text-[#FFFFFF] leading-tight tracking-tight">
          {timeState.meal}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditTime}
            className="text-[11px] font-bold tracking-wider uppercase text-white/70 hover:text-white px-2 py-0.5 border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Edit Time
          </button>
          <button
            type="button"
            onClick={onEditMenu}
            className="text-[11px] font-bold tracking-wider uppercase text-white/70 hover:text-white px-2 py-0.5 border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Edit Dishes
          </button>
        </div>
      </div>

      {/* Dishes */}
      {timeState.items.length > 0 && (
        <p className="text-[14.5px] font-normal text-[#D1D1D1] leading-relaxed">
          {timeState.items.join(' · ')}
        </p>
      )}
    </div>
  );
};

export const MessView: React.FC = () => {
  const { messMenu, updateMessMenu, showToast } = useApp();

  const today = format(new Date(), 'EEEE');
  const [selectedDay, setSelectedDay] = useState(today);
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
    const url = `${window.location.origin}/join/${messMenu.id}`;
    const res = await shareLink({
      title: 'Hostel Mess Menu',
      text: '🍛 Check out our weekly hostel mess menu & live meal timings on Intersemester:',
      url,
      dialogTitle: 'Share Mess Menu via',
    });
    if (res === 'copied') {
      showToast('Copied', 'Invite link copied to clipboard!', 'success');
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
    if (messMenu.id) {
      try {
        await setDoc(doc(db, 'messes', messMenu.id), updatedMess, { merge: true });
      } catch (err) {}
    }
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
    if (messMenu.id) {
      try {
        await setDoc(doc(db, 'messes', messMenu.id), updatedMess, { merge: true });
      } catch (err) {}
    }
    setShowEditMenuModal(false);
    showToast('Menu Updated', 'Weekly menu changes saved and synced.', 'success');
  };

  const handleSaveQuickMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditMeal) return;

    const { day, meal, dishes, timing } = quickEditMeal;
    const dishArray = dishes.split(',').map(s => s.trim()).filter(Boolean);

    const updatedMenu = {
      ...(messMenu.menu || {}),
      [day]: {
        ...((messMenu.menu || {})[day] || {}),
        [meal]: dishArray,
      },
    };

    const updatedTimings = {
      ...(messMenu.timings || DEFAULT_TIMINGS),
      [meal]: timing.trim(),
    };

    const updatedMess = {
      ...messMenu,
      menu: updatedMenu,
      timings: updatedTimings,
    };

    updateMessMenu(updatedMess);
    if (messMenu.id) {
      try {
        await setDoc(doc(db, 'messes', messMenu.id), updatedMess, { merge: true });
      } catch (err) {}
    }

    setQuickEditMeal(null);
    showToast('Meal Saved', `${meal} updated for ${day}.`, 'success');
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12 text-left">
      <div className="flex flex-col items-start pt-2 sm:pt-6 mb-4">
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Hostel,<br />
          Mess,<br />
          Weekly,<br />
          Menu
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4">
          Your complete week's dining schedule & live meal countdowns.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 mt-8">
          <button
            onClick={handleShare}
            className="flex items-center justify-center h-9 px-3.5 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2 cursor-pointer"
          >
            <Share className="w-3.5 h-3.5" /> Share
          </button>
          <button
            onClick={() => {
              setTempTimings(effectiveTimings);
              setShowEditTimingsModal(true);
            }}
            className="flex items-center justify-center h-9 px-3.5 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" /> Edit Timings
          </button>
          <button
            onClick={() => {
              setTempMenu(messMenu.menu || {});
              setShowEditMenuModal(true);
            }}
            className="flex items-center justify-center h-9 px-3.5 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Menu
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center justify-center h-9 px-3.5 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            Join Mess
          </button>
          <button
            onClick={() => setIsImporting(true)}
            className="flex items-center justify-center h-9 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-semibold transition-colors gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Magic Import
          </button>
        </div>
      </div>

      <LiveMealCard 
        todayMenu={messMenu.menu?.[today] || {}} 
        timings={effectiveTimings} 
        today={today}
        onEditTime={() => {
          setTempTimings(effectiveTimings);
          setShowEditTimingsModal(true);
        }}
        onEditMenu={() => {
          setTempMenu(messMenu.menu || {});
          setShowEditMenuModal(true);
        }}
      />

      {/* DAY PICKER (Monochrome Notion Style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {days.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = today === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center justify-center min-w-[70px] h-[56px] transition-all cursor-pointer shrink-0 rounded-none border ${
                isSelected
                  ? 'bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] border-[#111111] dark:border-[#FFFFFF]'
                  : 'border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#666666] dark:text-[#999999] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              <span className="text-[12px] font-bold uppercase tracking-wider">{day.slice(0, 3)}</span>
              {isToday && (
                <span className={`text-[9px] font-bold tracking-tight mt-0.5 ${isSelected ? 'opacity-80' : 'text-[#999999]'}`}>
                  TODAY
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MENU CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => {
          const items = selectedMenu[meal];
          if (!items || items.length === 0) return null;

          const rawTiming = effectiveTimings[meal] || '';
          const displayTiming = resolveMealTimingForDay(rawTiming, selectedDay);

          return (
            <div key={meal} className="flex flex-col p-5 border border-[#D9D9D6] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#EAEAEA] dark:border-[#262626]">
                <h4 className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
                  {meal}
                </h4>
                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] text-[#777777] dark:text-[#AAAAAA] font-mono font-medium">
                    {displayTiming}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickEditMeal({
                        day: selectedDay,
                        meal,
                        dishes: Array.isArray(items) ? items.join(', ') : items,
                        timing: rawTiming,
                      });
                    }}
                    className="text-[10px] font-bold tracking-wider uppercase text-[#666666] hover:text-black dark:text-[#AAAAAA] dark:hover:text-white px-2 py-0.5 border border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F0F0ED] dark:hover:bg-[#222222] transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-[14px] text-[#444444] dark:text-[#D1D1D1] font-normal">
                    <span className="w-1.5 h-1.5 bg-[#111111] dark:bg-[#FFFFFF] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* QUICK SINGLE MEAL & TIMING EDIT MODAL */}
      <Modal 
        isOpen={!!quickEditMeal} 
        onClose={() => setQuickEditMeal(null)} 
        title={`Edit ${quickEditMeal?.meal} (${quickEditMeal?.day})`}
      >
        {quickEditMeal && (
          <form onSubmit={handleSaveQuickMeal} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
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
                className="w-full px-3.5 py-2 border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                required
              />
              <p className="text-[11px] text-[#888888]">
                Supports single timing or day formats like (Mon-Fri) / (Sat-Sun).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
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
                className="w-full px-3.5 py-2 border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setQuickEditMeal(null)}
                className="h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center cursor-pointer"
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
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
                  className="w-full px-3.5 py-2 border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]"
                  required
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowEditTimingsModal(false)}
              className="h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center cursor-pointer"
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
                <div key={day} className="p-4 border border-[#D9D9D6] dark:border-[#333333] bg-[#FAFAFA] dark:bg-[#161616]">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-3 border-b border-[#D8D8D8] dark:border-[#333333] pb-1">
                    {day}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => {
                      const items = dayData[meal] || [];
                      const valStr = Array.isArray(items) ? items.join(', ') : items;
                      return (
                        <div key={meal} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
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
                            className="w-full px-3 py-1.5 border border-[#D9D9D6] dark:border-[#333333] bg-white dark:bg-[#111111] text-[12px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 sticky bottom-0 bg-[#FFFFFF] dark:bg-[#111111] pt-3 border-t border-[#D9D9D6] dark:border-[#333333]">
            <button
              type="button"
              onClick={() => setShowEditMenuModal(false)}
              className="h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center cursor-pointer"
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
              className="w-full px-4 py-2.5 border border-[#E5E5E5] dark:border-[#333333] bg-transparent text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining}
              className="h-10 px-5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isJoining ? 'Joining...' : 'Join & Overwrite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
