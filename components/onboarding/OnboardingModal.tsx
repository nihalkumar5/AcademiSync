'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Calendar, 
  Bell, 
  Users, 
  ArrowLeft, 
  Upload,
  Camera,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { mergeConsecutiveSessions } from '@/lib/timetableUtils';
import { TimetableImportModal } from '@/components/timetable/TimetableImportModal';

export const OnboardingModal = () => {
  const { 
    profile, 
    updateProfile, 
    joinBatchTimetable, 
    setFullSubjectsAndTimetable, 
    showToast, 
    user, 
    isClerkLoaded,
    setShowOnboarding
  } = useApp();
  
  const isSignedIn = !!user;
  const isUserLoaded = isClerkLoaded;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Fast Invite Code State
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);

  // Full AI Timetable Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Auto-connect pending batch after signing in
  useEffect(() => {
    if (isSignedIn && isUserLoaded) {
      const pendingInvite = localStorage.getItem('pending_join_invite');

      if (pendingInvite) {
        localStorage.removeItem('pending_join_invite');
        joinBatchTimetable(pendingInvite)
          .then(() => updateProfile({ onboardingCompleted: true }))
          .catch((e) => console.warn('Auto invite join failed:', e));
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
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    updateProfile({ onboardingCompleted: true });
    setShowOnboarding(false);
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
      showToast('Joined Batch!', 'You have been connected to the batch timetable.', 'success');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsJoiningCode(false);
    }
  };

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
      buttonText: 'Get Started',
      features: [
        { icon: Users, title: "Work as a team", desc: "Invite your batch and stay connected." }
      ]
    }
  ];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 20 : -20,
      opacity: 0,
      transition: {
        duration: 0.15,
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
        <AnimatePresence custom={direction} initial={false}>
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
                  {[0, 1, 2].map((i) => (
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
            /* STEP 4: CLEAN NOTION-STYLE BATCH & SCAN EXPERIENCE */
            <motion.div
              key="step-4-ai-scanner"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex flex-col overflow-y-auto px-6 py-5 bg-[#FFFFFF]"
            >
              <div className="flex flex-col max-w-[420px] mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col mb-4">
                  <h2 className="text-[34px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px]">
                    Connect,<br />
                    Batch,<br />
                    Timetable
                  </h2>
                  <p className="text-[13.5px] font-normal text-[#6B6B6B] leading-[19px] mt-2">
                    Join your classmates and sync your academic schedule.
                  </p>
                </div>

                {/* 1. Fast Invite Card (At The Top) */}
                <div className="border border-[#D8D8D8] bg-[#FAFAF8] p-4 mb-4">
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
                <div className="flex items-center gap-3 my-0.5 mb-4">
                  <div className="flex-1 h-[1px] bg-[#EEEEEC]" />
                  <span className="text-[10.5px] font-medium tracking-[1.5px] text-[#A0A0A0] uppercase">
                    OR SCAN TIMETABLE
                  </span>
                  <div className="flex-1 h-[1px] bg-[#EEEEEC]" />
                </div>

                {/* 3. Clean Notion Dashed Upload Box (Matching Image 2) */}
                <div 
                  onClick={() => setIsImportModalOpen(true)}
                  className="relative group w-full py-6 px-4 flex flex-col items-center justify-center border border-dashed border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-all cursor-pointer text-center"
                >
                  <Upload className="w-5 h-5 mb-2.5 text-[#111111] dark:text-[#FFFFFF] group-hover:-translate-y-0.5 transition-transform" />
                  
                  <h3 className="text-[15.5px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1">
                    Just Upload & Chill
                  </h3>
                  
                  <p className="text-[12.5px] text-[#6F6F6F] max-w-[280px] leading-snug mb-3.5">
                    Drop your routine photo or PDF. Intersemester handles your weekly schedule tension automatically.
                  </p>
                  
                  <div className="px-6 h-[42px] flex items-center justify-center bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-2.5 shadow-sm group-hover:opacity-90 transition-opacity">
                    Choose file
                  </div>

                  <div className="text-[11px] text-[#999999] font-medium tracking-[0.5px] uppercase">
                    JPG · PNG · PDF (Multi-Page)
                  </div>
                </div>

                {/* Illustration Immediately Below Upload Card - Shifted Up & Sized */}
                <div className="w-[calc(100%+48px)] -mx-6 flex justify-center -mt-[200px] py-0 overflow-hidden pointer-events-none select-none">
                  <img
                    src="/sorted.png"
                    alt="Schedule Sorted Illustration"
                    className="w-full max-w-[340px] h-auto object-contain pointer-events-none"
                  />
                </div>

                {/* 4. Manual Skip Link */}
                <div className="relative z-30 pointer-events-auto mt-2 text-center pb-6">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-[13px] font-semibold text-[#666666] hover:text-[#111111] underline underline-offset-4 cursor-pointer py-2 px-4 inline-block transition-colors active:scale-95"
                  >
                    I'll set up or customize classes manually ➜
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full AI Timetable Import Modal (Shared with App + Button) */}
      <TimetableImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
