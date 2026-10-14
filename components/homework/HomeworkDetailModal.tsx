'use client';

import React from 'react';
import { Homework, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useApp } from '@/context/AppContext';
import { Capacitor } from '@capacitor/core';
import {
  Calendar,
  Clock,
  Check,
  RotateCcw,
  GraduationCap,
  ExternalLink,
  Edit2,
  Trash2,
  Share2,
  BookOpen,
  Paperclip,
} from 'lucide-react';

export interface HomeworkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  homework: Homework | null;
  onEdit: (hw: Homework) => void;
  onDelete: (id: string) => void;
  onShare?: (hw: Homework) => void;
}

export const HomeworkDetailModal: React.FC<HomeworkDetailModalProps> = ({
  isOpen,
  onClose,
  homework,
  onEdit,
  onDelete,
  onShare,
}) => {
  const { subjects, updateHomework, showToast } = useApp();

  if (!homework) return null;

  const subject = subjects.find((s) => s.id === homework.subjectId);
  const subjectName = homework.subjectName || subject?.name || 'General';

  const isDone = homework.status === 'Completed';
  const isInProgress = homework.status === 'In Progress';

  const deadlineDate = new Date(homework.deadline);
  const isValidDate = !isNaN(deadlineDate.getTime());

  let deadlineLabel = '';
  let isOverdue = false;
  if (isValidDate) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfDeadline = new Date(deadlineDate);
    startOfDeadline.setHours(0, 0, 0, 0);
    const diffTime = startOfDeadline.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) deadlineLabel = 'Due Today';
    else if (diffDays === 1) deadlineLabel = 'Due Tomorrow';
    else if (diffDays < 0) {
      deadlineLabel = `${Math.abs(diffDays)}d overdue`;
      isOverdue = true;
    } else {
      deadlineLabel = `Due in ${diffDays} days`;
    }
  }

  const openLink = async (url?: string) => {
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

  const toggleStatus = () => {
    if (isDone) {
      updateHomework(homework.id, { status: 'Not Started', completedAt: undefined });
      showToast('Task Reopened', `"${homework.title}" marked as To Do`, 'info');
    } else {
      updateHomework(homework.id, { status: 'Completed', completedAt: new Date().toISOString() });
      showToast('Completed', `"${homework.title}" marked as complete! 🎉`, 'success');
    }
  };

  const classroomUrl =
    homework.externalLink ||
    (homework.attachmentName?.startsWith('http') ? homework.attachmentName : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      maxWidth="md"
    >
      <div className="flex flex-col gap-5 py-1 text-left">
        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-none border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04] text-[#111111] dark:text-[#F4F4F6] uppercase">
            <BookOpen className="w-3 h-3 inline mr-1" />
            {subjectName}
          </span>

          {homework.source === 'google_classroom' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase">
              <GraduationCap className="w-3 h-3" />
              Classroom
            </span>
          )}

          <span
            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-none uppercase ${
              homework.priority === 'High'
                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                : homework.priority === 'Medium'
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                : 'bg-black/5 dark:bg-white/5 text-gray-500 border border-black/10'
            }`}
          >
            {homework.priority} Priority
          </span>

          <span
            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-none uppercase ${
              isDone
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : isInProgress
                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                : 'bg-black/[0.05] dark:bg-white/[0.05] text-[#6B6B6B] dark:text-[#94A3B8] border border-black/10 dark:border-white/10'
            }`}
          >
            {isDone ? 'Completed' : isInProgress ? 'Doing' : 'To Do'}
          </span>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug tracking-tight">
            {homework.title}
          </h2>

          {/* Deadline Bar */}
          {isValidDate && (
            <div className="flex items-center gap-3 mt-3 text-xs text-[#6B6B6B] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {deadlineDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>•</span>
              <span
                className={`font-mono font-bold uppercase text-[10.5px] px-1.5 py-0.2 rounded-none ${
                  isOverdue && !isDone
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#111111] dark:text-[#FFFFFF]'
                }`}
              >
                {deadlineLabel}
              </span>
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-black/10 dark:border-white/10">
          <label className="text-[11px] font-bold font-mono uppercase text-[#6B6B6B] dark:text-[#94A3B8] tracking-wider">
            Instructions & Details
          </label>
          <div className="p-3.5 rounded-none bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] max-h-52 overflow-y-auto">
            {homework.description ? (
              <p className="text-[13px] text-[#111111] dark:text-[#E2E8F0] whitespace-pre-wrap leading-relaxed">
                {homework.description}
              </p>
            ) : (
              <p className="text-xs italic text-[#A0A0A0]">No detailed instructions provided.</p>
            )}
          </div>
        </div>

        {/* Quick Links (Classroom / Attachment) */}
        {classroomUrl && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => openLink(classroomUrl)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-none bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Open in Google Classroom</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10 gap-2 flex-wrap">
          {/* Status Toggle Action */}
          <Button
            variant={isDone ? 'outline' : 'primary'}
            onClick={toggleStatus}
            className="flex items-center gap-1.5 text-xs font-semibold py-2 px-4"
          >
            {isDone ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" /> Reopen Task
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Mark as Completed
              </>
            )}
          </Button>

          {/* Secondary Options */}
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(homework)}
                className="p-2 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#6B6B6B] dark:text-[#94A3B8] transition-colors rounded-none cursor-pointer"
                title="Share Task"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(homework);
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#111111] dark:text-[#F4F4F6] text-xs font-medium rounded-none transition-colors cursor-pointer"
              title="Edit Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(homework.id);
              }}
              className="p-2 border border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors rounded-none cursor-pointer"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
