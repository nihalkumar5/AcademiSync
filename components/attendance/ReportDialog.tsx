'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Loader2, ShieldCheck, AlertTriangle } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { downloadAttendanceReport, attendanceErrorText } from '@/lib/attendance';

type Period = 'all' | 'this_month' | 'last_month' | 'last_30' | 'custom';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: 'All lectures' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const range = (p: Period, from: string, to: string): { from?: string; to?: string } => {
  const now = new Date();
  if (p === 'this_month') return { from: key(new Date(now.getFullYear(), now.getMonth(), 1)), to: key(now) };
  if (p === 'last_month') return { from: key(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: key(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (p === 'last_30') {
    const f = new Date(now);
    f.setDate(f.getDate() - 29);
    return { from: key(f), to: key(now) };
  }
  if (p === 'custom') return { from: from || undefined, to: to || undefined };
  return {};
};

const chip = (on: boolean) =>
  `shrink-0 h-10 px-3 border text-[14px] font-medium cursor-pointer transition-colors ${
    on ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg hover:border-line-strong'
  }`;
const label = 'text-[13px] font-semibold text-fg';

export const ReportDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  batches: { key: string; label: string }[];
  subjectsFor: (batchKey: string) => string[];
  initialBatch?: string;
  initialSubject?: string;
  onDone?: () => void;
}> = ({ isOpen, onClose, batches, subjectsFor, initialBatch, initialSubject, onDone }) => {
  const [batchKey, setBatchKey] = useState('all');
  const [subject, setSubject] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBatchKey(initialBatch && (initialBatch === 'all' || batches.some((b) => b.key === initialBatch)) ? initialBatch : batches.length === 1 ? batches[0].key : 'all');
    setSubject(initialSubject || 'all');
    setError('');
  }, [isOpen]);

  const subjects = useMemo(() => subjectsFor(batchKey), [batchKey, subjectsFor]);
  const r = range(period, from, to);
  const customInvalid = period === 'custom' && (!from || !to);

  const go = async () => {
    setBusy(true);
    setError('');
    try {
      await downloadAttendanceReport({ batchKey, subject: subject === 'all' ? undefined : subject, ...r });
      onDone?.();
      onClose();
    } catch (err: any) {
      setError(err?.code === 'not-found' ? 'No lectures in this batch yet.' : attendanceErrorText(err) || err?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download report" description="An Excel file, ready to print or submit." maxWidth="lg">
      <div className="flex flex-col gap-f4">
        <div>
          <p className={label}>Batch</p>
          <div className="mt-f2 flex flex-wrap gap-f2">
            {batches.length > 1 && (
              <button type="button" onClick={() => { setBatchKey('all'); setSubject('all'); }} aria-pressed={batchKey === 'all'} className={chip(batchKey === 'all')}>
                All batches
              </button>
            )}
            {batches.map((b) => (
              <button key={b.key} type="button" onClick={() => { setBatchKey(b.key); setSubject('all'); }} aria-pressed={batchKey === b.key} className={chip(batchKey === b.key)}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {subjects.length > 1 && (
          <div>
            <p className={label}>Subject</p>
            <div className="mt-f2 flex flex-wrap gap-f2">
              {['all', ...subjects].map((s) => (
                <button key={s} type="button" onClick={() => setSubject(s)} aria-pressed={subject === s} className={chip(subject === s)}>
                  {s === 'all' ? 'All subjects' : s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={label}>Period</p>
          <div className="mt-f2 flex flex-wrap gap-f2">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPeriod(p.id)} aria-pressed={period === p.id} className={chip(period === p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="mt-f3 grid grid-cols-2 gap-f2">
              {(
                [
                  ['From', from, setFrom],
                  ['To', to, setTo],
                ] as const
              ).map(([l, v, set]) => (
                <label key={l} className="block">
                  <span className="text-[12px] text-muted">{l}</span>
                  <input type="date" value={v} max={key(new Date())} onChange={(e) => set(e.target.value)} className="mt-1 w-full h-11 px-3 bg-surface border border-line text-[15px] text-fg" />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* What's inside, so the faculty knows what they're about to share */}
        <div className="flex items-start gap-f3 p-f3 border border-line-soft bg-[#FAFAF9] dark:bg-white/[0.02]">
          <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
          <div className="text-[13px] text-muted">
            <p className="font-semibold text-fg">5 sheets</p>
            <p className="mt-0.5">Summary · Students (% and status) · Register (P/A by lecture) · Lectures · Change log</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-1.5 text-[13px] text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
          </p>
        )}

        <button type="button" onClick={go} disabled={busy || customInvalid} className="h-12 inline-flex items-center justify-center gap-2 bg-ink text-on-ink text-[15px] font-semibold disabled:opacity-50 cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {busy ? 'Preparing…' : 'Download Excel report'}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted">
          <ShieldCheck className="w-3.5 h-3.5" /> Contains student records. Each download is noted in the change log.
        </p>
      </div>
    </Modal>
  );
};
