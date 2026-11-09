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
  | 'attendance';

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
