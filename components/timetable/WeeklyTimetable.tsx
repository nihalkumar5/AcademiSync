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
import { Plus, Sparkles, CalendarDays, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useClerk, useUser } from '@clerk/nextjs';

export const WeeklyTimetable: React.FC = () => {
  const { timetable, subjects, deleteClassSession, profile, shareTimetableWithBatch, showToast } = useApp();
  const { isSignedIn } = useUser();
  const clerk = useClerk();

  const currentDay = getCurrentDayOfWeek();
  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(currentDay);
  const [editSession, setEditSession] = useState<ClassSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [targetAddDay, setTargetAddDay] = useState<DayOfWeek>('Monday');

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
  const weekDays = DAYS_OF_WEEK.slice(0, 5); // Monday to Friday

  const handleAddForDay = (day: DayOfWeek) => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    setTargetAddDay(day);
    setEditSession(null);
    setShowAddModal(true);
  };

  const handleImportTimetable = () => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    setShowImportModal(true);
  };

  const handleEditSession = (session: ClassSession) => {
    if (!isSignedIn) {
      clerk.openSignIn();
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
          <h2 className="text-5xl sm:text-7xl font-medium text-black dark:text-white tracking-tighter leading-[1.1]">
            Weekly,<br />
            Schedule,<br />
            Timetable,<br />
            Classes
          </h2>
          <p className="text-lg text-black/70 dark:text-white/70 mt-6 max-w-sm leading-snug">
            Manage your lectures, lab slots, and classroom locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="md"
            onClick={handleImportTimetable}
            className="rounded-none border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            Magic Import
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={async () => {
              if (!isSignedIn) {
                clerk.openSignIn();
                return;
              }
              try {
                if (profile.isBatchSynced && profile.batchKey) {
                  const link = `${window.location.origin}/?invite=${profile.batchKey}`;
                  navigator.clipboard.writeText(link);
                  showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');
                } else {
                  const code = await shareTimetableWithBatch();
                  const link = `${window.location.origin}/?invite=${code}`;
                  navigator.clipboard.writeText(link);
                  showToast('Timetable Shared', 'Invite link copied to clipboard!', 'success');
                }
              } catch (err) {}
            }}
            className="rounded-none border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Share Batch
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => handleAddForDay(selectedMobileDay)}
            className="rounded-none bg-black text-white dark:bg-white dark:text-black border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors"
          >
            Add Class
          </Button>
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
                icon={<CalendarDays className="w-6 h-6 text-indigo-400" />}
                title={`No classes on ${selectedMobileDay}`}
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
                "flex flex-col gap-4 p-4 rounded-3xl transition-all",
                isToday
                  ? "hero-mesh-card ring-1 ring-indigo-500/20"
                  : "glass-card"
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-sm font-bold",
                      isToday ? "text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-zinc-100"
                    )}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full shadow-sm">
                        Today
                      </span>
                    )}
                  </div>
                  <span className={clsx(
                    "text-[11px] font-medium",
                    isToday ? "text-indigo-700/80 dark:text-indigo-300/80" : "text-slate-500 dark:text-zinc-400"
                  )}>
                    {daySessions.length} classes
                  </span>
                </div>

                <button
                  onClick={() => handleAddForDay(day)}
                  className={clsx(
                    "p-1.5 rounded-xl transition-colors shrink-0",
                    isToday
                      ? "bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600/20 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
                      : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700"
                  )}
                  title={`Add class to ${day}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Class Cards List */}
              <div className="flex flex-col gap-3 min-h-[400px]">
                {daySessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-white/40 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800/80">
                    <CalendarDays className="w-6 h-6 text-slate-300 dark:text-zinc-600 mb-2" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Free Day</span>
                    <button
                      onClick={() => handleAddForDay(day)}
                      className="mt-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-600"
                    >
                      Add class
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
    </div>
  );
};
