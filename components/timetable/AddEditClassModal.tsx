'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek } from '@/lib/types';
import { DAYS_OF_WEEK, sanitizeAcademicTime } from '@/lib/timetableUtils';
import { Modal } from '../ui/Modal';
import { subjectTone } from '@/lib/assignmentDisplay';

export interface AddEditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: ClassSession | null;
  defaultDay?: DayOfWeek;
}

export const AddEditClassModal: React.FC<AddEditClassModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  defaultDay = 'Monday',
}) => {
  const { subjects, addClassSession, updateClassSession, timetable, profile, isBatchCR, showToast } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [faculty, setFaculty] = useState('');
  const [isLab, setIsLab] = useState(false);
  const [syncWithBatch, setSyncWithBatch] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (sessionToEdit) {
      setSubjectId(sessionToEdit.subjectId);
      setDay(sessionToEdit.day);
      const cleanStart = sanitizeAcademicTime(sessionToEdit.startTime, '09:00', false);
      const cleanEnd = sanitizeAcademicTime(sessionToEdit.endTime, '10:00', true, cleanStart);
      setStartTime(cleanStart);
      setEndTime(cleanEnd);
      setRoom(sessionToEdit.room);
      setFaculty(sessionToEdit.faculty || '');
      setIsLab(sessionToEdit.isLab || false);
      setSyncWithBatch(!sessionToEdit.isPersonal && isBatchCR);
    } else {
      if (subjects.length > 0 && !subjectId) {
        const defaultSub = subjects[0];
        setSubjectId(defaultSub.id);
        setRoom(defaultSub.isLab ? (defaultSub.labRoom || defaultSub.room || '') : (defaultSub.room || ''));
        setFaculty(defaultSub.facultyName || '');
      }
      setDay(defaultDay);
      setSyncWithBatch(false);
    }
  }, [sessionToEdit, isOpen, defaultDay, subjects, isBatchCR]);

  const handleSubjectChangeStr = (selectedSubId: string) => {
    setSubjectId(selectedSubId);
    const sub = subjects.find((s) => s.id === selectedSubId);
    if (sub) {
      setRoom(sub.isLab ? (sub.labRoom || sub.room || '') : (sub.room || ''));
      setFaculty(sub.facultyName || '');
      setIsLab(sub.isLab || false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;

    if (sessionToEdit && !sessionToEdit.isPersonal && profile.isBatchSynced && !isBatchCR) {
      showToast('Permission Denied', 'Official batch classes can only be modified by the Batch Pilot.', 'error');
      return;
    }

    const toMinutes = (timeStr: string) => {
      const [h, m] = (timeStr || '0:0').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    if (newEnd <= newStart) {
      showToast('Invalid Timings', 'Class end time must be after start time.', 'error');
      return;
    }

    // Normal students can only add extra classes during free slots
    if (!isBatchCR && profile.isBatchSynced) {
      const clashingSession = timetable.find((s) => {
        if (sessionToEdit && s.id === sessionToEdit.id) return false;
        if (s.day !== day) return false;
        const sStart = toMinutes(s.startTime);
        const sEnd = toMinutes(s.endTime);
        return newStart < sEnd && newEnd > sStart;
      });

      if (clashingSession) {
        const clashingSub = subjects.find((sub) => sub.id === clashingSession.subjectId);
        showToast(
          'Time Slot Already Occupied',
          `Clashes with "${clashingSub?.name || 'scheduled class'}" (${clashingSession.startTime} - ${clashingSession.endTime}). Normal students can only add classes during free slots.`,
          'error'
        );
        return;
      }
    }

    const cleanStart = sanitizeAcademicTime(startTime, '09:00', false);
    const cleanEnd = sanitizeAcademicTime(endTime, '10:00', true, cleanStart);

    const targetIsPersonal = isBatchCR && profile.isBatchSynced ? !syncWithBatch : true;

    if (sessionToEdit) {
      updateClassSession(sessionToEdit.id, {
        subjectId,
        day,
        startTime: cleanStart,
        endTime: cleanEnd,
        room,
        faculty: faculty.trim() || undefined,
        isLab,
        isCustomRoom: true,
        isCustomTime: true,
        isPersonal: targetIsPersonal,
      });
    } else {
      addClassSession({
        subjectId,
        day,
        startTime: cleanStart,
        endTime: cleanEnd,
        room,
        faculty: faculty.trim() || undefined,
        isLab,
        isCustomRoom: true,
        isCustomTime: true,
        isPersonal: targetIsPersonal,
      });
    }
    onClose();
  };

  const selectedSubject = subjects.find(s => s.id === subjectId);

  const mins = (t: string) => {
    const [h, m] = (t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const fromMins = (n: number) => `${String(Math.floor((n % 1440) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const length = mins(endTime) - mins(startTime);
  const lengthLabel = length > 0 ? (length >= 60 ? `${Math.floor(length / 60)} hr${length % 60 ? ` ${length % 60} min` : ''}` : `${length} min`) : 'Ends before it starts';
  const isOfficial = !!sessionToEdit && !sessionToEdit.isPersonal;
  const tone = selectedSubject ? subjectTone(selectedSubject) : null;
  const field = 'w-full h-11 px-3 border border-line bg-surface text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-fg transition-colors';
  const label = 'block mb-1.5 text-[12px] font-semibold text-muted';

  const footer = (
    <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-2">
      <button type="button" onClick={onClose} className="btn btn-secondary btn-lg">
        Cancel
      </button>
      <button type="submit" form="class-form" disabled={!subjectId || length <= 0} className="btn btn-primary btn-lg flex-1 min-w-0">
        {sessionToEdit ? 'Save changes' : 'Add class'}
      </button>
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={sessionToEdit ? 'Edit class' : 'Add class'} mobileFullSheet footer={footer}>
        <form id="class-form" onSubmit={handleSubmit} className="flex flex-col gap-f5 text-left">
          {/* Subject */}
          <section>
            <span className={label}>Subject</span>
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="w-full flex items-center gap-3 p-f3 border border-line bg-surface hover:bg-surface-2 text-left transition-colors cursor-pointer"
              style={tone ? ({ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties) : undefined}
            >
              <span className={tone ? 'w-3 h-3 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]' : 'w-3 h-3 shrink-0 bg-line'} aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-semibold text-fg leading-snug">{selectedSubject?.name || 'Pick a subject'}</span>
                {selectedSubject && (
                  <span className="block mt-0.5 text-[12px] text-muted truncate">
                    {[selectedSubject.code && selectedSubject.code !== 'UNK' ? selectedSubject.code : '', selectedSubject.facultyName].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-fg-2">Change</span>
            </button>
          </section>

          {/* When */}
          <section className="flex flex-col gap-f3">
            <div>
              <span className={label}>Day</span>
              <div role="radiogroup" aria-label="Day" className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((d) => {
                  const on = d === day;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={d}
                      onClick={() => setDay(d as DayOfWeek)}
                      className={`h-11 text-[13px] font-semibold transition-colors cursor-pointer ${on ? 'bg-ink text-on-ink' : 'bg-surface-2 text-fg-2 hover:text-fg'}`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label} htmlFor="cls-start">Starts</label>
                <input id="cls-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={`${field} font-semibold tabular-nums`} />
              </div>
              <div>
                <label className={label} htmlFor="cls-end">Ends</label>
                <input id="cls-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={`${field} font-semibold tabular-nums`} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`mr-1 text-[13px] ${length > 0 ? 'text-muted' : 'text-rose-600 dark:text-rose-300 font-semibold'}`}>{lengthLabel}</span>
              {[
                { l: '1 hr', d: 55 },
                { l: '2 hr lab', d: 115 },
              ].map((q) => (
                <button key={q.l} type="button" onClick={() => setEndTime(fromMins(mins(startTime) + q.d))} className="h-7 px-2.5 bg-surface-2 text-[12px] font-medium text-fg-2 hover:text-fg cursor-pointer">
                  {q.l}
                </button>
              ))}
            </div>
          </section>

          {/* Where & who */}
          <section className="flex flex-col gap-f3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={label} htmlFor="cls-room">{isLab ? 'Lab' : 'Room'}</label>
                <input id="cls-room" className={field} placeholder={isLab ? 'e.g. AI Lab' : 'e.g. Room 319'} value={room} onChange={(e) => setRoom(e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="cls-fac">Teacher</label>
                <input id="cls-fac" className={field} placeholder="e.g. Dr. Sharma" value={faculty} onChange={(e) => setFaculty(e.target.value)} />
              </div>
            </div>
            <button type="button" role="switch" aria-checked={isLab} onClick={() => setIsLab(!isLab)} className="w-full flex items-center gap-3 text-left cursor-pointer">
              <span className="flex-1 min-w-0 text-[14px] font-medium text-fg">Lab / practical</span>
              <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${isLab ? 'bg-ink' : 'bg-black/15 dark:bg-white/15'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all ${isLab ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
          </section>

          {/* Pilot: whole batch or just me */}
          {isBatchCR && profile.isBatchSynced && (
            <section className="border-t border-line pt-f4">
              <span className={label}>Who gets this change</span>
              <div role="radiogroup" className="grid grid-cols-2 gap-1 p-1 bg-surface-2">
                {[
                  { on: true, l: 'Whole batch' },
                  { on: false, l: 'Only me' },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    role="radio"
                    aria-checked={syncWithBatch === o.on}
                    onClick={() => setSyncWithBatch(o.on)}
                    className={`h-10 text-[14px] font-semibold transition-colors cursor-pointer ${syncWithBatch === o.on ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-[17px] text-muted">
                {syncWithBatch ? 'Everyone in your batch gets the new timing, with a notification.' : isOfficial ? 'Your batch keeps the old timing; only your timetable changes.' : 'Only your own timetable changes.'}
              </p>
            </section>
          )}
        </form>
      </Modal>

      
      <Modal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="Search subjects"
      >
        <div className="flex flex-col max-h-[60vh] sm:max-h-[50vh] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6">
          <div className="relative border-b border-line shrink-0 bg-surface px-5 sm:px-6">
            <span className="absolute left-9 sm:left-10 top-1/2 -translate-y-1/2 text-fg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 py-4 bg-transparent text-[14px] font-medium text-fg focus:outline-none placeholder:text-[#6F6F6F] dark:placeholder:text-[#71717A]"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-5 gap-1.5 bg-surface-2">
            {subjects.filter(s => {
              const q = searchQuery.toLowerCase();
              return (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
            }).map((sub) => {
              const isSelected = sub.id === subjectId;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    handleSubjectChangeStr(sub.id);
                    setShowSearchModal(false);
                  }}
                  className={`flex items-start p-4 text-left transition-colors border ${
                    isSelected 
                      ? 'bg-ink text-on-ink border-line-strong' 
                      : 'bg-surface border-line hover:border-[#111111] dark:hover:border-white/[0.2] text-fg'
                  }`}
                >
                  {isSelected && (
                    <span className="shrink-0 mr-3 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[12px] font-bold uppercase tracking-widest mb-1 ${isSelected ? 'opacity-80' : 'text-muted'}`}>
                      {sub.code && sub.code !== 'UNK' ? sub.code : 'NO CODE'}
                    </span>
                    <span className="text-[14px] font-semibold leading-snug break-words pr-2">
                      {sub.name}
                    </span>
                  </div>
                </button>
              );
            })}
            
            {subjects.filter(s => {
              const q = searchQuery.toLowerCase();
              return (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
            }).length === 0 && (
              <div className="text-center py-10 text-[13px] font-medium text-muted">
                No subjects found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        title="Select day"
      >
        <div className="flex flex-col max-h-[60vh] sm:max-h-[50vh] overflow-y-auto -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 bg-surface-2 p-4 sm:p-5 gap-1.5 border-t border-line">
          {DAYS_OF_WEEK.map((d) => {
            const isSelected = d === day;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDay(d as DayOfWeek);
                  setShowDayModal(false);
                }}
                className={`flex items-center justify-between p-4 text-left transition-colors border ${
                  isSelected 
                    ? 'bg-ink text-on-ink border-line-strong' 
                    : 'bg-surface border-line hover:border-[#111111] dark:hover:border-white/[0.2] text-fg'
                }`}
              >
                <span className={`text-[14px] font-semibold tracking-wide uppercase ${isSelected ? 'opacity-100' : 'opacity-80'}`}>
                  {d}
                </span>
                {isSelected && (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
};
