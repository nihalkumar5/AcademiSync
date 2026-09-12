'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useApp } from '@/context/AppContext';
import { extractCleanInviteCode } from '@/lib/timetableUtils';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';

interface BatchDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'directory' | 'code';
}

export const BatchDiscoveryModal: React.FC<BatchDiscoveryModalProps> = ({ isOpen, onClose }) => {
  const { profile, joinBatchTimetable, showToast, user } = useApp();
  const router = useRouter();

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showSetupPromptModal, setShowSetupPromptModal] = useState(false);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = inviteCodeInput.trim();
    if (!rawInput) return;

    const code = extractCleanInviteCode(rawInput);
    if (!code) {
      showToast('Invalid Code', 'Please enter a valid 6-character batch code.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      try {
        localStorage.setItem('pending_join_invite', code);
      } catch (_) {}
      await joinBatchTimetable(code);
      setInviteCodeInput('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Connect with Your Class Batch" maxWidth="md">
        <div className="flex flex-col gap-5 text-left pt-1 font-sans">
          {/* Main Join Form */}
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#6F6F6F] dark:text-[#A0A0A0]">
                Batch Code
              </label>
              <p className="text-[13px] text-[#6F6F6F] dark:text-[#888888] leading-relaxed">
                Enter the 6-character Batch Code shared by your Batch Pilot or classmates.
              </p>
            </div>

            <div className="flex items-center gap-2.5 px-3.5 py-3 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-[#111111] dark:focus-within:border-white/30 transition-colors">
              <input
                type="text"
                placeholder="e.g. 65SQ9K"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-transparent text-[15px] text-[#111111] dark:text-[#F4F4F6] font-mono font-bold tracking-[2px] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B] placeholder:font-normal placeholder:tracking-normal uppercase"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || !inviteCodeInput.trim()}
              className="w-full h-11 bg-[#111111] dark:bg-white dark:text-black text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              {isJoining ? 'Connecting...' : 'Join Batch'}
            </button>
          </form>

          {/* Setup Batch Callout */}
          <div className="mt-2 pt-4 border-t border-[#E5E5E5] dark:border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-bold text-[#111111] dark:text-[#F4F4F6]">
                Don&apos;t have a batch code yet?
              </span>
              <span className="text-[11px] text-[#6F6F6F] dark:text-[#94A3B8]">
                Create &amp; publish your class timetable for everyone.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                setShowSetupPromptModal(true);
              }}
              className="px-3 py-1.5 border border-[#D8D8D8] dark:border-white/[0.1] hover:border-[#111111] dark:hover:border-white/[0.25] text-[11px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Setup Batch
            </button>
          </div>
        </div>
      </Modal>

      <BatchSetupPromptModal
        isOpen={showSetupPromptModal}
        onClose={() => setShowSetupPromptModal(false)}
        college={profile.college || ''}
        programme={profile.programme || ''}
        branch={profile.branch || ''}
        semester={profile.semester || 1}
        section={profile.section || ''}
      />
    </>
  );
};
