'use client';

import { surelyMine } from '@/lib/electives';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { syncWidget } from '@/lib/widget';

// Keeps the Android home-screen widget in step with the timetable. Renders nothing.
export const WidgetSync: React.FC = () => {
  const app = useApp() as any;
  // The student's own week (their electives only; unpicked slots wait until they pick)
  const { myTimetable, subjects, cancelledSessions, rescheduledSessions, myExtraSessions: extraSessions, events, exams } = app;
  const timetable = React.useMemo(() => surelyMine(myTimetable || []), [myTimetable]);

  useEffect(() => {
    const run = () =>
      syncWidget({
        timetable: timetable || [],
        subjects: subjects || [],
        cancelled: Array.isArray(cancelledSessions) ? cancelledSessions : [],
        rescheduled: rescheduledSessions || {},
        extras: extraSessions || {},
        events: events || [],
        exams: exams || [],
      });
    const t = setTimeout(run, 800);
    // A new day starts a new 7-day window
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timetable, subjects, cancelledSessions, rescheduledSessions, extraSessions, events, exams]);

  return null;
};
