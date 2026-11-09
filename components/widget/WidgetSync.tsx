'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { syncWidget } from '@/lib/widget';

// Keeps the Android home-screen widget in step with the timetable. Renders nothing.
export const WidgetSync: React.FC = () => {
  const app = useApp() as any;
  const { timetable, subjects, cancelledSessions, rescheduledSessions, extraSessions, events, exams } = app;

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
