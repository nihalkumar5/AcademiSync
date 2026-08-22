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
import { Backpack, Plus, MapPin, Sparkles, CheckCircle2, Clock, CalendarDays } from 'lucide-react';
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 sm:pt-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1918] dark:text-[#F4F1EA]">
              Bag Carry
            </h1>
            <span className="text-xs font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] bg-[#F4EFE6] dark:bg-[#2A2724] border border-[#DFD6CA] dark:border-[#383430] px-2.5 py-1 rounded-full">
              {tomorrowDay}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C] mt-1 font-medium flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#8C6B5D]" />
            <span>Packing list for tomorrow &bull; {tomorrowFormatted}</span>
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8C6B5D] hover:bg-[#785B4E] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer w-fit"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Custom Item</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tomorrow's Classes Schedule */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[#1A1918] dark:text-[#F4F1EA] tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8C6B5D]" />
              <span>Tomorrow&apos;s Schedule</span>
            </h2>
            <span className="text-[11px] font-mono font-bold text-[#7A6D61] dark:text-[#9E958C] bg-[#F4EFE6]/70 dark:bg-[#201E1C] px-2 py-0.5 rounded-full border border-[#DFD6CA]/60 dark:border-[#2C2926]">
              {tomorrowClasses.length} lectures
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {tomorrowClasses.length === 0 ? (
              <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#1C1B19]/90 border border-[#E6DDD2] dark:border-[#2C2926] text-center text-xs text-[#8C7D70] font-medium">
                No classes scheduled for tomorrow. Enjoy your break!
              </div>
            ) : (
              tomorrowClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                return (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#1C1B19]/90 border border-[#E6DDD2] dark:border-[#2C2926] shadow-2xs flex items-center justify-between text-left hover:border-[#8C6B5D]/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] bg-[#F4EFE6] dark:bg-[#2A2724] px-2 py-1 rounded-xl w-14 text-center shrink-0 border border-[#DFD6CA]/60 dark:border-[#383430]">
                        {sess.startTime}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#1A1918] dark:text-[#F4F1EA] truncate">
                          {sub?.name || 'Class'}
                        </span>
                        <span className="text-[11px] text-[#7A6D61] dark:text-[#9E958C] flex items-center gap-1 font-medium truncate">
                          <MapPin className="w-3 h-3 text-[#8C7D70] shrink-0" />
                          <span>{sess.room}</span>
                          {sess.isLab && (
                            <span className="text-[#8C6B5D] font-bold ml-1 font-mono text-[10px] px-1.5 py-0.2 bg-[#F4EFE6] dark:bg-[#2A2724] rounded">
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
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE2] dark:border-[#282624]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFEAE2] dark:bg-[#2A2724] text-[#8C6B5D] flex items-center justify-center">
                  <Backpack className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1A1918] dark:text-[#F4F1EA]">
                    Things to Carry
                  </h2>
                  <p className="text-[11px] text-[#7A6D61] dark:text-[#9A9188] font-medium">
                    {packedCount} of {totalCount} packed ({progressPercent}%)
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                  progressPercent === 100
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-[#F4EFE6] text-[#8C6B5D] dark:bg-[#2A2724] dark:text-[#CBB5A1] border-[#DFD6CA] dark:border-[#383430]'
                }`}
              >
                {progressPercent === 100 ? 'All Packed 🎉' : `${progressPercent}% Ready`}
              </span>
            </div>

            {/* Checklist Items */}
            {carryItems.length === 0 ? (
              <EmptyState
                icon={<Backpack className="w-5 h-5 text-[#8C7D70]" />}
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
              className="flex items-center gap-1.5 text-xs font-semibold text-[#8C6B5D] hover:text-[#6E4F36] dark:text-[#CBB5A1] py-1.5 px-2.5 rounded-xl hover:bg-[#F4EFE6] dark:hover:bg-[#252220] transition-colors w-fit cursor-pointer"
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
