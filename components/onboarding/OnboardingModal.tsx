'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Calendar, 
  Bell, 
  Users, 
  ArrowLeft, 
  Search, 
  Link2, 
  ChevronRight, 
  ChevronDown, 
  School, 
  X, 
  Check, 
  Sparkles,
  Building2,
  GraduationCap,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { INDIAN_COLLEGES, STANDARD_PROGRAMMES, STANDARD_BRANCHES } from '@/lib/colleges';
import { getCanonicalBatchKey } from '@/lib/timetableUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const OnboardingModal = () => {
  const { profile, updateProfile, joinBatchTimetable, shareTimetableWithBatch, searchBatchTimetable, showToast, user, isClerkLoaded } = useApp();
  const isSignedIn = !!user;
  const isUserLoaded = isClerkLoaded;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Fast Invite Code State
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);

  // 2-Step Batch Find State
  const [subStep, setSubStep] = useState<'find' | 'confirm'>('find');
  const [isSearching, setIsSearching] = useState(false);
  const [foundBatchData, setFoundBatchData] = useState<any>(null);
  const [enteredInviteCode, setEnteredInviteCode] = useState('');

  // Form Fields (Profile / SettingsView Style)
  const initialCollege = (profile?.college && profile.college !== 'Demo University') ? profile.college : '';
  const [college, setCollege] = useState(initialCollege);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [suggestedColleges, setSuggestedColleges] = useState<string[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);

  // Debounced SheerID live organization lookup
  useEffect(() => {
    if (college.trim().length < 3) {
      setSuggestedColleges([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingColleges(true);
      try {
        const response = await fetch(
          `https://orgsearch.sheerid.net/rest/organization/search?country=IN&type=UNIVERSITY&name=${encodeURIComponent(college)}`
        );
        if (response.ok) {
          const data = await response.json();
          const names = data.map((item: any) => item.name);
          setSuggestedColleges(names);
        }
      } catch (err) {
        console.error('Failed to fetch colleges from SheerID:', err);
      } finally {
        setIsLoadingColleges(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [college]);

  const [programme, setProgramme] = useState(profile?.programme || 'B.Tech');
  const [programmeQuery, setProgrammeQuery] = useState('');
  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [customProgramme, setCustomProgramme] = useState('');

  const [branch, setBranch] = useState(profile?.branch || 'Computer Science & Engineering (CSE)');
  const [branchQuery, setBranchQuery] = useState('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [customBranch, setCustomBranch] = useState('');

  const [semester, setSemester] = useState<number>(profile?.semester || 1);
  const [section, setSection] = useState(profile?.section || 'A');
  const [isConnecting, setIsConnecting] = useState(false);

    // Auto-connect pending batch after signing in
  useEffect(() => {
    if (isSignedIn && isUserLoaded) {
      const pendingKey = localStorage.getItem('pending_batch_key');
      const pendingInvite = localStorage.getItem('pending_join_invite');

      if (pendingInvite) {
        localStorage.removeItem('pending_join_invite');
        joinBatchTimetable(pendingInvite)
          .then(() => updateProfile({ onboardingCompleted: true }))
          .catch((e) => console.warn('Auto invite join failed:', e));
      } else if (pendingKey) {
        localStorage.removeItem('pending_batch_key');
        joinBatchTimetable(pendingKey)
          .then(() => updateProfile({ onboardingCompleted: true }))
          .catch(() => shareTimetableWithBatch().then(() => updateProfile({ onboardingCompleted: true })));
      }
    }
  }, [isSignedIn, isUserLoaded]);

  const isComplete = profile?.onboardingCompleted;

  if (isComplete) return null;

  const handleNext = () => {
    if (currentIndex < 3) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex === 3 && subStep === 'confirm') {
      setSubStep('find');
      return;
    }
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    updateProfile({ onboardingCompleted: true });
  };

  // 1. Direct Invite Code Join with Auth Guard
  const handleCodeJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteCode.trim();
    if (!code) {
      showToast('Invite Code Required', 'Please paste an invite code or link.', 'error');
      return;
    }

    if (code.includes('invite=')) {
      code = new URLSearchParams(code.split('?')[1] || '').get('invite') || code;
    } else if (code.includes('/')) {
      code = code.split('/').pop() || code;
    }

    // Require Auth to Join Cloud Batch
    if (!isSignedIn) {
      showToast('Account Required', 'Please sign in or create an account to join this batch.', 'info');
      try {
        localStorage.setItem('pending_join_invite', code);
      } catch (_) {}
      if (typeof window !== 'undefined') {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
      }
      return;
    }

    setIsJoiningCode(true);
    try {
      await joinBatchTimetable(code);
      updateProfile({ onboardingCompleted: true });
      showToast('Batch Joined!', 'Welcome to your synced class timetable.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Join Failed', 'Could not find a batch with that code.', 'error');
    } finally {
      setIsJoiningCode(false);
    }
  };

  // 2. Step 1 -> Find My Batch Action (Smart Firestore lookup via searchBatchTimetable)
  const handleFindBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college.trim()) {
      showToast('College Required', 'Please choose or type your college name.', 'error');
      return;
    }

    setIsSearching(true);
    const finalProg = programme === 'Other / Diploma' ? (customProgramme.trim() || 'Diploma') : programme;
    const finalBranch = branch === 'Other / General' ? (customBranch.trim() || 'General') : branch;
    const cleanCollege = college.trim();
    const canonicalKey = getCanonicalBatchKey(cleanCollege, finalProg, finalBranch, semester);

    try {
      const matched = await searchBatchTimetable(cleanCollege, finalProg, finalBranch, semester);

      if (matched) {
        setFoundBatchData({
          exists: true,
          canonicalKey: matched.id || canonicalKey,
          studentCount: matched.studentCount || (matched.crEmails?.length || 1),
          creatorName: matched.creatorName || 'Classmate',
          subjectsCount: matched.subjects?.length || 0,
          rawBatch: matched,
        });
      } else {
        setFoundBatchData({
          exists: false,
          canonicalKey,
          studentCount: 0,
        });
      }
      setSubStep('confirm');
    } catch (err) {
      console.warn('Batch lookup err:', err);
      setFoundBatchData({ exists: false, canonicalKey, studentCount: 0 });
      setSubStep('confirm');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Step 2 -> Connect To Batch Action with Auth Guard
  const handleConnectToBatch = async () => {
    const finalProg = programme === 'Other / Diploma' ? (customProgramme.trim() || 'Diploma') : programme;
    const finalBranch = branch === 'Other / General' ? (customBranch.trim() || 'General') : branch;
    const cleanCollege = college.trim() || 'General College';
    const canonicalKey = foundBatchData?.canonicalKey || getCanonicalBatchKey(cleanCollege, finalProg, finalBranch, semester);

    // Save selected academic details locally first
    updateProfile({
      college: cleanCollege,
      programme: finalProg,
      branch: finalBranch,
      semester: semester,
      section: 'A',
    });

    // Check if user is signed in before syncing with cloud batch
    if (!isSignedIn) {
      showToast('Sign In Required', 'Please sign in or create an account to link with your batch.', 'info');
      try {
        localStorage.setItem('pending_batch_key', canonicalKey);
      } catch (_) {}
      if (typeof window !== 'undefined') {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
      }
      return;
    }

    setIsConnecting(true);
    try {
      updateProfile({
        college: cleanCollege,
        programme: finalProg,
        branch: finalBranch,
        semester: semester,
        section: 'A',
        onboardingCompleted: true,
      });

      if (foundBatchData?.exists) {
        await joinBatchTimetable(canonicalKey);
        showToast('Batch Connected!', `Synced with ${finalProg} ${finalBranch} Sem ${semester}.`, 'success');
      } else {
        await shareTimetableWithBatch();
        showToast('Batch Space Created', `You're the first in your batch! Invite your classmates to sync.`, 'success');
      }
    } catch (err) {
      console.error(err);
      updateProfile({ onboardingCompleted: true });
    } finally {
      setIsConnecting(false);
    }
  };

  const filteredColleges = INDIAN_COLLEGES.filter((c) =>
    c.toLowerCase().includes(college.toLowerCase())
  ).slice(0, 15);

  const filteredProgrammes = STANDARD_PROGRAMMES.filter((p) =>
    p.toLowerCase().includes(programmeQuery.toLowerCase())
  );

  const filteredBranches = STANDARD_BRANCHES.filter((b) =>
    b.toLowerCase().includes(branchQuery.toLowerCase())
  );

  const slides = [
    {
      id: 0,
      image: '/onboard-1.png',
      topNav: 'center',
      topText: 'PLAN TODAY.\nOWN TOMORROW.',
      title: "We'll remind you.",
      subtitle: "Stay ahead with smart reminders\nso you never miss what matters.",
      buttonText: 'Next',
      features: null
    },
    {
      id: 1,
      image: '/onboard-2.png',
      topNav: 'left-skip',
      title: "Know what's next.",
      subtitle: "Import your timetable and let\nIntersemester build your week.",
      buttonText: 'Next',
      features: [
        { icon: Calendar, title: "Smart timetable", desc: "All your classes in one place." },
        { icon: Bell, title: "Timely reminders", desc: "Never miss a class or deadline." },
        { icon: Users, title: "Stay in sync", desc: "Connect with your batch." }
      ]
    },
    {
      id: 2,
      image: '/onboard-3.png',
      topNav: 'left-skip',
      title: "Your batch,\ntogether.",
      subtitle: "Share schedules, stay in sync\nand work better with your classmates.",
      buttonText: 'Connect batch',
      features: [
        { icon: Users, title: "Work as a team", desc: "Invite your batch and stay connected." }
      ]
    }
  ];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 25 : -25,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'tween', duration: 0.35, ease: [0.25, 1, 0.5, 1] },
        opacity: { duration: 0.25, ease: 'linear' },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 25 : -25,
      opacity: 0,
      transition: {
        x: { type: 'tween', duration: 0.35, ease: [0.25, 1, 0.5, 1] },
        opacity: { duration: 0.25, ease: 'linear' },
      },
    }),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans overflow-hidden w-full h-[100dvh]">
      
      {/* Top Nav Header */}
      <div className="w-full flex items-center justify-between px-6 pt-5 pb-3 shrink-0 z-20 border-b border-[#F0F0EE]">
        {currentIndex === 0 ? (
          <div className="w-full flex flex-col items-center justify-center pt-2">
            <h1 className="text-[26px] font-bold tracking-tighter text-[#111]">inter<span className="font-normal opacity-80">semester</span></h1>
            <div className="w-[24px] h-[1.5px] bg-[#111] mt-3 mb-2" />
            <p className="text-[10px] tracking-[3px] font-medium text-[#111111]/60 uppercase whitespace-pre-line text-center">
              {slides[0].topText}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-1.5 -ml-2 hover:bg-[#111111]/5 rounded-full transition-colors cursor-pointer">
                <ArrowLeft className="w-5 h-5 text-[#111111]" />
              </button>
              <h1 className="text-[20px] font-bold tracking-tighter text-[#111]">inter<span className="font-normal opacity-80">semester</span></h1>
            </div>
            <button onClick={handleSkip} className="px-3 py-1 -mr-2 text-[13px] font-semibold text-[#888888] hover:text-[#111111] transition-colors cursor-pointer">
              Skip
            </button>
          </>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full flex flex-col relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          {currentIndex < 3 ? (
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex flex-col"
            >
              {/* Slide Image */}
              <div className="flex-1 min-h-0 w-full flex items-end justify-center overflow-visible">
                <img 
                  src={slides[currentIndex].image} 
                  alt="Onboarding" 
                  className={`w-full h-full object-contain object-bottom pointer-events-none translate-y-[6%] ${
                    currentIndex === 0 ? 'scale-[1.2]' :
                    currentIndex === 1 ? 'scale-[1.45]' :
                    'scale-[1.15]'
                  }`}
                />
              </div>

              {/* Text Card */}
              <div className="w-full px-8 flex flex-col gap-2.5 pb-6 bg-[#F4F4F4] shrink-0 z-10 relative rounded-t-[40px] pt-7 -mt-6">
                <h2 className="text-[28px] leading-[1.1] font-bold text-[#111111] whitespace-pre-line">
                  {slides[currentIndex].title}
                </h2>
                <p className="text-[14px] text-[#111111]/60 font-medium leading-snug whitespace-pre-line mb-3">
                  {slides[currentIndex].subtitle}
                </p>

                {slides[currentIndex].features && (
                  <div className="flex flex-col">
                    {slides[currentIndex].features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 py-3 border-b border-black/5 last:border-0">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <feat.icon className="w-4 h-4 text-[#111111]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[#111111]">{feat.title}</span>
                          <span className="text-[12px] text-[#111111]/60">{feat.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="w-full px-8 pb-8 pt-1 flex items-center justify-between shrink-0 bg-[#F4F4F4] z-10 relative">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <button
                      key={i}
                      onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                      className={`h-[5px] rounded-full transition-all duration-300 ${i === currentIndex ? 'w-[18px] bg-[#111111]' : 'w-[5px] bg-[#111111]/20'}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="h-[46px] px-6 bg-[#111111] text-white rounded-2xl flex items-center gap-2 font-semibold text-[14px] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  {slides[currentIndex].buttonText}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* STEP 4: 2-STEP BATCH EXPERIENCE (LESS MODAL, CLEAN PROFILE-STYLE SEARCH) */
            <motion.div
              key="step-4-batch-native-v2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex flex-col overflow-y-auto px-6 py-5 bg-[#FFFFFF]"
            >
              <AnimatePresence mode="wait">
                {subStep === 'find' ? (
                  /* SUBSTEP 1: FIND YOUR BATCH */
                  <motion.div
                    key="substep-find"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col flex-1"
                  >
                    {/* Header */}
                    <div className="flex flex-col mb-5">
                      <h2 className="text-[34px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px]">
                        Connect,<br />
                        Batch,<br />
                        Timetable
                      </h2>
                      <p className="text-[13.5px] font-normal text-[#6B6B6B] leading-[19px] mt-2.5">
                        Join your classmates and sync your academic schedule.
                      </p>
                    </div>

                    {/* 1. Fast Invite Card */}
                    <div className="border border-[#EBEBEA] bg-[#FAFAF8] rounded-none border border-[#D8D8D8] p-4 mb-5">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#111111]" />
                        <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111]">
                          HAVE AN INVITE?
                        </span>
                      </div>
                      <form onSubmit={handleCodeJoin} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste code or link..."
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          className="flex-1 h-11 px-3.5 bg-white border border-[#D8D8D8] rounded-none text-[13.5px] text-[#111111] focus:outline-none focus:border-[#111111] transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isJoiningCode || !inviteCode.trim()}
                          className="h-11 px-5 bg-[#111111] text-white text-[13.5px] font-bold uppercase tracking-wider rounded-none hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                        >
                          {isJoiningCode ? 'Joining...' : 'Join'}
                        </button>
                      </form>
                    </div>

                    {/* 2. Light Divider */}
                    <div className="flex items-center gap-3 my-1 mb-5">
                      <div className="flex-1 h-[1px] bg-[#EEEEEC]" />
                      <span className="text-[10.5px] font-medium tracking-[1.5px] text-[#A0A0A0] uppercase">
                        OR SEARCH YOUR BATCH
                      </span>
                      <div className="flex-1 h-[1px] bg-[#EEEEEC]" />
                    </div>

                    {/* 3. Direct Search Form (Comprehensive Programmes & Branches) */}
                    <form onSubmit={handleFindBatch} className="flex flex-col gap-4 flex-1">
                      {/* College Input with Profile-Style Live Dropdown */}
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          College / University
                        </label>
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] border border-[#D8D8D8] rounded-none focus-within:border-[#111111] transition-colors">
                          <Building2 className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                          <input
                            type="text"
                            value={college}
                            onChange={(e) => {
                              setCollege(e.target.value);
                              setShowCollegeDropdown(true);
                            }}
                            onFocus={() => setShowCollegeDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 250)}
                            placeholder="e.g. AIIMS, NLSIU, IIT Delhi, NIT..."
                            required
                            className="w-full bg-transparent text-[13.5px] font-medium text-[#111111] focus:outline-none placeholder:text-[#A0A0A0]"
                          />
                        </div>

                        {/* Live SheerID Dropdown Matching Profile / Settings */}
                        {showCollegeDropdown && college.length >= 2 && (
                          <div className="absolute top-full left-0 w-full mt-1.5 max-h-56 overflow-y-auto bg-white border border-[#D9D9D6] rounded-none shadow-xl z-50 divide-y divide-black/5">
                            {isLoadingColleges && (
                              <div className="px-4 py-2.5 text-xs font-mono font-medium text-[#6F6F6F] flex items-center gap-2">
                                <span className="w-3 h-3 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                                Searching verified universities via SheerID...
                              </div>
                            )}
                            {suggestedColleges.length > 0 ? (
                              suggestedColleges.map((c) => (
                                <div
                                  key={c}
                                  onMouseDown={() => {
                                    setCollege(c);
                                    setShowCollegeDropdown(false);
                                  }}
                                  className="px-4 py-2.5 hover:bg-[#F7F7F5] cursor-pointer text-[13px] font-medium text-[#111111] transition-colors"
                                >
                                  {c}
                                </div>
                              ))
                            ) : (
                              !isLoadingColleges && (
                                filteredColleges.length > 0 ? (
                                  filteredColleges.map((c) => (
                                    <div
                                      key={c}
                                      onMouseDown={() => {
                                        setCollege(c);
                                        setShowCollegeDropdown(false);
                                      }}
                                      className="px-4 py-2.5 hover:bg-[#F7F7F5] cursor-pointer text-[13px] font-medium text-[#111111] transition-colors"
                                    >
                                      {c}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2.5 text-xs text-[#6F6F6F]">
                                    Press Enter to use custom university: <strong>"{college}"</strong>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-[#A0A0A0] font-medium">
                          Type 2+ letters to search verified universities, or type manually if not found.
                        </p>
                      </div>

                      {/* Searchable Programme Dropdown */}
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Programme / Degree
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowProgrammeDropdown(!showProgrammeDropdown);
                            setProgrammeQuery('');
                            setShowBranchDropdown(false);
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full h-11 px-3.5 bg-white border border-[#D8D8D8] rounded-none text-[13px] font-medium text-[#111111] flex items-center justify-between hover:border-[#111111] transition-all cursor-pointer text-left"
                        >
                          <span className="truncate pr-2">{programme}</span>
                          <ChevronDown className={`w-4 h-4 text-[#888888] shrink-0 transition-transform ${showProgrammeDropdown ? 'rotate-180 text-[#111111]' : ''}`} />
                        </button>

                        {showProgrammeDropdown && (
                          <div className="absolute top-[100%] left-0 right-0 z-50 mt-1.5 max-h-64 flex flex-col bg-white border border-[#D9D9D6] rounded-none shadow-xl overflow-hidden">
                            {/* Search Box */}
                            <div className="p-2 border-b border-[#F0F0EE] bg-[#FAFAF8] shrink-0">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-2.5 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Search degree (e.g. B.Tech, MBBS, Law)..."
                                  value={programmeQuery}
                                  onChange={(e) => setProgrammeQuery(e.target.value)}
                                  autoFocus
                                  className="w-full h-8 pl-8 pr-3 bg-white border border-[#D8D8D8] rounded-none text-[12px] text-[#111111] focus:outline-none focus:border-[#111111]"
                                />
                              </div>
                            </div>

                            {/* List Options */}
                            <div className="overflow-y-auto max-h-48 divide-y divide-black/5">
                              {programmeQuery.trim() && !filteredProgrammes.some(p => p.toLowerCase() === programmeQuery.toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProgramme(programmeQuery.trim());
                                    setShowProgrammeDropdown(false);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-[#111111] hover:bg-[#F4F4F4] cursor-pointer"
                                >
                                  Use custom degree: <strong className="text-indigo-600 font-bold">"{programmeQuery.trim()}"</strong>
                                </button>
                              )}

                              {filteredProgrammes.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    setProgramme(p);
                                    setShowProgrammeDropdown(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center justify-between hover:bg-[#F4F4F4] cursor-pointer transition-colors ${
                                    programme === p ? 'font-bold text-[#111111] bg-[#F7F7F5]' : 'text-[#444444]'
                                  }`}
                                >
                                  <span>{p}</span>
                                  {programme === p && <Check className="w-3.5 h-3.5 text-[#111111]" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Searchable Branch Dropdown */}
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Branch / Specialisation
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBranchDropdown(!showBranchDropdown);
                            setBranchQuery('');
                            setShowProgrammeDropdown(false);
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full h-11 px-3.5 bg-white border border-[#D8D8D8] rounded-none text-[13px] font-medium text-[#111111] flex items-center justify-between hover:border-[#111111] transition-all cursor-pointer text-left"
                        >
                          <span className="truncate pr-2">{branch}</span>
                          <ChevronDown className={`w-4 h-4 text-[#888888] shrink-0 transition-transform ${showBranchDropdown ? 'rotate-180 text-[#111111]' : ''}`} />
                        </button>

                        {showBranchDropdown && (
                          <div className="absolute top-[100%] left-0 right-0 z-50 mt-1.5 max-h-64 flex flex-col bg-white border border-[#D9D9D6] rounded-none shadow-xl overflow-hidden">
                            {/* Search Box */}
                            <div className="p-2 border-b border-[#F0F0EE] bg-[#FAFAF8] shrink-0">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-2.5 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Search branch (e.g. CSE, AI, Law, MBBS)..."
                                  value={branchQuery}
                                  onChange={(e) => setBranchQuery(e.target.value)}
                                  autoFocus
                                  className="w-full h-8 pl-8 pr-3 bg-white border border-[#D8D8D8] rounded-none text-[12px] text-[#111111] focus:outline-none focus:border-[#111111]"
                                />
                              </div>
                            </div>

                            {/* List Options */}
                            <div className="overflow-y-auto max-h-48 divide-y divide-black/5">
                              {branchQuery.trim() && !filteredBranches.some(b => b.toLowerCase() === branchQuery.toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBranch(branchQuery.trim());
                                    setShowBranchDropdown(false);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-[#111111] hover:bg-[#F4F4F4] cursor-pointer"
                                >
                                  Use custom branch: <strong className="text-indigo-600 font-bold">"{branchQuery.trim()}"</strong>
                                </button>
                              )}

                              {filteredBranches.map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => {
                                    setBranch(b);
                                    setShowBranchDropdown(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center justify-between hover:bg-[#F4F4F4] cursor-pointer transition-colors ${
                                    branch === b ? 'font-bold text-[#111111] bg-[#F7F7F5]' : 'text-[#444444]'
                                  }`}
                                >
                                  <span className="truncate pr-2">{b}</span>
                                  {branch === b && <Check className="w-3.5 h-3.5 text-[#111111] shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Semester Square Button Picker (Exact Theme) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Semester
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSemester(s)}
                              className={`py-2.5 text-[12.5px] font-bold rounded-none border transition-all cursor-pointer ${
                                semester === s
                                  ? 'bg-[#111111] text-white border-[#111111]'
                                  : 'border-[#D8D8D8] bg-white text-[#111111] hover:bg-[#F7F7F5]'
                              }`}
                            >
                              Sem {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic CTA */}
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="mt-4 w-full h-12 bg-[#111111] text-white rounded-none font-bold text-[13.5px] uppercase tracking-[1.5px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSearching ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Finding batch...
                          </span>
                        ) : (
                          <>
                            Find my batch
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  /* SUBSTEP 2: CONFIRM & CONNECT (REAL FIRESTORE DATA MATCH) */
                  <motion.div
                    key="substep-confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col flex-1 justify-between"
                  >
                    <div className="flex flex-col">
                      {/* Dynamic Header Badge */}
                      <div className="flex items-center justify-between mb-4">
                        {foundBatchData?.exists ? (
                          <span className="text-[11px] font-bold uppercase tracking-[2px] text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Existing Batch Matched
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#6F6F6F] bg-[#F4F4F4] px-2.5 py-1 border border-[#D8D8D8] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#111111]" /> New Batch Space
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSubStep('find')}
                          className="text-[12px] font-bold text-[#6F6F6F] hover:text-[#111111] underline cursor-pointer"
                        >
                          Change details
                        </button>
                      </div>

                      {/* Real Batch Identity Card */}
                      <div className="border border-[#D8D8D8] bg-[#FAFAF8] rounded-none p-5 mb-6">
                        <span className="text-[10px] font-bold tracking-[1.5px] text-[#888888] uppercase block mb-1">
                          {foundBatchData?.exists ? 'MATCHED BATCH TIMETABLE' : 'CREATE BATCH SCHEDULE'}
                        </span>
                        <h3 className="text-[17px] font-bold text-[#111111] leading-snug mb-1">
                          {college}
                        </h3>
                        <p className="text-[13.5px] font-medium text-[#444444]">
                          {programme === 'Other / Diploma' ? customProgramme : programme} · {branch === 'Other / General' ? customBranch : branch}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="px-2.5 py-0.5 bg-[#111111] text-white text-[11px] font-bold rounded-none">
                            Semester {semester}
                          </span>
                          {foundBatchData?.exists && foundBatchData?.subjectsCount > 0 && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                              {foundBatchData.subjectsCount} Subjects Preloaded
                            </span>
                          )}
                        </div>

                        {/* Real Status Note */}
                        <div className="mt-4 pt-3.5 border-t border-[#EBEBEA] flex flex-col gap-1.5">
                          {foundBatchData?.exists ? (
                            <div className="flex items-center justify-between text-[12.5px]">
                              <div className="flex items-center gap-2 text-[#111111] font-semibold">
                                <Users className="w-4 h-4 text-[#111111]" />
                                <span>{foundBatchData?.studentCount || 1} classmates already connected</span>
                              </div>
                              <span className="text-[11.5px] text-[#6F6F6F]">
                                By {foundBatchData.creatorName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[12.5px] text-[#6F6F6F]">
                              <Users className="w-4 h-4 text-[#888888]" />
                              <span>No existing timetable found. You will be the first student to start this batch!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Action CTA */}
                    <div className="flex flex-col gap-2 pt-4">
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={handleConnectToBatch}
                        className="w-full h-12 bg-[#111111] text-white rounded-none font-bold text-[13.5px] uppercase tracking-[1.5px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-md"
                      >
                        {isConnecting ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {foundBatchData?.exists ? 'Syncing with batch...' : 'Creating batch space...'}
                          </span>
                        ) : (
                          <>
                            {foundBatchData?.exists ? 'Connect & Sync Timetable' : 'Create Batch Space'}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
