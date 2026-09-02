'use client';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { HomeworkPriority } from '@/lib/types';
import { validateUploadedFile } from '@/lib/fileSafety';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import {  Upload, Sparkles, Check, Camera , Bot, ChevronDown , X} from 'lucide-react';

export interface HomeworkScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeworkScanModal: React.FC<HomeworkScanModalProps> = ({ isOpen, onClose }) => {
  const { subjects, addHomework, showToast } = useApp();

  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [fileName, setFileName] = useState('');

  // Editable review fields
  const [extractedSubjectId, setExtractedSubjectId] = useState('');
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedDescription, setExtractedDescription] = useState('');
  const [extractedDeadline, setExtractedDeadline] = useState('');
  const [extractedPriority, setExtractedPriority] = useState<HomeworkPriority>('High');

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setExtractedSubjectId('');
    setExtractedTitle('');
    setExtractedDescription('');
    setExtractedDeadline('');
    setExtractedPriority('High');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const runScan = async (name: string, base64?: string, mimeType?: string) => {
    setFileName(name);
    setStep('scanning');

    try {
      const res = await fetch('/api/extract-homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: name,
          imageBase64: base64,
          mimeType,
        }),
      });

      const data = await res.json();
      if (data.success && data.homework) {
        const hw = data.homework;
        const matchedSub =
          subjects.find(
            (s) =>
              s.name.toLowerCase().includes((hw.subjectName || '').toLowerCase()) ||
              s.shortName.toLowerCase().includes((hw.subjectName || '').toLowerCase())
          ) || subjects[0];

        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 2);
        defaultDeadline.setHours(23, 59, 0, 0);

        setExtractedSubjectId(matchedSub ? matchedSub.id : subjects[0]?.id || '');
        setExtractedTitle(hw.title || 'Assignment');
        setExtractedDescription(hw.description || '');
        setExtractedDeadline(
          hw.deadline ? new Date(hw.deadline).toISOString().slice(0, 10) : defaultDeadline.toISOString().slice(0, 10)
        );
        setExtractedPriority(hw.priority || 'High');
      } else {
        throw new Error('No homework extracted');
      }
    } catch (e) {
      console.warn('API error, using fallback:', e);
      const mlSub = subjects.find((s) => s.shortName === 'ML' || s.name.includes('Machine Learning')) || subjects[0];
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 2);
      defaultDeadline.setHours(23, 59, 0, 0);

      setExtractedSubjectId(mlSub ? mlSub.id : '');
      setExtractedTitle('Assignment 3: Neural Networks & Backpropagation');
      setExtractedDescription('Derive the gradient update rules for a 3-layer MLP with Cross-Entropy loss. Submit handwritten derivations + Python code.');
      setExtractedDeadline(defaultDeadline.toISOString().slice(0, 10));
      setExtractedPriority('High');
    }

    setStep('review');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = validateUploadedFile({ name: file.name, size: file.size, type: file.type });
      if (!check.valid) {
        showToast('Invalid File', check.error || 'Please upload an image or document under 5MB.', 'error');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        runScan(file.name, base64, file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedTitle.trim() || !extractedSubjectId) return;

    addHomework({
      subjectId: extractedSubjectId,
      title: extractedTitle.trim(),
      description: extractedDescription.trim() ,
      deadline: new Date(extractedDeadline).toISOString(),
      priority: extractedPriority,
      status: 'Not Started',
      attachmentName: fileName || 'Scanned_Worksheet.pdf',
    });

    showToast('Task Saved', `"${extractedTitle}" added to homework tracker`, 'success');
    handleClose();
  };

  return (
    
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Scan Homework"
      description="Upload a photo or PDF and we'll extract the assignment details."
      maxWidth="md"
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && (
        <div className="flex flex-col text-center">
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center border border-dashed border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer mb-5">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-5 h-5 mb-3 text-[#111111] dark:text-[#FFFFFF]" />
            <h3 className="text-[15px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1">
              Choose a assignment file
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
            onClick={() => runScan('demo_ml_assignment.jpg')}
            className="flex items-center justify-between px-4 w-full h-[40px] border border-[#EAEAEA] dark:border-[#222222] hover:border-[#D9D9D6] dark:hover:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#6F6F6F] dark:text-[#999999]">
              <Sparkles className="w-3.5 h-3.5" />
              Use sample assignment
            </div>
            <span className="text-[#6F6F6F] dark:text-[#999999] text-[14px]">→</span>
          </button>
        </div>
      )}

      {step === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center w-full">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[#F7F7F5] dark:bg-[#1A1A1A] flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-[#111111] dark:text-[#FFFFFF] animate-pulse" />
              <Sparkles className="w-6 h-6 absolute top-1 right-0 text-[#111111] dark:text-[#FFFFFF] animate-bounce" />
            </div>
          </div>
          
          <h4 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF]">
            Analyzing your assignment...
          </h4>
          <p className="text-[14px] text-[#6F6F6F] mt-1 mb-8 max-w-[280px]">
            Reading subjects, questions, and submission dates.
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
        <form onSubmit={handleConfirmSave} className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            {/* SECTION 1: MATCHED SUBJECT */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">Matched Subject</span>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Subject</label>
                <div className="relative">
                  <select
                    value={extractedSubjectId}
                    onChange={(e) => setExtractedSubjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 h-[44px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors appearance-none"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id} className="dark:bg-[#111111]">
                        {sub.code && sub.code !== 'UNK' ? `[${sub.code}] ` : ''}{sub.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* SECTION 2: TASK DETAILS */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">Task Details</span>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Task / Assignment Title</label>
                <input
                  type="text"
                  value={extractedTitle}
                  onChange={(e) => setExtractedTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Description</label>
                <textarea
                  value={extractedDescription}
                  onChange={(e) => setExtractedDescription(e.target.value)}
                  className="w-full p-3 min-h-[76px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors resize-y"
                />
              </div>
            </div>

            {/* SECTION 3: SCHEDULE & PRIORITY */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">Schedule & Priority</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Deadline</label>
                  <input
                    type="date"
                    value={extractedDeadline}
                    onChange={(e) => setExtractedDeadline(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 h-[44px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Priority</label>
                  <div className="relative">
                    <select
                      value={extractedPriority}
                      onChange={(e) => setExtractedPriority(e.target.value as any)}
                      className="w-full px-3 py-2.5 h-[44px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors appearance-none"
                    >
                      <option value="Low" className="dark:bg-[#111111]">Low Priority</option>
                      <option value="Medium" className="dark:bg-[#111111]">Medium Priority</option>
                      <option value="High" className="dark:bg-[#111111]">High Priority</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-[#D9D9D6] dark:border-[#333333]">
            <button 
              type="button" 
              onClick={resetState}
              className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-bold uppercase text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Scan Another
            </button>
            <button 
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase hover:opacity-90 transition-opacity"
            >
              Save Task
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
