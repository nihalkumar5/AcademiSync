'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { PersonLite } from '@/lib/friends';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { ArrowLeft, Flag, MoreHorizontal, Send, ShieldOff, Trash2, Users } from '@/components/ui/icons';
import {
  ChatMessage,
  ChatSummary,
  MAX_CHAT_CHARS,
  QUICK_REACTIONS,
  blockPerson,
  deleteMessage,
  markRead,
  reactTo,
  reportChat,
  sendMessage,
  setTyping,
  useMessages,
} from './chatClient';

// One chat, full screen above everything: a DM with a friend or a plan's group chat.

const STARTERS = ['Free now? 👀', 'Canteen? ☕', 'Library in 10?', 'Notes bhej de 🙏'];

const dayKey = (t: number) => {
  const d = new Date(t || Date.now());
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const dayTitle = (t: number) => {
  const d = new Date(t || Date.now());
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const clock = (t: number) => (t ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');

// WhatsApp-style receipt: clock while sending, one tick sent, two grey delivered, two blue read
type Receipt = 'pending' | 'sent' | 'delivered' | 'read';
const Ticks: React.FC<{ state: Receipt }> = ({ state }) => {
  if (state === 'pending')
    return (
      <svg viewBox="0 0 16 16" className="inline-block w-[13px] h-[13px] ml-1 -mt-0.5 opacity-70" aria-label="Sending">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4.8V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  const double = state !== 'sent';
  return (
    <motion.svg
      key={state}
      viewBox="0 0 18 11"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      className={clsx('inline-block w-[17px] h-[11px] ml-1 -mt-0.5', state === 'read' ? 'text-[#34B7F1]' : 'opacity-70')}
      aria-label={state === 'read' ? 'Read' : state === 'delivered' ? 'Delivered' : 'Sent'}
    >
      <path d="M1.5 6l3 3 6-7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      {double && <path d="M8.2 8.6l.9.9 6-7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
    </motion.svg>
  );
};

const TypingDots: React.FC = () => (
  <span className="inline-flex items-center gap-[3px] h-[21px]">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-[7px] h-[7px] rounded-full bg-current opacity-60"
        animate={{ y: [0, -4, 0], opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
      />
    ))}
  </span>
);

/** Who else is typing. Timed from when the change reached us, so phone clocks don't matter. */
function useTypingOthers(typing: Record<string, number> | undefined, me: string) {
  const seen = useRef<Record<string, { v: number; at: number }>>({});
  const [, tick] = useState(0);
  useEffect(() => {
    const now = Date.now();
    const next: Record<string, { v: number; at: number }> = {};
    Object.entries(typing || {}).forEach(([uid, v]) => {
      if (uid === me || !v) return;
      const prev = seen.current[uid];
      if (prev && prev.v === v) next[uid] = prev;
      else if (prev || v > now - 15000) next[uid] = { v, at: now };
    });
    seen.current = next;
    tick((n) => n + 1);
  }, [typing, me]);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const now = Date.now();
  return Object.entries(seen.current)
    .filter(([, x]) => now - x.at < 6000)
    .map(([uid]) => uid);
}

const Avatar: React.FC<{ p?: PersonLite | null; uid: string; size?: number }> = ({ p, uid, size = 36 }) => (
  <span className="shrink-0 rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-[#F4F4F6]" style={{ width: size, height: size }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: p?.avatarUrl, id: uid, role: 'student' }))} alt="" className="w-full h-full object-cover scale-110 translate-y-[1px]" />
  </span>
);

export const ChatThread: React.FC<{
  chat: ChatSummary | null;
  me: string;
  people: Record<string, PersonLite>;
  subtitle?: string;
  onClose: () => void;
  onBlocked?: () => void;
  showToast?: (title: string, body?: string, kind?: string) => void;
}> = ({ chat, me, people, subtitle, onClose, onBlocked, showToast }) => {
  const [mounted, setMounted] = useState(false);
  const { messages, error } = useMessages(chat?.id || null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPaint = useRef(true);

  useEffect(() => setMounted(true), []);

  // Lock the page behind, close on Escape
  useEffect(() => {
    if (!chat) return;
    firstPaint.current = true;
    setText('');
    setPicker(null);
    setMenu(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [chat?.id, onClose]);

  // While this chat is open, an incoming push for it needs no banner
  useEffect(() => {
    if (!chat?.id) return;
    (window as any).__openChatId = chat.id;
    return () => {
      if ((window as any).__openChatId === chat.id) (window as any).__openChatId = null;
    };
  }, [chat?.id]);

  // Typing: tell others at most every 3 s while I type, and stop when I clear, send or leave
  const typingSentAt = useRef(0);
  const chatIdForTyping = chat?.id;
  const onTyping = (value: string) => {
    if (!chatIdForTyping) return;
    if (!value.trim()) {
      if (typingSentAt.current) setTyping(chatIdForTyping, me, false);
      typingSentAt.current = 0;
      return;
    }
    if (Date.now() - typingSentAt.current > 3000) {
      typingSentAt.current = Date.now();
      setTyping(chatIdForTyping, me, true);
    }
  };
  useEffect(() => {
    if (!chatIdForTyping) return;
    return () => {
      if (typingSentAt.current) setTyping(chatIdForTyping, me, false);
      typingSentAt.current = 0;
    };
  }, [chatIdForTyping, me]);
  const typingOthers = useTypingOthers(chat?.typing, me);

  // Read receipts for myself, and stick to the bottom as messages arrive
  useEffect(() => {
    if (chat?.id) markRead(chat.id, me);
  }, [chat?.id, messages.length, me]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (firstPaint.current || nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: firstPaint.current ? 'auto' : 'smooth' });
      if (messages.length) firstPaint.current = false;
    }
  }, [messages.length, typingOthers.length]);

  // Grow the composer with its text (up to 5 lines)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  const other = chat?.type === 'dm' ? chat.members.find((m) => m !== me) || '' : '';
  const title = chat ? (chat.type === 'dm' ? people[other]?.name || chat.names[other] || 'Friend' : chat.title || 'Plan') : '';
  const nameOf = useCallback((uid: string) => (uid === me ? 'You' : people[uid]?.name?.split(' ')[0] || chat?.names[uid]?.split(' ')[0] || 'Friend'), [me, people, chat?.names]);

  const receiptOf = (m: ChatMessage): Receipt => {
    if (m.pending || !m.at) return 'pending';
    const others = (chat?.members || []).filter((u) => u !== me);
    if (!others.length) return 'sent';
    const r = chat?.reads || {};
    const d = chat?.delivered || {};
    if (others.every((u) => (r[u] || 0) >= m.at)) return 'read';
    if (others.every((u) => Math.max(d[u] || 0, r[u] || 0) >= m.at)) return 'delivered';
    return 'sent';
  };

  const groups = useMemo(() => {
    const out: { key: string; title: string; items: ChatMessage[] }[] = [];
    messages.forEach((m) => {
      const k = dayKey(m.at);
      const g = out[out.length - 1];
      if (g && g.key === k) g.items.push(m);
      else out.push({ key: k, title: dayTitle(m.at), items: [m] });
    });
    return out;
  }, [messages]);

  if (!mounted || !chat) return null;

  const send = async (raw = text) => {
    const t = raw.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    typingSentAt.current = 0;
    try {
      await sendMessage(chat.id, me, t);
    } catch (e: any) {
      setText(t);
      showToast?.(
        "Couldn't send",
        e?.code === 'permission-denied' ? (chat.type === 'dm' ? "You're no longer friends, so this chat is closed." : "You're not in this plan any more.") : 'Check your connection and try again.',
        'error'
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const startPress = (m: ChatMessage) => {
    if (m.by === 'system') return;
    pressTimer.current = setTimeout(() => setPicker(m), 420);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const react = async (m: ChatMessage, emoji: string) => {
    setPicker(null);
    try {
      await reactTo(chat.id, m.id, me, m.reactions[me] === emoji ? null : emoji);
    } catch {
      showToast?.("Couldn't react", 'Try again.', 'error');
    }
  };

  const closed = error === 'denied';

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100040] bg-canvas flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${title}`}
    >
      {/* Header */}
      <header className="lg-header-bar shrink-0 flex items-center gap-3 px-3 pb-2.5" style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 8px), 14px)' }}>
        <button type="button" onClick={onClose} aria-label="Back" className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-fg hover:bg-surface-2 cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {chat.type === 'dm' ? (
          <Avatar p={people[other]} uid={other} size={38} />
        ) : (
          <span className="w-[38px] h-[38px] shrink-0 rounded-full bg-ink text-on-ink flex items-center justify-center">
            <Users className="w-[18px] h-[18px]" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-fg truncate leading-tight">{title}</p>
          <p className="text-[12px] text-muted truncate">
            {typingOthers.length ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {chat.type === 'dm' ? 'typing…' : `${typingOthers.map(nameOf).join(', ')} ${typingOthers.length > 1 ? 'are' : 'is'} typing…`}
              </span>
            ) : (
              subtitle || (chat.type === 'plan' ? chat.members.map(nameOf).join(', ') : 'Friend')
            )}
          </p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Chat options" className="w-10 h-10 rounded-full flex items-center justify-center text-fg hover:bg-surface-2 cursor-pointer">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="lg lg-menu absolute right-0 mt-1 w-56 rounded-[16px] overflow-hidden z-10 p-1"
              >
                <button
                  type="button"
                  onClick={async () => {
                    setMenu(false);
                    try {
                      await reportChat(chat.id, undefined, 'chat');
                      showToast?.('Reported', "Thanks. We'll take a look.", 'success');
                    } catch {
                      showToast?.("Couldn't report", 'Try again.', 'error');
                    }
                  }}
                  className="w-full h-11 px-3 flex items-center gap-2.5 rounded-[12px] text-[14px] font-medium text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.07] cursor-pointer"
                >
                  <Flag className="w-4 h-4" /> Report chat
                </button>
                {chat.type === 'dm' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      setConfirmBlock(true);
                    }}
                    className="w-full h-11 px-3 flex items-center gap-2.5 rounded-[12px] text-[14px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                  >
                    <ShieldOff className="w-4 h-4" /> Block {title.split(' ')[0]}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Messages */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-3 pb-2" onClick={() => (picker ? setPicker(null) : menu && setMenu(false))}>
        {messages.length === 0 && !error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col items-center justify-center text-center px-6">
            <motion.span className="text-[44px]" animate={{ rotate: [0, 18, -8, 14, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.6 }}>
              👋
            </motion.span>
            <p className="mt-2 text-[16px] font-semibold text-fg">{chat.type === 'dm' ? `Say hi to ${title.split(' ')[0]}` : 'Plan it out here'}</p>
            <p className="mt-1 text-[13px] text-muted">Messages stay between {chat.type === 'dm' ? 'you two' : 'people in this plan'}.</p>
          </motion.div>
        )}
        {closed && <p className="mx-auto my-6 max-w-xs text-center text-[13px] text-muted">This chat isn&apos;t available any more.</p>}

        {groups.map((g) => (
          <section key={g.key}>
            <div className="my-3 flex justify-center">
              <span className="px-2.5 h-6 inline-flex items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">{g.title}</span>
            </div>
            {g.items.map((m, i) => {
              if (m.by === 'system')
                return (
                  <motion.div key={m.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="my-2 flex justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 text-[12px] font-semibold text-center">{m.text}</span>
                  </motion.div>
                );
              const mine = m.by === me;
              const prev = g.items[i - 1];
              const showName = chat.type === 'plan' && !mine && (!prev || prev.by !== m.by);
              const reactions = Object.entries(m.reactions);
              const counts = reactions.reduce<Record<string, number>>((acc, [, e]) => ((acc[e] = (acc[e] || 0) + 1), acc), {});
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: m.pending ? 0.7 : 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  className={clsx('flex flex-col mb-1', mine ? 'items-end' : 'items-start', reactions.length && 'mb-4')}
                >
                  {showName && <span className="ml-3 mb-0.5 text-[11px] font-semibold text-muted">{nameOf(m.by)}</span>}
                  <div className="relative max-w-[80%]">
                    <button
                      type="button"
                      onPointerDown={() => startPress(m)}
                      onPointerUp={endPress}
                      onPointerLeave={endPress}
                      onDoubleClick={() => react(m, '❤️')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setPicker(m);
                      }}
                      className={clsx(
                        'text-left px-3.5 py-2 text-[15px] leading-[21px] whitespace-pre-wrap break-words select-text cursor-default',
                        mine ? 'bg-ink text-on-ink rounded-[20px] rounded-br-[6px]' : 'bg-surface-2 text-fg rounded-[20px] rounded-bl-[6px]'
                      )}
                    >
                      {m.text}
                      <span className={clsx('ml-2 align-bottom text-[10px] tabular-nums whitespace-nowrap', mine ? 'text-on-ink/60' : 'text-faint')}>
                        {m.pending ? '' : clock(m.at)}
                        {mine && <Ticks state={receiptOf(m)} />}
                      </span>
                    </button>
                    {reactions.length > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                        className={clsx('absolute -bottom-3.5 flex items-center gap-0.5 px-1.5 h-6 rounded-full bg-surface border border-line text-[12px] shadow-sm', mine ? 'right-2' : 'left-2')}
                      >
                        {Object.entries(counts).map(([e, n]) => (
                          <span key={e}>
                            {e}
                            {n > 1 && <span className="text-[10px] text-muted ml-0.5">{n}</span>}
                          </span>
                        ))}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </section>
        ))}

        <AnimatePresence>
          {typingOthers.length > 0 && !closed && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 520, damping: 32 }}
              className="flex flex-col items-start mb-1"
            >
              {chat.type === 'plan' && <span className="ml-3 mb-0.5 text-[11px] font-semibold text-muted">{typingOthers.map(nameOf).join(', ')}</span>}
              <div className="px-4 py-2 bg-surface-2 text-muted rounded-[20px] rounded-bl-[6px]" aria-label="Typing">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reaction picker */}
      <AnimatePresence>
        {picker && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute inset-x-0 bottom-[96px] flex justify-center px-4 z-20"
          >
            <div className="lg lg-menu rounded-full p-1.5 flex items-center gap-1">
              {QUICK_REACTIONS.map((e, i) => (
                <motion.button
                  key={e}
                  type="button"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 600, damping: 20 }}
                  whileTap={{ scale: 1.35 }}
                  onClick={() => react(picker, e)}
                  className={clsx('w-10 h-10 rounded-full text-[22px] flex items-center justify-center cursor-pointer', picker.reactions[me] === e ? 'bg-black/[0.08] dark:bg-white/[0.12]' : 'hover:bg-black/[0.05]')}
                  aria-label={`React ${e}`}
                >
                  {e}
                </motion.button>
              ))}
              <span className="w-px h-6 bg-line mx-0.5" />
              {picker.by === me ? (
                <button
                  type="button"
                  aria-label="Delete message"
                  onClick={async () => {
                    const m = picker;
                    setPicker(null);
                    await deleteMessage(chat.id, m.id).catch(() => showToast?.("Couldn't delete", 'Try again.', 'error'));
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Report message"
                  onClick={async () => {
                    const m = picker;
                    setPicker(null);
                    try {
                      await reportChat(chat.id, m.id, 'message');
                      showToast?.('Reported', "Thanks. We'll take a look.", 'success');
                    } catch {
                      showToast?.("Couldn't report", 'Try again.', 'error');
                    }
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-fg cursor-pointer"
                >
                  <Flag className="w-[18px] h-[18px]" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="shrink-0 border-t border-line-soft bg-canvas px-3 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 8px), 12px)' }}>
        {messages.length === 0 && !closed && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="shrink-0 h-8 px-3 rounded-full border border-line text-[13px] font-medium text-fg hover:bg-surface-2 cursor-pointer">
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            maxLength={MAX_CHAT_CHARS}
            disabled={closed}
            onChange={(e) => {
              setText(e.target.value);
              onTyping(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={closed ? 'This chat is closed' : 'Message'}
            className="flex-1 min-w-0 resize-none rounded-[22px] border border-line bg-surface px-4 py-2.5 text-[16px] leading-[22px] text-fg placeholder:text-faint focus:outline-none focus:border-fg/40"
          />
          <motion.button
            type="button"
            onClick={() => send()}
            disabled={!text.trim() || sending || closed}
            whileTap={{ scale: 0.88 }}
            animate={{ scale: text.trim() ? 1 : 0.9, opacity: text.trim() ? 1 : 0.4 }}
            aria-label="Send"
            className="w-11 h-11 shrink-0 rounded-full bg-ink text-on-ink flex items-center justify-center cursor-pointer disabled:cursor-default"
          >
            <Send className="w-[18px] h-[18px]" />
          </motion.button>
        </div>
      </div>

      {/* Block confirm */}
      <AnimatePresence>
        {confirmBlock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setConfirmBlock(false)}>
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-surface rounded-[22px] p-5"
            >
              <p className="text-[17px] font-semibold text-fg">Block {title}?</p>
              <p className="mt-1.5 text-[14px] text-muted">You won&apos;t be friends any more, this chat closes, and neither of you can send a new request.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmBlock(false)} className="h-11 rounded-full border border-line text-[14px] font-semibold text-fg cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmBlock(false);
                    try {
                      await blockPerson(other);
                      showToast?.('Blocked', `${title} can't message you now.`, 'info');
                      onBlocked?.();
                      onClose();
                    } catch {
                      showToast?.("Couldn't block", 'Try again.', 'error');
                    }
                  }}
                  className="h-11 rounded-full bg-rose-600 text-white text-[14px] font-semibold cursor-pointer"
                >
                  Block
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
};
