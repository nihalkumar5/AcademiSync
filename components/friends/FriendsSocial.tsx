'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { Friend, NowStatus, Plan, PersonLite } from '@/lib/friends';
import { clock, placeOf } from '@/lib/friends';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { Check, ChevronRight, Clock, MessageCircle, Search, Users } from '@/components/ui/icons';
import { Ticks, receiptFor } from './chat/receipts';
import type { ChatSummary } from './chat/chatClient';

// The lively parts of the Friends page: who's free right now, recent chats, and plan cards that
// celebrate when someone's in.

const Face: React.FC<{ p: { uid: string; avatarUrl?: string }; size?: number; className?: string }> = ({ p, size = 40, className }) => (
  <span className={clsx('shrink-0 rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-[#F4F4F6] block', className)} style={{ width: size, height: size }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: p.avatarUrl, id: p.uid, role: 'student' }))} alt="" className="w-full h-full object-cover scale-110 translate-y-[1px]" />
  </span>
);

export const confettiBurst = async (from?: HTMLElement | null, opts: { count?: number } = {}) => {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const confetti = (await import('canvas-confetti')).default;
    const r = from?.getBoundingClientRect();
    const origin = r ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight } : { x: 0.5, y: 0.6 };
    confetti({
      particleCount: opts.count ?? 70,
      spread: 70,
      startVelocity: 32,
      ticks: 160,
      scalar: 0.9,
      origin,
      zIndex: 100060,
      colors: ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#111111'],
      disableForReducedMotion: true,
    });
  } catch {}
};

// ---------- Free now ----------
export const FreeNowStrip: React.FC<{
  people: { f: Friend; s: NowStatus }[];
  onOpen: (f: Friend) => void;
}> = ({ people, onOpen }) => {
  if (!people.length) return null;
  return (
    <section aria-label="Free now">
      <div className="flex items-center gap-2 mb-f3">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </span>
        <h3 className="text-[17px] font-semibold text-fg tracking-tight">Free now</h3>
        <span className="text-[13px] text-muted tabular-nums">{people.length}</span>
      </div>
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {people.map(({ f, s }, i) => {
          const place = placeOf(f.status?.place);
          const label = s.kind === 'free' ? (s.until === null ? 'free all day' : `till ${clock(s.until)}`) : s.kind === 'off' ? s.label : 'free';
          return (
            <motion.button
              key={f.uid}
              type="button"
              onClick={() => onOpen(f)}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 420, damping: 26 }}
              whileTap={{ scale: 0.92 }}
              className="shrink-0 w-[76px] flex flex-col items-center gap-1.5 cursor-pointer"
              aria-label={`Chat with ${f.name}`}
            >
              <span className="relative">
                <span className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 opacity-90" />
                <span className="relative block rounded-full ring-2 ring-canvas">
                  <Face p={f} size={60} />
                </span>
                {place && <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center text-[13px]">{place.emoji}</span>}
              </span>
              <span className="w-full text-center text-[12px] font-semibold text-fg truncate">{f.name.split(' ')[0]}</span>
              <span className="-mt-1 w-full text-center text-[10.5px] text-emerald-700 dark:text-emerald-400 truncate">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

// ---------- Chats ----------

/** WhatsApp-style time: clock today, "Yesterday", weekday this week, else a date. */
const listTime = (t: number) => {
  if (!t) return '';
  const d = new Date(t);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  if (now.getTime() - t < 6 * 86400000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** The Chats tab: every DM and plan chat, newest first, searchable. */
export const ChatsList: React.FC<{
  chats: ChatSummary[];
  me: string;
  people: Record<string, PersonLite>;
  onOpen: (c: ChatSummary) => void;
  onNew: () => void;
  canStart: boolean;
}> = ({ chats, me, people, onOpen, onNew, canStart }) => {
  const [q, setQ] = useState('');
  const nameOf = (c: ChatSummary) => {
    const other = c.type === 'dm' ? c.members.find((m) => m !== me) || '' : '';
    return c.type === 'dm' ? people[other]?.name || c.names[other] || 'Friend' : c.title || 'Plan';
  };
  const query = q.trim().toLowerCase();
  const shown = query ? chats.filter((c) => nameOf(c).toLowerCase().includes(query) || (c.lastMessage?.text || '').toLowerCase().includes(query)) : chats;

  if (!chats.length) {
    return (
      <section className="border border-line bg-surface px-5 py-f6 flex flex-col items-center text-center">
        <motion.span className="text-[48px] leading-none" animate={{ rotate: [0, 14, -6, 10, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}>
          💬
        </motion.span>
        <h3 className="mt-4 text-[18px] font-semibold text-fg">No chats yet</h3>
        <p className="mt-1.5 text-[14px] text-muted max-w-xs">{canStart ? 'Message a friend, or open a plan to chat with everyone in it.' : 'Add a friend first, then you can chat here.'}</p>
        {canStart && (
          <button type="button" onClick={onNew} className="btn btn-primary mt-5">
            <MessageCircle className="w-4 h-4" /> Start a chat
          </button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Chats" className="flex flex-col gap-f3">
      {chats.length > 6 && (
        <label className="flex items-center gap-2.5 h-11 px-3 border border-line bg-surface focus-within:border-fg transition-colors">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-fg placeholder:text-faint focus:outline-none"
          />
        </label>
      )}
      {shown.length === 0 ? (
        <p className="py-f4 text-center text-[14px] text-muted">No chats match &ldquo;{q}&rdquo;.</p>
      ) : (
        <ul className="border border-line bg-surface divide-y divide-line-soft">
          <AnimatePresence initial={false}>
            {shown.map((c) => {
              const other = c.type === 'dm' ? c.members.find((m) => m !== me) || '' : '';
              const last = c.lastMessage && c.lastMessage.at > (c.cleared?.[me] || 0) ? c.lastMessage : null;
              const mine = last?.by === me;
              const who = last && !mine && last.by !== 'system' && c.type === 'plan' ? `${(people[last.by]?.name || c.names[last.by] || 'Friend').split(' ')[0]}: ` : '';
              const preview = last ? `${who}${last.text}` : c.type === 'plan' ? 'Plan chat · say hi 👋' : 'Say hi 👋';
              return (
                <motion.li key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button type="button" onClick={() => onOpen(c)} className="w-full flex items-center gap-3 px-f4 py-3 text-left hover:bg-surface-2 active:bg-surface-2 transition-colors cursor-pointer">
                    {c.type === 'dm' ? (
                      <Face p={{ uid: other, avatarUrl: people[other]?.avatarUrl }} size={48} />
                    ) : (
                      <span className="w-12 h-12 shrink-0 rounded-full bg-ink text-on-ink flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className={clsx('flex-1 min-w-0 text-[16px] truncate text-fg', c.unread ? 'font-bold' : 'font-semibold')}>{nameOf(c)}</span>
                        <span className={clsx('shrink-0 text-[12px] tabular-nums', c.unread ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-faint')}>{listTime(last?.at || c.updatedAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={clsx('flex-1 min-w-0 flex items-center text-[14px] truncate', c.unread ? 'text-fg font-medium' : 'text-muted')}>
                          {mine && (
                            <span className="shrink-0 -ml-1 mr-0.5 text-muted">
                              <Ticks state={receiptFor(c, me, last!.at)} />
                            </span>
                          )}
                          <span className="truncate">{preview}</span>
                        </span>
                        {c.unread && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 w-[10px] h-[10px] rounded-full bg-emerald-500" aria-label="Unread" />
                        )}
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
};

// ---------- Plans ----------
const countdown = (at: Date) => {
  const m = Math.round((at.getTime() - Date.now()) / 60000);
  if (m <= 0 && m > -90) return { label: 'Happening now', hot: true };
  if (m <= -90) return { label: 'Earlier', hot: false };
  if (m < 60) return { label: `in ${m} min`, hot: m <= 15 };
  const today = new Date();
  const sameDay = at.toDateString() === today.toDateString();
  const t = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return { label: `Today, ${t}`, hot: false };
  const tm = new Date();
  tm.setDate(tm.getDate() + 1);
  if (at.toDateString() === tm.toDateString()) return { label: `Tomorrow, ${t}`, hot: false };
  return { label: `${at.toLocaleDateString('en-IN', { weekday: 'short' })}, ${t}`, hot: false };
};

const SEEN_KEY = (planId: string) => `plan_seen_in_${planId}`;

export const PlanCard: React.FC<{
  plan: Plan;
  me: string;
  myAnswer?: 'in' | 'out';
  busy?: boolean;
  onRespond: (answer: 'in' | 'out') => void;
  onCancel: () => void;
  onChat: () => void;
  onCelebrate?: (names: string[]) => void;
}> = ({ plan, me, myAnswer, busy, onRespond, onCancel, onChat, onCelebrate }) => {
  const inBtn = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const at = new Date(plan.at);
  const cd = countdown(at);
  const answerOf = (id: string) => (id === me ? myAnswer ?? plan.responses[id] : plan.responses[id]);
  const everyone: PersonLite[] = [{ uid: plan.byUid, name: plan.byName } as PersonLite, ...plan.invited];
  const going = everyone.filter((p) => answerOf(p.uid) === 'in');
  const out = everyone.filter((p) => answerOf(p.uid) === 'out');
  const waiting = everyone.length - going.length - out.length;
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  // Creator's moment: friends who said "I'm in" since I last looked pop in with confetti
  useEffect(() => {
    if (!plan.mine) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY(plan.id)) || '[]');
    } catch {}
    const nowIn = going.map((p) => p.uid).filter((u) => u !== me);
    const newcomers = nowIn.filter((u) => !seen.includes(u));
    if (newcomers.length) {
      setFresh(new Set(newcomers));
      onCelebrate?.(newcomers.map((u) => (everyone.find((p) => p.uid === u)?.name || 'A friend').split(' ')[0]));
      setTimeout(() => confettiBurst(cardRef.current, { count: 90 }), 250);
      setTimeout(() => setFresh(new Set()), 2600);
    }
    try {
      localStorage.setItem(SEEN_KEY(plan.id), JSON.stringify(nowIn));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, going.map((p) => p.uid).join('|')]);

  const sayIn = () => {
    if (myAnswer === 'in' || plan.responses[me] === 'in') return;
    confettiBurst(inBtn.current);
    if (typeof navigator !== 'undefined') navigator.vibrate?.(18);
    onRespond('in');
  };
  const iAmIn = answerOf(me) === 'in';

  return (
    <motion.article
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('relative overflow-hidden border bg-surface p-f4', cd.hot ? 'border-emerald-300 dark:border-emerald-500/40' : 'border-line')}
    >
      {cd.hot && <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={clsx('inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold', cd.hot ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-surface-2 text-muted')}>
            <Clock className="w-3 h-3" /> {cd.label}
          </span>
          <p className="mt-2 text-[18px] font-semibold text-fg tracking-tight truncate">{plan.title}</p>
          <p className="text-[13px] text-muted">by {plan.mine ? 'you' : plan.byName}</p>
        </div>
        {plan.mine && (
          <button type="button" disabled={busy} onClick={onCancel} className="text-[12px] font-semibold text-muted hover:text-rose-600 cursor-pointer">
            Cancel
          </button>
        )}
      </div>

      {/* Who's in */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center">
          <AnimatePresence initial={false}>
            {going.slice(0, 6).map((p, i) => (
              <motion.span
                key={p.uid}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={fresh.has(p.uid) ? { scale: [0, 1.35, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                className={clsx('rounded-full ring-2 ring-surface', i > 0 && '-ml-2.5', fresh.has(p.uid) && 'ring-emerald-400')}
              >
                <Face p={p} size={32} />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <p className="min-w-0 text-[13px] leading-[17px] text-fg-2">
          <motion.span key={going.length} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="inline-block font-bold text-emerald-700 dark:text-emerald-400">
            {going.length} in
          </motion.span>
          {waiting > 0 && <span className="text-muted"> · {waiting} yet to reply</span>}
          {out.length > 0 && <span className="text-muted"> · {out.length} can&apos;t</span>}
        </p>
      </div>

      <div className="mt-3.5 flex gap-2">
        {!plan.mine && (
          <>
            <motion.button
              ref={inBtn}
              type="button"
              layout
              whileTap={{ scale: 0.94 }}
              aria-pressed={iAmIn}
              onClick={sayIn}
              className={clsx(
                'flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold rounded-full cursor-pointer transition-colors',
                iAmIn ? 'bg-emerald-600 text-white' : 'bg-ink text-on-ink'
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {iAmIn ? (
                  <motion.span key="in" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="inline-flex items-center gap-1.5">
                    You&apos;re in 🎉
                  </motion.span>
                ) : (
                  <motion.span key="ask" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> I&apos;m in
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              aria-pressed={answerOf(me) === 'out'}
              onClick={() => answerOf(me) !== 'out' && onRespond('out')}
              className={clsx(
                'h-10 px-4 text-[14px] font-semibold rounded-full border cursor-pointer transition-colors',
                answerOf(me) === 'out' ? 'bg-surface-2 border-line text-fg' : 'border-line text-muted hover:text-fg'
              )}
            >
              Can&apos;t
            </motion.button>
          </>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onChat}
          className={clsx('h-10 px-4 inline-flex items-center gap-1.5 text-[14px] font-semibold rounded-full border border-line text-fg hover:bg-surface-2 cursor-pointer', plan.mine && 'flex-1 justify-center')}
          aria-label="Open plan chat"
        >
          <MessageCircle className="w-4 h-4" /> Chat
        </motion.button>
      </div>
    </motion.article>
  );
};

export const ChatRowButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <motion.button whileTap={{ scale: 0.88 }} type="button" onClick={onClick} aria-label={label} className="w-9 h-9 rounded-full flex items-center justify-center text-fg bg-surface-2 hover:bg-surface-3 cursor-pointer">
    <MessageCircle className="w-[17px] h-[17px]" />
  </motion.button>
);

export { ChevronRight };
