// Server side of QR check-in (Admin SDK, behind /api/attendance/live and /api/attendance/checkin).
//
// attendance_live/{liveId}                      one lecture's check-in (teacher-only; holds the secret)
// attendance_live/{liveId}/checkins/{uid}       a student who scanned (kept as the record of who scanned)
// attendance_live/{liveId}/devices/{hash}       which account a phone already checked in
// attendance_live/{liveId}/strays/{uid}         scanned, but not on the teacher's class list
//
// Security
// - Clients never touch these docs: Firestore rules deny everything not listed, so every read and
//   write passes the checks below. Identity comes only from the verified ID token.
// - Only a faculty linked to the batch, with a locked class list, can open a check-in, and only
//   for today. Only they can read it.
// - A student counts only if their account is on that class list (matched by uid, never by the
//   roll number they typed), with a code from the last ~12 s, signed with the lecture's secret.
// - One phone marks one student per lecture, so signing in as a friend on your own phone fails.
// - Every check-in is its own doc (no shared counter), so a whole class scanning at once never
//   contends on one document.
// - Scanning only *checks in*. The register changes when the teacher reviews and saves.
//
// Imports are relative (no "@/") so this file can be compiled and tested on its own.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isFutureDate, isValidDateKey, isValidStartTime, rosterId, sessionId, Roster } from '../attendanceShared';
import {
  CheckinOk,
  LIVE,
  LIVE_ID_RE,
  LiveCheckin,
  LiveInfo,
  LiveStray,
  MAC_HEX,
  OpenCheckin,
  codeAge,
  isDeviceId,
  macInput,
  parseCode,
} from '../attendanceLiveShared';
import { AttendanceError, Caller, isLinkedFaculty, validKey } from './attendanceService';
import { teacherName } from './studentAttendance';

type Db = any; // firebase-admin Firestore

const COL = 'attendance_live';
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null);

interface Member {
  k: string; // class-list key
  n: string; // name
  r: string; // roll
}

export interface LiveDoc {
  facultyId: string;
  facultyName: string;
  batchKey: string;
  batchLabel: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime?: string;
  sessionId: string;
  secret: string;
  status: 'open' | 'closed';
  openedAt: number;
  expiresAt: number;
  closedAt?: number;
  updatedAt: number;
  members: Record<string, Member>;
  total: number;
}

// ---------- Codes ----------
export const macFor = (secret: string, liveId: string, tick: number) =>
  createHmac('sha256', Buffer.from(secret, 'base64url')).update(macInput(liveId, tick)).digest('hex').slice(0, MAC_HEX);

const sameMac = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
const toId = (bytes: Buffer) => Array.from(bytes.subarray(0, 8), (b) => ALPHA[b % 36]).join('');
/** Same lecture → same check-in, so reopening it keeps everyone who already scanned. */
const liveIdFor = (facultyId: string, batchKey: string, sid: string) => toId(createHash('sha256').update(`${facultyId}|${batchKey}|${sid}`).digest());
const deviceHash = (liveId: string, device: string) => createHash('sha256').update(`${liveId}:${device}`).digest('hex').slice(0, 32);

const isOpen = (d: LiveDoc, now = Date.now()) => d.status === 'open' && now < d.expiresAt;

const publicInfo = (id: string, d: LiveDoc, now = Date.now()): LiveInfo => ({
  id,
  batchKey: d.batchKey,
  batchLabel: d.batchLabel,
  subjectName: d.subjectName,
  date: d.date,
  startTime: d.startTime,
  ...(d.endTime ? { endTime: d.endTime } : {}),
  status: isOpen(d, now) ? 'open' : 'closed',
  expiresAt: d.expiresAt,
  total: d.total,
  onApp: Object.keys(d.members || {}).length,
});

// A whole class scans within seconds: keep the lecture doc for a moment instead of reading it
// 60 times. A close or reopen shows up within this window.
const cache = new Map<string, { at: number; doc: LiveDoc | null }>();
const CACHE_MS = 4000;
const readLive = async (db: Db, id: string, fresh = false): Promise<LiveDoc | null> => {
  const hit = cache.get(id);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.doc;
  const snap = await db.collection(COL).doc(id).get();
  const doc = snap.exists ? (snap.data() as LiveDoc) : null;
  cache.set(id, { at: Date.now(), doc });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return doc;
};
/** Test hook: forget cached lecture docs. */
export const _clearLiveCache = () => cache.clear();

const ownLive = async (db: Db, caller: Caller, id: unknown) => {
  if (typeof id !== 'string' || !LIVE_ID_RE.test(id)) throw new AttendanceError(400, 'invalid', 'Invalid check-in');
  const ref = db.collection(COL).doc(id);
  const snap = await ref.get();
  const d = snap.exists ? (snap.data() as LiveDoc) : null;
  if (!d || d.facultyId !== caller.uid) throw new AttendanceError(404, 'not-found', 'This check-in no longer exists');
  return { ref, d };
};

const listSince = async (ref: any, since: number) => {
  const [c, s] = await Promise.all([
    ref.collection('checkins').where('at', '>', since).orderBy('at').limit(1000).get(),
    ref.collection('strays').where('at', '>', since).orderBy('at').limit(200).get(),
  ]);
  const checkins: LiveCheckin[] = [];
  c.forEach((x: any) => {
    const v = x.data() || {};
    checkins.push({ uid: x.id, key: String(v.key || x.id), name: String(v.name || ''), roll: String(v.roll || ''), at: Number(v.at) || 0 });
  });
  const strays: LiveStray[] = [];
  s.forEach((x: any) => {
    const v = x.data() || {};
    strays.push({ uid: x.id, name: String(v.name || ''), roll: String(v.roll || ''), at: Number(v.at) || 0, inBatch: v.inBatch === true });
  });
  return { checkins, strays };
};

// ---------- Teacher ----------
export interface OpenInput {
  subjectName?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  batchLabel?: unknown;
}

/** Open (or reopen) QR check-in for one lecture. Returns the secret only to its own teacher. */
export const openLive = async (db: Db, caller: Caller, profile: any, batchKey: string, input: OpenInput) => {
  if (!validKey(batchKey)) throw new AttendanceError(400, 'invalid', 'batchKey is required');
  if (!isLinkedFaculty(profile, batchKey)) throw new AttendanceError(403, 'permission-denied', 'This batch is not linked to your faculty account');
  const subjectName = str(input?.subjectName, 120);
  const startTime = isValidStartTime(input?.startTime) ? String(input.startTime).trim() : null;
  const date = input?.date;
  if (!subjectName || !startTime) throw new AttendanceError(400, 'invalid', 'Subject and time are required');
  if (!isValidDateKey(date)) throw new AttendanceError(400, 'invalid', 'Invalid date');
  if (isFutureDate(date)) throw new AttendanceError(400, 'invalid', "Check-in can't open for a future date");
  // Scanning proves someone is in the room now, so it's only for today's lectures (a day of slack for time zones)
  const yesterday = new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 10);
  if (date < yesterday) throw new AttendanceError(400, 'invalid', 'QR check-in is only for today. Mark past lectures by hand.');
  const endTime = isValidStartTime(input?.endTime) ? String(input.endTime).trim() : undefined;
  const sid = sessionId(date, startTime, subjectName);

  const rosterSnap = await db.collection('attendance').doc(rosterId(caller.uid, batchKey)).get();
  if (!rosterSnap.exists) throw new AttendanceError(409, 'no-roster', 'Lock the class list first');
  const roster = rosterSnap.data() as Roster;
  const members: Record<string, Member> = {};
  for (const s of roster.students || []) {
    // App accounts only: hand-added students (m_<roll>) have no account that could scan
    const uid = typeof s.uid === 'string' && s.uid ? s.uid : !s.manual && !String(s.key).startsWith('m_') ? s.key : null;
    if (uid && validKey(uid)) members[uid] = { k: s.key, n: s.name, r: s.roll };
  }

  let id = liveIdFor(caller.uid, batchKey, sid);
  let ref = db.collection(COL).doc(id);
  const now = Date.now();
  const prevSnap = await ref.get();
  let prev = prevSnap.exists ? (prevSnap.data() as LiveDoc) : null;
  if (prev && (prev.facultyId !== caller.uid || prev.batchKey !== batchKey || prev.sessionId !== sid)) {
    // Two lectures hashed to the same id (very unlikely): give this one a random id instead
    for (let i = 0; i < 5; i++) {
      id = toId(randomBytes(8));
      ref = db.collection(COL).doc(id);
      if (!(await ref.get()).exists) break;
    }
    prev = null;
  }
  const doc: LiveDoc = {
    facultyId: caller.uid,
    facultyName: teacherName(profile),
    batchKey,
    batchLabel: str(input?.batchLabel, 160) || prev?.batchLabel || '',
    subjectName,
    date,
    startTime,
    ...(endTime ? { endTime } : {}),
    sessionId: sid,
    secret: prev?.secret || randomBytes(32).toString('base64url'),
    status: 'open',
    openedAt: prev?.openedAt || now,
    expiresAt: now + LIVE.openMinutes * 60_000,
    updatedAt: now,
    members,
    total: (roster.students || []).length,
  };
  await ref.set(doc);
  cache.delete(id);
  const lists = await listSince(ref, 0);
  return { live: publicInfo(id, doc, now), secret: doc.secret, serverNow: Date.now(), ...lists };
};

/** Who has checked in since `since` (ms). The teacher's screen asks every couple of seconds. */
export const pollLive = async (db: Db, caller: Caller, id: unknown, since: unknown) => {
  const { ref, d } = await ownLive(db, caller, id);
  const from = typeof since === 'number' && Number.isFinite(since) && since > 0 ? since : 0;
  const lists = await listSince(ref, from);
  return { live: publicInfo(id as string, d), serverNow: Date.now(), ...lists };
};

/** Stop accepting scans. Returns everyone who checked in, for the review screen. */
export const closeLive = async (db: Db, caller: Caller, id: unknown) => {
  const { ref, d } = await ownLive(db, caller, id);
  const now = Date.now();
  if (d.status === 'open') {
    await ref.update({ status: 'closed', closedAt: now, updatedAt: now });
    d.status = 'closed';
  }
  cache.delete(id as string);
  const lists = await listSince(ref, 0);
  return { live: publicInfo(id as string, d, now), serverNow: now, ...lists };
};

/** How many checked in, for the register's audit line (only if this teacher owns that check-in). */
export const countCheckins = async (db: Db, caller: Caller, liveId: unknown, batchKey: string, sid: string): Promise<number | null> => {
  if (typeof liveId !== 'string' || !LIVE_ID_RE.test(liveId)) return null;
  const ref = db.collection(COL).doc(liveId);
  const snap = await ref.get();
  const d = snap.exists ? (snap.data() as LiveDoc) : null;
  if (!d || d.facultyId !== caller.uid || d.batchKey !== batchKey || d.sessionId !== sid) return null;
  const agg = await ref.collection('checkins').count().get();
  return Number(agg.data().count) || 0;
};

// ---------- Student ----------
const fail = (status: number, code: string, message: string) => new AttendanceError(status, code, message);

/** A student scanned a code. */
export const checkIn = async (db: Db, caller: Caller, rawCode: unknown, device: unknown): Promise<CheckinOk> => {
  const code = parseCode(rawCode);
  if (!code) throw fail(400, 'invalid', "This isn't an attendance QR");
  if (!isDeviceId(device)) throw fail(400, 'invalid', 'Update the app and try again');
  const live = await readLive(db, code.liveId);
  if (!live) throw fail(404, 'invalid', "This isn't an attendance QR");
  const now = Date.now();

  // A forged or garbled code fails here, before anything about the lecture is said
  if (!sameMac(macFor(live.secret, code.liveId, code.tick), code.mac)) throw fail(400, 'invalid', "This isn't an attendance QR");
  if (!isOpen(live, now)) throw fail(409, 'closed', `${live.facultyName} has closed check-in for ${live.subjectName}. If you were in class, tell them.`);
  const age = codeAge(code.tick, now);
  if (age !== 'fresh') throw fail(410, 'expired-code', 'That code has already changed. Scan the QR again.');

  const profileSnap = await db.collection('users').doc(caller.uid).get();
  const profile = (profileSnap.exists ? profileSnap.data()?.profile : null) || {};
  if (profile.role === 'faculty') throw fail(403, 'faculty', "Teachers don't need to check in");

  const ref = db.collection(COL).doc(code.liveId);
  const member = live.members?.[caller.uid];
  if (!member) {
    // Tell the teacher someone scanned who isn't on their list (they can add them if they joined the batch)
    const name = str(profile.name, 120) || (caller.email ? caller.email.split('@')[0] : 'Someone');
    const roll = (str(profile.rollNumber, 40) || '').toUpperCase();
    const sRef = ref.collection('strays').doc(caller.uid);
    await sRef.set({ name, roll, at: now, inBatch: profile.batchKey === live.batchKey }, { merge: true });
    throw fail(403, 'not-on-list', `You're not on ${live.facultyName}'s class list for this batch yet. Ask them to add you. They can see that you scanned.`);
  }

  const cRef = ref.collection('checkins').doc(caller.uid);
  const dRef = ref.collection('devices').doc(deviceHash(code.liveId, device));
  const result = await db.runTransaction(async (tx: any) => {
    const [c, dv] = await Promise.all([tx.get(cRef), tx.get(dRef)]);
    if (c.exists) return { status: 'already' as const, at: Number(c.data()?.at) || now };
    if (dv.exists && dv.data()?.uid !== caller.uid) {
      throw fail(409, 'device-used', 'This phone has already checked in another student for this lecture. Each phone can check in one person. Use your own phone.');
    }
    tx.create(cRef, { key: member.k, name: member.n, roll: member.r, at: now, tick: code.tick, device: dRef.id });
    if (!dv.exists) tx.create(dRef, { uid: caller.uid, at: now });
    return { status: 'marked' as const, at: now };
  });
  return { ...result, subjectName: live.subjectName, facultyName: live.facultyName, batchLabel: live.batchLabel, startTime: live.startTime };
};

/** Check-ins open right now for this student's batch, so Home can say "scan now". */
export const openForMe = async (db: Db, caller: Caller): Promise<OpenCheckin[]> => {
  const userSnap = await db.collection('users').doc(caller.uid).get();
  const profile = (userSnap.exists ? userSnap.data()?.profile : null) || {};
  if (profile.role === 'faculty' || !validKey(profile.batchKey)) return [];
  const now = Date.now();
  const snap = await db.collection(COL).where('batchKey', '==', profile.batchKey).where('status', '==', 'open').limit(20).get();
  const mine: { id: string; d: LiveDoc }[] = [];
  snap.forEach((x: any) => {
    const d = x.data() as LiveDoc;
    if (now < d.expiresAt && d.members?.[caller.uid]) mine.push({ id: x.id, d });
  });
  return Promise.all(
    mine.map(async ({ id, d }) => {
      const c = await db.collection(COL).doc(id).collection('checkins').doc(caller.uid).get();
      return {
        id,
        subjectName: d.subjectName,
        facultyName: d.facultyName,
        startTime: d.startTime,
        ...(d.endTime ? { endTime: d.endTime } : {}),
        checkedIn: c.exists,
        ...(c.exists ? { at: Number(c.data()?.at) || undefined } : {}),
      };
    })
  );
};
