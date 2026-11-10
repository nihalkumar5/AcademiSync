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
const LIMITS = { requests: 40, plans: 12, routines: 30 };
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
    if (n >= LIMITS[kind])
      throw new FriendError(
        429,
        kind === 'plans'
          ? 'You have made a lot of plans today. Try again tomorrow.'
          : kind === 'routines'
          ? 'You have shared a lot of routines today. Try again tomorrow.'
          : 'Too many friend requests today. Try again tomorrow.'
      );
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
    const known = new Set([uid, ...everyone, ...list(meMeta?.blocked)]);
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
  const [myMeta, theirMeta] = await Promise.all([metaRef(uid).get(), metaRef(target).get()]);
  if (list(myMeta.data()?.blocked).includes(target)) throw new FriendError(403, 'You blocked this person. Unblock them first.', 'blocked');
  if (list(theirMeta.data()?.blocked).includes(uid)) throw new FriendError(403, "You can't add this person", 'blocked');

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
  await ensurePlanChatDoc(ref.id, { by: uid, invited: ok, title, at: at.toISOString() }).catch(() => {});
  await postSystemMessage(`plan_${ref.id}`, `${myName} made the plan: ${title} at ${when}`).catch(() => {});
  return ref.id;
}

export async function respondPlan(uid: string, id: unknown, answer: unknown) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(id) || (answer !== 'in' && answer !== 'out')) throw new FriendError(400, 'Invalid request');
  const ref = adminDb.collection('friend_plans').doc(id);
  const s = await ref.get();
  const p = s.exists ? s.data() : null;
  if (!p || !list(p.invited).includes(uid) || p.cancelled) throw new FriendError(404, 'This plan is no longer there');
  const before = p.responses?.[uid];
  await ref.update({ [`responses.${uid}`]: answer });
  if (before === answer) return;
  const me = (await users().doc(uid).get()).data() || {};
  const name = lite(uid, me).name;
  if (answer === 'in') notify(p.by, `${name} is in 🎉`, `${p.title}`);
  await ensurePlanChatDoc(id, { by: p.by, invited: list(p.invited), title: p.title, at: p.at }).catch(() => {});
  await postSystemMessage(`plan_${id}`, answer === 'in' ? `${name} is in 🎉` : `${name} can't make it`).catch(() => {});
}

export async function cancelPlan(uid: string, id: unknown) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(id)) throw new FriendError(400, 'Invalid request');
  const ref = adminDb.collection('friend_plans').doc(id);
  const s = await ref.get();
  if (!s.exists || s.data()?.by !== uid) throw new FriendError(404, 'This plan is no longer there');
  await ref.update({ cancelled: true });
  await postSystemMessage(`plan_${id}`, 'This plan was cancelled').catch(() => {});
}

// ---------- Routines shared with friends ----------
// friend_routines/{sharerUid}_{routineId}: one doc per routine, holding who it's shared with.
// Only accepted friends can be recipients; recipients can add it to their routines or dismiss it.
const ROUTINE_CATEGORIES = ['study', 'exam', 'sports', 'health', 'reminder', 'other'];
const ROUTINE_REPEATS = ['once', 'daily', 'weekdays', 'custom'];
const routineDocs = () => adminDb.collection('friend_routines');
const validRoutineId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

function cleanRoutine(r: any) {
  if (!r || typeof r !== 'object' || !validRoutineId(r.id)) throw new FriendError(400, 'Invalid routine');
  const title = typeof r.title === 'string' ? r.title.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  if (!title) throw new FriendError(400, 'Give the routine a name first');
  if (typeof r.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) throw new FriendError(400, 'Invalid time');
  const repeat = ROUTINE_REPEATS.includes(r.repeat) ? r.repeat : 'daily';
  const out: Record<string, unknown> = {
    sourceRoutineId: r.id,
    title,
    category: ROUTINE_CATEGORIES.includes(r.category) ? r.category : 'other',
    time: r.time,
    repeat,
    remindBefore: Number.isFinite(r.remindBefore) ? Math.min(Math.max(Math.round(r.remindBefore), 0), 240) : 10,
  };
  if (typeof r.notes === 'string' && r.notes.trim()) out.notes = r.notes.trim().slice(0, 200);
  if (Number.isFinite(r.durationMinutes) && r.durationMinutes > 0) out.durationMinutes = Math.min(Math.round(r.durationMinutes), 600);
  if (repeat === 'custom') out.days = list(r.days).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).slice(0, 7);
  if (repeat === 'once' && typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) out.date = r.date;
  return out;
}

async function acceptedFriendUids(uid: string): Promise<string[]> {
  const snap = await pairs().where('users', 'array-contains', uid).get();
  return snap.docs
    .map((d: any) => d.data())
    .filter((f: any) => f.status === 'accepted')
    .map((f: any) => list(f.users).find((u: string) => u !== uid))
    .filter(validUid);
}

/** Share (or re-share) one routine with exactly these friends. An empty list stops sharing it. */
export async function shareRoutineWithFriends(uid: string, input: any) {
  const routine = cleanRoutine(input?.routine);
  const wanted = Array.from(new Set(list(input?.to).filter(validUid))).slice(0, 50) as string[];
  const ref = routineDocs().doc(`${uid}_${routine.sourceRoutineId}`);
  const before = await ref.get();
  const prev: string[] = before.exists ? list(before.data()?.recipients) : [];

  if (!wanted.length) {
    if (before.exists) await ref.delete();
    return { recipients: [] as string[] };
  }

  const friends = new Set(await acceptedFriendUids(uid));
  const recipients = wanted.filter((o) => friends.has(o));
  if (!recipients.length) throw new FriendError(400, 'You can only share with your friends');
  const added = recipients.filter((o) => !prev.includes(o));
  if (added.length) await bump(uid, 'routines');

  const me = (await users().doc(uid).get()).data() || {};
  const myName = lite(uid, me).name;
  await ref.set(
    {
      ...routine,
      by: uid,
      byName: myName,
      recipients,
      // someone removed from the list shouldn't keep it hidden as "dismissed" if re-added later
      dismissedBy: list(before.data()?.dismissedBy).filter((u: string) => recipients.includes(u)),
      addedBy: before.data()?.addedBy || {},
      createdAt: before.exists ? before.data()?.createdAt || now() : now(),
      updatedAt: now(),
    },
    { merge: false }
  );
  await Promise.all(
    added.map((o) => notify(o, `${myName} shared a routine`, `${routine.title} at ${routine.time}. Open Routines to add it.`))
  );
  return { recipients };
}

/** Friends to pick from, routines friends shared with me, and who my routines are shared with. */
export async function loadRoutineShares(uid: string) {
  const friendUids = await acceptedFriendUids(uid);
  const [friendSnaps, incomingSnap, outgoingSnap, meSnap] = await Promise.all([
    Promise.all(friendUids.map((f) => users().doc(f).get())),
    routineDocs().where('recipients', 'array-contains', uid).get(),
    routineDocs().where('by', '==', uid).get(),
    users().doc(uid).get(),
  ]);
  const myBatch = meSnap.data()?.profile?.batchKey || null;
  const friendSet = new Set(friendUids);
  const friends: PersonLite[] = friendSnaps
    .filter((s: any) => s.exists)
    .map((s: any) => lite(s.id, s.data(), myBatch))
    .sort((a: PersonLite, b: PersonLite) => a.name.localeCompare(b.name));

  const incoming = incomingSnap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    // only from people who are still friends, and not ones I already added or waved off
    .filter((x: any) => friendSet.has(x.by) && !list(x.dismissedBy).includes(uid) && !x.addedBy?.[uid])
    .map((x: any) => ({
      id: x.id,
      title: x.title,
      category: x.category,
      ...(x.notes ? { notes: x.notes } : {}),
      time: x.time,
      ...(x.durationMinutes ? { durationMinutes: x.durationMinutes } : {}),
      repeat: x.repeat,
      ...(x.days ? { days: x.days } : {}),
      ...(x.date ? { date: x.date } : {}),
      remindBefore: x.remindBefore ?? 10,
      by: x.by,
      byName: x.byName || 'A friend',
      createdAt: x.updatedAt || x.createdAt || '',
    }))
    .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const outgoing: Record<string, string[]> = {};
  outgoingSnap.docs.forEach((d: any) => {
    const x = d.data();
    if (x.sourceRoutineId) outgoing[x.sourceRoutineId] = list(x.recipients).filter((r: string) => friendSet.has(r));
  });

  return { friends, incoming, outgoing };
}

/** I added a friend's routine to mine, or dismissed it. */
export async function markFriendRoutine(uid: string, id: unknown, answer: unknown) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(id) || (answer !== 'added' && answer !== 'dismissed')) throw new FriendError(400, 'Invalid request');
  const ref = routineDocs().doc(id);
  const s = await ref.get();
  if (!s.exists || !list(s.data()?.recipients).includes(uid)) throw new FriendError(404, 'This routine is no longer shared with you');
  if (answer === 'added') {
    await ref.update({ [`addedBy.${uid}`]: true });
    const me = (await users().doc(uid).get()).data() || {};
    notify(s.data()?.by, `${lite(uid, me).name} added your routine`, `${s.data()?.title}`);
  } else {
    const { FieldValue } = await import('firebase-admin/firestore');
    await ref.update({ dismissedBy: FieldValue.arrayUnion(uid) });
  }
}

// ---------- Chats ----------
// chats/{chatId}: a DM between two friends (chatId = their friendship id) or a plan's group
// (chatId = plan_{planId}). The server creates chats and decides members; clients read them and
// write messages directly, guarded by firestore.rules (members only; DMs only while still friends).
const chats = () => adminDb.collection('chats');
const PING_GAP_MS = 3 * 1000;

async function ensurePlanChatDoc(planId: string, p: { by: string; invited: string[]; title: string; at: string }) {
  const ref = chats().doc(`plan_${planId}`);
  const members = Array.from(new Set([p.by, ...p.invited]));
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({ members, title: p.title, at: p.at });
  } else {
    const { FieldValue } = await import('firebase-admin/firestore');
    await ref.set({ type: 'plan', planId, members, title: p.title, at: p.at, lastMessage: null, reads: {}, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
  return ref.id;
}

async function postSystemMessage(chatId: string, text: string) {
  const { FieldValue } = await import('firebase-admin/firestore');
  const ref = chats().doc(chatId);
  await ref.collection('messages').add({ by: 'system', text, at: FieldValue.serverTimestamp() });
  await ref.update({ lastMessage: { by: 'system', text, at: FieldValue.serverTimestamp() }, updatedAt: FieldValue.serverTimestamp() });
}

/** Open (or create) the DM with a friend. */
export async function openChat(uid: string, other: unknown) {
  if (!validUid(other) || other === uid) throw new FriendError(400, 'Invalid request');
  const id = pairId(uid, other);
  const pair = await pairs().doc(id).get();
  if (!pair.exists || pair.data()?.status !== 'accepted') throw new FriendError(403, 'You can only chat with friends', 'not-friends');
  const ref = chats().doc(id);
  const [snap, a, b] = await Promise.all([ref.get(), users().doc(uid).get(), users().doc(other).get()]);
  const names = { [uid]: lite(uid, a.data()).name, [other]: lite(other, b.data()).name };
  if (!snap.exists) {
    const { FieldValue } = await import('firebase-admin/firestore');
    await ref.set({ type: 'dm', members: [uid, other], names, lastMessage: null, reads: {}, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  } else {
    await ref.update({ names });
  }
  return id;
}

/** Open (or create) a plan's group chat. */
export async function openPlanChat(uid: string, planId: unknown) {
  if (typeof planId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(planId)) throw new FriendError(400, 'Invalid request');
  const s = await adminDb.collection('friend_plans').doc(planId).get();
  const p = s.exists ? s.data() : null;
  if (!p || (p.by !== uid && !list(p.invited).includes(uid))) throw new FriendError(404, 'This plan is no longer there');
  return ensurePlanChatDoc(planId, { by: p.by, invited: list(p.invited), title: p.title, at: p.at });
}

/** After sending a message: push it to the other members. Each sender has their own short
 *  spam gap, so a quick reply still notifies; a per-chat tag makes a burst replace one banner. */
export async function pingChat(uid: string, chatId: unknown) {
  if (typeof chatId !== 'string' || !/^[A-Za-z0-9_-]{6,300}$/.test(chatId)) throw new FriendError(400, 'Invalid request');
  const ref = chats().doc(chatId);
  const go = await adminDb.runTransaction(async (tx: any) => {
    const s = await tx.get(ref);
    const c = s.exists ? s.data() : null;
    if (!c || !list(c.members).includes(uid)) throw new FriendError(404, 'Chat not found');
    const last = typeof c.pings?.[uid] === 'number' ? c.pings[uid] : 0;
    if (Date.now() - last < PING_GAP_MS) return null;
    tx.update(ref, { [`pings.${uid}`]: Date.now() });
    return c;
  });
  if (!go) return;
  // Read the sender's newest message itself, so a failed preview update can't silence the push
  const recent = await ref.collection('messages').orderBy('at', 'desc').limit(10).get();
  const mine = recent.docs.map((d: any) => d.data()).find((m: any) => m.by === uid);
  if (!mine) return;
  const me = (await users().doc(uid).get()).data() || {};
  const name = lite(uid, me).name;
  const text = (mine.image ? (mine.text ? `📷 ${mine.text}` : '📷 Photo') : String(mine.text || '')).slice(0, 120);
  const title = go.type === 'plan' ? `${name} · ${go.title || 'Plan'}` : name;
  const others = list(go.members).filter((m: string) => m !== uid);
  const snaps = await Promise.all(others.map((o: string) => users().doc(o).get()));
  const targets = snaps.flatMap((s: any) => tokensFromUserDoc(s.id, s.data() || {}));
  if (targets.length) {
    await sendPush(targets, {
      title,
      body: text,
      tag: `chat_${chatId}`,
      data: { type: 'chat', chatId, title, body: text },
      link: `/?view=friends&chat=${encodeURIComponent(chatId)}`,
    }).catch((e) => console.warn('chat push failed', e?.message));
  }
}

/** Report a chat (optionally one message) for review. */
export async function reportChat(uid: string, chatId: unknown, messageId: unknown, reason: unknown) {
  if (typeof chatId !== 'string' || !/^[A-Za-z0-9_-]{6,300}$/.test(chatId)) throw new FriendError(400, 'Invalid request');
  const c = await chats().doc(chatId).get();
  if (!c.exists || !list(c.data()?.members).includes(uid)) throw new FriendError(404, 'Chat not found');
  let text = '';
  let by = '';
  if (typeof messageId === 'string' && /^[A-Za-z0-9]{6,60}$/.test(messageId)) {
    const m = await chats().doc(chatId).collection('messages').doc(messageId).get();
    text = String(m.data()?.text || '').slice(0, 1000);
    by = String(m.data()?.by || '');
  }
  await adminDb.collection('chat_reports').add({
    chatId,
    messageId: typeof messageId === 'string' ? messageId : null,
    reportedBy: uid,
    messageBy: by || null,
    text,
    reason: typeof reason === 'string' ? reason.slice(0, 300) : '',
    at: now(),
    status: 'open',
  });
}

/** Block: ends the friendship (so DMs stop) and stops new requests either way. */
export async function blockFriend(uid: string, other: unknown) {
  if (!validUid(other) || other === uid) throw new FriendError(400, 'Invalid request');
  const { FieldValue } = await import('firebase-admin/firestore');
  await pairs().doc(pairId(uid, other)).delete();
  await metaRef(uid).set({ blocked: FieldValue.arrayUnion(other), hiddenFrom: FieldValue.arrayUnion(other) }, { merge: true });
}
