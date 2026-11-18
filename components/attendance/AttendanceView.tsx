'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { FacultyLinkedBatch } from '@/lib/types';
import { aggregateFacultyWeeklyTimetable, formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { getCurrentDayOfWeek, formatTime12Hour, timeToMinutes } from '@/lib/timetableUtils';
import {
  AttendanceSession,
  Mark,
  Roster,
  useRoster,
  useSessions,
  saveSession,
  deleteSession,
  sessionId,
  studentStats,
  downloadAttendanceReport,
  fetchBatchMembers,
  isAtRisk,
  MIN_LECTURES_FOR_FLAG,
  reloadAttendance,
  attendanceErrorText,
  byRoll,
  saveRoster,
} from '@/lib/attendance';
import type { LiveStray } from '@/lib/attendanceLive';
import { RosterSetup } from './RosterSetup';
import { TakeAttendance } from './TakeAttendance';
import { LiveCheckIn, LiveResult } from './LiveCheckIn';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { BarChart3, Plus, Check, Users, FileSpreadsheet, ChevronRight, AlertTriangle, Loader2, ClipboardCheck, Clock, MoreHorizontal, Search, QrCode as QrIcon } from '@/components/ui/icons';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dateLabel = (key: string) => {
  if (key === todayKey()) return 'Today';
  const d = new Date(`${key}T00:00:00`);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};
const pctText = (n: number) => (isNaN(n) ? '—' : `${Math.round(n)}%`);

interface TakeTarget {
  subjectName: string;
  date: string;
  startTime: string;
  endTime?: string;
}

/** After QR check-in: the review screen, prefilled from who scanned */
interface Review {
  target: TakeTarget;
  liveId: string;
  scanned: Set<string>;
  marks: Record<string, Mark>;
}

export const AttendanceView: React.FC = () => {
  const { profile, user, showToast } = useApp();
  const batches = profile.facultyLinkedBatches || [];
  const [batchKey, setBatchKey] = useState<string>(batches[0]?.batchKey || '');
  const batch: FacultyLinkedBatch | undefined = batches.find((b) => b.batchKey === batchKey) || batches[0];
  const facultyId = user?.id;

  useEffect(() => {
    if (!batchKey && batches[0]) setBatchKey(batches[0].batchKey);
  }, [batches.length]);

  const batchLabel = batch ? [formatFacultyBatchDegreeAndBranch(batch).degreeAndBranch, formatFacultyBatchDegreeAndBranch(batch).semText].filter(Boolean).join(' · ') : '';
  const { roster, loading: rosterLoading, error: rosterError } = useRoster(facultyId, batch?.batchKey);
  const sessions = useSessions(facultyId, batch?.batchKey, !!roster);

  // Today's lectures for this batch come straight from its shared timetable
  const [batchDoc, setBatchDoc] = useState<any>(null);
  useEffect(() => {
    if (!batch) return;
    return onSnapshot(doc(db, 'shared_timetables', batch.batchKey), (s) => setBatchDoc(s.exists() ? s.data() : null), () => setBatchDoc(null));
  }, [batch?.batchKey]);
  const todays = useMemo(() => {
    if (!batch || !batchDoc) return [];
    const week = aggregateFacultyWeeklyTimetable([batch], { [batch.batchKey]: batchDoc });
    return (week[getCurrentDayOfWeek()] || []).filter((x) => !x.isCancelled);
  }, [batch, batchDoc]);

  // People who joined the batch after the list was locked (not eligible until added)
  const [newcomers, setNewcomers] = useState(0);
  useEffect(() => {
    setNewcomers(0);
    if (!roster?.lockedAt || !batch) return;
    const keys = new Set(roster.students.map((s) => s.key));
    const dismissed = new Set(roster.dismissed || []);
    fetchBatchMembers(batch.batchKey)
      .then((list) => setNewcomers(list.filter((m) => !keys.has(m.key) && !dismissed.has(m.key)).length))
      .catch(() => {});
  }, [roster?.updatedAt, batch?.batchKey]);

  const [setupOpen, setSetupOpen] = useState(false);
  const [take, setTake] = useState<TakeTarget | null>(null);
  const [live, setLive] = useState<TakeTarget | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraSubject, setExtraSubject] = useState('');
  const [extraTime, setExtraTime] = useState('');
  const [tab, setTab] = useState<'lectures' | 'students'>('lectures');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [toDelete, setToDelete] = useState<AttendanceSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showAllLectures, setShowAllLectures] = useState(false);
  // Keep "Now / Next" current without a reload
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // "QR attendance" / "Mark by hand" from the Home live card land here with the lecture already picked
  const [pending, setPending] = useState<(TakeTarget & { batchKey: string; mode: 'qr' | 'hand' }) | null>(null);
  useEffect(() => {
    const onTake = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.batchKey) return;
      setBatchKey(d.batchKey);
      setPending({ batchKey: d.batchKey, subjectName: d.subjectName, startTime: d.startTime, endTime: d.endTime, date: todayKey(), mode: d.mode === 'qr' ? 'qr' : 'hand' });
    };
    window.addEventListener('attendance:take', onTake);
    return () => window.removeEventListener('attendance:take', onTake);
  }, []);
  useEffect(() => {
    if (!pending || rosterLoading || batch?.batchKey !== pending.batchKey) return;
    const { mode, batchKey: _b, ...target } = pending;
    if (roster) (mode === 'qr' ? setLive : setTake)(target);
    else if (!rosterError) setSetupOpen(true);
    setPending(null);
  }, [pending, rosterLoading, roster, rosterError, batch?.batchKey]);

  const subjects = batch?.selectedSubjectNames || [];
  const sortedStudents = useMemo(() => [...(roster?.students || [])].sort(byRoll), [roster]);
  const findSession = (t: TakeTarget) => sessions.find((s) => s.id === sessionId(t.date, t.startTime, t.subjectName));
  const existing = take ? findSession(take) : undefined;
  const reviewExisting = review ? findSession(review.target) : undefined;

  // QR check-in finished: who scanned is present; everyone else keeps what's saved, or absent
  const startReview = (target: TakeTarget, r: LiveResult) => {
    setLive(null);
    if (!roster) return;
    const keys = new Set(roster.students.map((s) => s.key));
    const scanned = new Set<string>();
    r.checkins.forEach((c) => keys.has(c.key) && scanned.add(c.key));
    r.strays.forEach((s) => keys.has(s.uid) && scanned.add(s.uid)); // added to the list while scanning
    const prev = findSession(target);
    const marks: Record<string, Mark> = {};
    roster.students.forEach((s) => (marks[s.key] = scanned.has(s.key) ? 'P' : prev?.marks?.[s.key] === 'P' ? 'P' : 'A'));
    setReview({ target, liveId: r.liveId, scanned, marks });
  };

  // Someone scanned who joined the batch after the list was locked: add them in one tap
  const addStray = async (st: LiveStray) => {
    if (!roster || roster.students.some((s) => s.key === st.uid)) return true;
    try {
      await saveRoster({
        ...roster,
        students: [...roster.students, { key: st.uid, uid: st.uid, name: st.name, roll: st.roll }],
        dismissed: (roster.dismissed || []).filter((k) => k !== st.uid),
      });
      showToast('Added to your class list', `${st.name}${st.roll ? ` · ${st.roll}` : ''}`, 'success');
      return true;
    } catch (err: any) {
      showToast("Couldn't add them", attendanceErrorText(err), 'error');
      return false;
    }
  };

  const saveTake = (marks: Record<string, Mark>) => (take ? saveFor(take, marks, existing) : Promise.resolve());
  const saveReview = (marks: Record<string, Mark>) => (review ? saveFor(review.target, marks, reviewExisting, review.liveId, review.scanned.size) : Promise.resolve());

  const saveFor = async (take: TakeTarget, marks: Record<string, Mark>, existing: AttendanceSession | undefined, qrLiveId?: string, scannedCount = 0) => {
    if (!facultyId || !batch || !roster) return;
    const vals = roster.students.map((s) => marks[s.key] || 'P');
    const absent = vals.filter((v) => v === 'A').length;
    const present = vals.length - absent;
    const now = new Date().toISOString();
    const s: AttendanceSession = {
      id: sessionId(take.date, take.startTime, take.subjectName),
      facultyId,
      batchKey: batch.batchKey,
      subjectName: take.subjectName,
      date: take.date,
      startTime: take.startTime,
      ...(take.endTime ? { endTime: take.endTime } : {}),
      marks: Object.fromEntries(roster.students.map((st) => [st.key, marks[st.key] || 'P'])),
      present,
      absent,
      total: roster.students.length,
      takenAt: existing?.takenAt || now,
      updatedAt: now,
      ...(qrLiveId ? { qr: { liveId: qrLiveId, scanned: scannedCount } } : {}),
    };
    try {
      const saved = await saveSession(facultyId, batch.batchKey, s, existing ? existing.version ?? 0 : null);
      showToast(existing ? 'Attendance updated' : 'Attendance saved', `${saved.present}/${saved.total} present · ${take.subjectName}`, 'success');
      setTake(null);
      setReview(null);
    } catch (err: any) {
      console.error('Save attendance failed:', err);
      showToast("Couldn't save attendance", attendanceErrorText(err), 'error');
      if (err?.code === 'conflict') {
        setTake(null);
        setReview(null);
      }
    }
  };

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    if (!batch) return;
    setExporting(true);
    try {
      await downloadAttendanceReport({ batchKey: batch.batchKey, subject: subjectFilter === 'all' ? undefined : subjectFilter });
      showToast('Report ready', 'Your Excel report is downloading.', 'success');
    } catch (err: any) {
      showToast("Couldn't create the report", attendanceErrorText(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  // ---------- Empty: no batches ----------
  if (!batches.length) {
    return (
      <div className="flex flex-col gap-f5 text-left max-w-4xl mx-auto w-full">
        <h2 className="page-title">Attendance</h2>
        <div className="flex flex-col items-center text-center px-6 py-10 border border-dashed border-line">
          <Users className="w-6 h-6 text-fg" />
          <p className="mt-f3 text-[17px] font-semibold text-fg">Link a batch first</p>
          <p className="mt-1 text-[14px] text-muted max-w-[300px]">Attendance works per batch. Connect one from the Batches page.</p>
        </div>
      </div>
    );
  }

  if (!facultyId) {
    return (
      <div className="flex flex-col gap-f5 text-left max-w-4xl mx-auto w-full">
        <h2 className="page-title">Attendance</h2>
        <SignInPanel
          title="Sign in to take attendance"
          body="Class lists and records are saved to your account, so they're safe and the same on every device."
          perks={['Mark a class in seconds', 'Students see their own numbers', 'Export reports any time']}
        />
      </div>
    );
  }

  const stats = studentStats(sortedStudents, sessions, subjectFilter === 'all' ? undefined : subjectFilter);
  const lowCount = stats.filter(isAtRisk).length;
  const sessionSubjects = Array.from(new Set(sessions.map((s) => s.subjectName)));
  const avgPct = sessions.length ? (sessions.reduce((n, s) => n + (s.total - s.absent), 0) / Math.max(1, sessions.reduce((n, s) => n + s.total, 0))) * 100 : NaN;

  // Today: the lecture to act on now goes in the big card; the rest are listed under it
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  // Same reading of times as the rest of the app ("02:00" in a timetable means 2 PM)
  const toMin = (t?: string) => (t ? timeToMinutes(t) : 0);
  const todayItems = todays.map((x) => {
    const t: TakeTarget = { subjectName: x.subjectName, date: todayKey(), startTime: x.session.startTime, endTime: x.session.endTime };
    const start = toMin(x.session.startTime);
    const end = x.session.endTime ? toMin(x.session.endTime) : start + 60;
    return { x, t, done: findSession(t), live: nowMin >= start && nowMin < end, over: nowMin >= end };
  });
  const focus = todayItems.find((i) => !i.done && !i.over) || todayItems.find((i) => !i.done) || null;
  const others = todayItems.filter((i) => i !== focus);
  const markedToday = todayItems.filter((i) => i.done).length;

  const q = query.trim().toLowerCase();
  const studentRows = [...stats]
    .filter((s) => !lowOnly || isAtRisk(s))
    .filter((s) => !q || s.student.name.toLowerCase().includes(q) || (s.student.roll || '').toLowerCase().includes(q))
    .sort((a, b) => (isNaN(a.pct) ? 101 : a.pct) - (isNaN(b.pct) ? 101 : b.pct) || byRoll(a.student, b.student));
  const visibleSessions = showAllLectures ? sessions : sessions.slice(0, 12);
  const grouped = visibleSessions.reduce<Record<string, AttendanceSession[]>>((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  const openExtra = () => {
    setExtraSubject(subjects[0] || '');
    const n = new Date();
    setExtraTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
    setExtraOpen(true);
  };

  const menuItem = 'flex items-center gap-3 w-full px-4 h-12 text-left text-[14px] font-medium text-fg hover:bg-surface-2 cursor-pointer disabled:opacity-40';

  return (
    <div className="flex flex-col gap-f5 text-left max-w-3xl mx-auto w-full pb-f7">
      {/* Header: title, batch, one menu for everything that isn't taking attendance */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="page-title">Attendance</h2>
          {batches.length === 1 && <p className="mt-1.5 text-[14px] text-muted truncate">{batchLabel}</p>}
        </div>
        {roster && (
          <div className="relative shrink-0 mt-1">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More"
              aria-expanded={menuOpen}
              className="w-11 h-11 inline-flex items-center justify-center border border-line bg-surface text-fg hover:border-line-strong cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-64 border border-line bg-surface shadow-xl py-1">
                  <button type="button" className={menuItem} onClick={() => { setMenuOpen(false); setSetupOpen(true); }}>
                    <Users className="w-4 h-4 text-muted" />
                    <span className="flex-1">Class list</span>
                    <span className="text-[13px] text-muted tabular-nums">{roster.students.length}</span>
                  </button>
                  <button type="button" className={menuItem} disabled={!sessions.length || exporting} onClick={() => { setMenuOpen(false); exportExcel(); }}>
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin text-muted" /> : <FileSpreadsheet className="w-4 h-4 text-muted" />}
                    <span className="flex-1">Excel report</span>
                  </button>
                  <Link href="/attendance" className={menuItem} onClick={() => setMenuOpen(false)}>
                    <BarChart3 className="w-4 h-4 text-muted" />
                    <span className="flex-1">Attendance center</span>
                    <ChevronRight className="w-4 h-4 text-faint" />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Batch switcher */}
      {batches.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-f4 px-f4 sm:mx-0 sm:px-0 -mt-f2">
          {batches.map((b) => {
            const on = b.batchKey === batch?.batchKey;
            const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(b);
            return (
              <button
                key={b.batchKey}
                type="button"
                onClick={() => setBatchKey(b.batchKey)}
                aria-pressed={on}
                className={`shrink-0 h-10 px-3.5 border text-[13px] font-semibold cursor-pointer transition-colors ${on ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg-2 hover:border-line-strong'}`}
              >
                {degreeAndBranch}
                {semText ? <span className="font-normal opacity-70"> · {semText}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {rosterLoading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <div className="h-[196px] bg-surface-2 animate-pulse" />
          <div className="h-[72px] bg-surface-2 animate-pulse" />
          <div className="h-[220px] bg-surface-2 animate-pulse" />
        </div>
      ) : rosterError ? (
        <div className="flex items-start gap-f3 p-f4 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-fg">Attendance couldn&apos;t load</p>
            <p className="mt-0.5 text-[14px] text-muted">
              {rosterError === 'unauthenticated' ? 'Your sign-in has expired. Sign out and sign in again.' : 'Check your connection and try again.'}
            </p>
            <button type="button" onClick={() => facultyId && batch && reloadAttendance(facultyId, batch.batchKey)} className="mt-f3 btn btn-primary">
              Try again
            </button>
          </div>
        </div>
      ) : !roster ? (
        /* First run for this batch */
        <section className="sheen-ink relative overflow-hidden bg-ink text-on-ink p-f5 sm:p-f6">
          <p className="text-[12px] font-semibold uppercase tracking-[1.4px] text-on-ink/60">One-time setup</p>
          <h3 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">Confirm your class list</h3>
          <p className="mt-2 text-[14px] leading-[21px] text-on-ink/70 max-w-md">
            Check who&apos;s in {batchLabel || 'this batch'} and lock the list. After that, students check themselves in with a QR, or you mark by hand.
          </p>
          <button type="button" onClick={() => setSetupOpen(true)} className="mt-f5 inline-flex items-center gap-2 h-12 px-5 bg-on-ink text-ink text-[15px] font-semibold hover:opacity-90 cursor-pointer">
            Review class list <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      ) : (
        <>
          {/* Only when something needs the teacher */}
          {newcomers > 0 && (
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="flex items-center gap-3 w-full px-f4 py-3 text-left border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 cursor-pointer"
            >
              <AlertTriangle className="w-[18px] h-[18px] shrink-0 text-amber-700 dark:text-amber-400" />
              <span className="flex-1 text-[14px] text-fg">
                <span className="font-semibold">{newcomers} new in the batch</span> <span className="text-muted">and not on your class list</span>
              </span>
              <span className="text-[13px] font-semibold text-fg">Review</span>
            </button>
          )}

          {/* The lecture to take now */}
          {focus ? (
            <section className="sheen-ink relative overflow-hidden bg-ink text-on-ink p-f5 sm:p-f6">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1.4px] text-on-ink/60">
                {focus.live ? (
                  <>
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full bg-[#5EE0C2] opacity-70 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-[#5EE0C2]" />
                    </span>
                    <span className="text-[#5EE0C2]">Now</span>
                  </>
                ) : focus.over ? (
                  'Not marked yet'
                ) : (
                  'Next'
                )}
                <span className="text-on-ink/40">·</span>
                <span className="tabular-nums">
                  {formatTime12Hour(focus.t.startTime)}
                  {focus.t.endTime ? ` – ${formatTime12Hour(focus.t.endTime)}` : ''}
                </span>
              </p>
              <h3 className="mt-2 text-[26px] sm:text-[30px] font-semibold leading-[1.15] tracking-tight">{focus.x.subjectName}</h3>
              <p className="mt-1.5 text-[14px] text-on-ink/60 tabular-nums">
                {roster.students.length} students{focus.x.session.room ? ` · ${focus.x.session.room}` : ''}
              </p>
              <div className="mt-f5 grid grid-cols-[1fr_auto] gap-2">
                <button type="button" onClick={() => setLive(focus.t)} className="h-12 inline-flex items-center justify-center gap-2 bg-on-ink text-ink text-[15px] font-semibold hover:opacity-90 cursor-pointer">
                  <QrIcon className="w-5 h-5" /> Start QR check-in
                </button>
                <button type="button" onClick={() => setTake(focus.t)} className="h-12 px-4 inline-flex items-center justify-center gap-2 border border-on-ink/25 text-on-ink text-[14px] font-semibold hover:bg-on-ink/10 cursor-pointer">
                  <ClipboardCheck className="w-4 h-4" /> By hand
                </button>
              </div>
            </section>
          ) : todayItems.length > 0 ? (
            <section className="flex items-center gap-f3 p-f4 border border-[#18A889]/35 bg-[#18A889]/[0.07]">
              <span className="w-10 h-10 shrink-0 rounded-full bg-[#18A889] text-white flex items-center justify-center">
                <Check className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-fg">Today is done</p>
                <p className="text-[13px] text-muted">All {todayItems.length} of today&apos;s lectures are marked.</p>
              </div>
            </section>
          ) : (
            <section className="flex items-center gap-f3 p-f4 border border-dashed border-line">
              <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-line-soft text-muted">
                <Clock className="w-[18px] h-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-fg">No lectures today</p>
                <p className="text-[13px] text-muted">Taking one that isn&apos;t on the timetable?</p>
              </div>
              <button type="button" onClick={openExtra} className="btn btn-secondary shrink-0">
                <Plus className="w-4 h-4" /> Add
              </button>
            </section>
          )}

          {/* The rest of today */}
          {todayItems.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between gap-3 mb-2 px-0.5">
                <h3 className="text-[13px] font-semibold uppercase tracking-[1.2px] text-muted">
                  Today <span className="tabular-nums normal-case tracking-normal font-medium">· {markedToday}/{todayItems.length} marked</span>
                </h3>
                <button type="button" onClick={openExtra} className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Extra lecture
                </button>
              </div>
              {others.length > 0 && (
                <ul className="border border-line bg-surface divide-y divide-line-soft">
                  {others.map(({ x, t, done, live: isLive }, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => (done ? setTake(t) : setLive(t))}
                        className="w-full flex items-center gap-f3 px-f4 py-3 text-left hover:bg-surface-2 cursor-pointer"
                      >
                        <span className="w-[68px] shrink-0 whitespace-nowrap text-[13px] font-semibold text-fg tabular-nums">{formatTime12Hour(t.startTime)}</span>
                        <span className="flex-1 min-w-0 text-[15px] font-medium text-fg truncate">{x.subjectName}</span>
                        {done ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            <Check className="w-4 h-4" /> {done.total - done.absent}/{done.total}
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-fg">
                            <QrIcon className="w-4 h-4" /> {isLive ? 'Take now' : 'Take'}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Three numbers */}
          {sessions.length > 0 && (
            <section className="grid grid-cols-3 border border-line bg-surface divide-x divide-line-soft">
              <div className="px-f3 sm:px-f4 py-f3">
                <p className={`text-[24px] font-semibold leading-none tabular-nums ${avgPct < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>{pctText(avgPct)}</p>
                <p className="mt-1.5 text-[12px] text-muted">Average</p>
              </div>
              <div className="px-f3 sm:px-f4 py-f3">
                <p className="text-[24px] font-semibold leading-none tabular-nums text-fg">{sessions.length}</p>
                <p className="mt-1.5 text-[12px] text-muted">{sessions.length === 1 ? 'Lecture' : 'Lectures'} marked</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab('students');
                  setLowOnly(true);
                }}
                disabled={!lowCount}
                className="px-f3 sm:px-f4 py-f3 text-left enabled:hover:bg-surface-2 enabled:cursor-pointer"
              >
                <p className={`text-[24px] font-semibold leading-none tabular-nums ${lowCount ? 'text-rose-600 dark:text-rose-400' : 'text-faint'}`}>{lowCount}</p>
                <p className="mt-1.5 text-[12px] text-muted inline-flex items-center gap-0.5">
                  Below 75%{lowCount > 0 && <ChevronRight className="w-3 h-3" />}
                </p>
              </button>
            </section>
          )}

          {/* Records */}
          <section>
            <div role="tablist" aria-label="Records" className="grid grid-cols-2 border border-line p-0.5 bg-surface">
              {(
                [
                  ['lectures', 'Lectures', sessions.length],
                  ['students', 'Students', roster.students.length],
                ] as const
              ).map(([id, label, n]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`h-10 text-[14px] font-semibold cursor-pointer transition-colors ${tab === id ? 'bg-ink text-on-ink' : 'text-muted hover:text-fg'}`}
                >
                  {label} <span className="font-normal opacity-70 tabular-nums">{n}</span>
                </button>
              ))}
            </div>

            {tab === 'lectures' ? (
              sessions.length === 0 ? (
                <p className="mt-f3 px-f4 py-f6 text-center text-[14px] text-muted border border-dashed border-line">Lectures you mark show up here.</p>
              ) : (
                <div className="mt-f4 flex flex-col gap-f4">
                  {Object.entries(grouped).map(([date, list]) => (
                    <div key={date}>
                      <p className="mb-2 px-0.5 text-[12px] font-semibold uppercase tracking-[1.2px] text-muted">{dateLabel(date)}</p>
                      <ul className="border border-line bg-surface divide-y divide-line-soft">
                        {list.map((s) => {
                          const pct = ((s.total - s.absent) / Math.max(s.total, 1)) * 100;
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => setTake({ subjectName: s.subjectName, date: s.date, startTime: s.startTime, endTime: s.endTime })}
                                className="w-full flex items-center gap-f3 px-f4 py-3 text-left hover:bg-surface-2 cursor-pointer"
                              >
                                <span className="w-[68px] shrink-0 whitespace-nowrap text-[13px] text-muted tabular-nums">{formatTime12Hour(s.startTime)}</span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[15px] font-medium text-fg truncate">{s.subjectName}</span>
                                  <span className="block text-[12px] text-muted tabular-nums">
                                    {s.absent ? `${s.absent} absent` : 'Everyone present'}
                                    {s.qr ? ' · QR' : ''}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right">
                                  <span className={`block text-[15px] font-semibold tabular-nums ${pct < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>{pctText(pct)}</span>
                                  <span className="block text-[11px] text-muted tabular-nums">
                                    {s.total - s.absent}/{s.total}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {sessions.length > visibleSessions.length && (
                    <button type="button" onClick={() => setShowAllLectures(true)} className="h-11 border border-line text-[14px] font-semibold text-fg hover:bg-surface-2 cursor-pointer">
                      Show all {sessions.length} lectures
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="mt-f4 flex flex-col gap-f3">
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center gap-2 h-11 px-3 border border-line bg-surface focus-within:border-line-strong">
                    <Search className="w-4 h-4 text-muted shrink-0" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Name or roll number"
                      className="flex-1 min-w-0 bg-transparent text-[15px] text-fg outline-none placeholder:text-faint"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLowOnly((v) => !v)}
                    aria-pressed={lowOnly}
                    className={`shrink-0 h-11 px-3 border text-[13px] font-semibold cursor-pointer transition-colors ${lowOnly ? 'bg-rose-600 text-white border-rose-600' : 'border-line text-fg hover:border-line-strong'}`}
                  >
                    Below 75%
                  </button>
                </div>
                {sessionSubjects.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {['all', ...sessionSubjects].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubjectFilter(sub)}
                        aria-pressed={subjectFilter === sub}
                        className={`shrink-0 h-9 px-3 border text-[13px] font-medium cursor-pointer ${subjectFilter === sub ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg-2'}`}
                      >
                        {sub === 'all' ? 'All subjects' : sub}
                      </button>
                    ))}
                  </div>
                )}
                {studentRows.length === 0 ? (
                  <p className="px-f4 py-f6 text-center text-[14px] text-muted border border-dashed border-line">
                    {lowOnly && !q ? 'Nobody is below 75%.' : 'No one matches.'}
                  </p>
                ) : (
                  <ul className="border border-line bg-surface divide-y divide-line-soft">
                    {studentRows.map(({ student, attended, total, pct }) => {
                      const low = isAtRisk({ pct, total });
                      return (
                        <li key={student.key} className="flex items-center gap-f3 px-f4 py-2.5">
                          <span className="w-[76px] shrink-0 font-mono text-[12px] font-semibold text-fg-2 truncate">{student.roll || '—'}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] text-fg truncate">{student.name}</span>
                            <span className="mt-1.5 relative block h-1 bg-surface-3">
                              <span className={`absolute inset-y-0 left-0 ${low ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${isNaN(pct) ? 0 : pct}%` }} />
                              <span className="absolute -top-0.5 -bottom-0.5 w-px bg-fg/50" style={{ left: '75%' }} />
                            </span>
                          </span>
                          <span className="shrink-0 w-[52px] text-right">
                            <span className={`block text-[15px] font-semibold tabular-nums ${low ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>{pctText(pct)}</span>
                            <span className="block text-[11px] text-muted tabular-nums">
                              {total < MIN_LECTURES_FOR_FLAG ? `${total} of ${MIN_LECTURES_FOR_FLAG}` : `${attended}/${total}`}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="px-0.5 text-[12px] text-muted">Flagged below 75% once a student has {MIN_LECTURES_FOR_FLAG} lectures.</p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Sheets */}
      {setupOpen && facultyId && batch && (
        <RosterSetup
          facultyId={facultyId}
          batchKey={batch.batchKey}
          batchLabel={batchLabel}
          roster={roster}
          teaches={{ ids: batch.selectedSubjectIds || [], names: batch.selectedSubjectNames || [] }}
          onClose={() => setSetupOpen(false)}
          onSaved={(r: Roster) => {
            setSetupOpen(false);
            showToast('Class list locked', `${r.students.length} students`, 'success');
          }}
        />
      )}

      {live && roster && batch && (
        <LiveCheckIn
          key={`live_${live.date}_${live.startTime}_${live.subjectName}`}
          batchKey={batch.batchKey}
          batchLabel={batchLabel}
          subjectName={live.subjectName}
          date={live.date}
          startTime={live.startTime}
          endTime={live.endTime}
          onCancel={() => setLive(null)}
          onDone={(r) => startReview(live, r)}
          onAddStray={addStray}
        />
      )}

      {review && roster && (
        <TakeAttendance
          key={`review_${review.liveId}`}
          students={sortedStudents}
          initialMarks={review.marks}
          scanned={review.scanned}
          unsaved
          saveLabel={reviewExisting ? 'Update' : 'Save'}
          title={review.target.subjectName}
          subtitle={`${batchLabel} · ${dateLabel(review.target.date)} · ${formatTime12Hour(review.target.startTime)}`}
          banner={
            <div className="flex items-start gap-f3 p-f3 border border-[#18A889]/35 bg-[#18A889]/[0.07]">
              <QrIcon className="w-5 h-5 shrink-0 mt-0.5 text-[#128A70] dark:text-[#5EE0C2]" />
              <div className="text-[14px] leading-[20px]">
                <p className="font-semibold text-fg">
                  {review.scanned.size} of {roster.students.length} checked in by QR
                </p>
                <p className="text-muted">Everyone else is marked absent. Tap anyone who&apos;s here without a phone, then save.</p>
              </div>
            </div>
          }
          onClose={() => setReview(null)}
          onSave={saveReview}
        />
      )}

      {take && roster && (
        <TakeAttendance
          key={`${take.date}_${take.startTime}_${take.subjectName}`}
          students={sortedStudents}
          initialMarks={existing?.marks || null}
          title={take.subjectName}
          subtitle={`${batchLabel} · ${dateLabel(take.date)} · ${formatTime12Hour(take.startTime)}`}
          onClose={() => setTake(null)}
          onSave={saveTake}
          onDelete={existing ? () => setToDelete(existing) : undefined}
        />
      )}

      <Modal isOpen={extraOpen} onClose={() => setExtraOpen(false)} title="Extra lecture">
        <div className="flex flex-col gap-f4">
          <div>
            <p className="text-[14px] font-medium text-fg">Subject</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(subjects.length ? subjects : ['Lecture']).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setExtraSubject(s)}
                  aria-pressed={extraSubject === s}
                  className={`h-11 px-3 border text-[14px] cursor-pointer ${extraSubject === s ? 'bg-ink text-on-ink border-[#111111]' : 'border-line text-fg'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[14px] font-medium text-fg">Start time</span>
            <input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)} className="mt-2 w-full h-12 px-3.5 bg-surface border border-line text-[15px] text-fg" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!extraSubject || !extraTime}
              onClick={() => {
                setExtraOpen(false);
                setTake({ subjectName: extraSubject || 'Lecture', date: todayKey(), startTime: extraTime });
              }}
              className="flex-1 h-12 border border-line text-fg text-[15px] font-semibold disabled:opacity-40 cursor-pointer"
            >
              Mark by hand
            </button>
            <button
              type="button"
              disabled={!extraSubject || !extraTime}
              onClick={() => {
                setExtraOpen(false);
                setLive({ subjectName: extraSubject || 'Lecture', date: todayKey(), startTime: extraTime });
              }}
              className="flex-1 h-12 bg-ink text-on-ink text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <QrIcon className="w-4 h-4" /> QR check-in
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete && facultyId && batch) {
            try {
              await deleteSession(facultyId, batch.batchKey, toDelete.id, toDelete.version ?? 0);
              setTake(null);
              showToast('Moved to Recently deleted', `${toDelete.subjectName} · ${dateLabel(toDelete.date)} — restore it from the Attendance center`, 'success');
            } catch (err: any) {
              showToast("Couldn't delete", attendanceErrorText(err), 'error');
            }
          }
          setToDelete(null);
        }}
        title="Delete this lecture's attendance?"
        description="It stops counting in every student's percentage and moves to Recently deleted in the Attendance center, where you can restore it."
        highlightText={toDelete ? `${toDelete.subjectName} · ${dateLabel(toDelete.date)} · ${formatTime12Hour(toDelete.startTime)}` : undefined}
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
      />
    </div>
  );
};
