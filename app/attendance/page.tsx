'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, History, Users, RefreshCw, AlertTriangle, ClipboardCheck, CheckCircle2, Lock, Loader2, Pencil, Trash2, FileSpreadsheet, ShieldCheck, RotateCcw } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { formatTime12Hour } from '@/lib/timetableUtils';
import {
  AttendanceSession,
  Mark,
  Roster,
  RosterStudent,
  byRoll,
  deleteSession,
  fetchAllAttendance,
  saveSession,
  sessionPct,
  fetchTrash,
  fetchAudit,
  restoreSession,
  DeletedSession,
  AuditEntry,
  studentStats,
  summarizeAttendance,
  attendanceErrorText,
  isAtRisk,
  MIN_LECTURES_FOR_FLAG,
} from '@/lib/attendance';
import { btn, surface, divider, muted, strong, SectionHead, Badge, StatTile, Segmented, SearchField, Empty, AttentionRow } from '@/components/admin/AdminUI';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { TakeAttendance } from '@/components/attendance/TakeAttendance';
import { ReportDialog } from '@/components/attendance/ReportDialog';

// Attendance Center: the faculty's counterpart of the admin Control Center.
// Same shell and vocabulary — overview first (what needs attention, four numbers, the trend),
// then the full record by lecture and by student. Colour only means "below 75%".

type Tab = 'overview' | 'history' | 'students';
const LOW = 75;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (key: string) => {
  if (key === todayKey()) return 'Today';
  const d = new Date(`${key}T00:00:00`);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};
const monthLabel = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const pctText = (n: number) => (isNaN(n) ? '—' : `${Math.round(n)}%`);
const pctTone = (n: number) => (!isNaN(n) && n < LOW ? 'text-rose-600 dark:text-rose-400' : strong);

// ---------- Trend: one bar per lecture, oldest → newest ----------
const TrendBars: React.FC<{ items: AttendanceSession[]; labelFor: (s: AttendanceSession) => string }> = ({ items, labelFor }) => {
  const [active, setActive] = useState<number | null>(null);
  const shown = active ?? items.length - 1;
  const cur = items[shown];
  return (
    <div>
      {/* Readout: the hovered/tapped lecture, else the latest */}
      <div className="flex items-baseline justify-between gap-3 mb-f3 min-h-[40px]">
        {cur && (
          <div className="min-w-0">
            <p className={`text-[24px] font-semibold tabular-nums leading-none ${pctTone(sessionPct(cur))}`}>{pctText(sessionPct(cur))}</p>
            <p className={`mt-1 text-[13px] truncate ${muted}`}>
              {cur.subjectName} · {labelFor(cur)} · {dayLabel(cur.date)} · {cur.total - cur.absent}/{cur.total} present
            </p>
          </div>
        )}
      </div>
      <div className="relative h-[144px]">
        {/* Recessive guides: 100, the 75% rule, 0 */}
        {[100, LOW, 0].map((v) => (
          <div key={v} className="absolute left-0 right-0 flex items-center gap-2" style={{ bottom: `${v}%`, transform: 'translateY(50%)' }}>
            <span className={`w-9 shrink-0 text-right text-[11px] tabular-nums ${v === LOW ? 'text-rose-600 dark:text-rose-400 font-semibold' : muted}`}>{v}%</span>
            <span className={`flex-1 h-px ${v === LOW ? 'border-t border-dashed border-rose-400/70' : 'bg-[#ECECEA] dark:bg-white/[0.06]'}`} />
          </div>
        ))}
        <div className="absolute inset-y-0 left-11 right-0 flex items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
          {items.map((s, i) => {
            const p = sessionPct(s);
            const low = !isNaN(p) && p < LOW;
            return (
              <button
                key={s.id + s.batchKey}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`${s.subjectName}, ${dayLabel(s.date)}: ${pctText(p)} present`}
                className="relative flex-1 max-w-[34px] h-full flex items-end cursor-pointer focus:outline-none"
              >
                <span
                  className={`block w-full rounded-t-[4px] transition-opacity ${low ? 'bg-rose-500' : 'bg-ink'} ${shown === i ? 'opacity-100' : 'opacity-60'}`}
                  style={{ height: `${Math.max(isNaN(p) ? 0 : p, 2)}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>
      {items.length > 1 && (
        <div className={`mt-f2 pl-11 flex justify-between text-[11px] ${muted}`}>
          <span>{dayLabel(items[0].date)}</span>
          <span>{dayLabel(items[items.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
};

export default function AttendanceCenterPage() {
  const router = useRouter();
  const { user, profile, isClerkLoaded, setActiveView, showToast } = useApp();
  const isFaculty = profile?.role === 'faculty';
  const [tab, setTab] = useState<Tab>('overview');
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAllAttendance();
      setRosters(data.rosters);
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err?.code || 'error');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (user?.id && isFaculty) load();
  }, [user?.id, isFaculty, load]);

  // ---------- Labels ----------
  const linked = profile?.facultyLinkedBatches || [];
  const batchName = (key: string) => {
    const b = linked.find((x) => x.batchKey === key);
    if (b) {
      const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(b);
      return [degreeAndBranch, semText].filter(Boolean).join(' · ');
    }
    return rosters.find((r) => r.batchKey === key)?.batchLabel || 'Batch';
  };
  const rosterFor = (key: string) => rosters.find((r) => r.batchKey === key);
  const studentName = (batchKey: string, key: string) => rosterFor(batchKey)?.students.find((s) => s.key === key);

  const summary = useMemo(() => summarizeAttendance(rosters, sessions), [rosters, sessions]);
  const unset = linked.filter((b) => !rosters.some((r) => r.batchKey === b.batchKey));

  // ---------- History filters ----------
  const [hBatch, setHBatch] = useState<string>('all');
  const [hSubject, setHSubject] = useState<string>('all');
  const hSessions = sessions.filter((s) => (hBatch === 'all' || s.batchKey === hBatch) && (hSubject === 'all' || s.subjectName === hSubject));
  const hSubjects = Array.from(new Set(sessions.filter((s) => hBatch === 'all' || s.batchKey === hBatch).map((s) => s.subjectName)));

  // ---------- Students ----------
  const [sBatch, setSBatch] = useState<string>('');
  const [sSubject, setSSubject] = useState<string>('all');
  const [sQuery, setSQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  useEffect(() => {
    if (!sBatch && rosters[0]) setSBatch(rosters[0].batchKey);
  }, [rosters, sBatch]);
  const sRoster = rosterFor(sBatch);
  const sSessions = sessions.filter((s) => s.batchKey === sBatch);
  const sSubjects = Array.from(new Set(sSessions.map((s) => s.subjectName)));
  const sStats = sRoster ? studentStats([...sRoster.students].sort(byRoll), sSessions, sSubject === 'all' ? undefined : sSubject) : [];
  const q = sQuery.trim().toLowerCase();
  const sVisible = sStats
    .filter((x) => (!lowOnly || isAtRisk(x)) && (!q || x.student.name.toLowerCase().includes(q) || x.student.roll.toLowerCase().includes(q)))
    .sort((a, b) => (isNaN(a.pct) ? 101 : a.pct) - (isNaN(b.pct) ? 101 : b.pct) || byRoll(a.student, b.student));

  // ---------- Detail sheets ----------
  const [openSession, setOpenSession] = useState<AttendanceSession | null>(null);
  const [editSession, setEditSession] = useState<AttendanceSession | null>(null);
  const [toDelete, setToDelete] = useState<AttendanceSession | null>(null);
  const [openStudent, setOpenStudent] = useState<{ student: RosterStudent; batchKey: string } | null>(null);

  // ---------- Report, change history, recently deleted ----------
  const [report, setReport] = useState<{ batch: string; subject: string } | null>(null);
  const [trail, setTrail] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    setTrail(null);
    if (!openSession) return;
    let alive = true;
    fetchAudit(openSession.batchKey, openSession.id)
      .then((items) => alive && setTrail(items))
      .catch(() => alive && setTrail([]));
    return () => {
      alive = false;
    };
  }, [openSession?.id, openSession?.batchKey]);
  const [trash, setTrash] = useState<DeletedSession[]>([]);
  const loadTrash = useCallback(() => {
    fetchTrash().then(setTrash).catch(() => {});
  }, []);
  useEffect(() => {
    if (tab === 'history' && user?.id && isFaculty) loadTrash();
  }, [tab, user?.id, isFaculty, loadTrash]);
  const restore = async (d: DeletedSession) => {
    if (!user?.id) return;
    try {
      const back = await restoreSession(user.id, d.batchKey, d.id);
      setSessions((list) => [...list.filter((x) => !(x.id === back.id && x.batchKey === back.batchKey)), back].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)));
      setTrash((list) => list.filter((x) => !(x.id === d.id && x.batchKey === d.batchKey)));
      showToast('Lecture restored', `${d.subjectName} · ${dayLabel(d.date)}`, 'success');
    } catch (err: any) {
      showToast("Couldn't restore", attendanceErrorText(err), 'error');
    }
  };
  const subjectsFor = useCallback(
    (bk: string) => Array.from(new Set(sessions.filter((s) => bk === 'all' || s.batchKey === bk).map((s) => s.subjectName))).sort(),
    [sessions]
  );

  const saveEdit = async (marks: Record<string, Mark>) => {
    const s = editSession;
    const roster = s && rosterFor(s.batchKey);
    if (!s || !roster || !user?.id) return;
    const full = Object.fromEntries(roster.students.map((st) => [st.key, marks[st.key] || 'P'])) as Record<string, Mark>;
    const absent = Object.values(full).filter((v) => v === 'A').length;
    const next: AttendanceSession = { ...s, marks: full, absent, present: roster.students.length - absent, total: roster.students.length, updatedAt: new Date().toISOString() };
    try {
      const saved = await saveSession(user.id, s.batchKey, next, s.version ?? 0);
      setSessions((list) => list.map((x) => (x.id === s.id && x.batchKey === s.batchKey ? saved : x)));
      setEditSession(null);
      showToast('Attendance updated', `${saved.present}/${saved.total} present · ${s.subjectName}`, 'success');
    } catch (err: any) {
      showToast("Couldn't save", attendanceErrorText(err), 'error');
      if (err?.code === 'conflict') {
        setEditSession(null);
        load();
      }
    }
  };

  const goTake = () => {
    setActiveView('attendance');
    router.push('/');
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  const facultyName = `${profile?.facultyTitle || 'Prof.'} ${(profile?.name || 'Faculty').split(' ').slice(-1)[0]}`;

  // ---------- Gates ----------
  const gate = (icon: React.ReactNode, title: string, body: string, action?: React.ReactNode) => (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
      <span className={`w-14 h-14 flex items-center justify-center border border-line ${strong}`}>{icon}</span>
      <h1 className={`mt-f4 text-[22px] font-semibold ${strong}`}>{title}</h1>
      <p className={`mt-1 text-[14px] max-w-sm ${muted}`}>{body}</p>
      {action && <div className="mt-f4">{action}</div>}
    </div>
  );
  if (!isClerkLoaded) return gate(<Loader2 className="w-6 h-6 animate-spin" />, 'Loading…', 'Checking your account.');
  if (!user)
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <SignInPanel
            title="Sign in to open the attendance center"
            body="Attendance records are saved to your faculty account, so they're safe and the same on every device."
            perks={['Every class and student in one place', 'Trends and students at risk', 'Export reports any time']}
          />
        </div>
      </div>
    );
  if (!isFaculty)
    return gate(<Lock className="w-6 h-6" />, 'For faculty only', 'The attendance center is available to faculty accounts.', <Link href="/" className={btn.secondary}><ArrowLeft className="w-4 h-4" /> Back to the app</Link>);

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number; alert?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History, count: sessions.length },
    { id: 'students', label: 'Students', icon: Users, count: summary.low.length, alert: summary.low.length > 0 },
  ];

  const sessionRow = (s: AttendanceSession, showBatch: boolean) => {
    const p = sessionPct(s);
    return (
      <button key={s.batchKey + s.id} type="button" onClick={() => setOpenSession(s)} className="w-full flex items-center gap-f3 px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer">
        <span className="flex-1 min-w-0">
          <span className={`block text-[15px] font-medium truncate ${strong}`}>{s.subjectName}</span>
          <span className={`block text-[13px] truncate ${muted}`}>
            {formatTime12Hour(s.startTime)}
            {showBatch ? ` · ${batchName(s.batchKey)}` : ''} · {s.absent ? `${s.absent} absent` : 'All present'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-[16px] font-semibold tabular-nums ${pctTone(p)}`}>{pctText(p)}</span>
          <span className={`block text-[11px] tabular-nums ${muted}`}>
            {s.total - s.absent}/{s.total}
          </span>
        </span>
      </button>
    );
  };

  // History grouped by month, then by day
  const byMonth = hSessions.reduce<Record<string, Record<string, AttendanceSession[]>>>((acc, s) => {
    const m = s.date.slice(0, 7);
    ((acc[m] ||= {})[s.date] ||= []).push(s);
    return acc;
  }, {});

  // Per batch and per subject breakdowns
  const batchRows = rosters.map((r) => {
    const list = sessions.filter((s) => s.batchKey === r.batchKey);
    const marked = list.reduce((a, s) => a + s.total, 0);
    const att = list.reduce((a, s) => a + s.total - s.absent, 0);
    return {
      key: r.batchKey,
      lectures: list.length,
      avg: marked ? (att / marked) * 100 : NaN,
      low: summary.low.filter((x) => x.batchKey === r.batchKey).length,
      last: list[0]?.date,
      size: r.students.length,
    };
  });
  const subjectRows = Object.values(
    sessions.reduce<Record<string, { subject: string; batchKey: string; lectures: number; marked: number; att: number }>>((acc, s) => {
      const k = `${s.batchKey}|${s.subjectName}`;
      const e = (acc[k] ||= { subject: s.subjectName, batchKey: s.batchKey, lectures: 0, marked: 0, att: 0 });
      e.lectures++;
      e.marked += s.total;
      e.att += s.total - s.absent;
      return acc;
    }, {})
  ).sort((a, b) => b.lectures - a.lectures);

  const trend = [...sessions].slice(0, 30).reverse();

  return (
    <div className="min-h-screen bg-canvas text-fg font-sans" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 34px), 55px)' }}>
      {/* ---------- Header + navigation (same shell as the Control Center) ---------- */}
      <header className="sheen sticky top-0 z-40 bg-[#FAFAF8]/90 dark:bg-[#0A0B0F]/80 backdrop-blur-xl border-b border-line" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 13px)' }}>
        <div className="max-w-6xl mx-auto px-f4 sm:px-f5">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className={btn.icon} aria-label="Back to the app">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className={`text-[17px] font-semibold leading-tight ${strong}`}>Attendance center</h1>
                <p className={`text-[12px] leading-tight truncate ${muted}`}>{facultyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { setLoading(true); load(); }} className={btn.icon} aria-label="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={() => setReport({ batch: 'all', subject: 'all' })} disabled={!sessions.length} className={`${btn.secondary} h-9 px-3`}>
                <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Report</span>
              </button>
              <button type="button" onClick={goTake} className={`${btn.primary} h-9 px-3`}>
                <ClipboardCheck className="w-4 h-4" /> <span className="hidden sm:inline">Take attendance</span><span className="sm:hidden">Take</span>
              </button>
            </div>
          </div>

          <nav aria-label="Attendance center sections" className="-mx-f4 sm:mx-0 px-f4 sm:px-0 flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative shrink-0 h-11 px-3 inline-flex items-center gap-2 text-[14px] font-medium transition-colors cursor-pointer ${on ? strong : `${muted} hover:text-fg`}`}
                >
                  <t.icon className="w-4 h-4" strokeWidth={1.9} />
                  {t.label}
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold tabular-nums ${t.alert ? 'bg-rose-500 text-white' : 'bg-surface-3 text-current'}`}>{t.count}</span>
                  )}
                  {on && <motion.span layoutId="attendance-tab" className="absolute left-2 right-2 -bottom-px h-[2px] bg-ink" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-f4 sm:px-f5 pt-f5 sm:pt-f6">
        {loading && !sessions.length && !rosters.length ? (
          <div className={`flex items-center justify-center gap-2 py-f7 text-[14px] ${muted}`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your records…
          </div>
        ) : error ? (
          <div className="flex items-start gap-f3 p-f4 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
            <div>
              <p className={`text-[15px] font-semibold ${strong}`}>Records couldn&apos;t load</p>
              <p className={`mt-0.5 text-[14px] ${muted}`}>{error === 'unauthenticated' ? 'Your sign-in has expired. Sign in again.' : 'Check your connection and try again.'}</p>
              <button type="button" onClick={() => { setLoading(true); load(); }} className={`${btn.primary} mt-f3`}>Try again</button>
            </div>
          </div>
        ) : (
          <>
            {/* ================= OVERVIEW ================= */}
            {tab === 'overview' && (
              <div className="flex flex-col gap-f5 sm:gap-f6">
                <div>
                  <p className={`text-[13px] font-semibold leading-none ${muted}`}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <h2 className={`mt-2 text-[30px] sm:text-[38px] font-semibold tracking-tight leading-tight ${strong}`}>
                    <span className={`font-normal ${muted}`}>{greeting},</span> {facultyName}
                  </h2>
                </div>

                <section>
                  <SectionHead title="Needs attention" />
                  {summary.low.length === 0 && unset.length === 0 ? (
                    <div className={`${surface} flex items-center gap-f3 px-f4 py-f4`}>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className={`text-[15px] font-medium ${strong}`}>All clear</p>
                        <p className={`text-[13px] ${muted}`}>Every class list is locked and no one is below {LOW}%.</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`${surface} ${divider}`}>
                      {summary.low.length > 0 && (
                        <AttentionRow
                          icon={AlertTriangle}
                          tone="red"
                          title={`${summary.low.length} ${summary.low.length === 1 ? 'student is' : 'students are'} below ${LOW}%`}
                          hint={summary.low.slice(0, 3).map((x) => `${x.student.name} ${pctText(x.pct)}`).join(', ')}
                          onClick={() => {
                            setSBatch(summary.low[0].batchKey);
                            setLowOnly(true);
                            setTab('students');
                          }}
                        />
                      )}
                      {unset.length > 0 && (
                        <AttentionRow
                          icon={Lock}
                          tone="amber"
                          title={`${unset.length} ${unset.length === 1 ? 'batch has' : 'batches have'} no class list yet`}
                          hint={unset.map((b) => batchName(b.batchKey)).join(', ')}
                          onClick={goTake}
                        />
                      )}
                    </div>
                  )}
                </section>

                <section>
                  <SectionHead title="At a glance" />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-f3">
                    <StatTile label="Lectures marked" value={summary.lectures} hint={summary.thisWeek ? `${summary.thisWeek} in the last 7 days` : 'None in the last 7 days'} onClick={() => setTab('history')} />
                    <StatTile label="Average attendance" value={pctText(summary.avg)} hint={`Across ${rosters.length} ${rosters.length === 1 ? 'batch' : 'batches'}`} />
                    <StatTile label={`Below ${LOW}%`} value={summary.low.length} hint={summary.low.length ? 'Tap to see who' : 'No one at risk'} onClick={() => { setLowOnly(true); setTab('students'); }} />
                    <StatTile label="Students tracked" value={summary.tracked} hint={`In ${rosters.length} locked ${rosters.length === 1 ? 'list' : 'lists'}`} onClick={() => setTab('students')} />
                  </div>
                </section>

                {sessions.length === 0 ? (
                  <Empty icon={ClipboardCheck} title="No lectures marked yet" body="Take attendance for a lecture and its record shows up here." action={<button type="button" onClick={goTake} className={btn.primary}>Take attendance</button>} />
                ) : (
                  <>
                    <section>
                      <SectionHead title="Attendance by lecture" meta={`Last ${trend.length}`} />
                      <div className={`${surface} p-f4`}>
                        <TrendBars items={trend} labelFor={(s) => batchName(s.batchKey)} />
                      </div>
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-f5">
                      <div>
                        <SectionHead title="By batch" />
                        <div className={`${surface} ${divider}`}>
                          {batchRows.map((b) => (
                            <button key={b.key} type="button" onClick={() => { setHBatch(b.key); setHSubject('all'); setTab('history'); }} className="w-full flex items-center gap-f3 px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer">
                              <span className="flex-1 min-w-0">
                                <span className={`block text-[15px] font-medium truncate ${strong}`}>{batchName(b.key)}</span>
                                <span className={`block text-[13px] ${muted}`}>
                                  {b.size} students · {b.lectures} {b.lectures === 1 ? 'lecture' : 'lectures'}
                                  {b.last ? ` · last ${dayLabel(b.last)}` : ''}
                                </span>
                                <span className="mt-f2 block h-1 bg-surface-3">
                                  <span className={`block h-full ${!isNaN(b.avg) && b.avg < LOW ? 'bg-rose-500' : 'bg-ink'}`} style={{ width: `${isNaN(b.avg) ? 0 : b.avg}%` }} />
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className={`block text-[18px] font-semibold tabular-nums ${pctTone(b.avg)}`}>{pctText(b.avg)}</span>
                                {b.low > 0 && <Badge tone="red">{b.low} below {LOW}%</Badge>}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <SectionHead title="By subject" />
                        <div className={`${surface} ${divider}`}>
                          {subjectRows.map((x) => {
                            const avg = x.marked ? (x.att / x.marked) * 100 : NaN;
                            return (
                              <button key={x.batchKey + x.subject} type="button" onClick={() => { setHBatch(x.batchKey); setHSubject(x.subject); setTab('history'); }} className="w-full flex items-center gap-f3 px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer">
                                <span className="flex-1 min-w-0">
                                  <span className={`block text-[15px] font-medium truncate ${strong}`}>{x.subject}</span>
                                  <span className={`block text-[13px] truncate ${muted}`}>
                                    {batchName(x.batchKey)} · {x.lectures} {x.lectures === 1 ? 'lecture' : 'lectures'}
                                  </span>
                                </span>
                                <span className={`shrink-0 text-[16px] font-semibold tabular-nums ${pctTone(avg)}`}>{pctText(avg)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    <section>
                      <SectionHead title="Recent lectures" action={<button type="button" onClick={() => setTab('history')} className={btn.ghost}>See all</button>} />
                      <div className={`${surface} ${divider}`}>{sessions.slice(0, 5).map((s) => sessionRow(s, true))}</div>
                    </section>
                  </>
                )}

                <p className={`flex items-start gap-f2 text-[12px] leading-relaxed ${muted}`}>
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  Private to you. Records are stored on the server only (no app can read them directly), encrypted by Google Cloud, and every save, edit, delete and download is logged.
                </p>
              </div>
            )}

            {/* ================= HISTORY ================= */}
            {tab === 'history' && (
              <div className="flex flex-col gap-f4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-f3 sm:justify-between">
                  <Segmented
                    ariaLabel="Batch"
                    value={hBatch}
                    onChange={(v) => { setHBatch(v); setHSubject('all'); }}
                    options={[{ id: 'all', label: 'All batches', count: sessions.length }, ...rosters.map((r) => ({ id: r.batchKey, label: batchName(r.batchKey), count: sessions.filter((s) => s.batchKey === r.batchKey).length }))]}
                  />
                  <button type="button" onClick={() => setReport({ batch: hBatch, subject: hSubject })} disabled={!hSessions.length} className={btn.secondary}>
                    <FileSpreadsheet className="w-4 h-4" /> Excel report
                  </button>
                </div>
                {hSubjects.length > 1 && (
                  <div className="flex gap-f2 overflow-x-auto no-scrollbar">
                    {['all', ...hSubjects].map((x) => (
                      <button
                        key={x}
                        type="button"
                        onClick={() => setHSubject(x)}
                        aria-pressed={hSubject === x}
                        className={`shrink-0 h-9 px-3 border text-[13px] font-medium cursor-pointer ${hSubject === x ? 'bg-ink text-on-ink border-line-strong' : `border-line ${strong}`}`}
                      >
                        {x === 'all' ? 'All subjects' : x}
                      </button>
                    ))}
                  </div>
                )}
                {hSessions.length === 0 ? (
                  <Empty icon={History} title="No lectures here yet" body="Lectures you mark show up here, newest first." />
                ) : (
                  Object.entries(byMonth).map(([month, days]) => {
                    const list = Object.values(days).flat();
                    const marked = list.reduce((a, s) => a + s.total, 0);
                    const avg = marked ? (list.reduce((a, s) => a + s.total - s.absent, 0) / marked) * 100 : NaN;
                    return (
                      <section key={month}>
                        <SectionHead title={monthLabel(`${month}-01`)} meta={`${list.length} ${list.length === 1 ? 'lecture' : 'lectures'} · ${pctText(avg)} average`} />
                        <div className="flex flex-col gap-f3">
                          {Object.entries(days).map(([day, items]) => (
                            <div key={day}>
                              <p className={`mb-f1 text-[12px] font-semibold uppercase tracking-[1.2px] ${muted}`}>{dayLabel(day)}</p>
                              <div className={`${surface} ${divider}`}>{items.map((s) => sessionRow(s, hBatch === 'all'))}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })
                )}
                {trash.length > 0 && (
                  <section className="mt-f4">
                    <SectionHead title="Recently deleted" meta={`${trash.length}`} />
                    <div className={`${surface} ${divider}`}>
                      {trash.map((d) => (
                        <div key={d.batchKey + d.id} className="flex items-center gap-f3 px-f4 py-f3">
                          <span className="flex-1 min-w-0">
                            <span className={`block text-[15px] font-medium truncate ${strong}`}>{d.subjectName}</span>
                            <span className={`block text-[13px] truncate ${muted}`}>
                              {dayLabel(d.date)} · {formatTime12Hour(d.startTime)} · {batchName(d.batchKey)} · deleted {new Date(d.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </span>
                          <button type="button" onClick={() => restore(d)} className={`${btn.secondary} h-9 px-3`}>
                            <RotateCcw className="w-4 h-4" /> Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ================= STUDENTS ================= */}
            {tab === 'students' && (
              <div className="flex flex-col gap-f4">
                {rosters.length === 0 ? (
                  <Empty icon={Users} title="No class lists yet" body="Lock a class list in Attendance to see each student's record here." action={<button type="button" onClick={goTake} className={btn.primary}>Set up attendance</button>} />
                ) : (
                  <>
                    <Segmented ariaLabel="Batch" value={sBatch} onChange={(v) => { setSBatch(v); setSSubject('all'); }} options={rosters.map((r) => ({ id: r.batchKey, label: batchName(r.batchKey), count: r.students.length }))} />
                    <div className="flex flex-col sm:flex-row gap-f3">
                      <SearchField value={sQuery} onChange={setSQuery} placeholder="Search name or roll number" className="flex-1" />
                      <button type="button" onClick={() => setLowOnly((v) => !v)} aria-pressed={lowOnly} className={`${lowOnly ? btn.primary : btn.secondary} h-11`}>
                        <AlertTriangle className="w-4 h-4" /> Below {LOW}% only
                      </button>
                    </div>
                    <p className={`-mt-f2 text-[12px] ${muted}`}>A student is flagged below {LOW}% only after {MIN_LECTURES_FOR_FLAG} lectures, so one early absence doesn&apos;t count as a warning.</p>
                    {sSubjects.length > 1 && (
                      <div className="flex gap-f2 overflow-x-auto no-scrollbar">
                        {['all', ...sSubjects].map((x) => (
                          <button
                            key={x}
                            type="button"
                            onClick={() => setSSubject(x)}
                            aria-pressed={sSubject === x}
                            className={`shrink-0 h-9 px-3 border text-[13px] font-medium cursor-pointer ${sSubject === x ? 'bg-ink text-on-ink border-line-strong' : `border-line ${strong}`}`}
                          >
                            {x === 'all' ? 'All subjects' : x}
                          </button>
                        ))}
                      </div>
                    )}
                    <SectionHead title={`${sVisible.length} ${sVisible.length === 1 ? 'student' : 'students'}`} meta={sSessions.length ? `${sSessions.filter((s) => sSubject === 'all' || s.subjectName === sSubject).length} lectures` : 'No lectures yet'} />
                    {sVisible.length === 0 ? (
                      <Empty icon={CheckCircle2} title={lowOnly ? `No one is below ${LOW}%` : 'No one matches'} />
                    ) : (
                      <div className={`${surface} ${divider}`}>
                        {sVisible.map(({ student, attended, total, pct }) => {
                          const low = isAtRisk({ pct, total });
                          return (
                            <button key={student.key} type="button" onClick={() => setOpenStudent({ student, batchKey: sBatch })} className="w-full flex items-center gap-f3 px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer">
                              <span className="flex-1 min-w-0">
                                <span className={`block text-[15px] font-medium truncate ${strong}`}>{student.name}</span>
                                <span className={`block font-mono text-[12px] ${muted}`}>{student.roll || 'No roll'}</span>
                                <span className="mt-f2 block h-1 bg-surface-3">
                                  <span className={`block h-full ${low ? 'bg-rose-500' : 'bg-ink'}`} style={{ width: `${isNaN(pct) ? 0 : pct}%` }} />
                                </span>
                              </span>
                              <span className="shrink-0 w-[64px] text-right">
                                <span className={`block text-[16px] font-semibold tabular-nums ${low ? 'text-rose-600 dark:text-rose-400' : strong}`}>{pctText(pct)}</span>
                                <span className={`block text-[11px] tabular-nums ${muted}`}>
                                  {total < MIN_LECTURES_FOR_FLAG ? `${total}/${MIN_LECTURES_FOR_FLAG} lectures` : `${attended}/${total}`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ---------- One lecture ---------- */}
      <Modal
        isOpen={!!openSession}
        onClose={() => setOpenSession(null)}
        title={openSession?.subjectName || ''}
        description={openSession ? `${batchName(openSession.batchKey)} · ${dayLabel(openSession.date)} · ${formatTime12Hour(openSession.startTime)}` : ''}
        maxWidth="lg"
      >
        {openSession && (
          <div className="flex flex-col gap-f4">
            <div className="grid grid-cols-3 border border-line divide-x divide-line-soft">
              {[
                ['Present', openSession.total - openSession.absent, 'text-emerald-700 dark:text-emerald-400'],
                ['Absent', openSession.absent, 'text-rose-600 dark:text-rose-400'],
                ['Attendance', pctText(sessionPct(openSession)), strong],
              ].map(([k, v, tone]) => (
                <div key={k as string} className="px-f3 py-f3">
                  <p className={`text-[12px] ${muted}`}>{k}</p>
                  <p className={`mt-1 text-[22px] font-semibold tabular-nums ${tone}`}>{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className={`mb-f2 text-[13px] font-semibold ${strong}`}>Absent</p>
              {openSession.absent === 0 ? (
                <p className={`text-[14px] ${muted}`}>Everyone was present.</p>
              ) : (
                <ul className={`${surface} ${divider} max-h-[40vh] overflow-y-auto`}>
                  {Object.entries(openSession.marks)
                    .filter(([, m]) => m === 'A')
                    .map(([k]) => ({ k, st: studentName(openSession.batchKey, k) }))
                    .sort((a, b) => (a.st && b.st ? byRoll(a.st, b.st) : 0))
                    .map(({ k, st }) => (
                      <li key={k} className="flex items-center gap-f3 px-f3 py-f2">
                        <span className={`w-[84px] shrink-0 font-mono text-[13px] font-semibold ${strong}`}>{st?.roll || '—'}</span>
                        <span className={`flex-1 min-w-0 truncate text-[14px] ${strong}`}>{st?.name || 'Removed from list'}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div>
              <p className={`mb-f2 text-[13px] font-semibold ${strong}`}>Change history</p>
              {trail === null ? (
                <p className={`flex items-center gap-2 text-[13px] ${muted}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </p>
              ) : trail.length === 0 ? (
                <p className={`text-[13px] ${muted}`}>Marked {openSession.takenAt ? new Date(openSession.takenAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}. No edits since.</p>
              ) : (
                <ol className={`${surface} ${divider} max-h-[30vh] overflow-y-auto`}>
                  {trail.map((e) => (
                    <li key={e.id || e.ts} className="px-f3 py-f2">
                      <p className={`text-[13px] ${strong}`}>{e.summary}</p>
                      {e.changes && e.changes.length > 0 && (
                        <p className={`mt-0.5 text-[12px] ${muted}`}>
                          {e.changes.slice(0, 8).map((c) => `${c.roll || c.name}: ${c.from ? `${c.from}→` : ''}${c.to}`).join(' · ')}
                          {e.changes.length > 8 ? ` · +${e.changes.length - 8} more` : ''}
                        </p>
                      )}
                      <p className={`mt-0.5 text-[11px] ${muted}`}>
                        {new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {e.byEmail ? ` · ${e.byEmail}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="flex gap-f2">
              <button
                type="button"
                onClick={() => {
                  setEditSession(openSession);
                  setOpenSession(null);
                }}
                disabled={!rosterFor(openSession.batchKey)}
                className={`${btn.primary} flex-1`}
              >
                <Pencil className="w-4 h-4" /> Edit marks
              </button>
              <button type="button" onClick={() => setToDelete(openSession)} className={btn.danger} aria-label="Delete this lecture's record">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- One student ---------- */}
      <Modal isOpen={!!openStudent} onClose={() => setOpenStudent(null)} title={openStudent?.student.name || ''} description={openStudent ? `${openStudent.student.roll || 'No roll'} · ${batchName(openStudent.batchKey)}` : ''} maxWidth="lg">
        {openStudent &&
          (() => {
            const list = sessions.filter((s) => s.batchKey === openStudent.batchKey && s.marks[openStudent.student.key]);
            const overall = studentStats([openStudent.student], list)[0];
            const subjects = Array.from(new Set(list.map((s) => s.subjectName))).map((sub) => ({ sub, st: studentStats([openStudent.student], list, sub)[0] }));
            return (
              <div className="flex flex-col gap-f4">
                <div className="flex items-end justify-between gap-f3">
                  <div>
                    <p className={`text-[12px] ${muted}`}>Overall</p>
                    <p className={`text-[34px] font-semibold tabular-nums leading-none ${isAtRisk(overall) ? 'text-rose-600 dark:text-rose-400' : strong}`}>{pctText(overall.pct)}</p>
                    {overall.total < MIN_LECTURES_FOR_FLAG && <p className={`mt-1 text-[12px] ${muted}`}>The {LOW}% check starts after {MIN_LECTURES_FOR_FLAG} lectures</p>}
                  </div>
                  <p className={`text-[14px] tabular-nums ${muted}`}>
                    {overall.attended} of {overall.total} lectures
                  </p>
                </div>
                {subjects.length > 1 && (
                  <div className={`${surface} ${divider}`}>
                    {subjects.map(({ sub, st }) => (
                      <div key={sub} className="flex items-center gap-f3 px-f3 py-f2">
                        <span className={`flex-1 min-w-0 truncate text-[14px] ${strong}`}>{sub}</span>
                        <span className={`text-[12px] tabular-nums ${muted}`}>
                          {st.attended}/{st.total}
                        </span>
                        <span className={`w-12 text-right text-[14px] font-semibold tabular-nums ${isAtRisk(st) ? 'text-rose-600 dark:text-rose-400' : strong}`}>{pctText(st.pct)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p className={`mb-f2 text-[13px] font-semibold ${strong}`}>Every lecture</p>
                  {list.length === 0 ? (
                    <p className={`text-[14px] ${muted}`}>No lectures marked yet.</p>
                  ) : (
                    <ul className={`${surface} ${divider} max-h-[40vh] overflow-y-auto`}>
                      {list.map((s) => {
                        const absent = (s.marks[openStudent.student.key] as string) === 'A';
                        return (
                          <li key={s.id} className="flex items-center gap-f3 px-f3 py-f2">
                            <span className={`w-[92px] shrink-0 text-[13px] ${muted}`}>{dayLabel(s.date)}</span>
                            <span className={`flex-1 min-w-0 truncate text-[14px] ${strong}`}>{s.subjectName}</span>
                            <span className={`shrink-0 w-8 h-7 inline-flex items-center justify-center text-[13px] font-semibold ${absent ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>{absent ? 'A' : 'P'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>

      {editSession && rosterFor(editSession.batchKey) && (
        <TakeAttendance
          key={editSession.batchKey + editSession.id}
          students={[...rosterFor(editSession.batchKey)!.students].sort(byRoll)}
          initialMarks={editSession.marks}
          title={editSession.subjectName}
          subtitle={`${batchName(editSession.batchKey)} · ${dayLabel(editSession.date)} · ${formatTime12Hour(editSession.startTime)}`}
          onClose={() => setEditSession(null)}
          onSave={saveEdit}
          onDelete={() => setToDelete(editSession)}
        />
      )}

      <ReportDialog
        isOpen={!!report}
        onClose={() => setReport(null)}
        batches={rosters.map((r) => ({ key: r.batchKey, label: batchName(r.batchKey) }))}
        subjectsFor={subjectsFor}
        initialBatch={report?.batch}
        initialSubject={report?.subject}
        onDone={() => showToast('Report ready', 'Your Excel report is downloading.', 'success')}
      />

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          const s = toDelete;
          if (s && user?.id) {
            try {
              await deleteSession(user.id, s.batchKey, s.id, s.version ?? 0);
              setSessions((list) => list.filter((x) => !(x.id === s.id && x.batchKey === s.batchKey)));
              setOpenSession(null);
              setEditSession(null);
              loadTrash();
              showToast('Moved to Recently deleted', `${s.subjectName} · ${dayLabel(s.date)} — you can restore it from History`, 'success');
            } catch (err: any) {
              showToast("Couldn't delete", attendanceErrorText(err), 'error');
              if (err?.code === 'conflict' || err?.code === 'not-found') load();
            }
          }
          setToDelete(null);
        }}
        title="Delete this lecture's attendance?"
        description="It stops counting in every student's percentage and moves to Recently deleted, where you can restore it."
        highlightText={toDelete ? `${toDelete.subjectName} · ${dayLabel(toDelete.date)} · ${formatTime12Hour(toDelete.startTime)}` : undefined}
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
      />
    </div>
  );
}
