'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
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
          <h3 className="text-xs font-bold tracking-widest uppercase text-black dark:text-white">
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
    <div className="glass-card p-5 sm:p-6 flex flex-col gap-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold tracking-widest uppercase text-black dark:text-white">
            Today&apos;s Focus
          </h3>
          <span className="text-[10px] font-mono font-bold border border-black dark:border-white text-black dark:text-white px-2 py-0.5">
            {focusItems.length} priority
          </span>
        </div>

        <button
          onClick={() => setActiveView('homework')}
          className="text-xs font-semibold text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          <span>All Tasks</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task Items */}
      <div className="flex flex-col gap-2">
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
                  'flex items-center justify-between p-3.5 border transition-all group cursor-pointer',
                  isCompleted
                    ? 'border-emerald-500 opacity-60'
                    : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white bg-white dark:bg-zinc-950'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Square checkbox */}
                  {item.type === 'homework' ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleCheck(e, item.id, item.type)}
                      className={clsx(
                        'w-5 h-5 flex items-center justify-center border transition-all shrink-0 cursor-pointer',
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-black dark:border-white bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                      aria-label="Complete task"
                    >
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        </motion.div>
                      )}
                    </motion.button>
                  ) : (
                    <div className="w-5 h-5 border border-black/30 dark:border-white/30 flex items-center justify-center text-[10px] font-mono font-bold text-black/60 dark:text-white/60 shrink-0">
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
                          : 'text-black dark:text-white'
                      )}
                    >
                      {item.title}
                    </span>

                    <div className="flex flex-col gap-1.5 text-[11px] text-black/50 dark:text-white/50 font-medium mt-1.5">
                      <span className="font-mono px-1.5 py-0.5 border border-black/20 dark:border-white/20 text-[10px] w-fit break-words max-w-full leading-tight">
                        {item.tag}
                      </span>
                      {item.deadlineText && (
                        <span
                          className={clsx(
                            'font-mono flex items-center gap-1 w-fit',
                            item.urgency === 'high'
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : ''
                          )}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.deadlineText}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Arrow */}
                <div className="shrink-0 pl-2">
                  <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
