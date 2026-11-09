'use client';

import React, { useState } from 'react';

// Colourful 3D icons from Microsoft's Fluent Emoji set (MIT licence), served from jsDelivr so they look
// the same on every phone (native emoji are flat on Android). If an image can't load, the native emoji shows.
const CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';

// name → [Fluent asset path, emoji fallback]
export const ICONS_3D = {
  books: ['Books/3D/books_3d.png', '📚'],
  memo: ['Memo/3D/memo_3d.png', '📝'],
  shoe: ['Running shoe/3D/running_shoe_3d.png', '👟'],
  droplet: ['Droplet/3D/droplet_3d.png', '💧'],
  bell: ['Bell/3D/bell_3d.png', '🔔'],
  sparkles: ['Sparkles/3D/sparkles_3d.png', '✨'],
  biceps: ['Flexed biceps/Default/3D/flexed_biceps_3d_default.png', '💪'],
  moon: ['Crescent moon/3D/crescent_moon_3d.png', '🌙'],
  openBook: ['Open book/3D/open_book_3d.png', '📖'],
  spiralCalendar: ['Spiral calendar/3D/spiral_calendar_3d.png', '🗓️'],
  laptop: ['Laptop/3D/laptop_3d.png', '💻'],
  page: ['Page facing up/3D/page_facing_up_3d.png', '📄'],
  stopwatch: ['Stopwatch/3D/stopwatch_3d.png', '⏱️'],
  soccer: ['Soccer ball/3D/soccer_ball_3d.png', '⚽'],
  lotus: ['Lotus/3D/lotus_3d.png', '🪷'],
  herb: ['Herb/3D/herb_3d.png', '🌿'],
  phoneOff: ['Mobile phone off/3D/mobile_phone_off_3d.png', '📴'],
  backpack: ['Backpack/3D/backpack_3d.png', '🎒'],
  check: ['Check mark button/3D/check_mark_button_3d.png', '✅'],
  phone: ['Telephone receiver/3D/telephone_receiver_3d.png', '📞'],
  gradCap: ['Graduation cap/3D/graduation_cap_3d.png', '🎓'],
  pencil: ['Pencil/3D/pencil_3d.png', '✏️'],
  microscope: ['Microscope/3D/microscope_3d.png', '🔬'],
  sunrise: ['Sunrise/3D/sunrise_3d.png', '🌅'],
  clipboard: ['Clipboard/3D/clipboard_3d.png', '📋'],
  envelope: ['Envelope/3D/envelope_3d.png', '✉️'],
  notepad: ['Spiral notepad/3D/spiral_notepad_3d.png', '🗒️'],
  calendar: ['Calendar/3D/calendar_3d.png', '📅'],
} as const;

export type Icon3DName = keyof typeof ICONS_3D;

const CATEGORY_ICON: Record<string, Icon3DName> = {
  study: 'books',
  exam: 'memo',
  sports: 'shoe',
  health: 'droplet',
  reminder: 'bell',
  other: 'sparkles',
};

// Each template gets its own picture; anything else falls back to its category's icon.
const TITLE_ICON: Record<string, Icon3DName> = {
  'study session': 'books',
  'revise for exams': 'memo',
  'gym / workout': 'biceps',
  'morning run': 'shoe',
  'drink water': 'droplet',
  'sleep on time': 'moon',
  'read 20 pages': 'openBook',
  'weekly revision': 'spiralCalendar',
  'practice coding': 'laptop',
  'solve previous papers': 'page',
  'mock test': 'stopwatch',
  'evening game': 'soccer',
  'yoga / stretching': 'lotus',
  meditate: 'herb',
  'screen-free hour': 'phoneOff',
  'pack bag for tomorrow': 'backpack',
  'check assignments': 'check',
  'call home': 'phone',
  "prepare tomorrow's lecture": 'gradCap',
  'grade assignments': 'pencil',
  'office hours': 'calendar',
  'research & reading': 'microscope',
  'morning walk': 'sunrise',
  'set question paper': 'clipboard',
  'reply to student mails': 'envelope',
  'plan next week': 'notepad',
};

export const iconForCategory = (category?: string): Icon3DName => CATEGORY_ICON[category || ''] || 'sparkles';
export const iconForRoutine = (title?: string, category?: string): Icon3DName =>
  TITLE_ICON[(title || '').trim().toLowerCase()] || iconForCategory(category);

export const Icon3D: React.FC<{ name: Icon3DName; size?: number; className?: string }> = ({ name, size = 28, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const [path, emoji] = ICONS_3D[name];
  if (failed) {
    return (
      <span aria-hidden="true" className={`inline-flex items-center justify-center leading-none ${className}`} style={{ width: size, height: size, fontSize: size * 0.75 }}>
        {emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CDN + encodeURI(path)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`select-none pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
