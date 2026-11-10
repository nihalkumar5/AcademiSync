'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronRight, MessageCircle, Users } from '@/components/ui/icons';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { clock, nowStatus } from '@/lib/friends';
import { useFriends } from './friendsClient';
import { useChats, useMarkDelivered } from './chat/chatClient';
import { requestOpenChat } from '@/lib/pushNotifications';

/** Home: which friends are free right now, plus the newest unread chat. Hidden until the student
 *  has friends. Same warm amber as the Batch Pilot panel, so it reads as "people" on Home. */
export const FriendsFreeNowCard: React.FC = () => {
  const { user, setActiveView, profile } = useApp() as any;
  const isStudent = profile?.role !== 'faculty';
  const { data } = useFriends(isStudent ? user?.id : null);
  const { chats, unreadCount } = useChats(isStudent ? user?.id : null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  if (!isStudent || !data || data.friends.length === 0) return null;

  const free = data.friends
    .filter((f) => !f.hidden)
    .map((f) => ({ f, s: nowStatus(f.days) }))
    .filter((x) => x.s.kind === 'free' || x.s.kind === 'off');

  const unread = chats.filter((c) => c.unread);
  const top = unread[0];
  const people: Record<string, { name: string; avatarUrl?: string }> = {};
  data.friends.forEach((f) => (people[f.uid] = f));
  const topOther = top?.type === 'dm' ? top.members.find((m) => m !== user?.id) || '' : '';
  const topName = top ? (top.type === 'dm' ? people[topOther]?.name || top.names[topOther] || 'Friend' : top.title || 'Plan') : '';
  const topWho = top?.lastMessage && top.type === 'plan' && top.lastMessage.by !== 'system' ? `${(people[top.lastMessage.by]?.name || top.names[top.lastMessage.by] || 'Friend').split(' ')[0]}: ` : '';

  return (
    <section className="w-full border border-amber-200/80 bg-amber-50 dark:bg-amber-400/[0.06] dark:border-amber-400/20 text-left">
      <button type="button" onClick={() => setActiveView('friends')} className="group w-full flex items-center gap-4 px-f4 py-f3 text-left hover:bg-amber-100/60 dark:hover:bg-amber-400/[0.08] transition-colors cursor-pointer">
        <div className="flex -space-x-2 shrink-0">
          {free.slice(0, 4).map(({ f }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.uid} src={getAvatarSrc(getAvatarSeed({ avatarUrl: f.avatarUrl, id: f.uid, role: 'student' }))} alt="" className="w-9 h-9 rounded-full bg-surface ring-2 ring-amber-50 dark:ring-[#1d1a12]" />
          ))}
          {free.length === 0 && <span className="w-9 h-9 rounded-full border border-dashed border-amber-400/60" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-fg">
            {free.length ? `${free.length} ${free.length === 1 ? 'friend is' : 'friends are'} free now` : 'No friends free right now'}
          </p>
          <p className="text-[13px] text-fg-2 truncate">
            {free.length
              ? free
                  .slice(0, 3)
                  .map(({ f, s }) => `${f.name.split(' ')[0]}${s.kind === 'free' && s.until !== null ? ` till ${clock(s.until)}` : ''}`)
                  .join(' · ')
              : 'See when they are free next'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {top && (
        <button
          type="button"
          onClick={() => {
            setActiveView('friends');
            requestOpenChat(top.id);
          }}
          className="group w-full flex items-center gap-3 px-f4 py-2.5 border-t border-amber-200/80 dark:border-amber-400/20 text-left hover:bg-amber-100/60 dark:hover:bg-amber-400/[0.08] transition-colors cursor-pointer"
          aria-label={`Open chat with ${topName}`}
        >
          <span className="relative shrink-0">
            {top.type === 'dm' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: people[topOther]?.avatarUrl, id: topOther, role: 'student' }))} alt="" className="w-8 h-8 rounded-full bg-surface" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-ink text-on-ink flex items-center justify-center">
                <Users className="w-4 h-4" />
              </span>
            )}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-amber-50 dark:ring-[#1d1a12]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[13px] font-semibold text-fg truncate">{topName}</span>
              {unreadCount > 1 && <span className="shrink-0 text-[11px] font-semibold text-muted">+{unreadCount - 1} more</span>}
            </span>
            <span className="block text-[13px] text-fg-2 truncate">
              {topWho}
              {top.lastMessage?.text || 'New message'}
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-emerald-500 text-white text-[12px] font-semibold">
            <MessageCircle className="w-3.5 h-3.5" /> Reply
          </span>
        </button>
      )}
    </section>
  );
};

export const FriendLinkHost: React.FC = () => {
  const { setActiveView } = useApp() as any;
  useEffect(() => {
    const take = (code: string | null) => {
      if (!code) return;
      try {
        sessionStorage.setItem('pending_friend_code', code.toUpperCase());
      } catch {}
      setActiveView('friends');
      setTimeout(() => window.dispatchEvent(new CustomEvent('friends:code')), 50);
    };
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('friend');
      if (code) {
        url.searchParams.delete('friend');
        window.history.replaceState({}, '', url.toString());
        take(code);
      }
      if (url.searchParams.get('view') === 'friends') {
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
        setActiveView('friends');
      }
    } catch {}
    const onLink = (e: Event) => take((e as CustomEvent).detail || null);
    window.addEventListener('friends:link', onLink);
    // A tapped chat notification: go to Friends; FriendsView then opens the chat itself
    const onChat = () => setActiveView('friends');
    window.addEventListener('friends:open-chat', onChat);
    try {
      if (sessionStorage.getItem('pending_chat')) setActiveView('friends');
    } catch {}
    return () => {
      window.removeEventListener('friends:link', onLink);
      window.removeEventListener('friends:open-chat', onChat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

/** Mounted app-wide: marks new chat messages as delivered so senders see the double tick. */
export const ChatDeliveryHost: React.FC = () => {
  const { user } = useApp() as any;
  useMarkDelivered(user?.id);
  return null;
};
