'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ExtractedClassSession, DayOfWeek, ClassSession, Subject } from '@/lib/types';
import { DAYS_OF_WEEK, mergeConsecutiveSessions } from '@/lib/timetableUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Sparkles, Check, Trash2, Plus, ShieldAlert } from 'lucide-react';
import { useUser, SignInButton } from '@clerk/nextjs';

export interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({ isOpen, onClose }) => {
  const { subjects, addSubject, timetable, setFullTimetable, setFullSubjectsAndTimetable, showToast } = useApp();
  const { isSignedIn, isLoaded } = useUser();

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
        setExtractedSessions(mergeConsecutiveSessions(data.sessions));
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
        (s) => s.name.toLowerCase() === extSession.subjectName.toLowerCase() || 
               (extSession.subjectCode && s.code && s.code.toLowerCase() === extSession.subjectCode.toLowerCase())
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
          color: ['#7C897A', '#C08A76', '#C79F6F', '#B88B8C', '#7A8B99', '#9C8E80'][idx % 6],
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
      {!isLoaded ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8C6B5D]" />
        </div>
      ) : !isSignedIn ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8E0D5] text-[#8C6B5D] flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold text-[#1A1918] dark:text-[#F4F1EA]">
              Sign In Required
            </h3>
            <p className="text-sm text-[#7A6D61] dark:text-[#9A9188] max-w-[280px] mx-auto leading-relaxed font-medium">
              Please sign in to your student account to upload and parse timetables using AI.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="px-6 py-3 rounded-xl bg-[#8C6B5D] hover:bg-[#7A5B4D] text-[#FDF8F4] font-bold text-sm tracking-wide transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      ) : (
        <>
          {step === 'upload' && (
            <div className="flex flex-col gap-6 text-center">
              <div className="relative group transition-all">
                <div className="relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-black dark:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer overflow-hidden">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="w-14 h-14 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1 group-hover:scale-110">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-black dark:text-white mb-2 tracking-tight">
                    Upload Timetable Photo
                  </h3>
                  <p className="text-sm text-black/60 dark:text-white/60 max-w-[260px] mx-auto leading-relaxed">
                    Powered by Gemini Vision OCR. Drop your official timetable to auto-extract your schedule.
                  </p>
                  
                  <div className="mt-6 pointer-events-none">
                    <Button variant="primary" className="rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)]">
                      Choose Files
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-bold text-black/40 dark:text-white/40 tracking-widest uppercase">
                <span className="w-12 h-px bg-black/10 dark:bg-white/10" />
                Or Try Demo
                <span className="w-12 h-px bg-black/10 dark:bg-white/10" />
              </div>

              <Button 
                variant="outline" 
                onClick={() => runExtraction('IIITNR_BTech_CSE_Sem6_Timetable.pdf')}
                className="rounded-none border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black gap-2 w-full justify-center"
              >
                <Sparkles className="w-4 h-4" />
                Scan Sample IIIT-NR B.Tech Timetable
              </Button>
            </div>
          )}

          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#8C6B5D]/10 dark:bg-[#8C6B5D]/20 text-[#8C6B5D] dark:text-[#CBB5A1] flex items-center justify-center animate-pulse shadow-sm">
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
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#8C6B5D]/5 dark:bg-[#8C6B5D]/10 border border-[#8C6B5D]/20 dark:border-[#8C6B5D]/30 text-xs text-[#6E5643] dark:text-[#CBB5A1]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8C6B5D] shrink-0" />
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
                      <th className="p-3 text-center">Lab?</th>
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
                            className="w-4 h-4 rounded text-[#8C6B5D] focus:ring-[#8C6B5D]"
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
                  <Button variant="primary" size="sm" onClick={handleSaveConfirmed} className="gap-1.5 rounded-xl bg-[#8C6B5D] hover:bg-[#7B5B4D] text-white">
                    <Check className="w-4 h-4" />
                    Confirm & Save Timetable
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
