'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek } from '@/lib/types';
import { DAYS_OF_WEEK } from '@/lib/timetableUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
  const { subjects, addClassSession, updateClassSession } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [faculty, setFaculty] = useState('');
  const [isLab, setIsLab] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (sessionToEdit) {
      setSubjectId(sessionToEdit.subjectId);
      setDay(sessionToEdit.day);
      setStartTime(sessionToEdit.startTime);
      setEndTime(sessionToEdit.endTime);
      setRoom(sessionToEdit.room);
      setFaculty(sessionToEdit.faculty || '');
      setIsLab(sessionToEdit.isLab || false);
    } else {
      if (subjects.length > 0 && !subjectId) {
        const defaultSub = subjects[0];
        setSubjectId(defaultSub.id);
        setRoom(defaultSub.isLab ? (defaultSub.labRoom || defaultSub.room || '') : (defaultSub.room || ''));
        setFaculty(defaultSub.facultyName || '');
      }
      setDay(defaultDay);
    }
  }, [sessionToEdit, isOpen, defaultDay, subjects]);

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

    if (sessionToEdit) {
      updateClassSession(sessionToEdit.id, {
        subjectId,
        day,
        startTime,
        endTime,
        room,
        faculty: faculty.trim() || undefined,
        isLab,
      });
    } else {
      addClassSession({
        subjectId,
        day,
        startTime,
        endTime,
        room,
        faculty: faculty.trim() || undefined,
        isLab,
      });
    }
    onClose();
  };

  const selectedSubject = subjects.find(s => s.id === subjectId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={sessionToEdit ? 'Edit Class' : 'Add Class'}
        description="Configure scheduled slot..."
        mobileFullSheet={true}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* SECTION 1: CLASS */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-[#6F6F6F] uppercase">CLASS</span>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Subject</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors text-left flex items-center justify-between min-h-[46px]"
                >
                  <span className="break-words whitespace-normal pr-2">
                    {(() => {
                      if (!selectedSubject) return 'Select Subject...';
                      return selectedSubject.code && selectedSubject.code !== 'UNK' 
                        ? `${selectedSubject.code} · ${selectedSubject.name}` 
                        : selectedSubject.name;
                    })()}
                  </span>
                  <svg className="w-4 h-4 shrink-0 text-[#111111] dark:text-[#FFFFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: SCHEDULE */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-[#6F6F6F] uppercase">SCHEDULE</span>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Day</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDayModal(true)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors text-left flex items-center justify-between"
                >
                  <span>{day}</span>
                  <svg className="w-4 h-4 shrink-0 text-[#111111] dark:text-[#FFFFFF] ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[15px] font-semibold text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">End time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[15px] font-semibold text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCATION & FACULTY */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-[#6F6F6F] uppercase">LOCATION & FACULTY</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Room / Lab</label>
                <input
                  type="text"
                  placeholder="e.g. 319"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors placeholder:text-[#6F6F6F]/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Faculty</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Santosh"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full px-3 py-2.5 bg-transparent border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors placeholder:text-[#6F6F6F]/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <input
                type="checkbox"
                id="isLabCheck"
                checked={isLab}
                onChange={(e) => setIsLab(e.target.checked)}
                className="w-4 h-4 rounded-none text-[#111111] focus:ring-[#111111] border-[#D9D9D6] dark:border-[#333333] bg-transparent cursor-pointer"
              />
              <label
                htmlFor="isLabCheck"
                className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
              >
                Practical / Lab session
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-2 border-t border-[#D9D9D6] dark:border-[#333333]">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-[13px] font-bold uppercase text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase hover:opacity-90 transition-opacity"
            >
              {sessionToEdit ? 'Edit Class' : '+ Add Class'}
            </button>
          </div>
        </form>
      </Modal>

      
      <Modal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="SEARCH SUBJECTS"
      >
        <div className="flex flex-col max-h-[60vh] sm:max-h-[50vh] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6">
          <div className="relative border-b border-[#D9D9D6] dark:border-[#333333] shrink-0 bg-white dark:bg-[#111111] px-5 sm:px-6">
            <span className="absolute left-9 sm:left-10 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 py-4 bg-transparent text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#6F6F6F]"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-5 gap-1.5 bg-[#F7F7F5] dark:bg-black/50">
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
                      ? 'bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] border-[#111111] dark:border-[#FFFFFF]' 
                      : 'bg-[#FFFFFF] dark:bg-[#111111] border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF]'
                  }`}
                >
                  {isSelected && (
                    <span className="shrink-0 mr-3 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[12px] font-bold uppercase tracking-widest mb-1 ${isSelected ? 'opacity-80' : 'text-[#6F6F6F]'}`}>
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
              <div className="text-center py-10 text-[13px] font-medium text-[#6F6F6F]">
                No subjects found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        title="SELECT DAY"
      >
        <div className="flex flex-col max-h-[60vh] sm:max-h-[50vh] overflow-y-auto -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 bg-[#F7F7F5] dark:bg-black/50 p-4 sm:p-5 gap-1.5 border-t border-[#D9D9D6] dark:border-[#333333]">
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
                    ? 'bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] border-[#111111] dark:border-[#FFFFFF]' 
                    : 'bg-[#FFFFFF] dark:bg-[#111111] border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF]'
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
