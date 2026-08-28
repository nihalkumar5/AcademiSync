'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkPriority, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { Vote, Users, Check } from 'lucide-react';

export interface AddHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeworkToEdit?: Homework | null;
  prefilledData?: Partial<Homework> | null;
}

export const AddHomeworkModal: React.FC<AddHomeworkModalProps> = ({
  isOpen,
  onClose,
  homeworkToEdit,
  prefilledData,
}) => {
  const { subjects, addHomework, updateHomework, profile, proposeBatchTask, isBatchCR } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('Medium');
  const [status, setStatus] = useState<HomeworkStatus>('Not Started');
  const [attachmentName, setAttachmentName] = useState('');
  const [shareWithBatch, setShareWithBatch] = useState(false);

  useEffect(() => {
    if (homeworkToEdit) {
      setSubjectId(homeworkToEdit.subjectId);
      setTitle(homeworkToEdit.title);
      setDescription(homeworkToEdit.description || '');
      setDeadline(homeworkToEdit.deadline.slice(0, 16));
      setPriority(homeworkToEdit.priority);
      setStatus(homeworkToEdit.status);
      setAttachmentName(homeworkToEdit.attachmentName || '');
      setShareWithBatch(false);
    } else if (prefilledData) {
      setSubjectId(prefilledData.subjectId || (subjects.length > 0 ? subjects[0].id : ''));
      setTitle(prefilledData.title || '');
      setDescription(prefilledData.description || '');
      setDeadline(prefilledData.deadline ? prefilledData.deadline.slice(0, 16) : new Date().toISOString().slice(0, 16));
      setPriority(prefilledData.priority || 'Medium');
      setStatus(prefilledData.status || 'Not Started');
      setAttachmentName(prefilledData.attachmentName || '');
      setShareWithBatch(false);
    } else {
      if (subjects.length > 0 && !subjectId) {
        setSubjectId(subjects[0].id);
      }
      // Default deadline to 3 days from now at 23:59
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      defaultDate.setHours(23, 59, 0, 0);
      setDeadline(defaultDate.toISOString().slice(0, 16));
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('Not Started');
      setAttachmentName('');
      setShareWithBatch(false);
    }
  }, [homeworkToEdit, isOpen, subjects, profile.isBatchSynced, profile.batchKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const subjectName = selectedSubject?.name || '';

    if (homeworkToEdit) {
      updateHomework(homeworkToEdit.id, {
        subjectId,
        subjectName,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        status,
        attachmentName: attachmentName.trim(),
      });
    } else if (shareWithBatch && profile.isBatchSynced && profile.batchKey) {
      // Propose as batch assignment (50% consensus vote)
      await proposeBatchTask({
        subjectId,
        subjectName,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        attachmentName: attachmentName.trim(),
      });
    } else {
      addHomework({
        subjectId,
        subjectName,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        status,
        attachmentName: attachmentName.trim(),
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={homeworkToEdit ? 'Edit Homework / Task' : 'Create Homework Task'}
      description="Track submissions, lab journals, and assignment deadlines."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <Select
          label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
        >
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.code && sub.code !== 'UNK' ? `[${sub.code}] ` : ''}{sub.name}
            </option>
          ))}
        </Select>

        <Input
          label="Task / Assignment Title"
          placeholder="e.g. Assignment 2: Gradient Descent & Regularization"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <Textarea
          label="Description / Problem Details (Optional)"
          placeholder="Include question numbers, dataset URLs, or Jupyter Notebook requirements..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Deadline Date & Time"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />

          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value as HomeworkPriority)}
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as HomeworkStatus)}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </Select>

          <Input
            label="Attachment / Problem File (Optional)"
            placeholder="e.g. Assignment_2_Specs.pdf"
            value={attachmentName}
            onChange={(e) => setAttachmentName(e.target.value)}
          />
        </div>

        {/* BATCH PROPOSAL TOGGLE */}
        {!homeworkToEdit && profile.isBatchSynced && profile.batchKey && (
          <div className="p-3 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="batch_share_toggle"
              checked={shareWithBatch}
              onChange={(e) => setShareWithBatch(e.target.checked)}
              className="w-4 h-4 mt-0.5 cursor-pointer accent-black dark:accent-white"
            />
            <label htmlFor="batch_share_toggle" className="cursor-pointer text-xs flex flex-col gap-0.5">
              <span className="font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                {isBatchCR ? <Users className="w-3.5 h-3.5 text-blue-500" /> : <Vote className="w-3.5 h-3.5 text-amber-500" />}
                <span>{isBatchCR ? 'Post to Entire Batch' : 'Share with Entire Batch (30% Consensus)'}</span>
              </span>
              <span className="text-[11px] text-black/60 dark:text-white/60">
                {isBatchCR 
                  ? "As a CR, this task will be automatically approved and instantly added to everyone's schedule." 
                  : "Submits this assignment to your batchmates. If 30% of batch members vote Approve, it automatically gets added to everyone's schedule!"}
              </span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {homeworkToEdit ? 'Save Changes' : shareWithBatch ? (isBatchCR ? 'Post to Batch' : 'Propose to Batch') : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
