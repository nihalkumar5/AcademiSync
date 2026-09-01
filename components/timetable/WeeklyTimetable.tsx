'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DayOfWeek, ClassSession } from '@/lib/types';
import { DAYS_OF_WEEK, getCurrentDayOfWeek, timeToMinutes } from '@/lib/timetableUtils';
import { ClassCard } from './ClassCard';
import { AddEditClassModal } from './AddEditClassModal';
import { TimetableImportModal } from './TimetableImportModal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { Plus, Sparkles, CalendarDays, Share2, UserPlus, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { BatchMembersModal } from '@/components/batch/BatchMembersModal';
import { BatchDiscoveryModal } from '@/components/batch/BatchDiscoveryModal';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';

export const WeeklyTimetable: React.FC = () => {
  const { timetable, subjects, deleteClassSession, profile, isBatchCR, shareTimetableWithBatch, showToast, joinBatchTimetable, searchBatchTimetable, user } = useApp();
  const router = useRouter();
  const isSignedIn = !!user;

  const currentDay = getCurrentDayOfWeek();
  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(currentDay);
  const [editSession, setEditSession] = useState<ClassSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBatchMembersModal, setShowBatchMembersModal] = useState(false);
  const [showSetupBatchModal, setShowSetupBatchModal] = useState(false);
  const [targetAddDay, setTargetAddDay] = useState<DayOfWeek>('Monday');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const checkIsNow = (session: ClassSession) => {
    if (currentDay !== session.day) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = timeToMinutes(session.startTime);
    const endMins = timeToMinutes(session.endTime);
    return currentMins >= startMins && currentMins <= endMins;
  };

  const checkIsPast = (session: ClassSession) => {
    if (currentDay !== session.day) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const endMins = timeToMinutes(session.endTime);
    return currentMins > endMins;
  };

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const hasSundayClasses = timetable.some(session => session.day === 'Sunday');
  const weekDays = hasSundayClasses ? DAYS_OF_WEEK : DAYS_OF_WEEK.slice(0, 6); // Monday to Saturday (and Sunday if active)

  const handleAddForDay = (day: DayOfWeek) => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setTargetAddDay(day);
    setEditSession(null);
    setShowAddModal(true);
  };

  const handleImportTimetable = () => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setShowImportModal(true);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    const input = inviteInput.trim();
    if (!input) return;

    setIsJoining(true);
    let inviteKey = input;

    try {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const url = new URL(input);
        const inviteParam = url.searchParams.get('invite');
        if (inviteParam) {
          inviteKey = inviteParam;
        }
      }
    } catch (err) {
      console.error('Failed to parse URL:', err);
    }

    try {
      await joinBatchTimetable(inviteKey);
      setShowJoinModal(false);
      setInviteInput('');
    } catch (err) {
      console.error('Failed to join batch:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleEditSession = (session: ClassSession) => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setEditSession(session);
    setTargetAddDay(session.day);
    setShowAddModal(true);
  };

  return (
    <div className="flex flex-col gap-8 text-left">
      <div className="flex flex-col gap-6 mt-8 mb-4">
        <div>
          <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
            Weekly,<br />
            Schedule,<br />
            Timetable,<br />
            Classes
          </h2>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4">
            Manage your lectures, lab slots, and classroom locations.
          </p>
        </div>

        <div className="flex flex-col mt-4">
          <div className="flex flex-wrap items-center gap-3 mb-[24px]">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
            >
              Join Batch
            </button>
            <button
              type="button"
              onClick={handleImportTimetable}
              className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Magic Import
            </button>
            <button
              type="button"
              onClick={() => handleAddForDay(selectedMobileDay)}
              className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-none bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] hover:opacity-90 transition-opacity text-[13px] font-semibold cursor-pointer w-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Class
            </button>
          </div>

          {profile.isBatchSynced && profile.batchKey && (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-[#6F6F6F] uppercase mb-1.5">BATCH</span>
              <button
                onClick={() => setShowBatchMembersModal(true)}
                className="flex items-center justify-between p-4 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
                    {profile.programme} · {profile.branch?.replace(/AND ARTIFICIAL INTELLIGENCE/i, '& AI').replace(/ARTIFICIAL INTELLIGENCE/i, 'AI').replace(/\s*\(DS\s*&\s*AI\)/i, '')}
                  </span>
                  <span className="text-[12px] font-medium text-[#6F6F6F] uppercase">
                    YEAR {profile.year || 1} · MEMBERS
                  </span>
                </div>
                <span className="text-[#6F6F6F]">→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Day Tabs (< 768px) */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {weekDays.map((day) => {
          const isSelected = selectedMobileDay === day;
          const isToday = currentDay === day;
          const classCount = timetable.filter((s) => s.day === day).length;

          return (
            <button
              key={day}
              onClick={() => setSelectedMobileDay(day)}
              className={clsx(
                'flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all border',
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                  : 'glass-card text-slate-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={isSelected ? "font-bold" : "font-semibold"}>{day.slice(0, 3)}</span>
                {isToday && (
                  <span className={clsx('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-indigo-500')} />
                )}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium mt-0.5',
                  isSelected ? 'text-indigo-100' : 'text-slate-400'
                )}
              >
                {classCount} classes
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Schedule List (< 768px) */}
      <div className="flex md:hidden flex-col gap-3.5">
        {(() => {
          const sessions = timetable
            .filter((s) => s.day === selectedMobileDay)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          if (sessions.length === 0) {
            return (
              <EmptyState
                icon={<MonochromeIllustration type="no-classes" size={48} />}
                title={`NO CLASSES ON ${selectedMobileDay.toUpperCase()}`}
                description="Take a break or schedule a class manually."
                actionLabel="Add Class for this day"
                onAction={() => handleAddForDay(selectedMobileDay)}
              />
            );
          }

          return sessions.map((session) => (
            <ClassCard
              key={session.id}
              session={session}
              subject={subjectMap.get(session.subjectId)}
              onEdit={handleEditSession}
              onDelete={deleteClassSession}
              isCurrent={false}
            />
          ));
        })()}
      </div>

      {/* Desktop Weekly Grid (>= 768px) */}
      <div className="hidden md:grid grid-cols-5 gap-4 items-start">
        {weekDays.map((day) => {
          const isToday = currentDay === day;
          const daySessions = timetable
            .filter((s) => s.day === day)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          return (
            <div
              key={day}
              className={clsx(
                "flex flex-col gap-4 p-4 border transition-all rounded-none",
                isToday
                  ? "bg-[#F7F7F5] dark:bg-[#1E1E1E] border-[#111111] dark:border-[#FFFFFF]"
                  : "bg-[#FFFFFF] dark:bg-[#181818] border-[#D9D9D6] dark:border-[#2C2C2C]"
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between px-1 pb-3 border-b border-[#EEEEEC] dark:border-[#2C2C2C]">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold text-white bg-[#111111] dark:bg-[#FFFFFF] dark:text-[#111111] px-2 py-0.5 uppercase tracking-wider font-mono">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-[#6F6F6F] dark:text-[#999999]">
                    {daySessions.length} {daySessions.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                <button
                  onClick={() => handleAddForDay(day)}
                  className="p-1.5 border border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF] bg-white dark:bg-[#1A1A1A] transition-colors cursor-pointer"
                  title={`Add class to ${day}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Class Cards List */}
              <div className="flex flex-col gap-3 min-h-[400px]">
                {daySessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-[#D9D9D6] dark:border-[#2C2C2C]">
                    <CalendarDays className="w-6 h-6 text-[#888888] mb-2 opacity-50" />
                    <span className="text-xs font-semibold text-[#888888]">No Classes</span>
                    <button
                      onClick={() => handleAddForDay(day)}
                      className="mt-1.5 text-[11px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider underline cursor-pointer"
                    >
                      + Add class
                    </button>
                  </div>
                ) : (
                  daySessions.map((session) => (
                    <ClassCard
                      key={session.id}
                      session={session}
                      subject={subjectMap.get(session.subjectId)}
                      onEdit={handleEditSession}
                      onDelete={deleteClassSession}
                      isCurrent={false}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AddEditClassModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        sessionToEdit={editSession}
        defaultDay={targetAddDay}
      />

      <TimetableImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* BATCH DISCOVERY & JOIN MODAL */}
      <BatchDiscoveryModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        initialTab="code"
      />

      {/* BATCH MEMBERS MODAL */}
      <BatchMembersModal
        isOpen={showBatchMembersModal}
        onClose={() => setShowBatchMembersModal(false)}
        onJoinBatch={() => {
          setShowBatchMembersModal(false);
          setShowJoinModal(true);
        }}
      />

      {/* BATCH SETUP / CR REQUEST MODAL */}
      <BatchSetupPromptModal
        isOpen={showSetupBatchModal}
        onClose={() => setShowSetupBatchModal(false)}
        college={profile.college}
        programme={profile.programme}
        branch={profile.branch}
        semester={profile.semester}
        section={profile.section}
      />
    </div>
  );
};
