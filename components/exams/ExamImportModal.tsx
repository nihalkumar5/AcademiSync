'use client';

import { AiUploadError, prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Bot, X, Sparkles, Check, Trash2, Plus } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { ExtractedExam } from '@/lib/types';
import { getAuthHeaders } from '@/lib/authHeaders';

interface ExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to parse start time from human-readable strings like "09:30 AM - 12:30 PM", "2:00 PM", "14:00"
function parseExamStartTime(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 30 };
  const str = timeStr.trim().toLowerCase();

  const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return { hours: 9, minutes: 30 };

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridian = match[3] ? match[3].toLowerCase() : null;

  if (meridian === 'pm' && hours < 12) {
    hours += 12;
  } else if (meridian === 'am' && hours === 12) {
    hours = 0;
  } else if (!meridian) {
    if (hours >= 1 && hours <= 7) {
      hours += 12;
    }
  }

  return { hours, minutes };
}

export const ExamImportModal: React.FC<ExamImportModalProps> = ({ isOpen, onClose }) => {
  const { exams, setFullExams, showToast, user, profile, subjects } = useApp();

  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>('upload');
  const [extractedExams, setExtractedExams] = useState<ExtractedExam[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const resetState = () => {
    setStep('upload');
    setExtractedExams([]);
    setFileName('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const getBranchCode = (branchStr?: string): string => {
    if (!branchStr) return '';
    const match = branchStr.match(/\(([^)]+)\)/);
    if (match && match[1]) return match[1].trim();
    return branchStr.trim();
  };

  const runExtraction = async (filesInfo: { name: string, base64: string, mimeType: string }[]) => {
    setFileName(filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files selected`);
    setStep('extracting');

    try {
      const branchCode = getBranchCode(profile?.branch);
      const res = await fetch('/api/extract-exam', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          fileName: filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files',
          images: filesInfo,
          userId: user?.id || (user as any)?.uid || null,
          studentContext: {
            college: profile?.college || '',
            programme: profile?.programme || '',
            branch: profile?.branch || '',
            branchCode: branchCode,
            semester: profile?.semester || '',
            section: profile?.section || '',
            subjects: (subjects || []).map((s) => s.name + (s.code ? ` (${s.code})` : '')),
          },
        }),
      });

      const data = await readAiResponse(res);
      if (res.status === 429) {
        showToast('Scan Limit', data.error || 'Please wait a few minutes before scanning again.', 'error');
        resetState();
        return;
      }

      if (data.success && Array.isArray(data.exams) && data.exams.length > 0) {
        setExtractedExams(data.exams);
        setStep('review');
      } else {
        showToast('Scan Unsuccessful', data.error || 'Could not extract exams. Please upload a clearer photo or PDF.', 'error');
        resetState();
      }
    } catch (error) {
      console.error('Failed to extract exams:', error);
      showToast('Connection Error', 'Request failed or timed out. Please try again.', 'error');
      resetState();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    // Photos are shrunk on the phone; everything together stays under the upload limit
    prepareAiUpload(files, { maxDim: 2200 })
      .then(runExtraction)
      .catch((err) =>
        showToast("Can't send these files", err instanceof AiUploadError ? err.message : 'Could not read the files. Try again.', 'error')
      );
  };

  const updateExtractedRow = (index: number, partial: Partial<ExtractedExam>) => {
    setExtractedExams((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item))
    );
  };

  const removeExtractedRow = (index: number) => {
    setExtractedExams((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addExtractedRow = () => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    setExtractedExams((prev) => [
      ...prev,
      {
        subjectName: '',
        date: `${yyyy}-${mm}-${dd}`,
        time: '09:30 AM - 12:30 PM',
        syllabus: '',
        room: '',
        durationMinutes: 180,
      },
    ]);
  };

  const handleSaveConfirmed = () => {
    const formattedExams = extractedExams.map((e, idx) => {
      let cleanDate = (e.date || '').trim();
      if (cleanDate.includes('T')) {
        cleanDate = cleanDate.split('T')[0];
      }
      if (!cleanDate || cleanDate.length < 10) {
        const now = new Date();
        cleanDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }

      const [y, m, d] = cleanDate.split('-').map(Number);
      const { hours, minutes } = parseExamStartTime(e.time);

      // Create Date object in local browser time to eliminate timezone offset issues
      const localDate = new Date(y, m - 1, d, hours, minutes, 0);
      const isoDate = !isNaN(localDate.getTime()) ? localDate.toISOString() : new Date().toISOString();

      return {
        id: `exam_${Date.now()}_${idx}`,
        subjectName: e.subjectName?.trim() || 'Exam',
        date: isoDate,
        time: e.time?.trim() || undefined,
        syllabus: e.syllabus?.trim() || '',
        room: e.room?.trim() || '',
        durationMinutes: e.durationMinutes || undefined,
        createdAt: new Date().toISOString(),
      };
    });

    setFullExams(formattedExams);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Exam Timetable"
      description="Upload a photo or PDF and we'll extract exam dates and syllabus."
      maxWidth={step === 'review' ? '4xl' : 'md'}
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && (
        <div className="flex flex-col text-center">
          {profile?.branch && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-line-soft text-[12px] text-muted self-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Target: <strong className="text-fg">{profile.branch}</strong>{profile.semester ? ` • Sem ${profile.semester}` : ''}</span>
            </div>
          )}
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center rounded-none border-2 border-dashed border-line bg-surface-2 hover:bg-surface-2 transition-all cursor-pointer mb-5">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-6 h-6 mb-3 text-fg" />
            <h3 className="text-[15px] font-bold text-fg mb-1">
              Choose an exam schedule file
            </h3>
            <p className="text-[13px] text-muted mb-4">
              Photo or PDF
            </p>
            
            <div className="px-6 h-[40px] flex items-center justify-center bg-ink text-on-ink font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-3 shadow-sm">
              Choose file
            </div>

            <div className="text-[12px] text-faint font-medium ">
              JPG · PNG · PDF
            </div>
          </div>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center w-full">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-surface-2 border border-line flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-fg animate-pulse" />
              <Sparkles className="w-6 h-6 absolute top-1 right-0 text-amber-500 animate-bounce" />
            </div>
          </div>
          
          <h4 className="text-[18px] font-bold text-fg">
            Analyzing your schedule...
          </h4>
          <p className="text-[14px] text-muted mt-1 mb-8 max-w-[280px]">
            Reading exam dates, times and syllabus.
          </p>

          <div className="flex items-center gap-3 w-full max-w-[280px] mx-auto mb-10">
            <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 15, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-surface-2 text-left border border-line w-full max-w-[320px] rounded-none shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-fg">AI is working...</span>
              <span className="text-[13px] text-muted mt-0.5">This usually takes 10–20 seconds.</span>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="section-label">Extracted Exams</span>
              
              <div className="flex flex-col gap-4">
                {extractedExams.map((event, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 rounded-none border border-line bg-surface-2 relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-none bg-surface border border-line flex items-center justify-center text-muted hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <div className="sm:col-span-5 flex flex-col gap-1.5">
                        <label className="section-label">
                          Subject Name
                        </label>
                        <input
                          type="text"
                          value={event.subjectName}
                          placeholder="e.g. Operating Systems (CS501)"
                          onChange={(e) => updateExtractedRow(index, { subjectName: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                      <div className="sm:col-span-3 flex flex-col gap-1.5">
                        <label className="section-label">
                          Exam Date
                        </label>
                        <input
                          type="date"
                          value={event.date?.includes('T') ? event.date.split('T')[0] : event.date}
                          onChange={(e) => updateExtractedRow(index, { date: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                      <div className="sm:col-span-4 flex flex-col gap-1.5">
                        <label className="section-label">
                          Exam Time
                        </label>
                        <input
                          type="text"
                          value={event.time}
                          placeholder="e.g. 09:30 AM - 12:30 PM"
                          onChange={(e) => updateExtractedRow(index, { time: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <div className="sm:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">
                          Room / Hall (Optional)
                        </label>
                        <input
                          type="text"
                          value={event.room || ''}
                          placeholder="e.g. Room 204 or Hall B"
                          onChange={(e) => updateExtractedRow(index, { room: e.target.value })}
                          className="w-full px-3 py-1.5 h-[36px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                      <div className="sm:col-span-8 flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">
                          Syllabus / Modules (Optional)
                        </label>
                        <input
                          type="text"
                          value={event.syllabus || ''}
                          placeholder="e.g. Modules 1 to 4"
                          onChange={(e) => updateExtractedRow(index, { syllabus: e.target.value })}
                          className="w-full px-3 py-1.5 h-[36px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="flex items-center justify-center h-[44px] rounded-none border border-dashed border-line text-[13px] font-bold text-fg bg-surface-2 hover:bg-surface-2 transition-colors gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Exam
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-line">
              <button 
                type="button" 
                onClick={() => {
                  setStep('upload');
                  setExtractedExams([]);
                }}
                className="w-full sm:w-auto px-4 h-11 rounded-none text-[14px] font-semibold text-muted hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Scan Another
              </button>
              <button 
                type="button" 
                onClick={handleSaveConfirmed}
                className="w-full sm:w-auto px-6 h-11 rounded-none bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
              >
                Save {extractedExams.length} Exams
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
