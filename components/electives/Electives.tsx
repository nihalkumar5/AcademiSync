'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Illustration } from '@/components/ui/Illustration';
import { Check, ChevronRight, Layers, Sparkles } from '@/components/ui/icons';
import { formatTime12Hour } from '@/lib/timetableUtils';
import { subjectTone } from '@/lib/assignmentDisplay';
import {
  ElectivePendingMark,
  ElectiveSetupPlan,
  ResolvedElectiveGroup,
  applyElectiveSetup,
  buildElectiveGroups,
  electivePrefix,
  findParallelClasses,
  nextSlotName,
  slotSummary,
  splitCombinedName,
} from '@/lib/electives';
import type { ClassSession, Subject } from '@/lib/types';

// Electives, as students and pilots see them:
// - ElectivesHost: the "Your electives" sheet (pick one per slot) and the pilot's setup sheet.
//   Open from anywhere with openElectives(). Asks a student once when their batch has slots to pick.
// - ElectivesPromptCard (Home), ElectivesSummary (Timetable), ElectivePendingCard (an unpicked slot
//   in the timetable / today's timeline).

export const openElectives = (detail: { mode?: 'choose' | 'setup'; focus?: string } = {}) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('electives:open', { detail }));
};

const isTbd = (v?: string) => !v || /^(tbd|tba|na|n\/a|-)$/i.test(v.trim());
const realCode = (code?: string) => {
  const c = (code || '').trim();
  return c.length > 2 && !/^[A-Z]\d?$/i.test(c) && c.toUpperCase() !== 'UNK' ? c : '';
};
const optionMeta = (o: Subject) => [realCode(o.code), isTbd(o.facultyName) ? '' : o.facultyName, isTbd(o.room) ? '' : o.room].filter(Boolean).join(' · ');
const anchorId = (key: string) => `elective-${key.replace(/[^a-z0-9]+/gi, '-')}`;

// ---------- One elective slot: pick one / take it or not ----------
const StatusChip: React.FC<{ g: ResolvedElectiveGroup }> = ({ g }) =>
  g.status === 'pending' ? (
    <span className="shrink-0 inline-flex items-center h-6 px-2 border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300 text-[12px] font-semibold">
      {g.kind === 'pick' ? 'Pick one' : 'Decide'}
    </span>
  ) : g.status === 'chosen' ? (
    <span className="shrink-0 inline-flex items-center gap-1 h-6 px-2 border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300 text-[12px] font-semibold">
      <Check className="w-3 h-3" /> {g.kind === 'pick' ? 'Picked' : 'Taking'}
    </span>
  ) : (
    <span className="shrink-0 inline-flex items-center h-6 px-2 border border-line bg-surface-2 text-muted text-[12px] font-semibold">Not taking</span>
  );

export const ElectiveGroupCard: React.FC<{ group: ResolvedElectiveGroup; onChoose: (optionId: string | null) => void }> = ({ group, onChoose }) => {
  const when = slotSummary(group.slots, formatTime12Hour);
  return (
    <section id={anchorId(group.key)} className="border border-line bg-surface scroll-mt-24">
      <header className="px-f4 pt-f3 pb-f3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-fg tracking-tight truncate">{group.label}</h3>
          <p className="mt-0.5 text-[12px] text-muted tabular-nums">
            {group.kind === 'pick' ? `${group.options.length} options` : 'Optional course'}
            {when ? ` · ${when}` : ''}
          </p>
        </div>
        <StatusChip g={group} />
      </header>

      {group.kind === 'pick' ? (
        <div role="radiogroup" aria-label={group.label} className="border-t border-line-soft divide-y divide-line-soft">
          {group.options.map((o) => {
            const sel = group.status === 'chosen' && group.chosen?.id === o.id;
            const tone = subjectTone(o);
            const meta = optionMeta(o);
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => !sel && onChoose(o.id)}
                className={clsx('w-full flex items-center gap-3 px-f4 py-3 text-left transition-colors cursor-pointer', sel ? 'bg-surface-2' : 'hover:bg-surface-2/60')}
                style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}
              >
                <span className="w-2.5 h-2.5 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-fg leading-snug">{o.name}</span>
                  {meta && <span className="block mt-0.5 text-[12px] text-muted truncate">{meta}</span>}
                </span>
                {sel ? (
                  <span className="w-5 h-5 shrink-0 rounded-full bg-ink flex items-center justify-center" aria-hidden="true">
                    <Check className="w-3 h-3 text-on-ink" />
                  </span>
                ) : (
                  <span className="w-5 h-5 shrink-0 rounded-full border-2 border-line-strong" aria-hidden="true" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={group.status === 'none'}
            onClick={() => group.status !== 'none' && onChoose(null)}
            className={clsx(
              'w-full h-11 px-f4 flex items-center justify-between gap-3 text-left text-[13px] font-medium transition-colors cursor-pointer',
              group.status === 'none' ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg hover:bg-surface-2/60'
            )}
          >
            None of these
            {group.status === 'none' && <Check className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="border-t border-line-soft p-f3 grid grid-cols-2 gap-2">
          {[
            { on: true, label: 'I take it' },
            { on: false, label: 'Not mine' },
          ].map(({ on, label }) => {
            const active = on ? group.status === 'chosen' : group.status === 'none';
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => !active && onChoose(on ? group.options[0].id : null)}
                className={clsx('btn h-11', active ? 'btn-primary' : 'btn-secondary')}
              >
                {active && <Check className="w-4 h-4" />} {label}
              </button>
            );
          })}
          {optionMeta(group.options[0]) && <p className="col-span-2 text-[12px] text-muted truncate">{optionMeta(group.options[0])}</p>}
        </div>
      )}
    </section>
  );
};

// ---------- Student: "Your electives" ----------
const ChooserSheet: React.FC<{ open: boolean; focus?: string; onClose: () => void; onSetup: () => void }> = ({ open, focus, onClose, onSetup }) => {
  const { electiveGroups, pendingElectives, chooseElective, canSetUpElectives } = useApp() as any;
  const groups: ResolvedElectiveGroup[] = electiveGroups || [];
  const left = (pendingElectives || []).length;

  useEffect(() => {
    if (!open || !focus) return;
    const t = setTimeout(() => document.getElementById(anchorId(focus))?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    return () => clearTimeout(t);
  }, [open, focus]);

  const footer = (
    <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-3">
      <p className="flex-1 min-w-0 text-[13px] text-muted">{groups.length === 0 ? '' : left ? `${left} left to pick` : 'All picked. Change any time.'}</p>
      <button type="button" onClick={onClose} className="btn btn-primary btn-lg px-6">
        Done
      </button>
    </div>
  );

  return (
    <Modal isOpen={open} onClose={onClose} title="Your electives" description="Pick the class you attend in each elective slot." maxWidth="lg" mobileFullSheet footer={footer}>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center text-center py-f4">
          <Illustration name="subjects" className="h-[140px] w-auto" />
          <h3 className="mt-f4 text-[18px] font-semibold text-fg">No electives yet</h3>
          <p className="mt-1.5 text-[14px] text-muted max-w-sm">
            {canSetUpElectives
              ? 'Mark the classes where students pick one, like Elective I or an open elective.'
              : 'When your batch pilot sets up electives, you pick yours here.'}
          </p>
          {canSetUpElectives && (
            <button type="button" onClick={onSetup} className="btn btn-primary mt-f4">
              <Layers className="w-4 h-4" /> Set up electives
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-f4">
          <p className="text-[13px] leading-[19px] text-muted">
            Your timetable, reminders, bag and attendance follow your picks. Assignments of electives you don&apos;t take stay out of your list.
          </p>
          {groups.map((g) => (
            <ElectiveGroupCard key={g.key} group={g} onChoose={(id) => chooseElective(g.key, id)} />
          ))}
          {canSetUpElectives && (
            <button type="button" onClick={onSetup} className="self-start inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg underline underline-offset-4 decoration-line-strong hover:decoration-fg cursor-pointer">
              <Layers className="w-4 h-4" /> Change electives for the batch
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};

// ---------- Pilot: set up electives ----------
type Mark = { isElective: boolean; slot: string };

const SetupSheet: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
  const { subjects, timetable, currentBatchData, saveElectiveSetup, profile } = useApp() as any;
  const all: Subject[] = useMemo(() => (subjects || []).filter((s: Subject) => !s.isPersonal || !profile?.isBatchSynced), [subjects, profile?.isBatchSynced]);
  const batchTt: ClassSession[] = Array.isArray(currentBatchData?.timetable) ? currentBatchData.timetable : [];

  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [splits, setSplits] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!open) return;
    const m: Record<string, Mark> = {};
    all.forEach((s) => (m[s.id] = { isElective: !!s.isElective, slot: s.electiveSlot || '' }));
    setMarks(m);
    setSplits({});
  }, [open, all]);

  const plan: ElectiveSetupPlan = useMemo(() => {
    const p: ElectiveSetupPlan = { marks: {}, splits: {} };
    all.forEach((s) => {
      const m = marks[s.id];
      if (!m) return;
      if (m.isElective !== !!s.isElective || (m.slot || '') !== (s.electiveSlot || '')) p.marks[s.id] = { isElective: m.isElective, slot: m.slot };
    });
    Object.keys(splits).forEach((id) => {
      const s = all.find((x) => x.id === id);
      const names = s ? splitCombinedName(s.name) : [];
      if (splits[id] && names.length > 1) p.splits![id] = { names, slot: marks[id]?.slot || electivePrefix(s!.name) };
    });
    return p;
  }, [marks, splits, all]);
  const changed = Object.keys(plan.marks).length > 0 || Object.keys(plan.splits || {}).length > 0;

  // What students will be asked, live
  const preview = useMemo(() => {
    const out = applyElectiveSetup(subjects || [], timetable || [], plan, () => '#8067B5', batchTt);
    return buildElectiveGroups(out.subjects, out.timetable);
  }, [subjects, timetable, plan, batchTt]);

  // Suggestions: same-time courses (from the batch copy, which keeps clashes this phone pruned)
  const parallel = useMemo(() => {
    const src = batchTt.length ? batchTt : timetable || [];
    return findParallelClasses(all, src).filter((c) => c.subjects.some((s) => !marks[s.id]?.isElective));
  }, [all, batchTt, timetable, marks]);
  const draftSubjects = all.map((s) => ({ ...s, electiveSlot: marks[s.id]?.isElective ? marks[s.id]?.slot : undefined }));
  const slotNames = Array.from(new Set(all.map((s) => (marks[s.id]?.isElective ? (marks[s.id]?.slot || '').trim() : '')).filter(Boolean)));

  const setMark = (id: string, patch: Partial<Mark>) => setMarks((m) => ({ ...m, [id]: { ...(m[id] || { isElective: false, slot: '' }), ...patch } }));
  const makeSlot = (ids: string[]) => {
    const name = nextSlotName(draftSubjects as Subject[]);
    setMarks((m) => {
      const n = { ...m };
      ids.forEach((id) => (n[id] = { isElective: true, slot: name }));
      return n;
    });
  };

  const save = () => {
    if (changed) saveElectiveSetup(plan);
    onSaved();
  };

  const footer = (
    <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-2">
      <button type="button" onClick={onClose} className="btn btn-secondary btn-lg">
        Cancel
      </button>
      <button type="button" onClick={save} disabled={!changed} className="btn btn-primary btn-lg flex-1 min-w-0">
        Save electives
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Set up electives"
      description="Students pick one course in each slot. Courses at the same time, or with the same slot name, are one slot."
      maxWidth="lg"
      mobileFullSheet
      footer={footer}
    >
      <div className="flex flex-col gap-f5">
        {/* Suggestions */}
        {parallel.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <Sparkles className="w-4 h-4" /> Same time, different courses
            </h3>
            {parallel.map((c) => (
              <div key={c.subjects.map((s) => s.id).join('|')} className="border border-line bg-surface p-f3 flex flex-col gap-2.5">
                <p className="text-[14px] text-fg">
                  <span className="font-semibold">{c.subjects.map((s) => s.name).join(' · ')}</span>
                  <span className="text-muted"> run together on {c.slot.day.slice(0, 3)} {formatTime12Hour(c.slot.start)}. Students can only sit in one.</span>
                </p>
                <button type="button" onClick={() => makeSlot(c.subjects.map((s) => s.id))} className="btn btn-secondary btn-sm self-start">
                  Make them one elective slot
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Courses */}
        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-muted">Courses</h3>
          <ul className="border border-line bg-surface divide-y divide-line-soft">
            {all.map((s) => {
              const m = marks[s.id] || { isElective: false, slot: '' };
              const tone = subjectTone(s);
              const parts = splitCombinedName(s.name);
              const looksElective = !m.isElective && (/\belective\b|\b(oe|de|pe)\b/i.test(s.name) || parts.length > 1);
              return (
                <li key={s.id} className="px-f4 py-3" style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-medium text-fg leading-snug">{s.name}</span>
                      {looksElective && <span className="block mt-0.5 text-[12px] text-amber-700 dark:text-amber-300">Looks like an elective</span>}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={m.isElective}
                      aria-label={`${s.name} is an elective`}
                      onClick={() => setMark(s.id, { isElective: !m.isElective, slot: !m.isElective ? m.slot || electivePrefix(s.name) : m.slot })}
                      className={clsx('relative w-11 h-6 shrink-0 rounded-full transition-colors cursor-pointer', m.isElective ? 'bg-ink' : 'bg-black/15 dark:bg-white/15')}
                    >
                      <span className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all', m.isElective ? 'left-[22px]' : 'left-0.5')} />
                    </button>
                  </div>

                  {m.isElective && (
                    <div className="mt-3 pl-[22px] flex flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-[12px] font-semibold text-muted">Slot</span>
                        <input
                          value={m.slot}
                          onChange={(e) => setMark(s.id, { slot: e.target.value.slice(0, 40) })}
                          placeholder="e.g. Elective I"
                          className="flex-1 min-w-0 h-9 px-2.5 border border-line bg-surface text-[14px] text-fg placeholder:text-faint focus:outline-none focus:border-fg"
                        />
                      </label>
                      {(slotNames.filter((n) => n !== m.slot).length > 0 || !m.slot) && (
                        <div className="flex flex-wrap gap-1.5 pl-12">
                          {slotNames
                            .filter((n) => n !== m.slot)
                            .map((n) => (
                              <button key={n} type="button" onClick={() => setMark(s.id, { slot: n })} className="h-7 px-2.5 bg-surface-2 text-[12px] font-medium text-fg-2 hover:text-fg cursor-pointer">
                                {n}
                              </button>
                            ))}
                          {!m.slot && (
                            <button type="button" onClick={() => setMark(s.id, { slot: nextSlotName(draftSubjects as Subject[]) })} className="h-7 px-2.5 bg-surface-2 text-[12px] font-medium text-fg-2 hover:text-fg cursor-pointer">
                              + {nextSlotName(draftSubjects as Subject[])}
                            </button>
                          )}
                        </div>
                      )}
                      {parts.length > 1 && (
                        <button
                          type="button"
                          aria-pressed={!!splits[s.id]}
                          onClick={() => setSplits((p) => ({ ...p, [s.id]: !p[s.id] }))}
                          className={clsx('self-start ml-12 inline-flex items-center gap-1.5 h-8 px-3 border text-[13px] font-semibold cursor-pointer transition-colors', splits[s.id] ? 'bg-ink text-on-ink border-ink' : 'border-line text-fg hover:bg-surface-2')}
                        >
                          {splits[s.id] ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                          {splits[s.id] ? `Splitting into ${parts.length}: ${parts.join(' · ')}` : `Split into ${parts.length} options`}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[12px] text-muted">Leave the slot empty and courses that run at the same time still group on their own.</p>
        </section>

        {/* Preview */}
        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-muted">Students will be asked</h3>
          {preview.length === 0 ? (
            <p className="border border-dashed border-line px-f3 py-3 text-[14px] text-muted">Nothing yet. Switch on the courses that are electives.</p>
          ) : (
            <ul className="border border-line bg-surface divide-y divide-line-soft">
              {preview.map((g) => (
                <li key={g.key} className="px-f4 py-3">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold text-fg">{g.label}</span>
                    <span className="shrink-0 text-[12px] text-muted">{g.kind === 'pick' ? 'Pick one' : 'Take it or not'}</span>
                  </p>
                  {g.kind === 'pick' && <p className="mt-0.5 text-[13px] text-muted">{g.options.map((o) => o.name).join(' · ')}</p>}
                  {g.slots.length > 0 && <p className="mt-0.5 text-[12px] text-faint tabular-nums">{slotSummary(g.slots, formatTime12Hour)}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
};

// ---------- Host ----------
export const ElectivesHost: React.FC = () => {
  const { profile, pendingElectives, isHydrated } = useApp() as any;
  const [mode, setMode] = useState<null | 'choose' | 'setup'>(null);
  const [focus, setFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = ((e as CustomEvent).detail || {}) as { mode?: 'choose' | 'setup'; focus?: string };
      setFocus(d.focus);
      setMode(d.mode || 'choose');
    };
    window.addEventListener('electives:open', onOpen);
    return () => window.removeEventListener('electives:open', onOpen);
  }, []);

  // The first time a student's batch has elective slots to pick, ask once (the Home card stays until done)
  const pendingCount = (pendingElectives || []).length;
  useEffect(() => {
    if (!isHydrated || !profile || profile.role === 'faculty' || !profile.onboardingCompleted || pendingCount === 0) return;
    const k = `electives_asked_${profile.batchKey || 'own'}`;
    try {
      if (localStorage.getItem(k)) return;
      localStorage.setItem(k, '1');
    } catch {
      return;
    }
    const t = setTimeout(() => setMode((m) => m || 'choose'), 1500);
    return () => clearTimeout(t);
  }, [isHydrated, pendingCount, profile?.batchKey, profile?.role, profile?.onboardingCompleted]);

  return (
    <>
      <ChooserSheet open={mode === 'choose'} focus={focus} onClose={() => setMode(null)} onSetup={() => setMode('setup')} />
      <SetupSheet open={mode === 'setup'} onClose={() => setMode(null)} onSaved={() => setMode('choose')} />
    </>
  );
};

// ---------- Home: ask until picked ----------
export const ElectivesPromptCard: React.FC = () => {
  const { pendingElectives, profile } = useApp() as any;
  const pending: ResolvedElectiveGroup[] = pendingElectives || [];
  if (profile?.role === 'faculty' || pending.length === 0) return null;
  const names = pending.map((g) => g.label);
  return (
    <section className="border border-line bg-surface p-f4 sm:p-f5 flex items-center gap-f4">
      <div className="flex-1 min-w-0">
        <span className="inline-flex items-center h-6 px-2 border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300 text-[12px] font-semibold">
          {pending.length} to pick
        </span>
        <h3 className="mt-2.5 text-[19px] font-semibold text-fg tracking-tight">Pick your electives</h3>
        <p className="mt-1 text-[14px] leading-[20px] text-muted">
          {names.slice(0, 2).join(' and ')}
          {names.length > 2 ? ` +${names.length - 2}` : ''}. Pick yours so your timetable shows the right class, room and teacher.
        </p>
        <button type="button" onClick={() => openElectives({ focus: pending[0].key })} className="btn btn-primary mt-f4">
          Pick now <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <Illustration name="subjects" className="hidden sm:block h-[120px] w-auto shrink-0" />
    </section>
  );
};

// ---------- Timetable: your picks at a glance ----------
export const ElectivesSummary: React.FC = () => {
  const { electiveGroups, canSetUpElectives, profile } = useApp() as any;
  const groups: ResolvedElectiveGroup[] = electiveGroups || [];
  if (profile?.role === 'faculty') return null;
  if (groups.length === 0) {
    if (!canSetUpElectives) return null;
    return (
      <div className="flex flex-col">
        <span className="text-[12px] font-bold text-muted mb-1.5">Electives</span>
        <button
          type="button"
          onClick={() => openElectives({ mode: 'setup' })}
          className="flex items-center justify-between gap-3 p-3.5 bg-surface border border-dashed border-line-strong hover:bg-surface-2 transition-colors text-left cursor-pointer"
        >
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-semibold text-fg">Set up electives</span>
            <span className="text-[12px] text-muted">Mark the classes where students pick one</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-bold text-muted">Electives</span>
        {canSetUpElectives && (
          <button type="button" onClick={() => openElectives({ mode: 'setup' })} className="text-[12px] font-semibold text-fg underline underline-offset-4 decoration-line-strong hover:decoration-fg cursor-pointer">
            Set up
          </button>
        )}
      </div>
      <ul className="bg-surface border border-line divide-y divide-line-soft">
        {groups.map((g) => (
          <li key={g.key}>
            <button type="button" onClick={() => openElectives({ focus: g.key })} className="w-full flex items-center gap-3 px-3.5 h-12 text-left hover:bg-surface-2 transition-colors cursor-pointer">
              <span className="w-[96px] shrink-0 text-[12px] font-semibold text-muted truncate">{g.kind === 'pick' ? g.label : 'Optional'}</span>
              <span
                className={clsx(
                  'flex-1 min-w-0 truncate text-[14px] font-semibold',
                  g.status === 'pending' ? 'text-amber-700 dark:text-amber-300' : g.status === 'none' ? 'text-muted' : 'text-fg'
                )}
              >
                {g.status === 'chosen' ? g.chosen?.name : g.status === 'none' ? (g.kind === 'pick' ? 'None' : `Not taking ${g.label}`) : g.kind === 'pick' ? 'Pick yours' : `${g.label}?`}
              </span>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------- An unpicked slot in the timetable / today's timeline ----------
export const ElectivePendingCard: React.FC<{ mark: ElectivePendingMark; time?: string; className?: string }> = ({ mark, time, className }) => (
  <button
    type="button"
    onClick={() => openElectives({ focus: mark.groupKey })}
    className={clsx('w-full text-left border border-dashed border-line-strong bg-surface hover:bg-surface-2 transition-colors p-4 sm:p-[18px] cursor-pointer', className)}
  >
    <span className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">{mark.kind === 'pick' ? 'Elective · pick yours' : 'Optional · do you take it?'}</span>
      {time && <span className="shrink-0 text-[12px] font-medium text-muted tabular-nums">{time}</span>}
    </span>
    <span className="mt-1.5 block text-[17px] font-semibold text-fg tracking-tight leading-snug">{mark.label}</span>
    {mark.kind === 'pick' && <span className="mt-1 block text-[13px] text-muted line-clamp-2">{mark.options.map((o) => o.name).join(' · ')}</span>}
    <span className="mt-3 inline-flex items-center gap-1 h-8 px-3 bg-ink text-on-ink text-[13px] font-semibold">
      {mark.kind === 'pick' ? 'Choose' : 'Decide'} <ChevronRight className="w-4 h-4" />
    </span>
  </button>
);
