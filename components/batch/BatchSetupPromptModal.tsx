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

            <div className="flex flex-col gap-2.5">
              {/* 01 */}
              <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[11px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">01</span>
                  <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                    One timetable for everyone
                  </h4>
                  <p className="text-[11.5px] text-[#888888] dark:text-[#888888] leading-relaxed mt-0.5">
                    Update the batch timetable once. Everyone gets the latest version.
                  </p>
                </div>
              </div>

              {/* 02 */}
              <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[11px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">02</span>
                  <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                    Instant class alerts
                  </h4>
                  <p className="text-[11.5px] text-[#888888] dark:text-[#888888] leading-relaxed mt-0.5">
                    Room changes, cancelled classes and important updates reach everyone.
                  </p>
                </div>
              </div>

              {/* 03 */}
              <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[11px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">03</span>
                  <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                    Shared academic tasks
                  </h4>
                  <p className="text-[11.5px] text-[#888888] dark:text-[#888888] leading-relaxed mt-0.5">
                    Keep assignments, labs and deadlines visible to your entire batch.
                  </p>
                </div>
              </div>

              {/* 04 */}
              <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[11px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">04</span>
                  <h4 className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                    No more chaos
                  </h4>
                  <p className="text-[11.5px] text-[#888888] dark:text-[#888888] leading-relaxed mt-0.5">
                    Manage everything in one place instead of WhatsApp groups.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: YOUR RESPONSIBILITY */}
          <div className="flex flex-col gap-2 mt-5 pt-4 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
            <span className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#777777]">
              YOUR RESPONSIBILITY
            </span>

            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF] shrink-0" />
                  <span className="text-[11.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">Add &amp; update timetable</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF] shrink-0" />
                  <span className="text-[11.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">Broadcast important changes</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF] shrink-0" />
                  <span className="text-[11.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">Keep batch information accurate</span>
                </div>
              </div>
              <div className="shrink-0 pr-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#111111] dark:text-[#FFFFFF] rotate-[10deg] opacity-80">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="m9 14 2 2 4-4"></path>
                  <path d="M12 2v2"></path>
                  <path d="M9 10h.01"></path>
                  <path d="M9 18h.01"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-2 mt-5">
            {/* Primary Button */}
            <button
              type="button"
              onClick={() => setShowCRModal(true)}
              className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] rounded-xl tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
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
