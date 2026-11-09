import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AcademicEvent, ClassSession, Exam, ExtraClassSession, Subject } from './types';
import { getLocalDateString, isGenericExamTitle } from './timetableUtils';
import { getSubjectCardTheme } from './cardColors';

// Home-screen widget (Android). The app builds the next 7 days of classes, with cancellations,
// reschedules, extra classes and holidays already applied, and hands them to the native widget
// (android/app/src/main/java/com/academisync/app/widget). The widget works out "now / next" by
// itself, so it stays right without the app being open.

interface WidgetBridgePlugin {
  update(options: { data: string }): Promise<void>;
}
// Registered on first use: registerPlugin isn't available while the page renders on the server
let bridge: WidgetBridgePlugin | null = null;
const getBridge = () => (bridge ||= registerPlugin<WidgetBridgePlugin>('WidgetBridge'));

export interface WidgetClass {
  name: string;
  start: number; // minutes after midnight
  end: number;
  room: string;
  lab: boolean;
  color: string; // #rrggbb
}
export interface WidgetDay {
  date: string; // yyyy-mm-dd
  off?: string; // "Holiday · Diwali" / "Exam day": no classes that day
  classes: WidgetClass[];
}

export interface WidgetInput {
  timetable: ClassSession[];
  subjects: Subject[];
  cancelled: string[];
  rescheduled: Record<string, { startTime: string; endTime: string; room?: string }>;
  extras: Record<string, ExtraClassSession>;
  events: AcademicEvent[];
  exams: Exam[];
  from?: Date;
  days?: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "09:00", "2:00" (in a college timetable 1–7 means PM) or "9:30 AM" → minutes after midnight. */
export const toMinutes = (t?: string): number | null => {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3]) {
    const pm = m[3].toUpperCase() === 'PM';
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  } else if (h >= 1 && h <= 7) {
    h += 12;
  }
  return h * 60 + min;
};

const hex = (c?: string) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#111111');

export function buildWidgetDays(input: WidgetInput): WidgetDay[] {
  const subjectById = new Map((input.subjects || []).map((s) => [s.id, s]));
  const cancelled = new Set(input.cancelled || []);
  const out: WidgetDay[] = [];
  const start = input.from ? new Date(input.from) : new Date();
  for (let i = 0; i < (input.days || 7); i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const date = getLocalDateString(d);
    const holiday = (input.events || []).find((e) => e && e.date === date && e.type === 'holiday');
    const examDay =
      (input.events || []).some((e) => e && e.date === date && e.type === 'exam' && !isGenericExamTitle(e.title)) ||
      (input.exams || []).some((x) => x && x.date && x.date.slice(0, 10) === date && !isGenericExamTitle(x.subjectName));
    if (holiday || examDay) {
      out.push({ date, off: holiday ? `Holiday · ${holiday.title}` : 'Exam day', classes: [] });
      continue;
    }
    const classes: WidgetClass[] = [];
    const add = (subjectId: string, fallbackName: string | undefined, s: string, e: string, room: string | undefined, isLab?: boolean) => {
      const a = toMinutes(s);
      if (a === null) return;
      const b = toMinutes(e);
      const sub = subjectById.get(subjectId);
      const name = sub?.name || fallbackName || 'Class';
      const lab = !!(isLab || sub?.isLab);
      const theme = getSubjectCardTheme({ subjectName: name, subjectCode: sub?.code, subjectColor: sub?.color, isLab: lab });
      classes.push({ name, start: a, end: b !== null && b > a ? b : a + 55, room: room || '', lab, color: hex(theme.accent) });
    };
    for (const s of input.timetable || []) {
      if (!s || s.day !== DAYS[d.getDay()] || cancelled.has(`${date}_${s.id}`)) continue;
      const r = input.rescheduled ? input.rescheduled[`${date}_${s.id}`] : undefined;
      add(s.subjectId, s.subjectName, r?.startTime || s.startTime, r?.endTime || s.endTime, r?.room || s.room, s.isLab);
    }
    for (const x of Object.values(input.extras || {})) {
      if (x && x.date === date) add(x.subjectId, undefined, x.startTime, x.endTime, x.room, x.isLab);
    }
    classes.sort((a, b) => a.start - b.start);
    out.push({ date, classes });
  }
  return out;
}

let lastSent = '';
/** Send the schedule to the home-screen widget. Android app only; does nothing elsewhere. */
export async function syncWidget(input: WidgetInput) {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  const days = JSON.stringify(buildWidgetDays(input));
  if (days === lastSent) return; // nothing changed
  try {
    await getBridge().update({ data: `{"v":1,"updatedAt":${Date.now()},"days":${days}}` });
    lastSent = days;
  } catch {
    // App builds from before the widget don't have WidgetBridge; nothing to do
  }
}
