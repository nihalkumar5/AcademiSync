// Server side of question papers (Admin SDK; files in Firebase Storage under question_papers/…).
//
// Who sees what (decided here, never by the app):
// - Students: papers of their own college AND branch (every semester), live ones only.
// - Faculty and the campus admin: every paper of their college (all branches), including hidden
//   ones (reported 3+ times) so they can restore or remove them.
// - Files are never public: the app asks for a paper and gets 15-minute signed links after the check above.
//
// Duplicates are blocked twice: the same file (SHA-256 of its bytes) and the same paper
// (college + branch + subject + exam + year + month), both kept as one-doc-per-key indexes.
import { createHash } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from '@/lib/firebase-admin';
import { collegeKeyOf } from '@/lib/collegeKey';
import { getCampusAdminRecord } from '@/lib/server/campusAdmin';
import { logServerError } from '@/lib/errorUtils';
import { validateServerUploadPayload } from '@/lib/fileSafety';
import {
  MAX_PAPER_PAGES,
  MAX_PAPER_TOTAL_MB,
  PaperFields,
  PaperSummary,
  REPORTS_TO_HIDE,
  canonicalExamName,
  cleanPaperFields,
  normKey,
  paperFingerprint,
} from '@/lib/questionPapers';

export class PaperError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export interface PaperScope {
  uid: string;
  role: 'student' | 'faculty' | 'campus_admin';
  collegeKey: string;
  college: string;
  branch: string; // students only
  branchKey: string;
  isStaff: boolean;
}

const PAPERS = 'question_papers';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();

const bucket = () => {
  void adminDb.firestore; // makes sure the Admin app is initialised
  const name = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return name ? getStorage().bucket(name) : getStorage().bucket();
};

export async function resolveScope(uid: string): Promise<PaperScope> {
  const [snap, campus] = await Promise.all([adminDb.collection('users').doc(uid).get(), getCampusAdminRecord(uid)]);
  const p = (snap.exists ? snap.data()?.profile : null) || {};
  if (campus) {
    return { uid, role: 'campus_admin', collegeKey: campus.collegeKey, college: campus.college, branch: '', branchKey: '', isStaff: true };
  }
  const collegeKey = collegeKeyOf(p.college);
  if (!collegeKey) throw new PaperError(400, 'Add your college in Profile to see question papers', { code: 'no-college' });
  if (p.role === 'faculty') {
    return { uid, role: 'faculty', collegeKey, college: p.college, branch: '', branchKey: '', isStaff: true };
  }
  const branch = typeof p.branch === 'string' ? p.branch.trim() : '';
  if (!normKey(branch)) throw new PaperError(400, 'Add your branch in Profile to see question papers', { code: 'no-branch' });
  return { uid, role: 'student', collegeKey, college: p.college, branch, branchKey: normKey(branch), isStaff: false };
}

const canSee = (s: PaperScope, d: any) =>
  !!d &&
  d.collegeKey === s.collegeKey &&
  (d.uploadedBy === s.uid || (d.status !== 'draft' && (s.isStaff || (d.branchKey === s.branchKey && d.status === 'live'))));

const toSummary = (id: string, d: any, s: PaperScope): PaperSummary => ({
  id,
  subjectName: d.subjectName || '',
  subjectCode: d.subjectCode || '',
  examName: d.examName || '',
  examYear: Number(d.examYear) || 0,
  examMonth: d.examMonth || '',
  semester: typeof d.semester === 'number' ? d.semester : null,
  branch: d.branch || '',
  pageCount: Array.isArray(d.pages) ? d.pages.length : 0,
  kind: d.kind === 'pdf' ? 'pdf' : 'images',
  official: !!d.official,
  createdAt: d.publishedAt || d.createdAt || '',
  mine: d.uploadedBy === s.uid,
  status: d.status,
  ...(s.isStaff ? { reports: d.reports || 0 } : {}),
  reportedByMe: Array.isArray(d.reportedBy) && d.reportedBy.includes(s.uid),
});

const examNamesOf = async (collegeKey: string): Promise<string[]> => {
  const snap = await adminDb.collection('qp_colleges').doc(collegeKey).get();
  const list = snap.exists ? snap.data()?.examNames : [];
  return Array.isArray(list) ? list.filter((x: unknown) => typeof x === 'string').slice(0, 40) : [];
};

// ---------- Reads ----------
export async function listPapers(s: PaperScope) {
  let q = adminDb.collection(PAPERS).where('collegeKey', '==', s.collegeKey);
  if (!s.isStaff) q = q.where('branchKey', '==', s.branchKey).where('status', '==', 'live');
  const [snap, examNames] = await Promise.all([q.get(), examNamesOf(s.collegeKey)]);
  const papers: PaperSummary[] = [];
  snap.forEach((doc: any) => {
    const d = doc.data();
    if (d.status === 'draft' || !canSee(s, d)) return;
    papers.push(toSummary(doc.id, d, s));
  });
  return {
    scope: { role: s.role, college: s.college, branch: s.branch, isStaff: s.isStaff },
    examNames,
    papers,
  };
}

export async function openPaper(s: PaperScope, id: string) {
  const snap = await adminDb.collection(PAPERS).doc(id).get();
  const d = snap.exists ? snap.data() : null;
  if (!canSee(s, d)) throw new PaperError(404, "This paper isn't available");
  const expires = Date.now() + 15 * 60 * 1000;
  const pages = await Promise.all(
    (d.pages || []).map(async (p: any) => {
      const [url] = await bucket().file(p.path).getSignedUrl({ version: 'v4', action: 'read', expires });
      return { url, type: p.type };
    })
  );
  return { paper: toSummary(id, d, s), pages };
}

// ---------- AI ----------
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];

async function readPaper(files: { base64: string; mimeType: string }[], s: PaperScope, examNames: string[], branch: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new PaperError(503, "Reading papers isn't set up on the server yet");
  const prompt = `You are reading an exam question paper from an Indian college: ${s.college}${branch ? ` (branch: ${branch})` : ''}.
Return ONLY a JSON object, no other text:
{"isQuestionPaper": boolean, "subjectName": string, "subjectCode": string, "examName": string, "examYear": number | null, "examMonth": string, "semester": number | null}

Rules:
- isQuestionPaper: false if this is not an exam question paper (notes, a timetable, an answer sheet, a result, a random photo).
- subjectName: the course title as printed, in Title Case, without the course code.
- subjectCode: the course / paper code as printed (e.g. "CS301", "KCS-501"), else "".
- examName: the exam as THIS college names it. Names this college already uses: ${examNames.length ? examNames.map((n) => `"${n}"`).join(', ') : 'none yet'}.
  If the paper is one of those exams, return that exact name. Otherwise use the name printed on the paper, short and in Title Case
  (e.g. "Mid Semester Exam", "End Semester Exam", "Sessional 1", "Class Test 2", "Quiz 1"). No year, subject or semester in it.
- examYear: the 4-digit year the exam was held. If only a session like "2025-26" is printed, use the first year for Jul–Dec exams and the second for Jan–Jun exams. null if unknown.
- examMonth: the month(s) printed, e.g. "May" or "Nov–Dec", else "".
- semester: the semester number if printed ("V Sem" → 5, "3rd Semester" → 3), else null.`;
  const parts = files.map((f) => ({ inlineData: { data: f.base64.replace(/^data:[^;]+;base64,/, ''), mimeType: f.mimeType } }));
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const name of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result: any = await Promise.race([
        model.generateContent([prompt, ...parts]),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timeout`)), 25000)),
      ]);
      const text = String(result.response.text() || '');
      const a = text.indexOf('{');
      const b = text.lastIndexOf('}');
      if (a < 0 || b <= a) continue;
      const parsed = JSON.parse(text.slice(a, b + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (err) {
      logServerError(`QuestionPaper:${name}`, err);
    }
  }
  throw new PaperError(422, "Couldn't read this paper. Try clearer photos with the whole page in view.");
}

// ---------- Upload ----------
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/jpg': 'jpg' };

async function findExisting(s: PaperScope, hashes: string[]) {
  for (const h of hashes) {
    const ref = await adminDb.collection('qp_hashes').doc(`${s.collegeKey}__${h}`).get();
    const paperId = ref.exists ? ref.data()?.paperId : null;
    if (!paperId) continue;
    const p = await adminDb.collection(PAPERS).doc(paperId).get();
    if (p.exists && p.data()?.status !== 'draft') return { id: paperId, d: p.data() };
  }
  return null;
}

async function deletePaperFiles(d: any) {
  await Promise.all((d?.pages || []).map((p: any) => bucket().file(p.path).delete().catch(() => {})));
}

/** Step 1: read the paper with AI, keep it as a private draft, and suggest the details. */
export async function scanPaper(s: PaperScope, input: any) {
  const files: { base64: string; mimeType: string; name?: string }[] = Array.isArray(input?.files) ? input.files : [];
  const v = validateServerUploadPayload(files);
  if (!v.valid) throw new PaperError(400, v.error || 'Invalid file');
  if (files.length > MAX_PAPER_PAGES) throw new PaperError(400, `Up to ${MAX_PAPER_PAGES} pages at a time`);
  const pdfs = files.filter((f) => f.mimeType === 'application/pdf').length;
  if (pdfs > 0 && files.length > 1) throw new PaperError(400, 'Upload one PDF, or photos of the pages, not both');
  const buffers = files.map((f) => Buffer.from(f.base64.replace(/^data:[^;]+;base64,/, ''), 'base64'));
  const total = buffers.reduce((n, b) => n + b.length, 0);
  if (total > MAX_PAPER_TOTAL_MB * 1024 * 1024) throw new PaperError(413, `That's too big. Keep the whole paper under ${MAX_PAPER_TOTAL_MB} MB.`);
  for (const f of files) if (!EXT[f.mimeType]) throw new PaperError(400, 'Use JPG, PNG or WebP photos, or a PDF');

  const hashes = buffers.map((b) => sha(b));
  const existing = await findExisting(s, hashes);
  if (existing) {
    throw new PaperError(409, 'This paper is already uploaded', {
      code: 'duplicate',
      duplicate: canSee(s, existing.d) ? toSummary(existing.id, existing.d, s) : null,
    });
  }

  const branch = s.isStaff ? String(input?.branch || '').trim().slice(0, 80) : s.branch;
  const examNames = await examNamesOf(s.collegeKey);
  const ai = await readPaper(files, s, examNames, branch);
  if (ai.isQuestionPaper === false) {
    throw new PaperError(422, "This doesn't look like a question paper. Upload photos or a PDF of the exam paper.", { code: 'not-a-paper' });
  }
  const year = Number(ai.examYear);
  const fields: PaperFields = {
    subjectName: String(ai.subjectName || '').trim().slice(0, 120),
    subjectCode: String(ai.subjectCode || '').trim().toUpperCase().slice(0, 30),
    examName: canonicalExamName(String(ai.examName || '').trim().slice(0, 60), examNames),
    examYear: Number.isInteger(year) && year >= 2000 && year <= new Date().getFullYear() + 1 ? year : new Date().getFullYear(),
    examMonth: String(ai.examMonth || '').trim().slice(0, 24),
    semester: Number.isInteger(Number(ai.semester)) && Number(ai.semester) >= 1 && Number(ai.semester) <= 12 ? Number(ai.semester) : null,
    ...(branch ? { branch } : {}),
  };

  // One draft per person: clear older unpublished ones
  const old = await adminDb.collection(PAPERS).where('uploadedBy', '==', s.uid).where('status', '==', 'draft').get();
  await Promise.all(old.docs.map(async (doc: any) => {
    await deletePaperFiles(doc.data());
    await doc.ref.delete();
  }));

  const ref = adminDb.collection(PAPERS).doc();
  const pages = await Promise.all(
    buffers.map(async (buf, i) => {
      const type = files[i].mimeType === 'image/jpg' ? 'image/jpeg' : files[i].mimeType;
      const path = `question_papers/${s.collegeKey}/${ref.id}/p${i + 1}.${EXT[files[i].mimeType]}`;
      await bucket().file(path).save(buf, { contentType: type, resumable: false });
      return { path, type, size: buf.length };
    })
  );
  await ref.set({
    status: 'draft',
    collegeKey: s.collegeKey,
    college: s.college,
    uploadedBy: s.uid,
    uploaderRole: s.role,
    kind: pdfs ? 'pdf' : 'images',
    pages,
    fileHashes: hashes,
    ...fields,
    branch: branch || '',
    branchKey: normKey(branch),
    createdAt: now(),
  });

  // Same subject + exam + year already here? Say so now, before they fill anything in.
  let possibleDuplicate: PaperSummary | null = null;
  if (branch) {
    const fp = await adminDb.collection('qp_fingerprints').doc(sha(paperFingerprint(s.collegeKey, branch, fields))).get();
    const pid = fp.exists ? fp.data()?.paperId : null;
    if (pid) {
      const p = await adminDb.collection(PAPERS).doc(pid).get();
      if (p.exists && p.data()?.status !== 'draft' && canSee(s, p.data())) possibleDuplicate = toSummary(pid, p.data(), s);
    }
  }
  return { draftId: ref.id, fields, examNames, possibleDuplicate };
}

/** Step 2: the uploader confirms the details and the paper goes live (unless it's already here). */
export async function publishPaper(s: PaperScope, draftId: string, input: any) {
  const clean = cleanPaperFields(input);
  if (typeof clean === 'string') throw new PaperError(400, clean);
  const branch = s.isStaff ? clean.branch || '' : s.branch;
  if (!normKey(branch)) throw new PaperError(400, 'Choose the branch this paper is for');
  const examNames = await examNamesOf(s.collegeKey);
  const fields: PaperFields = { ...clean, examName: canonicalExamName(clean.examName, examNames) };
  const fp = sha(paperFingerprint(s.collegeKey, branch, fields));
  const ref = adminDb.collection(PAPERS).doc(draftId);

  const result = await adminDb.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (!d || d.uploadedBy !== s.uid || d.status !== 'draft') throw new PaperError(404, 'This upload has expired. Start again.');
    const fpRef = adminDb.collection('qp_fingerprints').doc(fp);
    const hashRefs = (d.fileHashes || []).map((h: string) => adminDb.collection('qp_hashes').doc(`${s.collegeKey}__${h}`));
    const [fpSnap, ...hashSnaps] = await Promise.all([tx.get(fpRef), ...hashRefs.map((r: any) => tx.get(r))]);
    const takenBy = [fpSnap, ...hashSnaps].map((x: any) => (x.exists ? x.data()?.paperId : null)).find((pid: string | null) => pid && pid !== draftId);
    if (takenBy) {
      const other = await tx.get(adminDb.collection(PAPERS).doc(takenBy));
      if (other.exists && other.data()?.status !== 'draft') {
        throw new PaperError(409, 'This paper is already uploaded', {
          code: 'duplicate',
          duplicate: canSee(s, other.data()) ? toSummary(takenBy, other.data(), s) : null,
        });
      }
    }
    tx.set(fpRef, { paperId: draftId, at: now() });
    hashRefs.forEach((r: any) => tx.set(r, { paperId: draftId, at: now() }));
    const next = {
      ...fields,
      branch,
      branchKey: normKey(branch),
      status: 'live',
      official: s.isStaff,
      fingerprint: fp,
      reports: 0,
      reportedBy: [],
      publishedAt: now(),
    };
    tx.update(ref, next);
    return { ...d, ...next };
  });

  const { FieldValue } = await import('firebase-admin/firestore');
  await adminDb
    .collection('qp_colleges')
    .doc(s.collegeKey)
    .set({ examNames: FieldValue.arrayUnion(fields.examName), updatedAt: now() }, { merge: true })
    .catch(() => {});
  return toSummary(draftId, result, s);
}

// ---------- Moderation ----------
export async function reportPaper(s: PaperScope, id: string) {
  const ref = adminDb.collection(PAPERS).doc(id);
  return adminDb.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (!canSee(s, d) || d.status !== 'live') throw new PaperError(404, "This paper isn't available");
    if (d.uploadedBy === s.uid) throw new PaperError(400, "You can't report your own upload. Remove it instead.");
    const by: string[] = Array.isArray(d.reportedBy) ? d.reportedBy : [];
    if (by.includes(s.uid)) return { hidden: false };
    const reports = (d.reports || 0) + 1;
    const hidden = reports >= REPORTS_TO_HIDE;
    tx.update(ref, { reports, reportedBy: [...by, s.uid].slice(-200), ...(hidden ? { status: 'hidden' } : {}) });
    return { hidden };
  });
}

export async function removePaper(s: PaperScope, id: string) {
  const ref = adminDb.collection(PAPERS).doc(id);
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : null;
  if (!d || d.collegeKey !== s.collegeKey) throw new PaperError(404, "This paper isn't available");
  if (d.uploadedBy !== s.uid && !s.isStaff) throw new PaperError(403, 'Only the uploader, faculty or the campus admin can remove this');
  await deletePaperFiles(d);
  const batch = adminDb.batch();
  (d.fileHashes || []).forEach((h: string) => batch.delete(adminDb.collection('qp_hashes').doc(`${d.collegeKey}__${h}`)));
  if (d.fingerprint) {
    const fp = await adminDb.collection('qp_fingerprints').doc(d.fingerprint).get();
    if (fp.exists && fp.data()?.paperId === id) batch.delete(fp.ref);
  }
  batch.delete(ref);
  await batch.commit();
}

export async function restorePaper(s: PaperScope, id: string) {
  if (!s.isStaff) throw new PaperError(403, 'Only faculty or the campus admin can restore papers');
  const ref = adminDb.collection(PAPERS).doc(id);
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : null;
  if (!d || d.collegeKey !== s.collegeKey || d.status !== 'hidden') throw new PaperError(404, "This paper isn't hidden");
  await ref.update({ status: 'live', reports: 0, reportedBy: [] });
}
