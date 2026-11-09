// Question papers: shared model + helpers (used by the server and the app).
// Relative imports only, so this can be compiled and tested on its own.

export type PaperStatus = 'draft' | 'live' | 'hidden';

/** What the app gets for one paper (never the uploader's identity). */
export interface PaperSummary {
  id: string;
  subjectName: string;
  subjectCode: string;
  examName: string; // as this college calls it: "Mid Sem", "MTE", "Sessional 1"…
  examYear: number;
  examMonth: string; // "May", "Nov–Dec", or ''
  semester: number | null;
  branch: string;
  pageCount: number;
  kind: 'images' | 'pdf';
  official: boolean; // uploaded by faculty or the campus admin
  createdAt: string;
  mine: boolean;
  status: PaperStatus;
  reports?: number; // staff only
  reportedByMe?: boolean;
}

/** The fields an uploader confirms before publishing. */
export interface PaperFields {
  subjectName: string;
  subjectCode: string;
  examName: string;
  examYear: number;
  examMonth: string;
  semester: number | null;
  branch?: string; // staff choose; students always use their own
}

export const MAX_PAPER_PAGES = 10;
export const MAX_PAPER_TOTAL_MB = 3; // request bodies must stay under the host's 4.5 MB limit (base64 adds a third)
export const REPORTS_TO_HIDE = 3;

export const normKey = (s?: string | null) =>
  (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

/** Same subject + exam + year (+ month) in the same college and branch = the same paper. */
export const paperFingerprint = (collegeKey: string, branch: string, f: PaperFields) =>
  [
    collegeKey,
    normKey(branch),
    normKey(f.subjectCode) || normKey(f.subjectName),
    normKey(f.examName),
    String(f.examYear),
    normKey(f.examMonth),
  ].join('|');

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Cleans what the AI or the uploader sent. Returns an error message, or the clean fields. */
export function cleanPaperFields(input: any, nowYear = new Date().getFullYear()): PaperFields | string {
  const subjectName = clip(input?.subjectName, 120);
  const subjectCode = clip(input?.subjectCode, 30).toUpperCase();
  const examName = clip(input?.examName, 60);
  const examMonth = clip(input?.examMonth, 24);
  const examYear = Number(input?.examYear);
  const semRaw = input?.semester === null || input?.semester === '' || input?.semester === undefined ? null : Number(input.semester);
  if (!subjectName) return 'Add the subject name';
  if (!examName) return 'Add the exam name';
  if (!Number.isInteger(examYear) || examYear < 2000 || examYear > nowYear + 1) return 'Add the year of the exam';
  const semester = semRaw !== null && Number.isInteger(semRaw) && semRaw >= 1 && semRaw <= 12 ? semRaw : null;
  const branch = clip(input?.branch, 80);
  return { subjectName, subjectCode, examName, examYear, examMonth, semester, ...(branch ? { branch } : {}) };
}

/** Uses the college's existing spelling when the AI or the uploader wrote the same exam differently. */
export const canonicalExamName = (name: string, known: string[]) => {
  const k = normKey(name);
  return known.find((n) => normKey(n) === k) || name;
};

export const paperTitle = (p: Pick<PaperSummary, 'examName' | 'examYear' | 'examMonth'>) =>
  [p.examName, [p.examMonth, p.examYear].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

/** Search: every word must match the subject, code, exam, year or month. */
const acronym = (name: string) =>
  name
    .split(/[^A-Za-z]+/)
    .filter((w) => w && !['and', 'of', 'the', 'for', 'in', 'to'].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join('');

export const matchesPaperSearch = (p: PaperSummary, q: string) => {
  const hay = `${p.subjectName} ${acronym(p.subjectName)} ${p.subjectCode} ${p.examName} ${p.examYear} ${p.examMonth} ${p.semester ? `sem ${p.semester} semester ${p.semester}` : ''}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
};
