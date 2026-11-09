// A student's own attendance, built only from what their teachers mark in Intersemester.
// Students never enter anything. A subject is tracked only when its teacher has set up a
// class list and marks classes in the app; every other subject shows as "not opted in".
//
// Pure functions shared by the server (building the record) and the app (bunk maths,
// matching records to the student's subjects). Relative imports only, so this file can be
// compiled and tested on its own.
import { LOW_PCT } from './attendanceShared';

/** Minimum attendance a subject needs (the 75% rule). */
export const MIN_PCT = LOW_PCT;

export type ClassMark = 'P' | 'A';
export interface ClassRecord {
  date: string; // yyyy-mm-dd
  startTime: string;
  mark: ClassMark;
}

export interface StudentCourse {
  key: string; // batch subject id when known, else "n:<normalised name>"
  subjectId?: string;
  subjectName: string;
  teachers: string[];
  /** tracked: you're on the teacher's class list. not-on-list: they mark online, but you aren't on their list. */
  status: 'tracked' | 'not-on-list';
  attended: number;
  total: number;
  history: ClassRecord[]; // newest first
}

export interface MyAttendance {
  batchKey: string | null;
  minPct: number;
  courses: StudentCourse[];
  generatedAt: string;
}

// ---------- Bunk maths ----------
export const pctOf = (attended: number, total: number) => (total > 0 ? (attended / total) * 100 : NaN);

/** Classes you can miss in a row and still stay at or above min%. */
export const canSkip = (attended: number, total: number, min = MIN_PCT) =>
  total > 0 ? Math.max(0, Math.floor((100 * attended - min * total) / min)) : 0;

/** Classes you must attend in a row to get back to min%. */
export const mustAttend = (attended: number, total: number, min = MIN_PCT) =>
  min >= 100 ? (attended < total ? Infinity : 0) : Math.max(0, Math.ceil((min * total - 100 * attended) / (100 - min)));

export type Standing = 'none' | 'safe' | 'edge' | 'low';
/** none: nothing marked yet · low: below min · edge: at most 1 class to spare · safe: 2 or more to spare */
export const standingOf = (attended: number, total: number, min = MIN_PCT): Standing => {
  if (total <= 0) return 'none';
  if (100 * attended < min * total) return 'low';
  return canSkip(attended, total, min) <= 1 ? 'edge' : 'safe';
};

// ---------- Matching subjects ----------
export const normName = (s?: string | null) =>
  (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export interface SubjectLite {
  id: string;
  name?: string;
  shortName?: string;
  code?: string;
}

const namesOf = (s: SubjectLite) =>
  [s.name, s.shortName, s.code].map((n) => normName(n)).filter((n) => n.length > 0 && n !== 'unk');

/** Finds a batch subject by id, else by name, short name or code (in that order). */
export const makeSubjectResolver = (subjects: SubjectLite[]) => {
  const list = subjects.filter((s) => s && typeof s.id === 'string' && s.id);
  const byId = new Map(list.map((s) => [s.id, s]));
  const byName = new Map<string, SubjectLite>();
  (['name', 'shortName', 'code'] as const).forEach((field) =>
    list.forEach((s) => {
      const n = normName(s[field]);
      if (n && n !== 'unk' && !byName.has(n)) byName.set(n, s);
    })
  );
  return (q: { id?: string; name?: string }) => (q.id ? byId.get(q.id) : undefined) || (q.name ? byName.get(normName(q.name)) : undefined);
};

// ---------- Building the record (server) ----------
export interface RosterLite {
  facultyId: string;
  students: { key: string; uid?: string }[];
}
export interface SessionLite {
  subjectName: string;
  date: string;
  startTime: string;
  mark?: string; // this student's own mark, only when they are on the list
}
export interface FacultyLite {
  name: string;
  subjectIds: string[];
  subjectNames: string[];
}

type Building = StudentCourse & { onList: boolean };

export function buildStudentCourses(input: {
  uid: string;
  rosters: RosterLite[];
  sessions: Record<string, SessionLite[] | undefined>; // by facultyId
  faculty: Record<string, FacultyLite | undefined>;
  batchSubjects: SubjectLite[];
}): StudentCourse[] {
  const resolve = makeSubjectResolver(input.batchSubjects);
  const courses = new Map<string, Building>();
  const courseFor = (name: string, subjectId?: string): Building | null => {
    const subj = resolve({ id: subjectId, name });
    const key = subj ? subj.id : name && normName(name) ? `n:${normName(name)}` : '';
    if (!key) return null;
    let c = courses.get(key);
    if (!c) {
      c = {
        key,
        ...(subj ? { subjectId: subj.id } : {}),
        subjectName: (subj?.name || name || '').trim(),
        teachers: [],
        status: 'not-on-list',
        attended: 0,
        total: 0,
        history: [],
        onList: false,
      };
      courses.set(key, c);
    }
    return c;
  };

  for (const r of input.rosters) {
    const me = r.students.find((s) => (s.uid && s.uid === input.uid) || s.key === input.uid);
    const f = input.faculty[r.facultyId];
    const teacher = f?.name?.trim() || 'Your teacher';
    const list = input.sessions[r.facultyId] || [];
    const touched = new Set<Building>();

    for (const s of list) {
      const c = courseFor(s.subjectName);
      if (!c) continue;
      touched.add(c);
      // No mark = you weren't on the list for that lecture (added later), so it doesn't count
      if (me && (s.mark === 'P' || s.mark === 'A' || s.mark === 'L')) {
        c.history.push({ date: s.date, startTime: s.startTime, mark: s.mark === 'A' ? 'A' : 'P' });
      }
    }
    // Class list just set up and nothing marked yet: the subjects they teach this batch count as on
    if (list.length === 0 && f) {
      const n = Math.max(f.subjectIds.length, f.subjectNames.length);
      for (let i = 0; i < n; i++) {
        const c = courseFor(f.subjectNames[i] || '', f.subjectIds[i]);
        if (c) touched.add(c);
      }
    }
    touched.forEach((c) => {
      if (!c.teachers.includes(teacher)) c.teachers.push(teacher);
      if (me) c.onList = true;
    });
  }

  return Array.from(courses.values()).map(({ onList, ...c }) => {
    const history = c.history.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    const attended = history.filter((h) => h.mark === 'P').length;
    return { ...c, status: onList ? 'tracked' : 'not-on-list', history, attended, total: history.length } as StudentCourse;
  });
}

// ---------- Matching records to the student's own subjects (app) ----------
/** Pairs each subject with its record: same subject id first, then same name / short name / code. */
export function matchCourses(subjects: SubjectLite[], courses: StudentCourse[]) {
  const bySubject = new Map<string, StudentCourse>();
  const taken = new Set<string>();
  for (const s of subjects) {
    const c = courses.find((x) => !taken.has(x.key) && !!x.subjectId && x.subjectId === s.id);
    if (c) {
      bySubject.set(s.id, c);
      taken.add(c.key);
    }
  }
  for (const s of subjects) {
    if (bySubject.has(s.id)) continue;
    const names = new Set(namesOf(s));
    const c = courses.find((x) => !taken.has(x.key) && names.has(normName(x.subjectName)));
    if (c) {
      bySubject.set(s.id, c);
      taken.add(c.key);
    }
  }
  return { bySubject, leftovers: courses.filter((c) => !taken.has(c.key)) };
}
