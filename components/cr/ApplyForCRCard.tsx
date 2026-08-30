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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Glow accent */}
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">
                Are you the Class Representative (CR)?
              </h4>
            </div>
            <p className="text-[12px] text-slate-600 dark:text-zinc-400 mt-0.5 max-w-md leading-relaxed">
              Apply for CR access to create, publish & broadcast verified schedules and class cancellation alerts for your section.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="z-10 shrink-0 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-[12px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Crown className="w-4 h-4" />
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
