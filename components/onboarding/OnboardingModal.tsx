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
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#FAFBFD] dark:bg-[#0B0F19] overflow-hidden select-none font-sans">
      {/* Top Header bar with Skip action */}
      <div className="flex items-center justify-between px-6 sm:px-10 pt-6 pb-2 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <IntersemesterMonogram size={30} />
          <span className="font-extrabold text-[#0F172A] dark:text-white text-base tracking-tight hidden sm:inline">
            Inter<span className="text-[#6366F1]">semester</span>
          </span>
        </div>
        <button
          onClick={handleFinish}
          className="text-sm font-semibold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] transition-colors py-1.5 px-3 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
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

                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
                  Your academic life,{' '}
                  <span className="text-[#6366F1] dark:text-[#818CF8]">organized.</span>
                </h1>

                {/* Accent Dash / Dot line indicator */}
                <div className="flex items-center gap-1.5 my-1">
                  <div className="w-8 h-1 bg-[#6366F1] rounded-full" />
                  <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full" />
                </div>

                <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-400 font-medium leading-relaxed max-w-md">
                  Timetable, tasks, deadlines and more – everything you need, in one place.
                </p>
              </div>

              {/* Right Column: 3D Phone Mockup with Timetable */}
              <div className="lg:col-span-6 flex items-center justify-center relative p-4">
                {/* Soft Gradient Background Blob */}
                <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-200/50 via-purple-200/40 to-transparent dark:from-indigo-900/30 dark:via-purple-900/20 blur-3xl pointer-events-none" />

                {/* Phone Mockup Frame */}
                <div className="relative w-full max-w-[310px] bg-white dark:bg-[#111827] rounded-[36px] p-5 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.22)] border border-slate-200/80 dark:border-slate-800 rotate-1 sm:rotate-2 hover:rotate-0 transition-transform duration-500">
                  {/* Phone Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                        Today
                      </span>
                      <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                        Mon, 20 May
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Bell className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Timetable Cards */}
                  <div className="flex flex-col gap-3 pt-4">
                    {/* Card 1 */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-[#6366F1] dark:text-[#818CF8]">
                          09:00
                        </span>
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                          Data Structures
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium">Room 201</span>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 text-[#6366F1] flex items-center justify-center shadow-sm">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-sky-600 dark:text-sky-400">
                          11:00
                        </span>
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                          Digital Logic
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium">Room 105</span>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 text-sky-600 flex items-center justify-center shadow-sm">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          02:00
                        </span>
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                          DBMS Lab
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium">Lab 3</span>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 flex items-center justify-center shadow-sm">
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

                {/* Accent Dash / Dot line indicator */}
                <div className="flex items-center gap-1.5 my-1">
                  <div className="w-8 h-1 bg-[#6366F1] rounded-full" />
                  <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full" />
                </div>

                <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-400 font-medium leading-relaxed max-w-md">
                  Get your timetable, tasks and deadlines in one clean view so you never miss a thing.
                </p>
              </div>

              {/* Right Column: 3D Calendar & Tasks Visual */}
              <div className="lg:col-span-6 flex items-center justify-center relative p-4">
                <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-purple-200/50 via-indigo-200/40 to-transparent dark:from-purple-900/30 blur-3xl pointer-events-none" />

                <div className="relative w-full max-w-[340px] flex flex-col gap-4">
                  {/* 3D Calendar Top Card */}
                  <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.2)] border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-200 dark:bg-indigo-900" />
                        <div className="w-3 h-3 rounded-full bg-indigo-200 dark:bg-indigo-900" />
                        <div className="w-3 h-3 rounded-full bg-indigo-200 dark:bg-indigo-900" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#6366F1]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Real-time</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400">Mon</div>
                      <div className="p-2.5 rounded-xl bg-[#6366F1] text-white shadow-md shadow-indigo-500/20 flex flex-col items-center">
                        <span>Tue</span>
                        <Check className="w-3 h-3 mt-1" />
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Wed</div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Thu</div>
                    </div>
                  </div>

                  {/* Tasks Card Overlapping */}
                  <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 shadow-xl border border-slate-200/80 dark:border-slate-800 ml-4 -mt-2">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white mb-2.5 block">
                      Tasks
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <div className="w-4 h-4 rounded bg-[#6366F1] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="line-through text-slate-400">Submit ML Report</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <div className="w-4 h-4 rounded bg-[#6366F1] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Prepare for DE Quiz</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" />
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#6366F1] flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                  <Backpack className="w-6 h-6" />
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
                  Carry smart.{' '}
                  <span className="text-[#6366F1] dark:text-[#818CF8]">Be prepared.</span>
                </h1>

                {/* Accent Dash / Dot line indicator */}
                <div className="flex items-center gap-1.5 my-1">
                  <div className="w-8 h-1 bg-[#6366F1] rounded-full" />
                  <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full" />
                </div>

                <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-400 font-medium leading-relaxed max-w-md">
                  Know what to carry for your classes and labs, every day.
                </p>
              </div>

              {/* Right Column: 3D Backpack & Checklist Card */}
              <div className="lg:col-span-6 flex items-center justify-center relative p-4">
                <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-200/50 via-purple-200/40 to-transparent dark:from-indigo-900/30 blur-3xl pointer-events-none" />

                <div className="relative w-full max-w-[340px] flex flex-col gap-3.5 bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.22)] border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-[#6366F1] flex items-center justify-center">
                        <Backpack className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                        Things to carry
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#6366F1] bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                      Auto-calculated
                    </span>
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
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                              row.packed
                                ? 'bg-[#6366F1] text-white shadow-sm'
                                : 'border border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {row.packed && <Check className="w-3 h-3" />}
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              row.packed
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {row.item}
                          </span>
                        </div>
                        <div className="w-10 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800" />
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
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-8 bg-[#6366F1] shadow-sm'
                  : 'w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Button: Next or Get Started */}
        <button
          onClick={handleNext}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] active:scale-95 text-white font-bold text-sm sm:text-base py-3 px-6 sm:px-8 rounded-full shadow-lg shadow-indigo-500/25 transition-all duration-200"
        >
          {currentIndex === 2 ? 'Get Started' : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
