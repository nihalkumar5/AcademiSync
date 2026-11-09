'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Crown, Sparkles, ArrowRight, ShieldCheck } from '@/components/ui/icons';
import { CRApplicationModal } from './CRApplicationModal';
import { isUserSuperAdmin } from '@/lib/adminAuth';

export const ApplyForCRCard: React.FC = () => {
  const { profile, user } = useApp();
  const [showApplyModal, setShowApplyModal] = useState(false);

  const userEmail = (user?.primaryEmailAddress?.emailAddress || profile.email || '').trim().toLowerCase();
  const isSuperAdmin = !!user && isUserSuperAdmin(profile, userEmail);

  // If user is already CR/Pilot or Super Admin, do not show the apply card
  if (isSuperAdmin || profile.role === 'cr' || profile.role === 'super_admin') {
    return null;
  }

  return (
    <>
      <div className="border border-line bg-surface-2 rounded-none p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-line shadow-sm">
        <div className="flex items-start gap-3.5 z-10">
          <div className="w-9 h-9 rounded-none border border-line bg-white dark:bg-white/[0.06] flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[13px] font-bold text-fg">
                Are you a Batch Pilot? 🚀
              </h4>
            </div>
            <p className="text-[12px] text-muted mt-0.5 max-w-md leading-relaxed font-medium">
              Apply to become a Batch Pilot (up to 3 per batch) to manage, publish & broadcast verified schedules and class alerts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="btn btn-primary"
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
