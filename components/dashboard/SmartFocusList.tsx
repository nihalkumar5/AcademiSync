'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const SmartFocusList: React.FC = () => {
  const { homework, timetable, subjects, toggleHomeworkStatus, setActiveView } = useApp();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const focusItems = calculateTodayFocus(homework, timetable, subjects);

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
                  'flex flex-col p-5 sm:p-6 rounded-none border transition-all group cursor-pointer relative overflow-hidden',
                  surfaceClass
                )}
              >
                <div className="relative z-10 flex flex-col h-full">
                  {/* Large Subtle Top Number */}
                  <span className="text-[48px] leading-none font-bold text-[#E2E2E2] dark:text-[#2A2A2A] mb-6 font-mono tracking-tighter">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* Title and Subject */}
                  <div className="flex flex-col gap-1 mb-8">
                    <span
                      className={clsx(
                        'text-[18px] sm:text-[20px] font-bold leading-tight tracking-tight text-[#111111] dark:text-[#FFFFFF]',
                        isCompleted ? 'line-through opacity-70' : ''
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999] font-normal truncate">
                      {item.tag}
                    </span>
                  </div>

                  {/* Semantic Status */}
                  <div className="flex flex-col gap-4 mt-auto">
                    {item.type === 'homework' && item.status && (
                      <div className="flex items-center gap-2">
                        {item.status === 'In Progress' ? (
                          <span className="text-[12px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2">
                            <span className="text-[10px]">●</span>
                            IN PROGRESS
                          </span>
                        ) : item.status === 'Completed' ? (
                          <span className="text-[12px] font-bold uppercase tracking-widest text-[#111111] dark:text-[#FFFFFF] flex items-center gap-2">
                            <Check className="w-3.5 h-3.5" />
                            COMPLETED
                          </span>
                        ) : (
                          <span className="text-[12px] font-bold uppercase tracking-widest text-[#808080] dark:text-[#888888] flex items-center gap-2">
                            <span className="text-[10px]">○</span>
                            NOT STARTED
                          </span>
                        )}
                      </div>
                    )}

                    {/* Urgency and Arrow Row */}
                    <div className="flex items-center justify-between mt-1">
                      {item.deadlineText ? (
                        <span
                          className={clsx(
                            'text-[12px] font-bold uppercase tracking-widest flex items-center gap-2',
                            item.urgency === 'high'
                              ? 'text-[#DC2626] dark:text-[#F87171]'
                              : 'text-[#808080] dark:text-[#888888]'
                          )}
                        >
                          {item.urgency === 'high' ? (
                            <span className="text-[10px]">●</span>
                          ) : (
                            <span className="text-[10px]">○</span>
                          )}
                          <span className="truncate">{item.deadlineText}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      <ArrowRight className="w-5 h-5 text-[#BDBDBD] dark:text-[#666666] transition-transform group-hover:translate-x-1" />
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
