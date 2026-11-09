// Electives: one engine for the app and the server.
//
// How electives work in Indian college timetables, and how this models them:
// - An "elective slot" (Elective I, Open Elective, DE-2...) is a set of class times where
//   different students sit in different courses. Each student takes ONE of the courses.
// - The batch (its pilot) marks which courses are electives. Courses that run at the same time,
//   or that the pilot gave the same slot name, form one group: pick one of them.
//   An elective that never clashes with another is optional: you take it or you don't.
// - Each student's pick is stored on their profile, by the course's id AND by stable keys
//   (its name and real course code), so a re-import that changes ids never loses it.
// - Until a student picks, each slot shows once as "Elective I: pick yours", never as several
//   overlapping classes, and nothing about it counts (attendance, bag, reminders).
//
// Pure functions only: safe to import from client components and from server code.
import type { ClassSession, DayOfWeek, StudentProfile, Subject } from './types';

export type ElectiveChoice = Pick<StudentProfile, 'enrolledElectiveIds' | 'electiveKeys' | 'electivesSkipped'>;
export type ElectiveKind = 'pick' | 'optional';
export type ElectiveStatus = 'chosen' | 'none' | 'pending';

export interface ElectiveSlot {
  day: DayOfWeek;
  start: string;
  end: string;
}

export interface ElectiveGroup {
  /** Stable while the group's name or options stay the same */
  key: string;
  /** "Elective I", "Open Elective", or the course name for a lone optional course */
  label: string;
  /** Whether the pilot named it (otherwise the label is made up) */
  named: boolean;
  /** pick: choose one of several · optional: one course you may or may not take */
  kind: ElectiveKind;
  options: Subject[];
  /** When this group meets, sorted Monday first */
  slots: ElectiveSlot[];
}

export interface ResolvedElectiveGroup extends ElectiveGroup {
  status: ElectiveStatus;
  chosen: Subject | null;
}

/** Marker on a placeholder session that stands for an elective slot the student hasn't picked yet */
export interface ElectivePendingMark {
  groupKey: string;
  label: string;
  kind: ElectiveKind;
  options: { id: string; name: string; code?: string }[];
}

export type PersonalSession = ClassSession & {
  /** This class is an elective slot the student hasn't picked yet */
  electivePending?: ElectivePendingMark;
  /** This class is the student's chosen elective; the slot's name */
  electiveLabel?: string;
};

export const DAY_ORDER: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const norm = (v?: string | null) =>
  (v || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** A real course code (CS301, MA-204), not a one-letter timetable slot (A, F, Z) or a placeholder */
const realCode = (code?: string | null) => {
  const c = (code || '').trim();
  return c.length > 2 && !/^[A-Z]\d?$/i.test(c) && c.toUpperCase() !== 'UNK' ? c : '';
};

/** Stable ids for a course that survive re-imports: its name, and its real course code */
export const optionKeys = (s: Pick<Subject, 'name' | 'code'>): string[] => {
  const keys: string[] = [];
  const n = norm(s.name);
  if (n) keys.push(`n:${n}`);
  const c = norm(realCode(s.code));
  if (c) keys.push(`c:${c}`);
  return keys;
};

/** "09:00" / "9:00 AM" → minutes after midnight */
export const minutesOf = (t?: string | null): number => {
  if (!t) return NaN;
  const [hm, mod] = t.trim().split(/\s+/);
  const [h0, m0] = hm.split(':');
  let h = parseInt(h0, 10);
  const m = parseInt(m0 || '0', 10);
  if (mod) {
    const M = mod.toUpperCase();
    if (M === 'PM' && h < 12) h += 12;
    if (M === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
};

const overlaps = (a: ClassSession, b: ClassSession) => {
  if (a.day !== b.day) return false;
  const as = minutesOf(a.startTime);
  const ae = minutesOf(a.endTime);
  const bs = minutesOf(b.startTime);
  const be = minutesOf(b.endTime);
  if ([as, ae, bs, be].some((x) => isNaN(x))) return a.startTime === b.startTime;
  return as < be && bs < ae;
};

const slotSort = (a: ElectiveSlot, b: ElectiveSlot) =>
  DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || minutesOf(a.start) - minutesOf(b.start);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const neatness = (l: string) => (l.match(/[A-Z]/g) || []).length;
/** "elective  ii" → "Elective II", "open elective" → "Open Elective"; well-written names stay as typed */
export const prettyLabel = (raw?: string | null) => {
  const l = (raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!l || l !== l.toLowerCase()) return l;
  return l.replace(/[a-z0-9]+/g, (w) => (/^(i{1,3}|iv|v|vi{0,3}|ix|x|oe|de|pe|ge|hss)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));
};

/**
 * The batch's elective groups. Electives that share a pilot-given slot name, or whose classes
 * overlap in time, are one group (you can't sit in two at once, so you pick one).
 */
export function buildElectiveGroups(subjects: Subject[], timetable: ClassSession[]): ElectiveGroup[] {
  const electives = (subjects || []).filter((s) => s && s.isElective);
  if (electives.length === 0) return [];

  const sessionsOf = new Map<string, ClassSession[]>();
  electives.forEach((s) => sessionsOf.set(s.id, []));
  for (const sess of timetable || []) {
    if (!sess || sess.isExtra) continue;
    const list = sessionsOf.get(sess.subjectId);
    if (list) list.push(sess);
  }

  // Union–find over elective courses
  const parent = electives.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let i = 0; i < electives.length; i++) {
    for (let j = i + 1; j < electives.length; j++) {
      const li = norm(electives[i].electiveSlot);
      const lj = norm(electives[j].electiveSlot);
      if (li && li === lj) {
        union(i, j);
        continue;
      }
      const si = sessionsOf.get(electives[i].id) || [];
      const sj = sessionsOf.get(electives[j].id) || [];
      if (si.some((a) => sj.some((b) => overlaps(a, b)))) union(i, j);
    }
  }

  const buckets = new Map<number, Subject[]>();
  electives.forEach((s, i) => {
    const r = find(i);
    buckets.set(r, [...(buckets.get(r) || []), s]);
  });

  const raw = Array.from(buckets.values()).map((options) => {
    const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
    const seen = new Set<string>();
    const slots: ElectiveSlot[] = [];
    sorted.forEach((o) =>
      (sessionsOf.get(o.id) || []).forEach((s) => {
        const k = `${s.day}_${minutesOf(s.startTime)}`;
        if (seen.has(k)) return;
        seen.add(k);
        slots.push({ day: s.day, start: s.startTime, end: s.endTime });
      })
    );
    slots.sort(slotSort);
    // The name most options agree on (neatest spelling wins a tie)
    const counts = new Map<string, { label: string; n: number }>();
    sorted.forEach((o) => {
      const l = prettyLabel(o.electiveSlot);
      if (!l) return;
      const k = norm(l);
      const cur = counts.get(k);
      counts.set(k, { label: cur && neatness(cur.label) >= neatness(l) ? cur.label : l, n: (cur?.n || 0) + 1 });
    });
    const best = Array.from(counts.values()).sort((a, b) => b.n - a.n)[0];
    return { options: sorted, slots, named: best?.label || '' };
  });

  raw.sort((a, b) => (a.slots[0] && b.slots[0] ? slotSort(a.slots[0], b.slots[0]) : a.slots[0] ? -1 : b.slots[0] ? 1 : 0));

  const unnamedPicks = raw.filter((g) => !g.named && g.options.length > 1).length;
  let n = 0;
  return raw.map((g) => {
    const kind: ElectiveKind = g.options.length > 1 ? 'pick' : 'optional';
    let label = g.named;
    if (!label) {
      if (kind === 'optional') label = g.options[0].name;
      else label = unnamedPicks === 1 ? 'Elective' : `Elective ${ROMAN[n++] || n}`;
    }
    const key = g.named
      ? `l:${norm(g.named)}`
      : `o:${g.options
          .map((o) => optionKeys(o)[0] || o.id)
          .sort()
          .join('|')}`;
    return { key, label, named: !!g.named, kind, options: g.options, slots: g.slots };
  });
}

/** Where the student stands on each group: picked one, said none, or not decided yet */
export function resolveElectives(groups: ElectiveGroup[], choice: ElectiveChoice | null | undefined): ResolvedElectiveGroup[] {
  const ids = new Set(choice?.enrolledElectiveIds || []);
  const keys = new Set(choice?.electiveKeys || []);
  const skipped = new Set(choice?.electivesSkipped || []);
  const has = (o: Subject) => ids.has(o.id) || optionKeys(o).some((k) => keys.has(k));
  const declined = (o: Subject) => skipped.has(o.id) || optionKeys(o).some((k) => skipped.has(k));
  return groups.map((g) => {
    const picked = g.options.filter(has);
    if (picked.length === 1) return { ...g, status: 'chosen' as const, chosen: picked[0] };
    // Several picked (old "all on" default) or nothing decided yet: ask
    if (picked.length === 0 && g.options.every(declined)) return { ...g, status: 'none' as const, chosen: null };
    return { ...g, status: 'pending' as const, chosen: null };
  });
}

/** The profile fields to save after a student picks `optionId` in `group` (null = none of these) */
export function applyElectiveChoice(choice: ElectiveChoice | null | undefined, group: ElectiveGroup, optionId: string | null): Required<ElectiveChoice> {
  const groupIds = new Set(group.options.map((o) => o.id));
  const groupKeys = new Set(group.options.flatMap(optionKeys));
  const ids = (choice?.enrolledElectiveIds || []).filter((id) => !groupIds.has(id));
  const keys = (choice?.electiveKeys || []).filter((k) => !groupKeys.has(k));
  const skipped = (choice?.electivesSkipped || []).filter((k) => !groupKeys.has(k) && !groupIds.has(k));
  const picked = optionId ? group.options.find((o) => o.id === optionId) : undefined;
  if (picked) {
    ids.push(picked.id);
    keys.push(...optionKeys(picked));
  } else {
    group.options.forEach((o) => {
      const k = optionKeys(o);
      skipped.push(...(k.length ? k : [o.id]));
    });
  }
  return { enrolledElectiveIds: Array.from(new Set(ids)), electiveKeys: Array.from(new Set(keys)), electivesSkipped: Array.from(new Set(skipped)) };
}

export interface ElectiveLens {
  groups: ResolvedElectiveGroup[];
  /** Groups still waiting for the student's pick */
  pending: ResolvedElectiveGroup[];
  /** Non-electives, and the electives this student takes */
  isMine: (subjectId?: string | null) => boolean;
  /** Electives this student decided against (another option, or none) */
  isHidden: (subjectId?: string | null) => boolean;
  groupOf: (subjectId?: string | null) => ResolvedElectiveGroup | undefined;
}

export function electiveLens(subjects: Subject[], timetable: ClassSession[], choice: ElectiveChoice | null | undefined): ElectiveLens {
  const groups = resolveElectives(buildElectiveGroups(subjects, timetable), choice);
  const bySubject = new Map<string, ResolvedElectiveGroup>();
  groups.forEach((g) => g.options.forEach((o) => bySubject.set(o.id, g)));
  return {
    groups,
    pending: groups.filter((g) => g.status === 'pending'),
    groupOf: (id) => (id ? bySubject.get(id) : undefined),
    isMine: (id) => {
      const g = id ? bySubject.get(id) : undefined;
      return !g || (g.status === 'chosen' && g.chosen?.id === id);
    },
    isHidden: (id) => {
      const g = id ? bySubject.get(id) : undefined;
      return !!g && (g.status === 'none' || (g.status === 'chosen' && g.chosen?.id !== id));
    },
  };
}

/**
 * The student's own week: core classes, the electives they take (tagged with the slot's name),
 * and for each slot they haven't picked yet ONE placeholder per time, never overlapping copies.
 */
export function personalTimetable(timetable: ClassSession[], lens: ElectiveLens): PersonalSession[] {
  const out: PersonalSession[] = [];
  const placeholders: PersonalSession[] = [];
  for (const s of timetable || []) {
    if (!s) continue;
    const g = lens.groupOf(s.subjectId);
    if (!g) {
      out.push(s);
      continue;
    }
    if (g.status === 'chosen') {
      if (g.chosen?.id === s.subjectId) out.push(g.kind === 'pick' || g.named ? { ...s, electiveLabel: g.label } : s);
      continue;
    }
    if (g.status === 'none') continue;
    // Pending: one placeholder covers the slot (overlapping options merge into it)
    const same = placeholders.find((p) => p.electivePending!.groupKey === g.key && overlaps(p, s));
    if (same) {
      if (minutesOf(s.endTime) > minutesOf(same.endTime)) same.endTime = s.endTime;
      if (minutesOf(s.startTime) < minutesOf(same.startTime)) same.startTime = s.startTime;
      continue;
    }
    const ph: PersonalSession = {
      ...s,
      room: '',
      faculty: '',
      electivePending: {
        groupKey: g.key,
        label: g.label,
        kind: g.kind,
        options: g.options.map((o) => ({ id: o.id, name: o.name, ...(realCode(o.code) ? { code: realCode(o.code) } : {}) })),
      },
    };
    placeholders.push(ph);
    out.push(ph);
  }
  return out;
}

/** Classes the student surely attends (no placeholders): for the bag, attendance, reminders */
export const surelyMine = (sessions: PersonalSession[]) => sessions.filter((s) => !s.electivePending);

// ---------- For the pilot ----------

/**
 * Different courses that run at the same time but aren't marked electives. In a batch timetable
 * that almost always means "students pick one" (or lab groups). Suggest them to the pilot.
 */
export function findParallelClasses(subjects: Subject[], timetable: ClassSession[]): { subjects: Subject[]; slot: ElectiveSlot }[] {
  const byId = new Map((subjects || []).map((s) => [s.id, s]));
  const core = (timetable || []).filter((s) => s && !s.isExtra && !s.isPersonal && byId.get(s.subjectId) && !byId.get(s.subjectId)!.isElective);
  const found = new Map<string, { subjects: Subject[]; slot: ElectiveSlot }>();
  for (let i = 0; i < core.length; i++) {
    for (let j = i + 1; j < core.length; j++) {
      const a = core[i];
      const b = core[j];
      if (a.subjectId === b.subjectId || !overlaps(a, b)) continue;
      const pair = [a.subjectId, b.subjectId].sort();
      const k = pair.join('|');
      const cur = found.get(k) || { subjects: pair.map((id) => byId.get(id)!).filter(Boolean), slot: { day: a.day, start: a.startTime, end: a.endTime } };
      found.set(k, cur);
    }
  }
  // Merge pairs that share a course into clusters
  const clusters: { subjects: Subject[]; slot: ElectiveSlot }[] = [];
  for (const f of Array.from(found.values())) {
    const hit = clusters.find((c) => c.subjects.some((s) => f.subjects.some((x) => x.id === s.id)));
    if (hit) f.subjects.forEach((s) => !hit.subjects.some((x) => x.id === s.id) && hit.subjects.push(s));
    else clusters.push({ subjects: [...f.subjects], slot: f.slot });
  }
  return clusters;
}

/** "Machine Learning / Computer Vision" → ["Machine Learning", "Computer Vision"] */
export function splitCombinedName(name: string): string[] {
  const parts = (name || '')
    .split(/\s*\/\s*|\s+\bor\b\s+|\s*\|\s*|\s*;\s*/i)
    .map((p) => p.replace(/^(elective|open elective|oe|de|pe)\s*[-:–]?\s*[ivx\d]*\s*[:\-–]\s*/i, '').trim())
    .filter((p) => p.length > 1);
  return parts.length > 1 ? parts : [];
}

/** "Mon 10:00 · Wed 11:00" */
export const slotSummary = (slots: ElectiveSlot[], fmt: (t: string) => string = (t) => t, max = 3) => {
  const shown = slots.slice(0, max).map((s) => `${s.day.slice(0, 3)} ${fmt(s.start)}`);
  return slots.length > max ? `${shown.join(' · ')} +${slots.length - max}` : shown.join(' · ');
};

/** "Elective-I: ML / NLP" → "Elective I" (the slot name written before the course list) */
export function electivePrefix(name: string): string {
  const m = (name || '').match(/^\s*((?:open|department|program(?:me)?|professional|free)?\s*elective|oe|de|pe)\s*[-–]?\s*([ivx]+|\d+)?\s*[:\-–]\s*\S/i);
  if (!m) return '';
  return prettyLabel(`${m[1]} ${m[2] || ''}`.trim().toLowerCase());
}

/** What the pilot changed in the electives setup */
export interface ElectiveSetupPlan {
  /** By subject id: is it an elective, and which slot name (courses with the same name are one pick-one group) */
  marks: Record<string, { isElective: boolean; slot?: string }>;
  /** By subject id: split a combined course ("ML / NLP") into separate options with these names */
  splits?: Record<string, { names: string[]; slot?: string }>;
}

/**
 * Apply the pilot's setup to a timetable (pure; used for the live preview and for saving).
 * `colorFor` picks a colour for a new option made by a split.
 */
export function applyElectiveSetup(
  subjects: Subject[],
  timetable: ClassSession[],
  plan: ElectiveSetupPlan,
  colorFor: (name: string, used: string[], isLab?: boolean) => string = () => '#8067B5',
  /** Batch copy of the timetable: brings back elective classes this device pruned as clashes */
  batchTimetable: ClassSession[] = []
): { subjects: Subject[]; timetable: ClassSession[] } {
  let subs: Subject[] = subjects.map((s) => {
    const m = plan.marks[s.id];
    if (!m) return s;
    const slot = prettyLabel(m.slot);
    return { ...s, isElective: m.isElective, electiveSlot: m.isElective && slot ? slot : undefined };
  });
  let tt: ClassSession[] = timetable.map((sess) => {
    const m = plan.marks[sess.subjectId];
    return m ? { ...sess, isElective: m.isElective } : sess;
  });
  const markedOn = new Set(Object.keys(plan.marks).filter((id) => plan.marks[id].isElective));
  const have = new Set(tt.map((x) => x.id));
  (batchTimetable || []).forEach((b) => {
    if (b && markedOn.has(b.subjectId) && !have.has(b.id)) tt.push({ ...b, isElective: true });
  });

  Object.keys(plan.splits || {}).forEach((sid) => {
    const sp = plan.splits![sid];
    const base = subs.find((s) => s.id === sid);
    const names = (sp.names || []).map((n) => n.trim()).filter(Boolean);
    if (!base || names.length < 2) return;
    const parts = (v?: string) => (v || '').split('/').map((x) => x.trim()).filter(Boolean);
    const pick = (list: string[], i: number, fallback: string) => (list.length === names.length ? list[i] : fallback);
    const facs = parts(base.facultyName);
    const slot = prettyLabel(sp.slot || plan.marks[sid]?.slot || base.electiveSlot || electivePrefix(base.name));
    const used = subs.map((s) => s.color);
    const options: Subject[] = names.map((name, i) => {
      const color = i === 0 ? base.color : colorFor(name, used, base.isLab);
      used.push(color);
      return {
        ...base,
        id: `${base.id}_opt${i + 1}`,
        name,
        shortName: name.substring(0, 4).toUpperCase(),
        code: '',
        facultyName: pick(facs, i, base.facultyName),
        color,
        isCustomColor: false,
        isElective: true,
        electiveSlot: slot || undefined,
      };
    });
    const copies: ClassSession[] = tt
      .filter((x) => x.subjectId === sid)
      .flatMap((sess) =>
        options.map((o, i) => ({
          ...sess,
          id: `${sess.id}_opt${i + 1}`,
          subjectId: o.id,
          subjectName: o.name,
          subjectCode: '',
          faculty: pick(parts(sess.faculty), i, sess.faculty || ''),
          room: pick(parts(sess.room), i, sess.room),
          isElective: true,
        }))
      );
    subs = [...subs.filter((s) => s.id !== sid), ...options];
    tt = [...tt.filter((x) => x.subjectId !== sid), ...copies];
  });
  return { subjects: subs, timetable: tt };
}

/** The next free slot name: "Elective I", "Elective II", … */
export function nextSlotName(subjects: Subject[]): string {
  const taken = new Set(subjects.map((s) => norm(s.electiveSlot)).filter(Boolean));
  for (let i = 0; i < ROMAN.length; i++) {
    const l = `Elective ${ROMAN[i]}`;
    if (!taken.has(norm(l))) return l;
  }
  return `Elective ${taken.size + 1}`;
}
