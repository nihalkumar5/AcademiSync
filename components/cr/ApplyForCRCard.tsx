'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Crown, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { CRApplicationModal } from './CRApplicationModal';

export const ApplyForCRCard: React.FC = () => {
  const { profile } = useApp();
  const [showApplyModal, setShowApplyModal] = useState(false);

  // If user is already CR or Super Admin, do not show the apply card
  if (profile.role === 'cr' || profile.role === 'super_admin') {
    return null;
  }

  return (
    <>
      <div className="border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] rounded-none p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-black/20 dark:hover:border-white/[0.14] shadow-sm">
        <div className="flex items-start gap-3.5 z-10">
          <div className="w-9 h-9 rounded-none border border-black/10 dark:border-white/[0.1] bg-white dark:bg-white/[0.06] flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[13px] font-bold text-black dark:text-[#F4F4F6]">
                Are you a Batch Pilot? 🚀
              </h4>
            </div>
            <p className="text-[12px] text-black/60 dark:text-[#94A3B8] mt-0.5 max-w-md leading-relaxed font-medium">
              Apply to become a Batch Pilot (up to 3 per batch) to manage, publish & broadcast verified schedules and class alerts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="shrink-0 px-4 py-2.5 rounded-none bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Crown className="w-3.5 h-3.5" />
          Apply for Batch Pilot
        </button>
      </div>

      <CRApplicationModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
      />
    </>
  );
};
