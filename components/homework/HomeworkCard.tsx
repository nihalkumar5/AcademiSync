'use client';

import React from 'react';
import { Homework, Subject } from '@/lib/types';
import {
  Calendar,
  Check,
  Paperclip,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface HomeworkCardProps {
  homework: Homework;
  subject?: Subject;
  onToggleStatus: (id: string) => void;
  onEdit: (homework: Homework) => void;
  onDelete: (id: string) => void;
}

export const HomeworkCard: React.FC<HomeworkCardProps> = ({
  homework,
  subject,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const isDone = homework.status === 'Completed';

  // Deadline calculation
  const deadlineDate = new Date(homework.deadline);
  const now = new Date();
  const diffHours = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffHours / 24);

  let deadlineLabel = `${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  let isUrgent = diffDays <= 1 && !isDone;

  const priorityStyles: Record<string, string> = {
    High: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50',
    Medium: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50',
    Low: 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'group flex flex-col p-4 rounded-2xl border transition-all text-left relative',
        isDone
          ? 'bg-[#F2ECE3]/40 dark:bg-[#1A1918]/40 border-[#E5DDD2]/50 dark:border-[#282624]/50 opacity-70'
          : 'bg-white/95 dark:bg-[#1C1B19]/95 border-[#E6DDD2] dark:border-[#2C2926] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md'
      )}
    >
      {/* Top Header: Subject Badge, Priority & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {subject && (
            <span
              className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg shadow-2xs"
              style={{
                backgroundColor: `${subject.color}15`,
                color: subject.color,
                border: `1px solid ${subject.color}35`,
              }}
            >
              {subject.shortName || subject.code}
            </span>
          )}

          <span
            className={clsx(
              'text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md',
              priorityStyles[homework.priority] || priorityStyles.Low
            )}
          >
            {homework.priority}
          </span>
        </div>

        {/* Edit & Delete Action Buttons */}
        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(homework)}
            className="p-1.5 rounded-lg text-[#8C7D70] hover:text-[#1A1918] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(homework.id)}
            className="p-1.5 rounded-lg text-[#8C7D70] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Task Content: Interactive Checkbox & Title */}
      <div className="flex items-start gap-3 mt-3">
        {/* Tactile Circular Checkbox */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onToggleStatus(homework.id)}
          className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all mt-0.5 shrink-0 cursor-pointer shadow-2xs',
            isDone
              ? 'bg-[#8C6B5D] border-[#8C6B5D] text-white shadow-xs'
              : 'border-[#CBBDB0] dark:border-[#524B44] hover:border-[#8C6B5D] bg-transparent'
          )}
          aria-label={isDone ? 'Mark task as incomplete' : 'Mark task as completed'}
        >
          {isDone && (
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </motion.button>

        <div className="flex flex-col min-w-0 flex-1">
          <h4
            className={clsx(
              'text-[15px] font-semibold tracking-tight leading-snug transition-colors',
              isDone
                ? 'line-through text-[#9E9084] dark:text-[#7A736C]'
                : 'text-[#1A1918] dark:text-[#F4F1EA]'
            )}
          >
            {homework.title}
          </h4>

          {homework.description && (
            <p className="text-xs text-[#7A6D61] dark:text-[#9A9188] mt-1 line-clamp-2 leading-relaxed font-normal">
              {homework.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info: Deadline, Status, Attachment */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5 pt-2.5 border-t border-[#EFEAE2] dark:border-[#282624] text-[11px]">
        <div className="flex items-center gap-3 text-[#7A6D61] dark:text-[#9A9188]">
          <span
            className={clsx(
              'flex items-center gap-1.5 font-mono font-medium',
              isUrgent ? 'text-rose-600 dark:text-rose-400 font-bold' : ''
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            {deadlineLabel}
          </span>

          {homework.attachmentName && (
            <span className="flex items-center gap-1 text-[#8C7D70] truncate max-w-[120px]">
              <Paperclip className="w-3 h-3" />
              <span className="truncate">{homework.attachmentName}</span>
            </span>
          )}
        </div>

        {/* Status Indicator */}
        <span
          className={clsx(
            'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full',
            isDone
              ? 'bg-[#7C897A]/10 dark:bg-[#7C897A]/20 text-[#7C897A] dark:text-[#A9B5A7] border border-[#7C897A]/30 dark:border-[#7C897A]/40'
              : homework.status === 'In Progress'
              ? 'bg-[#C79F6F]/10 dark:bg-[#C79F6F]/20 text-[#C79F6F] dark:text-[#E8C59A] border border-[#C79F6F]/30 dark:border-[#C79F6F]/40'
              : 'bg-[#EFEAE2] dark:bg-[#252321] text-[#7A6D61] dark:text-[#A89E94] border border-[#E0D7CB] dark:border-[#322F2C]'
          )}
        >
          {homework.status}
        </span>
      </div>
    </motion.div>
  );
};
