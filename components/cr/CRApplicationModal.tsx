'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { getCanonicalBatchKey } from '@/lib/timetableUtils';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Crown, ShieldCheck, Clock, CheckCircle2, AlertCircle, Phone, FileText, Send, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CRApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CRApplicationModal: React.FC<CRApplicationModalProps> = ({ isOpen, onClose }) => {
  const { profile, user, showToast } = useApp();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  const college = profile.college || '';
  const branch = profile.branch || '';
  const semester = profile.semester || 1;
  const section = profile.section || 'A';

  const canonicalBatchKey = getCanonicalBatchKey(college, profile.programme || 'B.Tech', branch, semester, section);
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
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-slate-500 font-medium">Checking application status...</span>
          </div>
        ) : profile.role === 'cr' || profile.role === 'super_admin' ? (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="text-[16px] font-bold text-amber-950 dark:text-amber-200">
                You are a Verified Class Representative! 👑
              </h4>
              <p className="text-[13px] text-amber-800/80 dark:text-amber-400 mt-1">
                You have full authority to create, update, cancel classes, and broadcast notices to {profile.branch} (Sec {profile.section || 'A'}).
              </p>
            </div>
            <Button onClick={onClose} className="w-full mt-2">
              Back to App
            </Button>
          </div>
        ) : existingRequest?.status === 'pending' ? (
          <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <h4 className="text-[15px] font-bold text-amber-950 dark:text-amber-200">
                Application Under Review ⏳
              </h4>
            </div>
            <p className="text-[13px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
              Your CR verification request for <strong>{college}</strong> · <strong>{branch} (Sem {semester}, Sec {section})</strong> is pending approval with the Super Admin.
            </p>
            <div className="p-3 bg-white/60 dark:bg-zinc-900/60 rounded-xl text-[12px] space-y-1 font-mono text-slate-700 dark:text-zinc-300">
              <div><strong>Roll No:</strong> {existingRequest.rollNumber}</div>
              <div><strong>Email:</strong> {existingRequest.email}</div>
              <div><strong>Applied on:</strong> {new Date(existingRequest.createdAt).toLocaleDateString()}</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Once approved, you will be able to create, publish and broadcast official batch schedules!
            </p>
          </div>
        ) : existingRequest?.status === 'rejected' ? (
          <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <h4 className="text-[14px] font-bold text-red-950 dark:text-red-200">
                Application Not Approved
              </h4>
            </div>
            <p className="text-[12px] text-red-800 dark:text-red-300">
              Your previous CR request was not approved. You can re-apply with additional details or contact your admin.
            </p>
            <Button onClick={() => setExistingRequest(null)} variant="outline" className="w-full">
              Re-apply with New Details
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Header info */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[12px] text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Why CR Verification?</strong>
                <p className="mt-0.5 text-indigo-800/80 dark:text-indigo-300 text-[11px]">
                  To prevent duplicate, spam, or inaccurate timetables, only verified Class Representatives can publish and broadcast schedules.
                </p>
              </div>
            </div>

            {/* Target Batch Info Readonly summary */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1 text-[12px]">
              <div className="text-slate-500 font-medium">Batch You Will Manage:</div>
              <div className="font-bold text-slate-900 dark:text-white">
                {college || 'No college set'} · {branch || 'No branch'}
              </div>
              <div className="text-[11px] text-slate-500">
                Semester {semester} · Section {section} · Roll No: {profile.rollNumber || 'N/A'}
              </div>
            </div>

            {/* WhatsApp Phone */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                WhatsApp Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Note / Verification reason */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Proof / Reason (e.g. Official CR selected by Faculty)
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  placeholder="e.g. Official Class Representative for CSE-A 2024 batch"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 mt-1"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
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
