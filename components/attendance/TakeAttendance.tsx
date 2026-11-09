'use client';

import React, { useMemo, useState } from 'react';
import { X, Search, LayoutGrid, List, Loader2, CornerDownLeft } from '@/components/ui/icons';
import { Mark, RosterStudent, rollTail } from '@/lib/attendance';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Built for speed: everyone starts present, the faculty only touches the absentees.
// Tap a tile to mark absent (tap again to undo), or type the absent roll numbers in one go.
const MARK_STYLE: Record<Mark, string> = {
  P: 'bg-surface border-line text-fg',
  A: 'bg-rose-600 border-rose-600 text-white',
};
const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

export const TakeAttendance: React.FC<{
  students: RosterStudent[];
  initialMarks?: Record<string, Mark> | null;
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: (marks: Record<string, Mark>) => Promise<void>;
  /** Only for a lecture already saved: removing a record is rare, so it lives here, not on every row */
  onDelete?: () => void;
}> = ({ students, initialMarks, title, subtitle, onClose, onSave, onDelete }) => {
  const start = useMemo(() => {
    const m: Record<string, Mark> = {};
    // Anything other than absent (including old "late" marks) counts as present
    students.forEach((s) => (m[s.key] = (initialMarks?.[s.key] as string) === 'A' ? 'A' : 'P'));
    return m;
  }, [students, initialMarks]);
  const [marks, setMarks] = useState<Record<string, Mark>>(start);
  const [view, setView] = useState<'grid' | 'list'>(students.length > 24 ? 'grid' : 'list');
  const [filter, setFilter] = useState<'all' | 'A'>('all');
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const dirty = students.some((s) => marks[s.key] !== start[s.key]);
  const counts = students.reduce(
    (acc, s) => {
      acc[marks[s.key]]++;
      return acc;
    },
    { P: 0, A: 0 } as Record<Mark, number>
  );

  const set = (key: string, m: Mark) => {
    buzz();
    setMarks((p) => ({ ...p, [key]: m }));
  };
  const setAll = (m: Mark) => setMarks(Object.fromEntries(students.map((s) => [s.key, m])));

  const toggle = (key: string) => set(key, marks[key] === 'A' ? 'P' : 'A');

  // "12 15 31" → those roll endings become absent
  const applyQuick = () => {
    const tokens = quick.split(/[\s,;]+/).map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (!tokens.length) return;
    const hit: string[] = [];
    const miss: string[] = [];
    const ambiguous: string[] = [];
    const next = { ...marks };
    tokens.forEach((t) => {
      const exact = students.filter((s) => s.roll === t);
      const pool = exact.length ? exact : students.filter((s) => s.roll.endsWith(t) || rollTail(s.roll) === t.replace(/^0+/, '') || rollTail(s.roll).replace(/^0+/, '') === t.replace(/^0+/, ''));
      if (pool.length === 1) {
        next[pool[0].key] = 'A';
        hit.push(pool[0].roll || t);
      } else if (pool.length > 1) ambiguous.push(t);
      else miss.push(t);
    });
    buzz();
    setMarks(next);
    setQuick('');
    setQuickNote(
      [hit.length ? `${hit.length} marked absent` : '', ambiguous.length ? `type more digits for ${ambiguous.join(', ')}` : '', miss.length ? `not found: ${miss.join(', ')}` : '']
        .filter(Boolean)
        .join(' · ')
    );
  };

  const q = query.trim().toLowerCase();
  const visible = students.filter((s) => (filter === 'all' || marks[s.key] === filter) && (!q || s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(marks);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex flex-col font-sans select-none" role="dialog" aria-modal="true" aria-label="Take attendance">
      <header className="sheen shrink-0 border-b border-line bg-canvas" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-3xl mx-auto w-full px-f4 h-14 flex items-center gap-2">
          <button type="button" onClick={() => (dirty ? setConfirmClose(true) : onClose())} aria-label="Close" className="w-11 h-11 -ml-2 flex items-center justify-center text-fg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-fg truncate">{title}</h2>
            <p className="text-[12px] text-muted truncate">{subtitle}</p>
          </div>
          <div className="flex border border-line" role="radiogroup" aria-label="Layout">
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                aria-label={v === 'grid' ? 'Grid' : 'List'}
                onClick={() => setView(v)}
                className={`w-9 h-9 flex items-center justify-center cursor-pointer ${view === v ? 'bg-ink text-on-ink' : 'text-[#6B6B6B]'}`}
              >
                {v === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Fast lane: type the absentees' roll endings */}
        <div className="max-w-3xl mx-auto w-full px-f4 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyQuick();
            }}
            className="flex gap-2"
          >
            <input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              inputMode="numeric"
              placeholder="Absent rolls, e.g. 12 15 31"
              aria-label="Absent roll numbers"
              className="flex-1 h-11 px-3.5 bg-surface border border-line text-[15px] font-mono text-fg focus:outline-none focus:border-line-strong"
            />
            <button type="submit" disabled={!quick.trim()} className="h-11 px-3 inline-flex items-center gap-1.5 bg-rose-600 text-white text-[14px] font-semibold disabled:opacity-40 cursor-pointer">
              <CornerDownLeft className="w-4 h-4" /> Absent
            </button>
          </form>
          {quickNote && <p className="mt-1.5 text-[12px] text-muted">{quickNote}</p>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-f4 py-f3 flex flex-col gap-f3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(
              [
                ['all', `All ${students.length}`],
                ['A', `Absent ${counts.A}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`shrink-0 h-9 px-3 border text-[13px] font-medium tabular-nums cursor-pointer ${
                  filter === id ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="flex-1" />
            <button type="button" onClick={() => setAll('P')} className="shrink-0 h-9 px-2 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer">
              All present
            </button>
          </div>

          {view === 'list' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a student" aria-label="Find a student" className="w-full h-11 pl-10 pr-3 bg-surface border border-line text-[15px] text-fg focus:outline-none" />
            </div>
          )}

          {view === 'grid' ? (
            <>
              <p className="text-[12px] text-muted">Tap to mark absent · tap again to undo</p>
              <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {visible.map((s) => {
                  const m = marks[s.key];
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => toggle(s.key)}
                        aria-pressed={m === 'A'}
                        aria-label={`${s.roll} ${s.name}: ${m === 'A' ? 'absent' : 'present'}`}
                        className={`w-full aspect-square flex flex-col items-center justify-center border-2 transition-colors active:scale-95 cursor-pointer touch-manipulation ${MARK_STYLE[m]}`}
                      >
                        <span className="text-[22px] font-semibold leading-none tabular-nums">{rollTail(s.roll)}</span>
                        <span className={`mt-1 max-w-full px-1 truncate text-[11px] ${m === 'P' ? 'text-muted' : ''}`}>{s.name.split(' ')[0]}</span>
                        {m === 'A' && <span className="text-[12px] font-bold ">Absent</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <ul className="border border-line bg-surface divide-y divide-line-soft">
              {visible.map((s) => {
                const m = marks[s.key];
                return (
                  <li key={s.key} className={`flex items-center gap-f3 px-f4 py-2.5 ${m === 'A' ? 'bg-rose-50/70 dark:bg-rose-500/[0.07]' : ''}`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-medium text-fg truncate">{s.name}</span>
                      <span className="block font-mono text-[12px] text-muted truncate">{s.roll || 'No roll'}</span>
                    </span>
                    <span className="flex shrink-0 border border-line" role="radiogroup" aria-label={`${s.name} attendance`}>
                      {(['P', 'A'] as Mark[]).map((x) => (
                        <button
                          key={x}
                          type="button"
                          role="radio"
                          aria-checked={m === x}
                          aria-label={x === 'P' ? 'Present' : 'Absent'}
                          onClick={() => set(s.key, x)}
                          className={`w-11 h-11 text-[14px] font-semibold cursor-pointer ${
                            m === x ? (x === 'P' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'text-[#8A8A8A]'
                          }`}
                        >
                          {x}
                        </button>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {visible.length === 0 && <p className="py-f5 text-center text-[14px] text-muted">{filter === 'all' ? 'No one matches.' : 'No one is absent.'}</p>}
          {onDelete && (
            <div className="mt-f5 pt-f4 border-t border-line-soft text-center">
              <button type="button" onClick={onDelete} className="h-11 px-3 text-[14px] font-semibold text-rose-600 dark:text-rose-400 hover:underline underline-offset-4 cursor-pointer">
                Delete this lecture&apos;s record
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Always-visible totals and save */}
      <footer className="shrink-0 border-t border-line bg-canvas" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
        <div className="max-w-3xl mx-auto w-full px-f4 pt-3 flex items-center gap-f3">
          <div className="flex items-baseline gap-3 text-[14px] tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-400">
              <b className="text-[20px]">{counts.P}</b> P
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              <b className="text-[20px]">{counts.A}</b> A
            </span>
          </div>
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary ml-auto">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialMarks ? 'Update' : 'Save'}
          </button>
        </div>
      </footer>

      <ConfirmModal
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={onClose}
        title="Discard changes?"
        description="The marks you changed in this lecture won't be saved."
        confirmLabel="Discard"
        cancelLabel="Keep marking"
        variant="danger"
      />
    </div>
  );
};
