'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getCanonicalBatchKey, isExplicitSection, formatBatchDisplayName } from '@/lib/timetableUtils';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Crown, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Send, 
  ArrowRight, 
  ArrowLeft,
  Calendar, 
  Bell, 
  Users 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CRApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCollege?: string;
  targetProgramme?: string;
  targetBranch?: string;
  targetSemester?: number;
  targetSection?: string;
}

export const CRApplicationModal: React.FC<CRApplicationModalProps> = ({ 
  isOpen, 
  onClose,
  targetCollege,
  targetProgramme,
  targetBranch,
  targetSemester,
  targetSection
}) => {
  const { profile, user, showToast } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<'benefits' | 'form'>('benefits');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  const college = targetCollege || profile.college || '';
  const programme = targetProgramme || profile.programme || 'B.Tech';
  const branch = targetBranch || profile.branch || '';
  const semester = targetSemester || profile.semester || 1;
  const section = targetSection || profile.section || 'A';

  const canonicalBatchKey = getCanonicalBatchKey(college, programme, branch, semester, section);
  const requestId = user?.id ? `${user.id}_${canonicalBatchKey}` : null;

  // Reset to benefits step whenever opened
  useEffect(() => {
    if (isOpen) {
      setStep('benefits');
    }
  }, [isOpen]);

  // Listen to existing request status in Firestore
  useEffect(() => {
    if (!isOpen || !requestId) {
      setLoadingStatus(false);
      return;
    }

    setLoadingStatus(true);
    const reqRef = doc(db, 'cr_requests', requestId);
    const unsubscribe = onSnapshot(reqRef, (snap) => {
      if (snap.exists()) {
        setExistingRequest(snap.data());
      } else {
        setExistingRequest(null);
      }
      setLoadingStatus(false);
    }, (err) => {
      console.error('Error listening to CR request:', err);
      setLoadingStatus(false);
    });

    return () => unsubscribe();
  }, [isOpen, requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Sign In Required', 'Please sign in to apply for CR verification.', 'info');
      router.push('/sign-in');
      return;
    }

    if (!college.trim()) {
      showToast('College Required', 'Please set your college in profile settings first.', 'error');
      return;
    }

    if (!phone.trim()) {
      showToast('Phone Required', 'Please enter your WhatsApp/phone number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: requestId,
        userId: user.id,
        name: profile.name || user.fullName || 'Student',
        email: userEmail,
        rollNumber: profile.rollNumber || 'N/A',
        college: college,
        programme: profile.programme || 'B.Tech',
        branch: branch,
        semester: semester,
        section: section,
        batchKey: canonicalBatchKey,
        phone: phone.trim(),
        note: note.trim() || 'Official Class Representative',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'cr_requests', requestId!), payload, { merge: true });
      showToast('Application Submitted! 🎉', 'Your CR request has been sent for admin review.', 'success');
      setStep('benefits');
    } catch (err: any) {
      console.error('Failed to submit CR request:', err);
      showToast('Submission Failed', 'Could not submit CR request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCR = profile.role === 'cr' || profile.role === 'super_admin';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      mobileFullSheet={true} 
      maxWidth="md"
      showCloseButton={true}
    >
      <div className="flex flex-col text-left font-sans">
        {loadingStatus ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#6F6F6F]">
              Loading...
            </span>
          </div>
        ) : isCR ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                You are a Verified Class Representative! 👑
              </h3>
              <p className="text-[13px] text-[#6F6F6F] mt-1.5 max-w-sm leading-relaxed">
                You have full authority to create, update, cancel classes, and broadcast updates to {formatBatchDisplayName(profile.branch, profile.semester, profile.section)}.
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="w-full mt-3 py-3 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Back to App
            </button>
          </div>
        ) : existingRequest?.status === 'pending' ? (
          <div className="p-5 sm:p-6 border border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-4 my-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                Application Under Review ⏳
              </h4>
            </div>
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-relaxed">
              Your CR verification request for <strong>{college}</strong> · <strong>{formatBatchDisplayName(branch, semester, section)}</strong> is pending approval with the admin team.
            </p>
            <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] text-[12px] space-y-1 font-mono text-[#111111] dark:text-[#FFFFFF]">
              <div><strong>Roll No:</strong> {existingRequest.rollNumber}</div>
              <div><strong>Email:</strong> {existingRequest.email}</div>
              <div><strong>Phone:</strong> {existingRequest.phone}</div>
              <div><strong>Applied:</strong> {new Date(existingRequest.createdAt).toLocaleDateString()}</div>
            </div>
            <p className="text-[12px] text-[#888888] leading-tight">
              Once approved, you will be notified and your CR broadcast tools will unlock immediately.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Got it
            </button>
          </div>
        ) : step === 'benefits' ? (
          /* SCREEN 1: EDITORIAL BENEFITS HERO SCREEN (cr.png) */
          <div className="flex flex-col gap-5 pt-1 pb-4">
            {/* Header */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[1.15]">
                Become your<br className="hidden sm:inline" /> batch CR.
              </h1>
              <p className="text-[13.5px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-relaxed max-w-sm">
                Keep everyone on the same timetable and never miss what matters.
              </p>
            </div>

            {/* Hero Image */}
            <div className="w-full flex items-center justify-center py-2">
              <img 
                src="/cr.png" 
                alt="Class Representative" 
                className="max-h-[175px] sm:max-h-[200px] w-auto object-contain"
              />
            </div>

            {/* Section 1: WHAT YOU'LL UNLOCK */}
            <div className="flex flex-col gap-2.5 mt-1">
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

            {/* Primary Action Button */}
            <div className="flex flex-col items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    showToast('Sign In Required', 'Please sign in to apply for CR verification.', 'info');
                    router.push('/sign-in');
                    return;
                  }
                  setStep('form');
                }}
                className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Apply to become CR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 text-[11.5px] text-[#6F6F6F] dark:text-[#888888]">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>You&apos;ll need to verify your college &amp; batch.</span>
              </div>
            </div>
          </div>
        ) : (
          /* SCREEN 2: VERIFICATION FORM */
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
              <button
                type="button"
                onClick={() => setStep('benefits')}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to overview
              </button>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                Step 2 of 2
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Batch You Will Manage */}
              <div className="p-3.5 bg-[#F9F9F8] dark:bg-[#161616] border border-[#D8D8D8] dark:border-[#333333] space-y-1 text-[12px]">
                <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#888888]">
                  Batch You Will Manage
                </div>
                <div className="font-bold text-[13.5px] text-[#111111] dark:text-[#FFFFFF]">
                  {college || 'No college set'} · {formatBatchDisplayName(branch, semester, section)}
                </div>
                <div className="text-[11.5px] text-[#6F6F6F]">
                  Roll No: {profile.rollNumber || 'N/A'} {isExplicitSection(section) ? `· Section ${section}` : ''}
                </div>
              </div>

              {/* WhatsApp Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#6F6F6F] dark:text-[#A0A0A0]">
                  WhatsApp Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                  <Phone className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-transparent text-[13px] font-mono font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                  />
                </div>
              </div>

              {/* Note / Verification reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#6F6F6F] dark:text-[#A0A0A0]">
                  Proof / Verification Note (Optional)
                </label>
                <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333]">
                  <textarea
                    rows={2}
                    placeholder="e.g. Official Class Representative for CSE 2024 batch"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-transparent text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0] resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[12.5px] uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isSubmitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Request for Approval
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
