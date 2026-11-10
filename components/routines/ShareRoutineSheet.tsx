'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Routine } from '@/lib/types';
import type { PersonLite } from '@/lib/friends';
import { getRoutineCategory, repeatLabel, formatRoutineTime } from '@/lib/routines';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { Icon3D, iconForRoutine } from './Icon3D';
import { Check, Loader2, Lock, Search, Users } from '@/components/ui/icons';

export interface ShareTarget {
  batchKey: string;
  label: string;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

const Tick: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    aria-hidden="true"
    className={`w-5 h-5 shrink-0 border flex items-center justify-center ${
      on ? 'bg-ink border-line-strong text-on-ink' : 'border-[#BDBDBD] dark:border-white/30'
    }`}
  >
    {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
  </span>
);

export const ShareRoutineSheet: React.FC<{
  routine: Routine | null;
  onClose: () => void;
  blockedReason: 'signin' | 'nobatch' | null;
  targets: ShareTarget[];
  sharedTo: Set<string>; // batch keys this routine is already shared to
  notifiesBatch: boolean; // faculty / pilots also send a push to the batch
  onShare: (batchKeys: string[]) => Promise<void>;
  onUnshare: (batchKey: string) => Promise<void>;
  onGoToProfile: () => void;
  /** Friends (students only; faculty don't have Friends) */
  showFriends: boolean;
  friends: PersonLite[];
  friendsLoading: boolean;
  sharedWithFriends: string[]; // friend uids this routine is shared with
  onShareFriends: (uids: string[]) => Promise<void>;
  onGoToFriends: () => void;
}> = ({
  routine,
  onClose,
  blockedReason,
  targets,
  sharedTo,
  notifiesBatch,
  onShare,
  onUnshare,
  onGoToProfile,
  showFriends,
  friends,
  friendsLoading,
  sharedWithFriends,
  onShareFriends,
  onGoToFriends,
}) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!routine) return;
    // Batches: nothing pre-ticked, so opening the sheet to share with one friend never spams the class
    setPicked([]);
    setPickedFriends(sharedWithFriends);
    setQuery('');
  }, [routine?.id, sharedWithFriends.join('|')]);

  const visibleFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.name.toLowerCase().includes(q) || (f.branch || '').toLowerCase().includes(q));
  }, [friends, query]);

  if (!routine) return null;
  const c = getRoutineCategory(routine.category);
  const toShare = picked.filter((k) => !sharedTo.has(k));
  const friendsChanged = !sameSet(pickedFriends, sharedWithFriends);
  const changed = friendsChanged || toShare.length > 0;
  const newFriends = pickedFriends.filter((u) => !sharedWithFriends.includes(u)).length;
  const parts: string[] = [];
  if (friendsChanged && newFriends > 0) parts.push(`${pickedFriends.length} ${pickedFriends.length === 1 ? 'friend' : 'friends'}`);
  if (toShare.length) parts.push(toShare.length === 1 ? (targets.length > 1 ? '1 batch' : 'your batch') : `${toShare.length} batches`);
  const actionLabel = !changed
    ? 'Done'
    : parts.length
    ? `Share with ${parts.join(' and ')}`
    : pickedFriends.length === 0
    ? 'Stop sharing with friends'
    : 'Save';

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const apply = async () => {
    if (!changed) return onClose();
    setBusy('share');
    try {
      if (friendsChanged) await onShareFriends(pickedFriends);
      if (toShare.length) await onShare(toShare);
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen={!!routine} onClose={onClose} title="Share routine">
      <div className="flex flex-col gap-f4">
        {/* What will be shared */}
        <div className="flex items-center gap-f3 p-f3 border border-line">
          <span className="w-10 h-10 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
            <Icon3D name={iconForRoutine(routine.title, routine.category)} size={26} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-fg truncate">{routine.title}</p>
            <p className="text-[13px] text-muted">
              {repeatLabel(routine)} · {formatRoutineTime(routine.time)}
              {routine.durationMinutes ? ` · ${routine.durationMinutes} min` : ''}
            </p>
          </div>
        </div>

        {blockedReason === 'signin' ? (
          <div className="flex flex-col items-start gap-f3">
            <p className="text-[15px] text-fg">Sign in to share routines with friends or your batch.</p>
            <button type="button" onClick={onGoToProfile} className="h-11 px-4 bg-ink text-on-ink text-[14px] font-semibold cursor-pointer">
              Go to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Friends */}
            {showFriends && (
              <section aria-label="Friends">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-medium text-fg">Friends</p>
                  {pickedFriends.length > 0 && <span className="text-[12px] text-muted tabular-nums">{pickedFriends.length} selected</span>}
                </div>

                {friendsLoading && friends.length === 0 ? (
                  <div className="mt-2 h-14 flex items-center justify-center border border-line text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : friends.length === 0 ? (
                  <div className="mt-2 p-f3 border border-line flex items-center justify-between gap-f3">
                    <p className="text-[13px] text-muted">Add friends to share routines with just them.</p>
                    <button type="button" onClick={onGoToFriends} className="shrink-0 h-9 px-3 border border-line text-[13px] font-semibold text-fg cursor-pointer hover:bg-surface-2">
                      Find friends
                    </button>
                  </div>
                ) : (
                  <>
                    {friends.length > 8 && (
                      <label className="mt-2 flex items-center gap-2 h-10 px-3 border border-line bg-surface">
                        <Search className="w-4 h-4 text-muted shrink-0" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search friends"
                          className="flex-1 min-w-0 bg-transparent text-[14px] text-fg focus:outline-none placeholder:text-faint"
                        />
                      </label>
                    )}
                    <ul className="mt-2 max-h-[264px] overflow-y-auto overscroll-contain border border-line divide-y divide-line-soft">
                      {visibleFriends.map((f) => {
                        const on = pickedFriends.includes(f.uid);
                        const sub = f.sameBatch ? 'Your batch' : [f.branch, f.semester ? `Sem ${f.semester}` : ''].filter(Boolean).join(' · ');
                        return (
                          <li key={f.uid}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              onClick={() => setPickedFriends((p) => toggle(p, f.uid))}
                              className="w-full flex items-center gap-f3 px-f3 py-2.5 text-left cursor-pointer hover:bg-surface-2"
                            >
                              <span className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-[#F4F4F6]">
                                <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: f.avatarUrl, id: f.uid, role: 'student' }))} alt="" className="w-full h-full object-cover scale-110 translate-y-[1px]" />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[14px] font-medium text-fg truncate">{f.name}</span>
                                {sub && <span className="block text-[12px] text-muted truncate">{sub}</span>}
                              </span>
                              <Tick on={on} />
                            </button>
                          </li>
                        );
                      })}
                      {visibleFriends.length === 0 && <li className="px-f3 py-3 text-[13px] text-muted">No friend matches “{query}”</li>}
                    </ul>
                  </>
                )}
              </section>
            )}

            {/* Batch */}
            <section aria-label="Your batch">
              <p className="text-[14px] font-medium text-fg">{targets.length > 1 ? 'Batches' : 'Your batch'}</p>
              {blockedReason === 'nobatch' ? (
                <div className="mt-2 p-f3 border border-line flex items-center justify-between gap-f3">
                  <p className="text-[13px] text-muted">Join your batch to share with your whole class.</p>
                  <button type="button" onClick={onGoToProfile} className="shrink-0 h-9 px-3 border border-line text-[13px] font-semibold text-fg cursor-pointer hover:bg-surface-2">
                    Connect batch
                  </button>
                </div>
              ) : (
                <ul className="mt-2 border border-line divide-y divide-line-soft">
                  {targets.map((t) => {
                    const already = sharedTo.has(t.batchKey);
                    const on = already || picked.includes(t.batchKey);
                    return (
                      <li key={t.batchKey} className="flex items-center gap-f3 px-f3 py-2.5">
                        {already ? (
                          <Users className="w-4 h-4 shrink-0 text-muted" />
                        ) : (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            aria-label={`Share with ${t.label}`}
                            onClick={() => setPicked((p) => toggle(p, t.batchKey))}
                            className="cursor-pointer"
                          >
                            <Tick on={on} />
                          </button>
                        )}
                        <span className="flex-1 min-w-0 text-[14px] text-fg truncate">{t.label}</span>
                        {already && (
                          <button
                            type="button"
                            disabled={busy === t.batchKey}
                            onClick={async () => {
                              setBusy(t.batchKey);
                              await onUnshare(t.batchKey);
                              setBusy(null);
                            }}
                            className="shrink-0 text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:underline underline-offset-4 cursor-pointer"
                          >
                            {busy === t.batchKey ? 'Removing…' : 'Stop sharing'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <p className="flex items-start gap-2 text-[13px] text-muted">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              They see the name, time and repeat, and can add it to their own routines. Your ticks and streak stay private.
              {showFriends ? ' Friends get a notification.' : ''}
              {notifiesBatch ? ' Your batch also gets a notification.' : ''}
            </p>

            <button
              type="button"
              disabled={busy === 'share'}
              onClick={apply}
              className={`h-12 inline-flex items-center justify-center gap-2 text-[15px] font-semibold transition-opacity cursor-pointer disabled:opacity-60 ${
                changed ? 'bg-ink text-on-ink hover:opacity-90' : 'border border-line text-fg'
              }`}
            >
              {busy === 'share' && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionLabel}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
