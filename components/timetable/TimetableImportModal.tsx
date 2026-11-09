'use client';
import { AiUploadError, prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
import { motion } from 'framer-motion';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ExtractedClassSession, DayOfWeek, ClassSession, Subject } from '@/lib/types';
import { DAYS_OF_WEEK, mergeConsecutiveSessions, normalizeSection, sanitizeAcademicTime, deduplicateTimetableSessions } from '@/lib/timetableUtils';
import { autoAssignHarmonicColorsToSubjects, getHarmonicColorForSubject } from '@/lib/cardColors';
import { getAuthHeaders } from '@/lib/authHeaders';
import { openElectives } from '@/components/electives/Electives';
import { electivePrefix, prettyLabel } from '@/lib/electives';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Sparkles, Check, Trash2, Plus, ShieldAlert, Bot, X, ChevronDown, Filter, AlertTriangle } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';

export interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}


/** Different courses at the same time can't all be compulsory: mark them electives (students pick one) */
const markParallelElectives = (rows: ExtractedClassSession[]): { rows: ExtractedClassSession[]; found: number } => {
  const mins = (t?: string) => {
    const [h, m] = (t || '').split(':').map((x) => parseInt(x, 10));
    return isNaN(h) ? NaN : h * 60 + (isNaN(m) ? 0 : m);
  };
  const key = (r: ExtractedClassSession) => (r.subjectName || '').trim().toLowerCase();
  const hit = new Set<number>();
  rows.forEach((a, i) =>
    rows.forEach((b, j) => {
      if (j <= i || a.day !== b.day || !key(a) || key(a) === key(b)) return;
      const as = mins(a.startTime), ae = mins(a.endTime), bs = mins(b.startTime), be = mins(b.endTime);
      if ([as, ae, bs, be].some(isNaN) ? a.startTime === b.startTime : as < be && bs < ae) {
        hit.add(i);
        hit.add(j);
      }
    })
  );
  const newly = Array.from(hit).filter((i) => !rows[i].isElective).length;
  return { rows: rows.map((r, i) => (hit.has(i) ? { ...r, isElective: true } : r)), found: newly };
};

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({ isOpen, onClose }) => {
  const { 
    profile,
    subjects, 
    addSubject, 
    timetable, 
    isBatchPilot,
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
  const [parallelFound, setParallelFound] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [lastUploadedFiles, setLastUploadedFiles] = useState<{ name: string, base64: string, mimeType: string }[] | null>(null);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setExtractedSessions([]);
    setParallelFound(0);
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
        headers: await getAuthHeaders(),
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

      const data = await readAiResponse(res);
      if (res.status === 429) {
        const errMsg = data.error || 'Please wait a few minutes before scanning again.';
        setExtractError(errMsg);
        showToast('Scan Limit', errMsg, 'error');
        setStep('upload');
        return;
      }

      if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        const { rows, found } = markParallelElectives(mergeConsecutiveSessions(data.sessions));
        setParallelFound(found);
        setExtractedSessions(rows);
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
    e.target.value = '';
    if (files.length === 0) return;
    // Photos are shrunk on the phone; everything together stays under the upload limit
    prepareAiUpload(files, { maxDim: 2200 })
      .then(runExtraction)
      .catch((err) =>
        showToast("Can't send these files", err instanceof AiUploadError ? err.message : 'Could not read the files. Try again.', 'error')
      );
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

      const cleanName = (extSession.subjectName || '').trim();
      const cleanCode = (extSession.subjectCode || '').trim();
      // Only treat code as course identifier if it's a real course code like CS101, NOT a 1-2 char slot letter like A, B, C, F
      const isRealCourseCode = cleanCode.length > 2 && !/^[A-Z]\d?$/i.test(cleanCode);

      // Find if we already registered this subject in newSubjects (strictly by subject name or real course code)
      let matchedSubject = newSubjects.find((s) => {
        if (s.name.trim().toLowerCase() === cleanName.toLowerCase()) return true;
        if (isRealCourseCode && s.code && s.code.trim().toLowerCase() === cleanCode.toLowerCase()) return true;
        return false;
      });

      if (!matchedSubject) {
        // Match existing subject strictly by NAME to preserve user custom color/notes
        const existingSubject = subjects.find(
          (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
        );

        // Guarantee that EVERY subject gets a UNIQUE id (never collide or reuse an ID already in newSubjects)
        const isIdAvailable = existingSubject?.id && !newSubjects.some((s) => s.id === existingSubject.id);
        const subjectId = isIdAvailable
          ? existingSubject.id
          : `subj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`;

        const assignedColor = getHarmonicColorForSubject(
          { name: cleanName, code: cleanCode, isLab: extSession.isLab },
          newSubjects.map((s) => s.color)
        );

        matchedSubject = {
          id: subjectId,
          name: cleanName,
          code: cleanCode,
          shortName: cleanName.substring(0, 4).toUpperCase(),
          facultyName: extSession.faculty || (existingSubject?.facultyName && existingSubject.facultyName !== 'TBD' ? existingSubject.facultyName : 'TBD'),
          room: extSession.room || (existingSubject?.room && existingSubject.room !== 'TBD' ? existingSubject.room : 'TBD'),
          credits: existingSubject?.credits || 3,
          color: (existingSubject?.isCustomColor && existingSubject.color) ? existingSubject.color : (isExtractedElective ? '#8067B5' : assignedColor),
          isCustomColor: Boolean(existingSubject?.isCustomColor),
          carryRequirements: extSession.isLab 
            ? ['Laptop (Charged)', 'Lab Manual / Record'] 
            : (existingSubject?.carryRequirements || ['Lecture Notebook']),
          isLab: Boolean(extSession.isLab),
          isElective: isExtractedElective,
          ...(isExtractedElective && (extSession.electiveGroup || electivePrefix(cleanName))
            ? { electiveSlot: prettyLabel(extSession.electiveGroup || electivePrefix(cleanName)) }
            : {}),
        };

        newSubjects.push(matchedSubject);
      }

      const cleanStart = sanitizeAcademicTime(extSession.startTime, '09:00', false);
      const cleanEnd = sanitizeAcademicTime(extSession.endTime, '10:00', true, cleanStart);

      newSessions.push({
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`,
        subjectId: matchedSubject.id,
        subjectName: matchedSubject.name,
        subjectCode: matchedSubject.code,
        day: extSession.day,
        startTime: cleanStart,
        endTime: cleanEnd,
        room: extSession.room || matchedSubject.room,
        faculty: extSession.faculty || matchedSubject.facultyName,
        isLab: Boolean(extSession.isLab),
        isElective: isExtractedElective,
        isPersonal: false,
      });
    });

    const finalHarmonizedSubjects = autoAssignHarmonicColorsToSubjects(newSubjects);
    const cleanSessions = deduplicateTimetableSessions(newSessions).cleaned;

    // Electives: the student picks theirs afterwards (Your electives sheet), nothing is auto-enrolled
    const electiveCount = finalHarmonizedSubjects.filter((s) => s.isElective).length;

    // Save subjects and timetable together atomically with matching IDs
    setFullSubjectsAndTimetable(finalHarmonizedSubjects, cleanSessions);
    updateProfile({ 
      onboardingCompleted: true,
      ...(!isBatchPilot && profile.isBatchSynced ? { isBatchSynced: false, batchKey: '' } : {}),
    });
    setShowOnboarding(false);
    showToast('Timetable Sorted!', `Extracted ${finalHarmonizedSubjects.length} subjects & ${cleanSessions.length} weekly classes with optimal aesthetic colors!`, 'success');
    handleClose();
    // Electives found: pick yours (or, for a pilot, check how they're grouped)
    if (electiveCount > 0) setTimeout(() => openElectives(), 600);
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
                  <h4 className="text-[12px] font-bold text-red-600 dark:text-red-400 mb-1">
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
                        className="px-3 h-9 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold transition-colors rounded-none cursor-pointer"
                      >
                        Retry Scan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className="px-3 h-9 border border-red-600/40 text-red-700 dark:text-red-300 hover:bg-red-500/10 text-[12px] font-semibold transition-colors rounded-none cursor-pointer"
                    >
                      Add Classes Manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtractError(null)}
                      className="text-[11px] text-muted hover:underline ml-auto cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Guidance Banner */}
          <div className="mb-4 p-4 rounded-none border border-line bg-[#F7F7F5]/90 dark:bg-[#121317]/90 text-left">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[12px] font-bold text-black/80 dark:text-[#F4F4F6]">
                Upload Guidelines
              </span>
            </div>

            <div className="flex flex-col gap-2 text-[12px] text-black/75 dark:text-[#A1A1AA] leading-relaxed">
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

          <div className="relative group w-full h-[180px] sm:h-[190px] flex flex-col items-center justify-center rounded-none border-2 border-dashed border-line bg-surface-2 hover:bg-surface-2 transition-all cursor-pointer mb-4">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-5 h-5 mb-2.5 text-fg" />
            <h3 className="text-[14px] font-bold text-fg mb-1">
              Choose a timetable file
            </h3>
            <p className="text-[12px] text-muted mb-3">
              Photo or PDF
            </p>
            
            <div className="px-5 h-[36px] flex items-center justify-center bg-ink text-on-ink font-bold text-[12px] pointer-events-none rounded-none w-fit mx-auto mb-2 shadow-sm">
              Choose file
            </div>

            <div className="text-[12px] text-faint font-medium ">
              JPG · PNG · PDF
            </div>
          </div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={handleManualEntry}
              className="text-[12px] font-medium text-muted hover:text-fg underline underline-offset-4 cursor-pointer transition-colors"
            >
              Or create timetable manually without a file
            </button>
          </div>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center w-full">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-surface-2 border border-line flex items-center justify-center relative">
              <Bot className="w-12 h-12 text-fg animate-pulse" />
              <Sparkles className="w-6 h-6 absolute top-1 right-0 text-amber-500 animate-bounce" />
            </div>
          </div>
          
          <h4 className="text-[18px] font-bold text-fg">
            Analyzing your timetable...
          </h4>
          <p className="text-[14px] text-muted mt-1 mb-8 max-w-[280px]">
            Reading subjects, times, rooms and days.
          </p>

          <div className="flex items-center gap-3 w-full max-w-[280px] mx-auto mb-10">
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
              <span className="text-[14px] font-bold text-fg">AI is working...</span>
              <span className="text-[13px] text-muted mt-0.5">This usually takes 10–20 seconds.</span>
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col text-left">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="section-label">Extracted Sessions</span>
              {parallelFound > 0 && (
                <p className="border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200 px-3 py-2.5 text-[13px] leading-[19px]">
                  {parallelFound} classes run at the same time as another course, so we marked them as electives. Students pick the one they attend. Switch any off that everyone takes.
                </p>
              )}
              
              <div className="flex flex-col gap-4">
                {extractedSessions.map((session, index) => (
                  <div key={index} className="flex flex-col gap-3 p-4 rounded-none border border-line bg-surface-2 relative group">
                    <button
                      type="button"
                      onClick={() => removeExtractedRow(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-none bg-surface border border-line flex items-center justify-center text-muted hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-muted ">Day</label>
                        <div className="relative">
                          <select
                            value={session.day}
                            onChange={(e) => updateExtractedRow(index, { day: e.target.value as any })}
                            className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors appearance-none"
                          >
                            <option value="Monday" className="dark:bg-[#121317]">Monday</option>
                            <option value="Tuesday" className="dark:bg-[#121317]">Tuesday</option>
                            <option value="Wednesday" className="dark:bg-[#121317]">Wednesday</option>
                            <option value="Thursday" className="dark:bg-[#121317]">Thursday</option>
                            <option value="Friday" className="dark:bg-[#121317]">Friday</option>
                            <option value="Saturday" className="dark:bg-[#121317]">Saturday</option>
                            <option value="Sunday" className="dark:bg-[#121317]">Sunday</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <label className="text-[12px] font-semibold text-muted truncate">Start</label>
                          <input
                            type="time"
                            value={session.startTime}
                            onChange={(e) => updateExtractedRow(index, { startTime: e.target.value })}
                            className="w-full px-2.5 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                          />
                        </div>
                        <span className="text-black/60 dark:text-white/20 mt-5">-</span>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <label className="text-[12px] font-semibold text-muted truncate">End</label>
                          <input
                            type="time"
                            value={session.endTime}
                            onChange={(e) => updateExtractedRow(index, { endTime: e.target.value })}
                            className="w-full px-2.5 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-muted ">Subject Details</label>
                      <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                        <input
                          type="text"
                          placeholder="Code"
                          value={session.subjectCode}
                          onChange={(e) => updateExtractedRow(index, { subjectCode: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={session.subjectName}
                          onChange={(e) => updateExtractedRow(index, { subjectName: e.target.value })}
                          className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Room / Lab"
                        value={session.room}
                        onChange={(e) => updateExtractedRow(index, { room: e.target.value })}
                        className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Faculty"
                        value={session.faculty}
                        onChange={(e) => updateExtractedRow(index, { faculty: e.target.value })}
                        className="w-full px-3 py-1.5 h-[38px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => updateExtractedRow(index, { isLab: !session.isLab })}
                        className={`px-3 py-1 text-[13px] font-bold transition-colors border ${
 session.isLab
 ? 'bg-[#18A889] text-white border-[#18A889]'
 : 'bg-transparent text-muted border-line hover:border-black/30'
 }`}
                      >
                        {session.isLab ? '✓ Practical / Lab' : '+ Lab'}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateExtractedRow(index, { isElective: !session.isElective })}
                        className={`px-3 py-1 text-[13px] font-bold transition-colors border ${
 session.isElective
 ? 'bg-[#8067B5] text-white border-[#8067B5]'
 : 'bg-transparent text-muted border-line hover:border-[#8067B5]'
 }`}
                      >
                        {session.isElective ? '★ Elective Course' : '+ Mark as Elective'}
                      </button>
                    </div>
                    {session.isElective && (
                      <label className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-muted shrink-0">Slot</span>
                        <input
                          type="text"
                          placeholder="e.g. Elective I (same name = pick one)"
                          value={session.electiveGroup || ''}
                          onChange={(e) => updateExtractedRow(index, { electiveGroup: e.target.value.slice(0, 40) })}
                          className="flex-1 min-w-0 px-3 py-1.5 h-[34px] rounded-none bg-surface border border-line text-[13px] text-fg focus:outline-none focus:border-line-strong transition-colors"
                        />
                      </label>
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
              Save to Timetable
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
