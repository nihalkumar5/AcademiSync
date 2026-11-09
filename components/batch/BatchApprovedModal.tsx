'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Crown, Copy, Check, Share2, Calendar, ArrowRight, X } from '@/components/ui/icons';
import { formatBatchDisplayName } from '@/lib/timetableUtils';
import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';

export const BatchApprovedModal: React.FC = () => {
  const { profile, currentBatchData, setActiveView, showToast, triggerConfetti } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const batchId = currentBatchData?.id || profile.batchKey;
  const inviteCode = currentBatchData?.inviteCode || (batchId && batchId.length <= 8 ? batchId : '');
  const isCR = profile.role === 'cr' || profile.role === 'super_admin';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isCR || !batchId || !inviteCode) return;

    const storageKey = `ack_batch_approved_${batchId}`;
    const alreadyAcknowledged = localStorage.getItem(storageKey);

    if (!alreadyAcknowledged) {
      // Small delay for smooth entry after dashboard renders
      const timer = setTimeout(() => {
        setIsOpen(true);
        setTimeout(() => triggerConfetti(), 250);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isCR, batchId, inviteCode]);

  const handleClose = () => {
    if (batchId) {
      localStorage.setItem(`ack_batch_approved_${batchId}`, 'true');
    }
    setIsOpen(false);
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      showToast('Code Copied', `Batch code ${inviteCode} copied to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Copy Failed', inviteCode, 'info');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!inviteCode) return;
    const effectiveBranch = currentBatchData?.branch || profile.branch;
    const effectiveSemester = currentBatchData?.semester || profile.semester;
    const effectiveSection = currentBatchData?.section || profile.section;
    const batchTitle = formatBatchDisplayName(effectiveBranch, effectiveSemester, effectiveSection) || 'Class';
    const message = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${inviteCode}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${inviteCode}*`;

    const res = await shareLink({
      title: `Join ${batchTitle} on Intersemester`,
      text: message,
      dialogTitle: 'Share Batch Code with Classmates via',
    });

    if (res === 'copied') {
      showToast('Message Copied', 'Invite message copied to clipboard!', 'success');
    }
  };

  const handleGoToTimetable = () => {
    handleClose();
    setActiveView('timetable');
  };

  if (!isOpen || !inviteCode) return null;

  const effectiveBranch = currentBatchData?.branch || profile.branch;
  const effectiveSemester = currentBatchData?.semester || profile.semester;
  const effectiveSection = currentBatchData?.section || profile.section;
  const effectiveCollege = currentBatchData?.college || profile.college || 'Your Campus';

  const batchTitle = formatBatchDisplayName(effectiveBranch, effectiveSemester, effectiveSection) || 'Your Batch';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="md" showCloseButton={false}>
      <div className="relative flex flex-col text-left">
        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero: a quiet celebration. Gold is used once, on the crown, so it reads as an honour, not a warning. */}
        <div className="relative overflow-hidden px-6 pt-9 pb-7 flex flex-col items-center text-center border-b border-line-soft">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 90% at 50% -10%, rgba(214, 170, 92, 0.22), transparent 65%)',
            }}
          />
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-amber-400/15 blur-xl" aria-hidden="true" />
            <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-amber-200 to-amber-400 dark:from-amber-300 dark:to-amber-500 ring-4 ring-surface shadow-[0_10px_24px_-8px_rgba(180,120,20,0.55)]">
              <Crown className="w-8 h-8 text-amber-950" strokeWidth={1.75} />
            </div>
          </div>

          <span className="relative mt-5 inline-flex items-center gap-1.5 h-6 px-2.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] font-semibold tracking-wide uppercase">
            <Check className="w-3 h-3" strokeWidth={2.5} /> Verified Batch Pilot
          </span>
          <h2 className="relative mt-3 text-[24px] leading-[30px] font-semibold tracking-tight text-fg">
            Your batch is live
          </h2>
          <p className="relative mt-2 text-[14px] leading-[20px] text-muted max-w-[300px]">
            You now manage <span className="font-semibold text-fg">{batchTitle}</span>. Invite your classmates to get everyone in sync.
          </p>
          <p className="relative mt-1.5 text-[12px] text-faint max-w-[320px] truncate" title={effectiveCollege}>
            {effectiveCollege}
          </p>
        </div>

        <div className="px-6 pt-6 pb-5 flex flex-col">
          {/* Batch code: one character per tile; tapping anywhere copies it */}
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-semibold text-muted">Batch code</span>
            <span className="text-[12px] text-faint">Classmates enter this to join</span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={`Copy batch code ${inviteCode}`}
            className="group mt-2.5 w-full flex items-center gap-2 cursor-pointer"
          >
            <span className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${inviteCode.length}, minmax(0, 1fr))` }}>
              {String(inviteCode).toUpperCase().split('').map((ch: string, i: number) => (
                <span
                  key={i}
                  className="h-14 flex items-center justify-center bg-surface-2 border border-line text-[24px] font-mono font-bold text-fg group-hover:border-line-strong/40 transition-colors"
                >
                  {ch}
                </span>
              ))}
            </span>
            <span
              className={`w-14 h-14 shrink-0 flex items-center justify-center border transition-colors ${
                copied
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-surface border-line text-fg group-hover:border-line-strong/40'
              }`}
              aria-hidden="true"
            >
              {copied ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <Copy className="w-5 h-5" />}
            </span>
          </button>
          <span className="mt-2 h-4 text-[12px] text-emerald-700 dark:text-emerald-400" aria-live="polite">
            {copied ? 'Copied to clipboard' : ''}
          </span>

          {/* Actions */}
          <div className="mt-3 flex flex-col gap-2.5">
            <button type="button" onClick={handleShareWhatsApp} className="btn btn-primary w-full h-12">
              <Share2 className="w-4 h-4" />
              Invite classmates
            </button>
            <button type="button" onClick={handleGoToTimetable} className="btn btn-secondary w-full h-12">
              <Calendar className="w-4 h-4" />
              Set up class schedule
              <ArrowRight className="w-4 h-4 ml-auto text-muted" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-1 h-10 text-[13px] font-medium text-muted hover:text-fg transition-colors cursor-pointer"
            >
              I&apos;ll do this later
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
