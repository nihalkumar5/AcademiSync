'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Routine } from '@/lib/types';
import { getRoutineCategory, repeatLabel, formatRoutineTime } from '@/lib/routines';
import { Icon3D, iconForRoutine } from './Icon3D';
import { Check, Loader2, Lock, Users } from '@/components/ui/icons';

export interface ShareTarget {
  batchKey: string;
  label: string;
}

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
}> = ({ routine, onClose, blockedReason, targets, sharedTo, notifiesBatch, onShare, onUnshare, onGoToProfile }) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!routine) return;
    // Default: every batch it isn't shared to yet
    setPicked(targets.filter((t) => !sharedTo.has(t.batchKey)).map((t) => t.batchKey));
  }, [routine?.id, targets.length]);

  if (!routine) return null;
  const c = getRoutineCategory(routine.category);
  const multi = targets.length > 1;
  const toShare = picked.filter((k) => !sharedTo.has(k));

  return (
    <Modal isOpen={!!routine} onClose={onClose} title="Share with your batch">
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

        {blockedReason ? (
          <div className="flex flex-col items-start gap-f3">
            <p className="text-[15px] text-fg">
              {blockedReason === 'signin' ? 'Sign in to share routines with your batch.' : 'Join your batch first. Sharing only works with people in your class.'}
            </p>
            <button
              type="button"
              onClick={onGoToProfile}
              className="h-11 px-4 bg-ink text-on-ink text-[14px] font-semibold cursor-pointer"
            >
              {blockedReason === 'signin' ? 'Go to sign in' : 'Connect batch'}
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-[14px] font-medium text-fg">{multi ? 'Share to' : 'Shared with'}</p>
              <ul className="mt-2 border border-line divide-y divide-line-soft">
                {targets.map((t) => {
                  const already = sharedTo.has(t.batchKey);
                  const on = already || picked.includes(t.batchKey);
                  return (
                    <li key={t.batchKey} className="flex items-center gap-f3 px-f3 py-2.5">
                      {multi && !already ? (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          aria-label={t.label}
                          onClick={() => setPicked((p) => (p.includes(t.batchKey) ? p.filter((k) => k !== t.batchKey) : [...p, t.batchKey]))}
                          className={`w-5 h-5 shrink-0 border flex items-center justify-center cursor-pointer ${
                            on ? 'bg-ink border-line-strong text-on-ink' : 'border-[#BDBDBD] dark:border-white/30'
                          }`}
                        >
                          {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </button>
                      ) : (
                        <Users className="w-4 h-4 shrink-0 text-muted" />
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
            </div>

            <p className="flex items-start gap-2 text-[13px] text-muted">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Classmates see the name, time and repeat, and can add it to their own routines. Your ticks and streak stay private.
              {notifiesBatch ? ' Your batch also gets a notification.' : ''}
            </p>

            {toShare.length > 0 ? (
              <button
                type="button"
                disabled={busy === 'share'}
                onClick={async () => {
                  setBusy('share');
                  await onShare(toShare);
                  setBusy(null);
                  onClose();
                }}
                className="h-12 inline-flex items-center justify-center gap-2 bg-ink text-on-ink text-[15px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
              >
                {busy === 'share' && <Loader2 className="w-4 h-4 animate-spin" />}
                {multi ? `Share to ${toShare.length} ${toShare.length === 1 ? 'batch' : 'batches'}` : 'Share with batch'}
              </button>
            ) : (
              <button type="button" onClick={onClose} className="h-12 border border-line text-[15px] font-semibold text-fg cursor-pointer">
                Done
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
