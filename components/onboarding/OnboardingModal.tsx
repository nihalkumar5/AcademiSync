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
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TimetableImportModal } from '@/components/timetable/TimetableImportModal';

export const OnboardingModal = () => {
  const { 
    profile, 
    updateProfile, 
    joinBatchTimetable, 
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
      try {
        localStorage.setItem('pending_join_invite', code);
      } catch (_) {}
      showToast('Invite Saved', 'Please sign in to link your batch automatically.', 'info');
      updateProfile({ onboardingCompleted: true });
      setShowOnboarding(false);
      return;
    }

    setIsJoiningCode(true);
    try {
      await joinBatchTimetable(code);
      updateProfile({ onboardingCompleted: true });
      showToast('Joined Batch!', 'You have been connected to the batch timetable.', 'success');
      setShowOnboarding(false);
    } catch (err: any) {
      console.error(err);
      showToast('Invalid Code', 'Could not find a batch for this invite code.', 'error');
    } finally {
      setIsJoiningCode(false);
    }
  };

  const slides = [
    {
      id: 0,
      image: '/onboard-1.png',
      topNav: 'center',
      topText: "EVERY ACADEMIC DAY\nCLEAR & PREDICTABLE.",
      title: "Intersemester\nis your semester\ncopilot.",
      subtitle: "Smart schedule intelligence for classes,\nroutine updates, and assignments.",
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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center overflow-hidden w-full h-[100dvh]">
      
      <div className="w-full h-full md:w-[460px] lg:w-[480px] md:h-[840px] md:max-h-[92vh] bg-white dark:bg-[#111110] text-[#111111] dark:text-[#FFFFFF] flex flex-col font-sans overflow-hidden md:rounded-[28px] md:shadow-[0_25px_80px_rgba(0,0,0,0.45)] md:border md:border-black/15 dark:md:border-white/15 relative">
        
        {/* Top Nav Header with Safe Area Clearance */}
        <div 
          className="w-full flex items-center justify-between px-6 pb-3 shrink-0 z-30 border-b border-[#F0F0EE] dark:border-[#262626] bg-white dark:bg-[#111110] text-[#111111] dark:text-[#FFFFFF]"
          style={{
            paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 24px)',
          }}
        >
          {currentIndex === 0 ? (
            <div className="w-full flex flex-col items-center justify-center pt-1">
              <h1 className="text-[24px] font-bold tracking-tighter text-[#111111] dark:text-[#FFFFFF]">
                inter<span className="font-normal opacity-80">semester</span>
              </h1>
              <div className="w-[24px] h-[1.5px] bg-[#111111] dark:bg-[#FFFFFF] mt-2.5 mb-1.5" />
              <p className="text-[9.5px] tracking-[2.5px] font-mono font-bold text-[#111111]/60 dark:text-[#FFFFFF]/60 uppercase whitespace-pre-line text-center">
                {slides[0].topText}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handlePrev} 
                  className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" />
                </button>
                <h1 className="text-[20px] font-bold tracking-tighter text-[#111111] dark:text-[#FFFFFF]">
                  inter<span className="font-normal opacity-80">semester</span>
                </h1>
              </div>
              <button 
                type="button"
                onClick={handleSkip} 
                className="px-3.5 py-1.5 -mr-2 text-[13px] font-semibold text-[#888888] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Skip
              </button>
            </>
          )}
        </div>

        {/* Main Container */}
        <div className="flex-1 w-full flex flex-col relative overflow-hidden bg-white">
          <AnimatePresence custom={direction} initial={false}>
            {currentIndex < 3 ? (
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 w-full h-full flex flex-col justify-between bg-white"
              >
                {/* Slide Image */}
                <div className="relative flex-1 min-h-0 w-full flex items-end justify-center overflow-visible bg-white">
                  <img 
                    src={slides[currentIndex].image} 
                    alt="Onboarding" 
                    className={`relative z-10 w-full h-full object-contain object-bottom pointer-events-none translate-y-[4%] ${
                      currentIndex === 0 ? 'scale-[1.18]' :
                      currentIndex === 1 ? 'scale-[1.4]' :
                      'scale-[1.12]'
                    }`}
                  />
                </div>

                {/* Text Card */}
                <div className="w-full px-6 sm:px-8 flex flex-col gap-2 pb-5 bg-[#F4F4F4] dark:bg-[#1A1A1A] shrink-0 z-10 relative rounded-t-[32px] pt-6 -mt-5">
                  <h2 className="text-[26px] sm:text-[28px] leading-[1.12] font-bold text-[#111111] dark:text-[#FFFFFF] whitespace-pre-line text-left">
                    {slides[currentIndex].title}
                  </h2>
                  <p className="text-[13.5px] text-[#111111]/60 dark:text-[#FFFFFF]/60 font-medium leading-snug whitespace-pre-line mb-2 text-left">
                    {slides[currentIndex].subtitle}
                  </p>

                  {slides[currentIndex].features && (
                    <div className="flex flex-col text-left">
                      {slides[currentIndex].features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-black/5 dark:border-white/5 last:border-0">
                          <div className="w-8 h-8 bg-white dark:bg-[#111111] rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                            <feat.icon className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">{feat.title}</span>
                            <span className="text-[11.5px] text-[#111111]/60 dark:text-[#FFFFFF]/60">{feat.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Controls Footer */}
                <div 
                  className="w-full px-6 sm:px-8 pt-2 pb-6 flex items-center justify-between shrink-0 bg-[#F4F4F4] dark:bg-[#1A1A1A] z-10 relative"
                  style={{
                    paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                        className={`h-[5px] rounded-full transition-all duration-300 ${i === currentIndex ? 'w-[18px] bg-[#111111] dark:bg-[#FFFFFF]' : 'w-[5px] bg-[#111111]/20 dark:bg-[#FFFFFF]/20'}`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-[44px] px-6 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] rounded-none flex items-center gap-2 font-bold text-[13px] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
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
              className="absolute inset-0 w-full h-full flex flex-col overflow-y-auto px-6 py-5 bg-[#FFFFFF] dark:bg-[#111110]"
            >
              <div className="flex flex-col max-w-[420px] mx-auto w-full pb-10">
                {/* Header */}
                <div className="flex flex-col mb-4">
                  <h2 className="text-[30px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[34px]">
                    Connect,<br />
                    Batch,<br />
                    Timetable
                  </h2>
                  <p className="text-[13.5px] font-medium text-[#6B6B6B] dark:text-[#A0A0A0] leading-[19px] mt-2">
                    Join your classmates and sync your academic schedule.
                  </p>
                </div>

                {/* 1. Fast Invite Card */}
                <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#1A1A1A] p-4 mb-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF]" />
                    <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
                      HAVE AN INVITE?
                    </span>
                  </div>
                  <form onSubmit={handleCodeJoin} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste code or link..."
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="flex-1 h-11 px-3.5 bg-white dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] rounded-none text-[13.5px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={isJoiningCode || !inviteCode.trim()}
                      className="h-11 px-5 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-[13px] font-bold uppercase tracking-wider rounded-none hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                    >
                      {isJoiningCode ? 'Joining...' : 'Join'}
                    </button>
                  </form>
                </div>

                {/* 2. Light Divider */}
                <div className="flex items-center gap-3 my-1 mb-4">
                  <div className="flex-1 h-[1px] bg-[#EEEEEC] dark:bg-[#2C2C2C]" />
                  <span className="text-[10.5px] font-bold tracking-[1.5px] text-[#A0A0A0] uppercase font-mono">
                    OR SCAN TIMETABLE
                  </span>
                  <div className="flex-1 h-[1px] bg-[#EEEEEC] dark:bg-[#2C2C2C]" />
                </div>

                {/* 3. Clean Dashed Upload Box */}
                <div 
                  onClick={() => setIsImportModalOpen(true)}
                  className="relative group w-full py-6 px-4 flex flex-col items-center justify-center border border-dashed border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-all cursor-pointer text-center"
                >
                  <Upload className="w-5 h-5 mb-2 text-[#111111] dark:text-[#FFFFFF] group-hover:-translate-y-0.5 transition-transform" />
                  
                  <h3 className="text-[15.5px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1">
                    Just Upload & Chill
                  </h3>
                  
                  <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#A0A0A0] max-w-[280px] leading-snug mb-3">
                    Drop your routine photo or PDF. Intersemester builds your weekly schedule automatically.
                  </p>
                  
                  <div className="px-6 h-[40px] flex items-center justify-center bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] font-bold text-[12.5px] pointer-events-none rounded-none w-fit mx-auto mb-2 shadow-sm group-hover:opacity-90 transition-opacity uppercase tracking-wider">
                    Choose file
                  </div>

                  <div className="text-[10.5px] text-[#999999] font-bold tracking-[0.5px] uppercase font-mono">
                    JPG · PNG · PDF (Multi-Page)
                  </div>
                </div>

                {/* 4. Manual Skip Link */}
                <div className="relative z-30 pointer-events-auto mt-6 text-center pb-6">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-[13px] font-semibold text-[#666666] dark:text-[#999999] hover:text-[#111111] dark:hover:text-[#FFFFFF] underline underline-offset-4 cursor-pointer py-2 px-4 inline-block transition-colors active:scale-95"
                  >
                    I'll set up or customize classes manually ➜
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full AI Timetable Import Modal */}
      <TimetableImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      </div>
    </div>
  );
};
