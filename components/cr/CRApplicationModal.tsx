'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getCanonicalBatchKey, formatBatchDisplayName, getShortCollegeName } from '@/lib/timetableUtils';
import { searchCollegesAsync, CollegeItem } from '@/lib/collegeDirectory';
import { STANDARD_PROGRAMMES, STANDARD_BRANCHES } from '@/lib/colleges';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Crown, 
  ShieldCheck, 
  Clock, 
  Phone, 
  Send,
  School,
  GraduationCap,
  Building2,
  Hash,
  Layers,
  ChevronDown,
  Users,
  AlertCircle,
  User,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Share2,
  Key
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { shareLink } from '@/lib/shareUtils';

interface CRApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCollege?: string;
  targetProgramme?: string;
  targetBranch?: string;
  targetSemester?: number;
  targetSection?: string;
}

const cleanInit = (val?: string) => {
  if (!val) return '';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'your college' || lower === 'college name' || lower === 'not specified' || lower === 'engineering') {
    return '';
  }
  return trimmed;
};

export const CRApplicationModal: React.FC<CRApplicationModalProps> = ({ 
  isOpen, 
  onClose,
  targetCollege,
  targetProgramme,
  targetBranch,
  targetSemester,
  targetSection
}) => {
  const { profile, user, showToast, searchBatchTimetable } = useApp();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any | null>(null);
  
  // Existing batch check states
  const [existingBatch, setExistingBatch] = useState<any | null>(null);
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);

  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  
  const [college, setCollege] = useState(cleanInit(targetCollege) || cleanInit(profile.college) || '');
  const [programme, setProgramme] = useState(cleanInit(targetProgramme) || cleanInit(profile.programme) || '');
  const [branch, setBranch] = useState(cleanInit(targetBranch) || cleanInit(profile.branch) || '');
  const [semester, setSemester] = useState(targetSemester || profile.semester || 1);
  const [section, setSection] = useState(targetSection || profile.section || '');
  const [rollNumber, setRollNumber] = useState(cleanInit(profile.rollNumber) || '');

  // Dropdown states
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<CollegeItem[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);

  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Synchronize when props change
  useEffect(() => {
    if (targetCollege !== undefined) setCollege(cleanInit(targetCollege));
    if (targetProgramme !== undefined) setProgramme(cleanInit(targetProgramme));
    if (targetBranch !== undefined) setBranch(cleanInit(targetBranch));
    if (targetSemester !== undefined) setSemester(targetSemester || 1);
    if (targetSection !== undefined) setSection(targetSection || '');
  }, [targetCollege, targetProgramme, targetBranch, targetSemester, targetSection]);

  // SheerID College search autocomplete (debounced)
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
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [college]);

  const canonicalBatchKey = getCanonicalBatchKey(college, programme, branch, semester, section);
  const requestId = user?.id && canonicalBatchKey ? `${user.id}_${canonicalBatchKey}` : null;

  // Background check for existing CR request in Firestore (does NOT unmount form)
  useEffect(() => {
    if (!isOpen || !requestId || !user?.id) {
      setExistingRequest(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const reqRef = doc(db, 'cr_requests', requestId);
        const unsubscribe = onSnapshot(reqRef, (snap) => {
          if (snap.exists()) {
            setExistingRequest(snap.data());
          } else {
            setExistingRequest(null);
          }
        }, (err) => {
          console.error('Error listening to CR request:', err);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Failed to setup request listener:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, requestId, user?.id]);

  // Debounced check: Check if this batch already exists in Firestore!
  useEffect(() => {
    if (!isOpen || !college.trim() || !branch.trim()) {
      setExistingBatch(null);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsCheckingBatch(true);
      try {
        // 1. Direct document check by canonicalKey
        const key = getCanonicalBatchKey(college, programme, branch, semester, section);
        const docRef = doc(db, 'shared_timetables', key);
        const snap = await getDoc(docRef);

        if (snap.exists() && active) {
          setExistingBatch({ ...snap.data(), id: snap.id });
          return;
        }

        // 2. Fuzzy search by searchBatchTimetable
        const matched = await searchBatchTimetable(college, programme, branch, Number(semester), section || 'A');
        if (matched && active) {
          setExistingBatch(matched);
        } else if (active) {
          setExistingBatch(null);
        }
      } catch (err) {
        console.error('Error checking existing batch:', err);
      } finally {
        if (active) setIsCheckingBatch(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, college, programme, branch, semester, section, searchBatchTimetable]);

  const handleAskPilotWhatsApp = async () => {
    const courseTitle = `${branch || 'Class'} (Sem ${semester}${section ? `, Section ${section}` : ''})`;
    const messageText = `Hey Batch Pilot! 👋

Could you please share the official *Intersemester Batch Code* for our class:
🏛️ *${getShortCollegeName(college)}*
📚 *${courseTitle}*

Need the code to sync timetable, room updates, and class alerts. Thanks! 🚀`;

    try {
      const res = await shareLink({
        title: `Request Batch Code: ${courseTitle}`,
        text: messageText,
        dialogTitle: 'Ask Batch Pilot on WhatsApp'
      });
      if (res === 'copied') {
        showToast('Message Copied!', 'Paste this message in your class group or DM your Batch Pilot.', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isCR = profile.role === 'cr' || profile.role === 'super_admin';
  const crUserIds = Array.isArray(existingBatch?.crUserIds) ? existingBatch.crUserIds : [];
  const crEmails = Array.isArray(existingBatch?.crEmails) ? existingBatch.crEmails : [];
  const uniquePilotIds = new Set([
    ...(existingBatch?.creatorId ? [existingBatch.creatorId] : []),
    ...crUserIds,
    ...crEmails
  ]);
  const existingPilotsCount = uniquePilotIds.size || (existingBatch?.crName || existingBatch?.creatorName ? 1 : 0);
  const isBatchFull = !!(existingBatch && existingPilotsCount >= 3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBatchFull) {
      showToast('Batch Capacity Full', 'This batch already has maximum capacity (3/3 Batch Pilots).', 'error');
      return;
    }

    if (!user) {
      showToast('Sign In Required', 'Please sign in to apply for Batch Pilot verification.', 'info');
      router.push('/sign-in');
      return;
    }

    if (!college.trim()) {
      showToast('College Required', 'Please select or enter your college.', 'error');
      return;
    }

    if (!programme.trim()) {
      showToast('Degree Required', 'Please select your degree/programme.', 'error');
      return;
    }

    if (!branch.trim()) {
      showToast('Branch Required', 'Please select your branch.', 'error');
      return;
    }

    if (!phone.trim()) {
      showToast('Phone Required', 'Please enter your WhatsApp phone number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: requestId,
        userId: user.id,
        name: profile.name || user.fullName || 'Student',
        email: userEmail,
        rollNumber: rollNumber.trim() || 'N/A',
        college: college.trim(),
        programme: programme.trim(),
        branch: branch.trim(),
        semester: Number(semester) || 1,
        section: (section || '').trim().toUpperCase(),
        batchKey: canonicalBatchKey,
        phone: phone.trim(),
        note: note.trim() || 'Batch Pilot',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'cr_requests', requestId!), payload, { merge: true });
      showToast('Application Submitted! 🚀', 'Your Batch Pilot request has been sent for verification.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to submit Batch Pilot request:', err);
      showToast('Submission Failed', 'Could not submit Batch Pilot request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Apply for Batch Pilot 🚀"
      description="Claim management access to create & update the official schedule for your batch."
      maxWidth="2xl"
      showCloseButton={true}
    >
      <div className="flex flex-col text-left font-sans gap-5">
        
        {/* CASE 1: USER IS NOT SIGNED IN */}
        {!user ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] rounded-none">
            <div className="w-14 h-14 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#111111] rounded-none flex items-center justify-center shadow-sm">
              <User className="w-7 h-7 text-black dark:text-white stroke-[1.8]" />
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono tracking-widest uppercase text-amber-600 dark:text-amber-400">
                AUTHENTICATION REQUIRED
              </span>
              <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF] mt-1">
                Please Sign In First
              </h3>
              <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] mt-1.5 max-w-md leading-relaxed">
                You need to sign in with your student account before applying for Batch Pilot verification. This keeps schedule permissions verified and secure.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mt-2">
              <button 
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/sign-in');
                }} 
                className="flex-1 px-6 py-3 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <User className="w-4 h-4" />
                <span>Sign In Now</span>
              </button>
              <button 
                type="button"
                onClick={onClose} 
                className="px-5 py-3 border border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isCR ? (
          /* CASE 2: USER IS ALREADY A CR / ADMIN */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#F7F7F5] dark:bg-[#1A1A1A] rounded-none">
            <div className="w-14 h-14 border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-[#111111] rounded-none flex items-center justify-center shadow-sm">
              <Crown className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                You are a Verified Batch Pilot! 🚀
              </h3>
              <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] mt-1.5 max-w-md leading-relaxed">
                You have full authority to manage timetables, cancel classes, and broadcast live alerts to {formatBatchDisplayName(profile.branch, profile.semester, profile.section)}.
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="mt-2 px-6 py-2.5 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity rounded-none cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        ) : existingRequest?.status === 'pending' ? (
          /* CASE 3: APPLICATION UNDER REVIEW */
          <div className="flex flex-col gap-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400">
                APPLICATION UNDER REVIEW
              </span>
              <h4 className="text-[17px] font-bold text-[#111111] dark:text-[#F4F4F6] mt-1">
                Verification in Progress
              </h4>
            </div>
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#94A3B8] leading-relaxed">
              Your Batch Pilot request for <strong>{college}</strong> · <strong>{formatBatchDisplayName(branch, semester, section)}</strong> is currently being reviewed.
            </p>
            <div className="p-4 bg-white dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.08] rounded-none text-[12px] space-y-1.5 font-mono text-[#111111] dark:text-[#F4F4F6]">
              <div><strong>Roll No:</strong> {existingRequest.rollNumber}</div>
              <div><strong>Email:</strong> {existingRequest.email}</div>
              <div><strong>WhatsApp:</strong> {existingRequest.phone}</div>
              <div><strong>Applied:</strong> {new Date(existingRequest.createdAt).toLocaleDateString()}</div>
            </div>
            <p className="text-[12px] text-[#888888] dark:text-[#94A3B8]">
              Once verified by our team, Batch Pilot editing and broadcast tools will unlock immediately.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#111111] dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity rounded-none cursor-pointer shadow-sm"
            >
              Got it
            </button>
          </div>
        ) : (
          /* CASE 4: STANDARDIZED VERIFICATION FORM */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* EXISTING BATCH DETECTED WARNING BANNER */}
            {existingBatch && (
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-none flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-none bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      {isBatchFull ? 'BATCH PILOT CAPACITY FULL (3/3) 🔒' : 'BATCH ALREADY CREATED ⚡'}
                    </span>
                    <h4 className="text-[14px] font-bold text-[#111111] dark:text-white leading-snug">
                      {isBatchFull ? 'Maximum Pilot Limit Reached for this Batch' : 'Official timetable already exists for this batch!'}
                    </h4>
                    <p className="text-[12.5px] text-[#555555] dark:text-[#A0A0A0] leading-relaxed mt-0.5">
                      {existingBatch.creatorName || existingBatch.crName 
                        ? `Created by ${existingBatch.creatorName || existingBatch.crName}. `
                        : 'A live schedule is already published. '}
                      To prevent unauthorized access, please <strong>ask your Batch Pilot for the official Batch Code</strong> to connect.
                    </p>
                  </div>
                </div>

                {/* Ask Pilot on WhatsApp Action */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleAskPilotWhatsApp}
                    className="flex-1 py-2.5 px-4 bg-[#111111] dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity rounded-none cursor-pointer shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    <span>Ask Batch Pilot on WhatsApp</span>
                    <Share2 className="w-3.5 h-3.5 text-white/60 dark:text-black/60" />
                  </button>
                </div>

                {isBatchFull ? (
                  <p className="text-[11.5px] text-red-600 dark:text-red-400 font-medium">
                    ⚠️ This batch already has maximum capacity (3/3 Batch Pilots). Ask your Pilot for the batch code to join from the app.
                  </p>
                ) : (
                  <p className="text-[11px] text-[#6F6F6F] dark:text-[#94A3B8]">
                    💡 <em>Are you an official CR/Pilot for this section? You can still submit your application below to become an authorized Co-Pilot ({existingPilotsCount}/3 Pilots).</em>
                  </p>
                )}
              </div>
            )}

            {/* Batch Details Card */}
            <div className="p-4 sm:p-5 bg-[#F9F9F8] dark:bg-[#121317] border border-[#E5E5E5] dark:border-white/[0.08] rounded-none flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-white/[0.08] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#64748B] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  BATCH YOU WILL MANAGE
                </span>
                <span className="text-[10px] font-mono text-[#6F6F6F] dark:text-[#94A3B8] uppercase">
                  {isCheckingBatch ? 'Checking availability...' : 'STANDARDIZED FORMAT'}
                </span>
              </div>

              <div className="flex flex-col gap-3.5">
                
                {/* 1. College Search Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                    College / University <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none focus-within:border-black dark:focus-within:border-white/30 transition-colors">
                      <School className="w-4 h-4 text-[#888888] shrink-0" />
                      <input
                        type="text"
                        placeholder="Search verified college (e.g. SRM, IIT, VIT, IIIT)..."
                        value={college}
                        onChange={(e) => {
                          setCollege(e.target.value);
                          setShowCollegeDropdown(true);
                        }}
                        onFocus={() => {
                          if (suggestedColleges.length > 0) setShowCollegeDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 200)}
                        required
                        className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                      />
                    </div>
                    
                    {showCollegeDropdown && (suggestedColleges.length > 0 || isLoadingColleges) && (
                      <div className="absolute top-full left-0 w-full mt-1.5 max-h-52 overflow-y-auto bg-white dark:bg-[#121317] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none shadow-2xl z-50 divide-y divide-[#E5E5E5] dark:divide-white/[0.08]">
                        <div className="p-2.5 bg-[#F9F9F8] dark:bg-[#090A0C] text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#94A3B8] flex items-center justify-between sticky top-0">
                          <span>{isLoadingColleges ? 'Searching database...' : 'Select Your College'}</span>
                          <span className="text-[8.5px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 font-mono font-bold rounded-none">Database Verified</span>
                        </div>
                        {suggestedColleges.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={() => {
                              setCollege(item.name);
                              setShowCollegeDropdown(false);
                            }}
                            className="w-full px-3.5 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors cursor-pointer flex flex-col"
                          >
                            <span className="text-[12.5px] font-bold text-[#111111] dark:text-[#F4F4F6] leading-snug">
                              {item.name}
                            </span>
                            {item.state && (
                              <span className="text-[11px] text-[#888888] dark:text-[#94A3B8] mt-0.5">
                                {item.state}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Degree & Branch Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Degree / Programme Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      Degree / Programme <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none focus-within:border-black dark:focus-within:border-white/30 transition-colors">
                        <GraduationCap className="w-4 h-4 text-[#888888] shrink-0" />
                        <input
                          type="text"
                          value={programme}
                          onChange={(e) => {
                            setProgramme(e.target.value);
                            setShowProgrammeDropdown(true);
                          }}
                          onFocus={() => setShowProgrammeDropdown(true)}
                          onBlur={() => setTimeout(() => setShowProgrammeDropdown(false), 200)}
                          placeholder="e.g. B.Tech, M.Tech, BCA"
                          required
                          className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                        />
                        <ChevronDown className="w-4 h-4 text-[#888888] shrink-0 pointer-events-none" />
                      </div>

                      {showProgrammeDropdown && (
                        <div className="absolute top-full left-0 w-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-[#121317] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none shadow-2xl z-50">
                          {STANDARD_PROGRAMMES.filter(p => p.toLowerCase().includes(programme.toLowerCase())).length > 0 ? (
                            STANDARD_PROGRAMMES.filter(p => p.toLowerCase().includes(programme.toLowerCase())).map(p => (
                              <div
                                key={p}
                                onMouseDown={() => { setProgramme(p); setShowProgrammeDropdown(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[12.5px] font-medium text-[#111111] dark:text-[#F4F4F6] border-b border-[#E5E5E5] dark:border-white/[0.08] last:border-0"
                              >
                                {p}
                              </div>
                            ))
                          ) : (
                            <div className="px-3.5 py-2 text-xs text-[#6F6F6F] dark:text-[#94A3B8] font-mono">
                              Press Tab to use custom degree
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Major / Branch Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      Major / Branch <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none focus-within:border-black dark:focus-within:border-white/30 transition-colors">
                        <Building2 className="w-4 h-4 text-[#888888] shrink-0" />
                        <input
                          type="text"
                          value={branch}
                          onChange={(e) => {
                            setBranch(e.target.value);
                            setShowBranchDropdown(true);
                          }}
                          onFocus={() => setShowBranchDropdown(true)}
                          onBlur={() => setTimeout(() => setShowBranchDropdown(false), 200)}
                          placeholder="e.g. Computer Science (CSE)"
                          required
                          className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                        />
                        <ChevronDown className="w-4 h-4 text-[#888888] shrink-0 pointer-events-none" />
                      </div>

                      {showBranchDropdown && (
                        <div className="absolute top-full left-0 w-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-[#121317] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none shadow-2xl z-50">
                          {STANDARD_BRANCHES.filter(b => b.toLowerCase().includes(branch.toLowerCase())).length > 0 ? (
                            STANDARD_BRANCHES.filter(b => b.toLowerCase().includes(branch.toLowerCase())).map(b => (
                              <div
                                key={b}
                                onMouseDown={() => { setBranch(b); setShowBranchDropdown(false); }}
                                className="px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[12.5px] font-medium text-[#111111] dark:text-[#F4F4F6] border-b border-[#E5E5E5] dark:border-white/[0.08] last:border-0"
                              >
                                {b}
                              </div>
                            ))
                          ) : (
                            <div className="px-3.5 py-2 text-xs text-[#6F6F6F] dark:text-[#94A3B8] font-mono">
                              Press Tab to use custom branch
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* 3. Semester, Section & Roll Number Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  
                  {/* Semester Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value) || 1)}
                      className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none text-[13.5px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus-border-white/30 transition-colors cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                        <option key={sem} value={sem} className="dark:bg-[#121317]">
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      Section (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A, B or 1"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none text-[13.5px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-black dark:focus:border-white/30 transition-colors uppercase placeholder:normal-case placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                    />
                  </div>

                  {/* Roll Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      Roll Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none focus-within:border-black dark:focus-within:border-white/30 transition-colors">
                      <Hash className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. 2024CS01"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        required
                        className="w-full bg-transparent text-[13.5px] font-mono font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* Batch Preview Pill */}
              <div className="mt-1 pt-3 border-t border-[#E5E5E5] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[11.5px]">
                <span className="text-[#888888] dark:text-[#94A3B8] font-medium">Batch Key:</span>
                <span className="font-mono text-[11px] bg-black/5 dark:bg-white/[0.04] border border-[#E5E5E5] dark:border-white/[0.08] px-2.5 py-1 rounded-none text-[#111111] dark:text-[#F4F4F6] truncate max-w-full">
                  {canonicalBatchKey || 'batch-key-preview'}
                </span>
              </div>
            </div>

            {!isBatchFull ? (
              <>
                {/* Contact Information Card */}
                <div className="p-4 sm:p-5 bg-[#F9F9F8] dark:bg-[#121317] border border-[#E5E5E5] dark:border-white/[0.08] rounded-none flex flex-col gap-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#888888] dark:text-[#64748B] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    CONTACT &amp; VERIFICATION
                  </span>

                  {/* WhatsApp Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      WhatsApp Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none focus-within:border-black dark:focus-within:border-white/30 transition-colors">
                      <Phone className="w-4 h-4 text-[#888888] shrink-0" />
                      <input
                        type="tel"
                        placeholder="+91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-transparent text-[13.5px] font-mono font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                      />
                    </div>
                  </div>

                  {/* Proof / Verification Note */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-wider uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                      Proof / Verification Note (Optional)
                    </label>
                    <div className="p-3 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] rounded-none focus-within:border-black dark:focus-within:border-white/30 transition-colors">
                      <textarea
                        rows={2}
                        placeholder="e.g. Official Class Representative / Batch Leader for CSE 2024 section A"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-transparent text-[13px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-black font-bold text-[13px] uppercase tracking-wider hover:opacity-90 transition-all rounded-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Request...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{existingBatch ? 'Apply as Co-Pilot (Up to 3 Allowed) 🚀' : 'Submit Request for Approval 🚀'}</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11.5px] text-[#888888] dark:text-[#94A3B8]">
                    Applications are typically reviewed by admin within 24 hours.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 border border-[#D8D8D8] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[12px] font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-none cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            )}

          </form>
        )}
      </div>
    </Modal>
  );
};
