'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { CheckCircle2, Circle, Flame, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

export const SmartFocusList: React.FC = () => {
  const { homework, timetable, subjects, toggleHomeworkStatus, setActiveView } = useApp();

  const focusItems = calculateTodayFocus(homework, timetable, subjects);

  if (focusItems.length === 0) {
    return (
      <div className="flex flex-col gap-3 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            Today&apos;s Focus
          </h3>
        </div>
        <EmptyState
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          title="You're all caught up!"
          description="No pending homework or urgent submissions due today. Great work staying ahead."
          actionLabel="View All Tasks"
          onAction={() => setActiveView('homework')}
        />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-white tracking-tight font-sans">
            Today&apos;s Focus
          </h3>
          <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
            {focusItems.length} priority
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {focusItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.type === 'homework') {
                toggleHomeworkStatus(item.id);
              }
            }}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#1E293B]/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/40 cursor-pointer group transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-mono font-bold text-slate-500 shrink-0 group-hover:border-[#6366F1] group-hover:text-[#6366F1] transition-colors">
                {idx + 1}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-zinc-100 truncate group-hover:text-[#6366F1] transition-colors">
                  {item.title}
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="font-mono">{item.tag}</span>
                  {item.deadlineText && (
                    <>
                      <span>·</span>
                      <span className={item.urgency === 'high' ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                        {item.deadlineText}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        ))}
      </div>

      {/* View All Tasks Button */}
      <button
        onClick={() => setActiveView('homework')}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-[#6366F1] dark:text-[#818CF8] text-xs font-bold transition-colors text-center"
      >
        View all tasks
      </button>
    </div>
  );
};
