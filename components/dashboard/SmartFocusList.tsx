'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const ELEGANT_TASK_PALETTE = [
  'bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] border-black/5 dark:border-white/5', 
  'bg-[#E0F0FF] dark:bg-[#0A2440] text-[#004080] dark:text-[#99C2FF] border-black/5 dark:border-white/5', 
  'bg-[#E3F5E1] dark:bg-[#143311] text-[#1D4D1A] dark:text-[#99E693] border-black/5 dark:border-white/5', 
  'bg-[#FFE5EC] dark:bg-[#400015] text-[#660022] dark:text-[#FF99BC] border-black/5 dark:border-white/5', 
  'bg-[#FFF0E0] dark:bg-[#402000] text-[#663300] dark:text-[#FFC299] border-black/5 dark:border-white/5', 
  'bg-[#EBE0FF] dark:bg-[#200040] text-[#330066] dark:text-[#B399FF] border-black/5 dark:border-white/5', 
];

const getTaskStyle = (index: number) => {
  return ELEGANT_TASK_PALETTE[index % ELEGANT_TASK_PALETTE.length];
};

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
          <h3 className="text-xs font-black tracking-widest uppercase text-black dark:text-white opacity-80">
            Today&apos;s Focus
          </h3>
          <span className="text-[9px] font-black tracking-widest uppercase bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 px-2 py-0.5 rounded-full">
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
      {/* Task Items */}
      <div className="flex flex-col gap-3 mt-1">
        <AnimatePresence>
          {focusItems.map((item, idx) => {
            const isCompleted = completingId === item.id;
            const taskColorClass = getTaskStyle(idx);
            
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  if (item.type === 'homework') {
                    setActiveView('homework');
                  }
                }}
                className={clsx(
                  'flex items-center justify-between p-4 sm:p-5 rounded-3xl border transition-all group cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5',
                  isCompleted
                    ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 opacity-60'
                    : taskColorClass
                )}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Circular checkbox */}
                  {item.type === 'homework' ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleCheck(e, item.id, item.type)}
                      className={clsx(
                        'w-6 h-6 flex items-center justify-center rounded-full border-2 transition-all shrink-0 cursor-pointer shadow-sm',
                        item.status === 'Completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : item.status === 'In Progress'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'border-current bg-white/50 dark:bg-black/50 hover:bg-black/10 dark:hover:bg-white/10'
                      )}
                      title={
                        item.status === 'Not Started'
                          ? 'Click to mark In Progress'
                          : item.status === 'In Progress'
                          ? 'Click to mark Completed'
                          : 'Click to reset to Not Started'
                      }
                      aria-label="Toggle task status"
                    >
                      {item.status === 'Completed' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </motion.div>
                      )}
                      {item.status === 'In Progress' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </motion.button>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-black shrink-0 bg-white/50 dark:bg-black/50">
                      {idx + 1}
                    </div>
                  )}

                  {/* Task Text & Metadata */}
                  <div className="flex flex-col min-w-0 gap-1.5">
                    <span
                      className={clsx(
                        'text-[15px] sm:text-[16px] font-bold leading-tight tracking-tight truncate transition-all',
                        item.status === 'Completed'
                          ? 'line-through opacity-70'
                          : ''
                      )}
                    >
                      {item.title}
                    </span>

                    <div className="flex flex-col gap-2 text-xs font-semibold mt-0.5 opacity-80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono px-2 py-0.5 rounded-full border border-current text-[10px] w-fit break-words max-w-full leading-tight uppercase tracking-wider">
                          {item.tag}
                        </span>
                        {item.type === 'homework' && item.status && (
                          <span
                            className={clsx(
                              'font-mono text-[9px] font-black px-2 py-0.5 rounded-full border w-fit leading-tight uppercase tracking-widest',
                              item.status === 'In Progress'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-400'
                                : item.status === 'Completed'
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                : 'bg-black/5 dark:bg-white/5 border-current'
                            )}
                          >
                            {item.status === 'In Progress' ? 'IN PROGRESS ⏳' : item.status === 'Completed' ? 'COMPLETED 🎉' : 'NOT STARTED'}
                          </span>
                        )}
                      </div>
                      
                      {item.deadlineText && (
                        <span
                          className={clsx(
                            'font-mono flex items-center gap-1 w-fit mt-0.5',
                            item.urgency === 'high'
                              ? 'text-rose-600 dark:text-rose-400 font-black'
                              : ''
                          )}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate tracking-wide">{item.deadlineText}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Arrow */}
                <div className="shrink-0 pl-3">
                  <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
