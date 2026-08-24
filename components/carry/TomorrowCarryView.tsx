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
import { Backpack, Plus, MapPin, CalendarDays, Clock, FlaskConical, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Subject } from '@/lib/types';

// Signature pastel paper palette
const ELEGANT_PASTEL_PALETTE = [
  'bg-[#FEF9C3]/80 dark:bg-[#78350F]/25 border-[#FDE047]/60 dark:border-[#FACC15]/30', // Golden Cream
  'bg-[#E0F2FE]/80 dark:bg-[#0C4A6E]/25 border-[#7DD3FC]/60 dark:border-[#38BDF8]/30', // Ice Denim Blue
  'bg-[#FCE7F3]/80 dark:bg-[#831843]/25 border-[#F9A8D4]/60 dark:border-[#F472B6]/30', // Soft Rose Pink
  'bg-[#DCFCE7]/80 dark:bg-[#064E3B]/25 border-[#86EFAC]/60 dark:border-[#4ADE80]/30', // Fresh Sage Mint
  'bg-[#FFEDD5]/80 dark:bg-[#7C2D12]/25 border-[#FDBA74]/60 dark:border-[#FB923C]/30', // Peach Terracotta
  'bg-[#F3E8FF]/80 dark:bg-[#3B0764]/25 border-[#D8B4FE]/60 dark:border-[#C084FC]/30', // Soft Lavender
  'bg-[#CCFBF1]/80 dark:bg-[#134E4A]/25 border-[#5EEAD4]/60 dark:border-[#2DD4BF]/30', // Soft Teal
  'bg-[#FFE4E6]/80 dark:bg-[#881337]/25 border-[#FDA4AF]/60 dark:border-[#FB7185]/30', // Blush Coral
  'bg-[#FEF3C7]/80 dark:bg-[#78350F]/25 border-[#FCD34D]/60 dark:border-[#F59E0B]/30', // Warm Amber
  'bg-[#ECFCCB]/80 dark:bg-[#365314]/25 border-[#BEF264]/60 dark:border-[#A3E635]/30', // Soft Lime
];

const getSubjectPastelStyle = (sub?: Subject, fallbackId: string = '') => {
  const key = sub?.name || sub?.id || fallbackId;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % ELEGANT_PASTEL_PALETTE.length;
  }
  return ELEGANT_PASTEL_PALETTE[Math.abs(hash)];
};

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
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(isAfter6PM ? new Date(Date.now() + 86400000) : new Date());

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left max-w-5xl mx-auto w-full pb-16 font-sans">
      {/* Editorial Stacked Header — matching App Design System */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <h1 className="text-[clamp(3rem,12vw,5.5rem)] font-medium tracking-tight leading-none text-black dark:text-white">
            Bag,<br />Carry,<br />Pack
          </h1>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-none border border-black dark:border-white text-black dark:text-white uppercase tracking-wider">
              {targetDay}
            </span>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-none border border-black dark:border-white text-black dark:text-white">
              {packedCount}/{totalCount} packed
            </span>
          </div>
          <p className="text-sm sm:text-base text-black/65 dark:text-white/65 mt-3 font-normal leading-relaxed max-w-md flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
            <span>Packing list for {isAfter6PM ? 'tomorrow' : 'today'} · {targetFormatted}</span>
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 mt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-none bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors text-sm font-semibold cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Custom Item</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Schedule Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-black/10 dark:border-white/10">
            <h2 className="text-xs font-black text-black dark:text-white tracking-widest uppercase flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {isAfter6PM ? "Tomorrow's Schedule" : "Today's Schedule"}
            </h2>
            <span className="text-[11px] font-mono font-bold border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 px-2 py-0.5 rounded-none">
              {targetClasses.length} {targetClasses.length === 1 ? 'lecture' : 'lectures'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {targetClasses.length === 0 ? (
              <div className="p-6 border border-black/20 dark:border-white/20 text-center text-xs text-black/60 dark:text-white/60 font-medium">
                No classes scheduled for {isAfter6PM ? 'tomorrow' : 'today'}. Enjoy your break!
              </div>
            ) : (
              targetClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                const pastelClass = getSubjectPastelStyle(sub, sess.id);

                return (
                  <div
                    key={sess.id}
                    className={`p-4 border rounded-none flex items-center justify-between text-left transition-all ${pastelClass} text-black dark:text-white`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 shrink-0 flex flex-col pt-0.5">
                        <span className="text-[13px] font-black tracking-tighter font-mono text-black dark:text-white">
                          {sess.startTime}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-black dark:text-white truncate">
                          {sub?.name || 'Class'}
                        </span>
                        <div className="flex items-center gap-2 text-xs opacity-75 font-medium flex-wrap mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {sess.room}
                          </span>
                          {sess.isLab && (
                            <span className="font-bold font-mono text-[10px] px-1.5 border border-current">
                              LAB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Things to Carry List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bento-card border border-black/20 dark:border-white/20 rounded-none flex flex-col gap-5 p-5 sm:p-6">
            {/* Header & Progress */}
            <div className="flex flex-col gap-3 pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-black dark:border-white text-black dark:text-white flex items-center justify-center">
                    <Backpack className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-black dark:text-white tracking-tight">
                      Things to Carry
                    </h2>
                    <p className="text-xs text-black/60 dark:text-white/60 font-medium">
                      {packedCount} of {totalCount} packed ({progressPercent}%)
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-1 border rounded-none ${
                    progressPercent === 100
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                      : 'border-black dark:border-white text-black dark:text-white'
                  }`}
                >
                  {progressPercent === 100 ? 'All Packed 🎉' : `${progressPercent}% Ready`}
                </span>
              </div>

              {/* Progress Bar */}
              {totalCount > 0 && (
                <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-none overflow-hidden mt-1">
                  <motion.div
                    className={`h-full ${
                      progressPercent === 100
                        ? 'bg-emerald-600'
                        : 'bg-black dark:bg-white'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>

            {/* Checklist Items */}
            {carryItems.length === 0 ? (
              <EmptyState
                icon={<Backpack className="w-5 h-5 text-black/50 dark:text-white/50" />}
                title={`Nothing special to carry ${isAfter6PM ? 'tomorrow' : 'today'}`}
                description={`Either ${isAfter6PM ? 'tomorrow' : 'today'} is a free day or no carry requirements are configured for ${isAfter6PM ? "tomorrow's" : "today's"} classes.`}
                actionLabel="Add Custom Item"
                onAction={() => setShowAddModal(true)}
              />
            ) : (
              <div className="flex flex-col gap-3">
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

            {/* Add Custom Item Quick Action */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 text-xs font-bold text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white py-2.5 px-3 border border-dashed border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white transition-all w-fit cursor-pointer mt-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add custom item to list</span>
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
