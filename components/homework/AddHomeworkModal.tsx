'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkPriority, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';

export interface AddHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeworkToEdit?: Homework | null;
}

export const AddHomeworkModal: React.FC<AddHomeworkModalProps> = ({
  isOpen,
  onClose,
  homeworkToEdit,
}) => {
  const { subjects, addHomework, updateHomework } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('Medium');
  const [status, setStatus] = useState<HomeworkStatus>('Not Started');
  const [attachmentName, setAttachmentName] = useState('');

  useEffect(() => {
    if (homeworkToEdit) {
      setSubjectId(homeworkToEdit.subjectId);
      setTitle(homeworkToEdit.title);
      setDescription(homeworkToEdit.description || '');
      setDeadline(homeworkToEdit.deadline.slice(0, 16));
      setPriority(homeworkToEdit.priority);
      setStatus(homeworkToEdit.status);
      setAttachmentName(homeworkToEdit.attachmentName || '');
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
    }
  }, [homeworkToEdit, isOpen, subjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    if (homeworkToEdit) {
      updateHomework(homeworkToEdit.id, {
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: new Date(deadline).toISOString(),
        priority,
        status,
        attachmentName: attachmentName.trim() || undefined,
      });
    } else {
      addHomework({
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: new Date(deadline).toISOString(),
        priority,
        status,
        attachmentName: attachmentName.trim() || undefined,
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

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {homeworkToEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
