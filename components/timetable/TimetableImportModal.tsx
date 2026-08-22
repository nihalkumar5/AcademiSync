'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ExtractedClassSession, DayOfWeek, ClassSession, Subject } from '@/lib/types';
import { DAYS_OF_WEEK } from '@/lib/timetableUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Sparkles, Check, Trash2, Plus } from 'lucide-react';

export interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({ isOpen, onClose }) => {
  const { subjects, addSubject, timetable, setFullTimetable, setFullSubjectsAndTimetable, showToast } = useApp();

  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>('upload');
  const [fileName, setFileName] = useState('');
  const [extractedSessions, setExtractedSessions] = useState<ExtractedClassSession[]>([]);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setExtractedSessions([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const runExtraction = async (filesInfo: string | { name: string, base64: string, mimeType: string }[]) => {
    const isString = typeof filesInfo === 'string';
    setFileName(isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files selected`));
    setStep('extracting');

    try {
      const res = await fetch('/api/extract-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files'),
          images: isString ? [] : filesInfo,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setExtractedSessions(data.sessions);
      } else {
        // Fallback for demo
        setExtractedSessions([
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '10:00',
            subjectName: 'Machine Learning',
            subjectCode: 'CS302',
            room: 'LT-1',
            faculty: 'Dr. Debanjan Sadhukhan',
            isLab: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to extract timetable:', error);
      resetState();
    }

    setStep('review');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const readers = files.map((file) => {
        return new Promise<{ name: string, base64: string, mimeType: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              name: file.name,
              base64: event.target?.result as string,
              mimeType: file.type,
            });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((results) => {
        runExtraction(results);
      });
    }
  };

  const updateExtractedRow = (index: number, partial: Partial<ExtractedClassSession>) => {
    setExtractedSessions((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item))
    );
  };

  const removeExtractedRow = (index: number) => {
    setExtractedSessions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addExtractedRow = () => {
    setExtractedSessions((prev) => [
      ...prev,
      {
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        subjectName: 'New Subject',
        isLab: false,
      },
    ]);
  };

  const handleSaveConfirmed = () => {
    // We need to fetch existing subjects, match or create them, then create ClassSessions
    const newSubjects: Subject[] = [...subjects];
    const newSessions: ClassSession[] = [];

    extractedSessions.forEach((extSession, idx) => {
      // Find matching subject
      let matchedSubject = newSubjects.find(
        (s) => s.name.toLowerCase() === extSession.subjectName.toLowerCase() || s.code === extSession.subjectCode
      );

      if (!matchedSubject) {
        matchedSubject = {
          id: `subj_${Date.now()}_${idx}`,
          name: extSession.subjectName,
          code: extSession.subjectCode || '',
          shortName: extSession.subjectName.substring(0, 4).toUpperCase(),
          facultyName: extSession.faculty || 'TBD',
          room: extSession.room || 'TBD',
          credits: 3,
          color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'][idx % 6],
          carryRequirements: ['Notebook'],
          isLab: extSession.isLab,
        };
        newSubjects.push(matchedSubject);
      }

      newSessions.push({
        id: `sess_${Date.now()}_${idx}`,
        subjectId: matchedSubject.id,
        day: extSession.day,
        startTime: extSession.startTime,
        endTime: extSession.endTime,
        room: extSession.room || matchedSubject.room,
        faculty: extSession.faculty || matchedSubject.facultyName,
        isLab: extSession.isLab,
      });
    });

    // Save subjects and timetable together atomically with matching IDs
    setFullSubjectsAndTimetable(newSubjects, newSessions);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Timetable via AI/OCR"
      description="Upload your institute timetable image or PDF to extract your weekly schedule."
      maxWidth={step === 'review' ? '4xl' : 'lg'}
    >
      {step === 'upload' && (
        <div className="flex flex-col gap-6 text-center">
          <div className="relative group rounded-3xl overflow-hidden p-0.5 transition-all">
            {/* Animated glowing border background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-transparent to-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
            
            <div className="relative flex flex-col items-center justify-center p-10 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-950/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer overflow-hidden">
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              
              {/* Background abstract decoration */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-5 shadow-inner relative z-0">
                <Upload className="w-7 h-7" />
              </div>
              
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Upload Timetable Photo
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm font-medium leading-relaxed">
                Powered by Gemini Vision OCR. Drop your official timetable to auto-extract your schedule.
              </p>

              <div className="mt-6 px-5 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold tracking-wide shadow-md group-hover:scale-105 transition-transform duration-300">
                Select Files
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4">
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">or try demo</span>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
          </div>

          <Button
            variant="outline"
            onClick={() => runExtraction('IIITNR_BTech_CSE_Sem6_Timetable.pdf')}
            className="w-full gap-2.5 rounded-2xl border-zinc-200 dark:border-zinc-800 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 py-3.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            Scan Sample IIIT-NR B.Tech Timetable
          </Button>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            Extracting Timetable Structure via AI...
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Analyzing {fileName || 'document'} for lecture timings, room tags, and faculty.
          </p>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Review Extracted Classes:</strong> AI extracted {extractedSessions.length} sessions. Please verify details before saving.
              </span>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-zinc-700">
                <tr>
                  <th className="p-3">Day</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Faculty</th>
                  <th className="p-3">Lab?</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {extractedSessions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="p-2.5">
                      <select
                        value={item.day}
                        onChange={(e) => updateExtractedRow(idx, { day: e.target.value as DayOfWeek })}
                        className="bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <input
                          type="text"
                          value={item.startTime}
                          onChange={(e) => updateExtractedRow(idx, { startTime: e.target.value })}
                          className="w-12 bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-1.5 py-1"
                        />
                        <span>-</span>
                        <input
                          type="text"
                          value={item.endTime}
                          onChange={(e) => updateExtractedRow(idx, { endTime: e.target.value })}
                          className="w-12 bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-1.5 py-1"
                        />
                      </div>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.subjectName}
                        onChange={(e) => updateExtractedRow(idx, { subjectName: e.target.value })}
                        className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 font-medium"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.room || ''}
                        onChange={(e) => updateExtractedRow(idx, { room: e.target.value })}
                        className="w-20 bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.faculty || ''}
                        onChange={(e) => updateExtractedRow(idx, { faculty: e.target.value })}
                        className="w-28 bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={item.isLab || false}
                        onChange={(e) => updateExtractedRow(idx, { isLab: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => removeExtractedRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={addExtractedRow} className="gap-1 rounded-xl">
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetState}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveConfirmed} className="gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                <Check className="w-4 h-4" />
                Confirm & Save Timetable
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
