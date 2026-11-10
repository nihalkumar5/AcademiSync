'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import { Illustration } from '@/components/ui/Illustration';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { AlertTriangle, Camera, ImageIcon, Loader2, Lock, Share2, Smartphone, Trash2, Users, X } from '@/components/ui/icons';
import { formatTime12Hour, getTodayDateString } from '@/lib/timetableUtils';
import { MAX_NOTE_CHARS, MAX_SHARED_IMAGE_KB, MyNote, NoteSlot, SharedNote, notesApi, subjectKeyOf } from '@/lib/classNotes';
import { compressPhoto, deletePhoto, getPhoto, savePhoto } from '@/lib/notePhotos';
import { noteShareText, shareNoteExternally } from '@/lib/shareNote';

// One notes sheet for the whole app. Open it with openClassNotes(slot) from lib/classNotes.
// The hidden camera / gallery inputs live outside the sheet, so "Snap" can open the camera
// in the same tap (browsers only allow that during the click itself).

const QUICK = ['Exam', 'Important', 'Assignment', 'Revise'];
const dateLabel = (d: string) => {
  const today = getTodayDateString();
  if (d === today) return 'Today';
  const dt = new Date(`${d}T00:00:00`);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  if (d === yKey) return 'Yesterday';
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/** A photo kept on this phone. Shows a placeholder if it was taken on another phone. */
export const LocalPhoto: React.FC<{ id: string; onOpen: (url: string) => void }> = ({ id, onOpen }) => {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let u: string | null = null;
    let alive = true;
    getPhoto(id).then((b) => {
      if (!alive) return;
      u = b ? URL.createObjectURL(b) : null;
      setUrl(u);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  if (url === undefined) return <div className="aspect-square bg-surface-2 animate-pulse" />;
  if (url === null)
    return (
      <div className="aspect-square flex flex-col items-center justify-center gap-1 border border-dashed border-line text-muted text-center px-1">
        <Smartphone className="w-4 h-4" />
        <span className="text-[10px] leading-tight">On another phone</span>
      </div>
    );
  return (
    <button type="button" onClick={() => onOpen(url)} className="aspect-square border border-line overflow-hidden cursor-pointer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Lecture photo" className="w-full h-full object-cover" />
    </button>
  );
};

// Small copy of my notes on this phone, so they still show if the server can't be reached.
const cacheKey = (uid: string) => `classnotes_mine_v1_${uid}`;
export const readMineCache = (uid: string): MyNote[] => {
  try {
    const v = JSON.parse(localStorage.getItem(cacheKey(uid)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const writeMineCache = (uid: string, list: MyNote[]) => {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300)));
  } catch {}
};
export const cacheMine = (uid: string, notes: MyNote[]) => {
  const map = new Map(readMineCache(uid).map((n) => [n.id, n]));
  notes.forEach((n) => map.set(n.id, n));
  writeMineCache(uid, Array.from(map.values()));
};
export const uncacheMine = (uid: string, id: string) => writeMineCache(uid, readMineCache(uid).filter((n) => n.id !== id));

type Pending = { blob: Blob; url: string };

export const ClassNotesHost: React.FC = () => {
  const { user, showToast } = useApp() as any;
  const [slot, setSlot] = useState<NoteSlot | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'mine' | 'class'>('mine');
  const [range, setRange] = useState<'slot' | 'all'>('slot');
  const [mine, setMine] = useState<MyNote[]>([]);
  const [shared, setShared] = useState<SharedNote[]>([]);
  const [hasBatch, setHasBatch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const clearPending = useCallback(() => {
    setPending((p) => {
      p.forEach((x) => URL.revokeObjectURL(x.url));
      return [];
    });
  }, []);

  // Open requests from anywhere in the app
  useEffect(() => {
    const onOpen = (e: Event) => {
      const s = (e as CustomEvent).detail as NoteSlot;
      if (!s?.subjectId || !s.date) return;
      setSlot(s);
      setTab('mine');
      setRange('slot');
      setText('');
      setError('');
      clearPending();
      setOpen(true);
      if (s.focus === 'camera') cameraRef.current?.click(); // same tap, so the camera is allowed to open
    };
    window.addEventListener('classnotes:open', onOpen);
    return () => window.removeEventListener('classnotes:open', onOpen);
  }, [clearPending]);

  const load = useCallback(async () => {
    if (!slot || !user?.id) return;
    setLoading(true);
    setError('');
    try {
      const q = `?subjectId=${encodeURIComponent(slot.subjectId)}&subject=${encodeURIComponent(slot.subjectName || '')}${range === 'slot' ? `&date=${slot.date}` : ''}`;
      const d = await notesApi('GET', q);
      const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
      setMine((d.mine || []).sort(byNewest));
      cacheMine(user.id, d.mine || []);
      setShared((d.shared || []).sort(byNewest));
      setHasBatch(!!d.hasBatch);
    } catch (e: any) {
      // Offline or server hiccup: still show what this phone already knows
      const cached = readMineCache(user.id).filter(
        (n) => (n.subjectId === slot.subjectId || subjectKeyOf(n.subjectName) === subjectKeyOf(slot.subjectName)) && (range === 'all' || n.date === slot.date)
      );
      if (cached.length) setMine(cached.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slot, range, user?.id]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (open && slot?.focus === 'text') setTimeout(() => textRef.current?.focus(), 250);
  }, [open, slot]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const max = tab === 'class' ? 1 : 6;
    const list = Array.from(files).slice(0, Math.max(0, max - (tab === 'class' ? 0 : pending.length)));
    try {
      const out: Pending[] = [];
      for (const f of list) {
        const blob = await compressPhoto(f);
        out.push({ blob, url: URL.createObjectURL(blob) });
      }
      setPending((p) => {
        if (tab === 'class') {
          p.forEach((x) => URL.revokeObjectURL(x.url));
          return out.slice(0, 1);
        }
        return [...p, ...out].slice(0, 6);
      });
    } catch (e: any) {
      setError(e.message || "Couldn't add that photo");
    }
  };

  const save = async () => {
    if (!slot || saving) return;
    const t = text.trim();
    if (!t && pending.length === 0) return;
    setSaving(true);
    setError('');
    const base = { subjectId: slot.subjectId, subjectName: slot.subjectName, date: slot.date, startTime: slot.startTime || '', text: t };
    const savedIds: string[] = [];
    try {
      if (tab === 'mine') {
        for (const p of pending) savedIds.push(await savePhoto(p.blob));
        const res = await notesApi('POST', '', { action: 'addMine', ...base, photos: savedIds });
        if (res?.note && user?.id) cacheMine(user.id, [res.note]);
        showToast?.('Note saved', `${slot.subjectName} · ${dateLabel(slot.date)}`, 'success');
      } else {
        // Class notes are text only (no photo storage); photos go out through Share on My notes
        await notesApi('POST', '', { action: 'addShared', ...base });
        showToast?.('Shared with your class', `${slot.subjectName} · ${dateLabel(slot.date)}`, 'success');
      }
      setText('');
      clearPending();
      load();
      window.dispatchEvent(new Event('classnotes:changed'));
    } catch (e: any) {
      savedIds.forEach((id) => deletePhoto(id));
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // My note → the phone's share menu (WhatsApp and other apps), with its first photo
  const shareOut = async (n: MyNote) => {
    const photo = n.photos?.[0] ? await getPhoto(n.photos[0]) : null;
    const result = await shareNoteExternally({ title: n.subjectName || 'Class note', text: noteShareText(n), photo });
    if (result === 'text-only') showToast?.('Shared the text', "This version of the app can't attach the photo yet.", 'info');
    else if (result === 'error') showToast?.("Couldn't open sharing", 'Try again.', 'error');
  };

  const removeMine = async (n: MyNote) => {
    try {
      await notesApi('POST', '', { action: 'deleteMine', id: n.id });
      if (user?.id) uncacheMine(user.id, n.id);
      n.photos.forEach((id) => deletePhoto(id));
      setMine((list) => list.filter((x) => x.id !== n.id));
      window.dispatchEvent(new Event('classnotes:changed'));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const removeShared = async (n: SharedNote) => {
    try {
      await notesApi('POST', '', { action: 'deleteShared', id: n.id });
      setShared((list) => list.filter((x) => x.id !== n.id));
      window.dispatchEvent(new Event('classnotes:changed'));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const close = () => {
    setOpen(false);
    setViewer(null);
    clearPending();
  };

  const list = tab === 'mine' ? mine : shared;
  const canSave = !saving && (tab === 'mine' ? !!text.trim() || pending.length > 0 : !!text.trim() && hasBatch);
  const subtitle = slot
    ? [dateLabel(slot.date), slot.startTime ? formatTime12Hour(slot.startTime) : null, slot.room || null].filter(Boolean).join(' · ')
    : '';

  // Group by date when showing all dates
  const groups: { date: string; items: (MyNote | SharedNote)[] }[] = [];
  list.forEach((n) => {
    const g = groups.find((x) => x.date === n.date);
    if (g) g.items.push(n);
    else groups.push({ date: n.date, items: [n] });
  });
  groups.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      <Modal isOpen={open} onClose={close} title={slot?.subjectName || 'Notes'} description={subtitle} maxWidth="lg" mobileFullSheet>
        {slot && (
          <div className="flex flex-col gap-f4">
            {!user?.id ? (
              <SignInPanel
                bare
                title="Sign in to save notes"
                body="Your notes are linked to each class, so you can find them by subject and date later."
                perks={['Snap the board in one tap', 'Notes saved to the right class', 'Share useful notes with your batch']}
                onNavigate={close}
              />
            ) : (
              <>
                {/* Mine / Class: quiet underline tabs */}
                <div className="-mt-1 flex items-end gap-f4 border-b border-line" role="tablist">
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
                          setError('');
                          if (t === 'class' && pending.length) clearPending();
                        }}
                        className={clsx(
                          '-mb-px h-10 inline-flex items-center gap-1.5 border-b-2 text-[14px] font-semibold transition-colors cursor-pointer',
                          tab === t ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'
                        )}
                      >
                        {t === 'mine' ? 'My notes' : 'Class'}
                        {count > 0 && <span className="text-[12px] font-medium text-faint tabular-nums">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Composer */}
                {tab === 'class' && !hasBatch ? (
                  <p className="bg-surface-2 px-f3 py-3 text-[14px] text-muted">Join your class batch from Profile to share notes with your classmates.</p>
                ) : (
                  <div>
                    <div className="border border-line bg-surface focus-within:border-fg transition-colors">
                      <textarea
                        ref={textRef}
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_NOTE_CHARS))}
                        rows={3}
                        placeholder={tab === 'mine' ? 'What did the prof say?' : 'Share something with your class'}
                        className="w-full resize-none bg-transparent px-f3 pt-3 pb-1 text-[16px] leading-[24px] text-fg placeholder:text-faint focus:outline-none"
                      />
                      {pending.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar px-f3 pb-2">
                          {pending.map((p, i) => (
                            <div key={p.url} className="relative w-16 h-16 shrink-0 border border-line overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                aria-label="Remove photo"
                                onClick={() => setPending((list) => { URL.revokeObjectURL(list[i].url); return list.filter((_, j) => j !== i); })}
                                className="absolute right-0.5 top-0.5 w-5 h-5 flex items-center justify-center bg-surface/90 border border-line cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
                        {tab === 'mine' && (
                          <>
                            <button type="button" onClick={() => cameraRef.current?.click()} aria-label="Take photo" title="Take photo" className="w-9 h-9 inline-flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 cursor-pointer">
                              <Camera className="w-[18px] h-[18px]" />
                            </button>
                            <button type="button" onClick={() => galleryRef.current?.click()} aria-label="Add from gallery" title="Add from gallery" className="w-9 h-9 inline-flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 cursor-pointer">
                              <ImageIcon className="w-[18px] h-[18px]" />
                            </button>
                          </>
                        )}
                        <span className="flex-1" />
                        <button type="button" onClick={save} disabled={!canSave} className="btn btn-primary h-9 px-4 text-[13px]">
                          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                          {tab === 'mine' ? 'Save' : 'Share'}
                        </button>
                      </div>
                    </div>
                    {tab === 'mine' && !text && pending.length === 0 ? (
                      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {QUICK.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => { setText(q + ': '); textRef.current?.focus(); }}
                            className="shrink-0 h-7 px-2.5 bg-surface-2 text-[12px] font-medium text-muted hover:text-fg cursor-pointer"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-faint">
                      {tab === 'mine' ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {tab === 'mine' ? 'Only you · photos stay on this phone' : 'Everyone in your batch sees this · text only. Send photos with Share on your notes.'}
                    </p>
                  </div>
                )}

                {error && (
                  <p className="flex items-start gap-2 px-3 py-2.5 border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:border-rose-400/20 dark:text-rose-300 text-[14px]">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                  </p>
                )}

                {/* List */}
                <div className="mt-1 flex items-center justify-between gap-3">
                  <h4 className="text-[13px] font-semibold text-muted">{range === 'slot' ? dateLabel(slot.date) : 'All dates'}</h4>
                  <button
                    type="button"
                    onClick={() => setRange(range === 'slot' ? 'all' : 'slot')}
                    className="text-[13px] font-semibold text-fg underline underline-offset-4 decoration-line-strong hover:decoration-fg cursor-pointer"
                  >
                    {range === 'slot' ? 'See all dates' : `Only ${dateLabel(slot.date).toLowerCase()}`}
                  </button>
                </div>

                {loading && list.length === 0 ? (
                  <div className="flex flex-col gap-2" aria-label="Loading notes">
                    {[0, 1].map((i) => (
                      <div key={i} className="bg-surface-2 px-f3 py-3 animate-pulse">
                        <div className="h-3 w-3/4 bg-line" />
                        <div className="mt-2 h-3 w-1/3 bg-line-soft" />
                      </div>
                    ))}
                  </div>
                ) : list.length === 0 ? (
                  <div className="flex flex-col items-center px-f3 pt-f2 pb-f4 text-center">
                    <Illustration name={tab === 'mine' ? 'notes' : 'friends'} className="h-[96px] w-auto" />
                    <p className="mt-f3 text-[14px] text-muted max-w-[260px]">
                      {tab === 'mine' ? 'Nothing here yet. Snap the board or write one line.' : 'No class notes yet. Be the first to share.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-f3">
                    {groups.map((g) => (
                      <section key={g.date}>
                        {range === 'all' && <p className="mb-1.5 text-[12px] font-semibold text-muted">{dateLabel(g.date)}</p>}
                        <ul className="border border-line divide-y divide-line-soft">
                          {g.items.map((n: any) => (
                            <li key={n.id} className="px-f3 py-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  {n.text && <p className="text-[15px] leading-[22px] text-fg whitespace-pre-wrap break-words">{n.text}</p>}
                                  <p className="mt-1 text-[12px] text-muted">
                                    {tab === 'class' ? `${n.mine ? 'You' : n.byName} · ` : ''}
                                    {timeOf(n.createdAt)}
                                  </p>
                                </div>
                                {tab === 'mine' && (
                                  <button
                                    type="button"
                                    aria-label="Share note to WhatsApp or other apps"
                                    title="Share"
                                    onClick={() => shareOut(n)}
                                    className="w-8 h-8 shrink-0 flex items-center justify-center text-muted hover:text-fg cursor-pointer"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                )}
                                {(tab === 'mine' || n.canDelete) && (
                                  <button
                                    type="button"
                                    aria-label="Delete note"
                                    onClick={() => (tab === 'mine' ? removeMine(n) : removeShared(n))}
                                    className="w-8 h-8 shrink-0 flex items-center justify-center text-muted hover:text-rose-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {tab === 'mine' && n.photos?.length > 0 && (
                                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                                  {n.photos.map((id: string) => (
                                    <LocalPhoto key={id} id={id} onOpen={setViewer} />
                                  ))}
                                </div>
                              )}
                              {tab === 'class' && n.imageUrl && (
                                <button type="button" onClick={() => setViewer(n.imageUrl)} className="mt-2.5 block w-full border border-line overflow-hidden cursor-pointer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={n.imageUrl} alt="Shared class photo" className="w-full max-h-[320px] object-cover" loading="lazy" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <PhotoViewer url={viewer} onClose={closeViewer} alt="Lecture photo" />
    </>
  );
};
