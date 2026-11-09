// Server side of a student's own attendance (Admin SDK, behind /api/attendance/student).
//
// Security
// - Identity comes only from the verified ID token (uid), never from the request.
// - A student is matched to a teacher's class list only by their app account (the list's uid),
//   which the teacher picked from the batch's members. Roll numbers are typed by students, so
//   they are never used to match (anyone could type a classmate's).
// - Only this student's own mark is read from each lecture (a field mask), and only their own
//   numbers leave the server. Classmates' marks are never read or returned.
import { FieldPath } from 'firebase-admin/firestore';
import {
  buildStudentCourses,
  FacultyLite,
  MIN_PCT,
  MyAttendance,
  RosterLite,
  SessionLite,
  SubjectLite,
} from '../attendanceStudent';

type Db = any; // firebase-admin Firestore
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const validKey = (v: unknown): v is string => isStr(v) && v.length <= 200 && !v.includes('/') && v !== '.' && v !== '..';

const teacherName = (p: any) => {
  const name = typeof p?.name === 'string' ? p.name.trim() : '';
  const title = typeof p?.facultyTitle === 'string' ? p.facultyTitle.trim() : '';
  if (!name) return 'Your teacher';
  return title && !name.toLowerCase().startsWith(title.toLowerCase().replace(/\.$/, '')) ? `${title} ${name}` : name;
};

export async function loadMyAttendance(db: Db, uid: string): Promise<MyAttendance> {
  const userSnap = await db.collection('users').doc(uid).get();
  const profile = (userSnap.exists ? userSnap.data()?.profile : null) || {};
  const batchKey = validKey(profile.batchKey) ? profile.batchKey : null;
  const base = { batchKey, minPct: MIN_PCT, generatedAt: new Date().toISOString() };
  if (!batchKey || profile.role === 'faculty') return { ...base, courses: [] };

  // Every teacher's class list for this batch (doc id is `${facultyId}__${batchKey}`)
  const [rosterSnap, batchSnap] = await Promise.all([
    db.collection('attendance').where('batchKey', '==', batchKey).get(),
    db.collection('shared_timetables').doc(batchKey).get(),
  ]);
  const rosters: (RosterLite & { id: string })[] = [];
  rosterSnap.forEach((d: any) => {
    const r = d.data() || {};
    if (!validKey(r.facultyId) || d.id !== `${r.facultyId}__${batchKey}` || !Array.isArray(r.students)) return;
    rosters.push({
      id: d.id,
      facultyId: r.facultyId,
      students: r.students
        .filter((s: any) => s && isStr(s.key))
        .map((s: any) => ({ key: s.key, ...(isStr(s.uid) ? { uid: s.uid } : {}) })),
    });
  });
  if (rosters.length === 0) return { ...base, courses: [] };

  // Teacher names + the subjects each one teaches this batch
  const facultySnaps = await Promise.all(rosters.map((r) => db.collection('users').doc(r.facultyId).get()));
  const faculty: Record<string, FacultyLite> = {};
  facultySnaps.forEach((snap: any, i: number) => {
    const p = (snap.exists ? snap.data()?.profile : null) || {};
    const link = (Array.isArray(p.facultyLinkedBatches) ? p.facultyLinkedBatches : []).find((b: any) => b?.batchKey === batchKey);
    faculty[rosters[i].facultyId] = {
      name: teacherName(p),
      subjectIds: Array.isArray(link?.selectedSubjectIds) ? link.selectedSubjectIds.filter(isStr) : [],
      subjectNames: Array.isArray(link?.selectedSubjectNames) ? link.selectedSubjectNames.filter(isStr) : [],
    };
  });

  // Lectures: subject, date, time and this student's own mark only
  const sessions: Record<string, SessionLite[]> = {};
  await Promise.all(
    rosters.map(async (r) => {
      const me = r.students.find((s) => (s.uid && s.uid === uid) || s.key === uid);
      const fields: (string | FieldPath)[] = ['subjectName', 'date', 'startTime'];
      if (me) fields.push(new FieldPath('marks', me.key));
      const snap = await db.collection('attendance').doc(r.id).collection('sessions').select(...fields).get();
      const list: SessionLite[] = [];
      snap.forEach((d: any) => {
        const s = d.data() || {};
        if (!isStr(s.subjectName) || !isStr(s.date)) return;
        const mark = me ? s.marks?.[me.key] : undefined;
        list.push({ subjectName: s.subjectName, date: s.date, startTime: String(s.startTime || ''), ...(typeof mark === 'string' ? { mark } : {}) });
      });
      sessions[r.facultyId] = list;
    })
  );

  const batch = batchSnap.exists ? batchSnap.data() || {} : {};
  const batchSubjects: SubjectLite[] = (Array.isArray(batch.subjects) ? batch.subjects : [])
    .filter((s: any) => s && isStr(s.id))
    .map((s: any) => ({ id: s.id, name: s.name, shortName: s.shortName, code: s.code }));

  return { ...base, courses: buildStudentCourses({ uid, rosters, sessions, faculty, batchSubjects }) };
}
