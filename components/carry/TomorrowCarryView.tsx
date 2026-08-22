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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black dark:border-white pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-black dark:text-white tracking-tighter uppercase">
              Tomorrow
            </h2>
            <span className="text-xs font-mono font-bold text-black dark:text-white border-2 border-black dark:border-white px-2.5 py-1 uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] dark:shadow-[2px_2px_0_rgba(255,255,255,1)]">
              {tomorrowDay}
            </span>
          </div>
          <p className="text-xs text-black/70 dark:text-white/70 mt-2 font-bold uppercase tracking-widest">
            {tomorrowFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 rounded-none bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white hover:-translate-y-1 hover:translate-x-1 hover:shadow-[-4px_4px_0_rgba(0,0,0,1)] dark:hover:shadow-[-4px_4px_0_rgba(255,255,255,1)] font-bold uppercase transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tomorrow's Classes */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">
              Classes
            </h3>
            <span className="text-xs font-mono font-bold opacity-70">
              {tomorrowClasses.length} scheduled
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {tomorrowClasses.length === 0 ? (
              <div className="p-6 border-2 border-black dark:border-white text-center text-xs font-bold uppercase opacity-70 shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)]">
                No classes scheduled for tomorrow.
              </div>
            ) : (
              tomorrowClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                return (
                  <div
                    key={sess.id}
                    className="p-3.5 bg-white text-black dark:bg-black dark:text-white border-2 border-black dark:border-white shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)] flex items-center justify-between text-left hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold w-12 shrink-0">
                        {sess.startTime}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold uppercase">
                          {sub?.name || 'Class'}
                        </span>
                        <span className="text-[11px] opacity-70 flex items-center gap-1 font-bold">
                          <MapPin className="w-3 h-3" />
                          {sess.room}
                          {sess.isLab && <span className="font-extrabold uppercase border border-current px-1 rounded-sm ml-1">Lab</span>}
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
          <div className="bg-white text-black dark:bg-black dark:text-white border-2 border-black dark:border-white p-5 sm:p-6 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,1)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center border-2 border-black dark:border-white">
                  <Backpack className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Things to Carry
                  </h3>
                  <p className="text-[11px] font-bold opacity-70 mt-1">
                    {packedCount} of {totalCount} packed ({progressPercent}%)
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-1 border-2 border-black dark:border-white uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] dark:shadow-[2px_2px_0_rgba(255,255,255,1)] ${
                  progressPercent === 100
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-transparent'
                }`}
              >
                {progressPercent === 100 ? 'All Packed 🎉' : `${progressPercent}% Ready`}
              </span>
            </div>

            {/* Checklist Items */}
            {carryItems.length === 0 ? (
              <EmptyState
                icon={<Backpack className="w-6 h-6" />}
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
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-2 border-black dark:border-white py-2 px-3 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors w-fit shadow-[2px_2px_0_rgba(0,0,0,1)] dark:shadow-[2px_2px_0_rgba(255,255,255,1)]"
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
