// Campus setup: the campus admin sets up every batch of the college in one place
// (batches, timetables, year-wise academic calendars). Batches that already have a CR
// get the change as a request the CR approves; batches without a CR get it straight away.
// Pure helpers shared by the server and the app.
import type { AcademicEvent, CalendarEventType, ClassSession, Subject } from './types';
import { getHarmonicColorForSubject } from './cardColors';

export type CalendarYears = 'all' | number[];

export interface CampusCalendar {
  id: string;
  name: string;
  years: CalendarYears; // which years of study use it (1 = Sem 1–2, 2 = Sem 3–4, …) or everyone
  events: AcademicEvent[];
  updatedAt: string;
}

export interface SetupBatch {
  id: string; // batch key
  programme: string;
  branch: string;
  semester: number | null;
  year: number | null;
  inviteCode: string;
  crNames: string[];
  hasCr: boolean;
  members: number;
  subjects: number;
  classes: number;
  calendarId: string | null; // campus calendar linked to it
  pending: { id: string; kind: ProposalKind; createdAt: string }[];
}

export type ProposalKind = 'timetable' | 'calendar';

export interface AdminProposal {
  id: string;
  batchKey: string;
  kind: ProposalKind;
  summary: string;
  byName: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'replaced';
  // Small preview for the CR
  preview: string[];
}

export const yearOf = (semester?: number | null) => (semester && semester > 0 ? Math.ceil(semester / 2) : null);
export const yearLabel = (y: number) => `${y}${y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} year`;
export const yearsLabel = (years: CalendarYears) => (years === 'all' ? 'All years' : years.length ? years.slice().sort().map(yearLabel).join(', ') : 'No years');

/** The calendar a batch should follow: one made for its year, else the "All years" one. */
export const calendarFor = (semester: number | null | undefined, calendars: CampusCalendar[]) => {
  const y = yearOf(semester);
  const specific = calendars.find((c) => c.years !== 'all' && y !== null && c.years.includes(y));
  return specific || calendars.find((c) => c.years === 'all') || null;
};

const DAY_MS = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const EVENT_TYPES: CalendarEventType[] = ['exam', 'holiday', 'event', 'assignment'];

/**
 * Turns AI-read calendar rows (with date ranges) into day events: holidays (up to 2 months) and
 * exam periods (up to 3 weeks) become one event per day; everything else stays one event.
 */
export function expandCalendar(rows: any[], idPrefix: string): AcademicEvent[] {
  const out: AcademicEvent[] = [];
  const milestone = /convocation|commencement|inauguration|orientation|re-opening|foundation|declaration|result|submission|deadline|registration|fee|senate|meeting|alumni/i;
  rows.forEach((r, i) => {
    const title = String(r?.title || '').trim().slice(0, 120) || 'Event';
    const type: CalendarEventType = EVENT_TYPES.includes(r?.type) ? r.type : 'event';
    const startStr = String(r?.startDate || r?.date || '').slice(0, 10);
    const endStr = String(r?.endDate || startStr).slice(0, 10);
    const start = new Date(`${startStr}T00:00:00Z`);
    const end = new Date(`${endStr}T00:00:00Z`);
    if (isNaN(start.getTime())) return;
    const base = { title, type, description: String(r?.description || '').slice(0, 300), location: String(r?.location || '').slice(0, 80) };
    const days = isNaN(end.getTime()) || end <= start ? 1 : Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
    // Only holidays and exams mark each day (that's all the Home screen reacts to). Holidays can be
    // long (winter vacation), exam periods up to 3 weeks. Every other event stays one entry.
    const isHoliday = type === 'holiday' || /vacation|recess|break/i.test(title);
    const isExam = type === 'exam' || /exam|test|viva/i.test(title);
    const multi = days > 1 && !milestone.test(title) && ((isHoliday && days <= 62) || (isExam && days <= 21));
    if (!multi) {
      out.push({ ...base, id: `${idPrefix}_${i}`, date: ymd(start), ...(days > 1 ? { description: `(Till ${endStr}) ${base.description}`.trim() } : {}) } as AcademicEvent);
      return;
    }
    for (let k = 0; k < days; k++) {
      out.push({ ...base, id: `${idPrefix}_${i}_${k}`, date: ymd(new Date(start.getTime() + k * DAY_MS)) } as AcademicEvent);
    }
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Replace the campus calendar inside a batch's events, keeping the batch's own events (CR-added). */
export const mergeCampusEvents = (batchEvents: any[], campusEvents: AcademicEvent[]) => [
  ...(Array.isArray(batchEvents) ? batchEvents : []).filter((e) => e && e.source !== 'campus'),
  ...campusEvents.map((e) => ({ ...e, source: 'campus' })),
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const plus55 = (t: string) => {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  const total = (h || 0) * 60 + (m || 0) + 55;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * AI-read timetable rows → batch subjects + classes. Keeps the ids of subjects the batch already
 * has (same name or course code), so students' notes / colours / homework stay linked.
 */
export function buildTimetable(rows: any[], existing: Subject[] = []): { subjects: Subject[]; timetable: ClassSession[] } {
  const subjects: Subject[] = [];
  const timetable: ClassSession[] = [];
  const realCode = (c: string) => c.length >= 4 && /\d/.test(c);
  rows.forEach((r, i) => {
    const name = String(r?.subjectName || '').trim().slice(0, 120);
    const rawDay = String(r?.day || '').trim().toLowerCase();
    const day = rawDay.length >= 3 ? DAYS.find((d) => d.toLowerCase().startsWith(rawDay.slice(0, 3))) : undefined;
    const startTime = String(r?.startTime || '').trim();
    const endTime = String(r?.endTime || '').trim();
    if (!name || !day || !/^\d{1,2}:\d{2}/.test(startTime)) return;
    const code = String(r?.subjectCode || '').trim().slice(0, 30);
    const isLab = !!r?.isLab;
    let sub = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase() || (realCode(code) && s.code.toLowerCase() === code.toLowerCase()));
    if (!sub) {
      const prev = existing.find((s) => s.name?.toLowerCase() === name.toLowerCase() || (realCode(code) && s.code?.toLowerCase() === code.toLowerCase()));
      const id = prev?.id && !subjects.some((s) => s.id === prev.id) ? prev.id : `sub_${slug(code || name)}_${subjects.length}`;
      sub = {
        ...(prev || {}),
        id,
        code: code || prev?.code || '',
        name,
        shortName: prev?.shortName || name.split(/\s+/).filter((w) => w.length > 2).map((w) => w[0]).join('').toUpperCase().slice(0, 6) || name.slice(0, 6),
        facultyName: String(r?.faculty || '').trim() || prev?.facultyName || 'TBD',
        room: String(r?.room || '').trim() || prev?.room || 'TBD',
        credits: prev?.credits || 3,
        color: prev?.isCustomColor && prev.color ? prev.color : getHarmonicColorForSubject({ name, code, isLab }, subjects.map((s) => s.color)),
        carryRequirements: prev?.carryRequirements || [],
        isLab,
        ...(r?.isElective ? { isElective: true } : {}),
      } as Subject;
      subjects.push(sub);
    }
    timetable.push({
      id: `cls_${slug(day)}_${startTime.replace(/\D/g, '')}_${i}`,
      subjectId: sub.id,
      subjectName: sub.name,
      day: day as any,
      startTime,
      endTime: /^\d{1,2}:\d{2}/.test(endTime) ? endTime : plus55(startTime),
      room: String(r?.room || '').trim() || sub.room,
      faculty: String(r?.faculty || '').trim() || undefined,
      isLab,
    } as ClassSession);
  });
  return { subjects, timetable };
}
