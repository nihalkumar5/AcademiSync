'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ArrowRight, GraduationCap } from '@/components/ui/icons';
import { ClassroomBridgeSheet } from './ClassroomBridgeSheet';
import { timeAgo, useClassroomBridge } from './bridgeClient';

// Assignments page, Batch Pilots only: the one entry point to the Google Classroom bridge.
export const ClassroomBridgeCard: React.FC = () => {
  const bridge = useClassroomBridge(true);
  const [open, setOpen] = useState(false);
  const d = bridge.data;

  const pending = d?.connected ? d.pending.length : 0;
  const reconnect = d?.connected && d.status === 'reconnect';
  const live = d?.connected && !reconnect && d.status !== 'paused';

  let title = 'Google Classroom';
  let sub = 'Checking…';
  let cta = 'Open';
  if (d) {
    if (!d.configured) {
      sub = 'Assignment sync for pilots is almost ready';
      cta = 'Details';
    } else if (!d.connected) {
      title = 'Bring Classroom to your batch';
      sub = 'Connect once. Assignments arrive on their own.';
      cta = 'Connect';
    } else if (reconnect) {
      title = 'Reconnect Classroom';
      sub = 'Google access ended, so syncing stopped';
      cta = 'Fix';
    } else if (d.status === 'paused') {
      title = 'Classroom sync paused';
      sub = d.lastError || 'Open to see why';
    } else {
      title = d.autoShare ? 'Classroom auto-sync on' : 'Classroom connected';
      sub = `Checked ${timeAgo(d.lastSyncAt)} · ${d.totals.shared} shared`;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'w-full text-left border bg-surface p-3.5 flex items-center gap-3 transition-colors cursor-pointer',
          pending > 0 || reconnect ? 'border-amber-300 dark:border-amber-400/35' : 'border-line hover:border-line-strong'
        )}
      >
        <span className="relative w-10 h-10 shrink-0 flex items-center justify-center border bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20">
          <GraduationCap className="w-5 h-5" />
          {live && (
            <span className="absolute -top-1 -right-1 flex w-2.5 h-2.5">
              <span className="absolute inset-0 bg-emerald-400 animate-ping opacity-60 motion-reduce:hidden" />
              <span className="relative w-2.5 h-2.5 bg-emerald-500 ring-2 ring-surface" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-fg leading-tight">{title}</span>
          <span className="block mt-0.5 text-[13px] text-muted truncate">{sub}</span>
        </span>
        {pending > 0 ? (
          <span className="h-8 px-2.5 shrink-0 inline-flex items-center gap-1 bg-amber-500 text-white text-[12px] font-bold">
            {pending} need{pending === 1 ? 's' : ''} you
          </span>
        ) : (
          <span className="h-9 px-3 shrink-0 inline-flex items-center gap-1.5 border border-line-strong text-[13px] font-semibold text-fg">
            {cta}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        )}
      </button>
      <ClassroomBridgeSheet open={open} onClose={() => setOpen(false)} bridge={bridge} />
    </>
  );
};
