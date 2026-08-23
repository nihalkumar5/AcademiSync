'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTomorrowDayOfWeek,
  timeToMinutes,
} from '@/lib/timetableUtils';
import { CarryItemRow } from './CarryItemRow';
import { AddCustomItemModal } from './AddCustomItemModal';
import { EmptyState } from '../ui/EmptyState';
import { Backpack, Plus, MapPin, CalendarDays, Clock } from 'lucide-react';
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

  const tomorrowDay = getTomorrowDayOfWeek();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Tomorrow's classes
  const tomorrowClasses = timetable
    .filter((s) => s.day === tomorrowDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Carry items for tomorrow
  const packedCount = carryItems.filter((i) => i.isPacked).length;
  const totalCount = carryItems.length;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const tomorrowFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.now() + 86400000));

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full pb-12 font-sans">
      {/* Editorial Stacked Header — matches Weekly Timetable style */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <h1 className="text-[clamp(3rem,12vw,5.5rem)] font-medium tracking-tight leading-none text-black dark:text-white">
            Bag<br />Carry,<br />Pack
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-none border border-black dark:border-white text-black dark:text-white">
              {tomorrowDay}
            </span>
          </div>
          <p className="text-sm sm:text-base text-black/60 dark:text-white/60 mt-3 font-normal leading-relaxed max-w-md flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>Packing list for tomorrow · {tomorrowFormatted}</span>
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-none bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors text-sm font-medium cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Custom Item</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tomorrow's Classes Schedule */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-black dark:text-white tracking-widest uppercase flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Tomorrow&apos;s Schedule
            </h2>
            <span className="text-[11px] font-mono font-bold border border-black dark:border-white text-black dark:text-white px-2 py-0.5">
              {tomorrowClasses.length} lectures
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {tomorrowClasses.length === 0 ? (
              <div className="p-6 border border-black dark:border-white text-center text-xs text-black/60 dark:text-white/60 font-medium">
                No classes scheduled for tomorrow. Enjoy your break!
              </div>
            ) : (
              tomorrowClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                return (
                  <div
                    key={sess.id}
                    className="p-3.5 glass-card flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-black dark:text-white border border-black dark:border-white px-2 py-1 w-14 text-center shrink-0">
                        {sess.startTime}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                          {sub?.name || 'Class'}
                        </span>
                        <span className="text-[11px] text-black/50 dark:text-white/50 flex items-center gap-1 font-medium truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{sess.room}</span>
                          {sess.isLab && (
                            <span className="font-bold ml-1 font-mono text-[10px] px-1.5 border border-black dark:border-white text-black dark:text-white">
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
          <div className="glass-card flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/20 dark:border-white/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 border border-black dark:border-white text-black dark:text-white flex items-center justify-center">
                  <Backpack className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-black dark:text-white">
                    Things to Carry
                  </h2>
                  <p className="text-[11px] text-black/60 dark:text-white/60 font-medium">
                    {packedCount} of {totalCount} packed ({progressPercent}%)
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-1 border ${
                  progressPercent === 100
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-black dark:border-white text-black dark:text-white'
                }`}
              >
                {progressPercent === 100 ? 'All Packed 🎉' : `${progressPercent}% Ready`}
              </span>
            </div>

            {/* Checklist Items */}
            {carryItems.length === 0 ? (
              <EmptyState
                icon={<Backpack className="w-5 h-5 text-black/50 dark:text-white/50" />}
                title="Nothing special to carry tomorrow"
                description="Either tomorrow is a free day or no carry requirements are configured for tomorrow's classes."
                actionLabel="Add Custom Item"
                onAction={() => setShowAddModal(true)}
              />
            ) : (
              <div className="flex flex-col gap-2">
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

            {/* Add Custom Item Text Action */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white py-1.5 px-2.5 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white transition-colors w-fit cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add custom item</span>
            </button>
          </div>
        </div>
      </div>

      <AddCustomItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};
