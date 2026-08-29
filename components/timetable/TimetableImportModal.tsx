'use client';
import { motion } from 'framer-motion';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ExtractedClassSession, DayOfWeek, ClassSession, Subject } from '@/lib/types';
import { DAYS_OF_WEEK, mergeConsecutiveSessions } from '@/lib/timetableUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Sparkles, Check, Trash2, Plus, ShieldAlert , Bot, X, ChevronDown} from 'lucide-react';
import { useUser, SignInButton } from '@clerk/nextjs';

export interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({ isOpen, onClose }) => {
  const { subjects, addSubject, timetable, setFullTimetable, setFullSubjectsAndTimetable, showToast } = useApp();
  const { isSignedIn, isLoaded } = useUser();

  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>('upload');
  const [fileName, setFileName] = useState('');
  const [extractedSessions, setExtractedSessions] = useState<ExtractedClassSession[]>([]);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setExtractedSessions([]);
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
      const res = await fetch('/api/extract-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files'),
          images: isString ? [] : filesInfo,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setExtractedSessions(mergeConsecutiveSessions(data.sessions));
      } else {
        // Fallback for demo
        setExtractedSessions([
          {
            day: 'Monday',
            startTime: '09:00',
            endTime: '10:00',
            subjectName: 'Machine Learning',
            subjectCode: 'CS302',
            room: 'LT-1',
            faculty: 'Dr. Debanjan Sadhukhan',
            isLab: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to extract timetable:', error);
      resetState();
    }

    setStep('review');
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

  const updateExtractedRow = (index: number, partial: Partial<ExtractedClassSession>) => {
    setExtractedSessions((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item))
    );
  };

  const removeExtractedRow = (index: number) => {
    setExtractedSessions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addExtractedRow = () => {
    setExtractedSessions((prev) => [
      ...prev,
      {
        day: 'Monday',
        startTime: '',
        endTime: '',
        subjectCode: '',
        subjectName: '',
        room: '',
        faculty: '',
        isLab: false,
      }
    ]);
  };

  const handleSaveConfirmed = () => {
    // We need to fetch existing subjects, match or create them, then create ClassSessions
    const newSubjects: Subject[] = [...subjects];
    const newSessions: ClassSession[] = [];

    extractedSessions.forEach((extSession, idx) => {
      // Find matching subject
      let matchedSubject = newSubjects.find(
        (s) => s.name.toLowerCase() === extSession.subjectName.toLowerCase() || 
               (extSession.subjectCode && s.code && s.code.toLowerCase() === extSession.subjectCode.toLowerCase())
      );

      if (!matchedSubject) {
        matchedSubject = {
          id: `subj_${Date.now()}_${idx}`,
          name: extSession.subjectName,
          code: extSession.subjectCode || '',
          shortName: extSession.subjectName.substring(0, 4).toUpperCase(),
          facultyName: extSession.faculty || 'TBD',
          room: extSession.room || 'TBD',
          credits: 3,
          color: ['#7C897A', '#C08A76', '#C79F6F', '#B88B8C', '#7A8B99', '#9C8E80'][idx % 6],
          carryRequirements: ['Notebook'],
          isLab: extSession.isLab,
        };
        newSubjects.push(matchedSubject);
      }

      newSessions.push({
        id: `sess_${Date.now()}_${idx}`,
        subjectId: matchedSubject.id,
        day: extSession.day,
        startTime: extSession.startTime,
        endTime: extSession.endTime,
        room: extSession.room || matchedSubject.room,
        faculty: extSession.faculty || matchedSubject.facultyName,
        isLab: extSession.isLab,
      });
    });

    // Save subjects and timetable together atomically with matching IDs
    setFullSubjectsAndTimetable(newSubjects, newSessions);
    handleClose();
  };

  return (
    
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Timetable"
      description="Upload your timetable photo or PDF and we'll build your weekly schedule."
      maxWidth={step === 'review' ? '4xl' : 'md'}
      mobileFullSheet={step === 'review'}
    >
      {!isLoaded ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8C6B5D]" />
        </div>
      ) : !isSignedIn ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8E0D5] text-[#8C6B5D] flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold text-[#1A1918] dark:text-[#F4F1EA]">
              Sign In Required
            </h3>
            <p className="text-sm text-[#7A6D61] dark:text-[#9A9188] max-w-[280px] mx-auto leading-relaxed font-medium">
              Please sign in to your student account to upload and parse timetables like magic.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="px-6 py-3 rounded-xl bg-[#8C6B5D] hover:bg-[#7A5B4D] text-[#FDF8F4] font-bold text-sm tracking-wide transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      ) : (
        <>
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
              Choose a timetable file
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
            onClick={() => runExtraction('IIITNR_BTech_CSE_Sem6_Timetable.pdf')}
            className="flex items-center justify-between px-4 w-full h-[40px] border border-[#EAEAEA] dark:border-[#222222] hover:border-[#D9D9D6] dark:hover:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#6F6F6F] dark:text-[#999999]">
              <Sparkles className="w-3.5 h-3.5" />
              Use sample timetable
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
            Analyzing your timetable...
          </h4>
          <p className="text-[14px] text-[#6F6F6F] mt-1 mb-8 max-w-[280px]">
            Reading subjects, times, rooms and days.
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
              <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">Extracted Sessions</span>
              
              <div className="flex flex-col gap-4">
                {extractedSessions.map((session, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 border border-[#D9D9D6] dark:border-[#333333] relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] flex items-center justify-center text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Day</label>
                        <div className="relative">
                          <select
                            value={session.day}
                            onChange={(e) => updateExtractedRow(index, { day: e.target.value as any })}
                            className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors appearance-none"
                          >
                            <option value="Monday" className="dark:bg-[#111111]">Monday</option>
                            <option value="Tuesday" className="dark:bg-[#111111]">Tuesday</option>
                            <option value="Wednesday" className="dark:bg-[#111111]">Wednesday</option>
                            <option value="Thursday" className="dark:bg-[#111111]">Thursday</option>
                            <option value="Friday" className="dark:bg-[#111111]">Friday</option>
                            <option value="Saturday" className="dark:bg-[#111111]">Saturday</option>
                            <option value="Sunday" className="dark:bg-[#111111]">Sunday</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF] pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase truncate">Start</label>
                          <input
                            type="time"
                            value={session.startTime}
                            onChange={(e) => updateExtractedRow(index, { startTime: e.target.value })}
                            className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                          />
                        </div>
                        <span className="text-[#D9D9D6] dark:text-[#333333] mt-5">-</span>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase truncate">End</label>
                          <input
                            type="time"
                            value={session.endTime}
                            onChange={(e) => updateExtractedRow(index, { endTime: e.target.value })}
                            className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Subject Details</label>
                      <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                        <input
                          type="text"
                          placeholder="Code"
                          value={session.subjectCode}
                          onChange={(e) => updateExtractedRow(index, { subjectCode: e.target.value })}
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={session.subjectName}
                          onChange={(e) => updateExtractedRow(index, { subjectName: e.target.value })}
                          className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Room / Lab"
                        value={session.room}
                        onChange={(e) => updateExtractedRow(index, { room: e.target.value })}
                        className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Faculty"
                        value={session.faculty}
                        onChange={(e) => updateExtractedRow(index, { faculty: e.target.value })}
                        className="w-full px-2 py-1.5 h-[36px] bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                      />
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
              Save to Timetable
            </button>
          </div>
        </div>
      )}
            </>
      )}
    </Modal>
  );
};
