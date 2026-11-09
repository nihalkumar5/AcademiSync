'use client';

import { requestSignIn } from '@/components/auth/SignInPrompt';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DayOfWeek, ClassSession, Subject } from '@/lib/types';
import { DAYS_OF_WEEK, getCurrentDayOfWeek, timeToMinutes, deduplicateTimetableSessions } from '@/lib/timetableUtils';
import { ClassCard } from './ClassCard';
import { AddEditClassModal } from './AddEditClassModal';
import { TimetableImportModal } from './TimetableImportModal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { Plus, Sparkles, CalendarDays, Share2, UserPlus, Users } from '@/components/ui/icons';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { BatchMembersModal } from '@/components/batch/BatchMembersModal';
import { BatchDiscoveryModal } from '@/components/batch/BatchDiscoveryModal';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';
import { FacultyWeeklyTimetable } from '@/components/faculty/FacultyWeeklyTimetable';
import { openClassNotes, dateOfWeekday } from '@/lib/classNotes';
import { ElectivePendingCard, ElectivesSummary } from '@/components/electives/Electives';
import { formatTime12Hour } from '@/lib/timetableUtils';
import type { PersonalSession } from '@/lib/electives';

export const WeeklyTimetable: React.FC = () => {
  const { profile } = useApp();
  // Faculty see only their own subjects across connected batches
  return profile?.role === 'faculty' ? <FacultyWeeklyTimetable /> : <StudentWeeklyTimetable />;
};

const StudentWeeklyTimetable: React.FC = () => {
  const { myTimetable, subjects, deleteClassSession, profile, isBatchCR, shareTimetableWithBatch, showToast, joinBatchTimetable, searchBatchTimetable, user, setActiveView } = useApp();
  const router = useRouter();
  const isSignedIn = !!user;

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Notes & snaps for a class: linked to its subject and this week's date for that day
  const notesFor = (session: ClassSession, day: string) => {
    const sub = getSubjectForSession(session);
    openClassNotes({
      subjectId: sub?.id || session.subjectId || `name:${(session.subjectName || 'class').toLowerCase()}`,
      subjectName: sub?.name || session.subjectName || 'Class',
      date: dateOfWeekday(day),
      startTime: session.startTime,
      endTime: session.endTime,
      room: session.room,
    });
  };

  const getSubjectForSession = (session: ClassSession): Subject | undefined => {
    if (session.subjectId && subjectMap.has(session.subjectId)) {
      return subjectMap.get(session.subjectId);
    }
    // 1. Fallback: match strictly by subjectName
    const sessSubName = (session as any).subjectName?.trim().toLowerCase();
    if (sessSubName) {
      const match = subjects.find(s => s.name && s.name.trim().toLowerCase() === sessSubName);
      if (match) return match;
    }
    // 2. Fallback: match by multi-character course code (e.g. CS101, not single-letter slot codes like C, F)
    const sessSubCode = (session as any).subjectCode?.trim().toLowerCase();
    if (sessSubCode && sessSubCode.length > 2) {
      const match = subjects.find(s => s.code && s.code.trim().toLowerCase() === sessSubCode);
      if (match) return match;
    }
    return undefined;
  };

  // The student's own week: their electives only; a slot they haven't picked shows once (lib/electives.ts)
  const activeTimetable = deduplicateTimetableSessions(myTimetable).cleaned as PersonalSession[];

  const currentDay = getCurrentDayOfWeek();
  
  // Only show days that have classes scheduled; fallback to Monday-Friday if timetable is empty
  const activeDaysWithClasses = DAYS_OF_WEEK.filter(day => 
    activeTimetable.some(session => session.day === day)
  );
  const weekDays = activeDaysWithClasses.length > 0 ? activeDaysWithClasses : DAYS_OF_WEEK.slice(0, 5);

  const initialDay = weekDays.includes(currentDay) ? currentDay : weekDays[0] || 'Monday';
  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(initialDay);

  // Sync selectedMobileDay if timetable changes and current selection is not in weekDays
  React.useEffect(() => {
    if (!weekDays.includes(selectedMobileDay)) {
      setSelectedMobileDay(weekDays.includes(currentDay) ? currentDay : weekDays[0] || 'Monday');
    }
  }, [activeTimetable, weekDays, currentDay, selectedMobileDay]);
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

  const handleAddForDay = (day: DayOfWeek) => {
    if (!isSignedIn) {
      requestSignIn({ title: 'Sign in to edit your timetable', body: 'Your classes are saved to your account, so they are on every device and reminders keep working.' });
      return;
    }
    setTargetAddDay(day);
    setEditSession(null);
    setShowAddModal(true);
  };

  const handleImportTimetable = () => {
    if (!isSignedIn) {
      requestSignIn({ title: 'Sign in to edit your timetable', body: 'Your classes are saved to your account, so they are on every device and reminders keep working.' });
      return;
    }
    setShowImportModal(true);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      requestSignIn({
        title: 'Sign in to join your class',
        body: 'Joining puts you on your class list, so your timetable arrives ready and every change your CR makes reaches you.',
        beforeSignIn: () => {
          if (inviteInput.trim()) localStorage.setItem('pending_join_invite', inviteInput.trim());
        },
      });
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

  const canModifySession = (session: ClassSession) => {
    if (session.isPersonal) return true;
    if (!profile.isBatchSynced) return true;
    return isBatchCR;
  };

  const handleEditSession = (session: ClassSession) => {
    if (!isSignedIn) {
      requestSignIn({ title: 'Sign in to edit your timetable', body: 'Your classes are saved to your account, so they are on every device and reminders keep working.' });
      return;
    }
    if (!canModifySession(session)) {
      showToast('Official Batch Class', 'Official batch classes can only be modified by the Batch Pilot.', 'info');
      return;
    }
    setEditSession(session);
    setTargetAddDay(session.day);
    setShowAddModal(true);
  };

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left">
      <div className="flex flex-col gap-f4">
        {/* Editorial stacked header, same as Tasks */}
        <div>
          <h2 className="page-title">
            Timetable,<br />Classes,<br />Labs
          </h2>
          <div className="flex items-center gap-3 mt-5">
            <span className="tag bg-surface">
              {activeTimetable.length} {activeTimetable.length === 1 ? 'class' : 'classes'} a week
            </span>
          </div>
          <p className="text-[14px] font-normal text-muted leading-[20px] mt-4 max-w-md">
            Manage your lectures, lab slots, and classroom locations.
          </p>
        </div>

        <div className="flex flex-col mt-2">
          <div className="page-actions mb-[20px]">
            <button
              type="button"
              onClick={() => handleAddForDay(selectedMobileDay)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Class
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary"
            >
              Join Batch
            </button>
            <button
              type="button"
              onClick={handleImportTimetable}
              className="btn btn-secondary"
            >
              <Sparkles className="w-4 h-4" /> Magic Import
            </button>
          </div>

          {profile.isBatchSynced && profile.batchKey && (
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-muted mb-1.5">Batch</span>
              <button
                onClick={() => setShowBatchMembersModal(true)}
                className="flex items-center justify-between p-3.5 bg-surface border border-line hover:bg-surface-2 transition-colors text-left cursor-pointer rounded-none"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-fg uppercase tracking-wide">
                    {profile.programme} · {profile.branch?.replace(/AND ARTIFICIAL INTELLIGENCE/i, '& AI').replace(/ARTIFICIAL INTELLIGENCE/i, 'AI').replace(/\s*\(DS\s*&\s*AI\)/i, '')}
                  </span>
                  <span className="text-[12px] font-medium text-muted font-mono">
                    YEAR {profile.year || 1} · MEMBERS
                  </span>
                </div>
                <span className="text-muted">→</span>
              </button>
            </div>
          )}
          <div className={profile.isBatchSynced && profile.batchKey ? 'mt-f3' : ''}>
            <ElectivesSummary />
          </div>
        </div>
      </div>

      {/* Mobile Day Tabs (< 768px) */}
      <div className="flex md:hidden items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {weekDays.map((day) => {
          const isSelected = selectedMobileDay === day;
          const isToday = currentDay === day;
          const classCount = activeTimetable.filter((s) => s.day === day).length;

          return (
            <button
              key={day}
              onClick={() => setSelectedMobileDay(day)}
              className={clsx(
                'flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 rounded-[3px] transition-all border cursor-pointer',
                isSelected
                  ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                  : 'bg-surface border-[#E5E5E0] dark:border-white/[0.08] text-fg hover:bg-surface-2'
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-[13px] font-bold tracking-tight">{day.slice(0, 3)}</span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#18A889] shrink-0" />
                )}
              </div>
              <span
                className={clsx(
                  'text-[11px] font-normal mt-0.5 tracking-tight',
                  isSelected ? 'text-white/70' : 'text-muted'
                )}
              >
                {classCount} {classCount === 1 ? 'class' : 'classes'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Schedule List (< 768px) */}
      <div className="flex md:hidden flex-col gap-3.5">
        {(() => {
          const sessions = activeTimetable
            .filter((s) => s.day === selectedMobileDay)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          if (sessions.length === 0) {
            return (
              <EmptyState
                illustration="free-day"
                title={`No classes on ${selectedMobileDay}`}
                description="Take a break or schedule a class manually."
                actionLabel="Add Class for this day"
                onAction={() => handleAddForDay(selectedMobileDay)}
              />
            );
          }

          return sessions.map((session) =>
            session.electivePending ? (
              <ElectivePendingCard key={session.id} mark={session.electivePending} time={`${formatTime12Hour(session.startTime)} – ${formatTime12Hour(session.endTime)}`} />
            ) : (
            <ClassCard
              key={session.id}
              session={session}
              subject={getSubjectForSession(session)}
              onEdit={handleEditSession}
              onDelete={deleteClassSession}
              isCurrent={false}
              canModify={canModifySession(session)}
              onNotes={() => notesFor(session, selectedMobileDay)}
            />
            )
          );
        })()}
      </div>

      {/* Desktop Weekly Grid (>= 768px) */}
      <div 
        className="hidden md:grid gap-4 items-start"
        style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
      >
        {weekDays.map((day) => {
          const isToday = currentDay === day;
          const daySessions = activeTimetable
            .filter((s) => s.day === day)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          return (
            <div
              key={day}
              className={clsx(
                "flex flex-col gap-4 p-4 border transition-all rounded-none",
                isToday
                  ? "bg-surface border-[#111111] dark:border-emerald-500/40 dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.12)] shadow-xs"
                  : "bg-surface border-line"
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between px-1 pb-3 border-b border-line-soft">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold tracking-tight text-fg">
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[12px] font-bold text-white dark:text-emerald-400 bg-[#111111] dark:bg-emerald-500/20 dark:border dark:border-emerald-500/30 px-2 py-0.5 font-mono">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-muted">
                    {daySessions.length} {daySessions.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                <button
                  onClick={() => handleAddForDay(day)}
                  className="p-1.5 border border-line hover:border-line-strong text-fg bg-white dark:bg-white/[0.04] hover:dark:bg-white/[0.08] transition-colors cursor-pointer"
                  title={`Add class to ${day}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Class Cards List */}
              <div className="flex flex-col gap-3 min-h-[400px]">
                {daySessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-surface-2 border border-dashed border-line">
                    <CalendarDays className="w-6 h-6 text-[#6B6B6B] mb-2 opacity-50" />
                    <span className="text-xs font-semibold text-muted">No Classes</span>
                    <button
                      onClick={() => handleAddForDay(day)}
                      className="mt-1.5 text-[12px] font-bold text-fg underline cursor-pointer"
                    >
                      + Add class
                    </button>
                  </div>
                ) : (
                  daySessions.map((session) =>
                    session.electivePending ? (
                      <ElectivePendingCard key={session.id} mark={session.electivePending} time={`${formatTime12Hour(session.startTime)} – ${formatTime12Hour(session.endTime)}`} className="p-4" />
                    ) : (
                    <ClassCard
                      key={session.id}
                      session={session}
                      subject={getSubjectForSession(session)}
                      onEdit={handleEditSession}
                      onDelete={deleteClassSession}
                      isCurrent={false}
                      canModify={canModifySession(session)}
                      onNotes={() => notesFor(session, day)}
                    />
                    )
                  )
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
