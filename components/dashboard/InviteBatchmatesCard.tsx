'use client';

import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { BatchDiscoveryModal } from '@/components/batch/BatchDiscoveryModal';
import { Users, Sparkles } from '@/components/ui/icons';
import { formatBatchDisplayName } from '@/lib/timetableUtils';

export const InviteBatchmatesCard = () => {
  const { profile, showToast, currentBatchData } = useApp();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  const isSynced = profile?.isBatchSynced && profile?.batchKey;
  const sixDigitCode = currentBatchData?.inviteCode || (profile?.batchKey && profile.batchKey.length <= 8 ? profile.batchKey : '');

  const handleInvite = async () => {
    if (!profile?.batchKey) return;
    const batchTitle = formatBatchDisplayName(profile.branch, profile.semester, profile.section);
    const batchCode = sixDigitCode || profile.batchKey;
    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${batchCode}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${batchCode}*`;

    const res = await shareLink({
      title: `Join ${batchTitle} on Intersemester`,
      text: shareText,
      dialogTitle: 'Share Batch Code via',
    });
    if (res === 'copied') {
      showToast('Code Copied', `Batch code copied: ${batchCode}`, 'success');
    }
  };

  return (
    <>
      <div className="relative bg-surface-2 p-4 sm:p-5 border border-line dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-between overflow-hidden min-h-[140px] rounded-none">
        <div className="flex flex-col gap-3 max-w-[58%] sm:max-w-[64%] relative z-10">
          <div className="flex flex-col gap-1">
            <h3 className="text-[16px] font-bold text-fg tracking-tight flex items-center gap-2">
              {isSynced ? (
                'Share Batch Code'
              ) : (
                <>
                  <Users className="w-4 h-4 text-fg" />
                  <span>Connect with Your Batch</span>
                </>
              )}
            </h3>
            <p className="text-[12px] text-muted leading-tight pr-2">
              {isSynced
                ? 'Share your 6-digit code with classmates to sync timetable & live alerts.'
                : 'Enter your 6-digit class code to sync timetable and exams.'}
            </p>
            {isSynced && sixDigitCode && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="section-label">
                  Batch Code:
                </span>
                <span className="text-[12px] font-mono font-bold tracking-[1.5px] text-fg bg-black/5 dark:bg-white/[0.08] px-2 py-0.5 rounded-none border border-line select-all">
                  {sixDigitCode}
                </span>
              </div>
            )}
          </div>
          
          {isSynced ? (
            <button
              onClick={handleInvite}
              className="self-start mt-1 px-4 h-9 bg-ink text-on-ink text-[12px] font-semibold transition-opacity hover:opacity-90 rounded-none cursor-pointer"
            >
              Share Code
            </button>
          ) : (
            <button
              onClick={() => setShowDiscoveryModal(true)}
              className="btn btn-primary btn-sm self-start mt-1"
            >
              <Sparkles className="w-3 h-3" />
              Connect Batch
            </button>
          )}
        </div>

        <div className="absolute right-0 bottom-0 z-0 flex items-end justify-end h-[100%] pr-0 pointer-events-none">
          {/* Light art panel so the black line illustration stays legible in dark mode */}
          <div className="hidden dark:block absolute right-3 bottom-3 w-[140px] sm:w-[160px] h-[118px] sm:h-[132px] bg-white -z-10" />
          <img 
            src="/invite2.png" 
            alt="Invite illustration" 
            className="relative z-10 w-[180px] sm:w-[210px] h-[150px] sm:h-[160px] object-contain object-bottom translate-y-[15%] translate-x-[8%]" 
          />
        </div>
      </div>

      <BatchDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        initialTab="code"
      />
    </>
  );
};
