// Matches a Google Classroom class (or an assignment title) to one of the batch's subjects, even when the
// names are written differently:
//   "CS201 Data Structures (2026)"  → Data Structures           (subject code)
//   "DBMS - CSE A"                  → Database Management Systems (common abbreviation)
//   "Design & Analysis of Algo"     → DAA / Design and Analysis of Algorithms
//   "Maths-II"                      → Mathematics 2              (roman numerals, spelling variants)
//   "DS Lab"                        → Data Structures Lab        (lab vs theory kept apart)
// Pure functions, used by the server sync and the app.

export interface MatchSubject {
  id: string;
  name: string;
  code?: string;
  shortName?: string;
  isLab?: boolean;
}

export interface SubjectMatch {
  subjectId: string | null;
  score: number;
  runnerUp: number;
  how: 'code' | 'short' | 'acronym' | 'name' | 'none';
}

// Common course abbreviations in Indian engineering colleges → words
const ABBR: Record<string, string> = {
  dbms: 'database management system', rdbms: 'relational database management system', db: 'database',
  os: 'operating system', cn: 'computer network', cns: 'cryptography network security', ns: 'network security',
  coa: 'computer organization architecture', ca: 'computer architecture', dsa: 'data structure algorithm',
  ds: 'data structure', daa: 'design analysis algorithm', ada: 'analysis design algorithm', dsaa: 'data structure algorithm analysis',
  toc: 'theory computation', flat: 'formal language automata theory', atc: 'automata theory computation', cd: 'compiler design',
  oop: 'object oriented programming', oops: 'object oriented programming', ooad: 'object oriented analysis design',
  se: 'software engineering', spm: 'software project management', sepm: 'software engineering project management',
  ai: 'artificial intelligence', ml: 'machine learning', dl: 'deep learning', nlp: 'natural language processing',
  cv: 'computer vision', ir: 'information retrieval', iot: 'internet thing', cc: 'cloud computing', bda: 'big data analytics',
  dwdm: 'data warehousing mining', dm: 'discrete mathematics', dms: 'discrete mathematical structure', la: 'linear algebra',
  pns: 'probability statistics', evs: 'environmental science', pps: 'programming problem solving', cp: 'computer programming',
  bee: 'basic electrical engineering', beee: 'basic electrical electronics engineering', bxe: 'basic electronics engineering',
  eg: 'engineering graphics', egd: 'engineering graphics design', em: 'engineering mechanics', dld: 'digital logic design',
  de: 'digital electronics', dsd: 'digital system design', dsp: 'digital signal processing', dip: 'digital image processing',
  vlsi: 'very large scale integration', mpmc: 'microprocessor microcontroller', mp: 'microprocessor',
  hci: 'human computer interaction', wt: 'web technology', fsd: 'full stack development', cg: 'computer graphics',
  ics: 'introduction computer science', dc: 'distributed computing',
  pdc: 'parallel distributed computing', hpc: 'high performance computing', rl: 'reinforcement learning',
  gt: 'graph theory', nm: 'numerical method', ode: 'ordinary differential equation', pde: 'partial differential equation',
  ec: 'electronic circuit', sns: 'signal system', ss: 'signal system', bct: 'blockchain technology',
};

// Spelling variants → one word
const SYN: Record<string, string> = {
  maths: 'math', mathematics: 'math', mathematical: 'math', mathematic: 'math',
  lab: 'lab', labs: 'lab', laboratory: 'lab', laboratories: 'lab', practical: 'lab', practicals: 'lab', prac: 'lab',
  engg: 'engineering', engineerings: 'engineering',
  prog: 'programming', programing: 'programming', program: 'programming',
  algo: 'algorithm', algos: 'algorithm', algorithms: 'algorithm',
  sys: 'system', systems: 'system', networks: 'network', networking: 'network', ntw: 'network',
  mgmt: 'management', mgt: 'management', comm: 'communication', communications: 'communication',
  electronic: 'electronics', intro: 'introduction', introductory: 'introduction', fundamentals: 'fundamental',
  basics: 'basic', stats: 'statistic', statistics: 'statistic', stat: 'statistic', prob: 'probability',
  phy: 'physics', chem: 'chemistry', bio: 'biology', eco: 'economics', env: 'environmental', environment: 'environmental',
  sci: 'science', sciences: 'science', comp: 'computer', computers: 'computer', databases: 'database',
  structures: 'structure', struct: 'structure', designs: 'design', technologies: 'technology',
  organisation: 'organization', organization: 'organization', analyses: 'analysis', analytics: 'analytics',
};

// Words that say nothing about the subject (degree, branch, section, term, filler)
const STOP = new Set([
  'and', 'of', 'the', 'in', 'for', 'to', 'a', 'an', 'with', 'on', 'by', 'at', 'from', 'into', 'its',
  'course', 'courses', 'class', 'classes', 'classroom', 'subject', 'paper', 'lecture', 'lectures', 'theory', 'tutorial',
  'batch', 'group', 'grp', 'section', 'sec', 'division', 'div', 'year', 'yr', 'term', 'session', 'semester', 'sem',
  'odd', 'even', 'spring', 'autumn', 'fall', 'winter', 'summer', 'official', 'new', 'final', 'all', 'students', 'student',
  'btech', 'mtech', 'tech', 'be', 'bsc', 'msc', 'mca', 'bca', 'phd', 'ug', 'pg', 'dept', 'department',
  'cse', 'ece', 'eee', 'ee', 'it', 'mech', 'civil', 'dsai', 'aiml', 'aids', 'csbs', 'ise', 'ice', 'cce', 'iiit', 'nit', 'iit',
  'prof', 'dr', 'sir', 'mam', 'madam', 'by', 'part', 'unit', 'module',
]);

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' };
const LAB_WORD = /\b(lab|labs|laboratory|practicals?|experiments?|expt|exp)\b/i;

const words = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Raw alphanumeric tokens incl. joined letter+number pairs ("cs 201" → "cs201"), for code lookups. */
const codeTokens = (s: string) => {
  const raw = (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const out = new Set(raw);
  for (let i = 0; i < raw.length - 1; i++) if (/^[a-z]+$/.test(raw[i]) && /^\d+[a-z]?$/.test(raw[i + 1])) out.add(raw[i] + raw[i + 1]);
  return out;
};

const singular = (w: string) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') ? w.slice(0, -1) : w);

interface Parsed {
  tokens: string[]; // meaningful words, normalised and expanded
  nums: string[]; // part numbers: "maths 2", "ii"
  lab: boolean;
  raw: Set<string>;
}

const parse = (s: string): Parsed => {
  const ws = words(s);
  const tokens: string[] = [];
  const nums: string[] = [];
  let skipNext = false;
  for (let i = 0; i < ws.length; i++) {
    let w = ws[i];
    if (skipNext) {
      skipNext = false;
      if (/^\d+$/.test(w) || w.length === 1 || /^\d+(st|nd|rd|th)$/.test(w)) continue;
    }
    if (w === 'sem' || w === 'semester' || w === 'section' || w === 'sec' || w === 'year' || w === 'yr' || w === 'batch') {
      skipNext = true;
      continue;
    }
    if (/^\d+(st|nd|rd|th)$/.test(w)) continue; // "3rd" (sem / year)
    if (/^(19|20)\d\d$/.test(w)) continue; // years
    if (ROMAN[w] && (i > 0 || ws.length === 1)) {
      nums.push(ROMAN[w]);
      continue;
    }
    if (/^\d+$/.test(w)) {
      const n = Number(w);
      if (n >= 1 && n <= 8 && i > 0) nums.push(String(n));
      continue;
    }
    if (STOP.has(w)) continue;
    if (w.length === 1) continue;
    if (ABBR[w]) {
      tokens.push(...ABBR[w].split(' ').map((x) => SYN[x] || singular(x)));
      continue;
    }
    w = SYN[w] || singular(w);
    w = SYN[w] || w;
    tokens.push(w);
  }
  const uniq = Array.from(new Set(tokens));
  return { tokens: uniq, nums: Array.from(new Set(nums)), lab: uniq.includes('lab') || LAB_WORD.test(s), raw: codeTokens(s) };
};

const lev = (a: string, b: string) => {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
};

// Same word, forgiving small typos ("Algoritms", "Strucures") but not different words ("Electrical"/"Electronics")
const sameWord = (a: string, b: string) => {
  if (a === b) return true;
  const longest = Math.max(a.length, b.length);
  return longest >= 5 && 1 - lev(a, b) / longest >= 0.8;
};

const CONNECTORS = new Set(['and', 'of', 'the', 'in', 'for', 'to', 'with', 'on', 'a', 'an']);
/** "Design and Analysis of Algorithms" → "daa" */
export const acronymOf = (name: string) =>
  words(name)
    .filter((w) => !CONNECTORS.has(w) && !/^\d+$/.test(w) && !ROMAN[w])
    .map((w) => w[0])
    .join('');

const isLabSubject = (s: MatchSubject) => Boolean(s.isLab) || LAB_WORD.test(s.name || '');

const overlap = (a: string[], b: string[]) => {
  const used = new Set<number>();
  let n = 0;
  for (const x of a) {
    const j = b.findIndex((y, k) => !used.has(k) && sameWord(x, y));
    if (j >= 0) {
      used.add(j);
      n++;
    }
  }
  return n;
};

/** 0–1: how well a piece of text (class name / assignment title) describes this subject. */
export const scoreSubject = (text: string, s: MatchSubject, pre?: Parsed): { score: number; how: SubjectMatch['how'] } => {
  const c = pre || parse(text);
  const sp = parse(s.name);
  let score = 0;
  let how: SubjectMatch['how'] = 'none';

  // 1. Subject code inside the class name ("CS201", "DSAA")
  const code = (s.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (code.length >= 3 && code !== 'unk' && !/^\d+$/.test(code) && c.raw.has(code)) {
    score = 1;
    how = 'code';
  }
  // 2. Short name ("DBMS", "OS") written in the class name
  const short = (s.shortName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (score < 0.95 && short.length >= 2 && c.raw.has(short) && short !== code) {
    score = 0.95;
    how = 'short';
  }
  // 3. Acronym of the subject name ("DAA" for Design and Analysis of Algorithms)
  const acr = acronymOf(s.name);
  if (score < 0.93 && acr.length >= 2 && c.raw.has(acr)) {
    score = 0.93;
    how = 'acronym';
  }
  // 4. Word overlap (with abbreviations expanded and small typos forgiven)
  if (c.tokens.length && sp.tokens.length) {
    const m = overlap(sp.tokens, c.tokens);
    if (m > 0) {
      const dice = (2 * m) / (sp.tokens.length + c.tokens.length);
      const coverSubject = (m / sp.tokens.length) * (sp.tokens.length >= 2 ? 0.92 : 0.8);
      const coverText = (m / c.tokens.length) * (c.tokens.length >= 2 ? 0.86 : 0.75);
      const nameScore = Math.max(dice, coverSubject, coverText);
      if (nameScore > score) {
        score = nameScore;
        how = 'name';
      }
    }
  }
  if (score === 0) return { score: 0, how: 'none' };

  // Lab and theory are different subjects
  const sLab = isLabSubject(s);
  if (c.lab !== sLab) score -= c.lab ? 0.22 : 0.12;
  // "Maths 1" is not "Maths 2"
  if (c.nums.length && sp.nums.length && !c.nums.some((n) => sp.nums.includes(n))) score -= 0.45;
  return { score: Math.max(0, Math.min(1, score)), how };
};

/** Best subject for a class name, only if it is a clear winner. */
export const matchSubject = (text: string, subjects: MatchSubject[], minScore = 0.62): SubjectMatch => {
  const pre = parse(text);
  let best: { id: string; score: number; how: SubjectMatch['how'] } | null = null;
  let runnerUp = 0;
  for (const s of subjects) {
    if (!s?.id || !s.name) continue;
    const r = scoreSubject(text, s, pre);
    if (!best || r.score > best.score) {
      if (best) runnerUp = Math.max(runnerUp, best.score);
      best = { id: s.id, score: r.score, how: r.how };
    } else runnerUp = Math.max(runnerUp, r.score);
  }
  if (!best || best.score < minScore) return { subjectId: null, score: best?.score || 0, runnerUp, how: 'none' };
  const clear = best.score >= 0.9 ? best.score - runnerUp >= 0.04 : best.score - runnerUp >= 0.1;
  return clear ? { subjectId: best.id, score: best.score, runnerUp, how: best.how } : { subjectId: null, score: best.score, runnerUp, how: 'none' };
};

/** Top few subjects for a pending item, best first (for one-tap picking). */
export const suggestSubjects = (text: string, subjects: MatchSubject[], limit = 3) => {
  const pre = parse(text);
  return subjects
    .filter((s) => s?.id && s.name)
    .map((s) => ({ s, score: scoreSubject(text, s, pre).score }))
    .filter((x) => x.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s }) => ({ id: s.id, name: s.name }));
};

/**
 * Subject for one assignment. The class decides it, except:
 *  - lab work posted in the theory class goes to the matching lab subject ("Lab 3: Linked list" → DS Lab)
 *  - a class that covers many subjects ("CSE 3rd Sem") falls back to the assignment title ("DBMS Assignment 2")
 */
export const subjectForWork = (classSubjectId: string | null, title: string, subjects: MatchSubject[]): string | null => {
  const base = classSubjectId ? subjects.find((s) => s.id === classSubjectId) : undefined;
  if (base) {
    if (LAB_WORD.test(title || '') && !isLabSubject(base)) {
      const labs = subjects.filter((s) => s.id !== base.id && isLabSubject(s));
      const hit = matchSubject(`${base.name} lab`, labs, 0.8);
      if (hit.subjectId) return hit.subjectId;
    }
    return base.id;
  }
  // No class mapping: only trust strong signals in the title (code, short name, acronym, clear name)
  const byTitle = matchSubject(title || '', subjects, 0.8);
  return byTitle.subjectId;
};
