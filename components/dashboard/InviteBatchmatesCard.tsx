'use client';

import { shareLink } from '@/lib/shareUtils';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { BatchDiscoveryModal } from '@/components/batch/BatchDiscoveryModal';
import { Users, Sparkles } from 'lucide-react';

export const InviteBatchmatesCard = () => {
  const { profile, showToast, currentBatchData } = useApp();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  const isSynced = profile?.isBatchSynced && profile?.batchKey;
  const sixDigitCode = currentBatchData?.inviteCode || (profile?.batchKey && profile.batchKey.length <= 8 ? profile.batchKey : '');

  const handleInvite = async () => {
    if (!profile?.batchKey) return;
    const batchTitle = `${profile.branch || 'Class'} - Sec ${profile.section || 'A'} (Sem ${profile.semester || ''})`;
    const batchCode = sixDigitCode || profile.batchKey;
    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${batchCode}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

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
      <div className="relative bg-[#FFFFFF] dark:bg-[#121317] p-5 border border-[#E6E8EC] dark:border-white/[0.08] flex items-center justify-between overflow-hidden min-h-[135px] rounded-none">
        <div className="flex flex-col gap-3 max-w-[65%] sm:max-w-[70%] relative z-10">
          <div className="flex flex-col gap-1">
            <h3 className="text-[20px] font-bold text-[#101828] dark:text-[#F4F4F6] tracking-tight flex items-center gap-2 leading-snug">
              {isSynced ? (
                'Share Batch Code'
              ) : (
                <>
                  <Users className="w-4 h-4 text-[#101828] dark:text-[#F4F4F6]" />
                  <span>Connect with Your Batch</span>
                </>
              )}
            </h3>
            <p className="text-[13px] text-[#667085] dark:text-[#94A3B8] leading-relaxed max-w-[300px]">
              {isSynced
                ? 'Share your 6-digit code with classmates to sync timetable & live alerts.'
                : 'Enter your 6-digit class code to sync timetable and exams.'}
            </p>
            {isSynced && sixDigitCode && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold text-[#667085] dark:text-[#A1A1AA] uppercase tracking-wider leading-none">
                  Batch Code:
                </span>
                <span className="inline-flex items-center text-[12px] font-mono font-bold tracking-[1.5px] text-[#101828] dark:text-[#F4F4F6] border border-[#E6E8EC] dark:border-white/10 px-2.5 py-0.5 rounded-none select-all bg-transparent leading-none">
                  {sixDigitCode}
                </span>
              </div>
            )}
          </div>
          
          {isSynced ? (
            <button
              onClick={handleInvite}
              className="self-start mt-0.5 px-4 py-2 bg-[#101828] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[11px] font-bold tracking-[1px] uppercase transition-opacity hover:opacity-90 rounded-none cursor-pointer"
            >
              Share Code
            </button>
          ) : (
            <button
              onClick={() => setShowDiscoveryModal(true)}
              className="self-start mt-0.5 px-4 py-2 bg-[#101828] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[11px] font-bold tracking-[1px] uppercase transition-opacity hover:opacity-90 rounded-none cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              Connect Batch
            </button>
          )}
        </div>

        <div className="absolute right-3 bottom-2 z-0 flex items-end justify-end pointer-events-none">
          {/* White Frosted Glass backdrop in dark mode */}
          <div className="hidden dark:block absolute right-1 bottom-1 w-[120px] sm:w-[140px] h-[100px] sm:h-[115px] rounded-none bg-white/90 -z-10" />

          <img 
            src="/invite2.png" 
            alt="Invite illustration" 
            className="relative z-10 w-[135px] sm:w-[155px] h-[110px] sm:h-[125px] object-contain object-bottom" 
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
