import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, CheckCircle2, Calendar } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { getTaskCardTheme } from '@/lib/cardColors';

export const SmartFocusList: React.FC = () => {
  const { homework, timetable, subjects, toggleHomeworkStatus, setActiveView, settings } = useApp();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const focusItems = calculateTodayFocus(homework, timetable, subjects, settings.homeworkWarningDays);

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
            const isCompleted = completingId === item.id || item.status === 'Completed';
            const isOverdue = item.urgency === 'high' && item.deadlineText?.toLowerCase().includes('overdue');
            const isUrgent = item.urgency === 'high';
            const isInProgress = item.type === 'homework' && item.status === 'In Progress';

            const theme = getTaskCardTheme({
              isDone: isCompleted,
              isOverdue,
              isInProgress,
              priority: item.originalPriority,
            });

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
                  'relative flex flex-col p-4 sm:p-[18px] rounded-[5px] border w-full overflow-hidden transition-all cursor-pointer group',
                  isCompleted ? 'opacity-65' : 'opacity-100'
                )}
                style={{
                  borderLeft: `4px solid ${theme.accent}`,
                  borderColor: theme.border,
                }}
              >
                {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                <div 
                  className="dark:hidden absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundColor: theme.bg }}
                />
                <div 
                  className="hidden dark:block absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundColor: theme.darkBg }}
                />

                <div className="relative z-10 flex flex-col h-full">
                  {/* Number and Top Right Toolbar */}
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="text-[44px] font-bold leading-[40px] tracking-tighter font-mono select-none pointer-events-none"
                      style={{ color: theme.numberColor }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-center gap-1.5 self-start">
                      {item.type === 'homework' && item.originalPriority === 'High' && !isCompleted && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#FFF0E8] text-[#C96B45] text-[9.5px] font-bold uppercase tracking-wider">
                          HIGH
                        </span>
                      )}
                      {item.type === 'homework' && item.originalPriority === 'Medium' && !isCompleted && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#FFF0E8]/70 text-[#C96B45]/90 text-[9.5px] font-bold uppercase tracking-wider">
                          MED
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#DCE4FF] text-[#334CC4] text-[9.5px] font-bold uppercase tracking-wider">
                          DOING
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#D2F1E8] text-[#18A889] text-[9.5px] font-bold uppercase tracking-wider">
                          DONE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course Name */}
                  <span className="text-[10.5px] font-bold uppercase tracking-[1.3px] text-[#737373] dark:text-[#94A3B8] break-words pr-2 mt-3.5">
                    {item.tag}
                  </span>

                  {/* Title Row */}
                  <div className="flex items-start mt-2.5">
                    <div className="flex flex-col">
                      <h4 className={clsx(
                        "text-[16px] sm:text-[17px] font-bold leading-[22px] tracking-tight group-hover:opacity-80 transition-opacity",
                        isCompleted ? "text-[#737373] dark:text-[#64748B] line-through" : "text-[#151515] dark:text-[#F4F4F6]"
                      )}>
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bottom row metadata pill */}
                  <div className="flex items-center justify-between mt-[16px]">
                    {item.deadlineText ? (
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[10.5px] font-bold font-mono uppercase tracking-wider",
                        isUrgent
                          ? "bg-[#FFF0E8] text-[#C96B45] border border-[#F5D8CC]"
                          : isOverdue
                          ? "bg-[#FCEBED] text-[#C94B5C] border border-[#F5CBD1]"
                          : "bg-black/[0.04] dark:bg-white/[0.05] text-[#737373] dark:text-[#94A3B8] border border-black/[0.04] dark:border-white/[0.06]"
                      )}>
                        <Calendar className="w-3 h-3 shrink-0" />
                        {item.deadlineText.toUpperCase()}
                      </span>
                    ) : (
                      <span />
                    )}
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
