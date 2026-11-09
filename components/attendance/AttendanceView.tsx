'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { FacultyLinkedBatch } from '@/lib/types';
import { aggregateFacultyWeeklyTimetable, formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { getCurrentDayOfWeek, formatTime12Hour } from '@/lib/timetableUtils';
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
} from '@/lib/attendance';
import { RosterSetup } from './RosterSetup';
import { TakeAttendance } from './TakeAttendance';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { BarChart3, Lock, Plus, Check, Users, FileSpreadsheet, ChevronRight, AlertTriangle, Loader2, ClipboardCheck } from '@/components/ui/icons';

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
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraSubject, setExtraSubject] = useState('');
  const [extraTime, setExtraTime] = useState('');
  const [tab, setTab] = useState<'lectures' | 'students'>('lectures');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [toDelete, setToDelete] = useState<AttendanceSession | null>(null);

  // "Take attendance" from the Home live card lands here with the lecture already picked
  const [pending, setPending] = useState<(TakeTarget & { batchKey: string }) | null>(null);
  useEffect(() => {
    const onTake = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.batchKey) return;
      setBatchKey(d.batchKey);
      setPending({ batchKey: d.batchKey, subjectName: d.subjectName, startTime: d.startTime, endTime: d.endTime, date: todayKey() });
    };
    window.addEventListener('attendance:take', onTake);
    return () => window.removeEventListener('attendance:take', onTake);
  }, []);
  useEffect(() => {
    if (!pending || rosterLoading || batch?.batchKey !== pending.batchKey) return;
    if (roster) setTake(pending);
    else if (!rosterError) setSetupOpen(true);
    setPending(null);
  }, [pending, rosterLoading, roster, rosterError, batch?.batchKey]);

  const subjects = batch?.selectedSubjectNames || [];
  const sortedStudents = useMemo(() => [...(roster?.students || [])].sort(byRoll), [roster]);
  const findSession = (t: TakeTarget) => sessions.find((s) => s.id === sessionId(t.date, t.startTime, t.subjectName));
  const existing = take ? findSession(take) : undefined;

  const saveTake = async (marks: Record<string, Mark>) => {
    if (!take || !facultyId || !batch || !roster) return;
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
    };
    try {
      const saved = await saveSession(facultyId, batch.batchKey, s, existing ? existing.version ?? 0 : null);
      showToast(existing ? 'Attendance updated' : 'Attendance saved', `${saved.present}/${saved.total} present · ${take.subjectName}`, 'success');
      setTake(null);
    } catch (err: any) {
      console.error('Save attendance failed:', err);
      showToast("Couldn't save attendance", attendanceErrorText(err), 'error');
      if (err?.code === 'conflict') setTake(null);
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
  const grouped = sessions.reduce<Record<string, AttendanceSession[]>>((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-4xl mx-auto w-full pb-f7">
      {/* Header */}
      <div>
        <h2 className="page-title">
          Attendance,
          <br />
          Roll call
        </h2>
        <div className="flex items-center gap-3 mt-5">
          <span className="tag bg-surface">
            {todays.length} {todays.length === 1 ? 'lecture' : 'lectures'} today
          </span>
          <Link href="/attendance" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg hover:underline underline-offset-4">
            <BarChart3 className="w-4 h-4" /> Attendance center
          </Link>
        </div>
        <p className="text-[14px] text-muted leading-[20px] mt-4 max-w-md">Confirm each class list once, then mark a lecture in seconds.</p>
      </div>

      {/* Batch picker */}
      {batches.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-f4 px-f4 sm:mx-0 sm:px-0">
          {batches.map((b) => {
            const on = b.batchKey === batch?.batchKey;
            const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(b);
            return (
              <button
                key={b.batchKey}
                type="button"
                onClick={() => setBatchKey(b.batchKey)}
                aria-pressed={on}
                className={`shrink-0 h-11 px-3.5 border text-[14px] font-semibold cursor-pointer ${
                  on ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg'
                }`}
              >
                {degreeAndBranch}
                {semText ? <span className="font-normal opacity-70"> · {semText}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {rosterLoading ? (
        <div className="flex items-center justify-center gap-2 py-f6 text-[14px] text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : rosterError ? (
        <div className="flex items-start gap-f3 p-f4 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-fg">Attendance couldn&apos;t load</p>
            <p className="mt-0.5 text-[14px] text-muted">
              {rosterError === 'unauthenticated' ? 'Your sign-in has expired. Sign out and sign in again.' : 'Check your connection and try again.'}
            </p>
            <button
              type="button"
              onClick={() => facultyId && batch && reloadAttendance(facultyId, batch.batchKey)}
              className="mt-f3 h-11 px-f4 bg-ink text-on-ink text-[14px] font-semibold cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      ) : !roster ? (
        /* First run for this batch: two clear steps */
        <section className="sheen-ink relative overflow-hidden bg-[#111111] dark:bg-[#15171D] dark:border dark:border-white/[0.08] text-white p-f4 sm:p-f5">
          <p className="text-[12px] font-semibold uppercase tracking-[1.4px] text-white/60">{batchLabel}</p>
          <h3 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">Set up attendance</h3>
          <ol className="mt-f4 flex flex-col gap-f3">
            {[
              ['Confirm the class list', 'See everyone who joined the batch, untick anyone who shouldn’t be there, then lock it.'],
              ['Mark each lecture', 'Everyone starts present. Tap only the absentees, or type their roll numbers.'],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-f3">
                <span className="w-7 h-7 shrink-0 flex items-center justify-center border border-white/25 text-[13px] font-semibold">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-medium">{t}</span>
                  <span className="block text-[13px] text-white/60">{b}</span>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setSetupOpen(true)} className="mt-f5 inline-flex items-center gap-2 h-11 px-5 bg-white text-[#111111] text-[14px] font-semibold hover:opacity-90 cursor-pointer">
            Review class list
          </button>
          <p className="mt-f3 font-cursive text-[20px] font-semibold text-white/80 -rotate-1">Only once per batch ✌</p>
        </section>
      ) : (
        <>
          {/* Locked class list */}
          <section className="flex items-center gap-f3 p-f4 border border-line bg-surface">
            <span className="w-10 h-10 shrink-0 flex items-center justify-center bg-ink text-on-ink">
              <Lock className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-fg">Class list · {roster.students.length}</p>
              <p className="text-[13px] text-muted truncate">
                {newcomers > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> {newcomers} new in batch, not on list
                  </span>
                ) : (
                  `Locked${roster.lockedAt ? ` since ${new Date(roster.lockedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''}`
                )}
              </p>
            </div>
            <button type="button" onClick={() => setSetupOpen(true)} className="shrink-0 h-11 px-3.5 border border-line text-[14px] font-semibold text-fg cursor-pointer">
              {newcomers > 0 ? 'Review' : 'Edit list'}
            </button>
          </section>

          {/* Today */}
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-f3">
              <h3 className="text-[17px] font-semibold text-fg">Today</h3>
              <button
                type="button"
                onClick={() => {
                  setExtraSubject(subjects[0] || '');
                  const n = new Date();
                  setExtraTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
                  setExtraOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Extra lecture
              </button>
            </div>
            {todays.length === 0 ? (
              <p className="px-f4 py-f4 text-[14px] text-muted border border-dashed border-line">
                No lectures of yours in this batch today. Use “Extra lecture” for anything off the timetable.
              </p>
            ) : (
              <ul className="border border-line bg-surface divide-y divide-line-soft">
                {todays.map((x, i) => {
                  const t: TakeTarget = { subjectName: x.subjectName, date: todayKey(), startTime: x.session.startTime, endTime: x.session.endTime };
                  const done = findSession(t);
                  return (
                    <li key={i} className="flex items-center gap-f3 px-f4 py-f3">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-medium text-fg truncate">{x.subjectName}</span>
                        <span className="block text-[13px] text-muted tabular-nums truncate">
                          {formatTime12Hour(x.session.startTime)} ·{' '}
                          {done ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {done.total - done.absent}/{done.total} present
                            </span>
                          ) : (
                            `${roster.students.length} students`
                          )}
                        </span>
                      </span>
                      {done ? (
                        <button type="button" onClick={() => setTake(t)} className="shrink-0 inline-flex items-center gap-1 h-11 px-3 text-[14px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-300/70 dark:border-emerald-500/30 cursor-pointer">
                          <Check className="w-4 h-4" /> Edit
                        </button>
                      ) : (
                        <button type="button" onClick={() => setTake(t)} className="btn btn-primary">
                          <ClipboardCheck className="w-4 h-4" /> Take
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Records */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-f3">
              <div role="tablist" aria-label="Records" className="flex border border-line p-0.5">
                {(
                  [
                    ['lectures', `Lectures ${sessions.length}`],
                    ['students', `Students ${roster.students.length}`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`h-9 px-3 text-[13px] font-medium tabular-nums cursor-pointer ${tab === id ? 'bg-ink text-on-ink' : 'text-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {sessions.length > 0 && (
                <button type="button" onClick={exportExcel} disabled={exporting} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg hover:underline underline-offset-4 disabled:opacity-50 cursor-pointer">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Excel report
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <p className="px-f4 py-f5 text-center text-[14px] text-muted border border-dashed border-line">No lectures marked yet.</p>
            ) : tab === 'lectures' ? (
              <div className="flex flex-col gap-f3">
                {Object.entries(grouped).map(([date, list]) => (
                  <div key={date}>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[1.2px] text-muted">{dateLabel(date)}</p>
                    <ul className="border border-line bg-surface divide-y divide-line-soft">
                      {list.map((s) => {
                        const pct = ((s.total - s.absent) / Math.max(s.total, 1)) * 100;
                        return (
                          <li key={s.id}>
                            <button type="button" onClick={() => setTake({ subjectName: s.subjectName, date: s.date, startTime: s.startTime, endTime: s.endTime })} className="w-full flex items-center gap-f3 pl-f4 pr-f3 py-f3 text-left hover:bg-surface-2 cursor-pointer">
                              <span className="flex-1 min-w-0">
                                <span className="block text-[15px] font-medium text-fg truncate">{s.subjectName}</span>
                                <span className="block text-[13px] text-muted tabular-nums truncate">
                                  {formatTime12Hour(s.startTime)} · {s.absent ? `${s.absent} absent` : 'All present'}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className={`block text-[15px] font-semibold tabular-nums ${pct < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>{pctText(pct)}</span>
                                <span className="block text-[11px] text-muted tabular-nums">
                                  {s.total - s.absent}/{s.total}
                                </span>
                              </span>
                              <ChevronRight className="w-4 h-4 shrink-0 text-[#A0A0A0]" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-f3">
                {sessionSubjects.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {['all', ...sessionSubjects].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubjectFilter(sub)}
                        aria-pressed={subjectFilter === sub}
                        className={`shrink-0 h-9 px-3 border text-[13px] font-medium cursor-pointer ${
                          subjectFilter === sub ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg'
                        }`}
                      >
                        {sub === 'all' ? 'All subjects' : sub}
                      </button>
                    ))}
                  </div>
                )}
                {lowCount > 0 && (
                  <p className="flex items-center gap-1.5 text-[14px] text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" /> {lowCount} below 75%
                  </p>
                )}
                <ul className="border border-line bg-surface divide-y divide-line-soft">
                  {[...stats]
                    .sort((a, b) => (isNaN(a.pct) ? 101 : a.pct) - (isNaN(b.pct) ? 101 : b.pct) || byRoll(a.student, b.student))
                    .map(({ student, attended, total, pct }) => {
                      const low = isAtRisk({ pct, total });
                      return (
                        <li key={student.key} className="flex items-center gap-f3 px-f4 py-2.5">
                          <span className="w-[78px] shrink-0 font-mono text-[13px] font-semibold text-fg truncate">{student.roll || '—'}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] text-fg truncate">{student.name}</span>
                            <span className="mt-1 block h-1 bg-surface-3">
                              <span className={`block h-full ${low ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${isNaN(pct) ? 0 : pct}%` }} />
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className={`block text-[15px] font-semibold tabular-nums ${low ? 'text-rose-600 dark:text-rose-400' : 'text-fg'}`}>{pctText(pct)}</span>
                            <span className="block text-[11px] text-muted tabular-nums">
                              {total < MIN_LECTURES_FOR_FLAG ? `${total}/${MIN_LECTURES_FOR_FLAG} lectures` : `${attended}/${total}`}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                </ul>
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
          onClose={() => setSetupOpen(false)}
          onSaved={(r: Roster) => {
            setSetupOpen(false);
            showToast('Class list locked', `${r.students.length} students`, 'success');
          }}
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
          <button
            type="button"
            disabled={!extraSubject || !extraTime}
            onClick={() => {
              setExtraOpen(false);
              setTake({ subjectName: extraSubject || 'Lecture', date: todayKey(), startTime: extraTime });
            }}
            className="h-12 bg-ink text-on-ink text-[15px] font-semibold disabled:opacity-40 cursor-pointer"
          >
            Start marking
          </button>
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
