import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateTodayFocus } from '@/lib/timetableUtils';
import { Check, CheckCircle2, Calendar } from '@/components/ui/icons';
import { EmptyState } from '../ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { getTaskCardTheme } from '@/lib/cardColors';

export const SmartFocusList: React.FC = () => {
  const { homework, myTimetable: timetable, subjects, toggleHomeworkStatus, setActiveView, settings } = useApp();
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Re-check every minute so time-bound items (like lab prep) drop off on their own
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const focusItems = calculateTodayFocus(homework, timetable, subjects, settings.homeworkWarningDays);

  if (focusItems.length === 0) {
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-baseline justify-between mb-f3">
          <h3 className="text-[17px] font-semibold text-fg tracking-tight">
            Today&apos;s focus
          </h3>
        </div>
        <EmptyState
          illustration="tasks-done"
          title="You're all caught up!"
          description="No pending homework or urgent submissions due today."
          actionLabel="View All Tasks"
          onAction={() => setActiveView('homework')}
        />
      </div>
    );
  }

  const typeLabel = (type: string) =>
    type === 'homework' ? 'Assignment' : type === 'lab' ? 'Lab prep' : type === 'exam' ? 'Exam prep' : 'Prep';

  return (
    <section aria-label="Today's focus" className="flex flex-col text-left">
      <div className="flex items-baseline justify-between mb-f3">
        <h3 className="text-[17px] font-semibold text-fg tracking-tight">
          Today&apos;s focus
        </h3>
        <span className="text-[13px] text-muted">
          {focusItems.length} {focusItems.length === 1 ? 'priority' : 'priorities'}
        </span>
      </div>

      <ol className="border border-line bg-surface divide-y divide-line-soft">
        <AnimatePresence initial={false}>
          {focusItems.map((item) => {
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
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={clsx('relative', isCompleted && 'opacity-60')}
              >
                <button
                  type="button"
                  onClick={() => setActiveView('homework')}
                  className="w-full text-left flex items-start gap-3 p-4 cursor-pointer hover:bg-surface-2 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-muted truncate">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-[1px]" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
                      {typeLabel(item.type)}{item.tag ? ` · ${item.tag}` : ''}
                    </p>
                    <h4 className={clsx(
                      'mt-1 text-[16px] font-semibold leading-snug',
                      isCompleted ? 'line-through text-muted' : 'text-fg'
                    )}>
                      {item.title}
                    </h4>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {item.deadlineText && (
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-medium',
                          isOverdue
                            ? 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                            : isUrgent
                            ? 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                            : 'bg-surface-2 text-muted'
                        )}>
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {item.deadlineText}
                        </span>
                      )}
                      {item.type === 'homework' && item.originalPriority === 'High' && !isCompleted && (
                        <span className="px-2 py-0.5 text-[12px] font-medium bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">High priority</span>
                      )}
                      {isInProgress && !isCompleted && (
                        <span className="px-2 py-0.5 text-[12px] font-medium bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">In progress</span>
                      )}
                    </div>
                  </div>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </section>
  );
};
