'use client';

import React from 'react';
import { Homework, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { FileTile } from './AddHomeworkModal';
import { useApp } from '@/context/AppContext';
import { Capacitor } from '@capacitor/core';
import { clsx } from 'clsx';
import { AlertTriangle, Check, Clock, Edit2, ExternalLink, GraduationCap, Link as LinkIcon, RotateCcw, Share2, Trash2, Users } from '@/components/ui/icons';
import { DUE_TONE, dueInfo, subjectLabel, subjectTone } from '@/lib/assignmentDisplay';

export interface HomeworkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  homework: Homework | null;
  onEdit: (hw: Homework) => void;
  onDelete: (id: string) => void;
  onShare?: (hw: Homework) => void;
}

export const HomeworkDetailModal: React.FC<HomeworkDetailModalProps> = ({ isOpen, onClose, homework, onEdit, onDelete, onShare }) => {
  const { subjects, homework: all, updateHomework, showToast } = useApp();
  if (!homework) return null;
  // Read the live copy so status changes show straight away
  const hw = all.find((h) => h.id === homework.id) || homework;
  const subject = subjects.find((s) => s.id === hw.subjectId);
  const tone = subjectTone(subject, hw.subjectName);
  const label = subjectLabel(subject, hw.subjectName);
  const due = dueInfo(hw);
  const isDone = hw.status === 'Completed';

  const openLink = async (url?: string) => {
    if (!url) return;
    const clean = url.trim();
    if (!clean) return;
    const target = clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
    try {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: target });
        return;
      }
    } catch {}
    if (typeof window !== 'undefined') window.open(target, '_blank', 'noopener,noreferrer');
  };

  const setStatus = (status: HomeworkStatus) => {
    if (status === hw.status) return;
    updateHomework(hw.id, { status, completedAt: status === 'Completed' ? new Date().toISOString() : undefined });
    if (status === 'Completed') showToast('Done', `"${hw.title}" marked as done`, 'success');
  };

  const link = hw.attachmentUrl || (hw.attachmentName?.startsWith('http') ? hw.attachmentName : '');
  const classroomLink = hw.externalLink || (hw.source === 'google_classroom' ? link : '');
  const otherLink = link && link !== classroomLink ? link : '';
  const from = hw.isFacultyAssignment
    ? { icon: GraduationCap, text: `${hw.facultyTitle ? `${hw.facultyTitle} ` : ''}${hw.facultyName || 'Faculty'}` }
    : hw.source === 'google_classroom'
    ? { icon: GraduationCap, text: 'Google Classroom' }
    : hw.isBatchShared
    ? { icon: Users, text: 'Your batch' }
    : null;

  const STATUSES: { id: HomeworkStatus; label: string }[] = [
    { id: 'Not Started', label: 'To do' },
    { id: 'In Progress', label: 'Doing' },
    { id: 'Completed', label: 'Done' },
  ];
  const PRI: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

  const footer = (
    <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          onClose();
          onDelete(hw.id);
        }}
        className="btn btn-danger-quiet btn-icon"
        aria-label="Delete assignment"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {onShare && (
        <button type="button" onClick={() => onShare(hw)} className="btn btn-secondary btn-icon" aria-label="Share" title="Share">
          <Share2 className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onClose();
          onEdit(hw);
        }}
        className="btn btn-secondary"
      >
        <Edit2 className="w-4 h-4" /> Edit
      </button>
      <button type="button" onClick={() => setStatus(isDone ? 'Not Started' : 'Completed')} className="btn btn-primary btn-lg flex-1">
        {isDone ? (
          <>
            <RotateCcw className="w-4 h-4" /> Reopen
          </>
        ) : (
          <>
            <Check className="w-4 h-4" /> Mark as done
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assignment" mobileFullSheet footer={footer}>
      <div className="flex flex-col gap-6 text-left" style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}>
        {/* Subject + title */}
        <header>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]" aria-hidden="true" />
            {label.code && <span className="font-bold tracking-wide text-fg">{label.code}</span>}
            {label.code && <span className="text-faint">·</span>}
            <span className="font-medium text-muted truncate">{label.name}</span>
          </div>
          <h2 className={clsx('mt-2.5 text-[24px] sm:text-[26px] leading-[1.2] font-semibold tracking-tight break-words', isDone ? 'text-muted line-through decoration-1' : 'text-fg')}>
            {hw.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={clsx('inline-flex items-center gap-1.5 h-8 px-3 border text-[13px] font-semibold', DUE_TONE[due.tone])}>
              {due.tone === 'overdue' ? <AlertTriangle className="w-4 h-4" /> : due.tone === 'done' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {due.label}
            </span>
          </div>
        </header>

        {/* Status: one tap */}
        <section>
          <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 border border-line bg-surface p-1 gap-1">
            {STATUSES.map((st) => {
              const on = hw.status === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setStatus(st.id)}
                  className={clsx(
                    'h-10 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer',
                    on ? (st.id === 'Completed' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-ink text-on-ink') : 'text-muted hover:text-fg'
                  )}
                >
                  {on && st.id === 'Completed' && <Check className="w-4 h-4" />}
                  {st.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Facts */}
        <dl className="border border-line bg-surface divide-y divide-line-soft">
          <div className="flex gap-4 px-4 py-3">
            <dt className="w-20 shrink-0 text-[13px] text-muted">Due</dt>
            <dd className="min-w-0 flex-1 text-[14px] text-fg">
              {due.full}
              {due.relative && !isDone && <span className="block text-[12px] text-muted mt-0.5">{due.relative}</span>}
            </dd>
          </div>
          <div className="flex items-center gap-4 px-4 py-3">
            <dt className="w-20 shrink-0 text-[13px] text-muted">Priority</dt>
            <dd className="flex items-center gap-2 text-[14px] text-fg">
              <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
                {[5, 8, 11].map((h, i) => (
                  <i
                    key={h}
                    className={clsx('block w-[3px]', i < (PRI[hw.priority] || 2) ? (hw.priority === 'High' ? 'bg-rose-600 dark:bg-rose-400' : 'bg-fg') : 'bg-line-strong')}
                    style={{ height: h }}
                  />
                ))}
              </span>
              {hw.priority}
            </dd>
          </div>
          {from && (
            <div className="flex items-center gap-4 px-4 py-3">
              <dt className="w-20 shrink-0 text-[13px] text-muted">From</dt>
              <dd className="flex items-center gap-1.5 text-[14px] text-fg min-w-0">
                <from.icon className="w-4 h-4 shrink-0 text-muted" />
                <span className="truncate">{from.text}</span>
              </dd>
            </div>
          )}
        </dl>

        {/* Instructions */}
        <section>
          <h3 className="text-[13px] font-semibold text-fg">Instructions</h3>
          {hw.description ? (
            <p className="mt-2 text-[15px] leading-[23px] text-fg whitespace-pre-wrap break-words">{hw.description}</p>
          ) : (
            <p className="mt-2 text-[14px] text-muted">
              Nothing added yet.{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(hw);
                }}
                className="font-semibold text-fg underline underline-offset-4 cursor-pointer"
              >
                Add notes
              </button>
            </p>
          )}
        </section>

        {/* Files */}
        {hw.files && hw.files.length > 0 && (
          <section>
            <h3 className="text-[13px] font-semibold text-fg">Files</h3>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {hw.files.map((f) => (
                <li key={f.id}>
                  <FileTile file={f} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Links */}
        {(classroomLink || otherLink) && (
          <section className="flex flex-col gap-2">
            {classroomLink && (
              <button
                type="button"
                onClick={() => openLink(classroomLink)}
                className="w-full flex items-center gap-3 p-3.5 border border-line bg-surface hover:border-line-strong text-left transition-colors cursor-pointer"
              >
                <span className="w-9 h-9 shrink-0 flex items-center justify-center border bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20">
                  <GraduationCap className="w-[18px] h-[18px]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-fg">Open in Google Classroom</span>
                  <span className="block text-[12px] text-muted">Submit your work there</span>
                </span>
                <ExternalLink className="w-4 h-4 text-muted" />
              </button>
            )}
            {otherLink && (
              <button
                type="button"
                onClick={() => openLink(otherLink)}
                className="w-full flex items-center gap-3 p-3.5 border border-line bg-surface hover:border-line-strong text-left transition-colors cursor-pointer"
              >
                <span className="w-9 h-9 shrink-0 flex items-center justify-center border border-line-soft bg-surface-2 text-fg">
                  <LinkIcon className="w-[18px] h-[18px]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-fg">Attached link</span>
                  <span className="block text-[12px] text-muted truncate">{otherLink.replace(/^https?:\/\//, '')}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-muted" />
              </button>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
};
