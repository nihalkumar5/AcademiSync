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
    const inviteUrl = `https://academi-sync-chi.vercel.app/?invite=${batchCode}`;
    const shareText = `🔥 *Join our official ${batchTitle} Timetable on Intersemester!*

🔑 *Batch Code:* ${batchCode}

⚡ Realtime Class Cancellation & Reschedule Alerts
📊 75% Attendance Tracker & Bunk Calculator
📅 Live Exam Schedule, Room Numbers & Lab Sessions

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${batchCode}*`;

    const res = await shareLink({
      title: `Join ${batchTitle} on Intersemester`,
      text: shareText,
      url: inviteUrl,
      dialogTitle: 'Share Batch Code via',
    });
    if (res === 'copied') {
      showToast('Code Copied', `Batch code copied: ${batchCode}`, 'success');
    }
  };

  return (
    <>
      <div className="relative bg-[#F4F4F4] dark:bg-[#181818] p-4 sm:p-5 border border-[#D9D9D6] dark:border-[#2C2C2C] flex items-center justify-between overflow-hidden min-h-[140px]">
        <div className="flex flex-col gap-3 max-w-[65%] sm:max-w-[70%] relative z-10">
          <div className="flex flex-col gap-1">
            <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight flex items-center gap-2">
              {isSynced ? (
                'Share Batch Code'
              ) : (
                <>
                  <Users className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
                  <span>Connect with Your Batch</span>
                </>
              )}
            </h3>
            <p className="text-[12px] text-[#6F6F6F] dark:text-[#999999] leading-tight pr-2">
              {isSynced
                ? 'Share your 6-digit code with classmates to sync timetable & live alerts.'
                : 'Enter your 6-digit class code to sync timetable and exams.'}
            </p>
            {isSynced && sixDigitCode && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-[#6F6F6F] dark:text-[#A0A0A0] uppercase tracking-wider">
                  Batch Code:
                </span>
                <span className="text-[12px] font-mono font-bold tracking-[1.5px] text-[#111111] dark:text-[#FFFFFF] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded border border-black/10 dark:border-white/10 select-all">
                  {sixDigitCode}
                </span>
              </div>
            )}
          </div>
          
          {isSynced ? (
            <button
              onClick={handleInvite}
              className="self-start mt-1 px-4 py-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold tracking-[1px] uppercase transition-opacity hover:opacity-90 rounded-none cursor-pointer"
            >
              Share Code
            </button>
          ) : (
            <button
              onClick={() => setShowDiscoveryModal(true)}
              className="self-start mt-1 px-4 py-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold tracking-[1px] uppercase transition-opacity hover:opacity-90 rounded-none cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              Connect Batch
            </button>
          )}
        </div>

        <div className="absolute right-0 bottom-0 z-0 flex items-end justify-end h-[100%] pr-0 pointer-events-none">
          <img 
            src="/invite2.png" 
            alt="Invite illustration" 
            className="w-[180px] sm:w-[210px] h-[150px] sm:h-[160px] object-contain object-bottom translate-y-[15%] translate-x-[8%]" 
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
