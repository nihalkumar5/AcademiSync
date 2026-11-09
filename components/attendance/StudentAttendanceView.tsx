'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Illustration, IllustrationName } from '@/components/ui/Illustration';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from '@/components/ui/icons';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { formatTime12Hour } from '@/lib/timetableUtils';
import { useMyAttendance } from '@/lib/myAttendance';
import {
  MIN_PCT,
  Standing,
  StudentCourse,
  canSkip,
  matchCourses,
  mustAttend,
  pctOf,
  standingOf,
} from '@/lib/attendanceStudent';

// Student → Attendance. Everything here comes from what teachers mark in the app; the student
// never enters anything. Subjects whose teacher doesn't mark online simply say so.

const TONE: Record<Standing, { text: string; bar: string; soft: string }> = {
  safe: {
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  },
  edge: {
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-900 border-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
  },
  low: {
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    soft: 'bg-rose-50 text-rose-800 border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20',
  },
  none: {
    text: 'text-faint',
    bar: 'bg-surface-3',
    soft: 'bg-surface-2 text-fg-2 border-line-soft',
  },
};

const ORDER: Record<Standing, number> = { low: 0, edge: 1, safe: 2, none: 3 };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : word.endsWith('s') ? 'es' : 's'}`;
/** Whole percent, rounded down, so 74.6 never shows as a "safe looking" 75. */
const shownPct = (p: number) => (isNaN(p) ? '—' : String(Math.floor(p + 1e-9)));
const dateLabel = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const timeAgo = (at: number | null) => {
  if (!at) return '';
  const m = Math.round((Date.now() - at) / 60000);
  if (m < 1) return 'Updated just now';
  if (m < 60) return `Updated ${m} min ago`;
  return `Updated ${Math.round(m / 60)} h ago`;
};

const verdictFor = (a: number, t: number, min: number) => {
  const st = standingOf(a, t, min);
  if (st === 'none') {
    return { st, short: 'No classes marked yet', long: 'Your teacher marks attendance online. Your numbers show up after the first class is marked.' };
  }
  if (st === 'low') {
    const n = mustAttend(a, t, min);
    return { st, short: `Attend the next ${plural(n, 'class')}`, long: `Attend the next ${plural(n, 'class')} in a row to be safe again.` };
  }
  const k = canSkip(a, t, min);
  if (k === 0) return { st, short: "Don't skip the next class", long: "You're right at the line. Missing the next class would drop you below the minimum." };
  if (k === 1) return { st, short: 'You can skip 1 class', long: "You can skip 1 class and still be safe. After that, don't skip." };
  return { st, short: `You can skip ${k} classes`, long: `You can skip ${k} classes in a row and still be safe.` };
};
const VerdictIcon: React.FC<{ st: Standing; className?: string }> = ({ st, className }) =>
  st === 'safe' ? <CheckCircle2 className={className} /> : st === 'none' ? <Clock className={className} /> : <AlertTriangle className={className} />;

/** Straight bar with the minimum marked and labelled, so "above / below 75%" is obvious at a glance. */
const Bar: React.FC<{ pct: number; min: number; fill: string; dark?: boolean; tall?: boolean }> = ({ pct, min, fill, dark, tall }) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const w = isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="py-1" role="img" aria-label={isNaN(pct) ? 'No classes yet' : `${shownPct(pct)}% attended, ${min}% needed`}>
      <div className={clsx('relative', tall ? 'h-3' : 'h-2', dark ? 'bg-white/15' : 'bg-surface-3')}>
        <div className={clsx('absolute inset-y-0 left-0 transition-[width] duration-700 ease-out', fill)} style={{ width: `${shown ? w : 0}%` }} />
        <div className={clsx('absolute -top-1 -bottom-1 w-[2px]', dark ? 'bg-white' : 'bg-fg')} style={{ left: `calc(${min}% - 1px)` }} />
      </div>
    </div>
  );
};

const BAR_FILL: Record<Standing, string> = {
  safe: 'bg-emerald-500',
  edge: 'bg-amber-500',
  low: 'bg-rose-500',
  none: 'bg-transparent',
};
const NUM: Record<Standing, string> = {
  safe: 'text-emerald-600 dark:text-emerald-400',
  edge: 'text-amber-600 dark:text-amber-400',
  low: 'text-rose-600 dark:text-rose-400',
  none: 'text-faint',
};
/** "7% short" / "6% above" — the gap to the minimum, in plain words. */
const gapText = (pct: number, min: number) => {
  if (isNaN(pct)) return '';
  const d = Math.floor(pct + 1e-9) - min;
  return d < 0 ? `${-d}% short` : d === 0 ? 'Right on the line' : `${d}% above`;
};
const PILL: Record<Standing, string> = {
  safe: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  edge: 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300',
  low: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
  none: 'bg-surface-2 text-muted',
};

type TrackedRow = { kind: 'tracked'; id: string; name: string; accent: string; course: StudentCourse; standing: Standing; pct: number };
type OffRow = { kind: 'off' | 'not-on-list'; id: string; name: string; accent: string; teachers: string[] };

const SubjectCard: React.FC<{ row: TrackedRow; min: number; onOpen: () => void }> = ({ row, min, onOpen }) => {
  const { course } = row;
  const v = verdictFor(course.attended, course.total, min);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group w-full border border-line bg-surface px-4 pt-4 pb-3 text-left hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-semibold leading-snug text-fg">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.accent }} aria-hidden="true" />
              <span className="line-clamp-2">{row.name}</span>
            </p>
            <p className="mt-0.5 pl-4 text-[13px] text-muted truncate">
              {course.teachers.join(', ')}
              {course.total > 0 && <span className="tabular-nums"> · {course.attended} of {plural(course.total, 'class')}</span>}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={clsx('text-[28px] font-semibold leading-none tracking-tight tabular-nums', NUM[v.st])}>
              {shownPct(row.pct)}
              {course.total > 0 && <span className="text-[15px] font-medium">%</span>}
            </p>
            {course.total > 0 && <p className={clsx('mt-1 text-[11px] font-semibold tabular-nums', NUM[v.st])}>{gapText(row.pct, min)}</p>}
          </div>
        </div>
        {course.total > 0 ? (
          <div className="mt-4 pl-4">
            <Bar pct={row.pct} min={min} fill={BAR_FILL[v.st]} />
          </div>
        ) : (
          <div className="h-3" />
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-semibold', PILL[v.st])}>
            <VerdictIcon st={v.st} className="w-3.5 h-3.5 shrink-0" />
            {v.st === 'none' ? 'Waiting for the first class' : v.short}
          </span>
          <ChevronRight className="w-4 h-4 text-faint shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    </li>
  );
};

const WhatIf: React.FC<{ label: string; pct: number; min: number }> = ({ label, pct, min }) => (
  <div className="bg-surface-2 px-4 py-3">
    <p className="text-[12px] font-medium text-muted">{label}</p>
    <p className={clsx('mt-1.5 text-[24px] font-semibold leading-none tracking-tight tabular-nums', pct < min ? 'text-rose-600 dark:text-rose-400' : 'text-fg')}>
      {shownPct(pct)}
      <span className="text-[14px] font-medium ml-px">%</span>
    </p>
  </div>
);

const CourseSheet: React.FC<{ row: TrackedRow; isOpen: boolean; min: number; onClose: () => void }> = ({ row, isOpen, min, onClose }) => {
  const { attended: a, total: t, history } = row.course;
  const v = verdictFor(a, t, min);
  const missed = t - a;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={row.name} description={row.course.teachers.join(', ')} maxWidth="md" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <div>
          <div className="flex items-end justify-between gap-4">
            <p className={clsx('text-[56px] font-semibold leading-none tracking-[-0.04em] tabular-nums', NUM[v.st])}>
              {shownPct(row.pct)}
              {t > 0 && <span className="text-[24px] font-medium">%</span>}
            </p>
            <div className="text-right pb-1">
              <p className="text-[14px] font-semibold text-fg tabular-nums">{t > 0 ? `${a} of ${plural(t, 'class')}` : 'No classes yet'}</p>
              <p className="mt-0.5 text-[13px] text-muted tabular-nums">{t > 0 ? (missed === 0 ? 'Never missed' : `${missed} missed`) : 'Marked by your teacher'}</p>
            </div>
          </div>
          {t > 0 && <p className={clsx('mt-2 text-[13px] font-semibold', NUM[v.st])}>{gapText(row.pct, min)}</p>}
          {t > 0 && (
            <div className="mt-4">
              <Bar pct={row.pct} min={min} fill={BAR_FILL[v.st]} tall />
            </div>
          )}
        </div>

        <p className={clsx('flex items-start gap-2.5 px-4 py-3 text-[14px] leading-[20px] font-medium', PILL[v.st])}>
          <VerdictIcon st={v.st} className="w-[18px] h-[18px] mt-px shrink-0" />
          <span>{v.long}</span>
        </p>

        {t > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            <WhatIf label="Skip the next class" pct={pctOf(a, t + 1)} min={min} />
            <WhatIf label="Attend the next class" pct={pctOf(a + 1, t + 1)} min={min} />
          </div>
        )}

        {t > 0 && (
          <section>
            <h4 className="mb-2 text-[14px] font-semibold text-fg">Class history</h4>
            <ul className="border border-line overflow-hidden divide-y divide-line-soft">
              {history.map((h, i) => (
                <li key={`${h.date}_${h.startTime}_${i}`} className={clsx('flex items-center justify-between gap-3 px-4 py-2.5', h.mark === 'A' && 'bg-rose-50/70 dark:bg-rose-400/[0.06]')}>
                  <span className="text-[14px] text-fg min-w-0 truncate">
                    {dateLabel(h.date)}
                    {h.startTime && <span className="text-muted"> · {formatTime12Hour(h.startTime)}</span>}
                  </span>
                  {h.mark === 'A' ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-rose-600 dark:text-rose-400">
                      <X className="w-3.5 h-3.5" /> Absent
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Present
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[12px] leading-[17px] text-muted">Marked by your teacher in Intersemester. If something looks wrong, ask them to correct it.</p>
      </div>
    </Modal>
  );
};

const Skeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    <div className="h-[168px] bg-surface-2 animate-pulse" />
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-[96px] bg-surface-2 animate-pulse" />
    ))}
  </div>
);

const Notice: React.FC<{ icon: React.ReactNode; title: string; body: string; action?: React.ReactNode; art?: IllustrationName }> = ({ icon, title, body, action, art = 'attendance' }) => (
  <section className="border border-line bg-surface px-5 py-6 flex flex-col items-center text-center">
    <Illustration name={art} className="h-[120px] w-auto self-center" />
    <span className="sr-only">{icon}</span>
    <h3 className="mt-4 text-[18px] font-semibold text-fg tracking-tight">{title}</h3>
    <p className="mt-1.5 text-[14px] leading-[21px] text-muted max-w-md">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </section>
);

/** The dark summary card at the top. */
const Hero: React.FC<{ children: React.ReactNode; glow?: string }> = ({ children }) => (
  <section className="sheen-ink relative overflow-hidden bg-ink text-on-ink border border-ink p-5 sm:p-6">{children}</section>
);
const GLOW: Record<Standing, string> = { safe: '#10b981', edge: '#f59e0b', low: '#f43f5e', none: '#6366f1' };

export const StudentAttendanceView: React.FC = () => {
  const { user, profile, subjects, setActiveView } = useApp();
  const uid: string | null = user?.id || null;
  const { data, loading, error, at, reload } = useMyAttendance(uid);
  const [openId, setOpenId] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const min = data?.minPct || MIN_PCT;

  const { tracked, off } = useMemo(() => {
    const enrolled = (subjects || []).filter(
      (s) => s && (!s.isElective || profile?.enrolledElectiveIds === undefined || profile.enrolledElectiveIds.includes(s.id))
    );
    const courses = data?.courses || [];
    const { bySubject, leftovers } = matchCourses(enrolled, courses);
    const trackedRows: TrackedRow[] = [];
    const offRows: OffRow[] = [];
    const toTracked = (id: string, name: string, accent: string, c: StudentCourse): TrackedRow => ({
      kind: 'tracked',
      id,
      name,
      accent,
      course: c,
      standing: standingOf(c.attended, c.total, min),
      pct: pctOf(c.attended, c.total),
    });
    enrolled.forEach((s) => {
      const accent = getSubjectCardTheme({ subjectName: s.name, subjectCode: s.code, subjectColor: s.color, isLab: s.isLab }).accent;
      const c = bySubject.get(s.id);
      if (c && c.status === 'tracked') trackedRows.push(toTracked(s.id, s.name, accent, c));
      else offRows.push({ kind: c ? 'not-on-list' : 'off', id: s.id, name: s.name, accent, teachers: c?.teachers || [] });
    });
    // Records for a subject that isn't in your list (renamed, or added by the teacher) still count
    leftovers
      .filter((c) => c.status === 'tracked')
      .forEach((c) => trackedRows.push(toTracked(c.key, c.subjectName, getSubjectCardTheme({ subjectName: c.subjectName }).accent, c)));
    trackedRows.sort((a, b) => ORDER[a.standing] - ORDER[b.standing] || (a.pct || 0) - (b.pct || 0) || a.name.localeCompare(b.name));
    offRows.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'not-on-list' ? -1 : 1));
    return { tracked: trackedRows, off: offRows };
  }, [data, subjects, profile?.enrolledElectiveIds, min]);

  const counted = tracked.filter((r) => r.course.total > 0);
  const attended = counted.reduce((n, r) => n + r.course.attended, 0);
  const total = counted.reduce((n, r) => n + r.course.total, 0);
  const overall = pctOf(attended, total);
  const low = counted.filter((r) => r.standing === 'low');
  const edge = counted.filter((r) => r.standing === 'edge');
  const headline: { st: Standing; text: string; action?: string } = low.length
    ? low.length === 1
      ? { st: 'low', text: `${low[0].name} needs attention`, action: `Attend its next ${plural(mustAttend(low[0].course.attended, low[0].course.total, min), 'class')} to be safe again.` }
      : { st: 'low', text: `${low.length} subjects need attention`, action: 'Tap a subject below to see how many classes you need.' }
    : edge.length
      ? { st: 'edge', text: edge.length === 1 ? `${edge[0].name} is on the edge` : `${edge.length} subjects are on the edge`, action: "Skipping even one more class could take you below. Don't skip for now." }
      : { st: 'safe', text: counted.length === 1 ? `You're safe in ${counted[0].name}` : `You're safe in every subject`, action: 'Tap a subject to see how many classes you can skip.' };

  const open = tracked.find((r) => r.id === openId) || null;
  // Keep the last subject while the sheet animates closed
  const [sheetId, setSheetId] = useState<string | null>(null);
  useEffect(() => {
    if (openId) setSheetId(openId);
  }, [openId]);
  const sheetRow = open || tracked.find((r) => r.id === sheetId) || null;

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="page-title">Attendance</h2>
        <p className="text-[14px] text-muted mt-1.5">Marked by your teachers. Nothing for you to fill in.</p>
      </div>
      {uid && data && (
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh attendance"
          className="mt-1.5 shrink-0 w-10 h-10 inline-flex items-center justify-center border border-line bg-surface text-fg hover:border-line-strong transition-colors cursor-pointer disabled:cursor-default"
        >
          <RefreshCw className={clsx('w-[18px] h-[18px]', loading && 'animate-spin')} />
        </button>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (!uid) {
    body = (
      <SignInPanel
        title="Sign in to see your attendance"
        body="Your teachers' registers are linked to your account, so your numbers show up once you're signed in."
        perks={['Your % in every subject', 'How many classes you can still skip', 'Updated when your teacher marks']}
      />
    );
  } else if (loading && !data) {
    body = <Skeleton />;
  } else if (error && !data) {
    body = (
      <Notice
        art="error"
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Couldn't load your attendance"
        body="Check your connection and try again."
        action={
          <button type="button" onClick={reload} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        }
      />
    );
  } else if (data && !data.batchKey) {
    body = (
      <Notice
        art="setup"
        icon={<Users className="w-5 h-5" />}
        title="Join your class batch first"
        body="Teachers mark attendance for a class batch. Join yours from Profile with your batch code, and your attendance will show up here."
        action={
          <button type="button" onClick={() => setActiveView('settings')} className="btn btn-primary">
            Go to Profile
          </button>
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-f4">
        {counted.length > 0 ? (
          <Hero glow={GLOW[headline.st]}>
            <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-on-ink/60">
              <span className={clsx('w-2 h-2 rounded-full', headline.st === 'low' ? 'bg-rose-400' : headline.st === 'edge' ? 'bg-amber-400' : 'bg-emerald-400')} />
              {headline.st === 'low' ? 'Needs attention' : headline.st === 'edge' ? 'Be careful' : 'All good'}
            </p>
            <p className="mt-3 text-[24px] sm:text-[26px] font-semibold leading-[1.2] tracking-tight text-on-ink">{headline.text}</p>
            {headline.action && <p className="mt-2 text-[14px] leading-[20px] text-on-ink/70">{headline.action}</p>}
            <div className="mt-5 grid grid-cols-3 border border-on-ink/15 divide-x divide-on-ink/15">
              {(['low', 'edge', 'safe'] as Standing[]).map((st) => {
                const n = counted.filter((r) => r.standing === st).length;
                return (
                  <div key={st} className="px-3 py-3">
                    <p className={clsx('text-[24px] font-semibold leading-none tabular-nums', n === 0 ? 'text-on-ink/30' : st === 'low' ? 'text-rose-400 dark:text-rose-600' : st === 'edge' ? 'text-amber-400 dark:text-amber-600' : 'text-emerald-400 dark:text-emerald-600')}>{n}</p>
                    <p className="mt-1.5 text-[12px] font-medium text-on-ink/60">{st === 'low' ? 'Low' : st === 'edge' ? 'On the edge' : 'Safe'}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[13px] text-on-ink/55 tabular-nums">
              {attended} of {plural(total, 'class')} attended overall
            </p>
          </Hero>
        ) : (
          <section className="border border-line bg-surface px-5 pt-6 pb-6 flex flex-col items-center text-center">
            <Illustration name="attendance" className="h-[170px] w-auto max-w-[240px]" />
            <p className="mt-5 text-[19px] font-semibold leading-[1.25] tracking-tight text-fg">
              {tracked.length > 0 ? 'Online attendance is on' : 'No online attendance yet'}
            </p>
            <p className="mt-1.5 text-[14px] leading-[21px] text-muted max-w-[320px]">
              {tracked.length > 0
                ? 'Your numbers show up here after your teacher marks the first class.'
                : 'When your teachers mark attendance in Intersemester, your percentage and how many classes you can skip show up here on their own.'}
            </p>
          </section>
        )}

        {tracked.length > 0 && (
          <section aria-label="Subjects with online attendance">
            <div className="flex items-baseline justify-between gap-3 mb-3 px-1">
              <h3 className="text-[17px] font-semibold text-fg tracking-tight">Your subjects</h3>
              <span className="text-[12px] text-muted">{min}% needed in each</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {tracked.map((r) => (
                <SubjectCard key={r.id} row={r} min={min} onOpen={() => setOpenId(r.id)} />
              ))}
            </ul>
          </section>
        )}

        {off.some((r) => r.kind === 'not-on-list') && (
          <section aria-label="Not on the class list" className="border border-amber-200/80 bg-amber-50/60 dark:border-amber-400/20 dark:bg-amber-400/[0.06] p-4">
            {off
              .filter((r) => r.kind === 'not-on-list')
              .map((r) => (
                <div key={r.id} className="flex items-start gap-3 [&+&]:mt-3">
                  <AlertTriangle className="w-[18px] h-[18px] mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-fg">{r.name}</p>
                    <p className="mt-0.5 text-[13px] leading-[18px] text-fg-2">
                      {r.teachers[0] || 'Your teacher'} marks attendance online, but you&apos;re not on their list yet. Ask them to add you.
                    </p>
                  </div>
                </div>
              ))}
          </section>
        )}

        {off.some((r) => r.kind === 'off') && (
          <section aria-label="Subjects without online attendance" className="border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 flex items-center justify-center text-muted shrink-0 border border-line-soft">
                <Clock className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-fg">Not tracked online</h3>
                <p className="mt-0.5 text-[13px] leading-[18px] text-muted">Your teacher has not opted for online attendance in these subjects.</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {off
                .filter((r) => r.kind === 'off')
                .map((r) => (
                  <li key={r.id} className="inline-flex items-center gap-2 border border-line bg-surface pl-2.5 pr-3 py-1.5 text-[13px] font-medium text-fg-2 max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.accent }} aria-hidden="true" />
                    <span className="truncate">{r.name}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}
        <p className="flex items-start gap-2 px-1 text-[12px] leading-[17px] text-muted">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
          <span>
            Only you and your teachers can see your attendance.{at ? ` ${timeAgo(at)}.` : ''}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-3xl mx-auto w-full pb-f7">
      {header}
      {body}
      {sheetRow && <CourseSheet row={sheetRow} isOpen={!!open} min={min} onClose={() => setOpenId(null)} />}
    </div>
  );
};
