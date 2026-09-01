'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface HomeworkCardProps {
  homework: Homework;
  subject?: Subject;
  index: number;
  onToggleStatus: (id: string) => void;
  onEdit: (homework: Homework) => void;
  onDelete: (id: string) => void;
  onShare?: (homework: Homework) => void;
}

export const HomeworkCard: React.FC<HomeworkCardProps> = ({
  homework,
  subject,
  index,
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
  
  // Set times to midnight to calculate pure day differences
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadline = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  
  const diffTime = startOfDeadline.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let deadlineLabel = '';
  if (diffDays === 0) {
    deadlineLabel = 'today';
  } else if (diffDays === 1) {
    deadlineLabel = 'tomorrow';
  } else {
    deadlineLabel = `${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  const isUrgent = diffDays <= 1 && !isDone;
  
  const formattedIndex = String(index + 1).padStart(2, '0');

  return (
    <div className={clsx(
      "relative flex flex-col p-[16px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] w-full overflow-hidden transition-opacity",
      isDone ? 'opacity-60' : 'opacity-100'
    )}>
      <div className="relative z-10 flex flex-col">
        {/* Number and Menu Row */}
        <div className="flex items-start justify-between">
          <div className="text-[44px] font-bold text-black/10 dark:text-white/10 select-none pointer-events-none leading-[40px] tracking-tighter">
            {formattedIndex}
          </div>
          <div className="flex items-center gap-2">
            {!isDone && homework.priority !== 'Low' && (
              <span className={clsx(
                "text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5",
                homework.priority === 'High' ? "text-amber-600 border-amber-600/30 bg-amber-500/5" : "text-amber-600/70 border-amber-600/20 bg-amber-500/5"
              )}>
                {homework.priority}
              </span>
            )}
            <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-8 h-8 flex items-center justify-center -mr-1.5 -mt-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[#6F6F6F]"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] shadow-xl z-50 py-1"
                >
                  {homework.attachmentName && (
                    <a
                      href={homework.attachmentName.startsWith('http') ? homework.attachmentName : `https://${homework.attachmentName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold text-left text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full cursor-pointer"
                    >
                      <Link className="w-3.5 h-3.5" />
                      Open Attachment
                    </a>
                  )}

                  {onShare && (
                    <button
                      onClick={() => {
                        onShare(homework);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold text-left text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Task
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (profile?.role !== 'cr') {
                        showToast("Not Allowed", "Only Class Representatives can propose tasks to the batch.", "error");
                        return;
                      }
                      if (homework.isBatchShared) {
                        showToast("Already Shared", "This task has already been shared with your batch.", "info");
                        return;
                      }
                      setShowConfirmModal(true);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors w-full cursor-pointer"
                  >
                    {isBatchCR ? (
                      <Users className="w-3.5 h-3.5" />
                    ) : (
                      <Vote className="w-3.5 h-3.5" />
                    )}
                    {isBatchCR ? 'Post to Entire Batch' : 'Propose to Batch'}
                  </button>

                  <button
                    onClick={() => {
                      onEdit(homework);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold text-left text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full cursor-pointer border-t border-[#D9D9D6] dark:border-[#333333]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Task
                  </button>
                  
                  <button
                    onClick={() => {
                      onDelete(homework.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full cursor-pointer border-t border-[#D9D9D6] dark:border-[#333333]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Task
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </div>

        {/* Course Name */}
        <span className="text-[10px] font-semibold uppercase tracking-[1.3px] text-[#817B75] break-words pr-2 mt-4">
          {subject?.name || homework.subjectName || 'GENERAL'}
        </span>

        {/* Title Row with Checkbox */}
        <div className="flex items-start gap-3 mt-[12px]">
          <button 
            type="button"
            onClick={() => onToggleStatus(homework.id)}
            className={clsx(
              "mt-[3px] shrink-0 w-[20px] h-[20px] rounded-full border-[1.5px] flex items-center justify-center transition-colors cursor-pointer",
              isDone 
                ? "bg-[#111111] border-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:border-[#FFFFFF] dark:text-[#111111]" 
                : "border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-transparent"
            )}
          >
            {isDone ? (
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            ) : null}
          </button>
          <div 
            onClick={() => onEdit(homework)}
            className="flex flex-col flex-1 cursor-pointer group"
          >
            <h4 className={clsx(
              "text-[17px] font-semibold leading-[21px] group-hover:opacity-80 transition-opacity",
              isDone ? "text-[#6F6F6F] line-through" : "text-[#111111] dark:text-[#FFFFFF]"
            )}>
              {homework.title}
            </h4>
            {homework.description && (
              <p className="text-[13px] text-[#6F6F6F] mt-1.5 line-clamp-2 leading-relaxed">
                {homework.description}
              </p>
            )}
          </div>
        </div>

        {/* Bottom row metadata */}
        <div className="flex items-center justify-between mt-[20px] text-[11px] font-semibold uppercase tracking-[1px] leading-none">
          {/* Date */}
          <span className={clsx(isUrgent ? "text-red-600" : "text-[#6F6F6F]")}>
            DUE {deadlineLabel.toUpperCase()}
          </span>
          
          {/* Status indicators */}
          <div className="flex items-center gap-3">
            {homework.status === 'In Progress' && (
              <span className="flex items-center gap-1 text-blue-600">
                ● IN PROGRESS
              </span>
            )}
            {isDone && (
              <span className="flex items-center gap-1 text-[#6F6F6F]">
                ● COMPLETED
              </span>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={isBatchCR ? "Post to Entire Batch" : "Propose to Batch"}
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[#111111] dark:text-[#FFFFFF]">
            {isBatchCR 
              ? "Are you sure you want to post this task to the entire batch? As a CR, it will be automatically approved."
              : "Are you sure you want to propose this task to the entire batch? It will require a 30% consensus to be approved."}
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D9D9D6] dark:border-[#333333] mt-2">
            <button 
              type="button"
              className="text-[13px] font-bold uppercase text-[#111111] dark:text-[#FFFFFF] px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
            <button 
              type="button"
              className="text-[13px] font-bold uppercase bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] px-6 py-2.5 hover:opacity-90 transition-opacity"
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
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};