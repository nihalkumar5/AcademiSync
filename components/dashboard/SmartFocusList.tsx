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
                  'flex items-center justify-between p-4 sm:p-5 rounded-none border transition-all group cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5',
                  isCompleted
                    ? 'bg-[#FAFAFA] dark:bg-[#1a1a1a] border-[#E0E0E0] dark:border-[#333333] opacity-60'
                    : 'bg-[#FFFFFF] dark:bg-[#111111] border-[#E0E0E0] dark:border-[#333333]'
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
                        'w-6 h-6 flex items-center justify-center rounded-full border-[1.5px] transition-all shrink-0 cursor-pointer shadow-sm',
                        item.status === 'Completed'
                          ? 'bg-[#111111] dark:bg-[#FFFFFF] border-[#111111] dark:border-[#FFFFFF] text-white dark:text-black'
                          : item.status === 'In Progress'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                          : 'border-[#111111] dark:border-[#FFFFFF] bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
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
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
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

                    <div className="flex flex-col gap-1.5 mt-0.5">
                      <span className="text-[12px] text-[#6B6B6B] dark:text-[#999999] font-normal truncate">
                        {item.tag}
                      </span>
                      {item.type === 'homework' && item.status && (
                        <span
                          className={clsx(
                            'text-[10px] font-bold uppercase tracking-widest',
                            item.status === 'In Progress'
                              ? 'text-blue-500'
                              : item.status === 'Completed'
                              ? 'text-[#111111] dark:text-[#FFFFFF]'
                              : 'text-[#808080] dark:text-[#888888]'
                          )}
                        >
                          {item.status === 'In Progress' ? 'IN PROGRESS' : item.status === 'Completed' ? 'COMPLETED' : 'NOT STARTED'}
                        </span>
                      )}
                      
                      {item.deadlineText && (
                        <span
                          className={clsx(
                            'text-[12px] flex items-center gap-1.5 w-fit mt-0.5',
                            item.urgency === 'high'
                              ? 'text-[#DC2626] dark:text-[#F87171] font-medium'
                              : 'text-[#808080] dark:text-[#888888] font-normal'
                          )}
                        >
                          {item.urgency === 'high' ? (
                            <span className="text-[10px]">🔴</span>
                          ) : (
                            <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          )}
                          <span className="truncate">{item.deadlineText}</span>
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
