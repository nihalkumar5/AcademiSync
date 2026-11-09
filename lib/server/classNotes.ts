// Server side of class-linked notes (Admin SDK).
// - My notes: class_notes/{uid}/items/{id}. Text only (photos stay on the phone). Only the owner reads/writes.
// - Class notes: batch_notes/{batchKey}/items/{id}, one shared copy for the whole batch.
//   Readable by members of that batch (profile.batchKey). Deletable by the author, the batch's
//   CR / pilots, or faculty linked to the batch. Photo in Storage at batch_notes/{batchKey}/{id}.webp,
//   handed out as 1-hour signed links.
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase-admin';
import { MAX_NOTE_CHARS, MAX_SHARED_IMAGE_KB, MyNote, SharedNote } from '@/lib/classNotes';

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
  return {
    subjectId,
    subjectName: isStr(input?.subjectName, 120) ? input.subjectName.trim() : 'Class',
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

export async function listMine(uid: string, subjectId: string, date?: string) {
  let q = mine(uid).where('subjectId', '==', subjectId);
  if (date) q = q.where('date', '==', date);
  const snap = await q.limit(300).get();
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

export async function listShared(who: Who, subjectId: string, date?: string): Promise<SharedNote[]> {
  if (!who.batchKey) return [];
  let q = shared(who.batchKey).where('subjectId', '==', subjectId);
  if (date) q = q.where('date', '==', date);
  const [snap, mod] = await Promise.all([q.limit(200).get(), canModerate(who, who.batchKey)]);
  const expires = Date.now() + 60 * 60 * 1000;
  return Promise.all(
    snap.docs.map(async (doc: any) => {
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
    })
  );
}

export async function addShared(who: Who, input: any) {
  if (!who.batchKey) throw new NoteError(400, 'Join your class batch to share notes with it', 'no-batch');
  const slot = slotOf(input);
  const text = textOf(input?.text);
  const img = typeof input?.image === 'string' ? input.image : '';
  if (!text && !img) throw new NoteError(400, 'Write something or add a photo');

  let buf: Buffer | null = null;
  let type = '';
  if (img) {
    const m = img.match(/^data:(image\/(?:webp|jpeg));base64,(.+)$/);
    if (!m) throw new NoteError(400, 'Use a photo (WebP or JPEG)');
    type = m[1];
    buf = Buffer.from(m[2], 'base64');
    const webp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    const jpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;
    if (!(type === 'image/webp' ? webp : jpeg)) throw new NoteError(400, "That photo couldn't be read");
    if (buf.length > MAX_SHARED_IMAGE_KB * 1024) throw new NoteError(413, 'That photo is too large');
  }

  // Daily limit per person (keeps storage and abuse in check)
  const limitRef = adminDb.collection('note_limits').doc(who.uid);
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  await adminDb.runTransaction(async (tx: any) => {
    const s = await tx.get(limitRef);
    const d = s.exists ? s.data() || {} : {};
    const count = d.day === today ? d.count || 0 : 0;
    if (count >= SHARED_PER_DAY) throw new NoteError(429, `You can share up to ${SHARED_PER_DAY} class notes a day`);
    tx.set(limitRef, { day: today, count: count + 1 });
  });

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
