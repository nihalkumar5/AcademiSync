'use client';

import { SignInPanel } from '@/components/auth/SignInPrompt';
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useApp } from '@/context/AppContext';
import { extractCleanInviteCode, getShortCollegeName } from '@/lib/timetableUtils';
import { useRouter } from 'next/navigation';
import { Crown, User, Mail, Hash, CheckCircle2, ArrowRight, ArrowLeft } from '@/components/ui/icons';
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
        title={!isSignedIn ? undefined : step === 'code' ? "Connect with Your Class Batch" : "Complete Batch Registration"} 
        maxWidth={isSignedIn ? 'md' : 'sm'}
        showCloseButton={isSignedIn}
      >
        <div className="flex flex-col gap-5 text-left pt-1 font-sans">
          
          {/* CASE 1: USER IS NOT SIGNED IN */}
          {!isSignedIn ? (
            <SignInPanel
              bare
              title="Sign in to join your class"
              body="Joining puts you on your class list, so your timetable arrives ready and every change your CR makes reaches you."
              perks={['Your class timetable, ready-made', 'Cancelled and moved classes, live', 'Works on every device you use']}
              beforeSignIn={() => {
                if (inviteCodeInput.trim()) localStorage.setItem('pending_join_invite', inviteCodeInput.trim());
              }}
              onNavigate={handleModalClose}
              onCancel={handleModalClose}
            />
          ) : step === 'code' ? (
            /* STEP 1: ENTER BATCH CODE */
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="section-label">
                  Batch Code
                </label>
                <p className="text-[13px] text-[#6B6B6B] dark:text-[#888888] leading-relaxed">
                  Enter the 6-character Batch Code shared by your Batch Pilot or classmates.
                </p>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-surface border border-line focus-within:border-line-strong transition-colors">
                <input
                  type="text"
                  placeholder="e.g. 65SQ9K"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-transparent text-[15px] text-fg font-mono font-bold tracking-[2px] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A] placeholder:font-normal placeholder:tracking-normal uppercase"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || !inviteCodeInput.trim()}
                className="btn btn-primary w-full"
              >
                {isVerifying ? 'Searching Batch...' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Setup Batch Callout */}
              <div className="mt-2 pt-4 border-t border-line-soft flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-bold text-fg">
                    Don&apos;t have a batch code yet?
                  </span>
                  <span className="text-[11px] text-muted">
                    Create &amp; publish your class timetable for everyone.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleModalClose();
                    setShowSetupPromptModal(true);
                  }}
                  className="btn btn-secondary btn-sm hover:border-[#111111] dark:hover:border-white/[0.25]"
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
                    <span className="text-[12px] font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified class batch
                    </span>
                    <span className="text-[11px] font-mono font-bold text-muted">
                      CODE: {foundBatch.inviteCode || inviteCodeInput}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-fg leading-snug">
                    {getShortCollegeName(foundBatch.college)} · {foundBatch.branch} (Sem {foundBatch.semester})
                  </div>
                  <div className="text-[11px] text-muted">
                    College, branch &amp; schedule are locked from this batch. Enter your student details to appear in the class list.
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="section-label">
                  Full Name
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line focus-within:border-line-strong">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    className="w-full bg-transparent text-[14px] text-fg focus:outline-none"
                  />
                </div>
              </div>

              {/* Institute Email */}
              <div className="flex flex-col gap-1">
                <label className="section-label">
                  Institute Email
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line focus-within:border-line-strong">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu.in"
                    required
                    className="w-full bg-transparent text-[14px] text-fg focus:outline-none"
                  />
                </div>
              </div>

              {/* Roll Number (Crucial for Batch Members list!) */}
              <div className="flex flex-col gap-1">
                <label className="section-label">
                  Roll Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-line focus-within:border-line-strong">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 2023UGCS045"
                    required
                    autoFocus
                    className="w-full bg-transparent text-[14px] font-mono text-fg focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-muted">
                  Used to identify you in the official batch members directory.
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isJoining || !name.trim() || !email.trim() || !rollNumber.trim()}
                  className="btn btn-primary w-full"
                >
                  {isJoining ? 'Joining Batch...' : 'Confirm & Join Batch'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-center text-[12px] text-muted hover:text-fg font-bold py-1 cursor-pointer flex items-center justify-center gap-1"
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
