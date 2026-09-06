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
    const messageText = `Hey batchmates! 👋\n\nNobody has created the official timetable for our batch yet on Intersemester:\n🏛️ *${shortCollege}*\n📚 *${courseTitle}*\n\nIf you are our Batch Pilot or want to setup the synced batch timetable for all of us, open this link and claim Pilot access:\n👉 ${appUrl}\n\nLet's get all class updates, room alerts & assignments synced! 🚀`;

    try {
      const res = await shareLink({
        title: `Setup Batch: ${shortCollege} - ${courseTitle}`,
        text: messageText,
        url: appUrl,
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
          <div className="md:col-span-5 flex flex-col items-center justify-between bg-[#F9F9F8] dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="w-full flex items-center justify-center max-w-[260px] sm:max-w-[300px] my-auto py-2">
              <img 
                src="/cr.png" 
                alt="Batch Pilot" 
                className="w-full h-auto object-contain drop-shadow-sm"
              />
            </div>
            
            <div className="flex flex-col gap-1 mt-3">
              <span className="text-[10.5px] font-bold font-mono tracking-widest uppercase text-amber-600 dark:text-amber-400">
                CLASS LEADERSHIP
              </span>
              <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                Power your entire batch
              </h3>
              <p className="text-[12px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-relaxed">
                Up to 3 verified Batch Pilots can manage schedules, room changes, and live alerts for {shortCollege}.
              </p>
            </div>
          </div>

          {/* Right Column: Unlocks, Responsibilities & Actions */}
          <div className="md:col-span-7 flex flex-col justify-between gap-5">
            
            {/* Section 1: WHAT YOU'LL UNLOCK */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#777777]">
                WHAT YOU&apos;LL UNLOCK
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 01 */}
                <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[10px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">01</span>
                    <h4 className="text-[12.5px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug truncate">
                      One timetable
                    </h4>
                    <p className="text-[11px] text-[#888888] dark:text-[#888888] leading-relaxed">
                      Update once, everyone gets it.
                    </p>
                  </div>
                </div>

                {/* 02 */}
                <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[10px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">02</span>
                    <h4 className="text-[12.5px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug truncate">
                      Instant class alerts
                    </h4>
                    <p className="text-[11px] text-[#888888] dark:text-[#888888] leading-relaxed">
                      Room changes &amp; cancellations.
                    </p>
                  </div>
                </div>

                {/* 03 */}
                <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[10px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">03</span>
                    <h4 className="text-[12.5px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug truncate">
                      Shared tasks &amp; labs
                    </h4>
                    <p className="text-[11px] text-[#888888] dark:text-[#888888] leading-relaxed">
                      Deadlines visible to the batch.
                    </p>
                  </div>
                </div>

                {/* 04 */}
                <div className="p-3 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FFFFFF] dark:bg-[#111111] rounded-xl flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5 min-w-0">
                    <span className="text-[10px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF]">04</span>
                    <h4 className="text-[12.5px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug truncate">
                      No WhatsApp chaos
                    </h4>
                    <p className="text-[11px] text-[#888888] dark:text-[#888888] leading-relaxed">
                      One authoritative schedule hub.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: YOUR RESPONSIBILITY */}
            <div className="p-3.5 border border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#FAF9F7] dark:bg-[#161616] rounded-xl flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#777777]">
                  YOUR RESPONSIBILITY
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Update timetable</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Broadcast changes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#111111] dark:text-[#FFFFFF]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                className="w-full h-11 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] rounded-xl tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Apply to become a Batch Pilot 🚀</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="py-2.5 px-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] rounded-xl transition-all flex items-center justify-center gap-2 text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
                  <span>Ask Pilot on WhatsApp</span>
                  <Share2 className="w-3 h-3 text-[#6F6F6F]" />
                </button>

                <button
                  type="button"
                  onClick={handlePersonalTimetable}
                  className="py-2.5 px-3 border border-transparent hover:border-[#D8D8D8] dark:hover:border-[#333333] text-[12px] font-medium text-[#888888] hover:text-[#111111] dark:hover:text-[#FFFFFF] rounded-xl transition-colors text-center cursor-pointer"
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
        targetCollege={activeCollege}
        targetProgramme={activeProg}
        targetBranch={activeBranch}
        targetSemester={activeSem}
        targetSection={activeSec}
      />
    </>
  );
};
