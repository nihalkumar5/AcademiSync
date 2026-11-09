'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { FacultyLinkedBatch, HomeworkPriority } from '@/lib/types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { broadcastBatchPushNotification } from '@/lib/pushNotifications';
import { formatFacultyBatchDegreeAndBranch, isCommonSubject } from '@/lib/facultyUtils';
import { AlertCircle, Loader2, Check, Paperclip, FileText, X } from '@/components/ui/icons';
import { ASSIGNMENT_FILE_ACCEPT, MAX_ASSIGNMENT_FILE_MB, UploadedFile, UploadHandle, checkAssignmentFile, deleteAssignmentFile, formatBytes, uploadAssignmentFile, uploadErrorText } from '@/lib/assignmentFiles';

// "YYYY-MM-DDTHH:mm" in the device's own time zone (what <input type="datetime-local"> expects)
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const endOfDayIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return toLocalInput(d);
};
const DUE_PRESETS: { label: string; days: number }[] = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In a week', days: 7 },
];

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { profile, user, showToast } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  // Aggregate all unique subjects taught across connected batches (grouping common subjects)
  const uniqueSubjects = useMemo(() => {
    const list: { name: string; batches: FacultyLinkedBatch[] }[] = [];
    linkedBatches.forEach((batch) => {
      (batch.selectedSubjectNames || []).forEach((sName) => {
        const cleanName = sName.trim();
        if (!cleanName) return;
        const existing = list.find((item) => isCommonSubject(cleanName, [item.name]));
        if (!existing) {
          list.push({ name: cleanName, batches: [batch] });
        } else {
          if (!existing.batches.some((b) => b.id === batch.id)) {
            existing.batches.push(batch);
          }
        }
      });
    });
    return list;
  }, [linkedBatches]);

  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('High');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize subject & automatically select all matching batches
  useEffect(() => {
    if (isOpen) {
      if (!selectedSubjectName && uniqueSubjects.length > 0) {
        const initialSub = uniqueSubjects[0].name;
        setSelectedSubjectName(initialSub);
        setSelectedBatchIds(uniqueSubjects[0].batches.map((b) => b.id));
      } else if (uniqueSubjects.length === 0 && linkedBatches.length > 0 && selectedBatchIds.length === 0) {
        setSelectedBatchIds(linkedBatches.map((b) => b.id));
      }
    }
  }, [isOpen, uniqueSubjects, linkedBatches, selectedSubjectName, selectedBatchIds.length]);

  // Default deadline: a week from now, end of day (local time, not UTC)
  useEffect(() => {
    if (isOpen && !deadline) setDeadline(endOfDayIn(7));
  }, [isOpen, deadline]);
  const [showDetails, setShowDetails] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // ---------- File attachment (Firebase Storage) ----------
  const [upload, setUpload] = useState<{ name: string; size: number; pct: number; handle: UploadHandle } | null>(null);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [fileError, setFileError] = useState('');
  const pickFile = (f: File | undefined) => {
    if (!f || !user?.id) return;
    setFileError('');
    const problem = checkAssignmentFile(f);
    if (problem) return setFileError(problem);
    if (file) deleteAssignmentFile(file.path);
    setFile(null);
    const handle = uploadAssignmentFile(user.id, f, (pct) => setUpload((u) => (u ? { ...u, pct } : u)));
    setUpload({ name: f.name, size: f.size, pct: 0, handle });
    handle.promise
      .then((done) => setFile(done))
      .catch((err) => setFileError(uploadErrorText(err)))
      .finally(() => setUpload(null));
  };
  const removeFile = () => {
    if (file) deleteAssignmentFile(file.path);
    setFile(null);
  };
  // Closing without posting: stop the upload and don't leave an orphan file behind
  const handleClose = () => {
    upload?.handle.cancel();
    if (file) deleteAssignmentFile(file.path);
    setFile(null);
    setUpload(null);
    setFileError('');
    onClose();
  };

  const handleSubjectChange = (newSubName: string) => {
    setSelectedSubjectName(newSubName);
    // Find all batches teaching this common subject and auto-check them
    const matchingBatches = linkedBatches.filter((b) =>
      (b.selectedSubjectNames || []).some((name) =>
        isCommonSubject(name, [newSubName])
      )
    );
    if (matchingBatches.length > 0) {
      setSelectedBatchIds(matchingBatches.map((b) => b.id));
    } else {
      setSelectedBatchIds(linkedBatches.map((b) => b.id));
    }
  };

  const handleToggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedBatchIds.length === linkedBatches.length) {
      // Revert to only batches matching the selected subject
      const matching = linkedBatches.filter((b) =>
        (b.selectedSubjectNames || []).some((name) =>
          isCommonSubject(name, [selectedSubjectName])
        )
      );
      setSelectedBatchIds(matching.length > 0 ? matching.map((b) => b.id) : []);
    } else {
      setSelectedBatchIds(linkedBatches.map((b) => b.id));
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter an assignment title.');
      return;
    }
    if (selectedBatchIds.length === 0) {
      setFormError('Please select at least one target batch.');
      return;
    }
    if (!selectedSubjectName.trim()) {
      setFormError('Please select a subject.');
      return;
    }
    if (!deadline) {
      setFormError('Please pick a submission deadline.');
      return;
    }
    if (upload) {
      setFormError('Wait for the file to finish uploading.');
      return;
    }

    const targetBatches = linkedBatches.filter((b) => selectedBatchIds.includes(b.id));
    if (targetBatches.length === 0) {
      setFormError('No valid batches selected.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const facultyName = `${profile.facultyTitle || 'Prof.'} ${profile.name || 'Faculty'}`;
    const nowIso = new Date().toISOString();
    const deadlineIso = new Date(deadline).toISOString();

    try {
      // Post to all selected batches in parallel
      await Promise.all(
        targetBatches.map(async (batch) => {
          const subIdx = (batch.selectedSubjectNames || []).findIndex(
            (n) => n.trim().toLowerCase() === selectedSubjectName.trim().toLowerCase()
          );
          const subId =
            subIdx >= 0
              ? batch.selectedSubjectIds[subIdx]
              : (batch.selectedSubjectIds?.[0] || 'sub_general');
          const subName = subIdx >= 0 ? batch.selectedSubjectNames[subIdx] : selectedSubjectName.trim();

          const proposalsRef = collection(db, 'shared_timetables', batch.batchKey, 'proposed_tasks');

          const newTaskData = {
            batchKey: batch.batchKey,
            title: title.trim(),
            description: [description.trim(), file && attachmentUrl.trim() ? `Link: ${attachmentUrl.trim()}` : ''].filter(Boolean).join('\n\n'),
            subjectId: subId,
            subjectName: subName,
            deadline: deadlineIso,
            priority,
            // An uploaded file wins the attachment slot (students open attachmentName as a link);
            // a pasted link then goes into the instructions so neither is lost.
            ...(file
              ? {
                  attachmentName: file.url,
                  attachmentUrl: file.url,
                  attachmentFileName: file.name,
                  attachmentSize: file.size,
                  attachmentType: file.type,
                  attachmentPath: file.path,
                }
              : attachmentUrl.trim()
              ? { attachmentName: attachmentUrl.trim(), attachmentUrl: attachmentUrl.trim() }
              : {}),
            creatorId: user?.id || 'faculty',
            creatorName: facultyName,
            creatorEmail: user?.primaryEmailAddress?.emailAddress || profile.email || '',
            creatorRole: 'faculty' as const,
            isFacultyAssignment: true,
            facultyTitle: profile.facultyTitle || 'Prof.',
            status: 'approved' as const, // Auto-approved for Faculty
            approvedAt: nowIso,
            createdAt: nowIso,
            votes: {},
            approvalsCount: 1,
            rejectionsCount: 0,
            totalEligibleMembers: 0,
            readReceipts: {},
          };

          await addDoc(proposalsRef, newTaskData);

          // Broadcast Push Notification to batch members
          broadcastBatchPushNotification({
            batchKey: batch.batchKey,
            title: `📝 New Assignment: ${title.trim()}`,
            body: `${subName} assignment posted by ${facultyName}. Due ${new Date(deadline).toLocaleDateString()}`,
            type: 'assignment',
            senderId: user?.id,
            senderName: facultyName,
          });
        })
      );

      showToast(
        'Assignment Posted',
        `Broadcast to ${targetBatches.length} ${targetBatches.length === 1 ? 'batch' : 'batches'}. Tracking activated.`,
        'success'
      );

      resetForm();
      setFile(null); // posted: keep the file in Storage
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error posting faculty assignment:', err);
      setFormError('Failed to post assignment. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chip = (on: boolean) =>
    `inline-flex items-center gap-f2 min-h-[44px] px-f3 py-f2 border text-left text-[14px] font-medium transition-colors cursor-pointer ${
      on
        ? 'bg-ink text-on-ink border-line-strong'
        : 'bg-surface text-fg border-line hover:border-line-strong'
    }`;
  const label = 'block text-[15px] font-semibold text-fg';
  const hint = 'mt-f1 text-[13px] text-muted';
  const field =
    'w-full h-12 px-f3 bg-surface border border-line text-[15px] text-fg placeholder:text-[#9A9A9A] focus:outline-none focus:border-line-strong transition-colors';
  const dueDate = deadline ? new Date(deadline) : null;
  const activePreset = DUE_PRESETS.find((p) => endOfDayIn(p.days) === deadline)?.days ?? null;
  const targetCount = selectedBatchIds.length;
  const shortBatch = (b: FacultyLinkedBatch) => {
    const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(b);
    return { main: degreeAndBranch, sub: semText };
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New assignment" description="Students in the batches you pick see it right away and get a notification.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-f5 text-left font-sans">
        {/* 1. What */}
        <div>
          <label htmlFor="asg-title" className={label}>
            Title
          </label>
          <input
            id="asg-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lab 3: Red-black trees"
            className={`${field} mt-f2 h-[52px] text-[17px]`}
            autoFocus
            maxLength={140}
          />
        </div>

        {/* 2. Subject */}
        <div>
          <p className={label}>Subject</p>
          {uniqueSubjects.length > 0 ? (
            <div className="mt-f2 flex flex-wrap gap-f2">
              {uniqueSubjects.map((s) => (
                <button key={s.name} type="button" onClick={() => handleSubjectChange(s.name)} aria-pressed={selectedSubjectName === s.name} className={chip(selectedSubjectName === s.name)}>
                  {selectedSubjectName === s.name && <Check className="w-4 h-4 shrink-0" />}
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            <input type="text" value={selectedSubjectName} onChange={(e) => setSelectedSubjectName(e.target.value)} placeholder="e.g. Linear Algebra" className={`${field} mt-f2`} required />
          )}
        </div>

        {/* 3. Who */}
        <div>
          <p className={label}>Send to</p>
          {linkedBatches.length === 0 ? (
            <p className="mt-f2 flex items-center gap-f2 p-f3 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 text-[14px] text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" /> Connect a batch first, from More → Batches.
            </p>
          ) : (
            <>
              <p className={hint}>{targetCount === 0 ? 'Pick at least one batch.' : `${targetCount} ${targetCount === 1 ? 'batch' : 'batches'} selected`}</p>
              <div className="mt-f2 flex flex-wrap gap-f2">
                {linkedBatches.map((batch) => {
                  const on = selectedBatchIds.includes(batch.id);
                  const { main, sub } = shortBatch(batch);
                  return (
                    <button key={batch.id} type="button" onClick={() => handleToggleBatch(batch.id)} aria-pressed={on} className={chip(on)}>
                      <span className={`w-4 h-4 shrink-0 flex items-center justify-center border ${on ? 'border-current' : 'border-[#BDBDB8] dark:border-white/30'}`}>{on && <Check className="w-3 h-3" strokeWidth={3} />}</span>
                      <span className="flex flex-col leading-tight">
                        <span>{main}</span>
                        {sub && <span className={`text-[12px] font-normal ${on ? 'opacity-70' : 'text-muted'}`}>{sub}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 4. When — a day is enough; the time stays end-of-day unless you add one */}
        <div>
          <p className={label}>Due</p>
          {dueDate && !isNaN(dueDate.getTime()) && (
            <p className={hint}>
              {dueDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {deadline.endsWith('T23:59') ? ', end of day' : `, ${dueDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
            </p>
          )}
          <div className="mt-f2 grid grid-cols-3 gap-f2">
            {DUE_PRESETS.map((p) => {
              const on = !pickDate && activePreset === p.days;
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => {
                    setPickDate(false);
                    setShowTime(false);
                    setDeadline(endOfDayIn(p.days));
                  }}
                  aria-pressed={on}
                  className={`${chip(on)} justify-center`}
                >
                  {p.label}
                </button>
              );
            })}
            <button type="button" onClick={() => setPickDate(true)} aria-pressed={pickDate || activePreset === null} className={`${chip(pickDate || activePreset === null)} justify-center`}>
              Pick a date
            </button>
          </div>
          {(pickDate || activePreset === null) && (
            <input
              type="date"
              value={deadline.slice(0, 10)}
              min={toLocalInput(new Date()).slice(0, 10)}
              onChange={(e) => e.target.value && setDeadline(`${e.target.value}T${deadline.slice(11) || '23:59'}`)}
              aria-label="Due date"
              className={`${field} mt-f2`}
            />
          )}
          {showTime ? (
            <div className="mt-f2 flex items-center gap-f2">
              <input
                type="time"
                value={deadline.slice(11, 16)}
                onChange={(e) => e.target.value && setDeadline(`${deadline.slice(0, 10)}T${e.target.value}`)}
                aria-label="Due time"
                className={`${field} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  setShowTime(false);
                  setDeadline(`${deadline.slice(0, 10)}T23:59`);
                }}
                className="shrink-0 h-11 px-f3 text-[14px] font-semibold text-muted hover:text-fg cursor-pointer"
              >
                Remove time
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowTime(true)} className="mt-f2 h-9 text-[13px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer">
              + Add a time
            </button>
          )}
        </div>

        {/* 5. File */}
        <div>
          <p className={label}>
            Attachment <span className="font-normal text-[#8A8A8E]">· optional</span>
          </p>
          {upload ? (
            <div className="mt-f2 p-f3 border border-line">
              <div className="flex items-center gap-f3">
                <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[#6B6B6B]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-fg truncate">{upload.name}</span>
                  <span className="block text-[12px] text-muted tabular-nums">
                    Uploading · {upload.pct}% of {formatBytes(upload.size)}
                  </span>
                </span>
                <button type="button" onClick={() => upload.handle.cancel()} className="shrink-0 h-9 px-f3 text-[13px] font-semibold text-fg hover:underline cursor-pointer">
                  Cancel
                </button>
              </div>
              <div className="mt-f2 h-1 bg-surface-3">
                <div className="h-full bg-ink transition-[width]" style={{ width: `${upload.pct}%` }} />
              </div>
            </div>
          ) : file ? (
            <div className="mt-f2 flex items-center gap-f3 p-f3 border border-emerald-300/70 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/[0.07]">
              <FileText className="w-5 h-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-fg truncate">{file.name}</span>
                <span className="block text-[12px] text-muted">{formatBytes(file.size)} · uploaded</span>
              </span>
              <button type="button" onClick={removeFile} aria-label="Remove file" className="shrink-0 w-9 h-9 flex items-center justify-center text-[#6B6B6B] hover:text-fg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="mt-f2 flex items-center gap-f3 p-f3 min-h-[55px] border border-dashed border-[#BDBDB8] dark:border-white/[0.2] hover:border-line-strong cursor-pointer transition-colors">
              <Paperclip className="w-5 h-5 shrink-0 text-muted" />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-fg">Attach a file</span>
                <span className="block text-[12px] text-muted">PDF, Word, PPT, Excel, image or ZIP · up to {MAX_ASSIGNMENT_FILE_MB} MB</span>
              </span>
              <input
                type="file"
                accept={ASSIGNMENT_FILE_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          {fileError && (
            <p role="alert" className="mt-f2 flex items-start gap-f2 text-[13px] text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {fileError}
            </p>
          )}
        </div>

        {/* 6. Optional details, out of the way until wanted */}
        <div className="border-t border-line-soft pt-f4">
          <button type="button" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails} className="w-full flex items-center justify-between text-left cursor-pointer">
            <span>
              <span className={label}>Details</span>
              <span className={`${hint} block`}>Instructions, a link and priority · optional</span>
            </span>
            <span className={`text-[20px] leading-none text-[#6B6B6B] transition-transform ${showDetails ? 'rotate-45' : ''}`}>+</span>
          </button>
          {showDetails && (
            <div className="mt-f4 flex flex-col gap-f4">
              <div>
                <label htmlFor="asg-desc" className="block text-[14px] font-medium text-fg">
                  Instructions
                </label>
                <textarea id="asg-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Questions to attempt, format, how to submit…" rows={4} className={`${field} mt-f2 h-auto py-f3 resize-y`} />
              </div>
              <div>
                <label htmlFor="asg-link" className="block text-[14px] font-medium text-fg">
                  Link
                </label>
                <input id="asg-link" type="url" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="Drive, PDF or form link" className={`${field} mt-f2`} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-fg">Priority</p>
                <div className="mt-f2 grid grid-cols-3 border border-line">
                  {(['Low', 'Medium', 'High'] as HomeworkPriority[]).map((p) => (
                    <button key={p} type="button" onClick={() => setPriority(p)} aria-pressed={priority === p} className={`h-11 text-[14px] font-medium cursor-pointer ${priority === p ? 'bg-ink text-on-ink' : 'text-muted'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {formError && (
          <p role="alert" className="flex items-start gap-f2 text-[14px] text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {formError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting || linkedBatches.length === 0 || !!upload} className="btn btn-primary btn-lg text-[16px]">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSubmitting ? 'Posting…' : targetCount > 1 ? `Post to ${targetCount} batches` : 'Post assignment'}
        </button>
      </form>
    </Modal>
  );
};
