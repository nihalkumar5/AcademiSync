'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { Illustration } from '@/components/ui/Illustration';
import { SignInPanel } from '@/components/auth/SignInPrompt';
import { ChevronRight, Plus, Search, Share2, Users, X } from '@/components/ui/icons';
import { MyNote, SharedNote, notesApi, openClassNotes, subjectKeyOf } from '@/lib/classNotes';
import { getPhoto } from '@/lib/notePhotos';
import { noteShareText, shareNoteExternally } from '@/lib/shareNote';
import { getTodayDateString } from '@/lib/timetableUtils';
import { subjectLabel, subjectTone } from '@/lib/assignmentDisplay';
import { LocalPhoto, cacheMine, readMineCache } from './ClassNotesHost';
import type { Subject } from '@/lib/types';

// Notes page: everything saved in class, in one place. Newest first, grouped by day, filter by
// subject. Tapping a note opens that class's notes sheet, where you can add more or delete.

type Tab = 'mine' | 'class';
type AnyNote = (MyNote | SharedNote) & { kind: Tab };

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (date: string) => {
  const today = getTodayDateString();
  if (date === today) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (date === dayKey(y)) return 'Yesterday';
  const dt = new Date(`${date}T00:00:00`);
  if (isNaN(dt.getTime())) return date;
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const NotesView: React.FC = () => {
  const { user, subjects = [], showToast } = useApp() as any;
  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<MyNote[]>([]);
  const [shared, setShared] = useState<SharedNote[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [hasBatch, setHasBatch] = useState(true);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [viewer, setViewer] = useState<string | null>(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const [pickOpen, setPickOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const d = await notesApi('GET', '?all=1');
      setMine(d.mine || []);
      cacheMine(user.id, d.mine || []);
      setShared(d.shared || []);
      setHasBatch(!!d.hasBatch);
      setOffline(false);
    } catch {
      setMine(readMineCache(user.id));
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('classnotes:changed', onChange);
    return () => window.removeEventListener('classnotes:changed', onChange);
  }, [load]);

  // Notes are matched to a subject by id, or by name when the id changed
  const subjectOf = useCallback(
    (n: { subjectId: string; subjectName: string }): Subject | undefined =>
      (subjects as Subject[]).find((s) => s.id === n.subjectId) ||
      (subjects as Subject[]).find((s) => subjectKeyOf(s.name) === subjectKeyOf(n.subjectName)),
    [subjects]
  );
  const keyOf = (n: { subjectId: string; subjectName: string }) => subjectKeyOf(n.subjectName) || n.subjectId;

  const all: AnyNote[] = useMemo(
    () => (tab === 'mine' ? mine.map((n) => ({ ...n, kind: 'mine' as Tab })) : shared.map((n) => ({ ...n, kind: 'class' as Tab }))),
    [tab, mine, shared]
  );

  // Subjects that actually have notes, most notes first
  const subjectChips = useMemo(() => {
    const m = new Map<string, { key: string; name: string; count: number; sample: AnyNote }>();
    all.forEach((n) => {
      const k = keyOf(n);
      const cur = m.get(k);
      if (cur) cur.count++;
      else m.set(k, { key: k, name: n.subjectName || 'Class', count: 1, sample: n });
    });
    return Array.from(m.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [all]);

  useEffect(() => {
    if (subjectFilter !== 'all' && !subjectChips.some((c) => c.key === subjectFilter)) setSubjectFilter('all');
  }, [subjectChips, subjectFilter]);

  const query = q.trim().toLowerCase();
  const shown = all
    .filter((n) => subjectFilter === 'all' || keyOf(n) === subjectFilter)
    .filter((n) => !query || n.text.toLowerCase().includes(query) || n.subjectName.toLowerCase().includes(query) || ('byName' in n && n.byName.toLowerCase().includes(query)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const groups: { date: string; items: AnyNote[] }[] = [];
  shown.forEach((n) => {
    const g = groups[groups.length - 1];
    if (g && g.date === n.date) g.items.push(n);
    else groups.push({ date: n.date, items: [n] });
  });

  // Send a note out through the phone's share menu (WhatsApp and other apps), photo included
  const shareOut = async (n: MyNote) => {
    if (sharingId) return;
    setSharingId(n.id);
    try {
      const photo = n.photos[0] ? await getPhoto(n.photos[0]) : null;
      const result = await shareNoteExternally({ title: n.subjectName || 'Class note', text: noteShareText(n), photo });
      if (result === 'text-only') showToast?.('Shared the text', "This version of the app can't attach the photo yet.", 'info');
      else if (result === 'error') showToast?.("Couldn't open sharing", 'Try again.', 'error');
    } finally {
      setSharingId(null);
    }
  };

  const openSlot = (n: AnyNote) =>
    openClassNotes({ subjectId: subjectOf(n)?.id || n.subjectId, subjectName: n.subjectName, date: n.date, startTime: n.startTime || undefined });

  const subjectCount = new Set(mine.map(keyOf)).size;

  if (!user?.id) {
    return (
      <div className="flex flex-col gap-f5 text-left max-w-3xl mx-auto w-full pb-f7">
        <h2 className="page-title">Notes</h2>
        <SignInPanel
          title="Sign in to keep your class notes"
          body="Snap the board or jot a line in class. It's saved to that subject and date, so you can find it before exams."
          perks={['Every note filed by subject and date', 'Search across all your notes', 'Share useful ones with your batch']}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-f5 text-left max-w-3xl mx-auto w-full pb-f7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="page-title">Notes</h2>
          <p className="text-[14px] text-muted mt-1.5">
            {loading && mine.length === 0
              ? 'Everything you saved in class'
              : `${mine.length} ${mine.length === 1 ? 'note' : 'notes'}${subjectCount ? ` · ${subjectCount} ${subjectCount === 1 ? 'subject' : 'subjects'}` : ''}`}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" onClick={() => setPickOpen(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> New note
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-f3">
        {/* Mine / Class */}
        <div className="flex items-end gap-f4 border-b border-line" role="tablist">
          {(['mine', 'class'] as const).map((t) => {
            const count = t === 'mine' ? mine.length : shared.length;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setSubjectFilter('all');
                }}
                className={clsx(
                  '-mb-px h-10 inline-flex items-center gap-1.5 border-b-2 text-[14px] font-semibold transition-colors cursor-pointer',
                  tab === t ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'
                )}
              >
                {t === 'mine' ? 'My notes' : 'Class notes'}
                {count > 0 && <span className="text-[12px] font-medium text-faint tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search */}
        {all.length > 0 && (
          <label className="flex items-center gap-2.5 h-11 px-3 border border-line bg-surface focus-within:border-fg transition-colors">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === 'mine' ? 'Search your notes' : 'Search class notes'}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-fg placeholder:text-faint focus:outline-none"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="w-7 h-7 flex items-center justify-center text-muted hover:text-fg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </label>
        )}

        {/* Subjects that have notes */}
        {subjectChips.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter by subject">
            <button
              type="button"
              onClick={() => setSubjectFilter('all')}
              className={clsx('shrink-0 h-9 px-3 inline-flex items-center gap-1.5 border text-[13px] font-semibold transition-colors cursor-pointer', subjectFilter === 'all' ? 'bg-ink text-on-ink border-ink' : 'bg-surface border-line text-fg hover:bg-surface-2')}
            >
              All
            </button>
            {subjectChips.map((c) => {
              const s = subjectOf(c.sample);
              const tone = subjectTone(s, c.name);
              const active = subjectFilter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSubjectFilter(active ? 'all' : c.key)}
                  className={clsx('shrink-0 h-9 px-3 inline-flex items-center gap-2 border text-[13px] font-semibold transition-colors cursor-pointer', active ? 'bg-ink text-on-ink border-ink' : 'bg-surface border-line text-fg hover:bg-surface-2')}
                  style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}
                >
                  <span className="w-2 h-2 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]" aria-hidden="true" />
                  {subjectLabel(s, c.name).code || c.name}
                  <span className={clsx('text-[12px] font-medium tabular-nums', active ? 'text-on-ink/60' : 'text-faint')}>{c.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {offline && <p className="text-[13px] text-muted">You&apos;re offline. Showing the notes saved on this phone.</p>}

      {/* List */}
      {loading && all.length === 0 ? (
        <div className="flex flex-col gap-2" aria-label="Loading notes">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-line-soft bg-surface px-f4 py-f3 animate-pulse">
              <div className="h-3 w-1/3 bg-line" />
              <div className="mt-3 h-3 w-4/5 bg-line-soft" />
              <div className="mt-2 h-3 w-1/2 bg-line-soft" />
            </div>
          ))}
        </div>
      ) : tab === 'class' && !hasBatch ? (
        <EmptyNotes art="friends" title="Join your class batch" body="Class notes are shared with everyone in your batch. Join it from Profile to see them." />
      ) : all.length === 0 ? (
        tab === 'mine' ? (
          <EmptyNotes
            art="notes"
            title="No notes yet"
            body="In class, tap Snap board or Add note on the live card. Every note lands here, filed by subject and date."
            action={
              <button type="button" onClick={() => setPickOpen(true)} className="btn btn-primary mt-f4">
                <Plus className="w-4 h-4" /> New note
              </button>
            }
          />
        ) : (
          <EmptyNotes art="friends" title="No class notes yet" body="When someone shares a note with your batch, it shows up here for everyone." />
        )
      ) : shown.length === 0 ? (
        <p className="py-f5 text-center text-[14px] text-muted">No notes match &ldquo;{q}&rdquo;.</p>
      ) : (
        <div className="flex flex-col gap-f5">
          {groups.map((g) => (
            <section key={g.date}>
              <h3 className="mb-f2 text-[13px] font-semibold text-muted">{dayLabel(g.date)}</h3>
              <ul className="flex flex-col gap-2">
                {g.items.map((n) => {
                  const s = subjectOf(n);
                  const tone = subjectTone(s, n.subjectName);
                  const label = subjectLabel(s, n.subjectName);
                  const photos = n.kind === 'mine' ? (n as MyNote).photos : [];
                  const image = n.kind !== 'mine' ? (n as SharedNote).imageUrl : null;
                  return (
                    <li key={n.id} className="bg-surface border border-line" style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}>
                      <button type="button" onClick={() => openSlot(n)} className="group w-full text-left px-f4 pt-f3 pb-f3 cursor-pointer hover:bg-surface-2/60 transition-colors">
                        <span className="flex items-center gap-2 text-[12px]">
                          <span className="w-2.5 h-2.5 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]" aria-hidden="true" />
                          {label.code && <span className="font-bold tracking-wide text-fg">{label.code}</span>}
                          {label.code && <span className="text-faint">·</span>}
                          <span className="font-medium text-muted truncate">{label.name}</span>
                          <span className="ml-auto shrink-0 text-faint tabular-nums">{timeOf(n.createdAt)}</span>
                          <ChevronRight className="w-4 h-4 shrink-0 text-faint group-hover:text-fg transition-colors" />
                        </span>
                        {n.text ? (
                          <span className="mt-2 block text-[15px] leading-[22px] text-fg whitespace-pre-wrap break-words line-clamp-4">{n.text}</span>
                        ) : photos.length || image ? null : (
                          <span className="mt-2 block text-[14px] text-muted">Empty note</span>
                        )}
                        {n.kind === 'class' && (
                          <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
                            <Users className="w-3 h-3" /> {(n as SharedNote).mine ? 'You' : (n as SharedNote).byName}
                          </span>
                        )}
                      </button>
                      {n.kind === 'mine' && (
                        <div className="px-f4 pb-f3 -mt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => shareOut(n as MyNote)}
                            disabled={sharingId === n.id}
                            className="h-8 px-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-fg hover:bg-surface-2 cursor-pointer disabled:opacity-50"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Share
                          </button>
                        </div>
                      )}
                      {photos.length > 0 && (
                        <div className={clsx('px-f4 pb-f3 grid grid-cols-4 gap-1.5', !n.text && '-mt-1')}>
                          {photos.slice(0, 4).map((id) => (
                            <LocalPhoto key={id} id={id} onOpen={setViewer} />
                          ))}
                        </div>
                      )}
                      {image && (
                        <div className="px-f4 pb-f3">
                          <button type="button" onClick={() => setViewer(image)} className="block w-full border border-line overflow-hidden cursor-pointer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image} alt="Shared class photo" className="w-full max-h-[240px] object-cover" loading="lazy" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* New note: pick the subject, then the class sheet opens for today */}
      <Modal isOpen={pickOpen} onClose={() => setPickOpen(false)} title="New note" description="Which subject is it for?" maxWidth="md">
        {(subjects as Subject[]).length === 0 ? (
          <p className="text-[14px] text-muted">Add your timetable first, then your subjects show up here.</p>
        ) : (
          <ul className="-mx-1 max-h-[60vh] overflow-y-auto">
            {[...(subjects as Subject[])]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => {
                const tone = subjectTone(s);
                const label = subjectLabel(s);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPickOpen(false);
                        openClassNotes({ subjectId: s.id, subjectName: s.name, date: getTodayDateString(), focus: 'text' });
                      }}
                      className="w-full h-12 px-1 flex items-center gap-3 text-left hover:bg-surface-2 cursor-pointer"
                      style={{ '--sub': tone.accent, '--sub-dark': tone.darkAccent } as React.CSSProperties}
                    >
                      <span className="w-2.5 h-2.5 shrink-0 bg-[var(--sub)] dark:bg-[var(--sub-dark)]" aria-hidden="true" />
                      <span className="flex-1 min-w-0 truncate text-[15px] font-medium text-fg">{s.name}</span>
                      {label.code && <span className="text-[12px] font-bold tracking-wide text-muted">{label.code}</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </Modal>

      <PhotoViewer url={viewer} onClose={closeViewer} alt="Note photo" />
    </div>
  );
};

const EmptyNotes: React.FC<{ art: 'notes' | 'friends'; title: string; body: string; action?: React.ReactNode }> = ({ art, title, body, action }) => (
  <section className="border border-line bg-surface px-5 py-f5 flex flex-col items-center text-center">
    <Illustration name={art} className="h-[140px] w-auto" />
    <h3 className="mt-f4 text-[18px] font-semibold text-fg">{title}</h3>
    <p className="mt-1.5 text-[14px] text-muted max-w-sm">{body}</p>
    {action}
  </section>
);
