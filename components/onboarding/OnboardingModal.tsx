'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Calendar, Backpack, Bell, BookOpen, Cpu, FlaskConical, Clock } from 'lucide-react';
import { IntersemesterLogo, IntersemesterMonogram } from '../ui/IntersemesterLogo';

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, setShowOnboarding, profile, updateProfile } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < 2) {
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-black overflow-hidden select-none font-sans">
      {/* Top Header bar with Skip action */}
      <div className="flex items-center justify-between px-6 sm:px-10 pt-6 pb-2 shrink-0 z-20 border-b border-black dark:border-white">
        <div className="flex items-center gap-2">
          <IntersemesterMonogram size={30} />
          <span className="font-bold text-black dark:text-white text-base tracking-tight hidden sm:inline uppercase">
            Intersemester
          </span>
        </div>
        <button
          onClick={handleFinish}
          className="text-sm font-bold text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-transparent hover:border-black dark:hover:border-white transition-colors py-1.5 px-3 uppercase"
        >
          Skip
        </button>
      </div>

      {/* Main Slide Carousel Area */}
      <div className="flex-1 relative flex items-center justify-center px-4 sm:px-8 py-2 max-w-5xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {/* SLIDE 1: Intersemester Welcome */}
          {currentIndex === 0 && (
            <motion.div
              key="slide-1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-h-[640px]"
            >
              {/* Left Column: Text Content */}
              <div className="lg:col-span-6 flex flex-col gap-4 text-left justify-center px-4">
                <div className="mb-1">
                  <IntersemesterLogo size="lg" showTagline={false} />
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white tracking-tighter leading-tight">
                  Your academic life,{' '}
                  <span className="underline decoration-4">organized.</span>
                </h1>

                <p className="text-sm sm:text-base text-black/70 dark:text-white/70 font-medium leading-relaxed max-w-md border-l-4 border-black dark:border-white pl-4">
                  Timetable, tasks, deadlines and more – everything you need, in one place.
                </p>
              </div>

              {/* Right Column: 3D Phone Mockup with Timetable */}
              <div className="lg:col-span-6 flex items-center justify-center relative p-4">
                {/* Phone Mockup Frame */}
                <div className="relative w-full max-w-[310px] bg-white dark:bg-black rounded-none p-5 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,1)] border-2 border-black dark:border-white hover:-translate-y-1 transition-transform duration-300">
                  {/* Phone Header */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-white">
                    <div>
                      <span className="text-[11px] font-bold text-black/60 dark:text-white/60 block uppercase tracking-wider">
                        Today
                      </span>
                      <span className="text-sm font-bold text-black dark:text-white uppercase">
                        Mon, 20 May
                      </span>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center text-black dark:text-white border-2 border-black dark:border-white">
                      <Bell className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Timetable Cards */}
                  <div className="flex flex-col gap-3 pt-4">
                    {/* Card 1 */}
                    <div className="p-3.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono">
                          09:00
                        </span>
                        <h4 className="text-xs font-bold uppercase">
                          Data Structures
                        </h4>
                        <span className="text-[10px] opacity-80 font-medium">Room 201</span>
                      </div>
                      <div className="w-7 h-7 bg-white text-black dark:bg-black dark:text-white border-2 border-current flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="p-3.5 bg-white text-black dark:bg-black dark:text-white border-2 border-black dark:border-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono">
                          11:00
                        </span>
                        <h4 className="text-xs font-bold uppercase">
                          Digital Logic
                        </h4>
                        <span className="text-[10px] opacity-80 font-medium">Room 105</span>
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center border-2 border-current">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="p-3.5 bg-white text-black dark:bg-black dark:text-white border-2 border-black dark:border-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono">
                          02:00
                        </span>
                        <h4 className="text-xs font-bold uppercase">
                          DBMS Lab
                        </h4>
                        <span className="text-[10px] opacity-80 font-medium">Lab 3</span>
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center border-2 border-current">
                        <FlaskConical className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SLIDE 2: Plan Your Day */}
          {currentIndex === 1 && (
            <motion.div
              key="slide-2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-h-[640px]"
            >
              {/* Left Column: Text Content */}
              <div className="lg:col-span-6 flex flex-col gap-4 text-left justify-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#6366F1] flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                  <Calendar className="w-6 h-6" />
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
                  Plan your day.{' '}
                  <span className="text-[#6366F1] dark:text-[#818CF8]">Stay on track.</span>
                </h1>

                <p className="text-sm sm:text-base text-black/70 dark:text-white/70 font-medium leading-relaxed max-w-md border-l-4 border-black dark:border-white pl-4">
                  Get your timetable, tasks and deadlines in one clean view so you never miss a thing.
                </p>
              </div>

              {/* Right Column: 3D Calendar & Tasks Visual */}
              <div className="lg:col-span-6 flex items-center justify-center relative p-4">
                <div className="relative w-full max-w-[340px] flex flex-col gap-4">
                  {/* 3D Calendar Top Card */}
                  <div className="bg-white dark:bg-black rounded-none p-5 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,1)] border-2 border-black dark:border-white">
                    <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-white pb-2">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-black dark:bg-white" />
                        <div className="w-3 h-3 bg-black dark:bg-white" />
                        <div className="w-3 h-3 bg-black dark:bg-white" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Real-time</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold uppercase">
                      <div className="p-2.5 border-2 border-black dark:border-white opacity-50">Mon</div>
                      <div className="p-2.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white shadow-[2px_2px_0_rgba(255,255,255,1)] dark:shadow-[2px_2px_0_rgba(0,0,0,1)] flex flex-col items-center">
                        <span>Tue</span>
                        <Check className="w-3 h-3 mt-1" />
                      </div>
                      <div className="p-2.5 border-2 border-black dark:border-white">Wed</div>
                      <div className="p-2.5 border-2 border-black dark:border-white">Thu</div>
                    </div>
                  </div>

                  {/* Tasks Card Overlapping */}
                  <div className="bg-white dark:bg-black rounded-none p-4 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,1)] border-2 border-black dark:border-white ml-4 -mt-2">
                    <span className="text-xs font-bold uppercase tracking-wider mb-2.5 block border-b border-black dark:border-white pb-1">
                      Tasks
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <div className="w-4 h-4 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center border border-black dark:border-white">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="line-through opacity-50">Submit ML Report</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <div className="w-4 h-4 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center border border-black dark:border-white">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Prepare for DE Quiz</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold opacity-80">
                        <div className="w-4 h-4 border-2 border-black dark:border-white" />
                        <span>Revise Probability</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SLIDE 3: Carry Smart */}
          {currentIndex === 2 && (
            <motion.div
              key="slide-3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-h-[640px]"
            >
              {/* Left Column: Text Content */}
              <div className="lg:col-span-6 flex flex-col gap-4 text-left justify-center px-4">
                <div className="w-12 h-12 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center border-2 border-black dark:border-white">
                  <Backpack className="w-6 h-6" />
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white tracking-tighter leading-tight">
                  Carry smart.{' '}
                  <span className="underline decoration-4">Be prepared.</span>
                </h1>

                <p className="text-sm sm:text-base text-black/70 dark:text-white/70 font-medium leading-relaxed max-w-md border-l-4 border-black dark:border-white pl-4">
                  Know what to carry for your classes and labs, every day.
                </p>
              </div>

              {/* Right Column: 3D Backpack & Checklist Card */}
              <div className="lg:col-span-6 flex items-center justify-center relative p-4">
                <div className="relative w-full max-w-[340px] flex flex-col gap-3.5 bg-white dark:bg-black rounded-none p-6 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_rgba(255,255,255,1)] border-2 border-black dark:border-white">
                  <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center border border-black dark:border-white">
                        <Backpack className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wider">
                        Things to carry
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    {[
                      { item: 'Laptop', packed: true },
                      { item: 'Charger', packed: true },
                      { item: 'ID Card', packed: true },
                      { item: 'Lab File', packed: false },
                      { item: 'Notebook', packed: false },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 border-2 border-transparent hover:border-black dark:hover:border-white transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 flex items-center justify-center border-2 border-black dark:border-white ${
                              row.packed
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : 'bg-transparent'
                            }`}
                          >
                            {row.packed && <Check className="w-3 h-3" />}
                          </div>
                          <span
                            className={`text-xs font-bold uppercase ${
                              row.packed
                                ? 'opacity-100 line-through'
                                : 'opacity-80'
                            }`}
                          >
                            {row.item}
                          </span>
                        </div>
                        <div className="w-10 h-1.5 bg-black/20 dark:bg-white/20" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation Bar */}
      <div className="px-6 sm:px-10 pb-8 pt-4 shrink-0 flex items-center justify-between max-w-5xl mx-auto w-full z-20">
        {/* Pagination Dots Indicator */}
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-3 transition-all duration-300 border-2 border-black dark:border-white ${
                idx === currentIndex
                  ? 'w-10 bg-black dark:bg-white'
                  : 'w-3 bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Button: Next or Get Started */}
        <button
          onClick={handleNext}
          className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold text-sm sm:text-base py-3 px-6 sm:px-8 uppercase tracking-widest hover:-translate-y-1 hover:translate-x-1 hover:shadow-[-4px_4px_0_rgba(0,0,0,1)] dark:hover:shadow-[-4px_4px_0_rgba(255,255,255,1)] transition-all duration-200"
        >
          {currentIndex === 2 ? 'Start' : 'Next'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
