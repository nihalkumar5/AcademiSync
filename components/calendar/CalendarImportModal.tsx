'use client';
import { AiScanning, AiUploadPanel } from '@/components/ai/AiScan';
import { AiUploadError, prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicEvent, CalendarEventType } from '@/lib/types';
import { getLocalDateString, getTodayDateString } from '@/lib/timetableUtils';
import { getAuthHeaders } from '@/lib/authHeaders';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {  Upload, Sparkles, Check, Trash2, CalendarDays , Bot, Plus , X, ChevronDown} from '@/components/ui/icons';

export interface CalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarImportModal: React.FC<CalendarImportModalProps> = ({ isOpen, onClose }) => {
  const { addEvent, addEvents, showToast, user } = useApp();

  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>('upload');
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [fileName, setFileName] = useState('');
  const [extractedEvents, setExtractedEvents] = useState<(Omit<AcademicEvent, 'id'> & { startDate?: string; endDate?: string })[]>([]);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setExtractedEvents([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const runExtraction = async (filesInfo: { name: string; base64: string; mimeType: string }[]) => {
    setFileName(filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files`);
    setStep('extracting');

    try {
      const res = await fetch('/api/extract-calendar', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          fileName: filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files',
          images: filesInfo,
          userId: user?.id || (user as any)?.uid || null,
        }),
      });

      if (!res.ok) {
        const errData = await readAiResponse(res);
        if (res.status === 429) {
          showToast('Scan Limit', errData.error, 'error');
          resetState();
          return;
        }
        throw new Error(errData.error);
      }

      const data = await readAiResponse(res);
      if (data.success && Array.isArray(data.events) && data.events.length > 0) {
        const normalized = data.events.map((ev: any) => {
          const startStr = ev.startDate || ev.date || getTodayDateString();
          const endStr = ev.endDate || startStr;
          return {
            title: ev.title || 'Event',
            type: (ev.type || 'event') as CalendarEventType,
            date: startStr,
            startDate: startStr,
            endDate: endStr,
            description: ev.description || '',
            location: ev.location || '',
          };
        });
        setExtractedEvents(normalized);
        setStep('review');
      } else {
        throw new Error(data.error || 'No events extracted');
      }
    } catch (error: any) {
      console.warn('Calendar OCR API error:', error);
      showToast(
        'Extraction Failed',
        error.message || 'Could not parse the academic calendar. Please ensure the file is a clear image or PDF under 3MB.',
        'error'
      );
      setStep('upload');
    }
  };

  // Photos are shrunk on the phone; everything together stays under the upload limit
  const startScan = (files: File[]) => {
    setScanFiles(files);
    prepareAiUpload(files, { maxDim: 2000 })
      .then(runExtraction)
      .catch((err) =>
        showToast("Can't send these files", err instanceof AiUploadError ? err.message : 'Could not read the files. Try again.', 'error')
      );
  };

  const updateExtractedRow = (index: number, partial: Partial<Omit<AcademicEvent, 'id'> & { startDate?: string; endDate?: string }>) => {
    setExtractedEvents((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item))
    );
  };

  const removeExtractedRow = (index: number) => {
    setExtractedEvents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addExtractedRow = () => {
    const todayStr = getTodayDateString();
    setExtractedEvents((prev) => [
      ...prev,
      {
        title: '',
        type: 'event',
        date: todayStr,
        startDate: todayStr,
        endDate: todayStr,
        location: '',
      }
    ]);
  };

  const handleSaveConfirmed = () => {
    const expandedEvents: Omit<AcademicEvent, 'id'>[] = [];
    const milestoneRegex = /convocation|commencement|inauguration|orientation|re-opening|foundation|declaration|result|submission|deadline|registration|fee|senate|meeting|alumni/i;

    extractedEvents.forEach((ev) => {
      const startStr = ev.startDate || ev.date || getTodayDateString();
      const endStr = ev.endDate || startStr;

      const start = new Date(startStr);
      const end = new Date(endStr);

      // Single-day event or invalid range
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        expandedEvents.push({
          title: ev.title || 'Event',
          type: ev.type || 'event',
          date: startStr,
          description: ev.description || '',
          location: ev.location || '',
        });
        return;
      }

      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const isMilestone = milestoneRegex.test(ev.title || '');
      const isHoliday = ev.type === 'holiday' || /vacation|recess|break/i.test(ev.title || '');
      const isExam = ev.type === 'exam' || /exam|test|viva/i.test(ev.title || '');

      // Only holidays (up to 2 months, e.g. winter vacation) and exam periods (up to 3 weeks) get one
      // entry per day; that's all Home reacts to. Every other event stays a single entry.
      if (isMilestone || !((isHoliday && diffDays <= 62) || (isExam && diffDays <= 21))) {
        const rangeNote = `(Span: ${startStr} to ${endStr})`;
        const updatedDesc = ev.description ? `${rangeNote} ${ev.description}` : rangeNote;
        expandedEvents.push({
          title: ev.title || 'Event',
          type: ev.type || 'event',
          date: startStr,
          description: updatedDesc,
          location: ev.location || '',
        });
        return;
      }

      // Genuine short multi-day exam or vacation period (<= 14 days)
      let current = new Date(start);
      let safetyCounter = 0;
      while (current.getTime() <= end.getTime() && safetyCounter < 14) {
        const dateStr = getLocalDateString(current);
        expandedEvents.push({
          title: ev.title || 'Event',
          type: ev.type || 'event',
          date: dateStr,
          description: ev.description || '',
          location: ev.location || '',
        });
        current.setDate(current.getDate() + 1);
        safetyCounter++;
      }
    });

    addEvents(expandedEvents, true);

    showToast('Calendar Imported', `${expandedEvents.length} academic events added to your planner`, 'success');
    handleClose();
  };

  return (
    
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import academic calendar"
      description={step === 'review' ? 'Check what we found, then save.' : undefined}
      maxWidth={step === 'review' ? '4xl' : 'md'}
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && <AiUploadPanel kind="calendar" onScan={startScan} />}

      {step === 'extracting' && <AiScanning kind="calendar" files={scanFiles} />}

      {step === 'review' && (
        <div className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="section-label">Extracted Events</span>
              
              <div className="flex flex-col gap-4">
                {extractedEvents.map((event, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 rounded-none border border-line bg-surface-2 relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-none bg-surface border border-line flex items-center justify-center text-muted hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">Event Title</label>
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => updateExtractedRow(index, { title: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">Type</label>
                        <div className="relative">
                          <select
                            value={event.type}
                            onChange={(e) => updateExtractedRow(index, { type: e.target.value as any })}
                            className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors appearance-none"
                          >
                            <option value="exam" className="dark:bg-[#121317]">Exam</option>
                            <option value="holiday" className="dark:bg-[#121317]">Holiday</option>
                            <option value="assignment" className="dark:bg-[#121317]">Deadline</option>
                            <option value="event" className="dark:bg-[#121317]">Event</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">Start Date</label>
                        <input
                          type="date"
                          value={event.startDate || event.date}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const shouldSyncEnd = !event.endDate || event.endDate === (event.startDate || event.date);
                            updateExtractedRow(index, {
                              startDate: newStart,
                              date: newStart,
                              ...(shouldSyncEnd ? { endDate: newStart } : {}),
                            });
                          }}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] font-semibold text-muted ">End Date</label>
                          {event.startDate && event.endDate && event.startDate !== event.endDate && (
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 ">
                              Range
                            </span>
                          )}
                        </div>
                        <input
                          type="date"
                          value={event.endDate || event.startDate || event.date}
                          onChange={(e) => updateExtractedRow(index, { endDate: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">Location / Info</label>
                        <input
                          type="text"
                          value={event.location || ''}
                          onChange={(e) => updateExtractedRow(index, { location: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors placeholder:text-black/30 dark:placeholder:text-[#71717A]"
                        />
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-[11px] text-muted italic line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="w-full flex items-center justify-center gap-2 py-2 h-11 text-[14px] font-semibold text-fg rounded-none border border-line bg-surface-2 hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
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
              type="button" 
              onClick={handleSaveConfirmed}
              className="w-full sm:w-auto px-6 h-11 rounded-none bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              Save to Calendar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
