'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Crown, Copy, Check, Share2, Calendar, ArrowRight } from 'lucide-react';
import { formatBatchDisplayName } from '@/lib/timetableUtils';
import { shareLink } from '@/lib/shareUtils';

export const BatchApprovedModal: React.FC = () => {
  const { profile, currentBatchData, setActiveView, showToast } = useApp();
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

👉 Open App: https://intersemester.com
Tap *Connect Batch* → Enter Code: *${inviteCode}*`;

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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Batch Pilot Access Unlocked! 👑"
      description="Your batch setup request is approved. You now hold management authority for your class."
      maxWidth="md"
      showCloseButton={true}
    >
      <div className="flex flex-col gap-5 py-2 text-left">
        
        {/* Banner */}
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3">
          <div className="w-9 h-9 rounded-none bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Verified Pilot Status
            </span>
            <h4 className="text-[14px] font-bold text-black dark:text-white leading-tight mt-0.5">
              {batchTitle}
            </h4>
            <p className="text-[11.5px] text-black/60 dark:text-[#94A3B8] leading-tight mt-1">
              {effectiveCollege} · Official Workspace
            </p>
          </div>
        </div>

        {/* Big Batch Code Box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-[#A1A1AA]">
            Your Official 6-Digit Batch Code
          </label>
          <div className="flex items-center justify-between p-3.5 bg-black/5 dark:bg-white/[0.05] border-2 border-black/15 dark:border-white/[0.15]">
            <div className="flex flex-col">
              <span className="text-[26px] font-mono font-black tracking-widest text-black dark:text-white uppercase select-all">
                {inviteCode}
              </span>
              <span className="text-[10px] text-black/40 dark:text-[#71717A]">
                Classmates will use this code to join
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Code with Classmates</span>
          </button>

          <button
            type="button"
            onClick={handleGoToTimetable}
            className="w-full h-11 bg-black text-white dark:bg-white dark:text-black text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Set Up Class Schedule</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 text-center text-xs font-medium text-black/50 dark:text-[#71717A] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            I&apos;ll do this later
          </button>
        </div>

      </div>
    </Modal>
  );
};
