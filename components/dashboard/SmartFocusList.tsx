'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const SmartFocusList: React.FC = () => {
  const { homework, timetable, subjects, toggleHomeworkStatus, setActiveView, settings } = useApp();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const focusItems = calculateTodayFocus(homework, timetable, subjects, settings.homeworkWarningDays);

  // handleCheck is no longer used for immediate clicks since we removed the checkbox,
  // but kept for structure. Active view takes them to homework module.
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
      <div className="flex flex-col text-left">
        <div className="flex items-center justify-between px-1 mb-6">
          <h3 className="text-[12px] sm:text-[13px] font-bold text-[#101828] dark:text-[#FFFFFF] tracking-[1.5px] uppercase truncate">
            TODAY'S FOCUS
          </h3>
        </div>
        <div className="flex flex-col items-start justify-center p-5 text-left border border-[#E6E8EC] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#121317] rounded-none relative overflow-hidden group">
          <div className="mb-3 text-emerald-500">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-[22px] font-semibold text-[#101828] dark:text-[#F4F4F6] tracking-tight leading-[26px] uppercase">
            YOU'RE ALL CAUGHT UP!
          </h3>
          <p className="text-[15px] text-[#667085] dark:text-[#94A3B8] mt-1 max-w-sm leading-relaxed">
            No pending homework or urgent submissions due today.
          </p>
          <div className="mt-4">
            <button 
              onClick={() => setActiveView('homework')}
              className="w-[190px] py-2.5 px-4 bg-[#101828] text-white dark:bg-white dark:text-[#101828] hover:opacity-90 transition-opacity uppercase font-bold tracking-wider text-[11px] text-center rounded-none flex items-center justify-center cursor-pointer"
            >
              VIEW ALL TASKS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-6">
        <h3 className="text-[12px] sm:text-[13px] font-bold text-[#101828] dark:text-[#FFFFFF] tracking-[1.5px] uppercase truncate">
          TODAY'S FOCUS
        </h3>
        <span className="text-[10px] sm:text-[11px] font-mono font-medium text-[#667085] uppercase tracking-wider">
          {focusItems.length} {focusItems.length === 1 ? 'PRIORITY' : 'PRIORITIES'}
        </span>
      </div>

      {/* Task Items */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {focusItems.map((item, idx) => {
            const isCompleted = completingId === item.id;
            
            // Background hierarchy
            let surfaceClass = '';
            if (isCompleted) {
              surfaceClass = 'bg-[#FAFAFA] dark:bg-[#1A1A1A] border-[#E0E0E0] dark:border-[#333333] opacity-60';
            } else {
              surfaceClass = 'bg-[#FFFFFF] dark:bg-[#111111] border-[#E0E0E0] dark:border-[#333333]'; // white
            }

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
                  'relative flex flex-col p-[16px] bg-[#FFFFFF] dark:bg-[#121317] border border-[#D9D9D6] dark:border-white/[0.08] dark:hover:border-white/20 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-full overflow-hidden transition-all cursor-pointer group hover:bg-[#FDFDFD] dark:hover:bg-[#16171D] rounded-none',
                  isCompleted ? 'opacity-60' : 'opacity-100'
                )}
              >
                <div className="relative z-10 flex flex-col h-full">
                  {/* Number Row */}
                  <div className="flex items-start justify-between">
                    <div className="text-[44px] font-bold text-black/10 dark:text-white/[0.07] select-none pointer-events-none leading-[40px] tracking-tighter">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    {item.type === 'homework' && item.originalPriority && item.originalPriority !== 'Low' && !isCompleted && (
                      <span className={clsx(
                        "text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5",
                        item.originalPriority === 'High' ? "text-amber-600 dark:text-amber-400 border-amber-600/30 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/30" : "text-amber-600/70 dark:text-amber-400/70 border-amber-600/20 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20"
                      )}>
                        {item.originalPriority}
                      </span>
                    )}
                  </div>

                  {/* Course Name */}
                  <span className="text-[10px] font-semibold uppercase tracking-[1.3px] text-[#817B75] dark:text-[#94A3B8] break-words pr-2 mt-4">
                    {item.tag}
                  </span>

                  {/* Title Row Without Checkbox */}
                  <div className="flex items-start mt-[12px]">
                    <div className="flex flex-col">
                      <h4 className={clsx(
                        "text-[17px] font-semibold leading-[21px]",
                        isCompleted ? "text-[#6F6F6F] dark:text-[#71717A] line-through" : "text-[#111111] dark:text-[#F4F4F6]"
                      )}>
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bottom row metadata */}
                  <div className="flex items-center justify-between mt-[20px] text-[11px] font-semibold uppercase tracking-[1px] leading-none">
                    {/* Date */}
                    {item.deadlineText ? (
                      <span className={clsx(item.urgency === 'high' ? "text-red-600 dark:text-rose-400" : "text-[#6F6F6F] dark:text-[#A1A1AA]")}>
                        {item.deadlineText.toUpperCase()}
                      </span>
                    ) : (
                      <span />
                    )}
                    
                    {/* Status indicators */}
                    <div className="flex items-center gap-3">
                      {item.type === 'homework' && item.status === 'In Progress' && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-sky-400">
                          ● IN PROGRESS
                        </span>
                      )}
                      {item.type === 'homework' && item.status === 'Completed' && (
                        <span className="flex items-center gap-1 text-[#6F6F6F]">
                          ● COMPLETED
                        </span>
                      )}
                    </div>
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
