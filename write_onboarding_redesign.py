code = r"""'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Bell, Users, ArrowLeft, Search, Link2, Sparkles, ChevronDown, Check, Building2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { INDIAN_COLLEGES, STANDARD_PROGRAMMES } from '@/lib/colleges';
import { getCanonicalBatchKey } from '@/lib/timetableUtils';
import { doc, getDoc } from 'firebase/firestore';
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

  // Step 4 State
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);

  // Form State
  const [name, setName] = useState(profile?.name || '');
  const [college, setCollege] = useState(profile?.college || '');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [programme, setProgramme] = useState(profile?.programme || 'B.Tech');
  const [branch, setBranch] = useState(profile?.branch || 'Computer Science & Engg (CSE)');
  const [customBranch, setCustomBranch] = useState('');
  const [semester, setSemester] = useState<number>(profile?.semester || 1);
  const [section, setSection] = useState(profile?.section || 'A');
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);

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

  // 1. Direct Code Join
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
      if (name.trim()) {
        updateProfile({ name: name.trim() });
      }
      updateProfile({ onboardingCompleted: true });
      showToast('Batch Joined!', 'Welcome to your synced class timetable.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Join Failed', 'Could not find a batch with that code.', 'error');
    } finally {
      setIsJoiningCode(false);
    }
  };

  // 2. Search & Select Details Join
  const handleDetailsJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDetails(true);

    try {
      const finalBranch = branch === 'Other / General' ? (customBranch.trim() || 'General') : branch;
      const cleanCollege = college.trim() || 'General College';

      const canonicalKey = getCanonicalBatchKey(cleanCollege, programme, finalBranch, semester);

      // Update Profile
      updateProfile({
        name: name.trim() || profile?.name || 'Student',
        college: cleanCollege,
        programme: programme,
        branch: finalBranch,
        semester: semester,
        section: section.trim() || 'A',
        onboardingCompleted: true,
      });

      // Check if batch exists
      try {
        const batchDocRef = doc(db, 'shared_timetables', canonicalKey);
        const snap = await getDoc(batchDocRef);
        if (snap.exists()) {
          await joinBatchTimetable(canonicalKey);
          showToast('Batch Found!', `Synced with ${finalBranch} Sem ${semester}.`, 'success');
        } else {
          await shareTimetableWithBatch();
          showToast('Batch Created', `Welcome! You're ready to share with your classmates.`, 'success');
        }
      } catch (err) {
        console.warn('Batch sync fallback:', err);
      }
    } catch (err) {
      console.error(err);
      updateProfile({ onboardingCompleted: true });
    } finally {
      setIsSubmittingDetails(false);
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
              Skip setup
            </button>
          </>
        )}
      </div>

      {/* Main Area */}
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

              {/* Slide Text Card */}
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

              {/* Bottom Nav */}
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
            /* STEP 4: CLEAN, PROMINENT BATCH JOIN SCREEN */
            <motion.div
              key="step-4-batch-v2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex flex-col overflow-y-auto px-6 py-6 bg-[#FFFFFF]"
            >
              <div className="flex flex-col mb-6">
                <h2 className="text-[26px] font-bold text-[#111111] tracking-tight">
                  Connect Your Batch
                </h2>
                <p className="text-[13px] text-[#6F6F6F] mt-1 leading-relaxed">
                  Join with an invite code from your classmates, or search your college to automatically sync your schedule.
                </p>
              </div>

              {/* 1. TOP PROMINENT INVITE CODE SECTION */}
              <div className="border-2 border-[#111111] rounded-2xl p-4 bg-[#FAFAF8] shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#111111]" />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#111111]">
                    Have an Invite Code or Link?
                  </span>
                </div>
                <form onSubmit={handleCodeJoin} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste code or link here..."
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                  <button
                    type="submit"
                    disabled={isJoiningCode || !inviteCode.trim()}
                    className="px-5 py-2.5 bg-[#111111] text-white text-[13px] font-bold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  >
                    {isJoiningCode ? 'Joining...' : 'Join'}
                  </button>
                </form>
              </div>

              {/* OR DIVIDER */}
              <div className="flex items-center gap-3 my-1 mb-6">
                <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                <span className="text-[10px] font-bold tracking-[2px] text-[#888888] uppercase">
                  OR SEARCH YOUR BATCH
                </span>
                <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
              </div>

              {/* 2. SEARCH & SELECT BATCH ACCORDION / BUTTON */}
              {!showSearchForm ? (
                <button
                  type="button"
                  onClick={() => setShowSearchForm(true)}
                  className="w-full py-4 px-5 border border-[#D9D9D6] hover:border-[#111111] bg-white rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F4F4] flex items-center justify-center group-hover:bg-[#111111] group-hover:text-white transition-colors">
                      <Building2 className="w-5 h-5 text-[#111111] group-hover:text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[#111111]">
                        Search by College & Branch
                      </span>
                      <span className="text-[12px] text-[#6F6F6F]">
                        Select your university, programme & semester
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-[#888888] group-hover:text-[#111111] transition-colors" />
                </button>
              ) : (
                /* EXPANDED DETAILS FORM */
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleDetailsJoin}
                  className="flex flex-col gap-4 border border-[#D9D9D6] rounded-2xl p-5 bg-[#FAFAF8]"
                >
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3 mb-1">
                    <span className="text-[13px] font-bold text-[#111111] uppercase tracking-wider">
                      Academic Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSearchForm(false)}
                      className="text-[11px] font-semibold text-[#888888] hover:text-[#111111] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

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
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] focus:outline-none focus:border-[#111111]"
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
                        className="w-full px-3.5 py-2.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] focus:outline-none focus:border-[#111111]"
                        required
                      />
                      <Search className="w-4 h-4 text-[#A0A0A0] absolute right-3.5 top-3 pointer-events-none" />
                    </div>

                    {showCollegeDropdown && filteredColleges.length > 0 && (
                      <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-44 overflow-y-auto bg-white border border-[#D9D9D6] rounded-xl shadow-lg">
                        {filteredColleges.map((col, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCollege(col);
                              setShowCollegeDropdown(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-[12px] font-medium text-[#111111] hover:bg-[#F4F4F4] border-b border-black/5 last:border-0 cursor-pointer"
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Programme & Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                        Programme
                      </label>
                      <select
                        value={programme}
                        onChange={(e) => setProgramme(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] focus:outline-none focus:border-[#111111]"
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
                        className="w-full px-3 py-2.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] focus:outline-none focus:border-[#111111]"
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
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D9D9D6] rounded-xl text-[13px] focus:outline-none focus:border-[#111111]"
                    >
                      {COMMON_BRANCHES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {branch === 'Other / General' && (
                      <input
                        type="text"
                        placeholder="Type your branch..."
                        value={customBranch}
                        onChange={(e) => setCustomBranch(e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2 bg-white border border-[#D9D9D6] rounded-xl text-[13px]"
                        required
                      />
                    )}
                  </div>

                  {/* Semester Pills */}
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
                          className={`py-2 text-[12px] font-bold rounded-xl border transition-all cursor-pointer ${
                            semester === s
                              ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                              : 'border-[#D9D9D6] bg-white text-[#444444] hover:bg-[#F9F9F8]'
                          }`}
                        >
                          Sem {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isSubmittingDetails}
                    className="mt-3 w-full h-12 bg-[#111111] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingDetails ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Syncing Batch...
                      </span>
                    ) : (
                      <>
                        Find & Sync My Batch
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
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
print('Successfully written redesigned OnboardingModal.tsx')
