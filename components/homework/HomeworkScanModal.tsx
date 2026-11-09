'use client';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { HomeworkPriority } from '@/lib/types';
import { validateUploadedFile } from '@/lib/fileSafety';
import { getAuthHeaders } from '@/lib/authHeaders';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import {  Upload, Sparkles, Check, Camera , Bot, ChevronDown , X} from '@/components/ui/icons';

export interface HomeworkScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeworkScanModal: React.FC<HomeworkScanModalProps> = ({ isOpen, onClose }) => {
  const { subjects, addHomework, showToast, user } = useApp();

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
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          fileName: name,
          imageBase64: base64,
          mimeType,
          userId: user?.id || (user as any)?.uid || null,
        }),
      });

      const data = await res.json();
      if (res.status === 429) {
        showToast('Scan Limit', data.error || 'Please wait a few minutes before scanning again.', 'error');
        resetState();
        return;
      }

      if (data.success && data.homework) {
        const hw = data.homework;
        const hwSubName = (hw.subjectName || '').toLowerCase().trim();
        const matchedSub = subjects.find(
          (s) =>
            (s.name && s.name.toLowerCase().includes(hwSubName)) ||
            (s.shortName && s.shortName.toLowerCase().includes(hwSubName)) ||
            (s.code && s.code.toLowerCase().includes(hwSubName))
        );

        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 2);
        defaultDeadline.setHours(23, 59, 0, 0);

        setExtractedSubjectId(matchedSub ? matchedSub.id : (subjects[0]?.id || ''));
        setExtractedTitle(hw.title || '');
        setExtractedDescription(hw.description || '');
        setExtractedDeadline(
          hw.deadline && !isNaN(new Date(hw.deadline).getTime())
            ? new Date(hw.deadline).toISOString().slice(0, 10)
            : defaultDeadline.toISOString().slice(0, 10)
        );
        setExtractedPriority(hw.priority || 'High');
        showToast('Extracted with AI', 'Assignment details parsed successfully.', 'success');
      } else {
        throw new Error(data.error || 'Could not parse document details');
      }
    } catch (e: any) {
      console.warn('API extraction error:', e);
      showToast('Manual Review', 'Could not auto-extract details. Please verify the fields.', 'info');
      
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 2);
      defaultDeadline.setHours(23, 59, 0, 0);

      setExtractedSubjectId(subjects[0]?.id || '');
      setExtractedTitle(name ? name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : '');
      setExtractedDescription('');
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
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center rounded-none border-2 border-dashed border-line bg-surface-2 hover:bg-surface-2 transition-all cursor-pointer mb-5">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-6 h-6 mb-3 text-fg" />
            <h3 className="text-[15px] font-bold text-fg mb-1">
              Choose an assignment file
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

      {step === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center w-full">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-surface-2 border border-line flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-fg animate-pulse" />
              <Sparkles className="w-6 h-6 absolute top-1 right-0 text-amber-500 animate-bounce" />
            </div>
          </div>
          
          <div className="w-full max-w-[280px] flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between text-[12px] font-bold text-black/60 dark:text-white/40">
              <span>Scanning with Gemini</span>
              <span className="font-mono">AI AUTO-PARSE</span>
            </div>
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
              <span className="text-[14px] font-bold text-fg">AI is reading assignment...</span>
              <span className="text-[13px] text-muted mt-0.5">Detecting subject, deadline, priority, and problem details.</span>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <form onSubmit={handleConfirmSave} className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            {/* SECTION 1: SUBJECT */}
            <div className="flex flex-col gap-3">
              <span className="section-label">Subject</span>
              <div className="flex flex-col gap-1.5">
                <div className="relative">
                  <select
                    value={extractedSubjectId}
                    onChange={(e) => setExtractedSubjectId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 h-[44px] rounded-none bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-line-strong transition-colors appearance-none shadow-sm"
                  >
                    <option value="" disabled className="dark:bg-[#121317]">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id} className="dark:bg-[#121317]">
                        {sub.code && sub.code !== 'UNK' ? `[${sub.code}] ` : ''}{sub.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* SECTION 2: TASK DETAILS */}
            <div className="flex flex-col gap-3">
              <span className="section-label">Task Details</span>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted ">Task / Assignment Title</label>
                <input
                  type="text"
                  value={extractedTitle}
                  onChange={(e) => setExtractedTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-none bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-line-strong transition-colors shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted ">Description</label>
                <textarea
                  value={extractedDescription}
                  onChange={(e) => setExtractedDescription(e.target.value)}
                  className="w-full p-3.5 rounded-none min-h-[80px] bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-line-strong transition-colors resize-y shadow-sm"
                />
              </div>
            </div>

            {/* SECTION 3: SCHEDULE & PRIORITY */}
            <div className="flex flex-col gap-3">
              <span className="section-label">Schedule & Priority</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted ">Deadline</label>
                  <input
                    type="date"
                    value={extractedDeadline}
                    onChange={(e) => setExtractedDeadline(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 h-[44px] rounded-none bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-line-strong transition-colors shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted ">Priority</label>
                  <div className="relative">
                    <select
                      value={extractedPriority}
                      onChange={(e) => setExtractedPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 h-[44px] rounded-none bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-line-strong transition-colors appearance-none shadow-sm"
                    >
                      <option value="Low" className="dark:bg-[#121317]">Low Priority</option>
                      <option value="Medium" className="dark:bg-[#121317]">Medium Priority</option>
                      <option value="High" className="dark:bg-[#121317]">High Priority</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-line">
            <button 
              type="button" 
              onClick={resetState}
              className="w-full sm:w-auto px-4 h-11 rounded-none text-[14px] font-semibold text-muted hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Scan Another
            </button>
            <button 
              type="submit"
              className="w-full sm:w-auto px-6 h-11 rounded-none bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
