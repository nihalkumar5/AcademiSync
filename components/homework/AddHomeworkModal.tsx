'use client';

import { prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkPriority, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { clsx } from 'clsx';
import { Check, ChevronDown, FileText, Link as LinkIcon, Loader2, Paperclip, Plus, Search, Sparkles, Trash2, Users, X } from '@/components/ui/icons';
import { getAuthHeaders } from '@/lib/authHeaders';
import {
  MAX_TASK_FILES,
  TaskFile,
  deleteTaskFile,
  fileSizeLabel,
  getTaskFile,
  isAllowedTaskFile,
  openTaskFile,
  saveTaskFile,
} from '@/lib/taskFiles';

interface AddHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeworkToEdit?: Homework;
  prefilledData?: Partial<Homework>;
}

// ---------- date helpers (local time, yyyy-mm-ddThh:mm) ----------
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const isoToLocalInput = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d.getTime()) ? toLocalInput(d) : '';
};
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 0, 0);
  return toLocalInput(d);
};
const nextMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  d.setHours(23, 59, 0, 0);
  return toLocalInput(d);
};
const dueLabel = (v: string) => {
  if (!v) return '';
  const d = new Date(v);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (diff < 0) return `${date} · ${-diff} day${diff === -1 ? '' : 's'} ago`;
  if (diff === 0) return `${date} · today`;
  if (diff === 1) return `${date} · tomorrow`;
  return `${date} · in ${diff} days`;
};

const PRIORITIES: { id: HomeworkPriority; dot: string }[] = [
  { id: 'Low', dot: 'bg-emerald-500' },
  { id: 'Medium', dot: 'bg-amber-500' },
  { id: 'High', dot: 'bg-rose-500' },
];
const STATUSES: { id: HomeworkStatus; label: string }[] = [
  { id: 'Not Started', label: 'To do' },
  { id: 'In Progress', label: 'Doing' },
  { id: 'Completed', label: 'Done' },
];

const readAsDataUrl = (f: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

export const AddHomeworkModal: React.FC<AddHomeworkModalProps> = ({ isOpen, onClose, homeworkToEdit, prefilledData }) => {
  const { subjects, addHomework, updateHomework, deleteHomework, profile, proposeBatchTask, isBatchCR, showToast } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('Medium');
  const [status, setStatus] = useState<HomeworkStatus>('Not Started');
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [shareWithBatch, setShareWithBatch] = useState(false);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const scanRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  // Files added in this session but not saved yet: removed again if the form is closed without saving
  const unsaved = useRef<Set<string>>(new Set());
  const removedSaved = useRef<Set<string>>(new Set());

  const canShare = !homeworkToEdit && Boolean(profile.isBatchSynced && profile.batchKey);

  useEffect(() => {
    if (!isOpen) return;
    const isPilot = Boolean(isBatchCR && profile.isBatchSynced && profile.batchKey);
    const src = homeworkToEdit || prefilledData;
    setSubjectId(src?.subjectId || subjects[0]?.id || '');
    setTitle(src?.title || '');
    setDescription(src?.description || '');
    setDeadline(src?.deadline ? isoToLocalInput(src.deadline) : inDays(3));
    setPriority(src?.priority || 'Medium');
    setStatus(src?.status || 'Not Started');
    const l = src?.attachmentUrl || (src?.attachmentName?.startsWith('http') ? src.attachmentName : '');
    setLink(l || '');
    setShowLink(!!l);
    setFiles(src?.files || []);
    setShareWithBatch(homeworkToEdit ? false : isPilot);
    setError('');
    unsaved.current = new Set();
    removedSaved.current = new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeworkToEdit, isOpen]);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const filteredSubjects = subjects.filter(
    (s) => s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
  );

  // ---------- files ----------
  const addFiles = async (list: FileList | File[] | null) => {
    if (!list || !list.length) return;
    setError('');
    const room = MAX_TASK_FILES - files.length;
    if (room <= 0) {
      setError(`Up to ${MAX_TASK_FILES} files per assignment`);
      return [] as TaskFile[];
    }
    setAdding(true);
    const added: TaskFile[] = [];
    try {
      for (const f of Array.from(list).slice(0, room)) {
        if (!isAllowedTaskFile(f)) {
          setError('Only photos and PDFs can be attached');
          continue;
        }
        const saved = await saveTaskFile(f);
        unsaved.current.add(saved.id);
        added.push(saved);
      }
      setFiles((prev) => [...prev, ...added]);
    } catch (e: any) {
      setError(e?.message || "Couldn't add that file");
    } finally {
      setAdding(false);
    }
    return added;
  };

  const removeFile = (f: TaskFile) => {
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    if (unsaved.current.has(f.id)) {
      unsaved.current.delete(f.id);
      deleteTaskFile(f.id);
    } else removedSaved.current.add(f.id);
  };

  const close = () => {
    unsaved.current.forEach((id) => deleteTaskFile(id));
    unsaved.current = new Set();
    onClose();
  };

  // ---------- AI scan: fill the form from a photo / PDF of the sheet ----------
  const scan = async (picked: File[]) => {
    const files = picked.filter(Boolean).slice(0, 5);
    if (files.length === 0) return;
    setError('');
    setScanning(true);
    try {
      // Every page goes to the AI (shrunk on the phone); the originals are attached to the assignment
      const [images] = await Promise.all([prepareAiUpload(files, { maxDim: 2000, maxFiles: 5 }), addFiles(files)]);
      const res = await fetch('/api/extract-homework', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          fileName: files.length === 1 ? files[0].name : `${files.length} pages`,
          images,
          subjects: subjects.map((s) => s.name).filter(Boolean).slice(0, 40),
        }),
      });
      const data = await readAiResponse(res);
      if (res.status === 429) throw new Error(data.error || 'Too many scans. Try again in a few minutes.');
      if (!data.success || !data.homework) throw new Error(data.error || "Couldn't read that sheet");
      const hw = data.homework;
      const name = String(hw.subjectName || '').toLowerCase().trim();
      const exact = subjects.find((s) => s.name?.toLowerCase().trim() === name);
      const match = exact || (name
        ? subjects.find(
            (s) =>
              s.name?.toLowerCase().includes(name) ||
              name.includes(s.name?.toLowerCase() || '\u0000') ||
              s.shortName?.toLowerCase() === name ||
              s.code?.toLowerCase() === name
          )
        : undefined);
      if (match) setSubjectId(match.id);
      if (hw.title) setTitle(String(hw.title).slice(0, 140));
      if (hw.description) setDescription(String(hw.description).slice(0, 1000));
      if (hw.deadline && !isNaN(new Date(hw.deadline).getTime())) setDeadline(toLocalInput(new Date(hw.deadline)));
      if (hw.priority === 'High' || hw.priority === 'Medium' || hw.priority === 'Low') setPriority(hw.priority);
      showToast('Filled from your sheet', 'Check the details before saving.', 'success');
    } catch (e: any) {
      setError(`${e?.message || "Couldn't read that sheet"}. The file is attached, fill the rest yourself.`);
      setTimeout(() => titleRef.current?.focus(), 50);
    } finally {
      setScanning(false);
    }
  };

  // ---------- save ----------
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    if (!subjectId) return setError('Pick a subject');
    if (!title.trim()) {
      setError('Give the assignment a name');
      titleRef.current?.focus();
      return;
    }
    if (!deadline) return setError('Pick a due date');
    setSaving(true);
    const subjectName = selectedSubject?.name || '';
    const cleanLink = link.trim();
    const base = {
      subjectId,
      subjectName,
      title: title.trim(),
      description: description.trim(),
      deadline: new Date(deadline).toISOString(),
      priority,
      attachmentName: cleanLink,
      ...(cleanLink ? { attachmentUrl: cleanLink } : {}),
    };
    try {
      if (homeworkToEdit) {
        updateHomework(homeworkToEdit.id, { ...base, status, files });
        removedSaved.current.forEach((id) => deleteTaskFile(id));
      } else if (shareWithBatch && canShare) {
        await proposeBatchTask(base);
        // Files can't travel to the batch (they live on this phone), so keep a personal copy with them
        if (files.length) addHomework({ ...base, status: 'Not Started', files });
      } else {
        addHomework({ ...base, status, files });
      }
      unsaved.current = new Set();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn't save. Try again.");
      showToast('Not saved', err?.message || 'Try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const primaryLabel = homeworkToEdit ? 'Save changes' : shareWithBatch && canShare ? (isBatchCR ? 'Post to batch' : 'Propose to batch') : 'Add assignment';

  const quickDue = [
    { label: 'Today', value: inDays(0) },
    { label: 'Tomorrow', value: inDays(1) },
    { label: '3 days', value: inDays(3) },
    { label: 'Next week', value: nextMonday() },
  ];
  const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);

  const labelCls = 'text-[13px] font-semibold text-fg';
  const inputCls =
    'w-full h-12 px-3.5 bg-surface border border-line text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-fg transition-colors';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={close}
        title={homeworkToEdit ? 'Edit assignment' : 'New assignment'}
        mobileFullSheet
        footer={
          <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-2">
            {homeworkToEdit ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger-quiet" aria-label="Delete assignment">
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={close} className="btn btn-ghost">
                Cancel
              </button>
            )}
            <button type="button" onClick={() => handleSubmit()} disabled={saving || scanning || adding} className="btn btn-primary btn-lg flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : primaryLabel}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-7 text-left" noValidate>
          {/* ===== Scan the sheet ===== */}
          {!homeworkToEdit && (
            <button
              type="button"
              onClick={() => scanRef.current?.click()}
              disabled={scanning}
              className="group relative w-full overflow-hidden border border-ink bg-ink text-on-ink p-4 flex items-center gap-4 text-left cursor-pointer disabled:cursor-wait"
            >
              <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-on-ink/10 border border-on-ink/15">
                {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold">{scanning ? 'Reading your sheet…' : 'Scan the assignment sheet'}</span>
                <span className="block text-[13px] opacity-70 mt-0.5">
                  {scanning ? 'Filling in the subject, title and due date' : 'Snap or upload it. We fill in the details.'}
                </span>
              </span>
              {!scanning && <Plus className="w-5 h-5 shrink-0 opacity-80 transition-transform group-hover:rotate-90" />}
            </button>
          )}
          <input
            ref={scanRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              scan(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />

          {/* ===== What ===== */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject</label>
              <button
                type="button"
                onClick={() => setShowSubjectModal(true)}
                className="w-full h-12 px-3.5 bg-surface border border-line text-left flex items-center gap-3 hover:border-line-strong transition-colors cursor-pointer"
              >
                {selectedSubject?.code && selectedSubject.code !== 'UNK' && (
                  <span className="shrink-0 h-6 px-1.5 inline-flex items-center bg-surface-2 border border-line-soft text-[11px] font-bold tracking-wide text-fg">
                    {selectedSubject.code}
                  </span>
                )}
                <span className={clsx('flex-1 truncate text-[15px]', selectedSubject ? 'text-fg' : 'text-faint')}>
                  {selectedSubject ? selectedSubject.name : 'Pick a subject'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-muted" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="hw-title" className={labelCls}>
                Assignment
              </label>
              <input
                id="hw-title"
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Assignment 2: Linked lists"
                maxLength={140}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="hw-notes" className={labelCls}>
                  Notes
                </label>
                <span className="text-[12px] text-faint">Optional</span>
              </div>
              <textarea
                id="hw-notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Questions to do, pages, submission format…"
                rows={3}
                className="w-full px-3.5 py-3 bg-surface border border-line text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-fg transition-colors resize-y"
              />
            </div>
          </section>

          {/* ===== When ===== */}
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className={labelCls}>Due</span>
              <span className="text-[13px] text-muted truncate">{dueLabel(deadline)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {quickDue.map((q) => (
                <button key={q.label} type="button" onClick={() => setDeadline(q.value)} className={clsx('chip justify-center px-1 text-[13px]', sameDay(deadline, q.value) && 'chip-active')}>
                  {q.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              aria-label="Due date and time"
              className={inputCls}
            />

            <div className="mt-2 flex flex-col gap-1.5">
              <span className={labelCls}>Priority</span>
              <div role="radiogroup" aria-label="Priority" className="grid grid-cols-3 border border-line bg-surface p-1 gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={priority === p.id}
                    onClick={() => setPriority(p.id)}
                    className={clsx(
                      'h-10 inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors cursor-pointer',
                      priority === p.id ? 'bg-ink text-on-ink' : 'text-muted hover:text-fg'
                    )}
                  >
                    <span className={clsx('w-2 h-2', p.dot)} />
                    {p.id}
                  </button>
                ))}
              </div>
            </div>

            {homeworkToEdit && (
              <div className="mt-2 flex flex-col gap-1.5">
                <span className={labelCls}>Status</span>
                <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 border border-line bg-surface p-1 gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={status === s.id}
                      onClick={() => setStatus(s.id)}
                      className={clsx(
                        'h-10 text-[14px] font-semibold transition-colors cursor-pointer',
                        status === s.id ? 'bg-ink text-on-ink' : 'text-muted hover:text-fg'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ===== Files ===== */}
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className={labelCls}>Files</span>
              <span className="text-[12px] text-faint">Photos or PDF · saved on this phone</span>
            </div>

            {files.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {files.map((f) => (
                  <li key={f.id}>
                    <FileTile file={f} onRemove={() => removeFile(f)} />
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => filesRef.current?.click()}
                disabled={adding || files.length >= MAX_TASK_FILES}
                className="h-12 border border-dashed border-line-strong bg-surface text-[14px] font-semibold text-fg inline-flex items-center justify-center gap-2 hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {files.length ? 'Add more' : 'Attach files'}
              </button>
              <button
                type="button"
                onClick={() => setShowLink((v) => !v)}
                className={clsx(
                  'h-12 border bg-surface text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer',
                  showLink ? 'border-fg text-fg' : 'border-dashed border-line-strong text-fg hover:bg-surface-2'
                )}
              >
                <LinkIcon className="w-4 h-4" />
                {link ? 'Link added' : 'Add a link'}
              </button>
            </div>
            <input
              ref={filesRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {showLink && (
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Google Drive, Classroom or any link"
                autoFocus
                className={inputCls}
              />
            )}
          </section>

          {/* ===== Share ===== */}
          {canShare && (
            <section>
              <button
                type="button"
                role="switch"
                aria-checked={shareWithBatch}
                onClick={() => setShareWithBatch((v) => !v)}
                className="w-full p-4 border border-line bg-surface flex items-center gap-3.5 text-left cursor-pointer hover:border-line-strong transition-colors"
              >
                <span className="w-10 h-10 shrink-0 flex items-center justify-center bg-surface-2 border border-line-soft">
                  <Users className="w-[18px] h-[18px] text-fg" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-fg">Share with my batch</span>
                  <span className="block text-[13px] text-muted mt-0.5">
                    {isBatchCR ? 'Everyone gets it right away' : 'Classmates vote it in'}
                    {shareWithBatch && files.length > 0 ? ' · files stay with you' : ''}
                  </span>
                </span>
                <span className={clsx('relative w-11 h-6 shrink-0 transition-colors', shareWithBatch ? 'bg-ink' : 'bg-line-strong/60')}>
                  <span className={clsx('absolute top-0.5 w-5 h-5 bg-surface transition-[left]', shareWithBatch ? 'left-[22px]' : 'left-0.5')} />
                </span>
              </button>
            </section>
          )}

          {error && (
            <p role="alert" className="-mt-3 text-[13px] leading-[19px] text-danger">
              {error}
            </p>
          )}
        </form>
      </Modal>

      {/* Subject picker */}
      <Modal isOpen={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Pick a subject">
        <div className="flex flex-col max-h-[60vh] sm:max-h-[50vh] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 -mt-5 sm:-mt-6">
          <div className="relative border-b border-line shrink-0 bg-surface">
            <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search subjects"
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full pl-12 pr-4 h-14 bg-transparent text-[15px] focus:outline-none text-fg placeholder:text-faint"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredSubjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setSubjectId(sub.id);
                  setShowSubjectModal(false);
                  setSubjectSearch('');
                }}
                className={clsx(
                  'w-full text-left px-5 sm:px-6 py-3.5 border-b border-line-soft flex items-center gap-3 transition-colors cursor-pointer',
                  subjectId === sub.id ? 'bg-surface-2' : 'bg-surface hover:bg-surface-2'
                )}
              >
                <span className="flex-1 min-w-0">
                  {sub.code && sub.code !== 'UNK' && <span className="block text-[11px] font-bold tracking-wide text-muted">{sub.code}</span>}
                  <span className="block text-[15px] font-semibold text-fg truncate">{sub.name}</span>
                </span>
                {subjectId === sub.id && <Check className="w-5 h-5 shrink-0 text-fg" />}
              </button>
            ))}
            {filteredSubjects.length === 0 && <div className="p-8 text-center text-[14px] text-muted">No subjects match.</div>}
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete assignment?" maxWidth="sm">
        <div className="flex flex-col gap-5 text-left">
          <p className="text-[14px] leading-[21px] text-muted">
            <span className="font-semibold text-fg">{title || homeworkToEdit?.title}</span> and its files will be removed from this device.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (homeworkToEdit) {
                  (homeworkToEdit.files || []).forEach((f) => deleteTaskFile(f.id));
                  deleteHomework(homeworkToEdit.id);
                }
                setShowDeleteConfirm(false);
                close();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

/** One attached file: photo thumbnail or PDF card. Tap to open, × to remove. */
export const FileTile: React.FC<{ file: TaskFile; onRemove?: () => void }> = ({ file, onRemove }) => {
  const [thumb, setThumb] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const isImage = file.type.startsWith('image/');
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    getTaskFile(file.id).then((b) => {
      if (!live) return;
      if (!b) return setMissing(true);
      if (isImage) {
        url = URL.createObjectURL(b);
        setThumb(url);
      }
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, isImage]);

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => !missing && openTaskFile(file)}
        title={missing ? 'Added on another device' : file.name}
        className="w-full aspect-square border border-line bg-surface-2 overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <>
            <FileText className="w-6 h-6 text-fg" />
            <span className="mt-1.5 px-2 w-full text-[11px] font-semibold text-fg truncate">{missing ? 'On another device' : file.name}</span>
            {!missing && <span className="text-[11px] text-muted">{fileSizeLabel(file.size)}</span>}
          </>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-ink text-on-ink cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
