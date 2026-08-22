'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, Flame, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const SmartFocusList: React.FC = () => {
  const { homework, timetable, subjects, toggleHomeworkStatus, setActiveView } = useApp();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const focusItems = calculateTodayFocus(homework, timetable, subjects);

  const handleCheck = (e: React.MouseEvent, id: string, type: string) => {
    e.stopPropagation();
    if (type === 'homework') {
      setCompletingId(id);
      setTimeout(() => {
        toggleHomeworkStatus(id);
        setCompletingId(null);
      }, 350);
    }
  };

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
    <div className="rounded-3xl p-5 sm:p-6 bg-white/90 dark:bg-[#1C1B19]/90 border border-[#E6DDD2] dark:border-[#2C2926] shadow-sm flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-[#1A1918] dark:text-[#F4F1EA] tracking-tight flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            Today&apos;s Focus
          </h3>
          <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/60">
            {focusItems.length} priority
          </span>
        </div>

        <button
          onClick={() => setActiveView('homework')}
          className="text-xs font-semibold text-[#8C6B5D] hover:text-[#6E4F36] dark:text-[#CBB5A1] flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          <span>All Tasks</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <AnimatePresence>
          {focusItems.map((item, idx) => {
            const isCompleted = completingId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  if (item.type === 'homework') {
                    setActiveView('homework');
                  }
                }}
                className={clsx(
                  'flex items-center justify-between p-3.5 rounded-2xl border transition-all group cursor-pointer',
                  isCompleted
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 scale-[0.98]'
                    : 'bg-[#FAF8F5] dark:bg-[#22201E] border-[#E8E0D5] dark:border-[#2D2A27] hover:border-[#8C6B5D]/60 hover:shadow-2xs'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Tactile Circular Checkbox with Spring Feedback */}
                  {item.type === 'homework' ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.82 }}
                      onClick={(e) => handleCheck(e, item.id, item.type)}
                      className={clsx(
                        'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0 cursor-pointer shadow-2xs',
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-[#C5B7A8] dark:border-[#575048] hover:border-[#8C6B5D] hover:bg-[#8C6B5D]/10 bg-white dark:bg-[#181716]'
                      )}
                      aria-label="Complete task"
                    >
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.div>
                      )}
                    </motion.button>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#EFE8DE] dark:bg-[#2C2926] border border-[#DFD6CA] dark:border-[#383430] flex items-center justify-center text-[10px] font-mono font-bold text-[#7A6B5F] dark:text-[#A89E94] shrink-0">
                      {idx + 1}
                    </div>
                  )}

                  {/* Task Text & Metadata */}
                  <div className="flex flex-col min-w-0">
                    <span
                      className={clsx(
                        'text-[13.5px] font-semibold leading-snug tracking-tight truncate transition-all',
                        isCompleted
                          ? 'line-through text-emerald-600 dark:text-emerald-400'
                          : 'text-[#1A1918] dark:text-[#F4F1EA] group-hover:text-[#8C6B5D] dark:group-hover:text-[#CBB5A1]'
                      )}
                    >
                      {item.title}
                    </span>

                    <div className="flex items-center gap-2 text-[11px] text-[#7A6D61] dark:text-[#9A9188] font-medium mt-0.5">
                      <span className="font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-[10px]">
                        {item.tag}
                      </span>
                      {item.deadlineText && (
                        <span
                          className={clsx(
                            'font-mono flex items-center gap-1',
                            item.urgency === 'high'
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-[#7A6D61] dark:text-[#9A9188]'
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          {item.deadlineText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Arrow / Action Indicator */}
                <div className="shrink-0 pl-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[#9E9084] group-hover:text-[#8C6B5D] group-hover:bg-[#8C6B5D]/10 transition-all">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
