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
          <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
            TODAY'S FOCUS
          </h3>
        </div>
        <EmptyState
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          title="You're all caught up!"
          description="No pending homework or urgent submissions due today."
          actionLabel="View All Tasks"
          onAction={() => setActiveView('homework')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-6">
        <h3 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-widest uppercase">
          TODAY'S FOCUS
        </h3>
        <span className="text-[11px] font-bold text-[#808080] uppercase tracking-wider">
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
                  'relative flex flex-col p-[16px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] w-full overflow-hidden transition-opacity cursor-pointer group hover:bg-[#FDFDFD] dark:hover:bg-[#151515]',
                  isCompleted ? 'opacity-60' : 'opacity-100'
                )}
              >
                <div className="relative z-10 flex flex-col h-full">
                  {/* Number Row */}
                  <div className="flex items-start justify-between">
                    <div className="text-[44px] font-bold text-black/10 dark:text-white/10 select-none pointer-events-none leading-[40px] tracking-tighter">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    {item.type === 'homework' && item.originalPriority && item.originalPriority !== 'Low' && !isCompleted && (
                      <span className={clsx(
                        "text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5",
                        item.originalPriority === 'High' ? "text-amber-600 border-amber-600/30 bg-amber-500/5" : "text-amber-600/70 border-amber-600/20 bg-amber-500/5"
                      )}>
                        {item.originalPriority}
                      </span>
                    )}
                  </div>

                  {/* Course Name */}
                  <span className="text-[10px] font-semibold uppercase tracking-[1.3px] text-[#817B75] break-words pr-2 mt-4">
                    {item.tag}
                  </span>

                  {/* Title Row Without Checkbox */}
                  <div className="flex items-start mt-[12px]">
                    <div className="flex flex-col">
                      <h4 className={clsx(
                        "text-[17px] font-semibold leading-[21px]",
                        isCompleted ? "text-[#6F6F6F] line-through" : "text-[#111111] dark:text-[#FFFFFF]"
                      )}>
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bottom row metadata */}
                  <div className="flex items-center justify-between mt-[20px] text-[11px] font-semibold uppercase tracking-[1px] leading-none">
                    {/* Date */}
                    {item.deadlineText ? (
                      <span className={clsx(item.urgency === 'high' ? "text-red-600" : "text-[#6F6F6F]")}>
                        {item.deadlineText.toUpperCase()}
                      </span>
                    ) : (
                      <span />
                    )}
                    
                    {/* Status indicators */}
                    <div className="flex items-center gap-3">
                      {item.type === 'homework' && item.status === 'In Progress' && (
                        <span className="flex items-center gap-1 text-blue-600">
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
