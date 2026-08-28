'use client';

import React from 'react';
import { Homework, Subject } from '@/lib/types';
import {
  Calendar,
  Check,
  Paperclip,
  Trash2,
  Edit2,
  Share2,
  MoreVertical,
  Link,
  Users,
  Vote,
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface HomeworkCardProps {
  homework: Homework;
  subject?: Subject;
  onToggleStatus: (id: string) => void;
  onEdit: (homework: Homework) => void;
  onDelete: (id: string) => void;
  onShare?: (homework: Homework) => void;
}

export const HomeworkCard: React.FC<HomeworkCardProps> = ({
  homework,
  subject,
  onToggleStatus,
  onEdit,
  onDelete,
  onShare,
}) => {
  const { profile, proposeBatchTask, updateHomework, isBatchCR, showToast } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

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

        {/* Action Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-none text-[#8C7D70] hover:text-[#1A1918] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ transformOrigin: 'top right' }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-900 border border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] z-50 flex flex-col py-1"
              >
                {onShare && (
                  <button
                    onClick={() => {
                      onShare(homework);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full cursor-pointer"
                  >
                    <Link className="w-4 h-4" />
                    Share via Link
                  </button>
                )}

                <button
                  onClick={async () => {
                    setShowMenu(false);
                    if (!profile.isBatchSynced || !profile.batchKey) {
                      showToast("Action Required", "You must join a batch to share tasks with batchmates.", "warning");
                      return;
                    }
                    if (homework.isBatchShared) {
                      showToast("Already Shared", "This task has already been shared with your batch.", "info");
                      return;
                    }

                    setShowConfirmModal(true);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors w-full cursor-pointer"
                >
                  {isBatchCR ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Vote className="w-4 h-4" />
                  )}
                  {isBatchCR ? 'Post to Entire Batch' : 'Propose to Batch'}
                </button>

                <button
                  onClick={() => {
                    onEdit(homework);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full cursor-pointer border-t border-black/10 dark:border-white/10"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Task
                </button>
                
                <button
                  onClick={() => {
                    onDelete(homework.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors w-full cursor-pointer border-t border-black/10 dark:border-white/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Task Content: Interactive Checkbox & Title */}
      <div className="flex items-start gap-3 mt-3">
        {/* Tactile Square Checkbox */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onToggleStatus(homework.id)}
          className={clsx(
            'w-5 h-5 rounded-none flex items-center justify-center border transition-all mt-0.5 shrink-0 cursor-pointer shadow-none',
            homework.status === 'Completed'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : homework.status === 'In Progress'
              ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'border-black dark:border-white bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
          )}
          title={
            homework.status === 'Not Started'
              ? 'Click to mark In Progress'
              : homework.status === 'In Progress'
              ? 'Click to mark Completed'
              : 'Click to reset to Not Started'
          }
          aria-label="Toggle task status"
        >
          {homework.status === 'Completed' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </motion.div>
          )}
          {homework.status === 'In Progress' && (
            <div className="w-2 h-2 bg-amber-500 animate-pulse" />
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

        {/* Status Indicator Button */}
        <button
          type="button"
          onClick={() => onToggleStatus(homework.id)}
          className={clsx(
            'text-[10px] font-mono font-bold px-2 py-0.5 rounded-none border cursor-pointer hover:scale-105 active:scale-95 transition-all',
            isDone
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
              : homework.status === 'In Progress'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
              : 'bg-transparent border-black/30 dark:border-white/30 text-black/70 dark:text-white/70'
          )}
          title="Click to cycle status"
        >
          {homework.status === 'In Progress' ? 'In Progress ⏳' : homework.status === 'Completed' ? 'Completed 🎉' : 'Not Started'}
        </button>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={isBatchCR ? "Post to Entire Batch" : "Propose to Batch"}
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-black/70 dark:text-white/70">
            {isBatchCR 
              ? "Are you sure you want to post this task to the entire batch? As a CR, it will be automatically approved."
              : "Are you sure you want to propose this task to the entire batch? It will require a 30% consensus to be approved."}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={async () => {
                setShowConfirmModal(false);
                await proposeBatchTask({
                  subjectId: homework.subjectId,
                  subjectName: homework.subjectName,
                  title: homework.title,
                  description: homework.description || '',
                  deadline: homework.deadline,
                  priority: homework.priority,
                  attachmentName: homework.attachmentName,
                });
                updateHomework(homework.id, { isBatchShared: true });
              }}
            >
              {isBatchCR ? "Yes, Post Task" : "Yes, Propose Task"}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
