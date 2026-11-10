'use client';
// TEMP visual test for electives (moved to _to_delete after checking)
import React, { useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { AppContext, useApp } from '@/context/AppContext';
import { ElectivesHost, ElectivesPromptCard, ElectivesSummary } from '@/components/electives/Electives';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';
import { TodayTimeline } from '@/components/dashboard/TodayTimeline';
import { applyElectiveChoice, applyElectiveSetup, electiveLens, personalTimetable, ElectiveChoice } from '@/lib/electives';

const S = (id: string, name: string, extra: any = {}) => ({ id, name, code: '', shortName: '', facultyName: 'TBD', room: 'TBD', credits: 3, color: '', carryRequirements: [], ...extra });
const T = (id: string, subjectId: string, day: string, st: string, en: string, extra: any = {}) => ({ id, subjectId, day, startTime: st, endTime: en, room: 'LH-1', ...extra });
const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

const SUBS = [
  S('os', 'Operating Systems', { code: 'CS301', facultyName: 'Dr. Mehta', room: 'LH-1' }),
  S('ml', 'Machine Learning', { code: 'CS451', facultyName: 'Dr. Rao', room: 'LH-2', isElective: true }),
  S('cv', 'Computer Vision', { code: 'CS455', facultyName: 'Dr. Iyer', room: 'Lab 3', isElective: true }),
  S('nlp', 'Natural Language Processing', { facultyName: 'Dr. Sen', room: 'LH-4', isElective: true }),
  S('cc', 'Cloud Computing', { facultyName: 'Dr. Gupta', isElective: true, electiveSlot: 'Elective II' }),
  S('bc', 'Blockchain', { facultyName: 'Dr. Paul', isElective: true, electiveSlot: 'Elective II' }),
  S('min', 'Entrepreneurship Minor', { facultyName: 'Dr. Amit', room: 'Seminar Hall', isElective: true }),
  S('dm', 'Data Mining / Big Data', { facultyName: 'Dr. A / Dr. B' }),
];
const TT = [
  T('t1', 'os', today, '09:00', '09:55'),
  T('t2', 'ml', today, '10:00', '10:55'), T('t3', 'cv', today, '10:00', '11:55'), T('t4', 'nlp', today, '10:00', '10:55'),
  T('t5', 'ml', 'Wednesday', '11:00', '11:55'), T('t6', 'cv', 'Wednesday', '11:00', '11:55'), T('t7', 'nlp', 'Wednesday', '11:00', '11:55'),
  T('t8', 'cc', today, '14:00', '14:55'), T('t9', 'bc', 'Thursday', '15:00', '15:55'),
  T('t10', 'min', 'Friday', '16:00', '17:55'),
  T('t11', 'dm', 'Monday', '12:00', '12:55'),
];

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ElectivesTest />;
}

function ElectivesTest() {
  const base = useApp() as any;
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => setMounted(true), []);
  const [subs, setSubs] = useState<any[]>(SUBS);
  const [tt, setTt] = useState<any[]>(TT);
  const [choice, setChoice] = useState<ElectiveChoice>({});
  const lens = useMemo(() => electiveLens(subs, tt, choice), [subs, tt, choice]);
  const my = useMemo(() => personalTimetable(tt, lens), [tt, lens]);
  const value = {
    ...base,
    profile: { ...base.profile, ...choice, role: 'student', onboardingCompleted: true, batchKey: 'electives-test', isBatchSynced: true },
    subjects: subs,
    timetable: tt,
    myTimetable: my,
    myExtraSessions: {},
    extraSessions: {},
    electiveGroups: lens.groups,
    pendingElectives: lens.pending,
    isSubjectMine: lens.isMine,
    canSetUpElectives: true,
    currentBatchData: { ...(base.currentBatchData || {}), timetable: tt },
    chooseElective: (k: string, id: string | null) => {
      const g = lens.groups.find((x) => x.key === k);
      if (g) setChoice((c) => applyElectiveChoice(c, g, id));
    },
    saveElectiveSetup: (plan: any) => {
      const out = applyElectiveSetup(subs, tt, plan, () => '#4F7CAC', tt);
      setSubs(out.subjects);
      setTt(out.timetable);
    },
  };
  if (!mounted) return null;
  return (
    <AppContext.Provider value={value}>
      <div className="max-w-xl mx-auto p-4 flex flex-col gap-6 bg-canvas min-h-screen overflow-x-hidden">
        <ElectivesPromptCard />
        <ElectivesSummary />
        <TodayTimeline />
        <WeeklyTimetable />
        <ElectivesHost />
      </div>
    </AppContext.Provider>
  );
}
