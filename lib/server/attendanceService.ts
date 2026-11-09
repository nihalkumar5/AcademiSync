// Server-only attendance service (runs with the Admin SDK behind /api/attendance).
//
// Security model
// - Clients never touch these collections directly: Firestore rules deny all client access,
//   so every read/write passes the checks below.
// - Identity comes only from the verified ID token (caller.uid), never from the request body.
// - Read: a faculty can only read records under their own uid (doc ids are `${uid}__${batchKey}`).
// - Write: faculty role + the batch linked to their account.
// - Integrity: optimistic versions stop two devices silently overwriting each other; every change
//   is appended to an audit log in the same atomic write; deletes are soft (restorable).
// - Abuse: per-user hourly limits on writes and exports.
//
// Imports are relative (no "@/") so this file can be compiled and tested on its own.
import {
  AttendanceSession,
  AuditChange,
  AuditEntry,
  Mark,
  MAX_STUDENTS,
  Roster,
  RosterStudent,
  isFutureDate,
  isValidDateKey,
  isValidStartTime,
  rosterId,
  sessionId,
} from '../attendanceShared';

export class AttendanceError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export interface Caller {
  uid: string;
  email: string | null;
}

type Db = any; // firebase-admin Firestore

const COL = 'attendance';
const LIMITS = { write: { max: 300, windowMs: 3600_000 }, export: { max: 30, windowMs: 3600_000 } };

const str = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null);
export const validKey = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && !v.includes('/') && v !== '.' && v !== '..';

export const isLinkedFaculty = (profile: any, batchKey: string) =>
  profile?.role === 'faculty' &&
  ((Array.isArray(profile.facultyLinkedBatches) && profile.facultyLinkedBatches.some((b: any) => b?.batchKey === batchKey)) ||
    (Array.isArray(profile.facultyBatchKeys) && profile.facultyBatchKeys.includes(batchKey)));

export const loadProfile = async (db: Db, uid: string) => {
  const snap = await db.collection('users').doc(uid).get();
  return (snap.exists ? snap.data()?.profile : null) || {};
};

const rosterRef = (db: Db, uid: string, batchKey: string) => db.collection(COL).doc(rosterId(uid, batchKey));
const requireLinked = (profile: any, batchKey: string) => {
  if (!isLinkedFaculty(profile, batchKey)) throw new AttendanceError(403, 'permission-denied', 'This batch is not linked to your faculty account');
};
const nowIso = () => new Date().toISOString();
const auditDoc = (db: Db, uid: string, batchKey: string) => rosterRef(db, uid, batchKey).collection('audit').doc();
const audit = (caller: Caller, batchKey: string, e: Omit<AuditEntry, 'at' | 'ts' | 'by' | 'byEmail' | 'batchKey'>): AuditEntry => {
  const at = nowIso();
  return { ...e, at, ts: Date.parse(at), by: caller.uid, ...(caller.email ? { byEmail: caller.email } : {}), batchKey };
};
const sortSessions = (list: any[]) => list.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.startTime).localeCompare(String(a.startTime)));

// ---------- Rate limit ----------
export const consumeQuota = async (db: Db, uid: string, kind: keyof typeof LIMITS) => {
  const { max, windowMs } = LIMITS[kind];
  const ref = db.collection('attendance_limits').doc(uid);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const d = (snap.exists ? snap.data() : {}) || {};
    const bucket = d[kind] || {};
    const now = Date.now();
    const fresh = !bucket.start || now - bucket.start >= windowMs;
    const count = fresh ? 0 : bucket.count || 0;
    if (count >= max) throw new AttendanceError(429, 'rate-limited', 'Too many changes in a short time. Try again in a while.');
    tx.set(ref, { [kind]: { start: fresh ? now : bucket.start, count: count + 1 } }, { merge: true });
  });
};

// ---------- Reads ----------
export const getBatch = async (db: Db, caller: Caller, batchKey: string) => {
  if (!validKey(batchKey)) throw new AttendanceError(400, 'invalid', 'batchKey is required');
  const ref = rosterRef(db, caller.uid, batchKey);
  const [r, s] = await Promise.all([ref.get(), ref.collection('sessions').get()]);
  const sessions: any[] = [];
  s.forEach((d: any) => sessions.push({ ...d.data(), id: d.id, batchKey }));
  return { roster: r.exists ? r.data() : null, sessions: sortSessions(sessions) };
};

const ownRosters = async (db: Db, caller: Caller): Promise<Roster[]> => {
  const snaps = await db.collection(COL).where('facultyId', '==', caller.uid).get();
  const out: Roster[] = [];
  snaps.forEach((d: any) => {
    if (d.id.startsWith(`${caller.uid}__`)) out.push(d.data());
  });
  return out;
};

export const getAll = async (db: Db, caller: Caller) => {
  const rosters = await ownRosters(db, caller);
  const lists = await Promise.all(rosters.map((r) => rosterRef(db, caller.uid, r.batchKey).collection('sessions').get()));
  const sessions: any[] = [];
  lists.forEach((snap: any, i: number) => snap.forEach((d: any) => sessions.push({ ...d.data(), id: d.id, batchKey: rosters[i].batchKey })));
  return { rosters, sessions: sortSessions(sessions) };
};

export const getTrash = async (db: Db, caller: Caller) => {
  const rosters = await ownRosters(db, caller);
  const lists = await Promise.all(rosters.map((r) => rosterRef(db, caller.uid, r.batchKey).collection('trash').get()));
  const items: any[] = [];
  lists.forEach((snap: any, i: number) => snap.forEach((d: any) => items.push({ ...d.data(), id: d.id, batchKey: rosters[i].batchKey })));
  return items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
};

export const getAudit = async (db: Db, caller: Caller, batchKey: string, sessionIdFilter?: string, limit = 200) => {
  if (!validKey(batchKey)) throw new AttendanceError(400, 'invalid', 'batchKey is required');
  let q = rosterRef(db, caller.uid, batchKey).collection('audit');
  if (sessionIdFilter) {
    if (!validKey(sessionIdFilter)) throw new AttendanceError(400, 'invalid', 'Invalid lecture');
    q = q.where('sessionId', '==', sessionIdFilter);
  }
  const snap = await q.get();
  const items: AuditEntry[] = [];
  snap.forEach((d: any) => items.push({ ...d.data(), id: d.id }));
  return items.sort((a, b) => b.ts - a.ts).slice(0, limit);
};

// ---------- Class list ----------
export const cleanStudents = (list: unknown): RosterStudent[] | null => {
  if (!Array.isArray(list) || list.length > MAX_STUDENTS) return null;
  const out: RosterStudent[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const key = s?.key;
    const name = str(s?.name, 120);
    const roll = str(s?.roll ?? '', 40);
    if (!validKey(key) || key.length > 128 || name === null || roll === null || seen.has(key)) return null;
    seen.add(key);
    out.push({
      key,
      name: name.trim(),
      roll: roll.trim().toUpperCase(),
      ...(typeof s.uid === 'string' && s.uid.length <= 128 ? { uid: s.uid } : {}),
      ...(s.manual === true ? { manual: true } : {}),
    });
  }
  return out;
};

const describe = (s: RosterStudent): AuditChange => ({ key: s.key, roll: s.roll, name: s.name });

export const saveRoster = async (db: Db, caller: Caller, profile: any, batchKey: string, input: any, baseVersion: unknown) => {
  if (!validKey(batchKey)) throw new AttendanceError(400, 'invalid', 'batchKey is required');
  requireLinked(profile, batchKey);
  const students = cleanStudents(input?.students);
  if (!students) throw new AttendanceError(400, 'invalid', 'Class list is invalid or too long');
  const dismissed = Array.isArray(input?.dismissed) ? input.dismissed.filter((k: unknown) => validKey(k)).slice(0, 2000) : [];
  const ref = rosterRef(db, caller.uid, batchKey);

  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const prev: Roster | null = snap.exists ? snap.data() : null;
    const prevVersion = prev ? prev.version || 0 : null;
    const expectsNew = baseVersion === null || baseVersion === undefined;
    if (prev && expectsNew) throw new AttendanceError(409, 'conflict', 'This class list was already set up on another device. Reload to see it.');
    if (prev && baseVersion !== prevVersion) throw new AttendanceError(409, 'conflict', 'This class list was changed on another device. Reload and try again.');
    if (!prev && !expectsNew) throw new AttendanceError(409, 'conflict', 'This class list no longer exists. Reload and try again.');
    const now = nowIso();
    const roster: Roster = {
      facultyId: caller.uid,
      batchKey,
      batchLabel: str(input?.batchLabel, 160) || prev?.batchLabel || '',
      students,
      dismissed,
      lockedAt: prev?.lockedAt || now,
      updatedAt: now,
      version: (prevVersion || 0) + 1,
      updatedBy: caller.uid,
    };
    const before = new Map((prev?.students || []).map((s) => [s.key, s]));
    const after = new Map(students.map((s) => [s.key, s]));
    const added = students.filter((s) => !before.has(s.key)).map(describe);
    const removed = (prev?.students || []).filter((s) => !after.has(s.key)).map(describe);
    tx.set(ref, roster);
    tx.set(
      auditDoc(db, caller.uid, batchKey),
      audit(caller, batchKey, {
        action: prev ? 'roster.update' : 'roster.lock',
        summary: prev
          ? `Class list updated: ${added.length} added, ${removed.length} removed (${students.length} students)`
          : `Class list locked with ${students.length} students`,
        changes: [...added.map((c) => ({ ...c, to: 'added' })), ...removed.map((c) => ({ ...c, to: 'removed' }))].slice(0, MAX_STUDENTS),
        total: students.length,
        version: roster.version,
      })
    );
    return roster;
  });
};

// ---------- Lectures ----------
export const saveSession = async (db: Db, caller: Caller, profile: any, batchKey: string, input: any, baseVersion: unknown) => {
  if (!validKey(batchKey)) throw new AttendanceError(400, 'invalid', 'batchKey is required');
  requireLinked(profile, batchKey);
  const subjectName = str(input?.subjectName, 120)?.trim();
  const startTime = isValidStartTime(input?.startTime) ? String(input.startTime).trim() : null;
  const date = input?.date;
  if (!subjectName || !startTime) throw new AttendanceError(400, 'invalid', 'Subject and time are required');
  if (!isValidDateKey(date)) throw new AttendanceError(400, 'invalid', 'Invalid date');
  if (isFutureDate(date)) throw new AttendanceError(400, 'invalid', "Attendance can't be marked for a future date");
  if (date < '2020-01-01') throw new AttendanceError(400, 'invalid', 'Invalid date');
  const id = sessionId(date, startTime, subjectName);
  if (input?.id && input.id !== id) throw new AttendanceError(400, 'invalid', 'Lecture id does not match its date, time and subject');
  const endTime = isValidStartTime(input?.endTime) ? String(input.endTime).trim() : undefined;

  const ref = rosterRef(db, caller.uid, batchKey);
  const sRef = ref.collection('sessions').doc(id);

  return db.runTransaction(async (tx: any) => {
    const [rSnap, sSnap] = await Promise.all([tx.get(ref), tx.get(sRef)]);
    if (!rSnap.exists) throw new AttendanceError(409, 'no-roster', 'Lock the class list first');
    const roster: Roster = rSnap.data();
    const prev: AttendanceSession | null = sSnap.exists ? sSnap.data() : null;
    const prevVersion = prev ? prev.version || 0 : null;
    // null/undefined base = "I think this lecture is new"; a number = "I'm editing this version"
    const expectsNew = baseVersion === null || baseVersion === undefined;
    if (prev && expectsNew) throw new AttendanceError(409, 'conflict', 'This lecture was already marked on another device. Reload to see it.');
    if (prev && baseVersion !== prevVersion) throw new AttendanceError(409, 'conflict', 'This lecture was changed on another device. Reload and try again.');
    if (!prev && !expectsNew) throw new AttendanceError(409, 'conflict', 'This lecture was deleted on another device. Reload and try again.');

    const byKey = new Map(roster.students.map((s) => [s.key, s]));
    const marks: Record<string, Mark> = {};
    // Students since removed from the class list keep the mark they had in this lecture
    if (prev?.marks) {
      for (const [k, v] of Object.entries(prev.marks)) if (!byKey.has(k)) marks[k] = v === 'A' ? 'A' : 'P';
    }
    for (const s of roster.students) {
      const v = input?.marks?.[s.key];
      marks[s.key] = v === 'A' ? 'A' : 'P'; // anything else (incl. legacy 'L') = present
    }
    const absent = Object.values(marks).filter((v) => v === 'A').length;
    const total = Object.keys(marks).length;
    const now = nowIso();
    const session: AttendanceSession = {
      id,
      facultyId: caller.uid,
      batchKey,
      subjectName,
      date,
      startTime,
      ...(endTime ? { endTime } : {}),
      marks,
      present: total - absent,
      absent,
      total,
      takenAt: prev?.takenAt || now,
      takenBy: prev?.takenBy || caller.uid,
      updatedAt: now,
      updatedBy: caller.uid,
      version: (prevVersion || 0) + 1,
    };

    // What actually changed, student by student (snapshot of roll + name for the record)
    const changes: AuditChange[] = [];
    if (prev) {
      for (const [k, to] of Object.entries(marks)) {
        const from = prev.marks?.[k] === 'A' ? 'A' : prev.marks?.[k] ? 'P' : undefined;
        if (from !== to) {
          const st = byKey.get(k);
          changes.push({ key: k, roll: st?.roll || '', name: st?.name || '', ...(from ? { from } : {}), to });
        }
      }
    }
    if (prev && changes.length === 0) return { session: { ...prev, id, batchKey }, unchanged: true };

    tx.set(sRef, session);
    tx.set(
      auditDoc(db, caller.uid, batchKey),
      audit(caller, batchKey, {
        action: prev ? 'session.update' : 'session.create',
        sessionId: id,
        subjectName,
        date,
        startTime,
        summary: prev
          ? `Edited: ${changes.filter((c) => c.to === 'A').length} marked absent, ${changes.filter((c) => c.to === 'P').length} marked present`
          : `Marked: ${total - absent} present, ${absent} absent`,
        ...(prev ? { changes: changes.slice(0, MAX_STUDENTS) } : {}),
        present: total - absent,
        absent,
        total,
        version: session.version,
      })
    );
    return { session: { ...session, batchKey }, unchanged: false };
  });
};

/** Soft delete: the lecture moves to trash (restorable) and the change is logged. */
export const deleteSession = async (db: Db, caller: Caller, batchKey: string, id: unknown, baseVersion: unknown) => {
  if (!validKey(batchKey) || !validKey(id)) throw new AttendanceError(400, 'invalid', 'Invalid lecture');
  const ref = rosterRef(db, caller.uid, batchKey);
  const sRef = ref.collection('sessions').doc(id);
  const tRef = ref.collection('trash').doc(id);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(sRef);
    if (!snap.exists) throw new AttendanceError(404, 'not-found', 'This lecture was already deleted');
    const prev: AttendanceSession = snap.data();
    if (typeof baseVersion === 'number' && baseVersion !== (prev.version || 0)) {
      throw new AttendanceError(409, 'conflict', 'This lecture was changed on another device. Reload and try again.');
    }
    const now = nowIso();
    tx.set(tRef, { ...prev, deletedAt: now, deletedBy: caller.uid });
    tx.delete(sRef);
    tx.set(
      auditDoc(db, caller.uid, batchKey),
      audit(caller, batchKey, {
        action: 'session.delete',
        sessionId: id,
        subjectName: prev.subjectName,
        date: prev.date,
        startTime: prev.startTime,
        summary: `Deleted (${prev.total - prev.absent}/${prev.total} present). Can be restored.`,
        present: prev.total - prev.absent,
        absent: prev.absent,
        total: prev.total,
        ...(typeof prev.version === 'number' ? { version: prev.version } : {}),
      })
    );
  });
};

export const restoreSession = async (db: Db, caller: Caller, batchKey: string, id: unknown) => {
  if (!validKey(batchKey) || !validKey(id)) throw new AttendanceError(400, 'invalid', 'Invalid lecture');
  const ref = rosterRef(db, caller.uid, batchKey);
  const sRef = ref.collection('sessions').doc(id);
  const tRef = ref.collection('trash').doc(id);
  return db.runTransaction(async (tx: any) => {
    const [tSnap, sSnap] = await Promise.all([tx.get(tRef), tx.get(sRef)]);
    if (!tSnap.exists) throw new AttendanceError(404, 'not-found', 'Nothing to restore');
    if (sSnap.exists) throw new AttendanceError(409, 'conflict', 'This lecture has been marked again since. Delete that one first to restore this.');
    const { deletedAt, deletedBy, ...data } = tSnap.data();
    const session = { ...data, version: (data.version || 0) + 1, updatedAt: nowIso(), updatedBy: caller.uid };
    tx.set(sRef, session);
    tx.delete(tRef);
    tx.set(
      auditDoc(db, caller.uid, batchKey),
      audit(caller, batchKey, {
        action: 'session.restore',
        sessionId: id,
        subjectName: data.subjectName,
        date: data.date,
        startTime: data.startTime,
        summary: 'Restored from Recently deleted',
        present: data.total - data.absent,
        absent: data.absent,
        total: data.total,
        version: session.version,
      })
    );
    return { ...session, id, batchKey };
  });
};

/** Record that a report left the system (who, what, when) in each batch's log. */
export const logExport = async (db: Db, caller: Caller, batchKeys: string[], summary: string) => {
  const batch = db.batch();
  batchKeys.forEach((bk) => batch.set(auditDoc(db, caller.uid, bk), audit(caller, bk, { action: 'report.export', summary })));
  await batch.commit();
};
