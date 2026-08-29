'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Bell, Users, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const OnboardingModal = () => {
  const { profile, markOnboardingComplete } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);

  // If we already finished, don't render (or maybe handled by parent)
  // But just in case:
  const isComplete = profile?.onboardingCompleted;

  if (isComplete) return null;

  const handleNext = () => {
    if (currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else {
      markOnboardingComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
  };

  const slides = [
    {
      id: 0,
      image: '/onboard-1.png',
      topNav: 'center', // centered logo
      topText: 'PLAN TODAY.\nOWN TOMORROW.',
      title: "We'll remind you.",
      subtitle: "Stay ahead with smart reminders\nso you never miss what matters.",
      buttonText: 'Next',
      features: null
    },
    {
      id: 1,
      image: '/onboard-2.png',
      topNav: 'left', // left logo, right back arrow
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
      topNav: 'left-skip', // left logo, right skip
      title: "Your batch,\ntogether.",
      subtitle: "Share schedules, stay in sync\nand work better with your classmates.",
      buttonText: 'Get started',
      features: [
        { icon: Users, title: "Work as a team", desc: "Invite your batch and stay connected." }
      ]
    }
  ];

  const currentSlide = slides[currentIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
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
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  // We need to keep track of direction for animation
  const [direction, setDirection] = useState(1);

  const changeSlide = (newIndex: number) => {
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FAFAF8] flex flex-col font-sans overflow-hidden w-full h-[100dvh]">
      
      {/* Top Nav */}
      <div className="w-full flex items-center justify-between px-6 pt-12 pb-4 shrink-0 h-[80px]">
        {currentSlide.topNav === 'center' ? (
          <div className="w-full flex flex-col items-center justify-center">
            <h1 className="text-[28px] font-bold tracking-tighter text-[#111]">inter<span className="font-normal opacity-80">semester</span></h1>
            <div className="w-[30px] h-[2px] bg-[#111] mt-6 mb-5" />
            <p className="mt-6 text-[10px] tracking-[3px] font-medium text-[#111111]/60 uppercase whitespace-pre-line text-center leading-relaxed">
              {currentSlide.topText}
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight">inter<span className="font-normal opacity-70">semester</span></h1>
            {currentSlide.topNav === 'left' && (
              <button onClick={handlePrev} className="p-2 -mr-2 hover:bg-[#111111]/5 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#111111]" />
              </button>
            )}
            {currentSlide.topNav === 'left-skip' && (
              <button onClick={handleSkip} className="px-3 py-1 -mr-3 text-sm font-medium text-[#111111]/60 hover:text-[#111111] transition-colors">
                Skip
              </button>
            )}
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
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
            <div className={`flex-1 flex items-center justify-center p-6 ${currentSlide.id === 0 ? 'mt-8' : ''}`}>
              <img 
                src={currentSlide.image} 
                alt="Onboarding" 
                className="w-full h-full max-h-[35vh] object-contain"
              />
            </div>

            {/* Text & Features Section */}
            <div className="w-full px-8 flex flex-col gap-3 pb-6 bg-[#FAFAF8] shrink-0">
              <h2 className="text-[32px] leading-[1.1] font-bold text-[#111111] whitespace-pre-line">
                {currentSlide.title}
              </h2>
              <p className="text-[14px] text-[#111111]/60 font-medium leading-snug whitespace-pre-line mb-4">
                {currentSlide.subtitle}
              </p>

              {currentSlide.features && (
                <div className="flex flex-col">
                  {currentSlide.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-4 py-4 border-b border-black/5 last:border-0">
                      <div className="w-10 h-10 bg-[#F4F4F4] rounded-2xl flex items-center justify-center shrink-0">
                        <feat.icon className="w-5 h-5 text-[#111111]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[#111111]">{feat.title}</span>
                        <span className="text-[12px] text-[#111111]/60 mt-0.5">{feat.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="w-full px-8 pb-10 pt-4 flex items-center justify-between shrink-0 bg-[#FAFAF8] z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-[6px] rounded-full transition-all duration-300 ${i === currentIndex ? 'w-[6px] bg-[#111111]' : 'w-[6px] bg-[#111111]/15'}`}
              />
            ))}
          </div>
          {currentIndex > 0 && (
            <span className="text-[12px] font-mono text-[#111111]/40 font-medium tracking-widest ml-2">
              {currentIndex + 1} / 3
            </span>
          )}
        </div>

        <button
          onClick={() => {
            changeSlide(currentIndex + 1);
            if (currentIndex === 2) handleSkip();
          }}
          className="h-[48px] px-6 bg-[#111111] text-white rounded-2xl flex items-center gap-2 font-semibold text-[14px] hover:opacity-90 active:scale-95 transition-all"
        >
          {currentSlide.buttonText}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
