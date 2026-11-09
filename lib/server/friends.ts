// Server side of Friends (Admin SDK). Clients never touch these collections directly.
//
// Rules enforced here:
// - Friends must be at the same campus (college key from each profile). Other campuses are refused.
// - Every friendship starts as a request the other person accepts (QR, code, or a classmate suggestion).
// - Friends see each other's free/busy for 7 days, built from the timetable on the server.
//   Class names only if that person turned on "Show my class name". Ghost mode / "hide from" shows nothing.
// - Plans ("Canteen at 1?") can only invite accepted friends, and notify them by push.
import { randomInt } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { collegeKeyOf } from '@/lib/collegeKey';
import { buildWidgetDays } from '@/lib/widget';
import { sendPush, tokensFromUserDoc } from '@/lib/server/push';
import { electiveLens, personalTimetable } from '@/lib/electives';
import { CODE_RE, Friend, FriendsData, PersonLite, Plan, Place, PLACES, STATUS_MINUTES } from '@/lib/friends';

export class FriendError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

const IST = 5.5 * 3600 * 1000;
const LIMITS = { requests: 40, plans: 12 };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const now = () => new Date().toISOString();
const pairId = (a: string, b: string) => (a < b ? `${a}__${b}` : `${b}__${a}`);
const istToday = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
/** A Date at local midnight of India's current date (buildWidgetDays reads local date parts). */
const istTodayDate = () => {
  const d = new Date(Date.now() + IST);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const validUid = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(v);
const list = (v: any): any[] => (Array.isArray(v) ? v : []);

const users = () => adminDb.collection('users');
const metaRef = (uid: string) => adminDb.collection('friends_meta').doc(uid);
const pairs = () => adminDb.collection('friendships');

const lite = (uid: string, data: any, myBatch?: string | null): PersonLite => {
  const p = data?.profile || {};
  return {
    uid,
    name: (typeof p.name === 'string' && p.name.trim()) || 'Student',
    ...(typeof p.avatarUrl === 'string' ? { avatarUrl: p.avatarUrl } : {}),
    branch: typeof p.branch === 'string' ? p.branch : '',
    semester: typeof p.semester === 'number' ? p.semester : null,
    sameBatch: !!myBatch && p.batchKey === myBatch,
  };
};

/** The person's friend record (creates their code the first time). */
async function ensureMeta(uid: string, userData?: any) {
  const ref = metaRef(uid);
  const snap = await ref.get();
  const data = userData || (await users().doc(uid).get()).data() || {};
  const collegeKey = collegeKeyOf(data?.profile?.college);
  if (snap.exists && snap.data()?.code) {
    const m = snap.data() || {};
    if (m.collegeKey !== collegeKey) await ref.set({ collegeKey }, { merge: true });
    return { ...m, collegeKey };
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    try {
      await adminDb.collection('friend_codes').doc(code).create({ uid, at: now() });
      const m = { code, collegeKey, ghost: false, showClass: true, hiddenFrom: [], status: null, createdAt: now() };
      await ref.set(m, { merge: true });
      return m;
    } catch {
      // code taken, try another
    }
  }
  throw new FriendError(500, 'Could not create your friend code. Try again.');
}

async function bump(uid: string, kind: keyof typeof LIMITS) {
  const ref = adminDb.collection('friend_limits').doc(uid);
  const today = istToday();
  await adminDb.runTransaction(async (tx: any) => {
    const s = await tx.get(ref);
    const d = s.exists ? s.data() || {} : {};
    const n = d.day === today ? d[kind] || 0 : 0;
    if (n >= LIMITS[kind]) throw new FriendError(429, kind === 'plans' ? 'You have made a lot of plans today. Try again tomorrow.' : 'Too many friend requests today. Try again tomorrow.');
    tx.set(ref, d.day === today ? { ...d, [kind]: n + 1 } : { day: today, [kind]: 1 });
  });
}

/** 7 days of classes for one person, from their own data and their batch (same rules as the app). */
function scheduleOf(data: any, batch: any) {
  const p = data?.profile || {};
  const seen = new Set<string>();
  const subjects = [...list(data?.subjects), ...list(batch?.subjects)].filter((s: any) => s?.id && !seen.has(s.id) && seen.add(s.id));
  const own = list(data?.timetable);
  const raw = own.length ? own : list(batch?.timetable);
  // Their electives only (lib/electives.ts); a slot they haven't picked shows as the slot's name
  const lens = p.role === 'faculty' ? electiveLens([], [], null) : electiveLens(subjects, raw, p);
  const slotSubjects: any[] = [];
  const timetable = personalTimetable(raw, lens).map((s) => {
    if (!s.electivePending) return s;
    const id = `elective_${s.electivePending.groupKey}`;
    if (!slotSubjects.some((x) => x.id === id)) slotSubjects.push({ id, name: s.electivePending.label });
    return { ...s, subjectId: id };
  });
  const extras: Record<string, any> = {};
  Object.entries({ ...(batch?.extraSessions || {}), ...(data?.extraSessions || {}) }).forEach(([k, v]: [string, any]) => {
    if (v && lens.isMine(v.subjectId)) extras[k] = v;
  });
  const keys = (v: any) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).filter((k) => v[k]) : []);
  return buildWidgetDays({
    timetable,
    subjects: [...subjects, ...slotSubjects],
    cancelled: [...keys(data?.cancelledSessions), ...keys(batch?.cancelledSessions)],
    rescheduled: { ...(batch?.rescheduledSessions || {}), ...(data?.rescheduledSessions || {}) },
    extras,
    events: [...list(data?.events), ...list(batch?.events)],
    exams: list(data?.exams),
    from: istTodayDate(), // India's today, whatever time zone the server runs in
    days: 7,
  });
}

const statusOf = (m: any) => (m?.status && m.status.until > now() ? { place: m.status.place as Place, until: m.status.until } : null);

// ---------- Read everything for the Friends page ----------
export async function loadFriends(uid: string): Promise<FriendsData> {
  const meSnap = await users().doc(uid).get();
  const meData = meSnap.data() || {};
  const myCollege = collegeKeyOf(meData?.profile?.college);
  if (!myCollege) throw new FriendError(400, 'Add your college in Profile to use Friends', 'no-college');
  const meMeta: any = await ensureMeta(uid, meData);
  const myBatch: string | null = meData?.profile?.batchKey || null;

  const pairSnap = await pairs().where('users', 'array-contains', uid).get();
  const accepted: string[] = [];
  const incomingIds: string[] = [];
  const outgoingIds: string[] = [];
  pairSnap.forEach((d: any) => {
    const f = d.data();
    const other = (f.users || []).find((u: string) => u !== uid);
    if (!other) return;
    if (f.status === 'accepted') accepted.push(other);
    else if (f.requestedBy === uid) outgoingIds.push(other);
    else incomingIds.push(other);
  });

  const everyone = Array.from(new Set([...accepted, ...incomingIds, ...outgoingIds]));
  const [userSnaps, metaSnaps] = await Promise.all([
    Promise.all(everyone.map((id) => users().doc(id).get())),
    Promise.all(accepted.map((id) => metaRef(id).get())),
  ]);
  const userData = new Map(everyone.map((id, i) => [id, userSnaps[i].data() || {}]));
  const metaData = new Map(accepted.map((id, i) => [id, metaSnaps[i].data() || {}]));

  // Batches (cached), for timetables
  const batchCache = new Map<string, any>();
  const batchOf = async (data: any) => {
    const key = data?.profile?.isBatchSynced ? data?.profile?.batchKey : null;
    if (typeof key !== 'string' || !key || key.includes('/')) return null;
    if (!batchCache.has(key)) batchCache.set(key, (await adminDb.collection('shared_timetables').doc(key).get()).data() || null);
    return batchCache.get(key);
  };

  const friends: Friend[] = [];
  for (const id of accepted) {
    const d = userData.get(id);
    if (collegeKeyOf(d?.profile?.college) !== myCollege) continue; // moved campus: hide
    const m: any = metaData.get(id) || {};
    const hidden = !!m.ghost || list(m.hiddenFrom).includes(uid);
    let days = hidden ? [] : scheduleOf(d, await batchOf(d));
    if (!showsClass(m)) days = days.map((day) => ({ ...day, classes: day.classes.map((c) => ({ ...c, name: '', room: '' })) }));
    friends.push({
      ...lite(id, d, myBatch),
      hidden,
      days,
      status: hidden ? null : statusOf(m),
      hiddenByMe: list(meMeta.hiddenFrom).includes(id),
    });
  }

  // Classmates not yet connected
  let suggestions: PersonLite[] = [];
  if (myBatch) {
    const mates = await users().where('profile.batchKey', '==', myBatch).where('profile.isBatchSynced', '==', true).limit(200).get();
    const known = new Set([uid, ...everyone]);
    mates.forEach((doc: any) => {
      if (known.has(doc.id)) return;
      const d = doc.data();
      if (d?.profile?.role === 'faculty') return;
      suggestions.push(lite(doc.id, d, myBatch));
    });
    suggestions = suggestions.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60);
  }

  // Today's plans I made or was invited to
  const since = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  const [mineSnap, invitedSnap] = await Promise.all([
    adminDb.collection('friend_plans').where('by', '==', uid).get(),
    adminDb.collection('friend_plans').where('invited', 'array-contains', uid).get(),
  ]);
  const planDocs = new Map<string, any>();
  [...mineSnap.docs, ...invitedSnap.docs].forEach((d: any) => {
    const p = d.data();
    if (p.at >= since && !p.cancelled) planDocs.set(d.id, p);
  });
  const nameOf = (id: string) => (id === uid ? 'You' : lite(id, userData.get(id)).name);
  const plans: Plan[] = Array.from(planDocs.entries())
    .map(([id, p]) => ({
      id,
      title: p.title,
      at: p.at,
      byUid: p.by,
      byName: p.by === uid ? 'You' : p.byName || nameOf(p.by),
      mine: p.by === uid,
      invited: list(p.invited).map((x: string) => (userData.has(x) ? lite(x, userData.get(x)) : { uid: x, name: x === uid ? 'You' : 'Friend' })),
      responses: p.responses || {},
    }))
    .sort((a, b) => a.at.localeCompare(b.at));

  return {
    me: { uid, code: meMeta.code, ghost: !!meMeta.ghost, showClass: showsClass(meMeta), status: statusOf(meMeta), college: meData?.profile?.college || '' },
    friends: friends.sort((a, b) => a.name.localeCompare(b.name)),
    incoming: incomingIds.map((id) => lite(id, userData.get(id), myBatch)),
    outgoing: outgoingIds.map((id) => lite(id, userData.get(id), myBatch)),
    suggestions,
    plans,
    myDays: scheduleOf(meData, await batchOf(meData)),
  };
}

// ---------- Requests ----------
async function notify(uid: string, title: string, body: string) {
  try {
    const snap = await users().doc(uid).get();
    const targets = tokensFromUserDoc(uid, snap.data() || {});
    if (targets.length) await sendPush(targets, { title, body, data: { type: 'friends' }, link: '/?view=friends' });
  } catch {
    // push is best effort
  }
}

export async function requestFriend(uid: string, input: { code?: unknown; uid?: unknown }) {
  let target: string | null = null;
  if (typeof input.code === 'string') {
    const code = input.code.trim().toUpperCase();
    if (!CODE_RE.test(code)) throw new FriendError(400, 'That code looks wrong. Codes have 6 letters and numbers.');
    const c = await adminDb.collection('friend_codes').doc(code).get();
    target = c.exists ? c.data()?.uid : null;
    if (!target) throw new FriendError(404, 'No one has that code. Check it and try again.');
  } else if (validUid(input.uid)) {
    target = input.uid;
  }
  if (!target) throw new FriendError(400, 'Invalid request');
  if (target === uid) throw new FriendError(400, "That's your own code");

  const [meSnap, themSnap] = await Promise.all([users().doc(uid).get(), users().doc(target).get()]);
  const me = meSnap.data() || {};
  const them = themSnap.data() || {};
  if (!themSnap.exists) throw new FriendError(404, 'That account no longer exists');
  const mine = collegeKeyOf(me?.profile?.college);
  if (!mine) throw new FriendError(400, 'Add your college in Profile to use Friends', 'no-college');
  if (collegeKeyOf(them?.profile?.college) !== mine) throw new FriendError(403, 'You can only add friends from your own campus', 'other-campus');
  if (them?.profile?.role === 'faculty') throw new FriendError(400, 'Friends is for students');

  const ref = pairs().doc(pairId(uid, target));
  const result = await adminDb.runTransaction(async (tx: any) => {
    const s = await tx.get(ref);
    if (s.exists) {
      const f = s.data();
      if (f.status === 'accepted') return 'already';
      if (f.requestedBy === target) {
        tx.update(ref, { status: 'accepted', acceptedAt: now() });
        return 'accepted';
      }
      return 'pending';
    }
    tx.set(ref, { users: [uid, target], status: 'pending', requestedBy: uid, createdAt: now() });
    return 'sent';
  });
  if (result === 'sent') {
    await bump(uid, 'requests').catch(async (e) => {
      await ref.delete();
      throw e;
    });
    await ensureMeta(target, them);
    notify(target, 'New friend request', `${lite(uid, me).name} wants to see when you're free`);
  }
  if (result === 'accepted') notify(target, 'You are now friends', `${lite(uid, me).name} accepted your request`);
  return { result, person: lite(target, them, me?.profile?.batchKey) };
}

export async function answerRequest(uid: string, other: unknown, accept: boolean) {
  if (!validUid(other)) throw new FriendError(400, 'Invalid request');
  const ref = pairs().doc(pairId(uid, other));
  const s = await ref.get();
  const f = s.exists ? s.data() : null;
  if (!f || f.status !== 'pending' || f.requestedBy === uid) throw new FriendError(404, 'This request is no longer there');
  if (accept) {
    await ref.update({ status: 'accepted', acceptedAt: now() });
    const me = (await users().doc(uid).get()).data() || {};
    notify(other, 'You are now friends', `${lite(uid, me).name} accepted your request`);
  } else {
    await ref.delete();
  }
}

/** Remove a friend, cancel my request, or decline theirs. */
export async function removeFriend(uid: string, other: unknown) {
  if (!validUid(other)) throw new FriendError(400, 'Invalid request');
  await pairs().doc(pairId(uid, other)).delete();
  const { FieldValue } = await import('firebase-admin/firestore');
  await metaRef(uid).set({ hiddenFrom: FieldValue.arrayRemove(other) }, { merge: true });
}

/** Class names are shared by default; only an explicit "off" from the person hides them. */
const showsClass = (m: any) => (m?.showClassChosen ? !!m.showClass : true);

// ---------- My settings & status ----------
export async function updateSettings(uid: string, input: any) {
  const patch: Record<string, unknown> = {};
  if (typeof input.ghost === 'boolean') patch.ghost = input.ghost;
  if (typeof input.showClass === 'boolean') {
    patch.showClass = input.showClass;
    patch.showClassChosen = true;
  }
  if (input.hide && validUid(input.hide.uid) && typeof input.hide.hidden === 'boolean') {
    const { FieldValue } = await import('firebase-admin/firestore');
    patch.hiddenFrom = input.hide.hidden ? FieldValue.arrayUnion(input.hide.uid) : FieldValue.arrayRemove(input.hide.uid);
  }
  if ('place' in input) {
    if (input.place === null) patch.status = null;
    else if (PLACES.some((p) => p.id === input.place)) patch.status = { place: input.place, until: new Date(Date.now() + STATUS_MINUTES * 60000).toISOString() };
    else throw new FriendError(400, 'Unknown place');
  }
  if (!Object.keys(patch).length) throw new FriendError(400, 'Nothing to change');
  await ensureMeta(uid);
  await metaRef(uid).set(patch, { merge: true });
}

// ---------- Plans ----------
export async function createPlan(uid: string, input: any) {
  const title = typeof input.title === 'string' ? input.title.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  if (!title) throw new FriendError(400, 'Say what the plan is');
  const at = new Date(String(input.at || ''));
  if (isNaN(at.getTime())) throw new FriendError(400, 'Pick a time');
  if (at.getTime() < Date.now() - 15 * 60000 || at.getTime() > Date.now() + 8 * 24 * 3600 * 1000) throw new FriendError(400, 'Pick a time in the next few days');
  const invite = Array.from(new Set(list(input.invite).filter(validUid))).slice(0, 30) as string[];
  if (!invite.length) throw new FriendError(400, 'Invite at least one friend');

  const checks = await Promise.all(invite.map((o) => pairs().doc(pairId(uid, o)).get()));
  const ok = invite.filter((o, i) => checks[i].exists && checks[i].data()?.status === 'accepted');
  if (!ok.length) throw new FriendError(400, 'You can only invite your friends');
  await bump(uid, 'plans');

  const me = (await users().doc(uid).get()).data() || {};
  const myName = lite(uid, me).name;
  const ref = adminDb.collection('friend_plans').doc();
  await ref.set({ by: uid, byName: myName, title, at: at.toISOString(), invited: ok, responses: { [uid]: 'in' }, createdAt: now() });
  const when = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  await Promise.all(ok.map((o) => notify(o, `${myName}: ${title} at ${when}?`, "You're free then. Open Intersemester to say you're in.")));
  return ref.id;
}

export async function respondPlan(uid: string, id: unknown, answer: unknown) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(id) || (answer !== 'in' && answer !== 'out')) throw new FriendError(400, 'Invalid request');
  const ref = adminDb.collection('friend_plans').doc(id);
  const s = await ref.get();
  const p = s.exists ? s.data() : null;
  if (!p || !list(p.invited).includes(uid) || p.cancelled) throw new FriendError(404, 'This plan is no longer there');
  await ref.update({ [`responses.${uid}`]: answer });
  if (answer === 'in') {
    const me = (await users().doc(uid).get()).data() || {};
    notify(p.by, `${lite(uid, me).name} is in`, `${p.title}`);
  }
}

export async function cancelPlan(uid: string, id: unknown) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(id)) throw new FriendError(400, 'Invalid request');
  const ref = adminDb.collection('friend_plans').doc(id);
  const s = await ref.get();
  if (!s.exists || s.data()?.by !== uid) throw new FriendError(404, 'This plan is no longer there');
  await ref.update({ cancelled: true });
}
