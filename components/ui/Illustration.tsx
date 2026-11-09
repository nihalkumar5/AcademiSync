'use client';

import React from 'react';

// Spot illustrations: duopulse "Occupation" pack (free, supplied by the project owner), full-colour
// variants (black ink + teal/coral accents), viewBox cropped to the figure. Static files in public/illustrations.
// Dark mode: invert turns the ink white and hue-rotate(180deg) turns the accents back to their own colours.
export type IllustrationName =
  | 'no-classes'
  | 'tasks-done'
  | 'exam'
  | 'bag'
  | 'holiday'
  | 'calendar'
  | 'notifications'
  | 'subjects'
  | 'attendance'
  | 'launch'
  | 'papers'
  | 'trophy'
  | 'mess'
  | 'routines'
  | 'free-day'
  | 'notes'
  | 'signin'
  | 'friends'
  | 'search'
  | 'error'
  | 'setup'
  | 'pilot';

const ALT: Record<IllustrationName, string> = {
  'no-classes': 'Someone listening to music with headphones',
  'tasks-done': 'Someone cheering with streamers',
  exam: 'Someone carrying a tall stack of books',
  bag: 'Someone with a backpack and a coffee',
  holiday: 'Someone relaxing on a beach chair under the sun',
  calendar: 'Someone working on a laptop',
  notifications: 'Someone making an announcement with a megaphone',
  subjects: 'Someone with an open book and a pencil',
  attendance: 'A teacher presenting to the class',
  launch: 'Someone launching a paper plane out of a screen',
  papers: 'Someone reading a long sheet of paper with a coffee',
  trophy: 'Someone holding a trophy',
  mess: 'Someone serving two hot drinks',
  routines: 'Someone looking after potted plants',
  'free-day': 'Someone playing an electric guitar',
  notes: 'Someone taking a photo with a camera',
  signin: 'Someone at a laptop with a new message',
  friends: 'Someone taking a selfie and making a peace sign',
  search: 'Someone thinking, with a question mark',
  error: 'Someone frustrated, with a red cross on their shirt',
  setup: 'Someone in front of a flowchart',
  pilot: 'Someone with a microphone reaching out a hand',
};

export const Illustration: React.FC<{ name: IllustrationName; className?: string; decorative?: boolean }> = ({
  name,
  className = '',
  decorative = true,
}) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={`/illustrations/${name}.svg`}
    alt={decorative ? '' : ALT[name]}
    aria-hidden={decorative || undefined}
    draggable={false}
    loading="lazy"
    className={`select-none pointer-events-none object-contain dark:invert dark:hue-rotate-180 dark:opacity-95 ${className}`}
  />
);
