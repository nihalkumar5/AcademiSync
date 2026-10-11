'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTomorrowDayOfWeek, getTodayDateString, timeToMinutes } from '@/lib/timetableUtils';
import { aggregateFacultyWeeklyTimetable, AggregatedFacultySession } from '@/lib/facultyUtils';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacultyHeroHeader } from './FacultyHeroHeader';
import { FacultyLiveLectureCard } from './FacultyLiveLectureCard';
import { FacultyScheduleTimeline } from './FacultyScheduleTimeline';
import { FacultyAssignmentsCard } from './FacultyAssignmentsCard';
import { FacultyBatchesCard } from './FacultyBatchesCard';
import { ConnectBatchModal } from './ConnectBatchModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const FacultyHomeView: React.FC = () => {
  const { profile } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];

  const [isConnectBatchOpen, setIsConnectBatchOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [activeAssignmentsCount, setActiveAssignmentsCount] = useState(0);

  // Raw batch data stored by batchKey
  const [batchesTimetableData, setBatchesTimetableData] = useState<Record<string, any>>({});

  // Real-time listener for each connected batch's shared timetable doc
  useEffect(() => {
    if (linkedBatches.length === 0) {
      setBatchesTimetableData({});
      return;
    }

    const unsubs: (() => void)[] = [];

    linkedBatches.forEach((batch) => {
      const bRef = doc(db, 'shared_timetables', batch.batchKey);
      const unsub = onSnapshot(bRef, (snap) => {
        if (snap.exists()) {
          setBatchesTimetableData((prev) => ({
            ...prev,
            [batch.batchKey]: snap.data(),
          }));
        }
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches]);

  // 8:00 PM (20:00) switch: preview tomorrow's schedule like student dashboard
  const currentHour = new Date().getHours();
  const isAfter8PM = currentHour >= 20;

  const currentDay = getCurrentDayOfWeek();
  const tomorrowDay = getTomorrowDayOfWeek();
  const targetDay = isAfter8PM ? tomorrowDay : currentDay;

  // Aggregate sessions across all linked batches (strictly filtered to faculty's selected subjects)
  const allWeekSessions = aggregateFacultyWeeklyTimetable(linkedBatches, batchesTimetableData);
  const todaySessions = allWeekSessions[currentDay] || [];
  const tomorrowSessions = allWeekSessions[tomorrowDay] || [];

  const todayLecturesCount = todaySessions.filter((s) => !s.isCancelled).length;
  const tomorrowLecturesCount = tomorrowSessions.filter((s) => !s.isCancelled).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      {/* Faculty Hero Section */}
      <FacultyHeroHeader
        onOpenConnectBatch={() => setIsConnectBatchOpen(true)}
        onOpenCreateAssignment={() => setIsCreateAssignmentOpen(true)}
        todayLecturesCount={todayLecturesCount}
        tomorrowLecturesCount={tomorrowLecturesCount}
        isAfter8PM={isAfter8PM}
        activeAssignmentsCount={activeAssignmentsCount}
      />

      {/* Live / Next Lecture Today Card */}
      <FacultyLiveLectureCard
        aggregatedSessions={todaySessions}
        tomorrowSessions={tomorrowSessions}
        isAfter8PM={isAfter8PM}
        tomorrowDay={tomorrowDay}
      />

      {/* Teaching Timetable across Batches (Switches to Tomorrow's Schedule at 8:00 PM) */}
      <FacultyScheduleTimeline
        allWeekSessions={allWeekSessions}
        isAfter8PM={isAfter8PM}
        targetDay={targetDay}
      />

      {/* Assignments & Real-time Read-Tracking Hub */}
      <FacultyAssignmentsCard
        onOpenCreateModal={() => setIsCreateAssignmentOpen(true)}
        onAssignmentsCountChange={setActiveAssignmentsCount}
      />

      {/* Connected Batches Management */}
      <FacultyBatchesCard onOpenConnectModal={() => setIsConnectBatchOpen(true)} />

      {/* Modals */}
      <ConnectBatchModal
        isOpen={isConnectBatchOpen}
        onClose={() => setIsConnectBatchOpen(false)}
      />

      <CreateAssignmentModal
        isOpen={isCreateAssignmentOpen}
        onClose={() => setIsCreateAssignmentOpen(false)}
      />
    </div>
  );
};
