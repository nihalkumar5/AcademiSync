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
  Clock,
  RotateCcw,
  GraduationCap,
  ExternalLink,
  AlertTriangle,
} from '@/components/ui/icons';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { DUE_TONE, dueInfo, subjectLabel, subjectTone } from '@/lib/assignmentDisplay';

export interface HomeworkCardProps {
  homework: Homework;
  subject?: Subject;
  index: number;
  onToggleStatus: (id: string) => void;
  onEdit: (homework: Homework) => void;
  onViewDetail?: (homework: Homework) => void;
  onDelete: (id: string) => void;
  onShare?: (homework: Homework) => void;
}

export const HomeworkCard: React.FC<HomeworkCardProps> = ({
  homework,
  subject,
  index,
  onToggleStatus,
  onEdit,
  onViewDetail,
  onDelete,
  onShare,
}) => {
  const { profile, user, proposeBatchTask, updateHomework, isBatchCR, showToast, triggerConfetti } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time student read-receipt logging for faculty assignments
  useEffect(() => {
    const propId = homework.proposalId;
    const targetBatchKey = homework.batchKey || profile.batchKey;
    if (homework.isFacultyAssignment && propId && targetBatchKey && user?.id) {
      const alreadyRead = homework.readReceipts && !!homework.readReceipts[user.id];
      if (!alreadyRead) {
        updateDoc(doc(db, 'shared_timetables', targetBatchKey, 'proposed_tasks', propId), {
          [`readReceipts.${user.id}`]: {
            studentId: user.id,
            studentName: profile.name || 'Student',
            rollNumber: profile.rollNumber || '',
            readAt: new Date().toISOString(),
          },
        }).catch((e) => {
          console.warn('Could not record assignment read receipt:', e);
        });
      }
    }
  }, [homework.isFacultyAssignment, homework.proposalId, homework.batchKey, homework.readReceipts, profile.batchKey, profile.name, profile.rollNumber, user?.id]);

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
  } else if (diffDays < 0) {
    deadlineLabel = `${Math.abs(diffDays)}d overdue`;
  } else {
    deadlineLabel = `${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  const isOverdue = diffDays < 0 && !isDone;
  const isUrgent = diffDays >= 0 && diffDays <= 1 && !isDone;
  const isInProgress = homework.status === 'In Progress' && !isDone;

  const handleStatusAction = () => {
    if (homework.status === 'Not Started') {
      updateHomework(homework.id, { status: 'In Progress' });
      showToast('In Progress', `"${homework.title}" marked as in progress ⏳`, 'info');
    } else if (homework.status === 'In Progress') {
      setShowCompleteConfirmModal(true);
    } else {
      updateHomework(homework.id, { status: 'Not Started', completedAt: undefined });
      showToast('Task Reopened', `"${homework.title}" reset to to-do`, 'info');
    }
  };

  const openAttachment = async (url?: string) => {
    if (!url) return;
    const clean = url.trim();
    if (!clean) return;
    const targetUrl = clean.startsWith('http://') || clean.startsWith('https://')
      ? clean
      : `https://${clean}`;

    try {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: targetUrl });
        return;
      }
    } catch (e) {
      console.warn('Browser.open failed, fallback:', e);
    }

    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const due = dueInfo(homework);
  const tone = subjectTone(subject, homework.subjectName);
  const label = subjectLabel(subject, homework.subjectName);
  const fileCount = homework.files?.length || 0;
  const link = homework.attachmentUrl || (homework.attachmentName?.startsWith('http') ? homework.attachmentName : '');
  const classroomLink = homework.externalLink || (homework.source === 'google_classroom' ? link : '');
  const extraLink = link && link !== classroomLink ? link : '';
  const openDetail = () => (onViewDetail ? onViewDetail(homework) : onEdit(homework));
  const source = homework.isFacultyAssignment
    ? { icon: GraduationCap, text: homework.facultyName ? homework.facultyName.split(' ').slice(-1)[0] : 'Faculty', title: `Posted by ${homework.facultyName || 'faculty'}` }
    : homework.source === 'google_classroom'
    ? { icon: GraduationCap, text: 'Classroom', title: 'From Google Classroom' }
    : homework.isBatchShared
    ? { icon: Users, text: 'Batch', title: 'Shared with your batch' }
    : null;

  const menuItem = 'flex items-center gap-2.5 w-full px-3 h-9 text-[13px] font-medium text-left text-fg hover:bg-surface-2 transition-colors cursor-pointer';

  return (
    <div className={clsx('relative w-full', showMenu ? 'z-40' : 'z-0')}>
      <article
        className={clsx(
          'relative flex border bg-surface transition-[border-color,box-shadow] duration-150',
          isDone ? 'border-line-soft' : 'border-line hover:border-line-strong hover:shadow-[0_10px_28px_-18px_rgba(17,17,17,0.35)]'
        )}
        style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}
      >
        <div className="flex-1 min-w-0 py-3.5 pl-4 pr-2">
          {/* Subject · source · menu */}
          <div className="flex items-center gap-2 min-h-[28px]">
            <span className={clsx('inline-flex items-center gap-1.5 min-w-0 text-[12px]', isDone ? 'text-faint' : 'text-muted')}>
              {/* Subject colour: same as this subject's timetable and subject cards */}
              <span aria-hidden="true" className={clsx('w-2.5 h-2.5 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]', isDone && 'opacity-40')} />
              {label.code && <span className="font-bold tracking-wide text-fg/80 shrink-0">{label.code}</span>}
              {label.code && <span aria-hidden="true">·</span>}
              <span className="truncate font-medium">{label.name}</span>
            </span>
            <span className="ml-auto flex items-center gap-0.5 shrink-0">
              {source && (
                <span title={source.title} className="inline-flex items-center gap-1 h-6 px-1.5 text-[11px] font-semibold text-muted">
                  <source.icon className="w-3.5 h-3.5" />
                  {source.text}
                </span>
              )}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                  aria-label="More options"
                  aria-expanded={showMenu}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1 w-44 bg-surface border border-line shadow-[0_12px_32px_-12px_rgba(0,0,0,0.28)] z-50 py-1"
                        role="menu"
                      >
                        <button
                          role="menuitem"
                          onClick={() => {
                            onEdit(homework);
                            setShowMenu(false);
                          }}
                          className={menuItem}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted" /> Edit
                        </button>
                        {onShare && (
                          <button
                            role="menuitem"
                            onClick={() => {
                              onShare(homework);
                              setShowMenu(false);
                            }}
                            className={menuItem}
                          >
                            <Share2 className="w-3.5 h-3.5 text-muted" /> Share
                          </button>
                        )}
                        {!homework.isBatchShared && (
                          <button
                            role="menuitem"
                            onClick={() => {
                              setShowMenu(false);
                              if (profile?.role !== 'cr' && !isBatchCR) {
                                showToast('Pilots only', 'Only your Batch Pilot can post to the whole batch.', 'info');
                                return;
                              }
                              setShowConfirmModal(true);
                            }}
                            className={menuItem}
                          >
                            {isBatchCR ? <Users className="w-3.5 h-3.5 text-muted" /> : <Vote className="w-3.5 h-3.5 text-muted" />}
                            {isBatchCR ? 'Post to batch' : 'Propose to batch'}
                          </button>
                        )}
                        <button
                          role="menuitem"
                          onClick={() => {
                            setShowMenu(false);
                            setShowDeleteConfirmModal(true);
                          }}
                          className={clsx(menuItem, 'text-danger hover:bg-danger-soft')}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </span>
          </div>

          {/* Status + title */}
          <div className="mt-1.5 flex items-start gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusAction();
              }}
              aria-label={isDone ? 'Mark as not done' : isInProgress ? 'Mark as done' : 'Start working'}
              title={isDone ? 'Mark as not done' : isInProgress ? 'Mark as done' : 'Start working'}
              className={clsx(
                'mt-0.5 shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors cursor-pointer',
                isDone
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'border-2 border-[var(--sub)] dark:border-[var(--sub-dark)] hover:bg-surface-2'
              )}
            >
              {isDone && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              {isInProgress && <span className="w-[10px] h-[10px] rounded-full bg-[var(--sub)] dark:bg-[var(--sub-dark)]" />}
            </button>
            <button type="button" onClick={openDetail} className="min-w-0 flex-1 text-left cursor-pointer pr-2">
              <h4
                className={clsx(
                  'text-[16px] leading-[22px] font-semibold tracking-tight break-words',
                  isDone ? 'text-muted line-through decoration-1' : 'text-fg'
                )}
              >
                {homework.title}
              </h4>
              {homework.description && !isDone && <p className="mt-0.5 text-[13px] leading-[19px] text-muted line-clamp-1">{homework.description}</p>}
            </button>
          </div>

          {/* Due · state · extras */}
          <div className="mt-3 pl-[34px] pr-2 flex flex-wrap items-center gap-1.5">
            <span className={clsx('inline-flex items-center gap-1.5 h-7 px-2.5 border text-[12px] font-semibold', DUE_TONE[due.tone])}>
              {due.tone === 'overdue' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : due.tone === 'done' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              {due.label}
            </span>
            {isInProgress && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 border border-line-soft bg-surface-2 text-[12px] font-semibold text-fg">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--sub)] dark:bg-[var(--sub-dark)]" /> In progress
              </span>
            )}
            {!isDone && homework.priority === 'High' && (
              <span className="inline-flex items-center gap-1.5 h-7 px-1.5 text-[12px] font-semibold text-rose-700 dark:text-rose-300" title="High priority">
                <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
                  <i className="block w-[3px] h-[5px] bg-current" />
                  <i className="block w-[3px] h-[8px] bg-current" />
                  <i className="block w-[3px] h-[11px] bg-current" />
                </span>
                High
              </span>
            )}
            {(fileCount > 0 || extraLink) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (extraLink && !fileCount) openAttachment(extraLink);
                  else openDetail();
                }}
                className="inline-flex items-center gap-1 h-7 px-1.5 text-[12px] font-semibold text-muted hover:text-fg cursor-pointer"
                title={fileCount ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : 'Open link'}
              >
                <Paperclip className="w-3.5 h-3.5" />
                {fileCount + (extraLink ? 1 : 0)}
              </button>
            )}
            {classroomLink && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAttachment(classroomLink);
                }}
                className="ml-auto inline-flex items-center gap-1 h-7 px-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline underline-offset-2 cursor-pointer"
              >
                Open <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </article>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={isBatchCR ? "Post to Entire Batch" : "Propose to Batch"}
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-fg">
            {isBatchCR 
              ? "Are you sure you want to post this task to the entire batch? As a CR, it will be automatically approved."
              : "Are you sure you want to propose this task to the entire batch? It will require a 30% consensus to be approved."}
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
            <button 
              type="button"
              className="text-[13px] font-semibold text-fg px-4 h-9 hover:bg-surface-2 transition-colors"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
            <button 
              type="button"
              className="text-[14px] font-semibold bg-ink text-on-ink px-6 h-11 hover:opacity-90 transition-opacity"
              onClick={async () => {
                setShowConfirmModal(false);
                const propId = await proposeBatchTask({
                  subjectId: homework.subjectId,
                  subjectName: homework.subjectName,
                  title: homework.title,
                  description: homework.description || '',
                  deadline: homework.deadline,
                  priority: homework.priority,
                  attachmentName: homework.attachmentName,
                });
                if (propId) {
                  updateHomework(homework.id, { isBatchShared: true, proposalId: propId });
                }
              }}
            >
              {isBatchCR ? "Yes, Post Task" : "Yes, Propose Task"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Complete Confirmation Modal */}
      <Modal
        isOpen={showCompleteConfirmModal}
        onClose={() => setShowCompleteConfirmModal(false)}
        title="Complete Task"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 text-left">
          <p className="text-[14px] text-fg">
            Are you sure you want to mark <span className="font-bold">"{homework.title}"</span> as completed?
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
            <button 
              type="button"
              className="text-[13px] font-semibold text-muted hover:text-fg px-4 h-9 hover:bg-surface-2 transition-colors cursor-pointer"
              onClick={() => setShowCompleteConfirmModal(false)}
            >
              No, Keep Doing
            </button>
            <button 
              type="button"
              className="text-[14px] font-semibold bg-[#18A889] hover:bg-[#159A78] text-[#FFFFFF] px-6 h-11 transition-colors cursor-pointer rounded-none"
              onClick={() => {
                setShowCompleteConfirmModal(false);
                updateHomework(homework.id, {
                  status: 'Completed',
                  completedAt: new Date().toISOString(),
                });
                triggerConfetti();
                showToast('Assignment Completed', `"${homework.title}" completed! 🎉`, 'success');
              }}
            >
              Yes, Complete
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Delete Task"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-fg">
              Are you sure you want to delete <span className="font-bold">"{homework.title}"</span>?
            </p>
            {homework.isBatchShared && isBatchCR && (
              <p className="text-[12px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 border border-amber-500/20">
                ⚠️ As a Batch Pilot, this will remove the task for all batch members in real-time.
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
            <button 
              type="button"
              className="text-[13px] font-semibold text-fg px-4 h-9 hover:bg-surface-2 transition-colors cursor-pointer"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              No, Keep
            </button>
            <button 
              type="button"
              className="text-[14px] font-semibold bg-red-600 hover:bg-red-700 text-[#FFFFFF] px-6 h-11 transition-colors cursor-pointer"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                onDelete(homework.id);
              }}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};