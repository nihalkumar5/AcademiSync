'use client';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicEvent, CalendarEventType } from '@/lib/types';
import { getLocalDateString, getTodayDateString } from '@/lib/timetableUtils';
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
      // Enforce 3MB limit to prevent 413 Payload Too Large on base64 upload
      const MAX_SIZE_MB = 3;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      const oversizedFile = files.find((file) => file.size > MAX_SIZE_BYTES);

      if (oversizedFile) {
        showToast(
          'File Too Large',
          `"${oversizedFile.name}" exceeds the ${MAX_SIZE_MB}MB size limit. Please upload a smaller image or compressed PDF.`,
          'error'
        );
        e.target.value = ''; // Reset file input
        return;
      }

      const readers = files.map((file) => {
        return new Promise<{ name: string; base64: string; mimeType: string }>((resolve) => {
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
          <div className="relative group w-full h-[220px] sm:h-[240px] flex flex-col items-center justify-center border border-dashed border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer mb-5">
            <input
              type="file"
              accept="image/*,.pdf" multiple
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-5 h-5 mb-3 text-[#111111] dark:text-[#FFFFFF]" />
            <h3 className="text-[15px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1">
              Choose a calendar file
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
            onClick={() => runExtraction('Academic_Calendar_2024.pdf')}
            className="flex items-center justify-between px-4 w-full h-[40px] border border-[#EAEAEA] dark:border-[#222222] hover:border-[#D9D9D6] dark:hover:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#6F6F6F] dark:text-[#999999]">
              <Sparkles className="w-3.5 h-3.5" />
              Use sample calendar
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
            Analyzing your calendar...
          </h4>
          <p className="text-[14px] text-[#6F6F6F] mt-1 mb-8 max-w-[280px]">
            Reading holidays, exam dates and important events.
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
              <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">Extracted Events</span>
              
              <div className="flex flex-col gap-4">
                {extractedEvents.map((event, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 border border-[#D9D9D6] dark:border-[#333333] relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] flex items-center justify-center text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Event Title</label>
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => updateExtractedRow(index, { title: e.target.value })}
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Type</label>
                        <div className="relative">
                          <select
                            value={event.type}
                            onChange={(e) => updateExtractedRow(index, { type: e.target.value as any })}
                            className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors appearance-none"
                          >
                            <option value="exam" className="dark:bg-[#111111]">Exam</option>
                            <option value="holiday" className="dark:bg-[#111111]">Holiday</option>
                            <option value="assignment" className="dark:bg-[#111111]">Deadline</option>
                            <option value="event" className="dark:bg-[#111111]">Event</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Date</label>
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateExtractedRow(index, { date: e.target.value })}
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Location / Info</label>
                        <input
                          type="text"
                          value={event.location || ''}
                          onChange={(e) => updateExtractedRow(index, { location: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors placeholder:text-[#6F6F6F]/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="w-full flex items-center justify-center gap-2 py-2 h-[44px] text-[12px] font-bold uppercase text-[#111111] dark:text-[#FFFFFF] border border-[#D9D9D6] dark:border-[#333333] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
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
              type="button"
              onClick={handleSaveConfirmed}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase hover:opacity-90 transition-opacity"
            >
              Save to Calendar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
