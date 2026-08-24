'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AcademicEvent, CalendarEventType } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Sparkles, Check, Trash2, CalendarDays } from 'lucide-react';

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
    const todayStr = new Date().toISOString().split('T')[0];
    setExtractedEvents((prev) => [
      {
        title: 'New Academic Event',
        date: todayStr,
        startDate: todayStr,
        endDate: todayStr,
        type: 'event',
      },
      ...prev,
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
          title: ev.title,
          type: ev.type,
          date: dateVal,
          description: ev.description,
          location: ev.location,
        });
      } else {
        // Range: generate events day-by-day
        let current = new Date(start);
        while (current.getTime() <= end.getTime()) {
          const dateStr = current.toISOString().split('T')[0];
          expandedEvents.push({
            title: ev.title,
            type: ev.type,
            date: dateStr,
            description: ev.description,
            location: ev.location,
          });
          current.setDate(current.getDate() + 1);
        }
      }
    });

    addEvents(expandedEvents);

    showToast('Calendar Imported', `${expandedEvents.length} academic events added to your planner`, 'success');
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Academic Calendar via AI"
      description="Upload your institute academic calendar photo or PDF to extract exam dates, holidays, and events."
      maxWidth={step === 'review' ? '4xl' : 'lg'}
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
                Upload Academic Calendar Document
              </h3>
              <p className="text-sm text-black/60 dark:text-white/60 max-w-[280px] mx-auto leading-relaxed">
                Powered by Gemini Vision OCR. Drop your official academic calendar to auto-extract holidays and exams.
              </p>

              <div className="mt-6 pointer-events-none">
                <Button variant="primary" type="button" className="rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)]">
                  Choose Files
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-bold text-black/40 dark:text-white/40 tracking-widest uppercase">
            <span className="w-12 h-px bg-black/10 dark:bg-white/10" />
            Or Try Sample
            <span className="w-12 h-px bg-black/10 dark:bg-white/10" />
          </div>

          <Button
            variant="outline"
            type="button"
            onClick={() => runExtraction('IIITNR_Academic_Calendar_2026.pdf')}
            className="rounded-none border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black gap-2 w-full justify-center"
          >
            <Sparkles className="w-4 h-4" />
            Scan Sample IIIT-NR Academic Calendar
          </Button>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse mb-4 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            Extracting Academic Calendar Events via AI...
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Analyzing {fileName || 'document'} for exam schedules, holidays, and semester deadlines.
          </p>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Review Extracted Events:</strong> AI extracted {extractedEvents.length} calendar events. Verify details before saving.
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-zinc-700">
                <tr>
                  <th className="p-3">Date / Range</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Location / Notes</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {extractedEvents.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="p-2.5">
                      <div className="flex flex-col gap-1 min-w-[125px]">
                        <input
                          type="date"
                          value={item.startDate || item.date}
                          onChange={(e) => updateExtractedRow(idx, { startDate: e.target.value })}
                          className="bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs w-full"
                        />
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 text-center font-bold block leading-none">to</span>
                        <input
                          type="date"
                          value={item.endDate || item.date || item.startDate}
                          onChange={(e) => updateExtractedRow(idx, { endDate: e.target.value })}
                          className="bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs w-full"
                        />
                      </div>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateExtractedRow(idx, { title: e.target.value })}
                        className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 font-medium"
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={item.type}
                        onChange={(e) => updateExtractedRow(idx, { type: e.target.value as CalendarEventType })}
                        className="bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="exam">Exam</option>
                        <option value="holiday">Holiday</option>
                        <option value="event">Event</option>
                        <option value="assignment">Assignment</option>
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.location || item.description || ''}
                        placeholder="Location or description"
                        onChange={(e) => updateExtractedRow(idx, { description: e.target.value })}
                        className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeExtractedRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="Delete event"
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
            <Button type="button" variant="outline" size="sm" onClick={addExtractedRow} className="gap-1 rounded-xl">
              <CalendarDays className="w-3.5 h-3.5" />
              Add Event Row
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetState}>
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleSaveConfirmed} className="gap-1.5 rounded-xl bg-[#8C6B5D] hover:bg-[#7B5B4D] text-white">
                <Check className="w-4 h-4" />
                Confirm & Save Calendar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
