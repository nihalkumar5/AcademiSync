'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { FacultyLinkedBatch, HomeworkPriority } from '@/lib/types';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { broadcastBatchPushNotification } from '@/lib/pushNotifications';
import { CheckSquare, Calendar, Link2, Users, BookOpen, AlertCircle, Loader2 } from 'lucide-react';

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

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('High');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Set defaults when opened or when batches change
  useEffect(() => {
    if (linkedBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(linkedBatches[0].id);
      if (linkedBatches[0].selectedSubjectIds.length > 0) {
        setSelectedSubjectId(linkedBatches[0].selectedSubjectIds[0]);
      }
    }
  }, [linkedBatches, selectedBatchId]);

  // Set default deadline to 5 days from now
  useEffect(() => {
    if (isOpen && !deadline) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 5);
      defaultDate.setHours(23, 59, 0, 0);
      setDeadline(defaultDate.toISOString().slice(0, 16)); // format for datetime-local
    }
  }, [isOpen, deadline]);

  const activeBatch = linkedBatches.find((b) => b.id === selectedBatchId) || linkedBatches[0];

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const b = linkedBatches.find((x) => x.id === batchId);
    if (b && b.selectedSubjectIds.length > 0) {
      setSelectedSubjectId(b.selectedSubjectIds[0]);
    } else {
      setSelectedSubjectId('');
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
    if (!activeBatch) {
      setFormError('Please connect a batch first.');
      return;
    }
    if (!selectedSubjectId) {
      setFormError('Please select a subject.');
      return;
    }
    if (!deadline) {
      setFormError('Please pick a submission deadline.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const subjectIndex = activeBatch.selectedSubjectIds.indexOf(selectedSubjectId);
    const subjectName =
      subjectIndex >= 0 && activeBatch.selectedSubjectNames[subjectIndex]
        ? activeBatch.selectedSubjectNames[subjectIndex]
        : 'Subject';

    const facultyName = `${profile.facultyTitle || 'Prof.'} ${profile.name || 'Faculty'}`;

    try {
      const proposalsRef = collection(db, 'shared_timetables', activeBatch.batchKey, 'proposed_tasks');
      const nowIso = new Date().toISOString();

      const newTaskData = {
        batchKey: activeBatch.batchKey,
        title: title.trim(),
        description: description.trim(),
        subjectId: selectedSubjectId,
        subjectName,
        deadline: new Date(deadline).toISOString(),
        priority,
        attachmentName: attachmentUrl.trim() || undefined,
        attachmentUrl: attachmentUrl.trim() || undefined,
        creatorId: user?.id || 'faculty',
        creatorName: facultyName,
        creatorEmail: user?.primaryEmailAddress?.emailAddress || profile.email || '',
        creatorRole: 'faculty' as const,
        isFacultyAssignment: true,
        facultyTitle: profile.facultyTitle || 'Prof.',
        status: 'approved' as const, // Auto-approved because Faculty created it!
        approvedAt: nowIso,
        createdAt: nowIso,
        votes: {},
        approvalsCount: 1,
        rejectionsCount: 0,
        totalEligibleMembers: 0,
        readReceipts: {}, // Map of studentId -> { studentId, studentName, rollNumber, readAt }
      };

      const docRef = await addDoc(proposalsRef, newTaskData);

      // Trigger Push Notification to the batch
      broadcastBatchPushNotification({
        batchKey: activeBatch.batchKey,
        title: `📝 New Assignment: ${title.trim()}`,
        body: `${subjectName} assignment posted by ${facultyName}. Due ${new Date(deadline).toLocaleDateString()}`,
        type: 'assignment',
        senderId: user?.id,
        senderName: facultyName,
      });

      showToast(
        'Assignment Posted',
        `Successfully broadcast to ${activeBatch.batchName}. Tracking activated.`,
        'success'
      );

      resetForm();
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error posting faculty assignment:', err);
      setFormError('Failed to post assignment. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Assignment / Task"
      description="Post an official assignment or submission notice with real-time student read tracking."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans mt-2">
        {/* Batch & Subject Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Target Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="px-3 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs font-semibold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
            >
              {linkedBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs font-semibold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
            >
              {activeBatch?.selectedSubjectIds.map((subId, idx) => (
                <option key={subId} value={subId}>
                  {activeBatch.selectedSubjectNames[idx] || subId}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
            Assignment Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lab Assignment 3: Red-Black Tree Implementation"
            className="px-3.5 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-sm font-semibold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white placeholder:text-black/30 dark:placeholder:text-white/30"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
            Instructions / Problem Statement
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Provide instructions, question numbers, or submission guidelines..."
            className="px-3.5 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white resize-none placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>

        {/* Deadline & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Submission Deadline *
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="px-3 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
              Priority
            </label>
            <div className="flex gap-2">
              {(['Low', 'Medium', 'High'] as HomeworkPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-[8px] text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    priority === p
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-2xs'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Attachment URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Attachment / Drive Link (Optional)
          </label>
          <input
            type="url"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://drive.google.com/... or assignment PDF link"
            className="px-3.5 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>

        {formError && (
          <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] border border-black/15 dark:border-white/15 text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : (
              <span>Publish &amp; Track</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
