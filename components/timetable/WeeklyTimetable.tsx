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
import { Plus, Upload, CalendarDays, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useClerk, useUser } from '@clerk/nextjs';

export const WeeklyTimetable: React.FC = () => {
  const { timetable, subjects, deleteClassSession } = useApp();
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
    <div className="flex flex-col gap-6 text-left">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
            Weekly Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
            Manage your lectures, lab slots, and classroom locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportTimetable}
            className="gap-1.5 rounded-xl border-slate-300 dark:border-zinc-700 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>AI Import</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAddForDay(selectedMobileDay)}
            className="gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </Button>
        </div>
      </div>

      {/* Mobile Day Tabs (< 768px) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {weekDays.map((day) => {
          const isSelected = selectedMobileDay === day;
          const isToday = currentDay === day;
          const classCount = timetable.filter((s) => s.day === day).length;

          return (
            <button
              key={day}
              onClick={() => setSelectedMobileDay(day)}
              className={clsx(
                'flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all border shadow-sm',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span>{day.slice(0, 3)}</span>
                {isToday && (
                  <span className={clsx('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-blue-500')} />
                )}
              </div>
              <span
                className={clsx(
                  'text-[10.5px] font-mono mt-0.5',
                  isSelected ? 'text-blue-100' : 'text-slate-400'
                )}
              >
                {classCount} classes
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Schedule List (< 768px) */}
      <div className="flex md:hidden flex-col gap-3">
        {(() => {
          const sessions = timetable
            .filter((s) => s.day === selectedMobileDay)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          if (sessions.length === 0) {
            return (
              <EmptyState
                icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
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
              isCurrent={checkIsNow(session)}
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
              className={`flex flex-col gap-3 p-3.5 rounded-2xl border transition-all shadow-sm ${
                isToday
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 ring-2 ring-blue-500/10'
                  : 'bg-white/90 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleAddForDay(day)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  title={`Add class to ${day}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Class Cards List */}
              <div className="flex flex-col gap-2.5 min-h-[380px]">
                {daySessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                    <span className="text-xs font-medium">Free Day</span>
                    <button
                      onClick={() => handleAddForDay(day)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      + Add lecture
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
                      isCurrent={checkIsNow(session)}
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
