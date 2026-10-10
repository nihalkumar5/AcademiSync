'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTodayDateString, timeToMinutes } from '@/lib/timetableUtils';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacultyHeroHeader } from './FacultyHeroHeader';
import { FacultyLiveLectureCard, AggregatedFacultySession } from './FacultyLiveLectureCard';
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

  // Aggregate sessions across all linked batches
  const currentDay = getCurrentDayOfWeek();
  const todayStr = getTodayDateString();

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Group all sessions across week
  const allWeekSessions: Record<DayOfWeek, AggregatedFacultySession[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  linkedBatches.forEach((batch) => {
    const bData = batchesTimetableData[batch.batchKey];
    if (!bData) return;

    const timetable: ClassSession[] = Array.isArray(bData.timetable) ? bData.timetable : [];
    const subjectsList: Subject[] = Array.isArray(bData.subjects) ? bData.subjects : [];
    const cancelledList: string[] = Array.isArray(bData.cancelledSessions) ? bData.cancelledSessions : [];

    timetable.forEach((session) => {
      // Check if this faculty teaches this subject in this batch
      if (batch.selectedSubjectIds.includes(session.subjectId)) {
        const sub = subjectsList.find((s) => s.id === session.subjectId);
        const subjectName = sub?.name || sub?.shortName || session.subjectName || 'Subject';
        const subjectCode = sub?.code || session.subjectCode || '';

        const cancelKey = `${todayStr}_${session.id}`;
        const isCancelled = cancelledList.includes(cancelKey);

        const startMin = timeToMinutes(session.startTime);
        const endMin = timeToMinutes(session.endTime);

        const isLive = session.day === currentDay && currentMinutes >= startMin && currentMinutes < endMin && !isCancelled;
        const isUpcoming = session.day === currentDay && currentMinutes < startMin && !isCancelled;
        const minutesUntilStart = startMin - currentMinutes;

        const agg: AggregatedFacultySession = {
          session,
          batch,
          subjectName,
          subjectCode,
          isCancelled,
          isLive,
          isUpcoming,
          minutesUntilStart,
        };

        if (allWeekSessions[session.day]) {
          allWeekSessions[session.day].push(agg);
        }
      }
    });
  });

  // Sort each day's sessions by start time
  ALL_DAYS.forEach((day) => {
    allWeekSessions[day].sort(
      (a, b) => timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime)
    );
  });

  const todaySessions = allWeekSessions[currentDay] || [];
  const todayLecturesCount = todaySessions.filter((s) => !s.isCancelled).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      {/* Faculty Hero Section */}
      <FacultyHeroHeader
        onOpenConnectBatch={() => setIsConnectBatchOpen(true)}
        onOpenCreateAssignment={() => setIsCreateAssignmentOpen(true)}
        todayLecturesCount={todayLecturesCount}
        activeAssignmentsCount={activeAssignmentsCount}
      />

      {/* Live / Next Lecture Today Card */}
      <FacultyLiveLectureCard aggregatedSessions={todaySessions} />

      {/* Teaching Timetable across Batches */}
      <FacultyScheduleTimeline allWeekSessions={allWeekSessions} />

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
