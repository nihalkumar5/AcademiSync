'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { CheckCircle2, Circle, Flame, ArrowUpRight } from 'lucide-react';
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
    <div className="flex flex-col gap-3.5 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            Today&apos;s Focus
          </h3>
          <Badge variant="amber" size="sm">
            {focusItems.length} priority items
          </Badge>
        </div>
        <button
          onClick={() => setActiveView('homework')}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          All Tasks
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {focusItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.type === 'homework') {
                toggleHomeworkStatus(item.id);
              }
            }}
            className="glass-card flex items-center justify-between p-3.5 rounded-2xl cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0"
              >
                {item.type === 'homework' ? (
                  <Circle className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-zinc-700 flex items-center justify-center text-[9px] font-mono font-bold text-slate-500">
                    {idx + 1}
                  </div>
                )}
              </button>

              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 font-medium">
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

            {item.urgency === 'high' && (
              <Badge variant="rose" size="sm">
                Urgent
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
