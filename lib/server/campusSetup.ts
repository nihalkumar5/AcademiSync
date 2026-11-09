// Server side of campus setup (Admin SDK). The caller's college comes from requireCampusScope,
// never from the request, so a campus admin can only touch batches of their own college.
//
// - Create batches in bulk (programme × branches × semesters). Skips ones that already exist.
// - Timetable / calendar for a batch: applied straight away if the batch has no CR; otherwise a
//   request goes to the batch's CR(s) (push + in-app card) and is applied only when a CR approves.
// - Calendars are saved per college and linked to years of study (or "All years").
import { randomInt } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { collegeKeyOf } from '@/lib/collegeKey';
import { getCanonicalBatchKey } from '@/lib/timetableUtils';
import { sendPush, tokensFromUserDoc } from '@/lib/server/push';
import type { CampusScope } from '@/lib/server/campusAdmin';
import {
  AdminProposal,
  CampusCalendar,
  CalendarYears,
  ProposalKind,
  SetupBatch,
  buildTimetable,
  calendarFor,
  mergeCampusEvents,
  yearOf,
  yearsLabel,
} from '@/lib/campusSetup';

export class SetupError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const now = () => new Date().toISOString();
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v)); // Firestore rejects undefined
const list = (v: any): any[] => (Array.isArray(v) ? v : []);
const batches = () => adminDb.collection('shared_timetables');
const calendarsCol = () => adminDb.collection('campus_calendars');
const proposals = () => adminDb.collection('batch_admin_proposals');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function collegeBatches(scope: CampusScope) {
  const snap = await batches()
    .select('college', 'programme', 'branch', 'semester', 'inviteCode', 'crUserIds', 'removedCrUserIds', 'creatorId', 'setupByCampus', 'subjects', 'timetable', 'campusCalendarId')
    .get();
  return snap.docs.filter((d: any) => collegeKeyOf(d.data()?.college) === scope.collegeKey);
}

async function loadCalendars(scope: CampusScope): Promise<CampusCalendar[]> {
  const snap = await calendarsCol().where('collegeKey', '==', scope.collegeKey).get();
  return snap.docs
    .map((d: any) => ({ id: d.id, name: d.data().name, years: d.data().years, events: list(d.data().events), updatedAt: d.data().updatedAt || '' }))
    .sort((a: CampusCalendar, b: CampusCalendar) => a.name.localeCompare(b.name));
}

/** The batch's CRs: its pilots, plus the student who created it (batches the campus admin made don't count their creator). */
const crsOf = (b: any) =>
  Array.from(
    new Set([
      ...list(b?.crUserIds).filter((x: any) => typeof x === 'string' && x),
      ...(!b?.setupByCampus && typeof b?.creatorId === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(b.creatorId) ? [b.creatorId] : []),
    ])
  ).filter((u) => !list(b?.removedCrUserIds).includes(u));

// ---------- Read ----------
export async function loadSetup(scope: CampusScope) {
  const [docs, calendars, pendingSnap, usersSnap] = await Promise.all([
    collegeBatches(scope),
    loadCalendars(scope),
    proposals().where('collegeKey', '==', scope.collegeKey).where('status', '==', 'pending').get(),
    adminDb.collection('users').where('profile.isBatchSynced', '==', true).select('profile').get(),
  ]);
  const members = new Map<string, number>();
  const names = new Map<string, string>();
  usersSnap.forEach((u: any) => {
    const p = u.data()?.profile || {};
    if (p.batchKey) members.set(p.batchKey, (members.get(p.batchKey) || 0) + 1);
    names.set(u.id, p.name || 'CR');
  });
  const pendingBy = new Map<string, SetupBatch['pending']>();
  pendingSnap.forEach((p: any) => {
    const d = p.data();
    pendingBy.set(d.batchKey, [...(pendingBy.get(d.batchKey) || []), { id: p.id, kind: d.kind, createdAt: d.createdAt }]);
  });
  const out: SetupBatch[] = docs.map((d: any) => {
    const b = d.data();
    const crs = crsOf(b);
    return {
      id: d.id,
      programme: b.programme || '',
      branch: b.branch || '',
      semester: typeof b.semester === 'number' ? b.semester : Number(b.semester) || null,
      year: yearOf(Number(b.semester) || null),
      inviteCode: b.inviteCode || '',
      crNames: crs.map((u) => names.get(u) || 'CR'),
      hasCr: crs.length > 0,
      members: members.get(d.id) || 0,
      subjects: list(b.subjects).length,
      classes: list(b.timetable).length,
      calendarId: b.campusCalendarId || null,
      pending: pendingBy.get(d.id) || [],
    };
  });
  out.sort((a, b) => a.programme.localeCompare(b.programme) || a.branch.localeCompare(b.branch) || (a.semester || 0) - (b.semester || 0));
  return { college: scope.college, batches: out, calendars };
}

export async function loadBatchTimetable(scope: CampusScope, batchKey: string) {
  const d = await batches().doc(batchKey).get();
  const b = d.exists ? d.data() : null;
  if (!b || collegeKeyOf(b.college) !== scope.collegeKey) throw new SetupError(404, 'Batch not found');
  return { subjects: list(b.subjects), timetable: list(b.timetable) };
}

// ---------- Batches ----------
async function uniqueInviteCode() {
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    const taken = await batches().where('inviteCode', '==', code).limit(1).get();
    if (taken.empty) return code;
  }
  throw new SetupError(500, 'Could not create a join code. Try again.');
}

export async function createBatches(scope: CampusScope, input: any) {
  const programme = String(input?.programme || '').trim().slice(0, 40);
  const branches = Array.from(new Set(list(input?.branches).map((b) => String(b).trim().slice(0, 80)).filter(Boolean))).slice(0, 40);
  const semesters = Array.from(new Set(list(input?.semesters).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))).slice(0, 12);
  if (!programme) throw new SetupError(400, 'Choose the programme');
  if (!branches.length) throw new SetupError(400, 'Add at least one branch');
  if (!semesters.length) throw new SetupError(400, 'Pick at least one semester');
  if (branches.length * semesters.length > 120) throw new SetupError(400, 'That is a lot of batches at once. Add up to 120 at a time.');

  const calendars = await loadCalendars(scope);
  let created = 0;
  let skipped = 0;
  for (const branch of branches) {
    for (const semester of semesters) {
      const key = getCanonicalBatchKey(scope.college, programme, branch, semester);
      const ref = batches().doc(key);
      const exists = (await ref.get()).exists;
      if (exists) {
        skipped++;
        continue;
      }
      const cal = calendarFor(semester, calendars);
      await ref.create(
        clean({
          id: key,
          college: scope.college,
          programme,
          branch,
          semester,
          section: '',
          creatorId: scope.uid,
          creatorName: 'Campus admin',
          crUserIds: [],
          crEmails: [],
          inviteCode: await uniqueInviteCode(),
          subjects: [],
          timetable: [],
          events: cal ? mergeCampusEvents([], cal.events) : [],
          ...(cal ? { campusCalendarId: cal.id } : {}),
          exams: [],
          studentCount: 0,
          setupByCampus: scope.collegeKey,
          createdAt: now(),
          updatedAt: now(),
        })
      );
      created++;
    }
  }
  return { created, skipped };
}

// ---------- Changes: apply now, or ask the CR ----------
async function notifyCrs(crs: string[], title: string, body: string) {
  await Promise.all(
    crs.map(async (uid) => {
      try {
        const u = await adminDb.collection('users').doc(uid).get();
        const targets = tokensFromUserDoc(uid, u.data() || {});
        if (targets.length) await sendPush(targets, { title, body, data: { type: 'admin_proposal' }, link: '/' });
      } catch {}
    })
  );
}

async function applyOrPropose(scope: CampusScope, batchKey: string, kind: ProposalKind, patch: Record<string, unknown>, summary: string, preview: string[]) {
  const ref = batches().doc(batchKey);
  const snap = await ref.get();
  const b = snap.exists ? snap.data() : null;
  if (!b || collegeKeyOf(b.college) !== scope.collegeKey) throw new SetupError(404, 'Batch not found');
  const crs = crsOf(b);
  if (!crs.length) {
    await ref.update(clean({ ...patch, updatedAt: now() }));
    return 'applied' as const;
  }
  // One open request per batch and kind: a newer one replaces the older
  const older = await proposals().where('batchKey', '==', batchKey).where('status', '==', 'pending').get();
  await Promise.all(older.docs.filter((d: any) => d.data().kind === kind).map((d: any) => d.ref.update({ status: 'replaced', closedAt: now() })));
  await proposals().add(
    clean({
      batchKey,
      collegeKey: scope.collegeKey,
      kind,
      patch,
      summary,
      preview,
      by: scope.uid,
      byName: scope.name || 'Campus admin',
      status: 'pending',
      createdAt: now(),
    })
  );
  const label = `${b.programme || ''} ${b.branch || ''} · Sem ${b.semester || ''}`.trim();
  notifyCrs(crs, 'Campus admin sent an update', `${summary} for ${label}. Open the app to approve.`);
  return 'proposed' as const;
}

export async function setTimetable(scope: CampusScope, input: any) {
  const batchKey = String(input?.batchKey || '');
  if (!batchKey || batchKey.includes('/')) throw new SetupError(400, 'Choose a batch');
  const current = await loadBatchTimetable(scope, batchKey);
  const rows = list(input?.rows).slice(0, 200);
  const built = buildTimetable(rows, current.subjects);
  if (!built.timetable.length) throw new SetupError(400, 'No classes to save. Check the rows.');
  const days = Array.from(new Set(built.timetable.map((t) => t.day)));
  const result = await applyOrPropose(
    scope,
    batchKey,
    'timetable',
    { subjects: built.subjects, timetable: built.timetable },
    `New timetable: ${built.subjects.length} subjects, ${built.timetable.length} classes a week`,
    [`${days.length} days a week`, ...built.subjects.slice(0, 8).map((s) => `${s.name}${s.code ? ` (${s.code})` : ''}`)]
  );
  return { result, subjects: built.subjects.length, classes: built.timetable.length };
}

// ---------- Calendars ----------
const cleanYears = (v: any): CalendarYears => {
  if (v === 'all') return 'all';
  const ys = Array.from(new Set(list(v).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 6))).sort();
  if (!ys.length) throw new SetupError(400, 'Pick which years use this calendar');
  return ys;
};

export async function saveCalendar(scope: CampusScope, input: any) {
  const name = String(input?.name || '').trim().slice(0, 60);
  if (!name) throw new SetupError(400, 'Name this calendar, e.g. "2026–27 Odd semester"');
  const years = cleanYears(input?.years);
  const events = list(input?.events)
    .filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)) && String(e.title || '').trim())
    .slice(0, 400)
    .map((e, i) => ({
      id: String(e.id || `campus_${i}`).slice(0, 80),
      title: String(e.title).trim().slice(0, 120),
      date: String(e.date),
      type: ['exam', 'holiday', 'event', 'assignment'].includes(e.type) ? e.type : 'event',
      description: String(e.description || '').slice(0, 300),
      location: String(e.location || '').slice(0, 80),
    }));
  if (!events.length) throw new SetupError(400, 'Add at least one date');

  // Only one calendar per year (and one "All years")
  const all = await loadCalendars(scope);
  const id = typeof input?.id === 'string' && input.id ? input.id : null;
  const others = all.filter((c) => c.id !== id);
  const clash = others.find((c) => (years === 'all' ? c.years === 'all' : c.years !== 'all' && c.years.some((y) => years.includes(y))));
  if (clash) throw new SetupError(409, `"${clash.name}" already covers ${yearsLabel(clash.years)}. Edit that one, or change its years first.`);

  const ref = id ? calendarsCol().doc(id) : calendarsCol().doc();
  if (id) {
    const s = await ref.get();
    if (!s.exists || s.data()?.collegeKey !== scope.collegeKey) throw new SetupError(404, 'Calendar not found');
  }
  await ref.set(clean({ collegeKey: scope.collegeKey, name, years, events, updatedAt: now(), updatedBy: scope.uid }), { merge: true });

  // Push it to every batch that should follow it
  const calendars = [...others, { id: ref.id, name, years, events: events as any, updatedAt: now() }];
  const docs = await collegeBatches(scope);
  let applied = 0;
  let proposed = 0;
  for (const d of docs) {
    const b = d.data();
    const cal = calendarFor(Number(b.semester) || null, calendars);
    if (!cal || cal.id !== ref.id) continue;
    const full = await batches().doc(d.id).get();
    const r = await applyOrPropose(
      scope,
      d.id,
      'calendar',
      { events: mergeCampusEvents(full.data()?.events, cal.events as any), campusCalendarId: cal.id },
      `Academic calendar "${name}": ${events.length} dates`,
      events
        .filter((e) => e.type === 'holiday' || e.type === 'exam')
        .slice(0, 8)
        .map((e) => `${e.date} · ${e.title}`)
    );
    r === 'applied' ? applied++ : proposed++;
  }
  return { id: ref.id, applied, proposed };
}

export async function deleteCalendar(scope: CampusScope, id: unknown) {
  if (typeof id !== 'string' || !id || id.includes('/')) throw new SetupError(400, 'Invalid calendar');
  const ref = calendarsCol().doc(id);
  const s = await ref.get();
  if (!s.exists || s.data()?.collegeKey !== scope.collegeKey) throw new SetupError(404, 'Calendar not found');
  await ref.delete(); // batches keep the dates they already have
}

// ---------- CR side ----------
async function crBatchOf(uid: string) {
  const u = await adminDb.collection('users').doc(uid).get();
  const key = u.data()?.profile?.batchKey;
  if (typeof key !== 'string' || !key || key.includes('/')) return null;
  const b = await batches().doc(key).get();
  if (!b.exists) return null;
  const d = b.data() || {};
  return crsOf(d).includes(uid) ? { key, data: d } : null;
}

export async function listProposalsForCr(uid: string): Promise<AdminProposal[]> {
  const batch = await crBatchOf(uid);
  if (!batch) return [];
  const snap = await proposals().where('batchKey', '==', batch.key).where('status', '==', 'pending').get();
  return snap.docs
    .map((d: any) => {
      const p = d.data();
      return { id: d.id, batchKey: p.batchKey, kind: p.kind, summary: p.summary, byName: p.byName, createdAt: p.createdAt, status: p.status, preview: list(p.preview) };
    })
    .sort((a: AdminProposal, b: AdminProposal) => b.createdAt.localeCompare(a.createdAt));
}

export async function respondProposal(uid: string, id: unknown, approve: boolean) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(id)) throw new SetupError(400, 'Invalid request');
  const batch = await crBatchOf(uid);
  if (!batch) throw new SetupError(403, 'Only the CR of this batch can answer this');
  const ref = proposals().doc(id);
  await adminDb.runTransaction(async (tx: any) => {
    const s = await tx.get(ref);
    const p = s.exists ? s.data() : null;
    if (!p || p.batchKey !== batch.key || p.status !== 'pending') throw new SetupError(404, 'This request is no longer open');
    if (approve) {
      let patch = p.patch || {};
      if (p.kind === 'calendar') {
        // Re-merge with the batch's events as they are now (CR may have added some since)
        const b = await tx.get(batches().doc(batch.key));
        const campus = list(patch.events).filter((e: any) => e?.source === 'campus');
        patch = { ...patch, events: mergeCampusEvents(b.data()?.events, campus) };
      }
      tx.update(batches().doc(batch.key), clean({ ...patch, updatedAt: now() }));
    }
    tx.update(ref, { status: approve ? 'approved' : 'rejected', closedAt: now(), closedBy: uid });
  });
}

// ---------- CRs: campus admin makes or removes them directly ----------
const validUid = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(v);
const normBranch = (s: unknown) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

async function batchInCollege(scope: CampusScope, batchKey: unknown) {
  if (typeof batchKey !== 'string' || !batchKey || batchKey.includes('/')) throw new SetupError(400, 'Choose a batch');
  const ref = batches().doc(batchKey);
  const snap = await ref.get();
  const b = snap.exists ? snap.data() : null;
  if (!b || collegeKeyOf(b.college) !== scope.collegeKey) throw new SetupError(404, 'Batch not found');
  return { ref, b };
}

/** Students for a batch: its members first, then same-branch same-semester students of the college. */
export async function batchPeople(scope: CampusScope, batchKey: unknown) {
  const { b } = await batchInCollege(scope, batchKey);
  const crs = new Set(crsOf(b));
  const snap = await adminDb.collection('users').select('profile').get();
  const people: { uid: string; name: string; email: string; rollNumber: string; member: boolean; cr: boolean }[] = [];
  snap.forEach((u: any) => {
    const p = u.data()?.profile || {};
    if (collegeKeyOf(p.college) !== scope.collegeKey || p.role === 'faculty' || p.role === 'campus_admin') return;
    const member = p.batchKey === batchKey && !!p.isBatchSynced;
    const sameClass = Number(p.semester) === Number(b.semester) && normBranch(p.branch) === normBranch(b.branch);
    if (!member && !sameClass && !crs.has(u.id)) return;
    people.push({ uid: u.id, name: p.name || 'Student', email: p.email || '', rollNumber: p.rollNumber || '', member, cr: crs.has(u.id) });
  });
  people.sort((x, y) => Number(y.cr) - Number(x.cr) || Number(y.member) - Number(x.member) || x.name.localeCompare(y.name));
  return { people: people.slice(0, 400) };
}

export async function assignCr(scope: CampusScope, input: any) {
  const { ref, b } = await batchInCollege(scope, input?.batchKey);
  if (!validUid(input?.uid)) throw new SetupError(400, 'Choose a student');
  const uid = input.uid;
  const userRef = adminDb.collection('users').doc(uid);
  const u = await userRef.get();
  const data = u.data() || {};
  const p = data.profile || {};
  if (!u.exists || collegeKeyOf(p.college) !== scope.collegeKey) throw new SetupError(404, 'Student not found in your college');
  if (p.role === 'faculty' || p.role === 'campus_admin') throw new SetupError(400, 'Only students can be CRs');

  const { FieldValue } = await import('firebase-admin/firestore');
  await ref.update({
    crUserIds: FieldValue.arrayUnion(uid),
    ...(p.email ? { crEmails: FieldValue.arrayUnion(String(p.email).toLowerCase()) } : {}),
    removedCrUserIds: FieldValue.arrayRemove(uid),
    updatedAt: now(),
  });
  const label = `${b.programme || ''} ${b.branch || ''} · Sem ${b.semester || ''}`.trim();
  const note = {
    id: `cr_${Date.now()}`,
    title: '👑 You are now the CR',
    body: `The campus admin made you the CR of ${label}. Batch code: ${b.inviteCode || ''}`,
    type: 'batch_approved',
    batchCode: b.inviteCode || '',
    batchKey: ref.id,
    createdAt: now(),
    read: false,
  };
  await userRef.update({
    'profile.role': p.role === 'super_admin' ? 'super_admin' : 'cr',
    'profile.isBatchSynced': true,
    'profile.batchKey': ref.id,
    'profile.batchCode': b.inviteCode || '',
    'profile.programme': b.programme || p.programme || '',
    'profile.branch': b.branch || p.branch || '',
    'profile.semester': b.semester || p.semester || 1,
    notifications: [note, ...list(data.notifications)].slice(0, 50),
    lastUpdated: Date.now(),
  });
  // Close any pending CR request from this student
  const reqs = await adminDb.collection('cr_requests').where('userId', '==', uid).where('status', '==', 'pending').get();
  await Promise.all(reqs.docs.map((d: any) => d.ref.update({ status: 'approved', approvedAt: now(), approvedBy: scope.uid, inviteCode: b.inviteCode || '' })));
  try {
    const targets = tokensFromUserDoc(uid, data);
    if (targets.length) await sendPush(targets, { title: note.title, body: note.body, data: { type: 'batch_approved', batchKey: ref.id } });
  } catch {}
}

export async function removeCr(scope: CampusScope, input: any) {
  const { ref, b } = await batchInCollege(scope, input?.batchKey);
  if (!validUid(input?.uid)) throw new SetupError(400, 'Choose a student');
  const { FieldValue } = await import('firebase-admin/firestore');
  await ref.update({
    crUserIds: FieldValue.arrayRemove(input.uid),
    removedCrUserIds: FieldValue.arrayUnion(input.uid),
    // A removed creator must lose pilot rights too (Firestore rules trust creatorId)
    ...(b.creatorId === input.uid ? { creatorId: scope.uid, creatorName: 'Campus admin', setupByCampus: scope.collegeKey } : {}),
    updatedAt: now(),
  });
  const userRef = adminDb.collection('users').doc(input.uid);
  const u = await userRef.get();
  if (u.exists && u.data()?.profile?.role === 'cr') await userRef.update({ 'profile.role': 'student', lastUpdated: Date.now() });
}

/** Push to this college's campus admins when a student asks to be CR. */
export async function notifyCampusAdminsOfRequest(callerUid: string, requestId: unknown) {
  if (typeof requestId !== 'string' || !requestId || requestId.includes('/')) throw new SetupError(400, 'Invalid request');
  const ref = adminDb.collection('cr_requests').doc(requestId);
  const snap = await ref.get();
  const r = snap.exists ? snap.data() : null;
  if (!r || r.userId !== callerUid || r.status !== 'pending' || r.adminsNotifiedAt) return 0;
  await ref.update({ adminsNotifiedAt: now() });
  const key = collegeKeyOf(r.college);
  if (!key) return 0;
  const admins = await adminDb.collection('campus_admins').where('collegeKey', '==', key).get();
  let sent = 0;
  await Promise.all(
    admins.docs.map(async (a: any) => {
      try {
        const u = await adminDb.collection('users').doc(a.id).get();
        const targets = tokensFromUserDoc(a.id, u.data() || {});
        if (!targets.length) return;
        await sendPush(targets, {
          title: 'New CR request',
          body: `${r.name || 'A student'} · ${[r.programme, r.branch, r.semester ? `Sem ${r.semester}` : ''].filter(Boolean).join(' ')}. Open the campus panel to approve.`,
          data: { type: 'cr_request' },
          link: '/campus-admin',
        });
        sent++;
      } catch {}
    })
  );
  return sent;
}
