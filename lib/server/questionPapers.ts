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
import { aiBudget, withTimeout } from './aiRun';
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
  semester: number | null; // students only: their current semester, the default for an upload
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
    return { uid, role: 'campus_admin', collegeKey: campus.collegeKey, college: campus.college, branch: '', branchKey: '', semester: null, isStaff: true };
  }
  const collegeKey = collegeKeyOf(p.college);
  if (!collegeKey) throw new PaperError(400, 'Add your college in Profile to see question papers', { code: 'no-college' });
  if (p.role === 'faculty') {
    return { uid, role: 'faculty', collegeKey, college: p.college, branch: '', branchKey: '', semester: null, isStaff: true };
  }
  const branch = typeof p.branch === 'string' ? p.branch.trim() : '';
  if (!normKey(branch)) throw new PaperError(400, 'Add your branch in Profile to see question papers', { code: 'no-branch' });
  const sem = Number(p.semester);
  return {
    uid,
    role: 'student',
    collegeKey,
    college: p.college,
    branch,
    branchKey: normKey(branch),
    semester: Number.isInteger(sem) && sem >= 1 && sem <= 12 ? sem : null,
    isStaff: false,
  };
}

/** Which branch an upload is for. Staff must say; a student defaults to their own branch but may
 *  add a paper for another branch of their college (it then shows only to that branch). */
function uploadBranch(s: PaperScope, asked: unknown) {
  const b = typeof asked === 'string' ? asked.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  return s.isStaff ? b : b || s.branch;
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
{"isQuestionPaper": boolean, "subjectName": string, "subjectCode": string, "examName": string, "examYear": number | null, "examMonth": string, "semester": number | null, "questions": string[]}

Rules:
- isQuestionPaper: false if this is not an exam question paper (notes, a timetable, an answer sheet, a result, a random photo).
- subjectName: the course title as printed, in Title Case, without the course code.
- subjectCode: the course / paper code as printed (e.g. "CS301", "KCS-501"), else "".
- examName: the exam as THIS college names it. Names this college already uses: ${examNames.length ? examNames.map((n) => `"${n}"`).join(', ') : 'none yet'}.
  If the paper is one of those exams, return that exact name. Otherwise use the name printed on the paper, short and in Title Case
  (e.g. "Mid Semester Exam", "End Semester Exam", "Sessional 1", "Class Test 2", "Quiz 1"). No year, subject or semester in it.
- examYear: the 4-digit year the exam was held. If only a session like "2025-26" is printed, use the first year for Jul–Dec exams and the second for Jan–Jun exams. null if unknown.
- examMonth: the month(s) printed, e.g. "May" or "Nov–Dec", else "".
- semester: the semester number if printed ("V Sem" → 5, "3rd Semester" → 3), else null.
- questions: the text of the first 8 questions in order, as printed, each under 160 characters, without marks or numbering. [] if you can't read them.`;
  const parts = files.map((f) => ({ inlineData: { data: f.base64.replace(/^data:[^;]+;base64,/, ''), mimeType: f.mimeType } }));
  const genAI = new GoogleGenerativeAI(apiKey);
  const budget = aiBudget(45_000); // the upload itself needs time too (route maxDuration = 60)
  for (const name of MODELS) {
    const slot = budget.slot(25000);
    if (!slot) break;
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result: any = await withTimeout(model.generateContent([prompt, ...parts]), slot, name);
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

// ---------- Same paper? ----------
// Two photos of one paper never share bytes, and the AI can read the month on one and miss it on
// the other, so neither the file hash nor the exact details catch a re-upload. The questions
// themselves do: the AI lists the opening questions, and we compare their words.
const STOP = new Set(
  'the and for with that this from what which explain write define describe discuss give state find show prove using use any two three five marks each following short note notes between their its are was were how why when where also into about all can does draw briefly detail example examples'.split(' ')
);
const questionSig = (qs: unknown): string[] => {
  const words = new Set<string>();
  (Array.isArray(qs) ? qs : []).slice(0, 12).forEach((q) =>
    String(q || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      // drop a plural "s" so "notation" and "notations" count as the same word
      .forEach((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w) && words.add(w.length > 4 ? w.replace(/(?<!s)s$/, '') : w))
  );
  return Array.from(words).slice(0, 160);
};
/** Share of the smaller paper's question words found in the other one (0–1). */
const sigOverlap = (a: string[], b: string[]) => {
  if (a.length < 10 || b.length < 10) return 0; // too little text to judge
  const B = new Set(b);
  const hit = a.filter((w) => B.has(w)).length;
  return hit / Math.min(a.length, b.length);
};
const SAME_PAPER = 0.6;
const monthKey = (m: unknown) => normKey(String(m || '')).slice(0, 3);
const subjectKeyOf = (d: { subjectCode?: string; subjectName?: string }) => normKey(d.subjectCode || '') || normKey(d.subjectName || '');

/** Already in this branch? `same`: the questions match (block). `likely`: same subject + exam + year
 *  and the months don't disagree, for papers we can't compare by questions (warn, let them decide). */
async function findSamePaper(s: PaperScope, branch: string, fields: PaperFields, sig: string[]) {
  if (!normKey(branch)) return { same: null, likely: null };
  const snap = await adminDb.collection(PAPERS).where('collegeKey', '==', s.collegeKey).where('branchKey', '==', normKey(branch)).limit(400).get();
  let same: { id: string; d: any } | null = null;
  let likely: { id: string; d: any } | null = null;
  const subj = subjectKeyOf(fields);
  const subjName = normKey(fields.subjectName);
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.status === 'draft') continue;
    const theirSig: string[] = Array.isArray(d.qSig) ? d.qSig : [];
    const comparable = sig.length >= 10 && theirSig.length >= 10;
    if (comparable && sigOverlap(sig, theirSig) >= SAME_PAPER) {
      same = { id: doc.id, d };
      break;
    }
    if (comparable) continue; // both have questions and they differ: a different paper
    const sameSubject = subj && (subjectKeyOf(d) === subj || (subjName && normKey(d.subjectName || '') === subjName));
    const months = [monthKey(fields.examMonth), monthKey(d.examMonth)];
    if (
      !likely &&
      sameSubject &&
      normKey(d.examName || '') === normKey(fields.examName) &&
      Number(d.examYear) === Number(fields.examYear) &&
      (!months[0] || !months[1] || months[0] === months[1])
    ) {
      likely = { id: doc.id, d };
    }
  }
  return { same, likely };
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

  const branch = uploadBranch(s, input?.branch);
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
    // The paper's own semester if printed; else a student's current one when it's for their branch
    semester:
      Number.isInteger(Number(ai.semester)) && Number(ai.semester) >= 1 && Number(ai.semester) <= 12
        ? Number(ai.semester)
        : !s.isStaff && normKey(branch) === s.branchKey
        ? s.semester
        : null,
    ...(branch ? { branch } : {}),
  };

  // Same paper already here (by its questions)? Stop before anything is stored.
  const sig = questionSig(ai.questions);
  const match = await findSamePaper(s, branch, fields, sig);
  if (match.same) {
    throw new PaperError(409, 'This paper is already uploaded', {
      code: 'duplicate',
      duplicate: canSee(s, match.same.d) ? toSummary(match.same.id, match.same.d, s) : null,
    });
  }

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
    qSig: sig,
    ...fields,
    branch: branch || '',
    branchKey: normKey(branch),
    createdAt: now(),
  });

  // Same subject + exam + year already here (couldn't compare questions)? Say so now, before they
  // fill anything in; they can still add it if it really is a different paper.
  const possibleDuplicate: PaperSummary | null =
    match.likely && canSee(s, match.likely.d) ? toSummary(match.likely.id, match.likely.d, s) : null;
  return { draftId: ref.id, fields, examNames, possibleDuplicate };
}

/** Step 2: the uploader confirms the details and the paper goes live (unless it's already here). */
export async function publishPaper(s: PaperScope, draftId: string, input: any) {
  const clean = cleanPaperFields(input);
  if (typeof clean === 'string') throw new PaperError(400, clean);
  const branch = uploadBranch(s, clean.branch);
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
