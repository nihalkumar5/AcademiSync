'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Check, Lock, Loader2, AlertTriangle, UserPlus, RefreshCw } from '@/components/ui/icons';
import { Roster, RosterStudent, MemberCandidate, fetchBatchMembersInfo, saveRoster, byRoll, attendanceErrorText } from '@/lib/attendance';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Step 1: the faculty reviews who is in the batch and locks the class list.
// Joining a batch with its code never puts anyone on this list by itself.
export const RosterSetup: React.FC<{
  facultyId: string;
  batchKey: string;
  batchLabel: string;
  roster: Roster | null;
  /** The subjects this teacher teaches in the batch: an elective's teacher starts from the students who picked it */
  teaches?: { ids: string[]; names: string[] };
  onClose: () => void;
  onSaved: (r: Roster) => void;
}> = ({ facultyId, batchKey, batchLabel, roster, teaches, onClose, onSaved }) => {
  const editing = !!roster;
  const [members, setMembers] = useState<MemberCandidate[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [manual, setManual] = useState<RosterStudent[]>(() => (roster?.students || []).filter((s) => s.manual));
  const [selected, setSelected] = useState<Set<string>>(() => new Set((roster?.students || []).map((s) => s.key)));
  const [query, setQuery] = useState('');
  const [addName, setAddName] = useState('');
  const [addRoll, setAddRoll] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [electiveInfo, setElectiveInfo] = useState<{ names: string[]; picked: number; undecided: number } | null>(null);

  const load = async () => {
    setLoadError('');
    try {
      const { members: list, electiveSubjects } = await fetchBatchMembersInfo(batchKey);
      setMembers(list);
      // An elective's teacher starts from the students who picked it; everyone else from the whole batch
      const n = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const ids = teaches?.ids || [];
      const names = (teaches?.names || []).map(n);
      const mine = electiveSubjects.filter((e) => ids.includes(e.id) || names.includes(n(e.name)) || (!!e.code && names.includes(n(e.code))));
      const onlyElectives = mine.length > 0 && mine.length >= Math.max(ids.length, names.length);
      if (onlyElectives) {
        const mineIds = new Set(mine.map((e) => e.id));
        const takers = list.filter((m) => (m.electivePicks || []).some((id) => mineIds.has(id)));
        setElectiveInfo({ names: mine.map((e) => e.name), picked: takers.length, undecided: list.filter((m) => m.electivesPending && !takers.includes(m)).length });
        if (!roster) setSelected(new Set(takers.map((m) => m.key)));
      } else if (!roster) {
        // First time: everyone in the batch starts selected so the faculty only removes strangers
        setSelected(new Set(list.map((m) => m.key)));
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load the batch');
      setMembers([]);
    }
  };
  useEffect(() => {
    load();
  }, [batchKey]);

  const lockedKeys = new Set((roster?.students || []).map((s) => s.key));
  const dismissed = new Set(roster?.dismissed || []);

  // Everyone we can show: current list (kept even if they left the batch), batch members, manual adds
  const all: (RosterStudent & { isNew?: boolean; leftBatch?: boolean })[] = useMemo(() => {
    const map = new Map<string, RosterStudent & { isNew?: boolean; leftBatch?: boolean }>();
    (roster?.students || []).forEach((s) => map.set(s.key, { ...s, leftBatch: !s.manual && !!members && !members.some((m) => m.key === s.key) }));
    (members || []).forEach((m) => {
      if (!map.has(m.key)) map.set(m.key, { key: m.key, uid: m.uid, name: m.name, roll: m.roll, isNew: editing && !dismissed.has(m.key) });
      else map.set(m.key, { ...map.get(m.key)!, name: m.name || map.get(m.key)!.name, roll: m.roll || map.get(m.key)!.roll });
    });
    manual.forEach((s) => map.set(s.key, s));
    return Array.from(map.values()).sort(byRoll);
  }, [members, manual, roster]);

  // Flag what a reviewer should look at twice
  const rollCounts = all.reduce<Record<string, number>>((acc, s) => {
    if (s.roll) acc[s.roll] = (acc[s.roll] || 0) + 1;
    return acc;
  }, {});
  const flagsFor = (s: RosterStudent) => [!s.roll ? 'No roll number' : null, s.roll && rollCounts[s.roll] > 1 ? 'Duplicate roll' : null].filter(Boolean) as string[];

  const q = query.trim().toLowerCase();
  const visible = all.filter((s) => !q || s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q));
  const newcomers = editing ? visible.filter((s) => s.isNew && !lockedKeys.has(s.key)) : [];
  const rest = editing ? visible.filter((s) => !(s.isNew && !lockedKeys.has(s.key))) : visible;
  const flaggedCount = all.filter((s) => selected.has(s.key) && flagsFor(s).length).length;

  const toggle = (k: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const addManual = () => {
    const name = addName.trim();
    const roll = addRoll.trim().toUpperCase();
    if (!name || !roll) return;
    const key = `m_${roll}`;
    if (all.some((s) => s.key === key || s.roll === roll)) return;
    setManual((p) => [...p, { key, name, roll, manual: true }]);
    setSelected((p) => new Set(p).add(key));
    setAddName('');
    setAddRoll('');
  };

  const finalize = async () => {
    setSaving(true);
    const students = all.filter((s) => selected.has(s.key)).map(({ key, uid, name, roll, manual: m }) => ({ key, ...(uid ? { uid } : {}), name, roll, ...(m ? { manual: true } : {}) }));
    // Anyone left out on purpose stays out, and isn't shown as "new" next time
    const left = all.filter((s) => !selected.has(s.key) && !s.manual && s.uid).map((s) => s.key);
    const next: Roster = {
      facultyId,
      batchKey,
      batchLabel,
      students,
      dismissed: Array.from(new Set([...(roster?.dismissed || []).filter((k) => !selected.has(k)), ...left])),
      lockedAt: roster?.lockedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // The version you opened, so a change made on another device in the meantime isn't overwritten
      ...(roster ? { version: roster.version ?? 0 } : {}),
    };
    setSaveError('');
    try {
      await saveRoster(next);
      onSaved(next);
    } catch (err: any) {
      console.error('Save class list failed:', err);
      setSaveError(attendanceErrorText(err));
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  };

  const Row = ({ s }: { s: RosterStudent & { isNew?: boolean; leftBatch?: boolean } }) => {
    const on = selected.has(s.key);
    const flags = flagsFor(s);
    return (
      <li>
        <button type="button" onClick={() => toggle(s.key)} aria-pressed={on} className="w-full flex items-center gap-f3 px-f4 py-3 text-left hover:bg-surface-2 cursor-pointer">
          <span className={`w-6 h-6 shrink-0 border-2 flex items-center justify-center ${on ? 'bg-ink border-line-strong text-on-ink' : 'border-[#BDBDBD] dark:border-white/30'}`}>
            {on && <Check className="w-4 h-4" strokeWidth={3} />}
          </span>
          <span className="w-[86px] shrink-0 font-mono text-[13px] font-semibold text-fg truncate">{s.roll || '—'}</span>
          <span className="flex-1 min-w-0">
            <span className={`block text-[15px] truncate ${on ? 'text-fg' : 'text-[#8A8A8A]'}`}>{s.name}</span>
            {(flags.length > 0 || s.manual || s.leftBatch) && (
              <span className="flex flex-wrap gap-x-2 text-[12px]">
                {flags.map((f) => (
                  <span key={f} className="text-amber-700 dark:text-amber-400">{f}</span>
                ))}
                {s.manual && <span className="text-muted">Added by you</span>}
                {s.leftBatch && <span className="text-muted">Left the batch</span>}
              </span>
            )}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex flex-col font-sans" role="dialog" aria-modal="true" aria-label="Class list">
      <header className="sheen shrink-0 border-b border-line bg-canvas" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-3xl mx-auto w-full px-f4 h-14 flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -ml-2 flex items-center justify-center text-fg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[12px] text-muted">{editing ? 'Edit class list' : 'Step 1 of 2'}</p>
            <h2 className="text-[16px] font-semibold text-fg truncate">{batchLabel}</h2>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-f4 py-f4 flex flex-col gap-f4">
          <div className="p-f4 border border-line bg-surface">
            <p className="text-[17px] font-semibold text-fg">{editing ? 'Who is in this class?' : 'Confirm your class list'}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Only students you tick here appear in attendance. Anyone who joins the batch with its code later stays out until you add them.
            </p>
          </div>

          {electiveInfo && (
            <div className="p-f3 border border-line bg-surface-2 text-[14px] leading-relaxed text-fg">
              <span className="font-semibold">{electiveInfo.names.join(', ')}</span> {electiveInfo.names.length > 1 ? 'are electives' : 'is an elective'}.
              {!editing && ` We ticked the ${electiveInfo.picked} ${electiveInfo.picked === 1 ? 'student' : 'students'} who picked it in the app.`}
              {electiveInfo.undecided > 0 && ` ${electiveInfo.undecided} ${electiveInfo.undecided === 1 ? 'student hasn’t' : 'students haven’t'} picked their elective yet. Tick them if they sit in your class.`}
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or roll number"
              aria-label="Search students"
              className="w-full h-12 pl-10 pr-4 bg-surface border border-line text-[15px] text-fg focus:outline-none focus:border-line-strong"
            />
          </div>

          {members === null ? (
            <div className="flex items-center gap-2 py-f5 justify-center text-[14px] text-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading batch members…
            </div>
          ) : (
            <>
              {loadError && (
                <div className="flex items-center justify-between gap-3 p-f3 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 text-[14px] text-fg">
                  <span>{loadError}</span>
                  <button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold cursor-pointer">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              )}

              {newcomers.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-[15px] font-semibold text-fg">Joined since you locked</h3>
                    <span className="text-[13px] text-amber-700 dark:text-amber-400">{newcomers.length} to review</span>
                  </div>
                  <ul className="border border-amber-300/70 dark:border-amber-500/30 bg-surface divide-y divide-line-soft">
                    {newcomers.map((s) => (
                      <Row key={s.key} s={s} />
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-muted tabular-nums">
                    {selected.size} of {all.length} selected
                  </span>
                  <div className="flex gap-3 text-[13px] font-semibold text-fg">
                    <button type="button" onClick={() => setSelected(new Set(all.map((s) => s.key)))} className="hover:underline underline-offset-4 cursor-pointer">
                      Select all
                    </button>
                    <button type="button" onClick={() => setSelected(new Set())} className="hover:underline underline-offset-4 cursor-pointer">
                      Clear
                    </button>
                  </div>
                </div>
                {rest.length === 0 && newcomers.length === 0 ? (
                  <p className="py-f5 text-center text-[14px] text-muted border border-dashed border-line">
                    {q ? 'No one matches that.' : 'No one has joined this batch yet. Add students by hand below.'}
                  </p>
                ) : (
                  <ul className="border border-line bg-surface divide-y divide-line-soft">
                    {rest.map((s) => (
                      <Row key={s.key} s={s} />
                    ))}
                  </ul>
                )}
              </section>

              {/* Students who aren't on the app yet */}
              <section>
                <h3 className="text-[15px] font-semibold text-fg mb-2">Add a student by hand</h3>
                <div className="grid grid-cols-[110px_1fr_auto] gap-2">
                  <input value={addRoll} onChange={(e) => setAddRoll(e.target.value)} placeholder="Roll no." aria-label="Roll number" className="h-11 px-3 font-mono uppercase bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-[#111111]" />
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="Full name" aria-label="Full name" className="h-11 px-3 bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-[#111111]" />
                  <button type="button" onClick={addManual} disabled={!addName.trim() || !addRoll.trim()} aria-label="Add student" className="h-11 w-11 flex items-center justify-center border border-line text-fg disabled:opacity-40 cursor-pointer">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-line bg-canvas" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
        {saveError && (
          <p role="alert" className="max-w-3xl mx-auto w-full px-f4 pt-3 flex items-start gap-1.5 text-[13px] text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {saveError}
          </p>
        )}
        <div className="max-w-3xl mx-auto w-full px-f4 pt-3 flex items-center gap-f3">
          {flaggedCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" /> {flaggedCount} to double-check
            </span>
          )}
          <button
            type="button"
            disabled={selected.size === 0 || members === null}
            onClick={() => setConfirm(true)}
            className="btn btn-primary flex-1 sm:flex-none sm:ml-auto"
          >
            <Lock className="w-4 h-4" /> {editing ? 'Save and lock' : 'Finalize'} · {selected.size}
          </button>
        </div>
      </footer>

      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={finalize}
        title={editing ? 'Save this class list?' : 'Lock this class list?'}
        description={`${selected.size} students will be marked in every lecture. Only you can change this list later.${flaggedCount ? ` ${flaggedCount} entries are flagged — check them first.` : ''}`}
        confirmLabel={editing ? 'Save and lock' : 'Lock list'}
        cancelLabel="Review again"
        variant="primary"
        isLoading={saving}
      />
    </div>
  );
};
