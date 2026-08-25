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
    High: 'bg-transparent text-rose-600 dark:text-rose-400 border border-rose-500 rounded-none',
    Medium: 'bg-transparent text-amber-600 dark:text-amber-400 border border-amber-500 rounded-none',
    Low: 'bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-500 dark:border-zinc-700 rounded-none',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'glass-card group flex flex-col p-4 transition-all text-left relative',
        isDone ? 'opacity-55' : 'opacity-100'
      )}
    >
      {/* Top Header: Subject Badge, Priority & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {subject && (
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-none border"
              style={{
                backgroundColor: `${subject.color}15`,
                color: subject.color,
                borderColor: `${subject.color}35`,
              }}
            >
              {subject.name || subject.code}
            </span>
          )}

          <span
            className={clsx(
              'text-[10px] font-semibold font-mono px-2 py-0.5',
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggleStatus(homework.id)}
          className={clsx(
            'w-5 h-5 rounded-none flex items-center justify-center border transition-all mt-0.5 shrink-0 cursor-pointer shadow-none',
            isDone
              ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
              : 'border-black dark:border-white bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
          )}
          aria-label={isDone ? 'Mark task as incomplete' : 'Mark task as completed'}
        >
          {isDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
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
            'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-none border',
            isDone
              ? 'bg-[#7C897A]/10 dark:bg-[#7C897A]/20 text-[#7C897A] dark:text-[#A9B5A7] border-[#7C897A]/30 dark:border-[#7C897A]/40'
              : homework.status === 'In Progress'
              ? 'bg-[#C79F6F]/10 dark:bg-[#C79F6F]/20 text-[#C79F6F] dark:text-[#E8C59A] border-[#C79F6F]/30 dark:border-[#C79F6F]/40'
              : 'bg-transparent border-black/30 dark:border-white/30 text-black/70 dark:text-white/70'
          )}
        >
          {homework.status}
        </span>
      </div>
    </motion.div>
  );
};
