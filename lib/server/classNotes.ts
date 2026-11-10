// Server side of class-linked notes (Admin SDK).
// - My notes: class_notes/{uid}/items/{id}. Text only (photos stay on the phone). Only the owner reads/writes.
// - Class notes: batch_notes/{batchKey}/items/{id}, one shared copy for the whole batch.
//   Readable by members of that batch (profile.batchKey). Deletable by the author, the batch's
//   CR / pilots, or faculty linked to the batch. Photo in Storage at batch_notes/{batchKey}/{id}.webp,
//   handed out as 1-hour signed links.
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase-admin';
import { FriendNote, MAX_NOTE_CHARS, MAX_SHARED_IMAGE_KB, MyNote, SharedNote, subjectKeyOf } from '@/lib/classNotes';

export class NoteError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

const SHARED_PER_DAY = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const validKey = (v: unknown): v is string => isStr(v, 200) && !v.includes('/') && v !== '.' && v !== '..';
const now = () => new Date().toISOString();

const bucket = () => {
  void adminDb.firestore;
  const name = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return name ? getStorage().bucket(name) : getStorage().bucket();
};

interface Who {
  uid: string;
  name: string;
  batchKey: string | null;
  role: string;
}
export async function whoIs(uid: string): Promise<Who> {
  const snap = await adminDb.collection('users').doc(uid).get();
  const p = (snap.exists ? snap.data()?.profile : null) || {};
  return { uid, name: typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 60) : 'A classmate', batchKey: validKey(p.batchKey) ? p.batchKey : null, role: p.role || 'student' };
}

const slotOf = (input: any) => {
  const subjectId = input?.subjectId;
  const date = input?.date;
  if (!validKey(subjectId) || subjectId.length > 128) throw new NoteError(400, 'Missing subject');
  if (typeof date !== 'string' || !DATE_RE.test(date)) throw new NoteError(400, 'Missing date');
  const subjectName = isStr(input?.subjectName, 120) ? input.subjectName.trim() : 'Class';
  return {
    subjectId,
    subjectKey: subjectKeyOf(subjectName) || subjectId,
    subjectName,
    date,
    startTime: isStr(input?.startTime, 12) ? input.startTime.trim() : '',
  };
};
const textOf = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_NOTE_CHARS) : '');

// ---------- My notes ----------
const mine = (uid: string) => adminDb.collection('class_notes').doc(uid).collection('items');
const toMine = (id: string, d: any): MyNote => ({
  id,
  subjectId: d.subjectId,
  subjectName: d.subjectName || '',
  date: d.date,
  startTime: d.startTime || '',
  text: d.text || '',
  photos: Array.isArray(d.photos) ? d.photos : [],
  createdAt: d.createdAt || '',
});

/** Notes for a subject, found by its id OR its name, so a changed subject id doesn't hide old notes. */
const findBy = async (col: any, subjectId: string, subjectKey: string | undefined, date: string | undefined, max: number, subjectName?: string) => {
  const run = (field: string, value: string) => {
    let q = col.where(field, '==', value);
    if (date) q = q.where('date', '==', date);
    return q.limit(max).get();
  };
  // subjectName: notes saved before subjectKey existed
  const snaps = await Promise.all([
    run('subjectId', subjectId),
    ...(subjectKey ? [run('subjectKey', subjectKey)] : []),
    ...(subjectName ? [run('subjectName', subjectName)] : []),
  ]);
  const seen = new Map<string, any>();
  for (const s of snaps) for (const d of s.docs) seen.set(d.id, d);
  return Array.from(seen.values());
};

export async function listMine(uid: string, subjectId: string, date?: string, subjectKey?: string, subjectName?: string) {
  const docs = await findBy(mine(uid), subjectId, subjectKey, date, 300, subjectName);
  return docs.map((d: any) => toMine(d.id, d.data()));
}

/** All of my notes, newest first (for the Notes page). */
export async function listAllMine(uid: string, max = 400) {
  const snap = await mine(uid).orderBy('createdAt', 'desc').limit(max).get();
  return snap.docs.map((d: any) => toMine(d.id, d.data()));
}

export async function addMine(uid: string, input: any) {
  const slot = slotOf(input);
  const text = textOf(input?.text);
  const photos = (Array.isArray(input?.photos) ? input.photos : []).filter((p: unknown) => isStr(p, 60)).slice(0, 10);
  if (!text && photos.length === 0) throw new NoteError(400, 'Write something or add a photo');
  const ref = mine(uid).doc();
  const doc = { ...slot, text, photos, createdAt: now() };
  await ref.set(doc);
  return toMine(ref.id, doc);
}

export async function deleteMine(uid: string, id: unknown) {
  if (!validKey(id)) throw new NoteError(400, 'Invalid note');
  await mine(uid).doc(id).delete();
}

// ---------- Shared helpers ----------
/** A data-URL photo from the app → bytes, after checking it really is a small WebP/JPEG. */
function parseImage(img: unknown): { buf: Buffer | null; type: string } {
  if (typeof img !== 'string' || !img) return { buf: null, type: '' };
  const m = img.match(/^data:(image\/(?:webp|jpeg));base64,(.+)$/);
  if (!m) throw new NoteError(400, 'Use a photo (WebP or JPEG)');
  const type = m[1];
  const buf = Buffer.from(m[2], 'base64');
  const webp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  const jpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;
  if (!(type === 'image/webp' ? webp : jpeg)) throw new NoteError(400, "That photo couldn't be read");
  if (buf.length > MAX_SHARED_IMAGE_KB * 1024) throw new NoteError(413, 'That photo is too large');
  return { buf, type };
}

/** Daily limit per person across class and friend shares (keeps storage and abuse in check). */
async function bumpShareLimit(uid: string) {
  const limitRef = adminDb.collection('note_limits').doc(uid);
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  await adminDb.runTransaction(async (tx: any) => {
    const s = await tx.get(limitRef);
    const d = s.exists ? s.data() || {} : {};
    const count = d.day === today ? d.count || 0 : 0;
    if (count >= SHARED_PER_DAY) throw new NoteError(429, `You can share up to ${SHARED_PER_DAY} notes a day`);
    tx.set(limitRef, { day: today, count: count + 1 });
  });
}

// ---------- Class (batch) notes ----------
const shared = (batchKey: string) => adminDb.collection('batch_notes').doc(batchKey).collection('items');

const canModerate = async (who: Who, batchKey: string) => {
  const b = await adminDb.collection('shared_timetables').doc(batchKey).get();
  const d = b.exists ? b.data() || {} : {};
  const list = (v: any) => (Array.isArray(v) ? v : []);
  if (d.creatorId === who.uid || list(d.crUserIds).includes(who.uid)) return true;
  if (who.role === 'faculty') {
    const u = await adminDb.collection('users').doc(who.uid).get();
    const p = u.data()?.profile || {};
    return list(p.facultyBatchKeys).includes(batchKey) || list(p.facultyLinkedBatches).some((x: any) => x?.batchKey === batchKey);
  }
  return false;
};

const toShared = async (doc: any, who: Who, mod: boolean, expires: number): Promise<SharedNote> => {
  const d = doc.data();
  let imageUrl: string | null = null;
  if (d.imagePath) {
    try {
      [imageUrl] = await bucket().file(d.imagePath).getSignedUrl({ version: 'v4', action: 'read', expires });
    } catch {
      imageUrl = null;
    }
  }
  return {
    id: doc.id,
    subjectId: d.subjectId,
    subjectName: d.subjectName || '',
    date: d.date,
    startTime: d.startTime || '',
    text: d.text || '',
    imageUrl,
    byName: d.byName || 'A classmate',
    mine: d.by === who.uid,
    canDelete: d.by === who.uid || mod,
    createdAt: d.createdAt || '',
  };
};

export async function listShared(who: Who, subjectId: string, date?: string, subjectKey?: string, subjectName?: string): Promise<SharedNote[]> {
  if (!who.batchKey) return [];
  const [docs, mod] = await Promise.all([findBy(shared(who.batchKey), subjectId, subjectKey, date, 200, subjectName), canModerate(who, who.batchKey)]);
  const expires = Date.now() + 60 * 60 * 1000;
  return Promise.all(docs.map((doc: any) => toShared(doc, who, mod, expires)));
}

/** Every class note of the caller's batch, newest first (for the Notes page). */
export async function listRecentShared(who: Who, max = 150): Promise<SharedNote[]> {
  if (!who.batchKey) return [];
  const [snap, mod] = await Promise.all([shared(who.batchKey).orderBy('createdAt', 'desc').limit(max).get(), canModerate(who, who.batchKey)]);
  const expires = Date.now() + 60 * 60 * 1000;
  return Promise.all(snap.docs.map((doc: any) => toShared(doc, who, mod, expires)));
}

export async function addShared(who: Who, input: any) {
  if (!who.batchKey) throw new NoteError(400, 'Join your class batch to share notes with it', 'no-batch');
  const slot = slotOf(input);
  const text = textOf(input?.text);
  const { buf, type } = parseImage(input?.image);
  if (!text && !buf) throw new NoteError(400, 'Write something or add a photo');
  await bumpShareLimit(who.uid);

  const ref = shared(who.batchKey).doc();
  let imagePath: string | null = null;
  if (buf) {
    imagePath = `batch_notes/${who.batchKey}/${ref.id}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
    await bucket().file(imagePath).save(buf, { contentType: type, resumable: false });
  }
  await ref.set({ ...slot, text, imagePath, by: who.uid, byName: who.name, createdAt: now() });
  return ref.id;
}

export async function deleteShared(who: Who, id: unknown) {
  if (!who.batchKey || !validKey(id)) throw new NoteError(400, 'Invalid note');
  const ref = shared(who.batchKey).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  const d = snap.data() || {};
  if (d.by !== who.uid && !(await canModerate(who, who.batchKey))) throw new NoteError(403, 'Only the person who shared it or your CR can remove this');
  if (d.imagePath) await bucket().file(d.imagePath).delete().catch(() => {});
  await ref.delete();
}

// ---------- Notes shared with particular friends ----------
// friend_notes/{id}: one copy (text + one compressed photo) visible to the sender and the chosen
// friends. Only accepted friends can be recipients. The sender can unshare (deletes it); a recipient
// can remove it from their own list. Photo in Storage at friend_notes/{id}.webp, signed for 1 hour.
const friendNotes = () => adminDb.collection('friend_notes');

const toFriendNote = async (doc: any, uid: string, expires: number): Promise<FriendNote> => {
  const d = doc.data();
  let imageUrl: string | null = null;
  if (d.imagePath) {
    try {
      [imageUrl] = await bucket().file(d.imagePath).getSignedUrl({ version: 'v4', action: 'read', expires });
    } catch {
      imageUrl = null;
    }
  }
  const mine = d.by === uid;
  return {
    id: doc.id,
    subjectId: d.subjectId,
    subjectName: d.subjectName || '',
    date: d.date,
    startTime: d.startTime || '',
    text: d.text || '',
    imageUrl,
    byName: d.byName || 'A friend',
    mine,
    canDelete: true,
    createdAt: d.createdAt || '',
    sentTo: mine ? (Array.isArray(d.recipients) ? d.recipients.length : 0) : 0,
  };
};

export async function shareNoteWithFriends(who: Who, input: any) {
  const slot = slotOf(input);
  const text = textOf(input?.text);
  const { buf, type } = parseImage(input?.image);
  if (!text && !buf) throw new NoteError(400, 'Write something or add a photo');

  const wanted = Array.from(new Set((Array.isArray(input?.to) ? input.to : []).filter((v: unknown) => isStr(v, 128) && /^[A-Za-z0-9_-]+$/.test(v as string)))).slice(0, 50) as string[];
  if (!wanted.length) throw new NoteError(400, 'Pick at least one friend');
  const { acceptedFriendUids } = await import('@/lib/server/friends');
  const friends = new Set(await acceptedFriendUids(who.uid));
  const recipients = wanted.filter((u) => friends.has(u));
  if (!recipients.length) throw new NoteError(400, 'You can only share with your friends');

  await bumpShareLimit(who.uid);
  const ref = friendNotes().doc();
  let imagePath: string | null = null;
  if (buf) {
    imagePath = `friend_notes/${ref.id}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
    await bucket().file(imagePath).save(buf, { contentType: type, resumable: false });
  }
  await ref.set({ ...slot, text, imagePath, by: who.uid, byName: who.name, recipients, dismissedBy: [], createdAt: now() });

  // Tell them (best effort)
  try {
    const { sendPush, tokensFromUserDoc } = await import('@/lib/server/push');
    const snaps = await Promise.all(recipients.map((u) => adminDb.collection('users').doc(u).get()));
    const targets = snaps.flatMap((s: any) => tokensFromUserDoc(s.id, s.data() || {}));
    if (targets.length)
      await sendPush(targets, {
        title: `${who.name} shared a note`,
        body: `${slot.subjectName}${text ? ` · ${text.slice(0, 80)}` : ' · photo'}`,
        data: { type: 'friend_note' },
        link: '/?view=notes',
      });
  } catch {}
  return { id: ref.id, recipients: recipients.length };
}

/** Notes friends sent me (still friends, not removed) and notes I sent, newest first. */
export async function listFriendNotes(uid: string, max = 150): Promise<FriendNote[]> {
  const { acceptedFriendUids } = await import('@/lib/server/friends');
  const [incoming, sent, friendIds] = await Promise.all([
    friendNotes().where('recipients', 'array-contains', uid).limit(max).get(),
    friendNotes().where('by', '==', uid).limit(max).get(),
    acceptedFriendUids(uid),
  ]);
  const friends = new Set(friendIds);
  const docs = [
    ...incoming.docs.filter((d: any) => friends.has(d.data().by) && !(d.data().dismissedBy || []).includes(uid)),
    ...sent.docs,
  ];
  const expires = Date.now() + 60 * 60 * 1000;
  const list = await Promise.all(docs.map((d: any) => toFriendNote(d, uid, expires)));
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Sender: unshare (deletes it and its photo). Recipient: remove it from my list. */
export async function removeFriendNote(uid: string, id: unknown) {
  if (!validKey(id)) throw new NoteError(400, 'Invalid note');
  const ref = friendNotes().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  const d = snap.data() || {};
  if (d.by === uid) {
    if (d.imagePath) await bucket().file(d.imagePath).delete().catch(() => {});
    await ref.delete();
    return;
  }
  if (!(d.recipients || []).includes(uid)) throw new NoteError(404, 'This note is no longer shared with you');
  const { FieldValue } = await import('firebase-admin/firestore');
  await ref.update({ dismissedBy: FieldValue.arrayUnion(uid) });
}
