'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { getCanonicalBatchKey, isExplicitSection, formatBatchDisplayName } from '@/lib/timetableUtils';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Crown, ShieldCheck, Clock, CheckCircle2, AlertCircle, Phone, FileText, Send, Sparkles } from 'lucide-react';
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
    } catch (err: any) {
      console.error('Failed to submit CR request:', err);
      showToast('Submission Failed', 'Could not submit CR request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Class Representative (CR)" maxWidth="md">
      <div className="flex flex-col gap-4 text-left pt-1">
        {loadingStatus ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#6F6F6F]">Checking application status...</span>
          </div>
        ) : profile.role === 'cr' || profile.role === 'super_admin' ? (
          <div className="p-5 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#111111] flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                You are a Verified Class Representative! 👑
              </h4>
              <p className="text-[12px] text-[#6F6F6F] mt-1">
                You have full authority to create, update, cancel classes, and broadcast notices to {formatBatchDisplayName(profile.branch, profile.semester, profile.section)}.
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="w-full mt-2 py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              Back to App
            </button>
          </div>
        ) : existingRequest?.status === 'pending' ? (
          <div className="p-5 border border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                Application Under Review ⏳
              </h4>
            </div>
            <p className="text-[12px] text-[#6F6F6F] leading-relaxed">
              Your CR verification request for <strong>{college}</strong> · <strong>{formatBatchDisplayName(branch, semester, section)}</strong> is pending approval with the Super Admin.
            </p>
            <div className="p-3 bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] text-[11px] space-y-1 font-mono text-[#111111] dark:text-[#FFFFFF]">
              <div><strong>Roll No:</strong> {existingRequest.rollNumber}</div>
              <div><strong>Email:</strong> {existingRequest.email}</div>
              <div><strong>Applied on:</strong> {new Date(existingRequest.createdAt).toLocaleDateString()}</div>
            </div>
            <p className="text-[11px] text-[#A0A0A0]">
              Once approved, you will be able to create, publish and broadcast official batch schedules!
            </p>
          </div>
        ) : existingRequest?.status === 'rejected' ? (
          <div className="p-5 border border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-950/20 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <h4 className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                Application Not Approved
              </h4>
            </div>
            <p className="text-[12px] text-[#6F6F6F]">
              Your previous CR request was not approved. You can re-apply with additional details or contact your admin.
            </p>
            <button 
              type="button"
              onClick={() => setExistingRequest(null)} 
              className="w-full py-2.5 border border-[#111111] dark:border-[#FFFFFF] text-[12px] font-bold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
            >
              Re-apply with New Details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Header info */}
            <div className="p-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] text-[12px] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider text-[10px]">Why CR Verification?</strong>
                <p className="mt-0.5 text-[#6F6F6F] text-[11px] leading-snug">
                  To prevent duplicate or inaccurate timetables, only verified Class Representatives can publish and broadcast schedules.
                </p>
              </div>
            </div>

            {/* Target Batch Info Readonly summary */}
            <div className="p-3 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] space-y-1 text-[12px]">
              <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">Batch You Will Manage</div>
              <div className="font-bold text-[#111111] dark:text-[#FFFFFF]">
                {college || 'No college set'} · {formatBatchDisplayName(branch, semester, section)}
              </div>
              <div className="text-[11px] text-[#6F6F6F]">
                Roll No: {profile.rollNumber || 'N/A'} {isExplicitSection(section) ? `· Section ${section}` : ''}
              </div>
            </div>

            {/* WhatsApp Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">
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
              <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#A0A0A0]">
                Proof / Reason (Optional)
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
              className="w-full py-3 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] tracking-wide hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
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
        )}
      </div>
    </Modal>
  );
};
