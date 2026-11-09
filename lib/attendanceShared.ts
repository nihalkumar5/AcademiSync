// Pure attendance model + rules, shared by the app and the server (no React, no Firebase).
// Anything that decides what a record means (ids, stats, the 75% rule, validation) lives here,
// so the API, the Excel report and the screens can never disagree.

// ---------- Model ----------
// attendance/{facultyUid}__{batchKey}                 → the faculty's class list for that batch
// attendance/{facultyUid}__{batchKey}/sessions/{id}   → one lecture's marks
export type Mark = 'P' | 'A'; // older records may still hold 'L' (late); it counts as present

export interface RosterStudent {
  key: string; // app uid, or "m_<roll>" for students added by hand
  uid?: string;
  name: string;
  roll: string;
  manual?: boolean;
}

export interface Roster {
  facultyId: string;
  batchKey: string;
  batchLabel: string;
  students: RosterStudent[];
  dismissed: string[]; // uids the faculty chose not to include (not shown as "new" again)
  lockedAt: string | null;
  updatedAt: string;
  version?: number; // bumps on every save; used to stop two devices overwriting each other
  updatedBy?: string;
}

export interface AttendanceSession {
  id: string;
  facultyId: string;
  batchKey: string;
  subjectName: string;
  date: string; // yyyy-mm-dd
  startTime: string; // 24h, as in the timetable, e.g. "09:00"
  endTime?: string;
  marks: Record<string, Mark>;
  present: number;
  absent: number;
  late?: number; // legacy only
  total: number;
  takenAt: string;
  updatedAt: string;
  version?: number; // 1 on first save, +1 on every edit
  takenBy?: string;
  updatedBy?: string;
}

/** One line in a batch's append-only change log (written only by the server). */
export interface AuditChange {
  key: string;
  roll: string;
  name: string;
  from?: string;
  to?: string;
}
export interface AuditEntry {
  id?: string;
  at: string;
  ts: number;
  by: string;
  byEmail?: string;
  action: 'roster.lock' | 'roster.update' | 'session.create' | 'session.update' | 'session.delete' | 'session.restore' | 'report.export';
  batchKey: string;
  sessionId?: string;
  subjectName?: string;
  date?: string;
  startTime?: string;
  summary: string;
  changes?: AuditChange[];
  present?: number;
  absent?: number;
  total?: number;
  version?: number;
}

export const rosterId = (facultyId: string, batchKey: string) => `${facultyId}__${batchKey}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
/** Same lecture → same doc, so reopening a lecture edits it instead of duplicating. */
export const sessionId = (date: string, startTime: string, subjectName: string) =>
  `${date}_${slug(startTime)}_${slug(subjectName)}`;

// Natural roll sort: 23CS002 < 23CS010 < 23CS100
export const byRoll = (a: { roll: string; name: string }, b: { roll: string; name: string }) =>
  (a.roll || '~').localeCompare(b.roll || '~', undefined, { numeric: true, sensitivity: 'base' }) || a.name.localeCompare(b.name);

/** Short label shown on the fast-mark tiles: the trailing digits of the roll number. */
export const rollTail = (roll: string) => {
  const m = (roll || '').match(/(\d{1,4})$/);
  return m ? m[1] : (roll || '').slice(-4) || '—';
};

// ---------- Limits & validation ----------
export const MAX_STUDENTS = 400;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}( ?[AP]M)?$/i;
export const isValidDateKey = (d: unknown): d is string => typeof d === 'string' && DATE_RE.test(d) && !isNaN(new Date(`${d}T00:00:00Z`).getTime());
export const isValidStartTime = (t: unknown): t is string => typeof t === 'string' && TIME_RE.test(t.trim());
/** Attendance can't be recorded for a day that hasn't happened yet (1 day of slack for time zones). */
export const isFutureDate = (d: string, now = new Date()) => {
  const limit = new Date(now.getTime() + 36 * 3600 * 1000);
  const key = `${limit.getUTCFullYear()}-${String(limit.getUTCMonth() + 1).padStart(2, '0')}-${String(limit.getUTCDate()).padStart(2, '0')}`;
  return d > key;
};

// ---------- Stats ----------
export interface StudentStat {
  student: RosterStudent;
  attended: number; // everything that isn't absent
  absent: number;
  total: number;
  pct: number; // 0–100, NaN when no lectures yet
}

export const studentStats = (students: RosterStudent[], sessions: AttendanceSession[], subject?: string): StudentStat[] => {
  const list = subject ? sessions.filter((s) => s.subjectName === subject) : sessions;
  return students.map((st) => {
    let attended = 0;
    let absent = 0;
    let total = 0;
    for (const s of list) {
      const m = s.marks[st.key];
      if (!m) continue; // not on the list for that lecture
      total++;
      if (m === 'A') absent++;
      else attended++;
    }
    return { student: st, attended, absent, total, pct: total ? (attended / total) * 100 : NaN };
  });
};

// A percentage over 2–3 lectures says nothing (one absence = 0%), so a student is only
// flagged below 75% once they have this many lectures on record.
export const MIN_LECTURES_FOR_FLAG = 10;
export const LOW_PCT = 75;
export const isAtRisk = (st: { pct: number; total: number }) => st.total >= MIN_LECTURES_FOR_FLAG && !isNaN(st.pct) && st.pct < LOW_PCT;

/** Share of the class present in one lecture (0–100). */
export const sessionPct = (s: AttendanceSession) => (s.total ? ((s.total - s.absent) / s.total) * 100 : NaN);

export interface LowStudent extends StudentStat {
  batchKey: string;
}

/** Headline numbers for the dashboard and the Profile card. */
export const summarizeAttendance = (rosters: Roster[], sessions: AttendanceSession[]) => {
  const marked = sessions.reduce((a, s) => a + (s.total || 0), 0);
  const attended = sessions.reduce((a, s) => a + ((s.total || 0) - (s.absent || 0)), 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekKey = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
  const low: LowStudent[] = [];
  rosters.forEach((r) => {
    const mine = sessions.filter((s) => s.batchKey === r.batchKey);
    studentStats(r.students, mine).forEach((st) => {
      if (isAtRisk(st)) low.push({ ...st, batchKey: r.batchKey });
    });
  });
  low.sort((a, b) => a.pct - b.pct);
  return {
    lectures: sessions.length,
    thisWeek: sessions.filter((s) => s.date >= weekKey).length,
    avg: marked ? (attended / marked) * 100 : NaN,
    low,
    tracked: rosters.reduce((a, r) => a + r.students.length, 0),
  };
};
