'use client';
import { motion } from 'framer-motion';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ExtractedClassSession, DayOfWeek, ClassSession, Subject } from '@/lib/types';
import { DAYS_OF_WEEK, mergeConsecutiveSessions, normalizeSection, sanitizeAcademicTime } from '@/lib/timetableUtils';
import { autoAssignHarmonicColorsToSubjects, getHarmonicColorForSubject } from '@/lib/cardColors';
import { validateUploadedFile } from '@/lib/fileSafety';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Sparkles, Check, Trash2, Plus, ShieldAlert, Bot, X, ChevronDown, Filter, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({ isOpen, onClose }) => {
  const { 
    profile,
    subjects, 
    addSubject, 
    timetable, 
    setFullTimetable, 
    setFullSubjectsAndTimetable, 
    showToast, 
    user, 
    isClerkLoaded, 
    updateProfile, 
    setShowOnboarding 
  } = useApp();
  const router = useRouter();
  const isSignedIn = !!user;
  const isLoaded = isClerkLoaded;

  const [step, setStep] = useState<'upload' | 'extracting' | 'review'>('upload');
  const [fileName, setFileName] = useState('');
  const [extractedSessions, setExtractedSessions] = useState<ExtractedClassSession[]>([]);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [lastUploadedFiles, setLastUploadedFiles] = useState<{ name: string, base64: string, mimeType: string }[] | null>(null);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setExtractedSessions([]);
    setExtractError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleManualEntry = () => {
    setExtractedSessions([
      {
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        subjectCode: '',
        subjectName: '',
        room: '',
        faculty: '',
        isLab: false,
        isElective: false,
      }
    ]);
    setExtractError(null);
    setStep('review');
  };

  const runExtraction = async (filesInfo: { name: string, base64: string, mimeType: string }[]) => {
    setFileName(filesInfo.length === 1 ? filesInfo[0].name : `${filesInfo.length} files selected`);
    setLastUploadedFiles(filesInfo);
    setExtractError(null);
    setStep('extracting');

    const resolvedBranch = (profile?.branch || '').trim();
    const resolvedSemester = Number(profile?.semester) || 1;
    const resolvedSection = (profile?.section || '').trim();

    try {
      const res = await fetch('/api/extract-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files',
          images: filesInfo,
          userId: user?.id || (user as any)?.uid || null,
          studentContext: {
            college: profile?.college || '',
            programme: profile?.programme || 'B.Tech',
            branch: resolvedBranch,
            year: profile?.year || Math.ceil(resolvedSemester / 2) || 1,
            semester: resolvedSemester,
            section: resolvedSection,
          },
        }),
      });

      const data = await res.json();
      if (res.status === 429) {
        const errMsg = data.error || 'Please wait a few minutes before scanning again.';
        setExtractError(errMsg);
        showToast('Scan Limit', errMsg, 'error');
        setStep('upload');
        return;
      }

      if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setExtractedSessions(mergeConsecutiveSessions(data.sessions));
        setStep('review');
      } else {
        const errMsg = data.error || 'Could not extract timetable from this document. Please ensure the routine image or PDF is sharp and clear, or enter classes manually.';
        setExtractError(errMsg);
        showToast('Scan Unsuccessful', errMsg, 'error');
        setStep('upload');
      }
    } catch (error) {
      console.error('Failed to extract timetable:', error);
      const errMsg = 'Extraction request timed out or connection failed. Please check your internet connection and try again, or enter your routine manually.';
      setExtractError(errMsg);
      showToast('Connection Error', errMsg, 'error');
      setStep('upload');
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
        isElective: false,
      }
    ]);
  };

  const handleSaveConfirmed = () => {
    // Only include subjects that belong to the newly imported timetable routine
    const newSubjects: Subject[] = [];
    const newSessions: ClassSession[] = [];

    extractedSessions.forEach((extSession, idx) => {
      const isExtractedElective = Boolean(
        extSession.isElective || 
        extSession.subjectName.toLowerCase().includes('elective') || 
        (extSession.subjectCode && extSession.subjectCode.toLowerCase().includes('elec'))
      );

      // Find if we already registered this subject in newSubjects
      let matchedSubject = newSubjects.find(
        (s) => s.name.toLowerCase() === extSession.subjectName.toLowerCase() || 
               (extSession.subjectCode && s.code && s.code.toLowerCase() === extSession.subjectCode.toLowerCase())
      );

      if (!matchedSubject) {
        // Check if user previously had this subject in `subjects` to preserve custom color, notes, faculty details
        const existingSubject = subjects.find(
          (s) => s.name.toLowerCase() === extSession.subjectName.toLowerCase() || 
                 (extSession.subjectCode && s.code && s.code.toLowerCase() === extSession.subjectCode.toLowerCase())
        );

        if (existingSubject) {
          matchedSubject = {
            ...existingSubject,
            facultyName: extSession.faculty || existingSubject.facultyName,
            room: extSession.room || existingSubject.room,
            isLab: extSession.isLab ?? existingSubject.isLab,
            isElective: isExtractedElective || existingSubject.isElective || false,
          };
        } else {
          const assignedColor = getHarmonicColorForSubject(
            { name: extSession.subjectName, code: extSession.subjectCode, isLab: extSession.isLab },
            newSubjects.map((s) => s.color)
          );

          matchedSubject = {
            id: `subj_${Date.now()}_${idx}`,
            name: extSession.subjectName,
            code: extSession.subjectCode || '',
            shortName: extSession.subjectName.substring(0, 4).toUpperCase(),
            facultyName: extSession.faculty || 'TBD',
            room: extSession.room || 'TBD',
            credits: 3,
            color: isExtractedElective ? '#8067B5' : assignedColor,
            carryRequirements: extSession.isLab ? ['Laptop (Charged)', 'Lab Manual / Record'] : ['Lecture Notebook'],
            isLab: extSession.isLab,
            isElective: isExtractedElective,
          };
        }
        newSubjects.push(matchedSubject);
      }

      const cleanStart = sanitizeAcademicTime(extSession.startTime, '09:00', false);
      const cleanEnd = sanitizeAcademicTime(extSession.endTime, '10:00', true, cleanStart);

      newSessions.push({
        id: `sess_${Date.now()}_${idx}`,
        subjectId: matchedSubject.id,
        day: extSession.day,
        startTime: cleanStart,
        endTime: cleanEnd,
        room: extSession.room || matchedSubject.room,
        faculty: extSession.faculty || matchedSubject.facultyName,
        isLab: extSession.isLab,
        isElective: isExtractedElective,
      });
    });

    const finalHarmonizedSubjects = autoAssignHarmonicColorsToSubjects(newSubjects);

    // If electives are present, ensure student has enrolledElectiveIds tracked
    const electiveSubjectIds = finalHarmonizedSubjects.filter(s => s.isElective).map(s => s.id);
    const existingEnrolled = profile?.enrolledElectiveIds;
    const initialEnrolled = existingEnrolled || electiveSubjectIds;

    // Save subjects and timetable together atomically with matching IDs
    setFullSubjectsAndTimetable(finalHarmonizedSubjects, newSessions);
    updateProfile({ 
      onboardingCompleted: true,
      ...(electiveSubjectIds.length > 0 ? { enrolledElectiveIds: initialEnrolled } : {})
    });
    setShowOnboarding(false);
    showToast('Timetable Sorted!', `Extracted ${finalHarmonizedSubjects.length} subjects & ${newSessions.length} weekly classes with optimal aesthetic colors!`, 'success');
    handleClose();
  };

  return (
    
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Timetable"
      description="Upload your timetable image or PDF to automatically generate your weekly routine."
      maxWidth={step === 'review' ? '4xl' : 'lg'}
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && (
        <div className="flex flex-col text-center">
          {/* Error Banner if extraction failed */}
          {extractError && (
            <div className="mb-4 p-4 rounded-none border border-red-500/30 bg-red-500/10 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                    Scan Unsuccessful
                  </h4>
                  <p className="text-[12px] text-red-800 dark:text-red-200 leading-relaxed mb-3">
                    {extractError}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {lastUploadedFiles && (
                      <button
                        type="button"
                        onClick={() => runExtraction(lastUploadedFiles)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold tracking-wide uppercase transition-colors rounded-none cursor-pointer"
                      >
                        Retry Scan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className="px-3 py-1.5 border border-red-600/40 text-red-700 dark:text-red-300 hover:bg-red-500/10 text-[11px] font-bold tracking-wide uppercase transition-colors rounded-none cursor-pointer"
                    >
                      Add Classes Manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtractError(null)}
                      className="text-[11px] text-black/50 dark:text-white/50 hover:underline ml-auto cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Guidance Banner */}
          <div className="mb-4 p-4 rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5]/90 dark:bg-[#121317]/90 text-left">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-black/80 dark:text-[#F4F4F6]">
                Upload Guidelines
              </span>
            </div>

            <div className="flex flex-col gap-2 text-[12px] text-black/75 dark:text-[#94A3B8] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5 text-[13px]">✓</span>
                <span>
                  <strong>Upload your class or batch routine:</strong> For circulars with multiple departments, upload only your specific branch or section pages for an accurate timetable.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5 text-[13px]">✓</span>
                <span>
                  <strong>Multi-page documents supported:</strong> You can upload multi-page PDFs or select multiple timetable images at once.
                </span>
              </div>
            </div>
          </div>

          <div className="relative group w-full h-[180px] sm:h-[190px] flex flex-col items-center justify-center rounded-none border-2 border-dashed border-black/15 dark:border-white/[0.1] bg-[#F7F7F5]/50 dark:bg-white/[0.02] hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-all cursor-pointer mb-4">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-5 h-5 mb-2.5 text-black dark:text-[#F4F4F6]" />
            <h3 className="text-[14px] font-bold text-black dark:text-[#F4F4F6] mb-1">
              Choose a timetable file
            </h3>
            <p className="text-[12px] text-black/60 dark:text-[#94A3B8] mb-3">
              Photo or PDF
            </p>
            
            <div className="px-5 h-[36px] flex items-center justify-center bg-black text-white dark:bg-white dark:text-black font-bold text-[12px] pointer-events-none rounded-none w-fit mx-auto mb-2 shadow-sm">
              Choose file
            </div>

            <div className="text-[10px] text-black/40 dark:text-[#64748B] font-medium tracking-[0.5px] uppercase">
              JPG · PNG · PDF
            </div>
          </div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={handleManualEntry}
              className="text-[12px] font-medium text-black/60 dark:text-[#94A3B8] hover:text-black dark:hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
            >
              Or create timetable manually without a file
            </button>
          </div>
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
            Analyzing your timetable...
          </h4>
          <p className="text-[14px] text-black/60 dark:text-[#94A3B8] mt-1 mb-8 max-w-[280px]">
            Reading subjects, times, rooms and days.
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
              <span className="text-[11px] font-bold tracking-[0.2em] text-black/50 dark:text-white/40 uppercase">Extracted Sessions</span>
              
              <div className="flex flex-col gap-4">
                {extractedSessions.map((session, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5]/50 dark:bg-[#121317] relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-none bg-white dark:bg-[#181A20] border border-black/10 dark:border-white/[0.1] flex items-center justify-center text-black/60 dark:text-[#94A3B8] hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Day</label>
                        <div className="relative">
                          <select
                            value={session.day}
                            onChange={(e) => updateExtractedRow(index, { day: e.target.value as any })}
                            className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors appearance-none"
                          >
                            <option value="Monday" className="dark:bg-[#121317]">Monday</option>
                            <option value="Tuesday" className="dark:bg-[#121317]">Tuesday</option>
                            <option value="Wednesday" className="dark:bg-[#121317]">Wednesday</option>
                            <option value="Thursday" className="dark:bg-[#121317]">Thursday</option>
                            <option value="Friday" className="dark:bg-[#121317]">Friday</option>
                            <option value="Saturday" className="dark:bg-[#121317]">Saturday</option>
                            <option value="Sunday" className="dark:bg-[#121317]">Sunday</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase truncate">Start</label>
                          <input
                            type="time"
                            value={session.startTime}
                            onChange={(e) => updateExtractedRow(index, { startTime: e.target.value })}
                            className="w-full px-2.5 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                          />
                        </div>
                        <span className="text-black/30 dark:text-white/20 mt-5">-</span>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase truncate">End</label>
                          <input
                            type="time"
                            value={session.endTime}
                            onChange={(e) => updateExtractedRow(index, { endTime: e.target.value })}
                            className="w-full px-2.5 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-black/60 dark:text-[#94A3B8] uppercase">Subject Details</label>
                      <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                        <input
                          type="text"
                          placeholder="Code"
                          value={session.subjectCode}
                          onChange={(e) => updateExtractedRow(index, { subjectCode: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={session.subjectName}
                          onChange={(e) => updateExtractedRow(index, { subjectName: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Room / Lab"
                        value={session.room}
                        onChange={(e) => updateExtractedRow(index, { room: e.target.value })}
                        className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Faculty"
                        value={session.faculty}
                        onChange={(e) => updateExtractedRow(index, { faculty: e.target.value })}
                        className="w-full px-3 py-1.5 h-[38px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[13px] text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => updateExtractedRow(index, { isLab: !session.isLab })}
                        className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors border ${
                          session.isLab
                            ? 'bg-[#18A889] text-white border-[#18A889]'
                            : 'bg-transparent text-black/60 dark:text-[#94A3B8] border-black/10 dark:border-white/[0.1] hover:border-black/30'
                        }`}
                      >
                        {session.isLab ? '✓ Practical / Lab' : '+ Lab'}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateExtractedRow(index, { isElective: !session.isElective })}
                        className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors border ${
                          session.isElective
                            ? 'bg-[#8067B5] text-white border-[#8067B5]'
                            : 'bg-transparent text-black/60 dark:text-[#94A3B8] border-black/10 dark:border-white/[0.1] hover:border-[#8067B5]'
                        }`}
                      >
                        {session.isElective ? '★ Elective Course' : '+ Mark as Elective'}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExtractedRow}
                  className="w-full flex items-center justify-center gap-2 py-2 h-[44px] text-[12px] font-bold uppercase text-black dark:text-[#F4F4F6] rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
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
              className="w-full sm:w-auto px-4 py-2.5 rounded-none text-[13px] font-bold uppercase text-black/70 dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Scan Another
            </button>
            <button 
              type="button" 
              onClick={handleSaveConfirmed}
              className="w-full sm:w-auto px-6 py-2.5 rounded-none bg-black text-white dark:bg-white dark:text-black text-[13px] font-bold uppercase hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              Save to Timetable
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
