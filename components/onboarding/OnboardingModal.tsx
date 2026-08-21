'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    title: 'Welcome to AcademiSync',
    subtitle: 'Your Smart Campus Companion',
    description: 'Manage your classes, exams, homework, and daily carry bag all in one aesthetic, automated dashboard.',
    image: '/assets/onboard_campus.jpg',
  },
  {
    id: 2,
    title: 'AI Timetable & Exams',
    subtitle: 'Snap, Upload, Done.',
    description: 'Just upload a photo of your class or exam timetable. Our Gemini AI will extract subjects, times, and syllabus automatically.',
    image: '/assets/onboard_ai_scan.jpg',
  },
  {
    id: 3,
    title: 'Smart Carry Bag',
    subtitle: 'Never forget your gear',
    description: 'Based on your classes tomorrow, the app reminds you to pack your laptop, lab manual, or calculator the night before.',
    image: '/assets/onboard_carry_bag.jpg',
  },
  {
    id: 4,
    title: 'Ready to Rock?',
    subtitle: 'Everything you need, everywhere.',
    description: 'Use the blue navigation bar below to switch between your Timetable, Exams, Tasks, and Carry Bag.',
    image: '/assets/onboard_ready.jpg',
  },
];

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, setShowOnboarding, profile, updateProfile } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    updateProfile({ ...profile, onboardingCompleted: true });
    setShowOnboarding(false);
  };

  // If we shouldn't show it, render nothing (handled mostly by context, but safe guard)
  if (!showOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Carousel Content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Top Half: Image */}
            <div className="relative flex-1 bg-zinc-100 dark:bg-zinc-900 w-full overflow-hidden">
              <img
                src={SLIDES[currentIndex].image}
                alt={SLIDES[currentIndex].title}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Bottom gradient fade into text area */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
            </div>

            {/* Bottom Half: Text Content */}
            <div className="px-8 pb-10 pt-4 text-center shrink-0">
              <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-[0.2em]">
                {SLIDES[currentIndex].subtitle}
              </h3>
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-50 tracking-tight leading-tight mb-4">
                {SLIDES[currentIndex].title}
              </h2>
              <p className="text-base text-slate-500 dark:text-zinc-400 font-medium leading-relaxed max-w-sm mx-auto">
                {SLIDES[currentIndex].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="px-8 pb-12 pt-4 shrink-0 flex items-center justify-between">
        {/* Dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-8 bg-slate-900 dark:bg-white'
                  : 'w-2 bg-slate-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant="primary"
          onClick={handleNext}
          className="rounded-full py-6 pl-8 pr-6 shadow-xl shadow-blue-500/20 text-base font-bold transition-all hover:scale-105 active:scale-95"
        >
          {currentIndex === SLIDES.length - 1 ? (
            <span className="flex items-center gap-2">
              Let's Go <CheckCircle2 className="w-5 h-5" />
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Next <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
