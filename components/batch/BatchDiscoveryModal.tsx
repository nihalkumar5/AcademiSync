'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useApp } from '@/context/AppContext';
import { extractCleanInviteCode, getShortCollegeName } from '@/lib/timetableUtils';
import { useRouter } from 'next/navigation';
import { Crown, User, Mail, Hash, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { BatchSetupPromptModal } from '@/components/batch/BatchSetupPromptModal';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BatchDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'directory' | 'code';
}

export const BatchDiscoveryModal: React.FC<BatchDiscoveryModalProps> = ({ isOpen, onClose }) => {
  const { profile, joinBatchTimetable, showToast, user } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<'code' | 'identity'>('code');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [foundBatch, setFoundBatch] = useState<any | null>(null);
  const [foundBatchKey, setFoundBatchKey] = useState<string>('');
  const [showSetupPromptModal, setShowSetupPromptModal] = useState(false);

  // Identity state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const isSignedIn = !!user;

  // Reset modal state on close/open
  const handleModalClose = () => {
    setStep('code');
    setFoundBatch(null);
    setFoundBatchKey('');
    setInviteCodeInput('');
    onClose();
  };

  // Step 1: Verify Code & Fetch Batch
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = inviteCodeInput.trim();
    if (!rawInput) return;

    const code = extractCleanInviteCode(rawInput);
    if (!code) {
      showToast('Invalid Code', 'Please enter a valid 6-character batch code.', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      let docSnap: any = null;
      let batchKey = code;

      // 1. Direct doc ID
      const directRef = doc(db, 'shared_timetables', code);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        docSnap = directSnap;
        batchKey = directSnap.id;
      }

      // 2. Query by inviteCode
      if (!docSnap || !docSnap.exists()) {
        const q = query(
          collection(db, 'shared_timetables'),
          where('inviteCode', '==', code.toUpperCase())
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          docSnap = querySnap.docs[0];
          batchKey = docSnap.id;
        }
      }

      if (!docSnap || !docSnap.exists()) {
        showToast('Batch Not Found', `No active batch found with code "${code}".`, 'error');
        setIsVerifying(false);
        return;
      }

      const bData = docSnap.data();
      setFoundBatch(bData);
      setFoundBatchKey(batchKey);

      // Pre-fill student identity details
      const userFullName = (user as any)?.fullName || profile.name || '';
      const userEmail = (user as any)?.primaryEmailAddress?.emailAddress || profile.email || '';
      setName(userFullName !== 'Student' ? userFullName : '');
      setEmail(userEmail);
      setRollNumber(profile.rollNumber || '');

      setStep('identity');
    } catch (err) {
      console.error('Error verifying batch code:', err);
      showToast('Search Failed', 'Could not verify batch code. Please check your connection.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Confirm Identity & Join Batch
  const handleConfirmJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundBatchKey) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanRoll = rollNumber.trim();

    if (!cleanName) {
      showToast('Name Required', 'Please enter your full name.', 'error');
      return;
    }
    if (!cleanEmail) {
      showToast('Email Required', 'Please enter your email.', 'error');
      return;
    }
    if (!cleanRoll) {
      showToast('Roll Number Required', 'Please enter your roll number to join batch members.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      await joinBatchTimetable(foundBatchKey, undefined, false, {
        name: cleanName,
        email: cleanEmail,
        rollNumber: cleanRoll,
      });

      showToast('Joined Batch! 🎉', `Welcome to ${foundBatch?.branch || 'your batch'}!`, 'success');
      handleModalClose();
    } catch (e: any) {
      console.error('BatchDiscoveryModal join error:', e);
      showToast('Join Failed', e?.message || 'Could not join batch timetable.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleModalClose} 
        title={!isSignedIn ? "Authentication Required" : step === 'code' ? "Connect with Your Class Batch" : "Complete Batch Registration"} 
        maxWidth="md"
      >
        <div className="flex flex-col gap-5 text-left pt-1 font-sans">
          
          {/* CASE 1: USER IS NOT SIGNED IN */}
          {!isSignedIn ? (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] rounded-none">
              <div className="w-14 h-14 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#111111] rounded-none flex items-center justify-center shadow-xs">
                <User className="w-7 h-7 text-[#111111] dark:text-[#FFFFFF] stroke-[1.8]" />
              </div>
              <div>
                <span className="text-[10px] font-bold font-mono tracking-widest uppercase text-amber-600 dark:text-amber-400">
                  LOGIN COMPULSORY
                </span>
                <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF] mt-1">
                  Sign In Required to Join Batch
                </h3>
                <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] mt-1.5 max-w-sm leading-relaxed">
                  Please sign in with your student account before entering a batch code. This connects your schedule, enables live class cancellation alerts, and adds you to your batch roster.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (inviteCodeInput.trim()) {
                      try {
                        localStorage.setItem('pending_join_invite', inviteCodeInput.trim());
                      } catch (_) {}
                    }
                    handleModalClose();
                    router.push('/sign-in');
                  }}
                  className="flex-1 px-6 py-3 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-5 py-3 border border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : step === 'code' ? (
            /* STEP 1: ENTER BATCH CODE */
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
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
                disabled={isVerifying || !inviteCodeInput.trim()}
                className="w-full h-11 bg-[#111111] dark:bg-white dark:text-black text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
              >
                {isVerifying ? 'Searching Batch...' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>

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
                    handleModalClose();
                    setShowSetupPromptModal(true);
                  }}
                  className="px-3 py-1.5 border border-[#D8D8D8] dark:border-white/[0.1] hover:border-[#111111] dark:hover:border-white/[0.25] text-[11px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Setup Batch
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: VERIFY IDENTITY (NAME, EMAIL, ROLL NUMBER) */
            <form onSubmit={handleConfirmJoin} className="flex flex-col gap-4">
              {/* Batch Summary Badge (Locked Academic Info) */}
              {foundBatch && (
                <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-none flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      VERIFIED CLASS BATCH
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                      CODE: {foundBatch.inviteCode || inviteCodeInput}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug">
                    {getShortCollegeName(foundBatch.college)} · {foundBatch.branch} (Sem {foundBatch.semester})
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    College, branch &amp; schedule are locked from this batch. Enter your student details to appear in the class list.
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Full Name
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-[#111111] dark:focus-within:border-white/30">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    className="w-full bg-transparent text-[13.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Institute Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Institute Email
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-[#111111] dark:focus-within:border-white/30">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu.in"
                    required
                    className="w-full bg-transparent text-[13.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Roll Number (Crucial for Batch Members list!) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Roll Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-[#111111] dark:focus-within:border-white/30">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 2023UGCS045"
                    required
                    autoFocus
                    className="w-full bg-transparent text-[13.5px] font-mono text-[#111111] dark:text-[#F4F4F6] focus:outline-none"
                  />
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                  Used to identify you in the official batch members directory.
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isJoining || !name.trim() || !email.trim() || !rollNumber.trim()}
                  className="w-full h-11 bg-[#111111] dark:bg-white dark:text-black text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isJoining ? 'Joining Batch...' : 'Confirm & Join Batch'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-center text-[11.5px] text-slate-500 dark:text-zinc-400 hover:text-black dark:hover:text-white uppercase font-bold tracking-wider py-1 cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Enter a different code</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </Modal>

      <BatchSetupPromptModal
        isOpen={showSetupPromptModal}
        onClose={() => setShowSetupPromptModal(false)}
        college={profile.college || ''}
        programme={profile.programme || ''}
        branch={profile.branch || ''}
        semester={profile.semester || 1}
      />
    </>
  );
};
