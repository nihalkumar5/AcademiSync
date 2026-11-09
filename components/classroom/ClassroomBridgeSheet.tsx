'use client';

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Illustration } from '@/components/ui/Illustration';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from '@/components/ui/icons';
import { ConnectCancelled, getClassroomAuthCode } from '@/lib/classroomConnect';
import type { BridgeCourse, BridgePending, CourseHow } from '@/lib/classroomShared';
import { dueText, timeAgo, useClassroomBridge } from './bridgeClient';

type Bridge = ReturnType<typeof useClassroomBridge>;
type Picker = { kind: 'course'; course: BridgeCourse } | { kind: 'item'; item: BridgePending } | null;

const GoogleG = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.97 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.96 3.07C6.27 7.37 8.91 5.04 12 5.04z" />
    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z" />
    <path fill="#FBBC05" d="M5.3 14.33l-3.96 3.07C3.37 21.32 7.35 24 12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.09 0-5.73-2.33-6.7-5.54L5.3 14.33z" />
    <path fill="#34A853" d="M12 4.49c-1.85 0-3.17.41-4.2 1.1L4.07 2.7C6.05.88 8.76-.2 12-.2c4.65 0 8.63 2.68 10.66 6.6l-3.96 3.07c-.97-3.21-3.61-5.54-6.7-5.54z" transform="translate(0 .2)" />
  </svg>
);

const CLASS_TONE = 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20';

/** Classroom → Intersemester → your batch, with a dot travelling along the wires. */
const FlowArt: React.FC = () => (
  <div className="relative border border-line bg-surface-2/60 px-4 py-7" aria-hidden="true">
    <div className="flex items-center">
      <FlowNode label="Classroom">
        <span className={clsx('w-14 h-14 flex items-center justify-center border', CLASS_TONE)}>
          <GraduationCap className="w-7 h-7" />
        </span>
      </FlowNode>
      <Wire />
      <FlowNode label="Intersemester">
        <span className="w-14 h-14 overflow-hidden bg-white border border-line flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo51.png" alt="" className="w-full h-full object-cover scale-[1.75]" />
        </span>
      </FlowNode>
      <Wire late />
      <FlowNode label="Your batch">
        <span className="w-14 h-14 flex items-center justify-center bg-ink text-on-ink border border-ink">
          <Users className="w-7 h-7" />
        </span>
      </FlowNode>
    </div>
    <style>{`
      @keyframes bridgeDot { 0% { left: 0; opacity: 0 } 15% { opacity: 1 } 85% { opacity: 1 } 100% { left: calc(100% - 6px); opacity: 0 } }
      .bridge-dot { animation: bridgeDot 2.4s ease-in-out infinite; }
      .bridge-dot-late { animation-delay: 1.2s; }
      @media (prefers-reduced-motion: reduce) { .bridge-dot { animation: none; left: calc(50% - 3px); } }
    `}</style>
  </div>
);
const FlowNode: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col items-center gap-2 shrink-0 w-[76px]">
    {children}
    <span className="text-[11px] font-semibold text-muted text-center leading-tight">{label}</span>
  </div>
);
const Wire: React.FC<{ late?: boolean }> = ({ late }) => (
  <div className="relative flex-1 h-px -mt-6 border-t border-dashed border-line-strong">
    <span className={clsx('bridge-dot absolute -top-[3.5px] w-1.5 h-1.5 bg-emerald-500', late && 'bridge-dot-late')} />
  </div>
);

const HowTag: React.FC<{ how: CourseHow; hasSubject: boolean }> = ({ how, hasSubject }) => {
  if (how === 'off') return <span className="tag text-muted">Off</span>;
  if (!hasSubject) return <span className="tag bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25">Choose</span>;
  if (how === 'manual') return <span className="tag">Set by you</span>;
  if (how === 'ai')
    return (
      <span className="tag inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
        <Sparkles className="w-3 h-3" /> Matched
      </span>
    );
  return <span className="tag text-emerald-700 dark:text-emerald-300">Matched</span>;
};

export const ClassroomBridgeSheet: React.FC<{ open: boolean; onClose: () => void; bridge: Bridge }> = ({ open, onClose, bridge }) => {
  const { showToast } = useApp() as any;
  const { data, loading, error, busy, load, act } = bridge;
  const [connectError, setConnectError] = useState('');
  const [picker, setPicker] = useState<Picker>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (open) {
      setConnectError('');
      load(true);
    }
  }, [open, load]);

  const toast = (title: string, body: string, kind: 'success' | 'error' | 'info' = 'success') => showToast?.(title, body, kind);
  const run = async (fn: () => Promise<unknown>, ok?: [string, string]) => {
    try {
      await fn();
      if (ok) toast(ok[0], ok[1]);
    } catch (e: any) {
      toast('Not done', e?.message || 'Try again', 'error');
    }
  };

  const connect = async () => {
    setConnectError('');
    try {
      const { code, platform } = await getClassroomAuthCode();
      const d = await act('connect', { code, platform }, 'connect');
      const n = d.totals?.shared || 0;
      toast('Classroom connected', n ? `${n} assignment${n === 1 ? '' : 's'} shared with your batch` : 'New assignments will reach your batch on their own');
    } catch (e: any) {
      if (e instanceof ConnectCancelled) return;
      setConnectError(e?.message || "Couldn't connect. Try again.");
    }
  };

  const syncNow = () =>
    run(async () => {
      const d: any = await act('sync', {}, 'sync');
      const r = d?.result;
      if (r?.skipped === 'recent') toast('Up to date', 'Checked a moment ago', 'info');
      else if (r) {
        const bits = [r.added && `${r.added} new`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} removed`].filter(Boolean);
        toast('Classroom checked', bits.length ? bits.join(' · ') : 'Nothing new', bits.length ? 'success' : 'info');
      }
    });

  const shareItem = (p: BridgePending, subjectId?: string) =>
    run(() => act('share', { ids: [p.id], ...(subjectId ? { subjectId } : {}) }, `share:${p.id}`), ['Shared with your batch', p.title]);
  const skipItem = (p: BridgePending) => run(() => act('skip', { ids: [p.id] }, `skip:${p.id}`));

  const subjects = data?.subjects || [];
  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name || '';
  const pickerList = subjects.filter(
    (s) => !pickerSearch.trim() || `${s.name} ${s.code}`.toLowerCase().includes(pickerSearch.trim().toLowerCase())
  );

  const pick = async (value: string) => {
    const p = picker;
    setPicker(null);
    setPickerSearch('');
    if (!p) return;
    if (p.kind === 'course') {
      await run(
        () => act('course', { courseId: p.course.id, subjectId: value }, `course:${p.course.id}`),
        value === 'off' ? ['Class turned off', p.course.name] : ['Class updated', p.course.name]
      );
    } else {
      await shareItem(p.item, value);
    }
  };

  // ---------- body ----------
  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  if (!data && (loading || !error)) {
    body = (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="h-[132px] bg-surface-2 animate-pulse" />
        <div className="h-16 bg-surface-2 animate-pulse" />
        <div className="h-40 bg-surface-2 animate-pulse" />
      </div>
    );
  } else if (!data) {
    body = (
      <div className="flex flex-col items-center text-center py-6">
        <Illustration name="error" className="h-[130px] w-auto" />
        <p className="mt-4 text-[16px] font-semibold text-fg">Couldn&apos;t load Classroom</p>
        <p className="mt-1 text-[14px] text-muted">{error?.message}</p>
        <button type="button" onClick={() => load(true)} className="btn btn-secondary mt-5">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  } else if (!data.isPilot) {
    body = (
      <div className="flex flex-col items-center text-center py-6">
        <Illustration name="pilot" className="h-[140px] w-auto" />
        <p className="mt-4 text-[17px] font-semibold text-fg">For Batch Pilots</p>
        <p className="mt-1 text-[14px] leading-[21px] text-muted max-w-[320px]">
          {data.pilotError === 'no-batch' ? 'Join your class batch first.' : 'Your Batch Pilot connects Classroom once, and the whole batch gets the assignments.'}
        </p>
      </div>
    );
  } else if (!data.configured) {
    body = (
      <div className="flex flex-col items-center text-center py-6">
        <Illustration name="setup" className="h-[140px] w-auto" />
        <p className="mt-4 text-[17px] font-semibold text-fg">Classroom sync is almost ready</p>
        <p className="mt-1 text-[14px] leading-[21px] text-muted max-w-[320px]">The app is finishing its Google setup. You&apos;ll be able to connect here soon.</p>
      </div>
    );
  } else if (!data.connected) {
    body = (
      <div className="flex flex-col">
        <FlowArt />
        <h2 className="mt-6 text-[26px] sm:text-[30px] leading-[1.1] tracking-tight text-fg">Classroom assignments, straight to your batch</h2>
        <p className="mt-3 text-[15px] leading-[23px] text-muted">
          Connect once. Every assignment your teachers post reaches everyone in your batch on its own, with the right subject and due time.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {[
            'New work shows up for your batch within 30 minutes',
            'Due date changed in Classroom? Everyone’s copy updates',
            'Class names don’t need to match your subjects',
            'Only you connect. Classmates don’t have to',
          ].map((t) => (
            <li key={t} className="flex items-start gap-3 text-[14px] leading-[20px] text-fg">
              <span className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center bg-ink text-on-ink">
                <Check className="w-3 h-3" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        {connectError && (
          <div role="alert" className="mt-5 flex items-start gap-2.5 border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13px] leading-[19px] text-danger">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{connectError}</span>
          </div>
        )}
      </div>
    );
    footer = (
      <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)]">
        <button type="button" onClick={connect} disabled={busy === 'connect'} className="btn btn-primary btn-lg w-full">
          {busy === 'connect' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <span className="w-7 h-7 -ml-1 bg-white flex items-center justify-center">
                <GoogleG />
              </span>
              Connect Google Classroom
            </>
          )}
        </button>
        <p className="mt-2.5 text-center text-[12px] leading-[17px] text-muted">
          Read-only: we see your classes and assignments, nothing else. Disconnect any time.
        </p>
      </div>
    );
  } else {
    const reconnect = data.status === 'reconnect';
    const paused = data.status === 'paused';
    body = (
      <div className="flex flex-col gap-7">
        {/* Status */}
        <section className="sheen-ink bg-ink text-on-ink border border-ink p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
              <span className="relative flex w-2 h-2">
                {!reconnect && !paused && <span className="absolute inset-0 bg-emerald-400 animate-ping opacity-60 motion-reduce:hidden" />}
                <span className={clsx('relative w-2 h-2', reconnect ? 'bg-amber-400' : paused ? 'bg-on-ink/40' : 'bg-emerald-400')} />
              </span>
              {reconnect ? 'Reconnect needed' : paused ? 'Paused' : data.autoShare ? 'Auto-sync on' : 'Syncing, you review'}
            </span>
            <span className="text-[12px] opacity-60">Checked {timeAgo(data.lastSyncAt)}</span>
          </div>
          <p className="mt-4 text-[28px] font-semibold leading-none tabular-nums">{data.totals.shared}</p>
          <p className="mt-1.5 text-[13px] opacity-70">assignment{data.totals.shared === 1 ? '' : 's'} shared with your batch</p>
          <p className="mt-4 pt-3 border-t border-on-ink/15 text-[12px] opacity-60 truncate">{data.email || 'Google account connected'}</p>
        </section>

        {reconnect && (
          <div className="flex items-start gap-3 border border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/[0.07] p-3.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-fg">Google access ended</p>
              <p className="mt-0.5 text-[13px] text-muted">Reconnect to keep assignments coming.</p>
            </div>
            <button type="button" onClick={connect} disabled={busy === 'connect'} className="btn btn-primary btn-sm">
              {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reconnect'}
            </button>
          </div>
        )}
        {!reconnect && data.lastError && <p className="-mt-4 text-[12px] text-muted">Last check: {data.lastError}</p>}
        {connectError && <p className="-mt-4 text-[13px] text-danger">{connectError}</p>}

        {/* Auto-share */}
        <button
          type="button"
          role="switch"
          aria-checked={data.autoShare}
          onClick={() => run(() => act('autoShare', { on: !data.autoShare }, 'autoShare'))}
          disabled={busy === 'autoShare'}
          className="w-full p-4 border border-line bg-surface flex items-center gap-3.5 text-left cursor-pointer hover:border-line-strong transition-colors"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-fg">Share new assignments automatically</span>
            <span className="block mt-0.5 text-[13px] text-muted">
              {data.autoShare ? 'They reach your batch within 30 minutes' : 'You check each one before it goes out'}
            </span>
          </span>
          <span className={clsx('relative w-11 h-6 shrink-0 transition-colors', data.autoShare ? 'bg-ink' : 'bg-line-strong/60')}>
            <span className={clsx('absolute top-0.5 w-5 h-5 bg-surface transition-[left]', data.autoShare ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>

        {/* Needs you */}
        {data.pending.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              Needs you
              <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center bg-amber-500 text-white text-[11px] font-bold rounded-full">
                {data.pending.length}
              </span>
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              {data.pending.map((p) => {
                const working = busy === `share:${p.id}` || busy === `skip:${p.id}`;
                return (
                  <li
                    key={p.id}
                    className={clsx(
                      'border border-amber-200 dark:border-amber-400/25 bg-amber-50/50 dark:bg-amber-400/[0.05] p-3.5 transition-opacity',
                      working && 'opacity-60 pointer-events-none'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-muted truncate">{p.courseName}</p>
                        <p className="mt-0.5 text-[15px] font-semibold leading-snug text-fg">{p.title}</p>
                        <p className="mt-1 text-[12px] text-muted">{dueText(p.due)}</p>
                      </div>
                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open in Classroom"
                          className="w-8 h-8 -mr-1 -mt-1 shrink-0 flex items-center justify-center text-muted hover:text-fg"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {p.reason === 'subject' || !p.subjectId ? (
                      <>
                        <p className="mt-3 text-[12px] font-semibold text-fg">Which subject is this?</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {p.suggestions.map((s) => (
                            <button key={s.id} type="button" onClick={() => shareItem(p, s.id)} className="chip bg-surface">
                              {s.name}
                            </button>
                          ))}
                          <button type="button" onClick={() => setPicker({ kind: 'item', item: p })} className="chip bg-surface">
                            {p.suggestions.length ? 'Other…' : 'Pick subject'}
                          </button>
                        </div>
                        <button type="button" onClick={() => skipItem(p)} className="mt-2.5 text-[12px] font-medium text-muted hover:text-fg cursor-pointer">
                          Not for my batch
                        </button>
                      </>
                    ) : (
                      <div className="mt-3 flex items-center gap-2">
                        <button type="button" onClick={() => shareItem(p)} className="btn btn-primary btn-sm">
                          Share with batch
                        </button>
                        <button type="button" onClick={() => skipItem(p)} className="btn btn-ghost btn-sm">
                          Skip
                        </button>
                        <span className="ml-auto text-[12px] text-muted truncate">{subjectName(p.subjectId)}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Classes */}
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-fg">Your classes</h3>
            <span className="text-[12px] text-muted">Tap to change the subject</span>
          </div>
          {data.courses.length === 0 ? (
            <div className="mt-2.5 border border-dashed border-line px-4 py-5 text-center">
              <p className="text-[14px] font-semibold text-fg">No classes in this Google account</p>
              <p className="mt-1 text-[13px] text-muted">Connect the account your teachers invite to Classroom.</p>
              <button type="button" onClick={connect} className="btn btn-secondary btn-sm mt-3">
                Use another account
              </button>
            </div>
          ) : (
            <ul className="mt-2.5 border border-line bg-surface divide-y divide-line-soft">
              {data.courses.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setPicker({ kind: 'course', course: c })}
                    disabled={busy === `course:${c.id}`}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <span className={clsx('w-9 h-9 shrink-0 flex items-center justify-center border', c.how === 'off' ? 'bg-surface-2 text-muted border-line-soft' : CLASS_TONE)}>
                      {busy === `course:${c.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-[18px] h-[18px]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={clsx('block text-[14px] font-semibold truncate', c.how === 'off' ? 'text-muted' : 'text-fg')}>{c.name}</span>
                      <span className="block mt-0.5 text-[12px] text-muted truncate">
                        {c.how === 'off' ? 'Not synced' : c.subjectName ? `→ ${c.subjectName}` : 'Which subject is this?'}
                        {c.section ? ` · ${c.section}` : ''}
                      </span>
                    </span>
                    <HowTag how={c.how} hasSubject={!!c.subjectId} />
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recently shared */}
        {data.recent.length > 0 && (
          <section>
            <h3 className="text-[13px] font-semibold text-fg">Recently shared</h3>
            <ul className="mt-2.5 border border-line bg-surface divide-y divide-line-soft">
              {data.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-fg truncate">{r.title}</span>
                    <span className="block mt-0.5 text-[12px] text-muted truncate">
                      {dueText(r.due)} · {r.subjectName}
                    </span>
                  </span>
                  {confirmUndo === r.id ? (
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmUndo(null);
                          run(() => act('unshare', { id: r.id }, `unshare:${r.id}`), ['Removed from your batch', r.title]);
                        }}
                        className="h-8 px-2.5 text-[12px] font-semibold text-white bg-danger cursor-pointer"
                      >
                        Remove
                      </button>
                      <button type="button" onClick={() => setConfirmUndo(null)} className="h-8 px-2 text-[12px] font-medium text-muted cursor-pointer">
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmUndo(r.id)}
                      disabled={busy === `unshare:${r.id}`}
                      className="h-8 px-2 shrink-0 text-[12px] font-medium text-muted hover:text-fg cursor-pointer"
                    >
                      {busy === `unshare:${r.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Undo'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <button type="button" onClick={() => setConfirmDisconnect(true)} className="self-start text-[13px] font-medium text-muted hover:text-danger cursor-pointer">
          Disconnect Google account
        </button>
      </div>
    );
    footer = (
      <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-2">
        <button type="button" onClick={syncNow} disabled={!!busy || reconnect} className="btn btn-secondary btn-lg flex-1">
          {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Check now
        </button>
        <button type="button" onClick={onClose} className="btn btn-primary btn-lg flex-1">
          Done
        </button>
      </div>
    );
  }

  return (
    <>
      <Modal isOpen={open} onClose={onClose} title="Google Classroom" mobileFullSheet footer={footer}>
        {body}
      </Modal>

      {/* Subject picker */}
      <Modal
        isOpen={!!picker}
        onClose={() => {
          setPicker(null);
          setPickerSearch('');
        }}
        title={picker?.kind === 'course' ? 'Subject for this class' : 'Which subject?'}
        description={picker?.kind === 'course' ? picker.course.name : picker?.kind === 'item' ? picker.item.title : undefined}
      >
        <div className="flex flex-col max-h-[62vh] sm:max-h-[52vh] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 -mt-5 sm:-mt-6">
          {subjects.length > 6 && (
            <div className="relative border-b border-line shrink-0 bg-surface">
              <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search subjects"
                className="w-full pl-12 pr-4 h-14 bg-transparent text-[15px] text-fg placeholder:text-faint focus:outline-none"
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {picker?.kind === 'course' && (
              <button
                type="button"
                onClick={() => pick('auto')}
                className="w-full text-left px-5 sm:px-6 py-3.5 border-b border-line-soft flex items-center gap-3 bg-surface hover:bg-surface-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0 text-violet-600 dark:text-violet-300" />
                <span className="flex-1 text-[15px] font-semibold text-fg">Match automatically</span>
              </button>
            )}
            {pickerList.map((s) => {
              const current = picker?.kind === 'course' ? picker.course.subjectId === s.id && picker.course.how !== 'off' : false;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.id)}
                  className={clsx(
                    'w-full text-left px-5 sm:px-6 py-3.5 border-b border-line-soft flex items-center gap-3 cursor-pointer transition-colors',
                    current ? 'bg-surface-2' : 'bg-surface hover:bg-surface-2'
                  )}
                >
                  <span className="flex-1 min-w-0">
                    {s.code && s.code !== 'UNK' && <span className="block text-[11px] font-bold tracking-wide text-muted">{s.code}</span>}
                    <span className="block text-[15px] font-semibold text-fg truncate">{s.name}</span>
                  </span>
                  {current && <Check className="w-5 h-5 shrink-0 text-fg" />}
                </button>
              );
            })}
            {pickerList.length === 0 && <div className="p-8 text-center text-[14px] text-muted">No subjects match.</div>}
            {picker?.kind === 'course' && (
              <button
                type="button"
                onClick={() => pick('off')}
                className="w-full text-left px-5 sm:px-6 py-3.5 flex items-center gap-3 bg-surface hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex-1 text-[15px] font-semibold text-muted">Don&apos;t sync this class</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Disconnect */}
      <Modal isOpen={confirmDisconnect} onClose={() => setConfirmDisconnect(false)} title="Disconnect Classroom?" maxWidth="sm">
        <div className="flex flex-col gap-5 text-left">
          <p className="text-[14px] leading-[21px] text-muted">Assignments already shared stay with your batch. New ones stop coming until you connect again.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDisconnect(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy === 'disconnect'}
              onClick={async () => {
                await run(() => act('disconnect', {}, 'disconnect'), ['Classroom disconnected', 'You can connect again any time']);
                setConfirmDisconnect(false);
              }}
            >
              {busy === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
