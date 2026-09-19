'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { searchCollegesAsync, CollegeItem } from '@/lib/collegeDirectory';
import { STANDARD_PROGRAMMES, STANDARD_BRANCHES, filterProgrammes, filterBranches, getCanonicalProgramme } from '@/lib/colleges';
import { formatBatchDisplayName, getShortCollegeName } from '@/lib/timetableUtils';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { 
  School, 
  GraduationCap, 
  Building2, 
  CalendarDays, 
  Search, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Crown, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Loader2, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SelectBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SelectBatchModal: React.FC<SelectBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { 
    profile, 
    updateProfile, 
    searchBatchTimetable, 
    joinBatchTimetable, 
    showToast, 
    user, 
    setShowOnboarding 
  } = useApp();
  const router = useRouter();
  const isSignedIn = !!user;

  // Form State
  const [college, setCollege] = useState(profile.college || '');
  const [programme, setProgramme] = useState(profile.programme || 'B.Tech');
  const [branch, setBranch] = useState(profile.branch || '');
  const [semester, setSemester] = useState<number>(profile.semester || 1);
  const [section, setSection] = useState(profile.section || '');

  // Dropdown States
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<CollegeItem[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);
  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Batch Search States
  const [isSearchingBatch, setIsSearchingBatch] = useState(false);
  const [matchedBatch, setMatchedBatch] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Pilot Modal State
  const [showPilotModal, setShowPilotModal] = useState(false);

  // College autocomplete debounced search
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

  // Live Batch Search when all required fields are provided
  useEffect(() => {
    if (!isOpen) return;

    const trimmedCollege = college.trim();
    const trimmedBranch = branch.trim();
    const trimmedProgramme = programme.trim();

    if (!trimmedCollege || !trimmedBranch || !trimmedProgramme || !semester) {
      setMatchedBatch(null);
      setHasSearched(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingBatch(true);
      try {
        const found = await searchBatchTimetable(
          trimmedCollege,
          trimmedProgramme,
          trimmedBranch,
          Number(semester),
          section.trim()
        );
        if (active) {
          setMatchedBatch(found);
          setHasSearched(true);
        }
      } catch (err) {
        console.error('Error in batch live search:', err);
        if (active) {
          setMatchedBatch(null);
          setHasSearched(true);
        }
      } finally {
        if (active) setIsSearchingBatch(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [college, programme, branch, semester, section, isOpen, searchBatchTimetable]);

  const handleJoinBatch = async () => {
    if (!matchedBatch) return;

    if (!isSignedIn) {
      const pendingKey = matchedBatch.id || matchedBatch.inviteCode;
      try {
        localStorage.setItem('pending_join_invite', pendingKey);
      } catch (_) {}
      showToast('Sign In Required', 'Please sign in to join your class batch.', 'info');
      router.push('/sign-in');
      return;
    }

    setIsJoining(true);
    try {
      const batchKey = matchedBatch.id || matchedBatch.inviteCode;
      const userFullName = (user as any)?.fullName || profile.name || 'Student';
      const userEmail = (user as any)?.primaryEmailAddress?.emailAddress || profile.email || '';

      await joinBatchTimetable(batchKey, undefined, false, {
        name: userFullName,
        email: userEmail,
        rollNumber: profile.rollNumber || '',
      });

      // Update academic profile
      updateProfile({
        college: college.trim(),
        programme: getCanonicalProgramme(programme.trim()),
        branch: branch.trim(),
        semester: Number(semester),
        section: section.trim(),
        onboardingCompleted: true,
      });

      setShowOnboarding(false);
      showToast('Joined Batch! 🎉', `Connected to ${matchedBatch.branch || 'your batch'} timetable.`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error joining batch:', err);
      showToast('Join Failed', err?.message || 'Could not connect to batch.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleContinuePersonal = () => {
    updateProfile({
      college: college.trim(),
      programme: getCanonicalProgramme(programme.trim()),
      branch: branch.trim(),
      semester: Number(semester),
      section: section.trim(),
      onboardingCompleted: true,
      isBatchSynced: false,
    });
    setShowOnboarding(false);
    showToast('Personal Timetable Ready', 'You can customize classes and invite classmates anytime.', 'success');
    if (onSuccess) onSuccess();
    onClose();
  };

  const isFormComplete = college.trim() && programme.trim() && branch.trim() && semester;

  return (
    <>
      <Modal
        isOpen={isOpen && !showPilotModal}
        onClose={onClose}
        title="Find Your Class & Batch"
        description="Select your college, degree, and semester to connect with your classmates and sync your academic routine."
        maxWidth="4xl"
        mobileFullSheet={true}
      >
        <div className="flex flex-col gap-6 text-left pt-1">
          
          {/* Top Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* College Input (Span 7) */}
            <div className="md:col-span-7 flex flex-col gap-1.5 relative">
              <label className="text-[11.5px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#F4F4F6] flex items-center justify-between">
                <span>College / University *</span>
                {isLoadingColleges && (
                  <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                  </span>
                )}
              </label>

              <div className="relative">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-black dark:focus-within:border-white/40 transition-colors">
                  <School className="w-4 h-4 text-[#888888] dark:text-[#64748B] shrink-0" />
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => {
                      setCollege(e.target.value);
                      setShowCollegeDropdown(true);
                    }}
                    onFocus={() => setShowCollegeDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 250)}
                    placeholder="Search your college, institute or university..."
                    className="w-full bg-transparent text-[13.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showCollegeDropdown && suggestedColleges.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 max-h-56 overflow-y-auto bg-white dark:bg-[#121317] border border-[#D8D8D8] dark:border-white/[0.1] shadow-2xl z-50">
                    {suggestedColleges.map((col, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => {
                          setCollege(col.name);
                          setShowCollegeDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-[#F7F7F5] dark:hover:bg-white/[0.06] cursor-pointer text-left border-b border-[#EBEBE8] dark:border-white/[0.06] last:border-0"
                      >
                        <p className="text-[13px] font-semibold text-[#111111] dark:text-[#F4F4F6]">
                          {col.name}
                        </p>
                        <p className="text-[11px] text-[#6F6F6F] dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                          <span>{col.state || 'India'}</span>
                          {col.shortName && col.shortName !== col.name && (
                            <span className="bg-black/5 dark:bg-white/10 px-1.5 py-0.2 rounded text-[10px] uppercase font-mono">
                              {col.shortName}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Degree / Programme Input (Span 5) */}
            <div className="md:col-span-5 flex flex-col gap-1.5 relative">
              <label className="text-[11.5px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#F4F4F6]">
                Degree / Programme *
              </label>
              <div className="relative">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-black dark:focus-within:border-white/40 transition-colors">
                  <GraduationCap className="w-4 h-4 text-[#888888] dark:text-[#64748B] shrink-0" />
                  <input
                    type="text"
                    value={programme}
                    onChange={(e) => {
                      setProgramme(e.target.value);
                      setShowProgrammeDropdown(true);
                    }}
                    onFocus={() => setShowProgrammeDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProgrammeDropdown(false), 200)}
                    placeholder="e.g. B.Tech, BCA, MCA"
                    className="w-full bg-transparent text-[13.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                  />
                </div>

                {showProgrammeDropdown && (
                  <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#121317] border border-[#D8D8D8] dark:border-white/[0.1] shadow-2xl z-50">
                    {filterProgrammes(programme).map((p) => (
                      <div
                        key={p}
                        onMouseDown={() => {
                          setProgramme(p);
                          setShowProgrammeDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-[#F7F7F5] dark:hover:bg-white/[0.06] cursor-pointer text-[13px] font-medium text-[#111111] dark:text-[#F4F4F6] border-b border-[#EBEBE8] dark:border-white/[0.06] last:border-0"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Branch / Major Input (Span 6) */}
            <div className="md:col-span-6 flex flex-col gap-1.5 relative">
              <label className="text-[11.5px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#F4F4F6]">
                Branch / Major *
              </label>
              <div className="relative">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] focus-within:border-black dark:focus-within:border-white/40 transition-colors">
                  <Building2 className="w-4 h-4 text-[#888888] dark:text-[#64748B] shrink-0" />
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
                    className="w-full bg-transparent text-[13.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#64748B]"
                  />
                </div>

                {showBranchDropdown && (
                  <div className="absolute top-full left-0 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#121317] border border-[#D8D8D8] dark:border-white/[0.1] shadow-2xl z-50">
                    {filterBranches(branch).slice(0, 10).map((b) => (
                      <div
                        key={b}
                        onMouseDown={() => {
                          setBranch(b);
                          setShowBranchDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-[#F7F7F5] dark:hover:bg-white/[0.06] cursor-pointer text-[13px] font-medium text-[#111111] dark:text-[#F4F4F6] border-b border-[#EBEBE8] dark:border-white/[0.06] last:border-0"
                      >
                        {b}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Semester (Span 3) */}
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#F4F4F6]">
                Semester *
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] h-[43px]">
                <CalendarDays className="w-4 h-4 text-[#888888] dark:text-[#64748B] shrink-0" />
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] dark:text-[#F4F4F6] focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                    <option key={sem} value={sem} className="dark:bg-[#121317] dark:text-white">
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section / Group (Span 3) */}
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold tracking-wider uppercase text-[#111111] dark:text-[#F4F4F6]">
                Section (Optional)
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#090A0C] border border-[#D8D8D8] dark:border-white/[0.1] h-[43px]">
                <input
                  type="text"
                  maxLength={6}
                  value={section}
                  onChange={(e) => setSection(e.target.value.toUpperCase())}
                  placeholder="e.g. A, B"
                  className="w-full bg-transparent text-[13.5px] font-mono font-bold text-[#111111] dark:text-[#F4F4F6] focus:outline-none placeholder:text-[#A0A0A0] uppercase"
                />
              </div>
            </div>
          </div>

          {/* Bottom Live Result Section */}
          <div className="border-t border-[#E5E5E5] dark:border-white/[0.08] pt-5">
            {isSearchingBatch ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-7 h-7 animate-spin text-black dark:text-white mb-3" />
                <p className="text-[14px] font-semibold text-[#111111] dark:text-[#F4F4F6]">
                  Searching for your batch timetable...
                </p>
                <p className="text-[12px] text-[#6F6F6F] dark:text-[#94A3B8] mt-0.5">
                  Checking Firestore records for active class schedules
                </p>
              </div>
            ) : matchedBatch ? (
              /* CASE 1: BATCH FOUND (SUPER PREMIUM SHOWCASE) */
              <div className="relative overflow-hidden border border-black/15 dark:border-white/[0.12] bg-[#FFFFFF] dark:bg-[#121317] p-5 sm:p-7 shadow-sm">
                {/* Live Status & Verified Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-mono font-bold tracking-widest uppercase">
                      ACTIVE BATCH FOUND
                    </span>
                  </div>

                  <span className="text-[11.5px] font-mono text-[#6F6F6F] dark:text-[#94A3B8] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Verified Schedule</span>
                  </span>
                </div>

                {/* Batch Title */}
                <h3 className="text-[20px] sm:text-[22px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight">
                  {matchedBatch.branch || branch}
                </h3>
                <p className="text-[13.5px] text-[#6F6F6F] dark:text-[#94A3B8] mt-1 font-medium">
                  {matchedBatch.college || college} • {matchedBatch.programme || programme} • Semester {matchedBatch.semester || semester} {matchedBatch.section ? `• Section ${matchedBatch.section}` : section ? `• Section ${section}` : ''}
                </p>

                {/* PREMIUM ACTIVE STUDENTS SHOWCASE */}
                <div className="my-5 p-4 sm:p-5 bg-[#F9F9F8] dark:bg-white/[0.03] border border-[#EAEAEA] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {/* Overlapping Avatar Stack */}
                    <div className="flex -space-x-2.5 overflow-hidden">
                      {['#111111', '#2563EB', '#7C3AED', '#059669'].map((bg, i) => (
                        <div
                          key={i}
                          style={{ backgroundColor: bg }}
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#121317] flex items-center justify-center text-white text-[11px] font-bold shadow-xs"
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#121317] bg-[#E5E5E5] dark:bg-white/[0.1] flex items-center justify-center text-[#111111] dark:text-white text-[10px] font-bold font-mono">
                        +{Math.max(1, (matchedBatch.studentCount || 1) - 4)}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[19px] sm:text-[21px] font-bold font-mono text-[#111111] dark:text-[#FFFFFF] leading-none">
                          {matchedBatch.studentCount || 1}
                        </span>
                        <span className="text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF]">
                          classmates connected
                        </span>
                      </div>
                      <span className="text-[11.5px] text-[#6F6F6F] dark:text-[#94A3B8] mt-0.5">
                        Live sync for timetable changes & class cancellations
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Subjects Count Badge */}
                  <div className="flex items-center gap-2 sm:self-center text-[12px] font-mono font-medium text-[#6F6F6F] dark:text-[#94A3B8] bg-white dark:bg-black/30 px-3 py-1.5 border border-[#E5E5E5] dark:border-white/[0.08] shadow-2xs">
                    <BookOpen className="w-3.5 h-3.5 text-[#111111] dark:text-white" />
                    <span>{matchedBatch.subjects?.length || 0} Subjects Live</span>
                  </div>
                </div>

                {/* Join CTA Button */}
                <button
                  type="button"
                  onClick={handleJoinBatch}
                  disabled={isJoining}
                  className="w-full h-12 bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold text-[13.5px] uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Syncing Batch Timetable...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Batch & Sync Schedule</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : hasSearched && isFormComplete ? (
              /* CASE 2: BATCH NOT FOUND -> APPLY FOR BATCH PILOT */
              <div className="border border-dashed border-[#D8D8D8] dark:border-white/[0.12] bg-[#FAFAF8]/70 dark:bg-[#121317] p-6 sm:p-8 text-center flex flex-col items-center justify-center">
                <div className="w-13 h-13 border border-[#E5E5E5] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] flex items-center justify-center mb-3 shadow-xs">
                  <Crown className="w-6 h-6 text-amber-500" />
                </div>
                
                <span className="text-[10px] font-mono font-bold tracking-[1.5px] uppercase text-amber-600 dark:text-amber-400 mb-1">
                  NO BATCH FOUND YET
                </span>
                
                <h4 className="text-[17px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                  Be the Batch Pilot for your class
                </h4>
                
                <p className="text-[13px] text-[#6F6F6F] dark:text-[#94A3B8] max-w-md mb-5 leading-relaxed">
                  Nobody has created the official timetable for <strong>{getShortCollegeName(college)} • {branch} (Sem {semester})</strong> yet. Apply as Batch Pilot to setup the timetable and bring your entire class in sync!
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPilotModal(true)}
                    className="h-11 px-6 bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Apply for Batch Pilot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleContinuePersonal}
                    className="h-11 px-5 border border-[#D8D8D8] dark:border-white/[0.12] text-[#111111] dark:text-[#FFFFFF] text-[12.5px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Continue Personal
                  </button>
                </div>
              </div>
            ) : (
              /* CASE 3: INCOMPLETE SELECTION PROMPT */
              <div className="py-8 px-4 text-center text-[#888888] dark:text-[#64748B] flex flex-col items-center">
                <Search className="w-5 h-5 mb-2 opacity-50" />
                <p className="text-[13px] font-medium">
                  Select your college, degree, and branch above to check for your active class batch.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Embedded Pilot Application Modal */}
      <CRApplicationModal
        isOpen={showPilotModal}
        onClose={() => setShowPilotModal(false)}
        targetCollege={college}
        targetProgramme={programme}
        targetBranch={branch}
        targetSemester={Number(semester)}
        targetSection={section}
      />
    </>
  );
};
