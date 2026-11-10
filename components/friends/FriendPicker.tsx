'use client';

import React, { useMemo, useState } from 'react';
import type { PersonLite } from '@/lib/friends';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { Check, Loader2, Search } from '@/components/ui/icons';

// Tick-list of my friends for "share with friends" sheets. Search shows up past 8 friends.
export const FriendPicker: React.FC<{
  friends: PersonLite[];
  loading: boolean;
  picked: string[];
  onChange: (uids: string[]) => void;
  onFindFriends: () => void;
  emptyText?: string;
}> = ({ friends, loading, picked, onChange, onFindFriends, emptyText = 'Add friends to share with just them.' }) => {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? friends.filter((f) => f.name.toLowerCase().includes(q) || (f.branch || '').toLowerCase().includes(q)) : friends;
  }, [friends, query]);

  if (loading && friends.length === 0) {
    return (
      <div className="h-14 flex items-center justify-center border border-line text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }
  if (friends.length === 0) {
    return (
      <div className="p-f3 border border-line flex items-center justify-between gap-f3">
        <p className="text-[13px] text-muted">{emptyText}</p>
        <button type="button" onClick={onFindFriends} className="shrink-0 h-9 px-3 border border-line text-[13px] font-semibold text-fg cursor-pointer hover:bg-surface-2">
          Find friends
        </button>
      </div>
    );
  }

  const toggle = (uid: string) => onChange(picked.includes(uid) ? picked.filter((x) => x !== uid) : [...picked, uid]);
  const allOn = friends.length > 1 && friends.every((f) => picked.includes(f.uid));

  return (
    <div className="flex flex-col gap-2">
      {friends.length > 8 && (
        <label className="flex items-center gap-2 h-10 px-3 border border-line bg-surface">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            className="flex-1 min-w-0 bg-transparent text-[14px] text-fg focus:outline-none placeholder:text-faint"
          />
        </label>
      )}
      {friends.length > 1 && !query && (
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : friends.map((f) => f.uid))}
          className="self-end text-[12px] font-semibold text-muted hover:text-fg cursor-pointer"
        >
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      )}
      <ul className="max-h-[264px] overflow-y-auto overscroll-contain border border-line divide-y divide-line-soft">
        {visible.map((f) => {
          const on = picked.includes(f.uid);
          const sub = f.sameBatch ? 'Your batch' : [f.branch, f.semester ? `Sem ${f.semester}` : ''].filter(Boolean).join(' · ');
          return (
            <li key={f.uid}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(f.uid)}
                className="w-full flex items-center gap-f3 px-f3 py-2.5 text-left cursor-pointer hover:bg-surface-2"
              >
                <span className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-[#F4F4F6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: f.avatarUrl, id: f.uid, role: 'student' }))} alt="" className="w-full h-full object-cover scale-110 translate-y-[1px]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-fg truncate">{f.name}</span>
                  {sub && <span className="block text-[12px] text-muted truncate">{sub}</span>}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 border flex items-center justify-center ${on ? 'bg-ink border-line-strong text-on-ink' : 'border-[#BDBDBD] dark:border-white/30'}`}
                >
                  {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && <li className="px-f3 py-3 text-[13px] text-muted">No friend matches “{query}”</li>}
      </ul>
    </div>
  );
};
