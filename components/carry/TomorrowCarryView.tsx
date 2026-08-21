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
    <div className="flex flex-col gap-6 text-left max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
              Tomorrow&apos;s Bag 🎒
            </h2>
            <Badge variant="blue" size="sm">
              {tomorrowDay}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
            {tomorrowFormatted} · Auto-calculated from tomorrow&apos;s lectures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      {/* Progress & Packing Status Banner */}
      <div className="glass-card p-5 rounded-2xl flex flex-col gap-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Backpack className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
                Packing Checklist
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                {packedCount} of {totalCount} items packed ({progressPercent}%)
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border shadow-sm ${
              progressPercent === 100
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
            }`}
          >
            {progressPercent === 100 ? 'Ready for Campus 🎉' : `${progressPercent}% Ready`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              progressPercent === 100
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tomorrow's Schedule */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              Tomorrow&apos;s Lectures
            </h3>
            <Badge variant="neutral" size="sm">
              {tomorrowClasses.length} sessions
            </Badge>
          </div>

          <div className="flex flex-col gap-2.5">
            {tomorrowClasses.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 font-medium">
                No classes scheduled for tomorrow.
              </div>
            ) : (
              tomorrowClasses.map((sess) => {
                const sub = subjectMap.get(sess.subjectId);
                return (
                  <div
                    key={sess.id}
                    className="glass-card p-3.5 rounded-2xl flex flex-col gap-1 text-left"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-zinc-100">
                        {sub?.name || 'Class'}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        {sess.startTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        {sess.room}
                      </span>
                      {sess.isLab && (
                        <Badge variant="amber" size="sm">
                          Lab
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Carry List Items */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
              <Backpack className="w-4 h-4 text-emerald-500" />
              Items to Carry
            </h3>
            <span className="text-xs text-slate-400 font-mono font-medium">
              {carryItems.length} items required
            </span>
          </div>

          {carryItems.length === 0 ? (
            <EmptyState
              icon={<Backpack className="w-5 h-5 text-slate-400" />}
              title="Nothing special to carry tomorrow"
              description="Either tomorrow is a free day or no carry requirements are configured for tomorrow's classes."
              actionLabel="Add Custom Item"
              onAction={() => setShowAddModal(true)}
            />
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
