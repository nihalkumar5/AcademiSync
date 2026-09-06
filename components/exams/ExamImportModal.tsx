'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Bot, X, Sparkles, Check, Trash2, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ExtractedExam } from '@/lib/types';
import { validateUploadedFile } from '@/lib/fileSafety';

interface ExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExamImportModal: React.FC<ExamImportModalProps> = ({ isOpen, onClose }) => {
  const { exams, setFullExams, showToast } = useApp();

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

  const runExtraction = async (filesInfo: string | { name: string, base64: string, mimeType: string }[]) => {
    const isString = typeof filesInfo === 'string';
    setFileName(isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files selected`));
    setStep('extracting');

    try {
      if (typeof filesInfo === 'string') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setExtractedExams([
          {
            subjectName: 'Data Structures and Algorithms',
            date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '10:00 AM - 1:00 PM',
            syllabus: 'Trees, Graphs, DP, Sorting',
            durationMinutes: 180
          },
          {
            subjectName: 'Computer Networks',
            date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '2:00 PM - 5:00 PM',
            syllabus: 'OSI Model, TCP/IP, Routing',
            durationMinutes: 180
          }
        ]);
        setStep('review');
        return;
      }
      
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
      for (const file of files) {
        const check = validateUploadedFile({ name: file.name, size: file.size, type: file.type });
        if (!check.valid) {
          showToast('Invalid File', check.error || 'Please upload an image or PDF under 5MB.', 'error');
          e.target.value = '';
          return;
        }
      }

      const readers = files.map((file) => {
        return new Promise<{ name: string, base64: string, mimeType: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              name: file.name,
              base64: event.target?.result as string,
              mimeType: file.type || 'image/jpeg',
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
      subjectName: e.subjectName || 'Exam',
      date: e.date,
      syllabus: e.syllabus || '',
      room: e.room || '',
      durationMinutes: e.durationMinutes || undefined,
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
      title="Import Exam Timetable"
      description="Upload a photo or PDF and we'll extract exam dates and syllabus."
      maxWidth={step === 'review' ? '4xl' : 'md'}
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && (
        <div className="flex flex-col text-center">
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center rounded-none border-2 border-dashed border-black/15 dark:border-white/[0.1] bg-[#F7F7F5]/50 dark:bg-white/[0.02] hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-all cursor-pointer mb-5">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-6 h-6 mb-3 text-black dark:text-[#F4F4F6]" />
            <h3 className="text-[15px] font-bold text-black dark:text-[#F4F4F6] mb-1">
              Choose an exam schedule file
            </h3>
            <p className="text-[13px] text-black/60 dark:text-[#94A3B8] mb-4">
              Photo or PDF
            </p>
            
            <div className="px-6 h-[40px] flex items-center justify-center bg-black text-white dark:bg-white dark:text-black font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-3 shadow-sm">
              Choose file
            </div>

            <div className="text-[11px] text-black/40 dark:text-[#64748B] font-medium tracking-[0.5px] uppercase">
              JPG · PNG · PDF
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-black/40 dark:text-white/30 tracking-[2px] uppercase mb-4">
            <span className="flex-1 h-px bg-black/10 dark:bg-white/[0.06]" />
            OR TRY SAMPLE
            <span className="flex-1 h-px bg-black/10 dark:bg-white/[0.06]" />
          </div>

          <button 
            type="button"
            onClick={() => runExtraction('Exam_Schedule_2024.pdf')}
            className="flex items-center justify-between px-4 w-full h-[44px] rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] hover:border-black/20 dark:hover:border-white/[0.14] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-black/70 dark:text-[#94A3B8]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Use sample schedule
            </div>
            <span className="text-black/60 dark:text-[#94A3B8] text-[14px]">→</span>
          </button>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center w-full">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[#F7F7F5] dark:bg-[#121317] border border-black/10 dark:border-white/[0.08] flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-black dark:text-[#F4F4F6] animate-pulse" />
              <Sparkles className="w-6 h-6 absolute top-1 right-0 text-amber-500 animate-bounce" />
            </div>
          </div>
          
          <h4 className="text-[18px] font-bold text-black dark:text-[#F4F4F6]">
            Analyzing your schedule...
          </h4>
          <p className="text-[14px] text-black/60 dark:text-[#94A3B8] mt-1 mb-8 max-w-[280px]">
            Reading exam dates, times and syllabus.
          </p>

          <div className="flex items-center gap-3 w-full max-w-[280px] mx-auto mb-10">
            <div className="flex-1 h-2 bg-black/10 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 15, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[#F7F7F5] dark:bg-[#121317] text-left border border-black/10 dark:border-white/[0.08] w-full max-w-[320px] rounded-none shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-black dark:text-[#F4F4F6]">AI is working...</span>
              <span className="text-[13px] text-black/60 dark:text-[#94A3B8] mt-0.5">This usually takes 10–20 seconds.</span>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold tracking-[0.2em] text-black/50 dark:text-white/40 uppercase">Extracted Exams</span>
              
              <div className="flex flex-col gap-4">
                {extractedExams.map((event, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5]/50 dark:bg-[#121317] relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-none bg-white dark:bg-[#181A20] border border-black/10 dark:border-white/[0.1] flex items-center justify-center text-black/60 dark:text-[#94A3B8] hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Subject</label>
                        <input
                          type="text"
                          value={event.subjectName}
                          onChange={(e) => updateExtractedRow(index, { subjectName: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Date & Time</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={event.date}
                            onChange={(e) => updateExtractedRow(index, { date: e.target.value })}
                            className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                          />
                          <input
                            type="text"
                            value={event.time}
                            onChange={(e) => updateExtractedRow(index, { time: e.target.value })}
                            className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Syllabus (Optional)</label>
                        <input
                          type="text"
                          value={event.syllabus || ''}
                          onChange={(e) => updateExtractedRow(index, { syllabus: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="flex items-center justify-center h-[44px] rounded-none border border-dashed border-black/15 dark:border-white/[0.1] text-[13px] font-bold text-black dark:text-[#F4F4F6] bg-[#F7F7F5] dark:bg-[#121317] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Exam
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-black/10 dark:border-white/[0.08]">
              <button 
                type="button" 
                onClick={() => {
                  setStep('upload');
                  setExtractedExams([]);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-none text-[13px] font-bold uppercase text-black/70 dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Scan Another
              </button>
              <button 
                type="button" 
                onClick={handleSaveConfirmed}
                className="w-full sm:w-auto px-6 py-2.5 rounded-none bg-black text-white dark:bg-white dark:text-black text-[13px] font-bold uppercase hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
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
