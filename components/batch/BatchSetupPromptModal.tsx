'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName, getCanonicalBatchKey } from '@/lib/timetableUtils';
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
  const activeSec = section || profile.section || 'A';

  const shortCollege = getShortCollegeName(activeCollege);
  const canonicalKey = getCanonicalBatchKey(activeCollege, activeProg, activeBranch, activeSem, activeSec);

  const handleShareToWhatsApp = async () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://intersemester.com';
    const messageText = `Hey batchmates! 👋\n\nNobody has created the official timetable for our section yet on Intersemester:\n🏛️ *${shortCollege}*\n📚 *${activeBranch} (Sem ${activeSem}, Section ${activeSec})*\n\nIf you are our Class Representative (CR) or want to setup the synced batch timetable for all of us, open this link and claim CR access:\n👉 ${appUrl}\n\nLet's get all class updates, room alerts & assignments synced! 🚀`;

    try {
      const res = await shareLink({
        title: `Setup Batch: ${shortCollege} - ${activeBranch} Sec ${activeSec}`,
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
      <Modal isOpen={isOpen && !showCRModal} onClose={onClose} title="Setup Section Batch" maxWidth="md">
        <div className="flex flex-col gap-5 py-1 text-left">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                No Live Batch Yet
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-amber-500/20 text-amber-900 dark:text-amber-200 rounded-full">
                Section {activeSec}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                {shortCollege}
              </h3>
              <p className="text-[12.5px] text-slate-600 dark:text-zinc-300 font-medium">
                {activeBranch} · Semester {activeSem} · Section {activeSec}
              </p>
            </div>
          </div>

          {/* Feature Showcase Grid: What is Batch Sync? */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Why Sync With Your Batch?
            </span>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-100 dark:border-zinc-800 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[12px]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>1-Click Sync</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Timetable changes & room swaps update for the entire class instantly.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-100 dark:border-zinc-800 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[12px]">
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>Next Class Alerts</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Auto notifications 10m before class with room and professor info.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-100 dark:border-zinc-800 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[12px]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Shared Tasks</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Assignment deadlines & lab submissions synced across batchmates.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-100 dark:border-zinc-800 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-[12px]">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Classmate Hub</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Never ask "which class is next?" in WhatsApp groups again.
                </p>
              </div>
            </div>
          </div>

          {/* Action Pathways */}
          <div className="flex flex-col gap-2.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Choose an Option to Continue
            </span>

            {/* Option 1: Apply for CR */}
            <button
              type="button"
              onClick={() => setShowCRModal(true)}
              className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-500/10 hover:bg-amber-500/15 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    I am the CR (Setup this batch)
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500 text-black rounded uppercase">Admin</span>
                  </span>
                  <span className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                    Apply for CR verification to publish and broadcast the timetable.
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </button>

            {/* Option 2: Share to WhatsApp */}
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                    Tell Class CR to Setup Batch
                  </span>
                  <span className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                    Share invite link to your class WhatsApp group in 1-tap.
                  </span>
                </div>
              </div>
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0 ml-2" />
            </button>

            {/* Option 3: Personal Timetable */}
            <button
              type="button"
              onClick={handlePersonalTimetable}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-all text-center text-[12.5px] font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
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
