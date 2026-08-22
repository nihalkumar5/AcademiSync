'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek } from '@/lib/types';
import { DAYS_OF_WEEK } from '@/lib/timetableUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';

export interface AddEditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: ClassSession | null;
  defaultDay?: DayOfWeek;
}

export const AddEditClassModal: React.FC<AddEditClassModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  defaultDay = 'Monday',
}) => {
  const { subjects, addClassSession, updateClassSession } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('LT-1');
  const [faculty, setFaculty] = useState('');
  const [isLab, setIsLab] = useState(false);

  useEffect(() => {
    if (sessionToEdit) {
      setSubjectId(sessionToEdit.subjectId);
      setDay(sessionToEdit.day);
      setStartTime(sessionToEdit.startTime);
      setEndTime(sessionToEdit.endTime);
      setRoom(sessionToEdit.room);
      setFaculty(sessionToEdit.faculty || '');
      setIsLab(sessionToEdit.isLab || false);
    } else {
      if (subjects.length > 0 && !subjectId) {
        setSubjectId(subjects[0].id);
        setRoom(subjects[0].room || 'LT-1');
        setFaculty(subjects[0].facultyName || '');
      }
      setDay(defaultDay);
    }
  }, [sessionToEdit, isOpen, defaultDay, subjects]);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSubId = e.target.value;
    setSubjectId(selectedSubId);
    const sub = subjects.find((s) => s.id === selectedSubId);
    if (sub) {
      setRoom(sub.isLab ? sub.labRoom || sub.room : sub.room);
      setFaculty(sub.facultyName);
      setIsLab(sub.isLab || false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;

    if (sessionToEdit) {
      updateClassSession(sessionToEdit.id, {
        subjectId,
        day,
        startTime,
        endTime,
        room,
        faculty: faculty.trim() || undefined,
        isLab,
      });
    } else {
      addClassSession({
        subjectId,
        day,
        startTime,
        endTime,
        room,
        faculty: faculty.trim() || undefined,
        isLab,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sessionToEdit ? 'Edit Class Session' : 'Add Class Session'}
      description="Configure scheduled slot, location, and faculty."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Subject"
          value={subjectId}
          onChange={handleSubjectChange}
          required
        >
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.code && sub.code !== 'UNK' ? `[${sub.code}] ` : ''}{sub.name}
            </option>
          ))}
        </Select>

        <Select
          label="Day of Week"
          value={day}
          onChange={(e) => setDay(e.target.value as DayOfWeek)}
          required
        >
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Room / Lab Location"
            placeholder="e.g. LT-1, Room 204, AI Lab"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
          />
          <Input
            label="Faculty Name (Optional)"
            placeholder="e.g. Dr. Debanjan Sadhukhan"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <input
            type="checkbox"
            id="isLabCheck"
            checked={isLab}
            onChange={(e) => setIsLab(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <label
            htmlFor="isLabCheck"
            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            Mark as Practical / Lab Session
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {sessionToEdit ? 'Save Changes' : 'Add Class'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
