const fs = require('fs');

const onboardingContent = `'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Bell, Users, ArrowLeft, School, GraduationCap, BookOpen, Layers, Hash, Sparkles, Check, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { INDIAN_COLLEGES, STANDARD_PROGRAMMES } from '@/lib/colleges';
import { getCanonicalBatchKey } from '@/lib/timetableUtils';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COMMON_BRANCHES = [
  'Computer Science & Engg (CSE)',
  'Information Technology (IT)',
  'Artificial Intelligence & DS',
  'Electronics & Comm (ECE)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Data Science',
  'Cyber Security',
  'Business Administration',
  'Commerce',
  'Other / General',
];

export const OnboardingModal = () => {
  const { profile, updateProfile, joinBatchTimetable, shareTimetableWithBatch, showToast } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Form State for Step 4
  const [joinMode, setJoinMode] = useState<'details' | 'code'>('details');
  const [name, setName] = useState(profile?.name || '');
  const [college, setCollege] = useState(profile?.college || '');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [programme, setProgramme] = useState(profile?.programme || 'B.Tech');
  const [branch, setBranch] = useState(profile?.branch || 'Computer Science & Engg (CSE)');
  const [customBranch, setCustomBranch] = useState('');
  const [semester, setSemester] = useState<number>(profile?.semester || 1);
  const [section, setSection] = useState(profile?.section || 'A');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete = profile?.onboardingCompleted;

  if (isComplete) return null;

  const handleNext = () => {
    if (currentIndex < 3) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    updateProfile({ onboardingCompleted: true });
  };

  const handleFinishJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (joinMode === 'code') {
        let code = inviteCode.trim();
        if (!code) {
          showToast('Code Required', 'Please enter a batch invite code or link.', 'error');
          setIsSubmitting(false);
          return;
        }

        if (code.includes('invite=')) {
          code = new URLSearchParams(code.split('?')[1] || '').get('invite') || code;
        } else if (code.includes('/')) {
          code = code.split('/').pop() || code;
        }

        await joinBatchTimetable(code);
        updateProfile({ onboardingCompleted: true, name: name.trim() || profile?.name });
        showToast('Batch Joined', 'Welcome to your synced class timetable!', 'success');
        return;
      }

      // Details Mode
      const finalBranch = branch === 'Other / General' ? (customBranch.trim() || 'General') : branch;
      const cleanCollege = college.trim() || 'General College';

      const canonicalKey = getCanonicalBatchKey(cleanCollege, programme, finalBranch, semester);

      // Save user profile details
      updateProfile({
        name: name.trim() || profile?.name || 'Student',
        college: cleanCollege,
        programme: programme,
        branch: finalBranch,
        semester: semester,
        section: section.trim() || 'A',
        onboardingCompleted: true,
      });

      // Check if this batch already exists in Firestore
      try {
        const batchDocRef = doc(db, 'shared_timetables', canonicalKey);
        const snap = await getDoc(batchDocRef);
        if (snap.exists()) {
          await joinBatchTimetable(canonicalKey);
          showToast('Batch Found!', \`Connected to \${finalBranch} Sem \${semester} timetable.\`, 'success');
        } else {
          // Initialize new batch
          await shareTimetableWithBatch();
          showToast('Batch Created', \`Welcome! You are the first in your batch.\`, 'success');
        }
      } catch (err) {
        console.warn('Batch sync fallback:', err);
      }

    } catch (err) {
      console.error(err);
      updateProfile({ onboardingCompleted: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredColleges = INDIAN_COLLEGES.filter((c) =>
    c.toLowerCase().includes((collegeSearch || college).toLowerCase())
  ).slice(0, 8);

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
      buttonText: 'Join your batch',
      features: [
        { icon: Users, title: "Work as a team", desc: "Invite your batch and stay connected." }
      ]
    }
  ];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 30 : -30,
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
      x: dir < 0 ? 30 : -30,
      opacity: 0,
      transition: {
        x: { type: 'tween', duration: 0.35, ease: [0.25, 1, 0.5, 1] },
        opacity: { duration: 0.25, ease: 'linear' },
      },
    }),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans overflow-hidden w-full h-[100dvh]">
      
      {/* Top Nav */}
      <div className="w-full flex items-start justify-between px-6 pt-6 pb-2 shrink-0 z-20 relative">
        {currentIndex === 0 ? (
          <div className="w-full flex flex-col items-center justify-center">
            <h1 className="text-[26px] font-bold tracking-tighter text-[#111]">inter<span className="font-normal opacity-80">semester</span></h1>
            <div className="w-[24px] h-[1.5px] bg-[#111] mt-3 mb-3" />
            <p className="text-[10px] tracking-[3px] font-medium text-[#111111]/60 uppercase whitespace-pre-line text-center">
              {slides[0].topText}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-1.5 -ml-2 hover:bg-[#111111]/5 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#111111]" />
              </button>
              <h1 className="text-[22px] font-bold tracking-tighter text-[#111]">inter<span className="font-normal opacity-80">semester</span></h1>
            </div>
            <button onClick={handleSkip} className="px-3 py-1 -mr-2 text-[14px] font-semibold text-[#111111]/50 hover:text-[#111111] transition-colors">
              Skip
            </button>
          </>
        )}
      </div>

      {/* Main Content Area */}
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
              {/* Image Section */}
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

              {/* Text Section */}
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

              {/* Footer Controls for Intro Slides */}
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
            /* STEP 4: BATCH SETUP & ACADEMIC DETAILS */
            <motion.div
              key="step-4-batch"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex flex-col overflow-y-auto px-6 pt-2 pb-8 bg-white"
            >
              <div className="flex flex-col mb-4">
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-indigo-600 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Final Step · Auto Sync
                </span>
                <h2 className="text-[26px] font-bold text-[#111111] tracking-tight">
                  Join Your Class Batch
                </h2>
                <p className="text-[13px] text-[#6F6F6F] leading-snug mt-1">
                  Enter your academic details to automatically load your class timetable, schedule & tasks.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex border border-[#E5E5E5] bg-[#F7F7F5] p-1 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setJoinMode('details')}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${
                    joinMode === 'details' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#6F6F6F]'
                  }`}
                >
                  Select Course Details
                </button>
                <button
                  type="button"
                  onClick={() => setJoinMode('code')}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${
                    joinMode === 'code' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#6F6F6F]'
                  }`}
                >
                  Have Invite Code
                </button>
              </div>

              <form onSubmit={handleFinishJoin} className="flex flex-col gap-4">
                {joinMode === 'code' ? (
                  /* CODE MODE */
                  <div className="flex flex-col gap-3 py-2">
                    <label className="text-[12px] font-bold text-[#111111] uppercase tracking-wider">
                      Batch Invite Code or Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ext_... or paste invite URL"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D9D9D6] rounded-xl text-[14px] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#111111] transition-all"
                      autoFocus
                    />
                    <p className="text-[12px] text-[#888888]">
                      If your CR or classmate shared a link or 4-digit code, paste it here.
                    </p>
                  </div>
                ) : (
                  /* DETAILS MODE */
                  <>
                    {/* Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#D9D9D6] rounded-xl text-[13px] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    {/* College Selection */}
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                        College / University
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search or type college name..."
                          value={college}
                          onChange={(e) => {
                            setCollege(e.target.value);
                            setCollegeSearch(e.target.value);
                            setShowCollegeDropdown(true);
                          }}
                          onFocus={() => setShowCollegeDropdown(true)}
                          className="w-full px-3.5 py-2.5 border border-[#D9D9D6] rounded-xl text-[13px] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#111111]"
                          required
                        />
                        <Search className="w-4 h-4 text-[#A0A0A0] absolute right-3.5 top-3 pointer-events-none" />
                      </div>

                      {showCollegeDropdown && filteredColleges.length > 0 && (
                        <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-white border border-[#D9D9D6] rounded-xl shadow-lg">
                          {filteredColleges.map((col, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCollege(col);
                                setShowCollegeDropdown(false);
                              }}
                              className="w-full text-left px-3.5 py-2 text-[12px] font-medium text-[#111111] hover:bg-[#F4F4F4] border-b border-black/5 last:border-0"
                            >
                              {col}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Programme & Branch */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Programme
                        </label>
                        <select
                          value={programme}
                          onChange={(e) => setProgramme(e.target.value)}
                          className="w-full px-3 py-2.5 border border-[#D9D9D6] rounded-xl text-[13px] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#111111]"
                        >
                          {STANDARD_PROGRAMMES.slice(0, 10).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                          Section / Group
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. A, B, 1"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          className="w-full px-3 py-2.5 border border-[#D9D9D6] rounded-xl text-[13px] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                    </div>

                    {/* Branch */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                        Branch / Specialisation
                      </label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#D9D9D6] rounded-xl text-[13px] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#111111]"
                      >
                        {COMMON_BRANCHES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {branch === 'Other / General' && (
                        <input
                          type="text"
                          placeholder="Type your branch name..."
                          value={customBranch}
                          onChange={(e) => setCustomBranch(e.target.value)}
                          className="mt-1.5 w-full px-3.5 py-2 border border-[#D9D9D6] rounded-xl text-[13px] bg-[#FAFAF8]"
                          required
                        />
                      )}
                    </div>

                    {/* Semester Pill Picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                        Current Semester
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSemester(s)}
                            className={`py-2 text-[12px] font-bold rounded-xl border transition-all ${
                              semester === s
                                ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                                : 'border-[#D9D9D6] bg-[#FAFAF8] text-[#444444] hover:bg-white'
                            }`}
                          >
                            Sem {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full h-12 bg-[#111111] text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Syncing Batch...
                    </span>
                  ) : (
                    <>
                      {joinMode === 'code' ? 'Join Batch with Code' : 'Find & Sync My Batch'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
`;

fs.writeFileSync('components/onboarding/OnboardingModal.tsx', onboardingContent);
console.log('OnboardingModal.tsx updated with comprehensive batch joining step!');
