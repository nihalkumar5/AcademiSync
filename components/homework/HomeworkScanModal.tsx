'use client';
import { AiScanning, AiUploadPanel } from '@/components/ai/AiScan';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { HomeworkPriority } from '@/lib/types';
import { AiUploadError, prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
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
  const [scanFiles, setScanFiles] = useState<File[]>([]);
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

  const runScan = async (name: string, images: { name: string; base64: string; mimeType: string }[]) => {
    setFileName(name);
    setStep('scanning');

    try {
      const res = await fetch('/api/extract-homework', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          fileName: name,
          images,
          subjects: subjects.map((s) => s.name).filter(Boolean).slice(0, 40),
          userId: user?.id || (user as any)?.uid || null,
        }),
      });

      const data = await readAiResponse(res);
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

  // Every page goes to the AI, shrunk on the phone
  const startScan = (files: File[]) => {
    setScanFiles(files);
    prepareAiUpload(files, { maxDim: 2000, maxFiles: 5 })
      .then((images) => runScan(files.length === 1 ? files[0].name : `${files.length} pages`, images))
      .catch((err) => showToast("Can't send this file", err instanceof AiUploadError ? err.message : 'Could not read the file. Try again.', 'error'));
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
      title="Scan assignment"
      description={step === 'review' ? 'Check what we found, then save.' : undefined}
      maxWidth="md"
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && <AiUploadPanel kind="assignment" maxFiles={5} onScan={startScan} />}

      {step === 'scanning' && <AiScanning kind="assignment" files={scanFiles} />}

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
