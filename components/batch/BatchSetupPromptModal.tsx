'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName, getCanonicalBatchKey, isExplicitSection, formatBatchDisplayName } from '@/lib/timetableUtils';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { 
  Crown, 
  Sparkles, 
  Share2, 
  Calendar, 
  Bell, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  Clock, 
  Layers, 
  MessageCircle,
  School,
  BookOpen
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
  const batchLabel = formatBatchDisplayName(activeBranch, activeSem, activeSec);

  const handleShareToWhatsApp = async () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://intersemester.com';
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
      <Modal isOpen={isOpen && !showCRModal} onClose={onClose} title="Setup Batch Timetable" maxWidth="md">
        <div className="flex flex-col gap-5 py-1 text-left">
          {/* Header Banner - Editorial Brutalist Card */}
          <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>No Live Batch Sync</span>
              </div>
              {hasMultipleSections && (
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] bg-white dark:bg-[#111111]">
                  Sec {cleanSec}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <h3 className="text-[17px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-tight truncate">
                {shortCollege}
              </h3>
              <p className="text-[13px] text-[#6F6F6F] font-medium">
                {activeBranch} · Semester {activeSem} {hasMultipleSections ? `· Section ${cleanSec}` : ''}
              </p>
            </div>
          </div>

          {/* Feature Showcase Grid - 2x2 Clean Monochromatic Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">
              Why Sync With Your Batch?
            </span>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#111111] dark:text-[#FFFFFF] font-bold text-[12px]">
                  <Calendar className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>1-Click Sync</span>
                </div>
                <p className="text-[11px] text-[#6F6F6F] leading-tight">
                  Timetable & room updates push to all classmates instantly.
                </p>
              </div>

              <div className="p-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#111111] dark:text-[#FFFFFF] font-bold text-[12px]">
                  <Bell className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>Class Alerts</span>
                </div>
                <p className="text-[11px] text-[#6F6F6F] leading-tight">
                  Reminders 10m before class with room & prof details.
                </p>
              </div>

              <div className="p-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#111111] dark:text-[#FFFFFF] font-bold text-[12px]">
                  <Clock className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>Shared Tasks</span>
                </div>
                <p className="text-[11px] text-[#6F6F6F] leading-tight">
                  Assignments & lab deadlines stay in sync across batch.
                </p>
              </div>

              <div className="p-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#111111] dark:text-[#FFFFFF] font-bold text-[12px]">
                  <Users className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>Classmate Hub</span>
                </div>
                <p className="text-[11px] text-[#6F6F6F] leading-tight">
                  No more asking &ldquo;which class next?&rdquo; in WhatsApp groups.
                </p>
              </div>
            </div>
          </div>

          {/* Action Pathways */}
          <div className="flex flex-col gap-2.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">
              Choose an Option to Continue
            </span>

            {/* Option 1: Apply for CR */}
            <button
              type="button"
              onClick={() => setShowCRModal(true)}
              className="p-3.5 border border-[#111111] dark:border-[#FFFFFF] bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] hover:opacity-95 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-white dark:border-black flex items-center justify-center font-bold shrink-0">
                  <Crown className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold flex items-center gap-1.5">
                    I am the CR (Setup this batch)
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-amber-400 text-black uppercase">ADMIN</span>
                  </span>
                  <span className="text-[11px] opacity-80">
                    Apply for CR verification to publish & broadcast the timetable.
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </button>

            {/* Option 2: Share to WhatsApp */}
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="p-3.5 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-[#D8D8D8] dark:border-[#333333] flex items-center justify-center font-bold shrink-0 bg-[#F7F7F5] dark:bg-[#1A1A1A]">
                  <MessageCircle className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                    Tell Class CR to Setup Batch
                  </span>
                  <span className="text-[11px] text-[#6F6F6F]">
                    Send alert to your class WhatsApp group in 1-tap.
                  </span>
                </div>
              </div>
              <Share2 className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] group-hover:scale-110 transition-transform shrink-0 ml-2" />
            </button>

            {/* Option 3: Personal Timetable */}
            <button
              type="button"
              onClick={handlePersonalTimetable}
              className="w-full py-2.5 px-3 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-[12px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] hover:border-[#111111] dark:hover:border-[#FFFFFF] transition-all text-center cursor-pointer"
            >
              Continue with Personal Timetable for now
            </button>
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
