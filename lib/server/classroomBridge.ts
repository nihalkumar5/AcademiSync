// Google Classroom → batch bridge (server side, Admin SDK).
//
// One Batch Pilot connects their Google account once (offline access). From then on the server checks their
// Classroom every ~30 minutes (piggybacking on the 5-minute cron) and keeps the batch's assignments in step:
//   new coursework      → shared with the whole batch (or held for the pilot when the subject is unclear)
//   due date / title    → every classmate's copy updates, and they get a heads-up when a due date moves
//   deleted / unpublished in Classroom → removed from the batch
//   new or renamed class → matched to a subject automatically (rules first, AI for the odd ones)
//
// Storage (server-only, clients can't read it):
//   classroom_bridges/{uid}               refresh token (AES-256-GCM sealed), class→subject map, settings
//   classroom_bridges/{uid}/items/{c_w}   one row per Classroom assignment seen (state: shared | pending | skipped | removed)
// Shared assignments live where every batch task lives: shared_timetables/{batchKey}/proposed_tasks/gc_{course}_{work}
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { sendPush, tokensFromUserDoc } from '@/lib/server/push';
import { logServerError } from '@/lib/errorUtils';
import { MatchSubject, matchSubject, subjectForWork, suggestSubjects } from '@/lib/classroomMatch';
import { BridgeStatus, CLASSROOM_SCOPES, CourseHow, GOOGLE_WEB_CLIENT_ID, classroomProposalId } from '@/lib/classroomShared';

export class BridgeError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;
const SECRET = () => process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
export const bridgeConfigured = () => Boolean(SECRET());

const SYNC_EVERY_MS = 30 * 60 * 1000;
const MANUAL_GAP_MS = 45 * 1000;
const LEASE_MS = 55 * 1000;
const RECENT_WINDOW_MS = 10 * 24 * 60 * 60 * 1000; // undated work newer than this still counts as current
const AI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];

const bridges = () => adminDb.collection('classroom_bridges');
const itemsOf = (uid: string) => bridges().doc(uid).collection('items');
const proposals = (batchKey: string) => adminDb.collection('shared_timetables').doc(batchKey).collection('proposed_tasks');
const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const list = (v: any): any[] => (Array.isArray(v) ? v : []);
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[ \t]+\n/g, '\n').trim().slice(0, max) : '');

// ---------- Refresh token sealing ----------
const sealKey = () =>
  crypto
    .createHash('sha256')
    .update(process.env.CLASSROOM_TOKEN_KEY || `intersemester-classroom:${SECRET()}`)
    .digest();

const seal = (plain: string) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', sealKey(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
};

const unseal = (sealed: string) => {
  const [v, iv, tag, enc] = String(sealed || '').split('.');
  if (v !== 'v1' || !iv || !tag || !enc) throw new BridgeError(409, 'Reconnect Google Classroom', 'reconnect');
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', sealKey(), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(enc, 'base64url')), d.final()]).toString('utf8');
  } catch {
    // The key changed (secret rotated): the stored token can't be read any more
    throw new BridgeError(409, 'Reconnect Google Classroom', 'reconnect');
  }
};

// ---------- Google OAuth ----------
async function googleToken(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
    cache: 'no-store',
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(data?.error || 'oauth');
    const msg =
      code === 'invalid_grant'
        ? 'That Google sign-in expired. Try connecting again.'
        : code === 'redirect_uri_mismatch' || code === 'invalid_client' || code === 'unauthorized_client'
        ? 'Google sign-in is not set up for this app yet.'
        : 'Google sign-in failed. Try again.';
    throw new BridgeError(400, msg, code);
  }
  return data;
}

const revoke = (token: string) =>
  fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => undefined);

const emailFromIdToken = (idToken?: string): string | null => {
  try {
    const payload = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'));
    return typeof payload?.email === 'string' ? payload.email.toLowerCase() : null;
  } catch {
    return null;
  }
};

async function accessTokenFor(uid: string, b: any): Promise<string> {
  if (!b?.refreshToken) throw new BridgeError(409, 'Reconnect Google Classroom', 'reconnect');
  try {
    const data = await googleToken({
      client_id: CLIENT_ID,
      client_secret: SECRET(),
      grant_type: 'refresh_token',
      refresh_token: unseal(b.refreshToken),
    });
    return String(data.access_token);
  } catch (e: any) {
    if (e?.code === 'invalid_grant' || e?.code === 'reconnect') {
      await bridges()
        .doc(uid)
        .set({ status: 'reconnect', lastError: 'Google access ended. Reconnect to keep syncing.', updatedAt: nowIso() }, { merge: true });
      throw new BridgeError(409, 'Google access ended. Reconnect Classroom.', 'reconnect');
    }
    throw e;
  }
}

// ---------- Classroom API ----------
async function gc(token: string, path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`https://classroom.googleapis.com/v1/${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.append(k, String(v));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await sleep(500 * (attempt + 1) ** 2);
      continue;
    }
    const body: any = await res.json().catch(() => ({}));
    const reason = String(body?.error?.message || res.statusText || 'Classroom error');
    if (res.status === 401) throw new BridgeError(409, 'Google access ended. Reconnect Classroom.', 'reconnect');
    if (res.status === 404) throw new BridgeError(404, reason, 'not-found');
    if (res.status === 403) {
      const blocked = /admin|policy|disabled|not enabled|has not been used/i.test(reason);
      throw new BridgeError(
        403,
        blocked ? "Your college's Google admin hasn't allowed this app yet." : "Classroom didn't allow this.",
        blocked ? 'blocked' : 'forbidden'
      );
    }
    throw new BridgeError(502, reason, 'google');
  }
}

interface LiveCourse {
  id: string;
  name: string;
  section: string;
  link: string;
}

async function listCourses(token: string): Promise<LiveCourse[]> {
  const out: any[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 5; i++) {
    const d: any = await gc(token, 'courses', { studentId: 'me', courseStates: 'ACTIVE', pageSize: 100, pageToken });
    out.push(...list(d.courses));
    pageToken = d.nextPageToken;
    if (!pageToken) break;
  }
  return out
    .filter((c) => c?.id)
    .map((c) => ({ id: String(c.id), name: clean(c.name, 140) || 'Untitled class', section: clean(c.section, 80), link: String(c.alternateLink || '') }));
}

/** Most recently changed coursework first; `complete` is false when the class has more than we fetched. */
async function listWork(token: string, courseId: string) {
  const out: any[] = [];
  let pageToken: string | undefined;
  let complete = true;
  for (let i = 0; i < 2; i++) {
    const d: any = await gc(token, `courses/${encodeURIComponent(courseId)}/courseWork`, {
      courseWorkStates: 'PUBLISHED',
      orderBy: 'updateTime desc',
      pageSize: 100,
      pageToken,
    });
    out.push(...list(d.courseWork));
    pageToken = d.nextPageToken;
    if (!pageToken) break;
    if (i === 1) complete = false;
  }
  return { work: out.filter((w) => w?.id), complete };
}

/**
 * Classroom gives due dates in UTC, with zero-valued fields left out ({hours: 18} means 18:00 UTC).
 * A date without a time means the end of that day in India (23:59 IST = 18:29 UTC).
 */
export const dueIsoOf = (cw: any): string | null => {
  const d = cw?.dueDate;
  if (!d?.year || !d?.month || !d?.day) return null;
  const t = cw?.dueTime;
  const ms = t
    ? Date.UTC(d.year, d.month - 1, d.day, t.hours || 0, t.minutes || 0, t.seconds || 0)
    : Date.UTC(d.year, d.month - 1, d.day, 18, 29, 0);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

const isCurrent = (cw: any, due: string | null, now = Date.now()) => {
  if (due) return Date.parse(due) >= now - 6 * 60 * 60 * 1000; // still due (or only just passed)
  const t = Date.parse(cw?.updateTime || cw?.creationTime || '');
  return Number.isFinite(t) && now - t <= RECENT_WINDOW_MS;
};

const priorityFor = (due: string | null): 'High' | 'Medium' | 'Low' => {
  if (!due) return 'Medium';
  const days = (Date.parse(due) - Date.now()) / 86400000;
  return days <= 2 ? 'High' : days <= 5 ? 'Medium' : 'Low';
};

/** Work with no due date still needs a date in the app: a week after it was posted, 23:59 IST. */
const fallbackDeadline = (createdAt?: string) => {
  const base = Date.parse(createdAt || '') || Date.now();
  const d = new Date(base + 7 * 86400000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 18, 29, 0)).toISOString();
};

const istDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// ---------- Who is this pilot? ----------
interface PilotCtx {
  uid: string;
  name: string;
  batchKey: string;
  subjects: MatchSubject[];
  members: number;
}

async function pilotContext(uid: string, verifiedEmail?: string | null): Promise<PilotCtx> {
  const u = await adminDb.collection('users').doc(uid).get();
  const p = (u.exists ? u.data()?.profile : null) || {};
  const batchKey = typeof p.batchKey === 'string' && /^[A-Za-z0-9_-]{2,200}$/.test(p.batchKey) ? p.batchKey : null;
  if (!batchKey || p.isBatchSynced === false) throw new BridgeError(403, 'Join your class batch first', 'no-batch');
  const bs = await adminDb.collection('shared_timetables').doc(batchKey).get();
  if (!bs.exists) throw new BridgeError(404, 'Your batch was not found', 'no-batch');
  const b = bs.data() || {};
  const email = (verifiedEmail || '').toLowerCase();
  const removed = list(b.removedCrUserIds).includes(uid);
  const pilot =
    !removed &&
    (list(b.crUserIds).includes(uid) ||
      (!b.setupByCampus && b.creatorId === uid) ||
      (!!email && list(b.crEmails).map((e: any) => String(e || '').toLowerCase()).includes(email)) ||
      (p.role === 'cr' && p.batchKey === batchKey));
  if (!pilot) throw new BridgeError(403, 'Only Batch Pilots can connect Classroom', 'not-pilot');
  const subjects: MatchSubject[] = list(b.subjects)
    .filter((s: any) => s?.id && s?.name && !s.isPersonal)
    .map((s: any) => ({
      id: String(s.id),
      name: String(s.name),
      code: s.code ? String(s.code) : '',
      shortName: s.shortName ? String(s.shortName) : '',
      isLab: !!s.isLab,
    }));
  return { uid, name: clean(p.name, 60) || 'Batch Pilot', batchKey, subjects, members: Number(b.studentCount) || 1 };
}

// ---------- AI fallback for class names no rule could place ----------
async function aiMatchCourses(courses: LiveCourse[], subjects: MatchSubject[]): Promise<Record<string, string>> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || !courses.length || !subjects.length) return {};
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const prompt = `You match Google Classroom classes to college subjects for one class of students.
Classes: ${JSON.stringify(courses.map((c) => ({ id: c.id, name: c.name, section: c.section })))}
Subjects: ${JSON.stringify(subjects.map((s) => ({ id: s.id, name: s.name, code: s.code || '', lab: !!s.isLab })))}
Class names can use abbreviations, subject codes, teacher names, years or section letters. Lab classes belong to lab subjects.
A class that covers many subjects, or one you are not sure about, gets null.
Reply with JSON only: {"<class id>": "<subject id or null>"}`;
    for (const m of AI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: m, generationConfig: { temperature: 0, responseMimeType: 'application/json' } });
        const r: any = await Promise.race([model.generateContent(prompt), sleep(12000).then(() => null)]);
        if (!r) continue;
        const text = String(r.response.text() || '');
        const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        const out: Record<string, string> = {};
        for (const c of courses) {
          const v = json?.[c.id];
          if (typeof v === 'string' && subjects.some((s) => s.id === v)) out[c.id] = v;
        }
        return out;
      } catch {
        continue;
      }
    }
  } catch (e) {
    logServerError('ClassroomBridge:ai', e);
  }
  return {};
}

// ---------- Sharing to the batch ----------
interface Item {
  id: string;
  batchKey: string;
  courseId: string;
  courseWorkId: string;
  courseName: string;
  title: string;
  description: string;
  due: string | null;
  link: string;
  updateTime: string;
  state: 'shared' | 'pending' | 'skipped' | 'removed';
  reason?: 'subject' | 'review' | null;
  subjectId?: string | null;
  proposalId?: string;
  sharedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const proposalFields = (item: Item, subject: MatchSubject) => {
  const noDue = !item.due;
  return {
    title: item.title || 'Classroom assignment',
    description: `${noDue ? 'No due date set in Classroom.\n\n' : ''}${item.description || `From ${item.courseName} on Google Classroom.`}`.slice(0, 1600),
    subjectId: subject.id,
    subjectName: subject.name,
    deadline: item.due || fallbackDeadline(item.createdAt),
    attachmentName: item.link,
    attachmentUrl: item.link,
    source: 'google_classroom',
    externalId: item.courseWorkId,
    externalLink: item.link,
    courseId: item.courseId,
    courseName: item.courseName,
    noDueDate: noDue,
    updatedAt: nowIso(),
  };
};

/** Create or update the batch copy. Adopts an older manual Classroom broadcast of the same work instead of duplicating it. */
async function upsertProposal(ctx: PilotCtx, item: Item, subject: MatchSubject): Promise<string> {
  const col = proposals(ctx.batchKey);
  let ref = col.doc(item.proposalId || classroomProposalId(item.courseId, item.courseWorkId));
  let snap = await ref.get();
  if (!snap.exists && !item.proposalId && item.link) {
    const old = await col.where('attachmentName', '==', item.link).limit(1).get();
    if (!old.empty) {
      ref = old.docs[0].ref;
      snap = old.docs[0];
    }
  }
  const fields = proposalFields(item, subject);
  if (snap.exists) {
    await ref.set(fields, { merge: true });
  } else {
    const at = nowIso();
    await ref.set({
      id: ref.id,
      batchKey: ctx.batchKey,
      ...fields,
      priority: priorityFor(item.due),
      creatorId: ctx.uid,
      creatorName: ctx.name,
      creatorRole: 'cr',
      votes: { [ctx.uid]: 'approve' },
      approvalsCount: 1,
      rejectionsCount: 0,
      status: 'approved',
      totalEligibleMembers: Math.max(ctx.members, 1),
      approvedAt: at,
      createdAt: at,
    });
  }
  return ref.id;
}

async function pushToBatch(batchKey: string, exceptUid: string, title: string, body: string) {
  try {
    const snap = await adminDb.collection('users').where('profile.batchKey', '==', batchKey).select('fcmToken', 'webPushTokens').get();
    const targets: ReturnType<typeof tokensFromUserDoc> = [];
    snap.forEach((d: any) => {
      if (d.id !== exceptUid) targets.push(...tokensFromUserDoc(d.id, d.data()));
    });
    if (targets.length) await sendPush(targets, { title, body, data: { type: 'batch_task', batchKey }, link: '/' });
  } catch (e) {
    logServerError('ClassroomBridge:pushBatch', e);
  }
}

async function pushToUser(uid: string, title: string, body: string) {
  try {
    const d = await adminDb.collection('users').doc(uid).get();
    const targets = tokensFromUserDoc(uid, d.data());
    if (targets.length) await sendPush(targets, { title, body, data: { type: 'classroom_review' }, link: '/' });
  } catch (e) {
    logServerError('ClassroomBridge:pushUser', e);
  }
}

async function announce(ctx: PilotCtx, added: Item[], moved: Item[], subjectName: (i: Item) => string) {
  if (added.length === 1) {
    const i = added[0];
    await pushToBatch(
      ctx.batchKey,
      ctx.uid,
      `New assignment: ${i.title}`.slice(0, 120),
      `${subjectName(i)}${i.due ? ` · due ${istDate(i.due)}` : ''} · from Classroom`
    );
  } else if (added.length > 1) {
    const names = added
      .slice(0, 2)
      .map((i) => i.title)
      .join(', ');
    await pushToBatch(ctx.batchKey, ctx.uid, `${added.length} new assignments from Classroom`, `${names}${added.length > 2 ? ` and ${added.length - 2} more` : ''}`);
  }
  if (moved.length === 1) {
    const i = moved[0];
    await pushToBatch(ctx.batchKey, ctx.uid, `Due date changed: ${i.title}`.slice(0, 120), i.due ? `Now due ${istDate(i.due)}` : 'The due date was removed in Classroom');
  } else if (moved.length > 1) {
    await pushToBatch(
      ctx.batchKey,
      ctx.uid,
      `${moved.length} due dates changed`,
      moved
        .slice(0, 2)
        .map((i) => i.title)
        .join(', ')
    );
  }
}

// ---------- The sync ----------
export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  pending: number;
  skipped?: 'busy' | 'recent';
}

export async function syncBridge(uid: string, opts: { manual?: boolean; verifiedEmail?: string | null } = {}): Promise<SyncResult> {
  const ref = bridges().doc(uid);
  const leased: any = await adminDb.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const b = snap.data() || {};
    if ((b.leaseUntil || 0) > Date.now()) return { busy: true };
    if (opts.manual && Date.now() - (Date.parse(b.lastSyncAt || '') || 0) < MANUAL_GAP_MS) return { recent: true };
    tx.update(ref, { leaseUntil: Date.now() + LEASE_MS });
    return b;
  }, undefined);
  if (!leased) throw new BridgeError(404, 'Classroom is not connected', 'not-connected');
  if (leased.busy) return { added: 0, updated: 0, removed: 0, pending: 0, skipped: 'busy' };
  if (leased.recent) return { added: 0, updated: 0, removed: 0, pending: 0, skipped: 'recent' };
  const b = leased;

  const result: SyncResult = { added: 0, updated: 0, removed: 0, pending: 0 };
  try {
    let ctx: PilotCtx;
    try {
      ctx = await pilotContext(uid, opts.verifiedEmail);
    } catch (e: any) {
      if (e?.code === 'not-pilot' || e?.code === 'no-batch') {
        await ref.set({ status: 'paused', lastError: e.message, lastSyncAt: nowIso(), leaseUntil: 0 }, { merge: true });
      }
      throw e;
    }
    const token = await accessTokenFor(uid, b);
    const subjects = ctx.subjects;
    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    // 1. Classes: keep the pilot's choices, re-match new or renamed ones, drop subjects the batch no longer has
    const batchChanged = b.batchKey !== ctx.batchKey;
    const prevCourses: Record<string, any> = batchChanged ? {} : b.courses || {};
    const live = await listCourses(token);
    const courses: Record<string, any> = {};
    const forAi: LiveCourse[] = [];
    for (const c of live) {
      const prev = prevCourses[c.id];
      const base = { name: c.name, section: c.section, link: c.link };
      if (prev && (prev.how === 'off' || (prev.how === 'manual' && prev.subjectId && subjectById.has(prev.subjectId)))) {
        courses[c.id] = { ...prev, ...base };
        continue;
      }
      if (prev && prev.name === c.name && prev.subjectId && subjectById.has(prev.subjectId)) {
        courses[c.id] = { ...prev, ...base };
        continue;
      }
      const m = matchSubject(c.name, subjects);
      if (m.subjectId) courses[c.id] = { ...base, subjectId: m.subjectId, how: 'auto' as CourseHow, aiTried: false };
      else {
        const aiTried = !!(prev && prev.name === c.name && prev.aiTried);
        courses[c.id] = { ...base, subjectId: null, how: 'none' as CourseHow, aiTried };
        if (!aiTried) forAi.push(c);
      }
    }
    if (forAi.length) {
      const ai = await aiMatchCourses(forAi, subjects);
      for (const c of forAi) {
        courses[c.id].aiTried = true;
        if (ai[c.id]) Object.assign(courses[c.id], { subjectId: ai[c.id], how: 'ai' });
      }
    }

    // 2. Assignments
    const itemSnap = await itemsOf(uid).get();
    const items = new Map<string, Item>(itemSnap.docs.map((d: any) => [d.id, { id: d.id, ...d.data() } as Item]));
    const writes: { id: string; data: Partial<Item> }[] = [];
    const added: Item[] = [];
    const moved: Item[] = [];
    const newPending: Item[] = [];
    const autoShare = b.autoShare !== false;
    const subjectName = (i: Item) => (i.subjectId && subjectById.get(i.subjectId)?.name) || i.courseName;

    const courseIds = Object.keys(courses).filter((id) => courses[id].how !== 'off');
    for (let i = 0; i < courseIds.length; i += 3) {
      const chunk = courseIds.slice(i, i + 3);
      const fetched = await Promise.all(
        chunk.map((id) =>
          listWork(token, id).catch((e) => {
            if (e?.code === 'reconnect') throw e;
            return null;
          })
        )
      );
      for (let k = 0; k < chunk.length; k++) {
        const courseId = chunk[k];
        const data = fetched[k];
        if (!data) continue;
        const course = courses[courseId];
        const seen = new Set<string>();
        for (const cw of data.work) {
          const id = `${courseId}_${cw.id}`;
          seen.add(id);
          const due = dueIsoOf(cw);
          const prev = items.get(id);
          const fresh = {
            batchKey: ctx.batchKey,
            courseId,
            courseWorkId: String(cw.id),
            courseName: course.name,
            title: clean(cw.title, 160),
            description: clean(cw.description, 1400),
            due,
            link: String(cw.alternateLink || ''),
            updateTime: String(cw.updateTime || ''),
          };

          if (!prev || prev.batchKey !== ctx.batchKey || prev.state === 'removed') {
            if (!isCurrent(cw, due)) continue; // old work: leave it alone
            const subjectId = subjectForWork(course.subjectId, fresh.title, subjects);
            const item: Item = { id, ...fresh, state: 'pending', subjectId, createdAt: String(cw.creationTime || nowIso()), updatedAt: nowIso() };
            if (subjectId && autoShare) {
              item.proposalId = await upsertProposal(ctx, item, subjectById.get(subjectId)!);
              item.state = 'shared';
              item.sharedAt = nowIso();
              item.reason = null;
              added.push(item);
              result.added++;
            } else {
              item.reason = subjectId ? 'review' : 'subject';
              newPending.push(item);
            }
            writes.push({ id, data: item });
            continue;
          }

          // Already known: follow edits made in Classroom
          if (prev.updateTime !== fresh.updateTime || prev.title !== fresh.title || prev.due !== fresh.due) {
            const next: Item = { ...prev, ...fresh, updatedAt: nowIso() };
            if (prev.state === 'shared' && prev.subjectId && subjectById.has(prev.subjectId)) {
              next.proposalId = await upsertProposal(ctx, next, subjectById.get(prev.subjectId)!);
              result.updated++;
              if ((prev.due || '') !== (fresh.due || '') && (!fresh.due || Date.parse(fresh.due) > Date.now())) moved.push(next);
            }
            writes.push({ id, data: next });
          }
        }

        // Gone from Classroom (deleted or moved back to draft) → take it off the batch
        const tracked = Array.from(items.values()).filter(
          (it) => it.courseId === courseId && it.batchKey === ctx.batchKey && (it.state === 'shared' || it.state === 'pending') && !seen.has(it.id)
        );
        for (const it of tracked.slice(0, 15)) {
          let gone = data.complete;
          if (!gone) {
            try {
              const w: any = await gc(token, `courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(it.courseWorkId)}`);
              gone = w?.state !== 'PUBLISHED';
            } catch (e: any) {
              gone = e?.code === 'not-found';
            }
          }
          if (!gone) continue;
          if (it.state === 'shared' && it.proposalId) await proposals(ctx.batchKey).doc(it.proposalId).delete().catch(() => undefined);
          writes.push({ id: it.id, data: { ...it, state: 'removed', updatedAt: nowIso() } });
          result.removed++;
        }
      }
    }

    // 3. Save
    for (let i = 0; i < writes.length; i += 400) {
      const batch = adminDb.batch();
      for (const w of writes.slice(i, i + 400)) batch.set(itemsOf(uid).doc(w.id), w.data, { merge: true });
      await batch.commit();
    }
    const after = new Map(items);
    for (const w of writes) after.set(w.id, { ...(after.get(w.id) as Item), ...(w.data as Item) });
    const all = Array.from(after.values()).filter((i) => i.batchKey === ctx.batchKey);
    result.pending = all.filter((i) => i.state === 'pending').length;
    await ref.set(
      {
        batchKey: ctx.batchKey,
        courses,
        status: 'active',
        lastError: null,
        lastSyncAt: nowIso(),
        lastResult: { added: result.added, updated: result.updated, removed: result.removed },
        totals: { shared: all.filter((i) => i.state === 'shared').length, pending: result.pending },
        leaseUntil: 0,
        updatedAt: nowIso(),
      },
      { merge: true }
    );

    // 4. Tell people
    await announce(ctx, added, moved, subjectName);
    if (newPending.length) {
      const unsure = newPending.filter((i) => i.reason === 'subject').length;
      await pushToUser(
        uid,
        newPending.length === 1 ? `Classroom: ${newPending[0].title}`.slice(0, 120) : `Classroom: ${newPending.length} new assignments`,
        unsure ? 'Pick the subject and it goes to your batch.' : 'Review and share with your batch.'
      );
    }
    return result;
  } catch (e: any) {
    const code = e?.code;
    await ref
      .set(
        {
          ...(code === 'reconnect' ? { status: 'reconnect' } : {}),
          lastError: e instanceof BridgeError ? e.message : "Couldn't reach Google Classroom. Will try again soon.",
          lastSyncAt: nowIso(),
          leaseUntil: 0,
        },
        { merge: true }
      )
      .catch(() => undefined);
    if (!(e instanceof BridgeError)) logServerError('ClassroomBridge:sync', e);
    throw e;
  }
}

/** Cron: sync every connected pilot whose last check is older than 30 minutes, within a time budget. */
export async function syncDueBridges(budgetMs = 25_000) {
  if (!bridgeConfigured()) return { synced: 0, failed: 0, waiting: 0 };
  const start = Date.now();
  const snap = await bridges().where('status', '==', 'active').select('lastSyncAt').get();
  const due = snap.docs
    .map((d: any) => ({ uid: d.id as string, last: Date.parse(d.data()?.lastSyncAt || '') || 0 }))
    .filter((x: any) => start - x.last >= SYNC_EVERY_MS)
    .sort((a: any, b: any) => a.last - b.last);
  let synced = 0;
  let failed = 0;
  for (const d of due) {
    if (Date.now() - start > budgetMs) break;
    try {
      await syncBridge(d.uid);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed, waiting: Math.max(0, due.length - synced - failed) };
}

// ---------- Actions from the app ----------
export async function connectBridge(uid: string, code: string, platform: string, verifiedEmail?: string | null) {
  if (!bridgeConfigured()) throw new BridgeError(503, 'Classroom sync is not switched on yet', 'not-configured');
  if (typeof code !== 'string' || code.length < 10 || code.length > 2048) throw new BridgeError(400, 'Invalid sign-in code', 'bad-code');
  const ctx = await pilotContext(uid, verifiedEmail);
  const data = await googleToken({
    code,
    client_id: CLIENT_ID,
    client_secret: SECRET(),
    grant_type: 'authorization_code',
    redirect_uri: platform === 'web' ? 'postmessage' : '',
  });
  const granted = String(data.scope || '').split(/\s+/);
  if (CLASSROOM_SCOPES.some((s) => !granted.includes(s))) {
    if (data.access_token) await revoke(String(data.access_token));
    throw new BridgeError(400, "Tick both Classroom permissions on Google's screen, then try again.", 'scopes');
  }
  if (!data.refresh_token) {
    // Google only issues a long-lived token on a fresh consent. Clearing this grant makes the next try issue one.
    if (data.access_token) await revoke(String(data.access_token));
    throw new BridgeError(409, 'Google needs you to confirm once more. Tap Connect again.', 'reconsent');
  }
  const email = emailFromIdToken(data.id_token);
  const ref = bridges().doc(uid);
  const prev = (await ref.get()).data() || {};
  const sameAccount = !!(prev.email && email && prev.email === email && prev.batchKey === ctx.batchKey);
  if (prev.refreshToken && !sameAccount) {
    try {
      await revoke(unseal(prev.refreshToken));
    } catch {}
  }
  await ref.set(
    {
      uid,
      email,
      refreshToken: seal(String(data.refresh_token)),
      scopes: String(data.scope || ''),
      status: 'active',
      lastError: null,
      autoShare: prev.autoShare !== false,
      batchKey: sameAccount ? prev.batchKey : ctx.batchKey,
      courses: sameAccount ? prev.courses || {} : {},
      leaseUntil: 0,
      lastSyncAt: null,
      connectedAt: prev.connectedAt && sameAccount ? prev.connectedAt : nowIso(),
      updatedAt: nowIso(),
    },
    { merge: true }
  );
  try {
    await syncBridge(uid, { verifiedEmail });
  } catch (e: any) {
    if (e?.code === 'blocked') throw e;
  }
}

export async function disconnectBridge(uid: string) {
  const ref = bridges().doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return;
  const b = snap.data() || {};
  if (b.refreshToken) {
    try {
      await revoke(unseal(b.refreshToken));
    } catch {}
  }
  const items = await itemsOf(uid).select().get();
  for (let i = 0; i < items.docs.length; i += 400) {
    const batch = adminDb.batch();
    items.docs.slice(i, i + 400).forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
  }
  await ref.delete();
}

async function loadBridge(uid: string) {
  const snap = await bridges().doc(uid).get();
  if (!snap.exists || !snap.data()?.refreshToken) throw new BridgeError(404, 'Classroom is not connected', 'not-connected');
  return snap.data() || {};
}

export async function setAutoShare(uid: string, on: boolean, verifiedEmail?: string | null) {
  await loadBridge(uid);
  await bridges().doc(uid).set({ autoShare: !!on, updatedAt: nowIso() }, { merge: true });
  if (on) {
    const ctx = await pilotContext(uid, verifiedEmail);
    const pending = await itemsOf(uid).where('state', '==', 'pending').get();
    const ids = pending.docs.filter((d: any) => d.data()?.reason === 'review' && d.data()?.subjectId).map((d: any) => d.id);
    if (ids.length) await shareItems(uid, ids, null, verifiedEmail, ctx);
  }
}

/** The pilot picks the subject for a class (or turns the class off / back to automatic). */
export async function setCourseSubject(uid: string, courseId: string, value: string, verifiedEmail?: string | null) {
  const b = await loadBridge(uid);
  const ctx = await pilotContext(uid, verifiedEmail);
  const course = (b.courses || {})[courseId];
  if (!course) throw new BridgeError(404, 'That class was not found', 'no-course');
  let next: any;
  if (value === 'off') next = { ...course, subjectId: null, how: 'off' };
  else if (value === 'auto') {
    const m = matchSubject(course.name, ctx.subjects);
    next = { ...course, subjectId: m.subjectId, how: m.subjectId ? 'auto' : 'none', aiTried: false };
  } else if (ctx.subjects.some((s) => s.id === value)) next = { ...course, subjectId: value, how: 'manual' };
  else throw new BridgeError(400, 'Pick one of your batch subjects', 'bad-subject');
  await bridges()
    .doc(uid)
    .set({ courses: { [courseId]: next }, updatedAt: nowIso() }, { merge: true });

  // Bring this class's assignments in line with the new choice
  const snap = await itemsOf(uid).where('courseId', '==', courseId).get();
  const subjectById = new Map(ctx.subjects.map((s) => [s.id, s]));
  const toShare: string[] = [];
  for (const d of snap.docs) {
    const it = { id: d.id, ...d.data() } as Item;
    if (it.batchKey !== ctx.batchKey) continue;
    const sid = next.subjectId ? subjectForWork(next.subjectId, it.title, ctx.subjects) : null;
    if (it.state === 'shared' && sid && sid !== it.subjectId) {
      await upsertProposal(ctx, it, subjectById.get(sid)!);
      await d.ref.set({ subjectId: sid, updatedAt: nowIso() }, { merge: true });
    } else if (it.state === 'pending' && sid) {
      await d.ref.set({ subjectId: sid, reason: 'review', updatedAt: nowIso() }, { merge: true });
      if (b.autoShare !== false) toShare.push(it.id);
    }
  }
  if (toShare.length) await shareItems(uid, toShare, null, verifiedEmail, ctx);
}

export async function shareItems(uid: string, ids: string[], subjectId: string | null, verifiedEmail?: string | null, known?: PilotCtx) {
  const ctx = known || (await pilotContext(uid, verifiedEmail));
  const subjectById = new Map(ctx.subjects.map((s) => [s.id, s]));
  if (subjectId && !subjectById.has(subjectId)) throw new BridgeError(400, 'Pick one of your batch subjects', 'bad-subject');
  const added: Item[] = [];
  for (const id of ids.slice(0, 50)) {
    const ref = itemsOf(uid).doc(String(id));
    const d = await ref.get();
    if (!d.exists) continue;
    const it = { id: d.id, ...d.data() } as Item;
    if (it.state !== 'pending' || it.batchKey !== ctx.batchKey) continue;
    const sid = subjectId || it.subjectId;
    if (!sid || !subjectById.has(sid)) throw new BridgeError(400, 'Pick a subject first', 'no-subject');
    const pid = await upsertProposal(ctx, { ...it, subjectId: sid }, subjectById.get(sid)!);
    await ref.set({ state: 'shared', subjectId: sid, proposalId: pid, sharedAt: nowIso(), reason: null, updatedAt: nowIso() }, { merge: true });
    added.push({ ...it, subjectId: sid });
  }
  if (added.length) {
    await bumpTotals(uid, ctx.batchKey);
    await announce(ctx, added, [], (i) => subjectById.get(i.subjectId || '')?.name || i.courseName);
  }
  return added.length;
}

export async function skipItems(uid: string, ids: string[]) {
  const b = await loadBridge(uid);
  for (const id of ids.slice(0, 50)) {
    await itemsOf(uid).doc(String(id)).set({ state: 'skipped', updatedAt: nowIso() }, { merge: true });
  }
  if (b.batchKey) await bumpTotals(uid, b.batchKey);
}

/** Take a shared assignment back off the batch (it won't come back unless the pilot shares it again). */
export async function unshareItem(uid: string, id: string, verifiedEmail?: string | null) {
  const ctx = await pilotContext(uid, verifiedEmail);
  const ref = itemsOf(uid).doc(String(id));
  const d = await ref.get();
  if (!d.exists) return;
  const it = d.data() as Item;
  if (it.state === 'shared' && it.proposalId && it.batchKey === ctx.batchKey) {
    await proposals(ctx.batchKey).doc(it.proposalId).delete().catch(() => undefined);
  }
  await ref.set({ state: 'skipped', updatedAt: nowIso() }, { merge: true });
  await bumpTotals(uid, ctx.batchKey);
}

async function bumpTotals(uid: string, batchKey: string) {
  const snap = await itemsOf(uid).select('state', 'batchKey').get();
  let shared = 0;
  let pending = 0;
  snap.forEach((d: any) => {
    const v = d.data();
    if (v.batchKey !== batchKey) return;
    if (v.state === 'shared') shared++;
    if (v.state === 'pending') pending++;
  });
  await bridges()
    .doc(uid)
    .set({ totals: { shared, pending } }, { merge: true });
}

// ---------- What the app shows ----------
export async function bridgeStatus(uid: string, verifiedEmail?: string | null): Promise<BridgeStatus> {
  let ctx: PilotCtx | null = null;
  let pilotError: string | null = null;
  try {
    ctx = await pilotContext(uid, verifiedEmail);
  } catch (e: any) {
    pilotError = e?.code || 'error';
  }
  const snap = await bridges().doc(uid).get();
  const b = snap.exists ? snap.data() || {} : null;
  const subjects = ctx?.subjects || [];
  const subjectName = (id?: string | null) => (id ? subjects.find((s) => s.id === id)?.name || null : null);
  const status: BridgeStatus = {
    configured: bridgeConfigured(),
    isPilot: !!ctx,
    pilotError,
    connected: !!b?.refreshToken,
    email: b?.email || null,
    status: b?.status || null,
    lastError: b?.lastError || null,
    autoShare: b ? b.autoShare !== false : true,
    lastSyncAt: b?.lastSyncAt || null,
    totals: { shared: b?.totals?.shared || 0, pending: b?.totals?.pending || 0 },
    courses: [],
    pending: [],
    recent: [],
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code || '', isLab: !!s.isLab })),
  };
  if (!b?.refreshToken) return status;

  const unmatched = (c: { subjectId: string | null; how: CourseHow }) => !c.subjectId && c.how !== 'off';
  status.courses = Object.entries(b.courses || {})
    .map(([id, c]: [string, any]) => ({
      id,
      name: String(c.name || 'Class'),
      section: String(c.section || ''),
      link: String(c.link || ''),
      subjectId: c.subjectId || null,
      subjectName: subjectName(c.subjectId),
      how: (c.how || 'none') as CourseHow,
    }))
    .sort((a, b) => Number(unmatched(b)) - Number(unmatched(a)) || a.name.localeCompare(b.name));

  if (ctx) {
    const items: Item[] = (await itemsOf(uid).get()).docs
      .map((d: any) => ({ id: d.id, ...d.data() }) as Item)
      .filter((i: Item) => i.batchKey === ctx!.batchKey);
    status.pending = items
      .filter((i) => i.state === 'pending')
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
      .slice(0, 30)
      .map((i) => ({
        id: i.id,
        courseId: i.courseId,
        courseName: i.courseName,
        title: i.title,
        due: i.due,
        link: i.link,
        reason: (i.reason || 'subject') as 'subject' | 'review',
        subjectId: i.subjectId || null,
        suggestions: suggestSubjects(`${i.courseName} ${i.title}`, subjects, 3),
      }));
    status.recent = items
      .filter((i) => i.state === 'shared')
      .sort((a, b) => (b.sharedAt || '').localeCompare(a.sharedAt || ''))
      .slice(0, 8)
      .map((i) => ({ id: i.id, title: i.title, subjectName: subjectName(i.subjectId) || i.courseName, due: i.due, link: i.link, sharedAt: i.sharedAt || '' }));
    status.totals = { shared: items.filter((i) => i.state === 'shared').length, pending: status.pending.length };
  }
  return status;
}
