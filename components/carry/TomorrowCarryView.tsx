'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTomorrowDayOfWeek,
  getTomorrowDateString,
  timeToMinutes,
} from '@/lib/timetableUtils';
import { CarryItemRow } from './CarryItemRow';
import { AddCustomItemModal } from './AddCustomItemModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Backpack, Plus, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.now() + 86400000));

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Tomorrow
            </h2>
            <span className="text-xs font-mono font-bold text-[#6366F1] bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
              {tomorrowDay}
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 font-medium">
            {tomorrowFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tomorrow's Classes */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Classes
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {tomorrowClasses.length} scheduled
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {tomorrowClasses.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400 font-medium">
                No classes scheduled for tomorrow.
              </div>
            ) : (
              tomorrowClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                return (
                  <div
                    key={sess.id}
                    className="bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between text-left hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-[#6366F1] dark:text-[#818CF8] w-12 shrink-0">
                        {sess.startTime}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                          {sub?.name || 'Class'}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {sess.room}
                          {sess.isLab && <span className="text-[#6366F1] font-bold">· Lab</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Things to Carry Card */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#6366F1] flex items-center justify-center">
                  <Backpack className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                    Things to Carry
                  </h3>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
                    {packedCount} of {totalCount} packed ({progressPercent}%)
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full ${
                  progressPercent === 100
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-indigo-50 text-[#6366F1] dark:bg-indigo-950/60 dark:text-indigo-300'
                }`}
              >
                {progressPercent === 100 ? 'All Packed 🎉' : `${progressPercent}% Ready`}
              </span>
            </div>

            {/* Checklist Items */}
            {carryItems.length === 0 ? (
              <EmptyState
                icon={<Backpack className="w-5 h-5 text-slate-400" />}
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

            {/* Add Custom Item Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 text-xs font-bold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] py-2 px-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors w-fit"
            >
              <Plus className="w-4 h-4" />
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
