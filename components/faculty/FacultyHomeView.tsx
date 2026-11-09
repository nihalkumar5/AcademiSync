'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ClassSession, DayOfWeek, FacultyLinkedBatch, Subject } from '@/lib/types';
import { getCurrentDayOfWeek, getTomorrowDayOfWeek, getTodayDateString, timeToMinutes } from '@/lib/timetableUtils';
import { aggregateFacultyWeeklyTimetable, AggregatedFacultySession } from '@/lib/facultyUtils';
import { doc, getDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacultyHeroHeader } from './FacultyHeroHeader';
import { FacultyLiveLectureCard } from './FacultyLiveLectureCard';
import { FacultySmartFocusList } from './FacultySmartFocusList';
import { HomeRoutinesCard } from '@/components/routines/HomeRoutinesCard';
import { ConnectBatchModal } from './ConnectBatchModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const FacultyHomeView: React.FC = () => {
  const { profile, user } = useApp();
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
      const unsub = onSnapshot(
        bRef,
        (snap) => {
          if (snap.exists()) {
            setBatchesTimetableData((prev) => ({
              ...prev,
              [batch.batchKey]: snap.data(),
            }));
          }
        },
        (err) => console.warn(`Could not load batch ${batch.batchCode || batch.batchKey}:`, err)
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches]);

  // Real-time assignment count listener for header stat badge
  useEffect(() => {
    if (linkedBatches.length === 0) {
      setActiveAssignmentsCount(0);
      return;
    }

    const unsubs: (() => void)[] = [];
    const tasksByBatch: Record<string, number> = {};

    linkedBatches.forEach((batch) => {
      const propRef = collection(db, 'shared_timetables', batch.batchKey, 'proposed_tasks');
      const q = query(propRef);
      const unsub = onSnapshot(
        q,
        (snap) => {
          let count = 0;
          const now = Date.now();
          snap.forEach((d) => {
            const data = d.data();
            const mine = user?.id ? data.creatorId === user.id : data.isFacultyAssignment || data.creatorRole === 'faculty';
            const open = !data.deadline || new Date(data.deadline).getTime() >= now;
            if (mine && open) count++;
          });
          tasksByBatch[batch.batchKey] = count;
          const total = Object.values(tasksByBatch).reduce((a, b) => a + b, 0);
          setActiveAssignmentsCount(total);
        },
        (err) => {
          console.warn('Error listening to batch assignments count:', err);
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches, user?.id]);

  // 8:00 PM (20:00) switch: preview tomorrow's schedule like student dashboard
  const currentHour = new Date().getHours();
  const isAfter8PM = currentHour >= 20;

  const currentDay = getCurrentDayOfWeek();
  const tomorrowDay = getTomorrowDayOfWeek();
  const targetDay = isAfter8PM ? tomorrowDay : currentDay;

  // Aggregate sessions across all linked batches (strictly filtered to faculty's selected subjects)
  // Re-check every minute so live/finished lectures and labs update without a refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const allWeekSessions = aggregateFacultyWeeklyTimetable(linkedBatches, batchesTimetableData);
  const todaySessions = allWeekSessions[currentDay] || [];
  const tomorrowSessions = allWeekSessions[tomorrowDay] || [];

  const todayLecturesCount = todaySessions.filter((s) => !s.isCancelled).length;
  const tomorrowLecturesCount = tomorrowSessions.filter((s) => !s.isCancelled).length;

  const hasBatches = linkedBatches.length > 0;

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 w-full max-w-full overflow-x-hidden">
      <FacultyHeroHeader
        onOpenConnectBatch={() => setIsConnectBatchOpen(true)}
        onOpenCreateAssignment={() => setIsCreateAssignmentOpen(true)}
        todayLecturesCount={todayLecturesCount}
        tomorrowLecturesCount={tomorrowLecturesCount}
        isAfter8PM={isAfter8PM}
        activeAssignmentsCount={activeAssignmentsCount}
      />

      {hasBatches ? (
        <>
          <FacultyLiveLectureCard
            aggregatedSessions={todaySessions}
            tomorrowSessions={tomorrowSessions}
            isAfter8PM={isAfter8PM}
            tomorrowDay={tomorrowDay}
          />
          <FacultySmartFocusList targetSessions={isAfter8PM ? tomorrowSessions : todaySessions} isAfter8PM={isAfter8PM} />
          <HomeRoutinesCard />
        </>
      ) : (
        // First run: everything (timetable, assignments, alerts) depends on linking a batch, so that is the only action
        <section className="sheen-ink relative overflow-hidden bg-[#111111] dark:bg-[#15171D] dark:border dark:border-white/[0.08] text-white p-f4 sm:p-f5">
          <p className="text-[12px] font-semibold text-white/60">Get started</p>
          <h3 className="mt-2 text-[24px] sm:text-[28px] font-semibold leading-tight tracking-tight">Connect your first batch</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-white/70 max-w-md">
            Your teaching timetable, assignments and class alerts all come from the batches you link.
          </p>
          <ol className="mt-f4 flex flex-col gap-f3">
            {[
              ['Get the 6-character batch code', "The class's batch pilot can share it from their app."],
              ['Pick the subjects you teach', 'Only those lectures show up in your timetable.'],
              ['Teach, post and update', 'Assignments, cancellations and reschedules reach every student instantly.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-f3">
                <span className="w-7 h-7 shrink-0 flex items-center justify-center border border-white/25 text-[13px] font-semibold tabular-nums">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-medium">{title}</span>
                  <span className="block text-[13px] text-white/60">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setIsConnectBatchOpen(true)}
            className="mt-f5 inline-flex items-center gap-2 h-11 px-5 bg-white text-[#111111] text-[14px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            Enter batch code
          </button>
          <p className="mt-f3 font-cursive text-[21px] leading-tight font-semibold text-white/80 -rotate-1">Takes less than a minute ✌</p>
        </section>
      )}

      {/* Modals */}
      <ConnectBatchModal
        isOpen={isConnectBatchOpen}
        onClose={() => setIsConnectBatchOpen(false)}
      />

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isCreateAssignmentOpen}
        onClose={() => setIsCreateAssignmentOpen(false)}
      />
    </div>
  );
};
