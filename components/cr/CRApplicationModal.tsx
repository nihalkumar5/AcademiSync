'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getCanonicalBatchKey, isExplicitSection, formatBatchDisplayName } from '@/lib/timetableUtils';
import { searchCollegesAsync, CollegeItem } from '@/lib/collegeDirectory';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Crown, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Phone, 
  Send
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

  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  
  const [college, setCollege] = useState(targetCollege || profile.college || '');
  const [programme, setProgramme] = useState(targetProgramme || profile.programme || 'B.Tech');
  const [branch, setBranch] = useState(targetBranch || profile.branch || '');
  const [semester, setSemester] = useState(targetSemester || profile.semester || 1);
  const [section, setSection] = useState(targetSection || profile.section || '');
  const [rollNumber, setRollNumber] = useState(profile.rollNumber || '');

  // SheerID College search autocomplete
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<CollegeItem[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);

  useEffect(() => {
    let active = true;
    if (!college.trim()) {
      setSuggestedColleges([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoadingColleges(true);
      try {
        const results = await searchCollegesAsync(college);
        if (active) {
          setSuggestedColleges(results);
        }
      } catch (err) {
        console.error('Error searching colleges:', err);
      } finally {
        if (active) setIsLoadingColleges(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [college]);

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
        rollNumber: rollNumber || 'N/A',
        college: college,
        programme: programme,
        branch: branch,
        semester: semester,
        section: section,
        batchKey: canonicalBatchKey,
        phone: phone.trim(),
        note: note.trim() || 'Batch Pilot',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'cr_requests', requestId!), payload, { merge: true });
      showToast('Application Submitted! 🚀', 'Your Batch Pilot request has been sent for admin review.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to submit Batch Pilot request:', err);
      showToast('Submission Failed', 'Could not submit Batch Pilot request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCR = profile.role === 'cr' || profile.role === 'super_admin';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Apply for Batch Pilot 🚀"
      maxWidth="md"
      showCloseButton={true}
    >
      <div className="flex flex-col text-left font-sans gap-4 pt-1">
        {loadingStatus ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#6F6F6F]">
              Checking status...
            </span>
          </div>
        ) : isCR ? (
          <div className="p-6 flex flex-col items-center text-center gap-3 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A]">
            <div className="w-10 h-10 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#111111] flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                You are a Verified Batch Pilot! 🚀
              </h3>
              <p className="text-[12.5px] text-[#6F6F6F] mt-1">
                You have full authority to create, update, cancel classes, and broadcast updates to {formatBatchDisplayName(profile.branch, profile.semester, profile.section)}.
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="w-full mt-2 py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Back to App
            </button>
          </div>
        ) : existingRequest?.status === 'pending' ? (
          <div className="p-5 border border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="text-[15px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                Application Under Review ⏳
              </h4>
            </div>
            <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#A0A0A0] leading-relaxed">
              Your Batch Pilot verification request for <strong>{college}</strong> · <strong>{formatBatchDisplayName(branch, semester, section)}</strong> is pending approval with the admin team.
            </p>
            <div className="p-3 bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] text-[11.5px] space-y-1 font-mono text-[#111111] dark:text-[#FFFFFF]">
              <div><strong>Roll No:</strong> {existingRequest.rollNumber}</div>
              <div><strong>Email:</strong> {existingRequest.email}</div>
              <div><strong>Phone:</strong> {existingRequest.phone}</div>
              <div><strong>Applied:</strong> {new Date(existingRequest.createdAt).toLocaleDateString()}</div>
            </div>
            <p className="text-[11.5px] text-[#888888]">
              Once approved, your Batch Pilot tools will unlock automatically.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[11.5px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Got it
            </button>
          </div>
        ) : (
          /* VERIFICATION FORM */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Batch Details (Editable) */}
            <div className="flex flex-col gap-2.5 p-3 bg-[#F9F9F8] dark:bg-[#161616] border border-[#D8D8D8] dark:border-[#333333]">
              <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#888888] mb-0.5">
                Batch You Will Manage
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search verified college (e.g. SRM, IIT, VIT)..."
                    value={college}
                    onChange={(e) => {
                      setCollege(e.target.value);
                      setShowCollegeDropdown(true);
                    }}
                    onFocus={() => {
                      if (suggestedColleges.length > 0) setShowCollegeDropdown(true);
                    }}
                    required
                    className="w-full bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                  />
                  {showCollegeDropdown && (suggestedColleges.length > 0 || isLoadingColleges) && (
                    <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] shadow-xl z-50 divide-y divide-[#E5E5E5] dark:divide-[#2C2C2C]">
                      <div className="p-2 bg-[#F9F9F8] dark:bg-[#161616] text-[10px] font-bold uppercase tracking-wider text-[#888888] flex items-center justify-between sticky top-0">
                        <span>{isLoadingColleges ? 'Searching SheerID...' : 'Select College'}</span>
                        <span className="text-[8.5px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 font-mono font-bold">SheerID Verified</span>
                      </div>
                      {suggestedColleges.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={() => {
                            setCollege(item.name);
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors cursor-pointer flex flex-col"
                        >
                          <span className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                            {item.name}
                          </span>
                          {item.state && (
                            <span className="text-[10.5px] text-[#888888]">
                              {item.state}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Branch (e.g. CSE)"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                    className="w-full bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                  />
                  <input
                    type="text"
                    placeholder="Roll Number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="w-full bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none placeholder:text-[#A0A0A0]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2">
                    <span className="text-[12.5px] text-[#A0A0A0] mr-2">Sem</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value) || 1)}
                      required
                      className="w-full bg-transparent text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2">
                    <span className="text-[12.5px] text-[#A0A0A0] mr-2">Sec</span>
                    <input
                      type="text"
                      placeholder="e.g. A (Optional)"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full bg-transparent text-[12.5px] font-medium text-[#111111] dark:text-[#FFFFFF] focus:outline-none uppercase placeholder:normal-case placeholder:text-[#A0A0A0]"
                    />
                  </div>
                </div>
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
                  placeholder="e.g. Official Batch Pilot / Class Leader for CSE 2024 batch"
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
        )}
      </div>
    </Modal>
  );
};
