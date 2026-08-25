'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, Check, Trash2, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ExtractedExam } from '@/lib/types';

interface ExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExamImportModal: React.FC<ExamImportModalProps> = ({ isOpen, onClose }) => {
  const { exams, setFullExams } = useApp();

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

  const runExtraction = async (filesInfo: { name: string, base64: string, mimeType: string }[]) => {
    setFileName(filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files selected`);
    setStep('extracting');

    try {
      const res = await fetch('/api/extract-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files',
          images: filesInfo,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.exams)) {
        setExtractedExams(data.exams);
        setStep('review');
      } else {
        throw new Error('No exams returned');
      }
    } catch (error) {
      console.error('Failed to extract exams:', error);
      resetState();
    }
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

  const updateExtractedRow = (index: number, partial: Partial<ExtractedExam>) => {
    setExtractedExams((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item))
    );
  };

  const removeExtractedRow = (index: number) => {
    setExtractedExams((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addExtractedRow = () => {
    setExtractedExams((prev) => [
      ...prev,
      {
        subjectName: 'New Exam',
        date: new Date().toISOString(),
        time: '10:00 AM - 1:00 PM',
        syllabus: '',
        room: '',
        durationMinutes: 180,
      },
    ]);
  };

  const handleSaveConfirmed = () => {
    // Save to context
    const formattedExams = extractedExams.map((e, idx) => ({
      id: `exam_${Date.now()}_${idx}`,
      subjectName: e.subjectName,
      date: e.date,
      syllabus: e.syllabus,
      room: e.room,
      durationMinutes: e.durationMinutes,
      createdAt: new Date().toISOString(),
    }));
    // Overwrite old exams completely
    setFullExams(formattedExams);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Exam Timetable via AI/OCR"
      maxWidth={step === 'review' ? '4xl' : 'md'}
    >
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
                Upload Exam Schedule
              </h3>
              <p className="text-sm text-black/60 dark:text-white/60 max-w-[280px] mx-auto leading-relaxed">
                Powered by Gemini Vision OCR. Drop your exam timetable to auto-extract dates, times, and syllabus.
              </p>

              <div className="mt-6 pointer-events-none">
                <Button variant="primary" className="rounded-xl shadow-lg shadow-black/10 dark:shadow-white/10 ring-1 ring-black/5 dark:ring-white/5">
                  Choose Files
                </Button>
              </div>
            </div>
          </div>
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
            Extracting Exams via AI...
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Analyzing {fileName || 'document'} for exam schedules.
          </p>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#8C6B5D]/5 dark:bg-[#8C6B5D]/10 border border-[#8C6B5D]/20 dark:border-[#8C6B5D]/30 text-xs text-[#6E5643] dark:text-[#CBB5A1]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8C6B5D] shrink-0" />
              <span>
                <strong>Review Extracted Exams:</strong> AI extracted {extractedExams.length} exams. Please verify details before saving.
              </span>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm relative z-20">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-zinc-700">
                <tr>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Date/Time</th>
                  <th className="p-3">Syllabus</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {extractedExams.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.subjectName}
                        onChange={(e) => updateExtractedRow(idx, { subjectName: e.target.value })}
                        className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 font-medium"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={item.date}
                          onChange={(e) => updateExtractedRow(idx, { date: e.target.value })}
                          className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                        />
                        <input
                          type="text"
                          value={item.time}
                          onChange={(e) => updateExtractedRow(idx, { time: e.target.value })}
                          className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-slate-500"
                        />
                      </div>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.syllabus || ''}
                        onChange={(e) => updateExtractedRow(idx, { syllabus: e.target.value })}
                        className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                        placeholder="Syllabus topics..."
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => removeExtractedRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded relative z-30"
                        title="Delete exam"
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
            <Button variant="outline" size="sm" onClick={addExtractedRow} className="gap-1 rounded-xl relative z-30">
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetState} className="relative z-30">
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveConfirmed} className="gap-1.5 rounded-xl bg-[#8C6B5D] hover:bg-[#7B5B4D] text-white relative z-30">
                <Check className="w-4 h-4" />
                Confirm & Save Exams
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
