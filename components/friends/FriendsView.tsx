'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Illustration } from '@/components/ui/Illustration';
import { AlertTriangle, Ban, Camera, Check, ChevronRight, Clock, Copy, EyeOff, Loader2, MoreVertical, Search, Send, Share2, UserPlus, Users, X } from '@/components/ui/icons';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import {
  CODE_RE,
  Friend,
  FriendsData,
  NowStatus,
  PLACES,
  PLAN_TITLES,
  PersonLite,
  Slot,
  clock,
  freeTogether,
  friendLink,
  minutesOf,
  nowStatus,
  placeOf,
} from '@/lib/friends';
import { QrCode } from './QrCode';
import { friendsApi, useFriends } from './friendsClient';
import { ChatSummary, blockPerson, openDmChat, openPlanChat, useChats } from './chat/chatClient';
import { ChatThread } from './chat/ChatThread';
import { ChatRowButton, ChatsSection, FreeNowStrip, PlanCard } from './FriendsSocial';

// Friends (same campus only): add by QR / code / classmates, see who's free now, find time
// together, make quick plans, and share where you are for an hour. Privacy first: friends only
// see free/busy, ghost mode hides everything.

const Avatar: React.FC<{ p: PersonLite; size?: number; ring?: boolean }> = ({ p, size = 40, ring }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={getAvatarSrc(getAvatarSeed({ avatarUrl: p.avatarUrl, id: p.uid, role: 'student' }))}
    alt=""
    width={size}
    height={size}
    className={clsx('shrink-0 rounded-full bg-surface-2 object-cover', ring ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-surface' : 'ring-1 ring-line')}
    style={{ width: size, height: size }}
  />
);

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; hint: string; disabled?: boolean }> = ({ on, onChange, label, hint, disabled }) => (
  <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="w-full flex items-center gap-3 px-f4 py-3 text-left cursor-pointer disabled:opacity-60">
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-medium text-fg">{label}</span>
      <span className="block text-[12px] text-muted">{hint}</span>
    </span>
    <span className={clsx('relative w-10 h-6 rounded-full transition-colors shrink-0', on ? 'bg-ink' : 'bg-surface-3')}>
      <span className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </span>
  </button>
);

const statusLine = (s: NowStatus) => {
  if (s.kind === 'class') return `In class till ${clock(s.until)}`;
  if (s.kind === 'free') return s.until === null ? 'Free for the rest of the day' : `Free till ${clock(s.until)}`;
  if (s.kind === 'off') return s.label;
  return 'Not sharing right now';
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (date: string) => {
  const t = new Date();
  if (date === ymd(t)) return 'Today';
  const tm = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  if (date === ymd(tm)) return 'Tomorrow';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};
const isFreeAt = (f: Friend, at: Date) => {
  if (f.hidden) return false;
  const day = f.days.find((d) => d.date === ymd(at));
  if (!day || day.off) return true;
  const t = minutesOf(at);
  return !day.classes.some((c) => c.start <= t && t < c.end);
};
const Err: React.FC<{ msg: string }> = ({ msg }) => (
  <p className="flex items-start gap-2 px-3 py-2.5 border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:border-rose-400/20 dark:text-rose-300 text-[14px]">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {msg}
  </p>
);

// ---------- QR scanner (BarcodeDetector where the phone has it) ----------
const Scanner: React.FC<{ onCode: (code: string) => void }> = ({ onCode }) => {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'starting' | 'on' | 'unsupported' | 'denied'>('starting');
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: any;
    let stopped = false;
    const BD = (window as any).BarcodeDetector;
    if (!BD || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    const detector = new BD({ formats: ['qr_code'] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setState('on');
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            const raw: string | undefined = found?.[0]?.rawValue;
            if (raw) {
              let code = raw.trim();
              try {
                code = new URL(raw).searchParams.get('friend') || code;
              } catch {}
              code = code.toUpperCase();
              if (CODE_RE.test(code)) {
                stopped = true;
                onCode(code);
                return;
              }
            }
          } catch {}
          timer = setTimeout(tick, 250);
        };
        tick();
      })
      .catch(() => setState('denied'));
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  if (state === 'unsupported' || state === 'denied') {
    return (
      <div className="border border-line px-f4 py-f5 text-center">
        <Camera className="w-6 h-6 mx-auto text-muted" />
        <p className="mt-3 text-[15px] font-semibold text-fg">{state === 'denied' ? 'Camera is blocked' : "This phone can't scan here"}</p>
        <p className="mt-1 text-[13px] text-muted">Open your phone's camera app and point it at your friend's QR, or type their code instead.</p>
      </div>
    );
  }
  return (
    <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-black overflow-hidden">
      <video ref={video} playsInline muted className="w-full h-full object-cover" />
      <div className="absolute inset-[18%] border-2 border-white/90" aria-hidden="true" />
      {state === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-[13px]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
    </div>
  );
};

// ---------- Add friend: my code · scan · type ----------
const AddSheet: React.FC<{ open: boolean; onClose: () => void; me: FriendsData['me'] | null; initialCode?: string; onAdded: () => void }> = ({ open, onClose, me, initialCode, onAdded }) => {
  const { showToast } = useApp() as any;
  const [tab, setTab] = useState<'code' | 'scan' | 'type'>('code');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ name: string; result: string } | null>(null);
  const sentRef = useRef('');

  const send = async (c: string) => {
    const clean = c.trim().toUpperCase();
    if (!CODE_RE.test(clean)) return setError('Codes have 6 letters and numbers');
    if (sentRef.current === clean) return;
    sentRef.current = clean;
    setBusy(true);
    setError('');
    try {
      const d = await friendsApi('POST', { action: 'request', code: clean });
      setDone({ name: d.person?.name || 'your friend', result: d.result });
      onAdded();
    } catch (e: any) {
      setError(e.message);
      sentRef.current = '';
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError('');
    sentRef.current = '';
    if (initialCode) {
      setTab('type');
      setCode(initialCode);
      send(initialCode);
    } else {
      setTab('code');
      setCode('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCode]);

  const share = async () => {
    if (!me) return;
    const text = `Add me on Intersemester to see when I'm free. My code: ${me.code}`;
    const url = friendLink(me.code);
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: 'Add me on Intersemester', text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast?.('Link copied', 'Send it to your friend', 'success');
      }
    } catch {}
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add a friend" description="Only students from your campus" maxWidth="md" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <div className="grid grid-cols-3 border border-line" role="tablist">
          {(
            [
              ['code', 'My QR'],
              ['scan', 'Scan'],
              ['type', 'Enter code'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(''); }} className={clsx('h-11 text-[14px] font-semibold cursor-pointer', tab === id ? 'bg-ink text-on-ink' : 'text-fg-2 hover:bg-surface-2')}>
              {label}
            </button>
          ))}
        </div>

        {done ? (
          <div className="flex flex-col items-center text-center py-f4">
            <span className="w-12 h-12 flex items-center justify-center border border-emerald-300 bg-emerald-50 dark:bg-emerald-400/10 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-300">
              <Check className="w-6 h-6" />
            </span>
            <p className="mt-3 text-[17px] font-semibold text-fg">
              {done.result === 'accepted' ? `You and ${done.name} are friends` : done.result === 'already' ? `You're already friends with ${done.name}` : `Request sent to ${done.name}`}
            </p>
            <p className="mt-1 text-[13px] text-muted">{done.result === 'sent' || done.result === 'pending' ? "You'll see when they're free once they accept." : 'You can now see when they are free.'}</p>
            <button type="button" onClick={onClose} className="btn btn-primary mt-f4">Done</button>
          </div>
        ) : tab === 'code' ? (
          <div className="flex flex-col items-center text-center">
            {me ? (
              <>
                <div className="border border-line p-3 bg-white">
                  <QrCode value={friendLink(me.code)} size={220} />
                </div>
                <p className="mt-f3 text-[12px] font-medium text-muted">Your code</p>
                <p className="mt-0.5 font-mono text-[28px] font-semibold tracking-[0.18em] text-fg">{me.code}</p>
                <div className="mt-f3 flex gap-2">
                  <button type="button" onClick={share} className="btn btn-primary">
                    <Share2 className="w-4 h-4" /> Share link
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(me.code).then(() => showToast?.('Code copied', me.code, 'success'))}
                    className="btn btn-secondary"
                  >
                    <Copy className="w-4 h-4" /> Copy code
                  </button>
                </div>
                <p className="mt-f3 text-[12px] text-muted max-w-xs">Friends scan this with Intersemester or their phone camera. They'll send you a request.</p>
              </>
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            )}
          </div>
        ) : tab === 'scan' ? (
          <>
            {busy ? (
              <div className="flex items-center justify-center gap-2 py-f6 text-[14px] text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Sending request…
              </div>
            ) : (
              <Scanner onCode={send} />
            )}
            <p className="text-center text-[12px] text-muted">Point at your friend's Intersemester QR</p>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(code);
            }}
            className="flex flex-col gap-f3"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="AB12CD"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Friend code"
              className="w-full h-14 px-3 text-center font-mono text-[26px] tracking-[0.3em] bg-surface border border-line text-fg placeholder:text-faint focus:outline-none focus:border-line-strong"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Send request
            </button>
          </form>
        )}
        {error && <Err msg={error} />}
      </div>
    </Modal>
  );
};

// ---------- Find time together ----------
const TogetherSheet: React.FC<{ open: boolean; onClose: () => void; friends: Friend[]; myDays: FriendsData['myDays']; onPlan: (at: Date, invite: string[]) => void }> = ({ open, onClose, friends, myDays, onPlan }) => {
  const visible = friends.filter((f) => !f.hidden);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    if (open) setPicked([]);
  }, [open]);
  const slots: Slot[] = useMemo(() => (picked.length ? freeTogether([myDays, ...visible.filter((f) => picked.includes(f.uid)).map((f) => f.days)]) : []), [picked, myDays, visible]);
  const byDay = slots.reduce<Record<string, Slot[]>>((acc, s) => ((acc[s.date] ||= []).push(s), acc), {});
  const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

  return (
    <Modal isOpen={open} onClose={onClose} title="Find time together" description="When you and your friends are all free (8 AM – 6 PM)" maxWidth="md" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">Who&apos;s coming?</p>
          {visible.length === 0 ? (
            <p className="text-[14px] text-muted">None of your friends are sharing their schedule right now.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visible.map((f) => {
                const on = picked.includes(f.uid);
                return (
                  <button key={f.uid} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== f.uid) : [...p, f.uid]))} className={clsx('chip h-9 pl-1', on && 'chip-active')}>
                    <Avatar p={f} size={26} /> {f.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {picked.length > 0 &&
          (slots.length === 0 ? (
            <p className="border border-dashed border-line px-f3 py-f4 text-center text-[14px] text-muted">No common free time this week. Try fewer people.</p>
          ) : (
            Object.entries(byDay).map(([date, list]) => (
              <section key={date}>
                <p className="mb-1.5 text-[12px] font-semibold text-muted">{dayLabel(date)}</p>
                <ul className="border border-line divide-y divide-line-soft">
                  {list.map((s) => (
                    <li key={`${s.date}_${s.start}`} className="flex items-center gap-3 px-f3 py-2.5">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-medium text-fg tabular-nums">
                          {clock(s.start)} – {clock(s.end)}
                        </span>
                        <span className="block text-[12px] text-muted">{dur(s.end - s.start)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const [y, mo, d] = s.date.split('-').map(Number);
                          onPlan(new Date(y, mo - 1, d, Math.floor(s.start / 60), s.start % 60), picked);
                        }}
                        className="btn btn-secondary h-9 px-3 text-[13px]"
                      >
                        Plan
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ))}
      </div>
    </Modal>
  );
};

// ---------- Quick plan ----------
const PlanSheet: React.FC<{ open: boolean; onClose: () => void; friends: Friend[]; preset: { at?: Date; invite?: string[] } | null; onSent: () => void }> = ({ open, onClose, friends, preset, onSent }) => {
  const { showToast } = useApp() as any;
  const [title, setTitle] = useState('Canteen');
  const [at, setAt] = useState<Date>(new Date());
  const [invite, setInvite] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visible = friends.filter((f) => !f.hidden);

  const pickTime = (d: Date) => {
    setAt(d);
    if (!preset?.invite) setInvite(visible.filter((f) => isFreeAt(f, d)).map((f) => f.uid));
  };
  useEffect(() => {
    if (!open) return;
    setError('');
    setTitle('Canteen');
    const start = preset?.at || new Date(Date.now() + 15 * 60000);
    setAt(start);
    setInvite(preset?.invite || visible.filter((f) => isFreeAt(f, start)).map((f) => f.uid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);

  const quick = [0, 15, 30, 60].map((m) => ({ m, label: m === 0 ? 'Now' : m === 60 ? 'In 1 hour' : `In ${m} min` }));
  const timeValue = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await friendsApi('POST', { action: 'plan', title, at: at.toISOString(), invite });
      showToast?.('Plan sent', `${title} at ${clock(minutesOf(at))}`, 'success');
      onSent();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Make a plan" description="Friends get a notification and can say they're in" maxWidth="md" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">What</p>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_TITLES.map((t) => (
              <button key={t} type="button" onClick={() => setTitle(t)} className={clsx('chip', title === t && 'chip-active')}>
                {t}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} placeholder="Or type your own" className="mt-2 w-full h-11 px-3 bg-surface border border-line text-[15px] text-fg focus:outline-none focus:border-line-strong" />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">
            When · <span className="text-fg">{dayLabel(ymd(at))}, {clock(minutesOf(at))}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q.m} type="button" onClick={() => pickTime(new Date(Date.now() + q.m * 60000))} className="chip">
                {q.label}
              </button>
            ))}
            <input
              type="time"
              value={timeValue}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                if (isNaN(h)) return;
                const d = new Date(at);
                d.setHours(h, m || 0, 0, 0);
                pickTime(d);
              }}
              aria-label="Pick a time"
              className="h-8 px-2 border border-line bg-surface text-[13px] text-fg"
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">Invite · {invite.length}</p>
          {visible.length === 0 ? (
            <p className="text-[14px] text-muted">Add friends first.</p>
          ) : (
            <ul className="border border-line divide-y divide-line-soft max-h-[300px] overflow-y-auto">
              {visible.map((f) => {
                const on = invite.includes(f.uid);
                const free = isFreeAt(f, at);
                return (
                  <li key={f.uid}>
                    <button type="button" onClick={() => setInvite((p) => (on ? p.filter((x) => x !== f.uid) : [...p, f.uid]))} className="w-full flex items-center gap-3 px-f3 py-2.5 text-left hover:bg-surface-2 cursor-pointer">
                      <Avatar p={f} size={32} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-medium text-fg truncate">{f.name}</span>
                        <span className={clsx('block text-[12px]', free ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted')}>{free ? 'Free then' : 'In class then'}</span>
                      </span>
                      <span className={clsx('w-5 h-5 border flex items-center justify-center', on ? 'bg-ink border-ink text-on-ink' : 'border-line-strong')}>{on && <Check className="w-3.5 h-3.5" />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {error && <Err msg={error} />}
        <button type="button" onClick={send} disabled={busy || !invite.length || !title.trim()} className="btn btn-primary w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to {invite.length} {invite.length === 1 ? 'friend' : 'friends'}
        </button>
      </div>
    </Modal>
  );
};

// ---------- Page ----------
// ---------- Your class: one card on the page, everyone inside a sheet ----------
const shortBranch = (b?: string) =>
  (b || '')
    .replace(/.*\(([^)]+)\).*/, '$1')
    .replace(/AND ARTIFICIAL INTELLIGENCE/i, '& AI')
    .replace(/ARTIFICIAL INTELLIGENCE/i, 'AI')
    .trim();

const ClassmatesSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  classLabel: string;
  suggestions: PersonLite[];
  outgoing: PersonLite[];
  busy: string;
  onRequest: (p: PersonLite) => void;
  onUndo: (p: PersonLite) => void;
}> = ({ open, onClose, classLabel, suggestions, outgoing, busy, onRequest, onUndo }) => {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) setQ('');
  }, [open]);
  const requested = new Set(outgoing.map((p) => p.uid));
  const people = [...outgoing, ...suggestions]
    .filter((p, i, a) => a.findIndex((x) => x.uid === p.uid) === i)
    .sort((a, b) => a.name.localeCompare(b.name));
  const query = q.trim().toLowerCase();
  const shown = query ? people.filter((p) => p.name.toLowerCase().includes(query)) : people;

  return (
    <Modal isOpen={open} onClose={onClose} title="Your class" description={`${classLabel} · ${people.length} ${people.length === 1 ? 'classmate' : 'classmates'}`} maxWidth="lg" mobileFullSheet>
      <div className="flex flex-col gap-f3">
        {people.length > 8 && (
          <label className="flex items-center gap-2.5 h-11 px-3 border border-line bg-surface focus-within:border-fg transition-colors">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your class"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-fg placeholder:text-faint focus:outline-none"
            />
          </label>
        )}
        {shown.length === 0 ? (
          <p className="py-f4 text-center text-[14px] text-muted">No one matches &ldquo;{q}&rdquo;.</p>
        ) : (
          <ul className="-mx-1">
            {shown.map((p) => {
              const sent = requested.has(p.uid);
              const working = busy === `rq_${p.uid}` || busy === `cx_${p.uid}`;
              return (
                <li key={p.uid} className="flex items-center gap-3 px-1 h-14">
                  <Avatar p={p} size={36} />
                  <span className="flex-1 min-w-0 text-[15px] font-medium text-fg truncate">{p.name}</span>
                  {sent ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => onUndo(p)}
                      className="group h-9 px-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg cursor-pointer"
                      aria-label={`Cancel request to ${p.name}`}
                    >
                      {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span className="group-hover:hidden">Requested</span>
                      <span className="hidden group-hover:inline">Undo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => onRequest(p)}
                      className="h-9 px-3 inline-flex items-center gap-1.5 bg-surface-2 text-[13px] font-semibold text-fg hover:bg-ink hover:text-on-ink transition-colors cursor-pointer disabled:opacity-60"
                      aria-label={`Send a friend request to ${p.name}`}
                    >
                      {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[12px] text-faint">They get a request and see you only once they accept.</p>
      </div>
    </Modal>
  );
};

export const FriendsView: React.FC = () => {
  const { user, setActiveView, showToast, profile } = useApp() as any;
  const [classOpen, setClassOpen] = useState(false);
  const { data, loading, error, reload } = useFriends(user?.id);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | undefined>(undefined);
  const [togetherOpen, setTogetherOpen] = useState(false);
  const [planPreset, setPlanPreset] = useState<{ at?: Date; invite?: string[] } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string>('');
  const [, tick] = useState(0);
  const { chats } = useChats(user?.id);
  const [chatStub, setChatStub] = useState<ChatSummary | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  // The open chat follows its live doc once it exists (new messages, names)
  const openChat = chatStub ? chats.find((c) => c.id === chatStub.id) || chatStub : null;
  const closeChat = useCallback(() => setChatStub(null), []);

  // Live clock for "free till…" + friend codes arriving from a QR link
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    const take = () => {
      try {
        const c = sessionStorage.getItem('pending_friend_code');
        if (c) {
          sessionStorage.removeItem('pending_friend_code');
          setPendingCode(c);
          setAddOpen(true);
        }
      } catch {}
    };
    take();
    window.addEventListener('friends:code', take);
    return () => {
      clearInterval(t);
      window.removeEventListener('friends:code', take);
    };
  }, []);

  // Plan answers show the moment you tap. The full Friends reload (7-day schedules for everyone) is slow,
  // so waiting on it made "I'm in / Can't" look like they did nothing. Roll back if the server says no.
  const [myAnswers, setMyAnswers] = useState<Record<string, 'in' | 'out'>>({});
  const respondToPlan = async (planId: string, title: string, answer: 'in' | 'out', prev?: 'in' | 'out') => {
    setMyAnswers((m) => ({ ...m, [planId]: answer }));
    try {
      await friendsApi('POST', { action: 'respond', id: planId, answer });
      if (answer === 'in') showToast?.("You're in", title, 'success');
      reload(); // refresh in the background; the local answer already shows
    } catch (e: any) {
      setMyAnswers((m) => {
        const next = { ...m };
        if (prev) next[planId] = prev;
        else delete next[planId];
        return next;
      });
      showToast?.("Couldn't answer", e?.message || 'Try again.', 'error');
    }
  };

  const openFriendChat = async (f: PersonLite) => {
    if (!user?.id || opening) return;
    setOpening(f.uid);
    try {
      const id = await openDmChat(f.uid);
      setChatStub(chats.find((c) => c.id === id) || { id, type: 'dm', members: [user.id, f.uid], names: { [f.uid]: f.name }, lastMessage: null, updatedAt: 0, unread: false });
    } catch (e: any) {
      showToast?.("Couldn't open chat", e?.message || 'Try again.', 'error');
    } finally {
      setOpening(null);
    }
  };
  const openPlanThread = async (p: { id: string; title: string; byUid: string; invited: PersonLite[]; at: string }) => {
    if (!user?.id || opening) return;
    setOpening(p.id);
    try {
      const id = await openPlanChat(p.id);
      setChatStub(chats.find((c) => c.id === id) || { id, type: 'plan', planId: p.id, title: p.title, at: p.at, members: [p.byUid, ...p.invited.map((x) => x.uid)], names: {}, lastMessage: null, updatedAt: 0, unread: false });
    } catch (e: any) {
      showToast?.("Couldn't open chat", e?.message || 'Try again.', 'error');
    } finally {
      setOpening(null);
    }
  };

  // A push notification opens its chat: /?view=friends&chat=<id>
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !chats.length) return;
    let id: string | null = null;
    try {
      id = new URLSearchParams(window.location.search).get('chat');
    } catch {}
    if (!id) return;
    const c = chats.find((x) => x.id === id);
    if (c) {
      deepLinked.current = true;
      setChatStub(c);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('chat');
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }
  }, [chats]);

  const act = async (key: string, body: any, toast?: [string, string]) => {
    setBusy(key);
    try {
      await friendsApi('POST', body);
      if (toast) showToast?.(toast[0], toast[1], 'success');
      await reload();
    } catch (e: any) {
      showToast?.("Couldn't do that", e.message, 'error');
    } finally {
      setBusy('');
      setMenu(null);
    }
  };

  const now = new Date();
  const friends = data?.friends || [];
  const withStatus = friends.map((f) => ({ f, s: (f.hidden ? { kind: 'hidden' } : nowStatus(f.days, now)) as NowStatus }));
  const freeNow = withStatus.filter((x) => x.s.kind === 'free' || x.s.kind === 'off');
  const inClass = withStatus.filter((x) => x.s.kind === 'class').sort((a: any, b: any) => a.s.until - b.s.until);
  const hidden = withStatus.filter((x) => x.s.kind === 'hidden');
  const me = data?.me || null;
  const myPlace = placeOf(me?.status?.place);
  const people = useMemo(() => {
    const m: Record<string, PersonLite> = {};
    (data?.friends || []).forEach((f) => (m[f.uid] = f));
    (data?.plans || []).forEach((p) => p.invited.forEach((x) => (m[x.uid] ??= x)));
    return m;
  }, [data]);

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="page-title">Friends</h2>
        <p className="text-[14px] text-muted mt-1.5 truncate">
          {data ? `${data.me.college || 'Your campus'} only · ${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}` : 'See when your friends are free'}
        </p>
      </div>
      {data && (
        <div className="page-actions">
          <button type="button" onClick={() => { setPendingCode(undefined); setAddOpen(true); }} className="btn btn-primary">
            <UserPlus className="w-4 h-4" /> Add friend
          </button>
          {friends.length > 0 && (
            <>
              <button type="button" onClick={() => setTogetherOpen(true)} className="btn btn-secondary">
                <Users className="w-4 h-4" /> Free together
              </button>
              <button type="button" onClick={() => { setPlanPreset(null); setPlanOpen(true); }} className="btn btn-secondary">
                <Send className="w-4 h-4" /> Make a plan
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const FriendRow = ({ f, s }: { f: Friend; s: NowStatus }) => {
    const place = placeOf(f.status?.place);
    return (
      <li className="relative flex items-center gap-3 px-f4 py-3">
        <Avatar p={f} ring={s.kind === 'free' || s.kind === 'off'} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-fg truncate">
            {f.name}
            {f.sameBatch && <span className="ml-2 text-[11px] font-medium text-muted">Classmate</span>}
          </p>
          <p className={clsx('text-[13px] truncate', s.kind === 'free' || s.kind === 'off' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted')}>
            {statusLine(s)}
            {s.kind === 'class' && s.name ? ` · ${s.name}` : ''}
          </p>
          {place && f.status && (
            <p className="text-[12px] text-fg-2 truncate">
              {place.emoji} At {place.label.toLowerCase()} · till {new Date(f.status.until).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
        <ChatRowButton onClick={() => openFriendChat(f)} label={`Chat with ${f.name}`} />
        <button type="button" aria-label={`Options for ${f.name}`} onClick={() => setMenu(menu === f.uid ? null : f.uid)} className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg cursor-pointer">
          <MoreVertical className="w-4 h-4" />
        </button>
        {menu === f.uid && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenu(null)} />
            <div className="absolute right-3 top-12 z-30 w-56 bg-surface border border-line shadow-[0_12px_36px_rgba(0,0,0,0.2)] py-1">
              <button
                type="button"
                onClick={() => act(`hide_${f.uid}`, { action: 'settings', hide: { uid: f.uid, hidden: !f.hiddenByMe } }, f.hiddenByMe ? ['Sharing again', `${f.name} can see when you're free`] : ['Hidden', `${f.name} won't see when you're free`])}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-fg hover:bg-surface-2 text-left cursor-pointer"
              >
                <EyeOff className="w-4 h-4" /> {f.hiddenByMe ? 'Show my schedule to them' : 'Hide my schedule from them'}
              </button>
              <button
                type="button"
                onClick={() => act(`rm_${f.uid}`, { action: 'remove', uid: f.uid }, ['Friend removed', f.name])}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-surface-2 text-left cursor-pointer"
              >
                <X className="w-4 h-4" /> Remove friend
              </button>
              <button
                type="button"
                onClick={async () => {
                  setMenu(null);
                  try {
                    await blockPerson(f.uid);
                    showToast?.('Blocked', `${f.name} can't message or add you.`, 'info');
                    reload();
                  } catch (e: any) {
                    showToast?.("Couldn't block", e?.message || 'Try again.', 'error');
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-surface-2 text-left cursor-pointer"
              >
                <Ban className="w-4 h-4" /> Block
              </button>
            </div>
          </>
        )}
      </li>
    );
  };

  let body: React.ReactNode;
  if (!user?.id) {
    body = (
      <SignInPanel
        title="Sign in to add friends"
        body="Friends are people from your campus who add you with your code, so you need an account to have one."
        perks={['See who is free right now', 'Find a free slot together', 'You choose what friends can see']}
      />
    );
  } else if (loading && !data) {
    body = (
      <ul className="border border-line bg-surface divide-y divide-line-soft" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 px-f4 py-3">
            <span className="w-10 h-10 rounded-full bg-surface-2 animate-pulse" />
            <span className="flex-1 flex flex-col gap-2">
              <span className="h-3.5 w-1/3 bg-surface-2 animate-pulse" />
              <span className="h-3 w-1/2 bg-surface-2 animate-pulse" />
            </span>
          </li>
        ))}
      </ul>
    );
  } else if (error && !data) {
    body = (
      <section className="border border-line bg-surface px-5 py-6 flex flex-col items-center text-center">
        <Illustration name={error.code === 'no-college' ? 'setup' : 'error'} className="h-[140px] w-auto" />
        <h3 className="mt-4 text-[18px] font-semibold text-fg">{error.code === 'no-college' ? 'Add your college first' : "Couldn't load friends"}</h3>
        <p className="mt-1.5 text-[14px] text-muted">{error.message}</p>
        <button type="button" onClick={() => (error.code === 'no-college' ? setActiveView('settings') : reload())} className="btn btn-primary mt-5">
          {error.code === 'no-college' ? 'Go to Profile' : 'Try again'}
        </button>
      </section>
    );
  } else if (data) {
    body = (
      <div className="flex flex-col gap-f5">
        <FreeNowStrip people={freeNow} onOpen={(f) => openFriendChat(f)} />

        {/* Where am I + privacy */}
        <section className="border border-line bg-surface">
          <div className="px-f4 pt-f3 pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-fg">Where are you?</h3>
              {myPlace && me?.status ? (
                <button type="button" onClick={() => act('place', { action: 'settings', place: null })} className="text-[12px] font-semibold text-muted hover:text-fg cursor-pointer">
                  Clear
                </button>
              ) : (
                <span className="text-[12px] text-muted">Friends see it for 1 hour</span>
              )}
            </div>
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {PLACES.map((p) => (
                <button key={p.id} type="button" disabled={!!busy} onClick={() => act('place', { action: 'settings', place: p.id })} className={clsx('chip', me?.status?.place === p.id && 'chip-active')}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
            {myPlace && me?.status && (
              <p className="mt-2 text-[12px] text-muted">
                Showing &ldquo;{myPlace.label}&rdquo; till {new Date(me.status.until).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="border-t border-line-soft divide-y divide-line-soft">
            <Switch on={!!me?.ghost} disabled={!!busy} onChange={(v) => act('ghost', { action: 'settings', ghost: v }, v ? ['Ghost mode on', 'Friends see nothing from you'] : ['Ghost mode off', 'Friends can see when you are free'])} label="Ghost mode" hint="Hide your free time and place from everyone" />
            <Switch on={!!me?.showClass} disabled={!!busy} onChange={(v) => act('showClass', { action: 'settings', showClass: v })} label="Show my class name" hint="Otherwise friends only see busy or free" />
          </div>
        </section>

        {/* Requests */}
        {data.incoming.length > 0 && (
          <section>
            <h3 className="mb-f3 text-[17px] font-semibold text-fg tracking-tight">Requests</h3>
            <ul className="border border-line bg-surface divide-y divide-line-soft">
              {data.incoming.map((p) => (
                <li key={p.uid} className="flex items-center gap-3 px-f4 py-3">
                  <Avatar p={p} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-medium text-fg truncate">{p.name}</span>
                    <span className="block text-[12px] text-muted truncate">{[p.branch, p.semester ? `Sem ${p.semester}` : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <button type="button" disabled={!!busy} onClick={() => act(`dec_${p.uid}`, { action: 'decline', uid: p.uid })} className="btn btn-secondary h-9 px-3 text-[13px]">
                    Decline
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => act(`acc_${p.uid}`, { action: 'accept', uid: p.uid }, ['Friend added', p.name])} className="btn btn-primary h-9 px-3 text-[13px]">
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ChatsSection chats={chats} me={user.id} people={people} onOpen={(c) => setChatStub(c)} />

        {/* Plans */}
        {data.plans.length > 0 && (
          <section>
            <h3 className="mb-f3 text-[17px] font-semibold text-fg tracking-tight">Plans</h3>
            <div className="flex flex-col gap-2.5">
              {data.plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  me={data.me.uid}
                  myAnswer={myAnswers[p.id]}
                  busy={!!busy}
                  onRespond={(answer) => respondToPlan(p.id, p.title, answer, myAnswers[p.id] ?? p.responses[data.me.uid])}
                  onCancel={() => act(`cp_${p.id}`, { action: 'cancelPlan', id: p.id }, ['Plan cancelled', p.title])}
                  onChat={() => openPlanThread(p)}
                  onCelebrate={(names) => showToast?.(`${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} in! 🎉`, p.title, 'success')}
                />
              ))}
            </div>
          </section>
        )}

        {/* Friends */}
        {friends.length === 0 ? (
          <section className="border border-line bg-surface px-5 py-6 flex flex-col items-center text-center">
            <Illustration name="friends" className="h-[160px] w-auto" />
            <h3 className="mt-4 text-[18px] font-semibold text-fg">See when your friends are free</h3>
            <p className="mt-1.5 text-[14px] text-muted max-w-sm">Add friends from your campus with a QR or code. Their free time shows up here on its own, from their timetable.</p>
            <button type="button" onClick={() => { setPendingCode(undefined); setAddOpen(true); }} className="btn btn-primary mt-5">
              <UserPlus className="w-4 h-4" /> Add friend
            </button>
          </section>
        ) : (
          <>
            <section>
              <div className="flex items-baseline justify-between gap-3 mb-f3">
                <h3 className="text-[17px] font-semibold text-fg tracking-tight">All friends</h3>
                <span className="text-[13px] text-muted tabular-nums">{friends.length}</span>
              </div>
              <ul className="border border-line bg-surface divide-y divide-line-soft">
                {[...freeNow, ...inClass, ...hidden].map(({ f, s }) => (
                  <FriendRow key={f.uid} f={f} s={s} />
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Your class: a single card, like the batch card on Timetable */}
        {(data.suggestions.length > 0 || data.outgoing.length > 0) && (() => {
          const people = [...data.outgoing, ...data.suggestions].filter((p, i, a) => a.findIndex((x) => x.uid === p.uid) === i);
          const stack = people.slice(0, 5);
          const extra = people.length - stack.length;
          const classLabel = [profile?.programme, shortBranch(profile?.branch), profile?.year ? `Year ${profile.year}` : null].filter(Boolean).join(' · ') || 'Your batch';
          return (
            <section>
              <button
                type="button"
                onClick={() => setClassOpen(true)}
                className="w-full flex items-center gap-f3 p-f4 bg-surface border border-line hover:bg-surface-2 transition-colors text-left cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-muted">Your class</p>
                  <p className="mt-1 text-[16px] font-semibold text-fg tracking-tight truncate">{classLabel}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center">
                      {stack.map((p, i) => (
                        <span key={p.uid} className={clsx('rounded-full ring-2 ring-surface', i > 0 && '-ml-2.5')}>
                          <Avatar p={p} size={30} />
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="-ml-2.5 w-[30px] h-[30px] rounded-full ring-2 ring-surface bg-surface-2 border border-line flex items-center justify-center text-[11px] font-semibold text-fg-2 tabular-nums">
                          +{extra}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 text-[13px] leading-[17px] text-muted">
                      <span className="block text-fg font-medium">{people.length} classmates</span>
                      {data.outgoing.length > 0 && <span className="block">{data.outgoing.length} requested</span>}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted shrink-0" />
              </button>
              <ClassmatesSheet
                open={classOpen}
                onClose={() => setClassOpen(false)}
                classLabel={classLabel}
                suggestions={data.suggestions}
                outgoing={data.outgoing}
                busy={busy}
                onRequest={(p) => act(`rq_${p.uid}`, { action: 'request', uid: p.uid }, ['Request sent', p.name])}
                onUndo={(p) => act(`cx_${p.uid}`, { action: 'remove', uid: p.uid })}
              />
            </section>
          );
        })()}

        <p className="text-[12px] leading-[17px] text-muted">
          Friends only see when you&apos;re busy or free, never your attendance or notes. Only students from your campus can add you.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-3xl mx-auto w-full pb-f7">
      {header}
      {body}
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} me={me} initialCode={pendingCode} onAdded={reload} />
      <TogetherSheet
        open={togetherOpen}
        onClose={() => setTogetherOpen(false)}
        friends={friends}
        myDays={data?.myDays || []}
        onPlan={(at, invite) => {
          setTogetherOpen(false);
          setPlanPreset({ at, invite });
          setPlanOpen(true);
        }}
      />
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} friends={friends} preset={planPreset} onSent={reload} />
      {user?.id && (
        <ChatThread
          chat={openChat}
          me={user.id}
          people={people}
          onClose={closeChat}
          onBlocked={reload}
          showToast={showToast}
          subtitle={
            openChat?.type === 'dm'
              ? (() => {
                  const other = openChat.members.find((m) => m !== user.id) || '';
                  const f = friends.find((x) => x.uid === other);
                  return f ? statusLine(f.hidden ? ({ kind: 'hidden' } as NowStatus) : nowStatus(f.days, new Date())) : undefined;
                })()
              : undefined
          }
        />
      )}
    </div>
  );
};
