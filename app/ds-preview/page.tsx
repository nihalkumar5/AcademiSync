'use client';
// TEMPORARY design preview. Delete before committing.
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { IllustrationName } from '@/components/ui/Illustration';
const items: [IllustrationName, string, string][] = [
  ['no-classes', 'No classes today', 'Nothing on the timetable. Enjoy the free day.'],
  ['tasks-done', "You're all caught up", 'No pending homework or submissions.'],
  ['exam', 'No exams scheduled', 'Scan your exam timetable or add exams one by one.'],
  ['notifications', 'All caught up', "You don't have any new notifications."],
  ['subjects', 'No subjects yet', 'Add your courses to see faculty and rooms.'],
  ['holiday', 'No packing needed', 'Tomorrow is a campus holiday. Enjoy the break.'],
];
export default function Page() {
  return (<main className="max-w-[420px] mx-auto px-f4 py-f4">{items.map(([n, t, d]) => (<EmptyState key={n} illustration={n} title={t} description={d} actionLabel={n === 'subjects' ? 'Add subject' : undefined} onAction={() => {}} />))}</main>);
}
