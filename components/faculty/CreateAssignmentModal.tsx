'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { FacultyLinkedBatch, HomeworkPriority } from '@/lib/types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { broadcastBatchPushNotification } from '@/lib/pushNotifications';
import { CheckSquare, Calendar, Link2, Users, BookOpen, AlertCircle, Loader2, Check } from 'lucide-react';

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

  // Aggregate all unique subjects taught across connected batches
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, { name: string; batches: FacultyLinkedBatch[] }>();
    linkedBatches.forEach((batch) => {
      (batch.selectedSubjectNames || []).forEach((sName) => {
        const cleanName = sName.trim();
        if (!cleanName) return;
        const key = cleanName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name: cleanName, batches: [batch] });
        } else {
          const entry = map.get(key)!;
          if (!entry.batches.some((b) => b.id === batch.id)) {
            entry.batches.push(batch);
          }
        }
      });
    });
    return Array.from(map.values());
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

  // Set default deadline to 5 days from now
  useEffect(() => {
    if (isOpen && !deadline) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 5);
      defaultDate.setHours(23, 59, 0, 0);
      setDeadline(defaultDate.toISOString().slice(0, 16));
    }
  }, [isOpen, deadline]);

  const handleSubjectChange = (newSubName: string) => {
    setSelectedSubjectName(newSubName);
    // Find all batches teaching this subject and auto-check them
    const matchingBatches = linkedBatches.filter((b) =>
      (b.selectedSubjectNames || []).some(
        (name) => name.trim().toLowerCase() === newSubName.trim().toLowerCase()
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
        (b.selectedSubjectNames || []).some(
          (name) => name.trim().toLowerCase() === selectedSubjectName.trim().toLowerCase()
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
            description: description.trim(),
            subjectId: subId,
            subjectName: subName,
            deadline: deadlineIso,
            priority,
            attachmentName: attachmentUrl.trim() || undefined,
            attachmentUrl: attachmentUrl.trim() || undefined,
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
      title="Post Assignment / Task"
      description="Post an official assignment or submission notice with real-time student read tracking."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans mt-2">
        {/* Step 1: Subject Selection (Top / Primary) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Subject / Course *
            </span>
            {uniqueSubjects.length > 0 && (
              <span className="text-[10px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                {uniqueSubjects.length} subjects found
              </span>
            )}
          </label>

          {uniqueSubjects.length > 0 ? (
            <select
              value={selectedSubjectName}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs font-bold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white shadow-2xs"
            >
              {uniqueSubjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.batches.length} {s.batches.length === 1 ? 'batch' : 'batches'})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedSubjectName}
              onChange={(e) => setSelectedSubjectName(e.target.value)}
              placeholder="e.g. Linear Algebra & Matrix Analysis"
              className="w-full px-3.5 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-xs font-semibold text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              required
            />
          )}
        </div>

        {/* Step 2: Target Batches (Multi-Select Pills, Auto-Selected) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Target Batches ({selectedBatchIds.length} Selected) *
            </label>
            {linkedBatches.length > 1 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[10.5px] font-bold uppercase tracking-wider text-[#6F6F6F] dark:text-[#A1A1AA] hover:text-black dark:hover:text-white cursor-pointer"
              >
                {selectedBatchIds.length === linkedBatches.length
                  ? 'Subject Batches Only'
                  : 'Select All Batches'}
              </button>
            )}
          </div>

          {linkedBatches.length === 0 ? (
            <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You have not connected any batches yet. Connect a batch first.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-2.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] max-h-48 overflow-y-auto">
              {linkedBatches.map((batch) => {
                const isSelected = selectedBatchIds.includes(batch.id);
                const teachesThisSubject = (batch.selectedSubjectNames || []).some(
                  (name) => name.trim().toLowerCase() === selectedSubjectName.trim().toLowerCase()
                );
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => handleToggleBatch(batch.id)}
                    className={`px-3 py-2 rounded-[8px] text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 text-left shadow-2xs ${
                      isSelected
                        ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white'
                        : 'bg-white dark:bg-[#121317] text-black/70 dark:text-white/70 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white text-black dark:bg-black dark:text-white border-white dark:border-black'
                          : 'border-black/30 dark:border-white/30'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="truncate max-w-[220px] font-bold">
                        {batch.batchName}
                      </span>
                      <span
                        className={`text-[9.5px] font-mono ${
                          isSelected ? 'text-white/70 dark:text-black/70' : 'text-black/40 dark:text-white/40'
                        }`}
                      >
                        Code: {batch.batchCode}
                      </span>
                    </div>
                    {teachesThisSubject && (
                      <span
                        className={`text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] shrink-0 font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        Matched
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[10.5px] text-[#6F6F6F] dark:text-[#A1A1AA]">
            {selectedBatchIds.length === 1
              ? `Posting to 1 batch. Real-time read tracking will activate.`
              : `Posting to ${selectedBatchIds.length} batches automatically in parallel.`}
          </p>
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
                <span>Broadcasting to {selectedBatchIds.length} batches...</span>
              </>
            ) : (
              <span>Publish to {selectedBatchIds.length} {selectedBatchIds.length === 1 ? 'Batch' : 'Batches'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

