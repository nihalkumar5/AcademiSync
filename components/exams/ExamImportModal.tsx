'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Bot, X, Sparkles, Check, Trash2, Plus } from 'lucide-react';
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
            date: '2024-11-15',
            time: '10:00 AM - 1:00 PM',
            syllabus: 'Trees, Graphs, DP, Sorting',
            durationMinutes: 180
          },
          {
            subjectName: 'Computer Networks',
            date: '2024-11-18',
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
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center border border-dashed border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer mb-5">
            <input
              type="file"
              accept="image/*,.pdf" multiple
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-5 h-5 mb-3 text-[#111111] dark:text-[#FFFFFF]" />
            <h3 className="text-[15px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1">
              Choose exam timetable file
            </h3>
            <p className="text-[13px] text-[#6F6F6F] mb-4">
              Photo or PDF
            </p>
            
            <div className="px-6 h-[44px] flex items-center justify-center bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-3">
              Choose file
            </div>

            <div className="text-[11px] text-[#999999] font-medium tracking-[0.5px] uppercase">
              JPG · PNG · PDF
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-[#A0A0A0] tracking-[2px] uppercase mb-4">
            <span className="flex-1 h-px bg-[#EAEAEA] dark:bg-[#222222]" />
            OR TRY SAMPLE
            <span className="flex-1 h-px bg-[#EAEAEA] dark:bg-[#222222]" />
          </div>

          <button 
            type="button"
            onClick={() => runExtraction('Exam_Schedule_2024.pdf')}
            className="flex items-center justify-between px-4 w-full h-[40px] border border-[#EAEAEA] dark:border-[#222222] hover:border-[#D9D9D6] dark:hover:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#6F6F6F] dark:text-[#999999]">
              <Sparkles className="w-3.5 h-3.5" />
              Use sample schedule
            </div>
            <span className="text-[#6F6F6F] dark:text-[#999999] text-[14px]">→</span>
          </button>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center w-full">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[#F7F7F5] dark:bg-[#1A1A1A] flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-[#111111] dark:text-[#FFFFFF] animate-pulse" />
              <Sparkles className="w-6 h-6 absolute top-1 right-0 text-[#111111] dark:text-[#FFFFFF] animate-bounce" />
            </div>
          </div>
          
          <h4 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF]">
            Analyzing your schedule...
          </h4>
          <p className="text-[14px] text-[#6F6F6F] mt-1 mb-8 max-w-[280px]">
            Reading exam dates, times and syllabus.
          </p>

          <div className="flex items-center gap-3 w-full max-w-[280px] mx-auto mb-10">
            <div className="flex-1 h-3 bg-[#EAEAEA] dark:bg-[#333333] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#111111] dark:bg-[#FFFFFF]"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 15, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[#F7F7F5] dark:bg-[#1A1A1A] text-left border border-[#D9D9D6] dark:border-[#333333] w-full max-w-[320px] rounded-none">
            <Sparkles className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">AI is working...</span>
              <span className="text-[13px] text-[#6F6F6F] mt-0.5">This usually takes 10–20 seconds.</span>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">Extracted Exams</span>
              
              <div className="flex flex-col gap-4">
                {extractedExams.map((event, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 border border-[#D9D9D6] dark:border-[#333333] relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] flex items-center justify-center text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Subject</label>
                        <input
                          type="text"
                          value={event.subjectName}
                          onChange={(e) => updateExtractedRow(index, { subjectName: e.target.value })}
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Date & Time</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={event.date}
                            onChange={(e) => updateExtractedRow(index, { date: e.target.value })}
                            className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                          />
                          <input
                            type="text"
                            value={event.time}
                            onChange={(e) => updateExtractedRow(index, { time: e.target.value })}
                            className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Syllabus (Optional)</label>
                        <input
                          type="text"
                          value={event.syllabus || ''}
                          onChange={(e) => updateExtractedRow(index, { syllabus: e.target.value })}
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="flex items-center justify-center h-[40px] border border-dashed border-[#D9D9D6] dark:border-[#333333] text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors gap-2 rounded-none"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Exam
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-[#D9D9D6] dark:border-[#333333]">
              <button 
                type="button" 
                onClick={() => {
                  setStep('upload');
                  setExtractedExams([]);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-bold uppercase text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Scan Another
              </button>
              <button 
                type="button"
                onClick={handleSaveConfirmed}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase hover:opacity-90 transition-opacity"
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
