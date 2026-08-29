code = r"""'use client';

import React, { useState } from 'react';
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
  const { profile, updateProfile, joinBatchTimetable, shareTimetableWithBatch, showToast } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Fast Invite Code State
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);

  // 2-Step Batch Find State
  const [subStep, setSubStep] = useState<'find' | 'confirm'>('find');
  const [isSearching, setIsSearching] = useState(false);
  const [foundBatchData, setFoundBatchData] = useState<any>(null);

  // Form Fields (Profile / SettingsView Style)
  const initialCollege = (profile?.college && profile.college !== 'Demo University') ? profile.college : '';
  const [college, setCollege] = useState(initialCollege);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  const [programme, setProgramme] = useState(profile?.programme || 'B.Tech');
  const [showProgrammeDropdown, setShowProgrammeDropdown] = useState(false);
  const [customProgramme, setCustomProgramme] = useState('');

  const [branch, setBranch] = useState(profile?.branch || 'Computer Science & Engineering (CSE)');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [customBranch, setCustomBranch] = useState('');

  const [semester, setSemester] = useState<number>(profile?.semester || 1);
  const [section, setSection] = useState(profile?.section || 'A');
  const [isConnecting, setIsConnecting] = useState(false);

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

  // 1. Direct Invite Code Join
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

  // 2. Step 1 -> Find My Batch Action
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
      const batchDocRef = doc(db, 'shared_timetables', canonicalKey);
      const snap = await getDoc(batchDocRef);

      if (snap.exists()) {
        const data = snap.data();
        setFoundBatchData({
          exists: true,
          canonicalKey,
          studentCount: data.studentCount || (data.crEmails?.length || 1),
          creatorName: data.creatorName || 'Classmate',
          subjectsCount: data.subjects?.length || 0,
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

  // 3. Step 2 -> Connect To Batch Action
  const handleConnectToBatch = async () => {
    setIsConnecting(true);
    const finalProg = programme === 'Other / Diploma' ? (customProgramme.trim() || 'Diploma') : programme;
    const finalBranch = branch === 'Other / General' ? (customBranch.trim() || 'General') : branch;
    const cleanCollege = college.trim() || 'General College';
    const canonicalKey = foundBatchData?.canonicalKey || getCanonicalBatchKey(cleanCollege, finalProg, finalBranch, semester);

    try {
      updateProfile({
        college: cleanCollege,
        programme: finalProg,
        branch: finalBranch,
        semester: semester,
        section: section.trim() || 'A',
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

  const slides = [
    {
      id: 0,
      image: '/onboard-1.png',
      topNav: 'center',
      topText: 'PLAN TODAY.\\nOWN TOMORROW.',
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
                    <div className="border border-[#EBEBEA] bg-[#FAFAF8] rounded-2xl p-4.5 mb-5">
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
                          className="flex-1 h-11 px-3.5 bg-white border border-[#D9D9D6] rounded-xl text-[13.5px] text-[#111111] focus:outline-none focus:border-[#111111] transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isJoiningCode || !inviteCode.trim()}
                          className="h-11 px-5 bg-[#111111] text-white text-[13.5px] font-bold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
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
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFFFFF] border border-[#D9D9D6] rounded-xl focus-within:border-[#111111] transition-colors">
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

                        {/* Live Dropdown Matching Profile Style */}
                        {showCollegeDropdown && college.length >= 2 && (
                          <div className="absolute top-full left-0 w-full mt-1.5 max-h-52 overflow-y-auto bg-white border border-[#D9D9D6] rounded-xl shadow-xl z-50 divide-y divide-black/5">
                            {filteredColleges.length > 0 ? (
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
                                Press Enter to use <strong>"{college}"</strong>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-[#A0A0A0] font-medium">
                          Type 2+ letters to search verified universities, or type manually if not found.
                        </p>
                      </div>

                      {/* Programme Dropdown (Full Standard Programmes: Engineering, Medical, Law, Commerce, Arts) */}
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Programme / Degree
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowProgrammeDropdown(!showProgrammeDropdown);
                            setShowBranchDropdown(false);
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full h-11 px-3.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] font-medium text-[#111111] flex items-center justify-between hover:border-[#111111] transition-all cursor-pointer"
                        >
                          <span>{programme}</span>
                          <ChevronDown className={`w-4 h-4 text-[#888888] transition-transform ${showProgrammeDropdown ? 'rotate-180 text-[#111111]' : ''}`} />
                        </button>

                        {showProgrammeDropdown && (
                          <div className="absolute top-[100%] left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto bg-white border border-[#D9D9D6] rounded-xl shadow-xl">
                            {STANDARD_PROGRAMMES.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setProgramme(p);
                                  setShowProgrammeDropdown(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center justify-between border-b border-black/5 last:border-0 hover:bg-[#F4F4F4] cursor-pointer ${
                                  programme === p ? 'font-bold text-[#111111] bg-[#F7F7F5]' : 'text-[#444444]'
                                }`}
                              >
                                <span>{p}</span>
                                {programme === p && <Check className="w-3.5 h-3.5 text-[#111111]" />}
                              </button>
                            ))}
                          </div>
                        )}

                        {programme === 'Other / Diploma' && (
                          <input
                            type="text"
                            placeholder="Type your degree name..."
                            value={customProgramme}
                            onChange={(e) => setCustomProgramme(e.target.value)}
                            className="mt-1.5 w-full h-11 px-3.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] text-[#111111] focus:outline-none focus:border-[#111111]"
                            required
                          />
                        )}
                      </div>

                      {/* Branch Dropdown (Full Standard Branches: Engineering, Medical, Law, Management) */}
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Branch / Specialisation
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBranchDropdown(!showBranchDropdown);
                            setShowProgrammeDropdown(false);
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full h-11 px-3.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] font-medium text-[#111111] flex items-center justify-between hover:border-[#111111] transition-all cursor-pointer text-left"
                        >
                          <span className="truncate pr-2">{branch}</span>
                          <ChevronDown className={`w-4 h-4 text-[#888888] shrink-0 transition-transform ${showBranchDropdown ? 'rotate-180 text-[#111111]' : ''}`} />
                        </button>

                        {showBranchDropdown && (
                          <div className="absolute top-[100%] left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto bg-white border border-[#D9D9D6] rounded-xl shadow-xl">
                            {STANDARD_BRANCHES.map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => {
                                  setBranch(b);
                                  setShowBranchDropdown(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-[13px] flex items-center justify-between border-b border-black/5 last:border-0 hover:bg-[#F4F4F4] cursor-pointer ${
                                  branch === b ? 'font-bold text-[#111111] bg-[#F7F7F5]' : 'text-[#444444]'
                                }`}
                              >
                                <span className="truncate pr-2">{b}</span>
                                {branch === b && <Check className="w-3.5 h-3.5 text-[#111111] shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}

                        {branch === 'Other / General' && (
                          <input
                            type="text"
                            placeholder="Type your branch / specialisation..."
                            value={customBranch}
                            onChange={(e) => setCustomBranch(e.target.value)}
                            className="mt-1.5 w-full h-11 px-3.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] text-[#111111] focus:outline-none focus:border-[#111111]"
                            required
                          />
                        )}
                      </div>

                      {/* Semester Pill Picker */}
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
                              className={`py-2 text-[12px] font-bold rounded-xl border transition-all cursor-pointer ${
                                semester === s
                                  ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                                  : 'border-[#D9D9D6] bg-white text-[#444444] hover:bg-[#FAFAF8]'
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
                        className="mt-3 w-full h-12 bg-[#111111] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 cursor-pointer"
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
                  /* SUBSTEP 2: CONFIRM & SECTION SELECTION */
                  <motion.div
                    key="substep-confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col flex-1 justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-[2px] text-indigo-600 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Batch Found
                        </span>
                        <button
                          type="button"
                          onClick={() => setSubStep('find')}
                          className="text-[12px] font-semibold text-[#888888] hover:text-[#111111] underline cursor-pointer"
                        >
                          Change details
                        </button>
                      </div>

                      {/* Batch Identity Card */}
                      <div className="border border-[#E5E5E5] bg-[#FAFAF8] rounded-2xl p-5 mb-6 shadow-sm">
                        <span className="text-[10px] font-bold tracking-[1.5px] text-[#888888] uppercase block mb-1">
                          YOUR BATCH
                        </span>
                        <h3 className="text-[18px] font-bold text-[#111111] leading-tight mb-1">
                          {college}
                        </h3>
                        <p className="text-[14px] font-medium text-[#444444]">
                          {programme === 'Other / Diploma' ? customProgramme : programme} · {branch === 'Other / General' ? customBranch : branch}
                        </p>
                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-[#111111] text-white text-[11px] font-bold rounded-md">
                          Semester {semester}
                        </span>

                        {/* Status Note */}
                        <div className="mt-4 pt-3.5 border-t border-[#EBEBEA] flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[12.5px] text-[#6F6F6F]">
                            <Users className="w-4 h-4 text-[#111111]" />
                            <span>
                              {foundBatchData?.exists
                                ? `${foundBatchData?.studentCount || 1} classmates already synced`
                                : 'Be the first in your batch!'}
                            </span>
                          </div>
                          {foundBatchData?.exists && foundBatchData?.subjectsCount > 0 && (
                            <span className="text-[11.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {foundBatchData.subjectsCount} subjects ready
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Section Selector */}
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Choose Section / Group
                        </label>
                        <div className="grid grid-cols-4 gap-2.5">
                          {['A', 'B', 'C', 'General'].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setSection(sec)}
                              className={`py-2.5 text-[13px] font-bold rounded-xl border transition-all cursor-pointer ${
                                section === sec
                                  ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                                  : 'border-[#D9D9D6] bg-white text-[#444444] hover:bg-[#FAFAF8]'
                              }`}
                            >
                              Sec {sec}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Final CTA */}
                    <div className="flex flex-col gap-2 pt-4">
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={handleConnectToBatch}
                        className="w-full h-12 bg-[#111111] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {isConnecting ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Connecting to batch...
                          </span>
                        ) : (
                          <>
                            Connect to batch
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
"""

with open('components/onboarding/OnboardingModal.tsx', 'w') as f:
    f.write(code)
print('Updated OnboardingModal.tsx with all disciplines and full lists!')
