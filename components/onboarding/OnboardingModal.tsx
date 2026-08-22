'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, CheckSquare, Bell, Sparkles } from 'lucide-react';
import Image from 'next/image';

const slides = [
  {
    id: 1,
    bg: '/onboarding/w1.jpeg',
    iconType: 'logo',
    titleMain: 'Welcome to',
    titleAccent: 'intersemester.',
    description: 'Your all-in-one planner to manage classes, tasks and deadlines effortlessly.',
  },
  {
    id: 2,
    bg: '/onboarding/w2.jpeg',
    iconType: 'calendar',
    titleMain: 'Plan your',
    titleAccent: 'day.',
    description: 'Create a timetable that fits your classes and schedule perfectly.',
  },
  {
    id: 3,
    bg: '/onboarding/w3.jpeg',
    iconType: 'tasks',
    titleMain: 'Stay on top of',
    titleAccent: 'your tasks.',
    description: 'Add tasks, set priorities and track your progress every single day.',
  },
  {
    id: 4,
    bg: '/onboarding/w4.jpeg',
    iconType: 'bell',
    titleMain: 'Never miss a',
    titleAccent: 'deadline.',
    description: 'Get timely reminders and stay organized so you can focus on what matters.',
  },
];

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, setShowOnboarding, profile, updateProfile } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Preload all onboarding background images immediately on mount for zero-lag transitions
  useEffect(() => {
    slides.forEach((slide) => {
      const img = new window.Image();
      img.src = slide.bg;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleFinish = () => {
    updateProfile({ ...profile, onboardingCompleted: true });
    setShowOnboarding(false);
  };

  if (!showOnboarding) return null;

  const currentSlide = slides[currentIndex];

  const renderIcon = (type: string) => {
    if (type === 'logo') {
      return (
        <motion.div
          initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
          animate={{
            scale: 1,
            rotate: 0,
            opacity: 1,
          }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
          className="w-12 h-12 sm:w-13 sm:h-13 aspect-square shrink-0 rounded-2xl bg-gradient-to-br from-[#A27E5C] via-[#8E6C4C] to-[#75553A] text-[#FDF8F4] flex items-center justify-center font-black text-2xl tracking-tighter shadow-md shadow-[#75553A]/25 border-2 border-[#C9B099]/80 relative overflow-hidden"
        >
          <motion.span
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          >
            is
          </motion.span>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
        </motion.div>
      );
    }

    const iconClass = 'w-6 h-6 text-[#6E4F36]';
    return (
      <motion.div
        initial={{ scale: 0.5, rotate: 8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 20 }}
        className="w-12 h-12 sm:w-13 sm:h-13 aspect-square shrink-0 rounded-2xl border-2 border-[#D5C1AE] bg-[#EADBCA]/85 backdrop-blur-md flex items-center justify-center shadow-sm shadow-[#8C6B5D]/10"
      >
        {type === 'calendar' && (
          <motion.div
            animate={{ rotate: [0, -6, 6, -3, 3, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, repeatDelay: 1 }}
          >
            <Calendar className={iconClass} strokeWidth={2.4} />
          </motion.div>
        )}
        {type === 'tasks' && (
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, repeatDelay: 1 }}
          >
            <CheckSquare className={iconClass} strokeWidth={2.4} />
          </motion.div>
        )}
        {type === 'bell' && (
          <motion.div
            animate={{
              rotate: [0, -18, 16, -14, 12, -8, 5, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.8,
              repeatDelay: 1.5,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: 'top center' }}
          >
            <Bell className={iconClass} strokeWidth={2.4} />
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Slide animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.28 },
        scale: { duration: 0.3 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-6 select-none font-sans overflow-hidden">
      {/* Hidden preloader images in DOM to keep warm in cache */}
      <div className="hidden">
        {slides.map((s) => (
          <img key={s.id} src={s.bg} alt="preload" />
        ))}
      </div>

      <div className="relative w-full h-full sm:w-[420px] sm:h-[860px] sm:max-h-[92dvh] sm:rounded-[2.75rem] overflow-hidden bg-[#F2E8DB] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border sm:border-[#DECBB8]">
        
        {/* Animated Background Layer */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`bg-${currentIndex}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40) handleNext();
              else if (info.offset.x > 40) handlePrev();
            }}
          >
            <Image
              src={currentSlide.bg}
              alt="Onboarding"
              fill
              unoptimized
              priority
              className="object-cover pointer-events-none select-none"
            />
          </motion.div>
        </AnimatePresence>

        {/* Top Floating Header with Skip */}
        <div className="absolute top-0 inset-x-0 pt-4 sm:pt-6 px-6 sm:px-8 flex justify-end items-center z-20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFinish}
            className="text-[#664F3C] hover:text-[#2C2016] font-semibold text-sm tracking-wide px-3 py-1 rounded-full hover:bg-black/5 active:bg-black/10 transition-all cursor-pointer touch-manipulation"
          >
            Skip
          </motion.button>
        </div>

        {/* Dynamic Animated Content Container with Right-Aligned Square Icon */}
        <div className="absolute top-0 inset-x-0 pt-10 sm:pt-14 px-7 sm:px-8 z-20 flex flex-col pointer-events-none">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`text-${currentIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-2 text-left"
            >
              {/* Row with Title on Left, Perfect Square Icon Badge on Right */}
              <div className="flex items-start justify-between gap-3">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                  className="text-[26px] sm:text-[29px] leading-[1.12] font-black tracking-tight text-[#2B1F16]"
                >
                  <span>{currentSlide.titleMain}</span>
                  <br />
                  <span className="text-[#96725B] drop-shadow-sm">
                    {currentSlide.titleAccent}
                  </span>
                </motion.h1>

                {/* Right-aligned Square Icon */}
                <div className="shrink-0 pt-0.5">
                  {renderIcon(currentSlide.iconType)}
                </div>
              </div>

              {/* Description Paragraph */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.1, ease: 'easeOut' }}
                className="text-[#6E5643] text-[13.5px] sm:text-[14.5px] leading-snug font-medium max-w-[270px] sm:max-w-[290px] mt-0.5"
              >
                {currentSlide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Interactive Navigation Bar */}
        <div className="absolute bottom-0 inset-x-0 p-7 sm:p-8 flex items-center justify-between z-20">
          {/* Animated and Generously Clickable Indicator Dots */}
          <div className="flex items-center gap-1.5 pl-1">
            {slides.map((s, i) => {
              const isActive = i === currentIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setDirection(i > currentIndex ? 1 : -1);
                    setCurrentIndex(i);
                  }}
                  className="p-3 -m-1.5 flex items-center justify-center cursor-pointer focus:outline-none touch-manipulation group"
                  aria-label={`Go to slide ${i + 1}`}
                >
                  <motion.div
                    animate={{
                      width: isActive ? 28 : 8,
                      backgroundColor: isActive ? '#8C6B5D' : '#D1BCA9',
                      opacity: isActive ? 1 : 0.6,
                    }}
                    whileHover={{ scale: 1.25, opacity: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="h-2.5 rounded-full"
                  />
                </button>
              );
            })}
          </div>

          {/* Next Floating Spring Button */}
          <motion.button
            whileHover={{ scale: 1.08, shadow: '0px 10px 20px rgba(140, 107, 93, 0.4)' }}
            whileTap={{ scale: 0.92 }}
            onClick={handleNext}
            className="w-14 h-14 rounded-full bg-[#8C6B5D] hover:bg-[#7A5B4D] active:bg-[#684C3F] flex items-center justify-center text-[#FDF8F4] transition-colors shadow-[0_8px_20px_rgba(140,107,93,0.35)] focus:outline-none cursor-pointer touch-manipulation"
            aria-label="Next slide"
          >
            <motion.div
              key={currentIndex === slides.length - 1 ? 'finish' : 'next'}
              initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {currentIndex === slides.length - 1 ? (
                <Sparkles className="w-6 h-6" />
              ) : (
                <ArrowRight className="w-6 h-6" strokeWidth={2.4} />
              )}
            </motion.div>
          </motion.button>
        </div>

      </div>
    </div>
  );
};
