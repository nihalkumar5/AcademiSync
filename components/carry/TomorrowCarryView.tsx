'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTomorrowDayOfWeek,
  getCurrentDayOfWeek,
  timeToMinutes,
} from '@/lib/timetableUtils';
import { CarryItemRow } from './CarryItemRow';
import { AddCustomItemModal } from './AddCustomItemModal';
import { EmptyState } from '../ui/EmptyState';
import { Backpack, Plus, MapPin, CalendarDays, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const TomorrowCarryView: React.FC = () => {
  const {
    timetable,
    subjects,
    carryItems,
    toggleCarryItemPacked,
    deleteCarryItem,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const currentHour = now.getHours();
  const isAfter6PM = currentHour >= 18;

  const targetDay = isAfter6PM ? getTomorrowDayOfWeek() : getCurrentDayOfWeek();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Target day's classes
  const targetClasses = timetable
    .filter((s) => s.day === targetDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Carry items for target day
  const packedCount = carryItems.filter((i) => i.isPacked).length;
  const totalCount = carryItems.length;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const targetFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(isAfter6PM ? new Date(Date.now() + 86400000) : new Date());

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full pb-16 font-sans">
      {/* Header section — modern, spacious & clean */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#8C6B5D]/10 text-[#8C6B5D] dark:text-[#CBB5A1] text-xs font-bold uppercase tracking-wider">
              {targetDay}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              • {isAfter6PM ? 'Tomorrow' : 'Today'}, {targetFormatted}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            Bag & Carry
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Daily checklist and gear requirements for your upcoming lectures
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Custom Item</span>
        </button>
      </div>

      {/* Progress & Packing Status Banner */}
      {totalCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#8C6B5D]/10 dark:bg-[#8C6B5D]/20 text-[#8C6B5D] dark:text-[#CBB5A1] flex items-center justify-center">
                <Backpack className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Packing Progress
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  {packedCount} of {totalCount} items packed
                </p>
              </div>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              progressPercent === 100
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}>
              {progressPercent === 100 ? 'All Set! 🎉' : `${progressPercent}% Ready`}
            </span>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <motion.div
              className={`h-2 rounded-full ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : 'bg-[#8C6B5D] dark:bg-[#CBB5A1]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Schedule Preview */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{isAfter6PM ? "Tomorrow's Schedule" : "Today's Schedule"}</span>
            </h2>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              {targetClasses.length} {targetClasses.length === 1 ? 'lecture' : 'lectures'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {targetClasses.length === 0 ? (
              <div className="p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/60 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                No classes scheduled for {isAfter6PM ? 'tomorrow' : 'today'}. Enjoy your break!
              </div>
            ) : (
              targetClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                return (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
                        {sess.startTime}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {sub?.name || 'Class'}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium truncate mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
                          <span>{sess.room}</span>
                          {sess.isLab && (
                            <span className="font-bold font-mono text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              LAB
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Things to Carry List */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
              <Backpack className="w-3.5 h-3.5" />
              <span>Items to Pack</span>
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-semibold text-[#8C6B5D] dark:text-[#CBB5A1] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add item</span>
            </button>
          </div>

          {/* Checklist Items */}
          {carryItems.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Backpack className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Nothing to carry {isAfter6PM ? 'tomorrow' : 'today'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                  No specific lab manuals or subject items configured for this schedule.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 transition-colors"
              >
                + Add Custom Item
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {carryItems.map((item) => (
                <CarryItemRow
                  key={item.id}
                  item={item}
                  onToggle={toggleCarryItemPacked}
                  onDelete={deleteCarryItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddCustomItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};
