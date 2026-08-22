'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, CheckSquare, Bell } from 'lucide-react';
import Image from 'next/image';

const slides = [
  {
    id: 1,
    bg: '/onboarding/w1.jpeg',
    icon: 'logo',
    title: (
      <>
        Welcome to <br />
        intersemester.
      </>
    ),
    description: (
      <>
        Your all-in-one planner to <br />
        manage classes, tasks and <br />
        deadlines effortlessly.
      </>
    ),
  },
  {
    id: 2,
    bg: '/onboarding/w2.jpeg',
    icon: 'calendar',
    title: (
      <>
        Plan your <br />
        day.
      </>
    ),
    description: (
      <>
        Create a timetable that <br />
        fits your classes and <br />
        schedule perfectly.
      </>
    ),
  },
  {
    id: 3,
    bg: '/onboarding/w3.jpeg',
    icon: 'tasks',
    title: (
      <>
        Stay on top of <br />
        your tasks.
      </>
    ),
    description: (
      <>
        Add tasks, set priorities <br />
        and track your progress <br />
        every day.
      </>
    ),
  },
  {
    id: 4,
    bg: '/onboarding/w4.jpeg',
    icon: 'bell',
    title: (
      <>
        Never miss a <br />
        deadline.
      </>
    ),
    description: (
      <>
        Get reminders and stay <br />
        organized so you can <br />
        focus on what matters.
      </>
    ),
  },
];

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, setShowOnboarding, profile, updateProfile } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    updateProfile({ ...profile, onboardingCompleted: true });
    setShowOnboarding(false);
  };

  if (!showOnboarding) return null;

  const currentSlide = slides[currentIndex];

  const renderIcon = (type: string) => {
    if (type === 'logo') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-[#98795A] text-[#FDF8F4] flex items-center justify-center font-bold text-2xl tracking-tighter">
          is
        </div>
      );
    }
    const iconClass = "w-6 h-6 text-[#725A44]";
    const boxClass = "w-12 h-12 rounded-2xl border-2 border-[#D5C2B3] flex items-center justify-center bg-transparent";
    
    return (
      <div className={boxClass}>
        {type === 'calendar' && <Calendar className={iconClass} strokeWidth={2.5} />}
        {type === 'tasks' && <CheckSquare className={iconClass} strokeWidth={2.5} />}
        {type === 'bell' && <Bell className={iconClass} strokeWidth={2.5} />}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-6 select-none font-sans">
      <div className="relative w-full h-full sm:w-[420px] sm:h-[850px] sm:max-h-[90dvh] sm:rounded-[2.5rem] overflow-hidden bg-[#F2E8DB] shadow-2xl">
        
        {/* Background Image */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image 
              src={currentSlide.bg} 
              alt="Onboarding Background" 
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Top UI */}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-end z-20">
          <button 
            onClick={handleFinish}
            className="text-[#5C4836] font-semibold text-[15px] px-3 py-1 hover:opacity-70 transition-opacity"
          >
            Skip
          </button>
        </div>

        {/* Text Content */}
        <div className="absolute top-0 inset-x-0 pt-20 px-8 z-20 flex flex-col gap-6 text-[#2C2016]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${currentIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col gap-5"
            >
              {renderIcon(currentSlide.icon)}
              <h1 className="text-[34px] leading-[1.1] font-bold tracking-tight">
                {currentSlide.title}
              </h1>
              <p className="text-[#5C4836] text-[15px] leading-relaxed max-w-[280px]">
                {currentSlide.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom UI */}
        <div className="absolute bottom-0 inset-x-0 p-8 flex items-center justify-between z-20">
          {/* Dots */}
          <div className="flex items-center gap-2.5 pl-2">
            {slides.map((s, i) => (
              <div 
                key={s.id} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'w-2 bg-[#8C6B5D]' : 'w-2 bg-[#D5C2B3]'
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button 
            onClick={handleNext}
            className="w-14 h-14 rounded-full bg-[#8C6B5D] flex items-center justify-center text-white hover:bg-[#725A44] transition-colors shadow-lg active:scale-95"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
        
      </div>
    </div>
  );
};
