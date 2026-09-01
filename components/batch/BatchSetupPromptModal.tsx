'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName, formatBatchDisplayName, isExplicitSection } from '@/lib/timetableUtils';
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
} from 'lucide-react';
import { shareLink } from '@/lib/shareUtils';

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
  section,
  onContinuePersonal
}) => {
  const { profile, showToast } = useApp();
  const [showCRModal, setShowCRModal] = useState(false);

  const activeCollege = college || profile.college || 'Your College';
  const activeProg = programme || profile.programme || 'B.Tech';
  const activeBranch = branch || profile.branch || 'Engineering';
  const activeSem = semester || profile.semester || 1;
  const activeSec = section || profile.section || '';

  const shortCollege = getShortCollegeName(activeCollege);
  const hasMultipleSections = isExplicitSection(activeSec);
  const cleanSec = hasMultipleSections ? activeSec.replace(/section\s*/i, '').trim() : '';

  const handleShareToWhatsApp = async () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://academi-sync-chi.vercel.app';
    const courseTitle = `${activeBranch} (Sem ${activeSem}${hasMultipleSections ? `, Section ${cleanSec}` : ''})`;
    const messageText = `Hey batchmates! 👋\n\nNobody has created the official timetable for our batch yet on Intersemester:\n🏛️ *${shortCollege}*\n📚 *${courseTitle}*\n\nIf you are our Class Representative (CR) or want to setup the synced batch timetable for all of us, open this link and claim CR access:\n👉 ${appUrl}\n\nLet's get all class updates, room alerts & assignments synced! 🚀`;

    try {
      const res = await shareLink({
        title: `Setup Batch: ${shortCollege} - ${courseTitle}`,
        text: messageText,
        url: appUrl,
        dialogTitle: 'Share with Class WhatsApp Group'
      });
      if (res === 'copied') {
        showToast('Message Copied!', 'Paste this message in your class WhatsApp group to notify your CR.', 'success');
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
        title="Become your batch CR."
        description="Keep everyone on the same timetable and never miss what matters."
        mobileFullSheet={true} 
        maxWidth="md"
        showCloseButton={true}
      >
        <div className="flex flex-col text-left font-sans pt-0 pb-4">
          {/* Hero Illustration - Tight zero-excess spacing */}
          <div className="w-full flex items-center justify-center -mt-20 -mb-28 sm:-mt-16 sm:-mb-24 py-0 relative z-0">
            <img 
              src="/cr.png" 
              alt="Class Representative" 
              className="w-full max-w-[420px] sm:max-w-[480px] h-auto object-contain"
            />
          </div>

          {/* Section 1: WHAT YOU'LL UNLOCK */}
          <div className="flex flex-col gap-2.5 mt-0 relative z-10">
            <span className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#777777]">
              WHAT YOU&apos;LL UNLOCK
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 01 */}
              <div className="p-3.5 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#161616] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  <span className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-400">01</span>
                </div>
                <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                  One timetable for everyone
                </h4>
                <p className="text-[11.5px] text-[#6F6F6F] dark:text-[#999999] leading-relaxed">
                  Update the batch timetable once. Everyone gets the latest version.
                </p>
              </div>

              {/* 02 */}
              <div className="p-3.5 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#161616] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  <span className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-400">02</span>
                </div>
                <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                  Instant class alerts
                </h4>
                <p className="text-[11.5px] text-[#6F6F6F] dark:text-[#999999] leading-relaxed">
                  Room changes, cancelled classes and important updates reach everyone.
                </p>
              </div>

              {/* 03 */}
              <div className="p-3.5 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#161616] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  <span className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-400">03</span>
                </div>
                <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                  Shared academic tasks
                </h4>
                <p className="text-[11.5px] text-[#6F6F6F] dark:text-[#999999] leading-relaxed">
                  Keep assignments, labs and deadlines visible to your entire batch.
                </p>
              </div>

              {/* 04 */}
              <div className="p-3.5 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#161616] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  <span className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-400">04</span>
                </div>
                <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                  Your batch, organised
                </h4>
                <p className="text-[11.5px] text-[#6F6F6F] dark:text-[#999999] leading-relaxed">
                  Stop repeating updates across WhatsApp groups. Keep everything in one place.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: WHAT DOES A CR DO? */}
          <div className="flex flex-col gap-2.5 mt-2 pt-4 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
            <span className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#777777]">
              WHAT DOES A CR DO?
            </span>
            <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#999999] leading-relaxed">
              You become the trusted person who maintains and publishes your batch timetable and important academic updates.
            </p>

            <div className="flex flex-col gap-2 mt-0.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] shrink-0" />
                <span className="text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">Add &amp; update classes</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] shrink-0" />
                <span className="text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">Broadcast important changes</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] shrink-0" />
                <span className="text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">Keep your batch in sync</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-2 mt-5">
            {/* Primary Button */}
            <button
              type="button"
              onClick={() => setShowCRModal(true)}
              className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Apply to become CR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#6F6F6F] dark:text-[#888888]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>You&apos;ll need to verify your college &amp; batch.</span>
            </div>

            {/* Secondary actions: Tell CR on WhatsApp & Personal Mode */}
            <div className="w-full flex flex-col gap-2 mt-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="w-full py-2.5 px-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
                  <span className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                    Tell Class CR to Setup Batch
                  </span>
                </div>
                <Share2 className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF] group-hover:scale-110 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handlePersonalTimetable}
                className="w-full py-2 text-[11.5px] font-medium text-[#888888] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors text-center cursor-pointer"
              >
                Continue with Personal Timetable for now →
              </button>
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
        targetCollege={activeCollege}
        targetProgramme={activeProg}
        targetBranch={activeBranch}
        targetSemester={activeSem}
        targetSection={activeSec}
      />
    </>
  );
};
