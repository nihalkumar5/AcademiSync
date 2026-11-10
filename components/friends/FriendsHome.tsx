'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronRight } from '@/components/ui/icons';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { clock, nowStatus } from '@/lib/friends';
import { useFriends } from './friendsClient';
import { useMarkDelivered } from './chat/chatClient';

/** Home: which friends are free right now. Hidden until the student has friends. */
export const FriendsFreeNowCard: React.FC = () => {
  const { user, setActiveView, profile } = useApp() as any;
  const isStudent = profile?.role !== 'faculty';
  const { data } = useFriends(isStudent ? user?.id : null);
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

  return (
    <button type="button" onClick={() => setActiveView('friends')} className="group w-full flex items-center gap-4 border border-line bg-surface px-f4 py-f3 text-left hover:bg-surface-2 transition-colors cursor-pointer">
      <div className="flex -space-x-2 shrink-0">
        {(free.length ? free : []).slice(0, 4).map(({ f }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f.uid} src={getAvatarSrc(getAvatarSeed({ avatarUrl: f.avatarUrl, id: f.uid, role: 'student' }))} alt="" className="w-9 h-9 rounded-full bg-surface-2 ring-2 ring-surface" />
        ))}
        {free.length === 0 && <span className="w-9 h-9 rounded-full border border-dashed border-line-strong" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-fg">
          {free.length ? `${free.length} ${free.length === 1 ? 'friend is' : 'friends are'} free now` : 'No friends free right now'}
        </p>
        <p className="text-[13px] text-muted truncate">
          {free.length
            ? free
                .slice(0, 3)
                .map(({ f, s }) => `${f.name.split(' ')[0]}${s.kind === 'free' && s.until !== null ? ` till ${clock(s.until)}` : ''}`)
                .join(' · ')
            : 'See when they are free next'}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-faint shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
};

/** Opens Friends with the code when the app is opened from a friend QR / link (?friend=CODE). */
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
    return () => window.removeEventListener('friends:link', onLink);
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
