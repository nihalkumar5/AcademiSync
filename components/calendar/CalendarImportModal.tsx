'use client';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicEvent, CalendarEventType } from '@/lib/types';
import { getLocalDateString, getTodayDateString } from '@/lib/timetableUtils';
import { validateUploadedFile } from '@/lib/fileSafety';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {  Upload, Sparkles, Check, Trash2, CalendarDays , Bot, Plus , X, ChevronDown} from 'lucide-react';

export interface CalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarImportModal: React.FC<CalendarImportModalProps> = ({ isOpen, onClose }) => {
  const { addEvent, addEvents, showToast } = useApp();

  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>('upload');
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

  const runExtraction = async (filesInfo: string | { name: string; base64: string; mimeType: string }[]) => {
    const isString = typeof filesInfo === 'string';
    setFileName(isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files`));
    setStep('extracting');

    try {
      const res = await fetch('/api/extract-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files'),
          images: isString ? [] : filesInfo,
          isSample: isString,
        }),
      });

      if (!res.ok) {
        let errMsg = 'Server error during extraction';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          const text = await res.text();
          errMsg = text.substring(0, 100) || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setExtractedEvents(data.events);
        setStep('review');
      } else {
        throw new Error(data.error || 'No events extracted');
      }
    } catch (error: any) {
      console.warn('Calendar OCR API error:', error);
      if (isString) {
        // Fallback for sample run
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = String(today.getMonth() + 1).padStart(2, '0');

        setExtractedEvents([
          {
            title: 'Mid-Semester Examinations',
            date: `${curYear}-${curMonth}-15`,
            type: 'exam',
            description: 'Mid-term theory exams',
            location: 'LT-1 & LT-2',
          },
          {
            title: 'Institute Foundation Day',
            date: `${curYear}-${curMonth}-22`,
            type: 'holiday',
            description: 'Classes suspended',
          },
          {
            title: 'Major Assignment Submission',
            date: `${curYear}-${curMonth}-28`,
            type: 'assignment',
            description: 'Submit project report to course coordinator',
          },
        ]);
        setStep('review');
      } else {
        // Show toast alert on user upload error and return to upload step
        showToast(
          'Extraction Failed',
          error.message || 'Could not parse the academic calendar. Please ensure the file is an image or PDF under 3MB.',
          'error'
        );
        setStep('upload');
      }
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
        return new Promise<{ name: string; base64: string; mimeType: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              name: file.name,
              base64: event.target?.result as string,
              mimeType: file.type || 'application/pdf',
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
        location: '',
      }
    ]);
  };

  const handleSaveConfirmed = () => {
    const expandedEvents: Omit<AcademicEvent, 'id'>[] = [];

    extractedEvents.forEach((ev) => {
      const dateVal = ev.startDate || ev.date;
      const start = new Date(dateVal);
      const endVal = ev.endDate || ev.date || dateVal;
      const end = new Date(endVal);

      if (isNaN(start.getTime())) return;

      if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        expandedEvents.push({
          title: ev.title || 'Event',
          type: ev.type || 'event',
          date: dateVal,
          description: ev.description || '',
          location: ev.location || '',
        });
      } else {
        // Range: generate events day-by-day
        let current = new Date(start);
        while (current.getTime() <= end.getTime()) {
          const dateStr = getLocalDateString(current);
          expandedEvents.push({
            title: ev.title || 'Event',
            type: ev.type || 'event',
            date: dateStr,
            description: ev.description || '',
            location: ev.location || '',
          });
          current.setDate(current.getDate() + 1);
        }
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
      title="Import Calendar"
      description="Upload a photo or PDF and we'll extract key dates and events."
      maxWidth={step === 'review' ? '4xl' : 'md'}
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && (
        <div className="flex flex-col text-center">
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/15 dark:border-white/[0.1] bg-[#F7F7F5]/50 dark:bg-white/[0.02] hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-all cursor-pointer mb-5">
            <input
              type="file"
              accept="image/*,.pdf" multiple
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-6 h-6 mb-3 text-black dark:text-[#F4F4F6]" />
            <h3 className="text-[15px] font-bold text-black dark:text-[#F4F4F6] mb-1">
              Choose a calendar file
            </h3>
            <p className="text-[13px] text-black/60 dark:text-[#94A3B8] mb-4">
              Photo or PDF
            </p>
            
            <div className="px-6 h-[40px] flex items-center justify-center bg-black text-white dark:bg-white dark:text-black font-bold text-[13px] pointer-events-none rounded-xl w-fit mx-auto mb-3 shadow-sm">
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
            onClick={() => runExtraction('Academic_Calendar_2024.pdf')}
            className="flex items-center justify-between px-4 w-full h-[44px] rounded-xl border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] hover:border-black/20 dark:hover:border-white/[0.14] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-black/70 dark:text-[#94A3B8]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Use sample calendar
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
            Analyzing your calendar...
          </h4>
          <p className="text-[14px] text-black/60 dark:text-[#94A3B8] mt-1 mb-8 max-w-[280px]">
            Reading holidays, exam dates and important events.
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

          <div className="flex items-start gap-3 p-4 bg-[#F7F7F5] dark:bg-[#121317] text-left border border-black/10 dark:border-white/[0.08] w-full max-w-[320px] rounded-xl shadow-sm">
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
              <span className="text-[11px] font-bold tracking-[0.2em] text-black/50 dark:text-white/40 uppercase">Extracted Events</span>
              
              <div className="flex flex-col gap-4">
                {extractedEvents.map((event, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 rounded-xl border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5]/50 dark:bg-[#121317] relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-[#181A20] border border-black/10 dark:border-white/[0.1] flex items-center justify-center text-black/60 dark:text-[#94A3B8] hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Event Title</label>
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => updateExtractedRow(index, { title: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-lg bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Type</label>
                        <div className="relative">
                          <select
                            value={event.type}
                            onChange={(e) => updateExtractedRow(index, { type: e.target.value as any })}
                            className="w-full px-3 py-1.5 h-[38px] rounded-lg bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors appearance-none"
                          >
                            <option value="exam" className="dark:bg-[#121317]">Exam</option>
                            <option value="holiday" className="dark:bg-[#121317]">Holiday</option>
                            <option value="assignment" className="dark:bg-[#121317]">Deadline</option>
                            <option value="event" className="dark:bg-[#121317]">Event</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Date</label>
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateExtractedRow(index, { date: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-lg bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Location / Info</label>
                        <input
                          type="text"
                          value={event.location || ''}
                          onChange={(e) => updateExtractedRow(index, { location: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-3 py-1.5 h-[38px] rounded-lg bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors placeholder:text-black/30 dark:placeholder:text-[#64748B]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="w-full flex items-center justify-center gap-2 py-2 h-[44px] text-[12px] font-bold uppercase text-black dark:text-[#F4F4F6] rounded-xl border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-black/10 dark:border-white/[0.08]">
            <button 
              type="button" 
              onClick={resetState}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-[13px] font-bold uppercase text-black/70 dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Scan Another
            </button>
            <button 
              type="button"
              onClick={handleSaveConfirmed}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-[13px] font-bold uppercase hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              Save to Calendar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
