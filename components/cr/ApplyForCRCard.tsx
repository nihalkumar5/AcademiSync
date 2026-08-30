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
      <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 z-10">
          <div className="w-8 h-8 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#111111] flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                Are you the Class Representative (CR)?
              </h4>
            </div>
            <p className="text-[12px] text-[#6F6F6F] mt-0.5 max-w-md leading-relaxed">
              Apply for CR access to create, publish & broadcast verified schedules and class cancellation alerts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="shrink-0 px-4 py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
        >
          <Crown className="w-3.5 h-3.5" />
          Apply for CR Access
        </button>
      </div>

      <CRApplicationModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
      />
    </>
  );
};
