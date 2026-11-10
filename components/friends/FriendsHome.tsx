'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronRight } from '@/components/ui/icons';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { clock, nowStatus } from '@/lib/friends';
import { useFriends } from './friendsClient';
import { openDmChat, useMarkDelivered } from './chat/chatClient';
import { requestOpenChat } from '@/lib/pushNotifications';

/** Home: which friends are free right now. Hidden until the student
 *  has friends. Same warm amber as the Batch Pilot panel, so it reads as "people" on Home. */
export const FriendsFreeNowCard: React.FC = () => {
  const { user, setActiveView, profile, showToast } = useApp() as any;
  const isStudent = profile?.role !== 'faculty';
  const { data } = useFriends(isStudent ? user?.id : null);
  const [opening, setOpening] = useState<string | null>(null);
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

  const chatWith = async (uid: string) => {
    if (opening) return;
    setOpening(uid);
    try {
      const chatId = await openDmChat(uid);
      setActiveView('friends');
      requestOpenChat(chatId);
    } catch (e: any) {
      showToast?.("Couldn't open chat", e?.message || 'Try again.', 'error');
    } finally {
      setOpening(null);
    }
  };

  return (
    <section className="group w-full flex items-center gap-4 border border-amber-200/80 bg-amber-50 dark:bg-amber-400/[0.06] dark:border-amber-400/20 px-f4 py-f3">
      {/* Each free friend's face opens a chat with them */}
      <div className="flex -space-x-2 shrink-0">
        {free.slice(0, 4).map(({ f }) => (
          <button
            key={f.uid}
            type="button"
            onClick={() => chatWith(f.uid)}
            aria-label={`Chat with ${f.name}`}
            title={`Chat with ${f.name.split(' ')[0]}`}
            className="relative rounded-full ring-2 ring-amber-50 dark:ring-[#1d1a12] hover:z-10 hover:-translate-y-0.5 active:scale-95 transition-transform cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: f.avatarUrl, id: f.uid, role: 'student' }))} alt="" className={`w-9 h-9 rounded-full bg-surface ${opening === f.uid ? 'animate-pulse' : ''}`} />
          </button>
        ))}
        {free.length === 0 && <span className="w-9 h-9 rounded-full border border-dashed border-amber-400/60" />}
      </div>
      <button type="button" onClick={() => setActiveView('friends')} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer">
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-fg">
            {free.length ? `${free.length} ${free.length === 1 ? 'friend is' : 'friends are'} free now` : 'No friends free right now'}
          </span>
          <span className="block text-[13px] text-fg-2 truncate">
            {free.length
              ? free
                  .slice(0, 3)
                  .map(({ f, s }) => `${f.name.split(' ')[0]}${s.kind === 'free' && s.until !== null ? ` till ${clock(s.until)}` : ''}`)
                  .join(' · ')
              : 'See when they are free next'}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>
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
