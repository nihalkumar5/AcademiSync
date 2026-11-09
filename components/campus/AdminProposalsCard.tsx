'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getAuthHeaders } from '@/lib/authHeaders';
import { Building2, Check, Loader2, X } from '@/components/ui/icons';
import type { AdminProposal } from '@/lib/campusSetup';

/** Home, for CRs: updates the campus admin sent to this batch, waiting for the CR's OK. */
export const AdminProposalsCard: React.FC = () => {
  const { isBatchCR, user, showToast } = useApp() as any;
  const [items, setItems] = useState<AdminProposal[]>([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!isBatchCR || !user?.id) return;
    try {
      const res = await fetch('/api/batch/admin-proposals', { headers: await getAuthHeaders(), cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(d.proposals)) setItems(d.proposals);
    } catch {}
  }, [isBatchCR, user?.id]);
  useEffect(() => {
    load();
  }, [load]);

  const answer = async (p: AdminProposal, approve: boolean) => {
    setBusy(p.id + (approve ? 'a' : 'r'));
    try {
      const res = await fetch('/api/batch/admin-proposals', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ id: p.id, answer: approve ? 'approve' : 'reject' }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.success === false) throw new Error(d.error || 'Try again');
      showToast?.(approve ? 'Approved' : 'Declined', approve ? 'Your whole batch now has it' : 'Nothing changed for your batch', 'success');
      setItems((x) => x.filter((y) => y.id !== p.id));
    } catch (e: any) {
      showToast?.("Couldn't do that", e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-2.5">
      {items.map((p) => (
        <article key={p.id} className="border border-amber-200/80 bg-amber-50/60 dark:bg-amber-400/[0.06] dark:border-amber-400/20 p-f4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-amber-300/70 dark:border-amber-400/30 text-amber-700 dark:text-amber-300">
              <Building2 className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-300">Needs your OK</p>
              <p className="mt-0.5 text-[16px] font-semibold text-fg">{p.kind === 'timetable' ? 'Campus admin sent a new timetable' : 'Campus admin sent the academic calendar'}</p>
              <p className="mt-0.5 text-[13px] text-fg-2">{p.summary}</p>
            </div>
          </div>
          {p.preview.length > 0 && (
            <ul className="mt-3 border border-line bg-surface divide-y divide-line-soft text-[13px] text-fg">
              {p.preview.slice(0, 6).map((line) => (
                <li key={line} className="px-3 py-2 truncate">{line}</li>
              ))}
            </ul>
          )}
          <p className="mt-2.5 text-[12px] text-muted">Approving updates it for everyone in your batch. {p.kind === 'calendar' ? 'Dates you added yourself stay.' : 'It replaces the current timetable.'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={!!busy} onClick={() => answer(p, false)} className="btn btn-secondary">
              {busy === p.id + 'r' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Decline
            </button>
            <button type="button" disabled={!!busy} onClick={() => answer(p, true)} className="btn btn-primary">
              {busy === p.id + 'a' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
            </button>
          </div>
        </article>
      ))}
    </section>
  );
};
