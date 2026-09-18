'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Exam } from '@/lib/types';
import { Clock, MapPin, BookOpen, Trash2, Calendar, AlertTriangle, Check, Sparkles } from 'lucide-react';

interface AddEditExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  examToEdit?: Exam | null;
}

export const AddEditExamModal: React.FC<AddEditExamModalProps> = ({
  isOpen,
  onClose,
  examToEdit,
}) => {
  const { addExam, updateExam, deleteExam, subjects, isBatchCR, profile, showToast } = useApp();

  const [subjectName, setSubjectName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [room, setRoom] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmDelete(false);
      return;
    }

    if (examToEdit) {
      setSubjectName(examToEdit.subjectName || '');
      setRoom(examToEdit.room || '');
      setSyllabus(examToEdit.syllabus || '');
      setDurationMinutes(examToEdit.durationMinutes || 180);

      try {
        const d = new Date(examToEdit.date);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setDate(`${yyyy}-${mm}-${dd}`);

          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          setTime(`${hh}:${min}`);
        } else {
          setDate(new Date().toISOString().slice(0, 10));
          setTime('09:30');
        }
      } catch {
        setDate(new Date().toISOString().slice(0, 10));
        setTime('09:30');
      }
    } else {
      setSubjectName('');
      setRoom('');
      setSyllabus('');
      setDurationMinutes(180);
      const today = new Date();
      today.setDate(today.getDate() + 7);
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setTime('09:30');
    }
    setConfirmDelete(false);
  }, [isOpen, examToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSubject = subjectName.trim();
    if (!trimmedSubject) {
      showToast('Subject Required', 'Please enter or select a subject name', 'error');
      return;
    }

    if (!date) {
      showToast('Date Required', 'Please choose the exam date', 'error');
      return;
    }

    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = (time || '09:30').split(':').map(Number);
    const combinedDate = new Date(y, m - 1, d, h || 9, min || 0, 0);
    const isoString = combinedDate.toISOString();

    if (examToEdit) {
      updateExam({
        ...examToEdit,
        subjectName: trimmedSubject,
        date: isoString,
        room: room.trim() || undefined,
        syllabus: syllabus.trim() || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
    } else {
      addExam({
        subjectName: trimmedSubject,
        date: isoString,
        room: room.trim() || undefined,
        syllabus: syllabus.trim() || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (!examToEdit) return;
    deleteExam(examToEdit.id);
    onClose();
  };

  const isPilot = isBatchCR && profile.isBatchSynced;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={examToEdit ? 'Edit Exam' : 'Add Exam'}
      description={
        examToEdit
          ? 'Update exam date, timing, examination room, or syllabus.'
          : 'Schedule a new exam with date, room, and syllabus details.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
        {/* Pilot Sync Banner */}
        {isPilot && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Batch Pilot:</strong> Changes here will sync to all batch members in real-time.
            </span>
          </div>
        )}

        {/* Subject Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#111111] dark:text-[#F4F4F6]">
            Subject / Course Name *
          </label>
          <input
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Operating Systems (CS501)"
            className="w-full px-3.5 py-2.5 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 transition-colors"
            required
            autoFocus
          />

          {/* Quick Enrolled Subject Chips */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[11px] text-[#6F6F6F] dark:text-[#A1A1AA] self-center mr-1">
                Quick pick:
              </span>
              {subjects.slice(0, 6).map((sub) => (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => setSubjectName(sub.name + (sub.code ? ` (${sub.code})` : ''))}
                  className="px-2 py-0.5 text-[11.5px] border border-[#E5E5E5] dark:border-white/[0.08] hover:border-[#111111] dark:hover:border-white/40 bg-[#F7F7F5] dark:bg-white/[0.03] text-[#111111] dark:text-[#F4F4F6] transition-colors rounded-none cursor-pointer"
                >
                  {sub.code || sub.shortName || sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#111111] dark:text-[#F4F4F6]">
              Exam Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#111111] dark:text-[#F4F4F6]">
              Start Time *
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 transition-colors"
              required
            />
          </div>
        </div>

        {/* Duration & Room Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#111111] dark:text-[#F4F4F6]">
              Duration (Minutes)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 transition-colors"
              />
              <div className="flex gap-1 shrink-0">
                {[120, 180].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`px-2 py-2 text-[11px] font-medium border transition-colors cursor-pointer ${
                      durationMinutes === mins
                        ? 'border-[#111111] bg-[#111111] text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-[#E5E5E5] dark:border-white/[0.1] text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white'
                    }`}
                  >
                    {mins / 60}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#111111] dark:text-[#F4F4F6]">
              Exam Room / Hall
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Hall A, LH-201"
              className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        {/* Syllabus / Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#111111] dark:text-[#F4F4F6]">
            Syllabus / Units / Notes
          </label>
          <textarea
            rows={3}
            value={syllabus}
            onChange={(e) => setSyllabus(e.target.value)}
            placeholder="e.g. Units 1 to 4. Focus on Dynamic Programming and Memory Management."
            className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[13px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 transition-colors resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E5E5E5] dark:border-white/[0.08] mt-2">
          {examToEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 px-2.5 text-[12px] text-[#6F6F6F] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-3 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              {examToEdit ? 'Save Changes' : 'Add Exam'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
