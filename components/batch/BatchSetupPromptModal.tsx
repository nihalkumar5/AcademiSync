'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName, formatBatchDisplayName } from '@/lib/timetableUtils';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { 
  Calendar, 
  Bell, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle, 
  Share2 
} from '@/components/ui/icons';
import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';

interface BatchSetupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  college?: string;
  programme?: string;
  branch?: string;
  semester?: number;
  section?: string;
  onContinuePersonal?: () => void;
}

export const BatchSetupPromptModal: React.FC<BatchSetupPromptModalProps> = ({
  isOpen,
  onClose,
  college,
  programme,
  branch,
  semester,
  onContinuePersonal
}) => {
  const { profile, showToast } = useApp();
  const [showCRModal, setShowCRModal] = useState(false);

  const activeCollege = college || profile.college || 'Your College';
  const activeProg = programme || profile.programme || 'B.Tech';
  const activeBranch = branch || profile.branch || 'Engineering';
  const activeSem = semester || profile.semester || 1;

  const shortCollege = getShortCollegeName(activeCollege);

  const handleShareToWhatsApp = async () => {
    const courseTitle = `${activeBranch} (Sem ${activeSem})`;
    const messageText = `Hey batchmates! 👋

Nobody has created the official timetable for our batch yet on Intersemester:
🏛️ *${shortCollege}*
📚 *${courseTitle}*

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

If you are our Batch Pilot or want to setup the synced batch timetable for all of us, open the *Intersemester* app and setup our batch schedule! 🚀`;

    try {
      const res = await shareLink({
        title: `Setup Batch: ${shortCollege} - ${courseTitle}`,
        text: messageText,
        dialogTitle: 'Share with Class WhatsApp Group'
      });
      if (res === 'copied') {
        showToast('Message Copied!', 'Paste this message in your class WhatsApp group to notify your Batch Pilot.', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePersonalTimetable = () => {
    onClose();
    if (onContinuePersonal) {
      onContinuePersonal();
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen && !showCRModal} 
        onClose={onClose} 
        title="Become a Batch Pilot 🚀"
        description="Keep everyone on the same timetable and never miss what matters."
        mobileFullSheet={true} 
        maxWidth="4xl"
        showCloseButton={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-stretch font-sans text-left">
          
          {/* Left Column: Hero Illustration & Info Card */}
          <div className="md:col-span-5 flex flex-col items-center justify-center bg-surface-2 border border-line-soft rounded-none p-4 sm:p-5 text-center relative overflow-hidden gap-3">
            <div className="w-full flex items-center justify-center relative dark:bg-white dark:py-3">
              <img 
                src="/cr.png" 
                alt="Batch Pilot" 
                className="w-full max-w-[300px] sm:max-w-[280px] h-auto object-contain drop-shadow-sm dark:drop-shadow-none"
              />
            </div>
            
            <div className="flex flex-col gap-1 z-10 relative px-3 py-2 bg-[#F9F9F8]/90 dark:bg-[#121317]/90 backdrop-blur-sm">
              <span className="text-[12px] font-bold font-mono text-amber-600 dark:text-amber-400">
                Class leadership
              </span>
              <h3 className="text-[16px] font-bold text-fg leading-snug">
                Power your entire batch
              </h3>
              <p className="text-[12px] text-muted leading-relaxed">
                Up to 3 verified Batch Pilots can manage schedules, room changes, and live alerts for {shortCollege}.
              </p>
            </div>
          </div>

          {/* Right Column: Unlocks, Responsibilities & Actions */}
          <div className="md:col-span-7 flex flex-col justify-between gap-5">
            
            {/* Section 1: WHAT YOU'LL UNLOCK */}
            <div className="flex flex-col gap-2.5">
              <span className="section-label">
                WHAT YOU&apos;LL UNLOCK
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 01 */}
                <div className="p-3 border border-line-soft bg-surface rounded-none flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-none bg-surface-2 border border-line-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4 text-fg stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[11px] font-bold font-mono text-fg">01</span>
                    <h4 className="text-[13px] font-bold text-fg leading-snug truncate">
                      One timetable
                    </h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Update once, everyone gets it.
                    </p>
                  </div>
                </div>

                {/* 02 */}
                <div className="p-3 border border-line-soft bg-surface rounded-none flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-none bg-surface-2 border border-line-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-fg stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[11px] font-bold font-mono text-fg">02</span>
                    <h4 className="text-[13px] font-bold text-fg leading-snug truncate">
                      Instant class alerts
                    </h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Room changes &amp; cancellations.
                    </p>
                  </div>
                </div>

                {/* 03 */}
                <div className="p-3 border border-line-soft bg-surface rounded-none flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-none bg-surface-2 border border-line-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-fg stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[11px] font-bold font-mono text-fg">03</span>
                    <h4 className="text-[13px] font-bold text-fg leading-snug truncate">
                      Shared tasks &amp; labs
                    </h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Deadlines visible to the batch.
                    </p>
                  </div>
                </div>

                {/* 04 */}
                <div className="p-3 border border-line-soft bg-surface rounded-none flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-none bg-surface-2 border border-line-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4 text-fg stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[11px] font-bold font-mono text-fg">04</span>
                    <h4 className="text-[13px] font-bold text-fg leading-snug truncate">
                      No WhatsApp chaos
                    </h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      One authoritative schedule hub.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: YOUR RESPONSIBILITY */}
            <div className="p-3.5 border border-line-soft bg-[#FAF9F7] dark:bg-[#121317] rounded-none flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="section-label">
                  Your responsibility
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Update timetable</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Broadcast changes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Accurate info</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShowCRModal(true)}
                className="btn btn-primary w-full tracking-wide"
              >
                <span>Apply to become a Batch Pilot 🚀</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="btn btn-secondary"
                >
                  <MessageCircle className="w-4 h-4 text-fg" />
                  <span>Ask Pilot on WhatsApp</span>
                  <Share2 className="w-3 h-3 text-muted" />
                </button>

                <button
                  type="button"
                  onClick={handlePersonalTimetable}
                  className="h-11 px-3 border border-transparent hover:border-line text-[14px] font-medium text-muted hover:text-fg rounded-none transition-colors text-center cursor-pointer"
                >
                  Personal mode for now →
                </button>
              </div>
            </div>

          </div>

        </div>
      </Modal>

      {/* CR Application Modal */}
      <CRApplicationModal
        isOpen={showCRModal}
        onClose={() => {
          setShowCRModal(false);
          onClose();
        }}
        targetCollege={college || (profile.college !== 'Your College' ? profile.college : '')}
        targetProgramme={programme || profile.programme || ''}
        targetBranch={branch || (profile.branch !== 'Engineering' ? profile.branch : '')}
        targetSemester={semester || profile.semester || 1}
      />
    </>
  );
};
