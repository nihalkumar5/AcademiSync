// Friends: shared model + pure helpers (free now, free together). Used by the server and the app.
// Friends only ever see free/busy from each other's timetable (class names only if a friend allows it).
import type { WidgetDay } from './widget';

export type Place = 'library' | 'canteen' | 'hostel' | 'ground' | 'lab' | 'classroom' | 'off_campus';
export const PLACES: { id: Place; label: string; emoji: string }[] = [
  { id: 'library', label: 'Library', emoji: '📚' },
  { id: 'canteen', label: 'Canteen', emoji: '☕' },
  { id: 'hostel', label: 'Hostel', emoji: '🏠' },
  { id: 'ground', label: 'Ground', emoji: '⚽' },
  { id: 'lab', label: 'Lab', emoji: '🧪' },
  { id: 'classroom', label: 'Classroom', emoji: '🏫' },
  { id: 'off_campus', label: 'Off campus', emoji: '🚶' },
];
export const placeOf = (id?: string | null) => PLACES.find((p) => p.id === id) || null;
export const STATUS_MINUTES = 60;

export interface PersonLite {
  uid: string;
  name: string;
  avatarUrl?: string;
  branch?: string;
  semester?: number | null;
  sameBatch?: boolean;
}
export interface Friend extends PersonLite {
  hidden: boolean; // ghost mode, or hidden from you
  days: WidgetDay[]; // next 7 days (class names blank unless they share them)
  status: { place: Place; until: string } | null;
  hiddenByMe: boolean;
}
export interface Plan {
  id: string;
  title: string;
  at: string; // ISO
  byUid: string;
  byName: string;
  mine: boolean;
  invited: PersonLite[];
  responses: Record<string, 'in' | 'out'>;
}
export interface FriendsData {
  me: { uid: string; code: string; ghost: boolean; showClass: boolean; status: { place: Place; until: string } | null; college: string };
  friends: Friend[];
  incoming: PersonLite[];
  outgoing: PersonLite[];
  suggestions: PersonLite[];
  plans: Plan[];
  myDays: WidgetDay[];
}

export const PLAN_TITLES = ['Canteen', 'Chai', 'Library study', 'Lunch', 'Ground', 'Group study'];
export const friendLink = (code: string) => `https://app.intersemester.com/?friend=${encodeURIComponent(code)}`;
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/; // no 0/O/1/I so codes are easy to read out

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
export const clock = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export type NowStatus =
  | { kind: 'class'; until: number; name: string }
  | { kind: 'free'; until: number | null } // until the next class, or null = no more classes today
  | { kind: 'off'; label: string } // holiday / exam day
  | { kind: 'hidden' };

/** What a friend is doing right now, from their schedule. */
export function nowStatus(days: WidgetDay[], now = new Date()): NowStatus {
  const today = days.find((d) => d.date === ymd(now));
  if (!today) return { kind: 'free', until: null };
  if (today.off) return { kind: 'off', label: today.off };
  const t = minutesOf(now);
  const cur = today.classes.find((c) => c.start <= t && t < c.end);
  if (cur) {
    // Back-to-back classes (gap of 10 min or less) count as one busy stretch
    let until = cur.end;
    for (const c of today.classes) if (c.start <= until + 10 && c.end > until) until = c.end;
    return { kind: 'class', until, name: cur.name };
  }
  const next = today.classes.find((c) => c.start > t);
  return { kind: 'free', until: next ? next.start : null };
}

export interface Slot {
  date: string;
  start: number;
  end: number;
}

/** Times in the next 7 days when everyone given is free (college hours, at least `min` minutes). */
export function freeTogether(people: WidgetDay[][], opts: { now?: Date; dayStart?: number; dayEnd?: number; min?: number } = {}): Slot[] {
  const now = opts.now || new Date();
  const dayStart = opts.dayStart ?? 8 * 60;
  const dayEnd = opts.dayEnd ?? 18 * 60;
  const min = opts.min ?? 30;
  const out: Slot[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (d.getDay() === 0) continue; // Sundays: everyone is free anyway
    const date = ymd(d);
    const busy: [number, number][] = [];
    people.forEach((days) => {
      const day = days.find((x) => x.date === date);
      if (!day || day.off) return;
      day.classes.forEach((c) => busy.push([c.start, c.end]));
    });
    busy.sort((a, b) => a[0] - b[0]);
    let cursor = i === 0 ? Math.max(dayStart, Math.ceil(minutesOf(now) / 15) * 15) : dayStart;
    for (const [s, e] of busy) {
      if (s > cursor && Math.min(s, dayEnd) - cursor >= min) out.push({ date, start: cursor, end: Math.min(s, dayEnd) });
      cursor = Math.max(cursor, e);
      if (cursor >= dayEnd) break;
    }
    if (dayEnd - cursor >= min) out.push({ date, start: cursor, end: dayEnd });
  }
  return out;
}
