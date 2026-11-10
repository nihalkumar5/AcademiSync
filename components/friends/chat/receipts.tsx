'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { ChatSummary } from './chatClient';

// WhatsApp-style receipt: clock while sending, one tick sent, two grey delivered, two blue read
export type Receipt = 'pending' | 'sent' | 'delivered' | 'read';
export const Ticks: React.FC<{ state: Receipt }> = ({ state }) => {
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

/** Receipt for my message sent at `at`: read once every other member opened the chat after it. */
export const receiptFor = (chat: Pick<ChatSummary, 'members' | 'reads' | 'delivered'>, me: string, at: number, pending = false): Receipt => {
  if (pending || !at) return 'pending';
  const others = (chat.members || []).filter((u) => u !== me);
  if (!others.length) return 'sent';
  const r = chat.reads || {};
  const d = chat.delivered || {};
  if (others.every((u) => (r[u] || 0) >= at)) return 'read';
  if (others.every((u) => Math.max(d[u] || 0, r[u] || 0) >= at)) return 'delivered';
  return 'sent';
};
