'use client';

import React from 'react';
import { Homework, Subject } from '@/lib/types';
import { Badge } from '../ui/Badge';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Paperclip,
  Trash2,
  Edit2,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';

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

  const priorityVariant: Record<string, 'rose' | 'amber' | 'neutral'> = {
    High: 'rose',
    Medium: 'amber',
    Low: 'neutral',
  };

  const statusColors = {
    'Not Started': 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    'In Progress': 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
    Completed: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
  };

  return (
    <div
      className={clsx(
        'group flex flex-col p-4 rounded-xl border transition-all text-left relative',
        isDone
          ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/40 opacity-75'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {subject && (
            <span
              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: `${subject.color}15`,
                color: subject.color,
                border: `1px solid ${subject.color}30`,
              }}
            >
              {subject.shortName || subject.code}
            </span>
          )}
          <Badge variant={priorityVariant[homework.priority] || 'neutral'} size="sm">
            {homework.priority} Priority
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(homework)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(homework.id)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Title & Checkbox */}
      <div className="flex items-start gap-3 mt-2.5">
        <button
          type="button"
          onClick={() => onToggleStatus(homework.id)}
          className="mt-0.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex flex-col min-w-0 flex-1">
          <h4
            className={clsx(
              'text-sm font-semibold tracking-tight leading-snug',
              isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
            )}
          >
            {homework.title}
          </h4>

          {homework.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {homework.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info: Deadline, Status, Attachment */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <span
            className={clsx(
              'flex items-center gap-1 font-mono font-medium',
              isUrgent ? 'text-rose-500 font-bold' : ''
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            {deadlineLabel}
          </span>

          {homework.attachmentName && (
            <span className="flex items-center gap-1 text-zinc-400 truncate max-w-[120px]">
              <Paperclip className="w-3 h-3" />
              <span className="truncate">{homework.attachmentName}</span>
            </span>
          )}
        </div>

        <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded-full font-medium', statusColors[homework.status])}>
          {homework.status}
        </span>
      </div>
    </div>
  );
};
