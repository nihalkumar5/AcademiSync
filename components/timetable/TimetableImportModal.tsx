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
import { Upload, Sparkles, Check, Trash2, Plus, ShieldAlert , Bot, X, ChevronDown, Filter} from 'lucide-react';
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

  // Academic Profile Context for AI Target Filtering & Slot Resolution
  const [branch, setBranch] = useState(profile?.branch || '');
  const [semester, setSemester] = useState(profile?.semester || 1);
  const [section, setSection] = useState(profile?.section || '');
  const [targetCourses, setTargetCourses] = useState('');

  // Sync state with profile whenever modal opens or profile loads
  useEffect(() => {
    if (isOpen && profile) {
      if (profile.branch) setBranch(profile.branch);
      if (profile.semester) setSemester(profile.semester);
      if (profile.section) setSection(profile.section);
    }
  }, [isOpen, profile]);

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

    const resolvedBranch = (branch || profile?.branch || '').trim();
    const resolvedSemester = Number(semester) || profile?.semester || 1;
    const resolvedSection = (section || profile?.section || '').trim();
    const resolvedCourses = targetCourses.trim() || undefined;

    // Persist updated academic context to user profile so user doesn't have to re-enter it
    const cleanSec = normalizeSection(resolvedSection) || resolvedSection;
    if (
      (cleanSec && cleanSec !== profile?.section) ||
      (resolvedBranch && resolvedBranch !== profile?.branch) ||
      (resolvedSemester && resolvedSemester !== profile?.semester)
    ) {
      updateProfile({
        ...(resolvedBranch ? { branch: resolvedBranch } : {}),
        semester: resolvedSemester,
        ...(cleanSec ? { section: cleanSec } : {}),
      });
    }

    try {
      const res = await fetch('/api/extract-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: isString ? filesInfo : (filesInfo.length === 1 ? filesInfo[0].name : 'Multiple Files'),
          images: isString ? [] : filesInfo,
          isSample: isString,
          userId: user?.id || (user as any)?.uid || null,
          studentContext: {
            college: profile?.college || '',
            programme: profile?.programme || 'B.Tech',
            branch: resolvedBranch,
            year: profile?.year || Math.ceil(resolvedSemester / 2) || 1,
            semester: resolvedSemester,
            section: resolvedSection,
            targetCourses: resolvedCourses,
          },
        }),
      });

      const data = await res.json();
      if (res.status === 429) {
        showToast('Scan Limit', data.error || 'Please wait a few minutes before scanning again.', 'error');
        resetState();
        return;
      }

      if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setExtractedSessions(mergeConsecutiveSessions(data.sessions));
        setStep('review');
      } else {
        showToast(
          'Scan Unsuccessful', 
          data.error || 'Could not extract timetable. This can happen due to a weak internet connection, unreadable/blurry photo, or AI timeout. Please try again with a clearer photo or add classes manually.', 
          'error'
        );
        resetState();
      }
    } catch (error) {
      console.error('Failed to extract timetable:', error);
      showToast(
        'Connection Error', 
        'Request failed or timed out. Please check your internet connection and try again.', 
        'error'
      );
      resetState();
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
      }
    ]);
  };

  const handleSaveConfirmed = () => {
    // Only include subjects that belong to the newly imported timetable routine
    const newSubjects: Subject[] = [];
    const newSessions: ClassSession[] = [];

    extractedSessions.forEach((extSession, idx) => {
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
            color: assignedColor,
            carryRequirements: extSession.isLab ? ['Laptop (Charged)', 'Lab Manual / Record'] : ['Lecture Notebook'],
            isLab: extSession.isLab,
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
      });
    });

    const finalHarmonizedSubjects = autoAssignHarmonicColorsToSubjects(newSubjects);

    // Save subjects and timetable together atomically with matching IDs
    setFullSubjectsAndTimetable(finalHarmonizedSubjects, newSessions);
    updateProfile({ onboardingCompleted: true });
    setShowOnboarding(false);
    showToast('Timetable Sorted!', `Extracted ${finalHarmonizedSubjects.length} subjects & ${newSessions.length} weekly classes with optimal aesthetic colors!`, 'success');
    handleClose();
  };

  return (
    
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Timetable"
      description="Just upload your routine photo or PDF & chill — Intersemester handles all your schedule tension automatically."
      maxWidth={step === 'review' ? '4xl' : 'lg'}
      mobileFullSheet={step === 'review'}
    >
      {step === 'upload' && (
        <div className="flex flex-col text-center">
          {/* Academic Profile & Target Filter */}
          <div className="mb-4 p-3.5 sm:p-4 rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5]/80 dark:bg-[#121317]/80 text-left">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-black/80 dark:text-[#F4F4F6]">
                  Academic Filter Context
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Zero Guesswork
              </span>
            </div>

            <p className="text-[11px] sm:text-[12px] text-black/60 dark:text-[#94A3B8] leading-relaxed mb-3">
              Auto-filters multi-department circulars (like IIT Kanpur) and resolves slot matrix grids (like IIT Bombay) directly to your routine.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Branch */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/50">
                  Branch / Dept
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. CSE, EE, ME"
                  className="w-full px-2.5 py-1.5 h-[36px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[12px] font-medium text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/40 transition-colors"
                />
              </div>

              {/* Semester */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/50">
                  Semester
                </label>
                <div className="relative">
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 h-[36px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[12px] font-medium text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/40 transition-colors appearance-none pr-6"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s} className="dark:bg-[#121317]">
                        Semester {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Section / Group */}
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/50">
                  Section / Group
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. Group 1, Sec A3"
                  className="w-full px-2.5 py-1.5 h-[36px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[12px] font-medium text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/40 transition-colors"
                />
              </div>
            </div>

            {/* Optional Courses Filter */}
            <div className="mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/[0.04]">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/50">
                    Specific Courses (Optional)
                  </label>
                  <span className="text-[10px] text-black/40 dark:text-white/30">Leave blank for all</span>
                </div>
                <input
                  type="text"
                  value={targetCourses}
                  onChange={(e) => setTargetCourses(e.target.value)}
                  placeholder="e.g. CS 347, CS 348, CS 387 (or PHY114)"
                  className="w-full px-2.5 py-1.5 h-[36px] rounded-none bg-white dark:bg-[#090A0C] border border-black/10 dark:border-white/[0.1] text-[12px] font-medium text-black dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/40 transition-colors"
                />
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

          <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-black/40 dark:text-white/30 tracking-[2px] uppercase mb-3">
            <span className="flex-1 h-px bg-black/10 dark:bg-white/[0.06]" />
            OR TRY SAMPLE
            <span className="flex-1 h-px bg-black/10 dark:bg-white/[0.06]" />
          </div>

          <button 
            type="button"
            onClick={() => runExtraction('IIITNR_BTech_CSE_Sem6_Timetable.pdf')}
            className="flex items-center justify-between px-4 w-full h-[40px] rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] hover:border-black/20 dark:hover:border-white/[0.14] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-black/70 dark:text-[#94A3B8]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Use sample timetable
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
