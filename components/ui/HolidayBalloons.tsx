'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BALLOON_COLORS = [
  'bg-rose-400 dark:bg-rose-500',
  'bg-sky-400 dark:bg-sky-500',
  'bg-amber-400 dark:bg-amber-500',
  'bg-emerald-400 dark:bg-emerald-500',
  'bg-pink-400 dark:bg-pink-500',
  'bg-violet-400 dark:bg-violet-500',
];

interface BalloonProps {
  delay: number;
  left: string;
  color: string;
}

const Balloon: React.FC<BalloonProps> = ({ delay, left, color }) => {
  return (
    <motion.div
      initial={{ y: '110vh', rotate: 0, opacity: 0.9 }}
      animate={{
        y: '-20vh',
        x: [0, 15, -15, 10, 0],
        rotate: [0, 5, -5, 3, 0],
      }}
      transition={{
        y: { duration: 7, delay, ease: 'linear' },
        x: { duration: 7, delay, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 7, delay, repeat: Infinity, ease: 'easeInOut' },
      }}
      style={{ left }}
      className="fixed bottom-0 z-[9999] flex flex-col items-center select-none pointer-events-none"
    >
      {/* Balloon Body */}
      <div className={`w-14 h-16 sm:w-16 sm:h-20 rounded-full ${color} relative shadow-lg shadow-black/5 dark:shadow-white/5`}>
        {/* Reflection Highlight */}
        <div className="absolute top-2 left-3 w-3.5 h-7 bg-white/35 rounded-full" />
        {/* Knot */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-inherit rotate-45" />
      </div>
      {/* String */}
      <div className="w-0.5 h-16 sm:h-20 bg-black/20 dark:bg-white/20" />
    </motion.div>
  );
};

export const HolidayBalloons: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Automatically hide/cleanup the balloons overlay after all balloons float off-screen
    const timer = setTimeout(() => {
      setVisible(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[9999] select-none">
      <Balloon delay={0.2} left="12%" color={BALLOON_COLORS[0]} />
      <Balloon delay={0.9} left="32%" color={BALLOON_COLORS[1]} />
      <Balloon delay={1.6} left="52%" color={BALLOON_COLORS[2]} />
      <Balloon delay={0.5} left="72%" color={BALLOON_COLORS[3]} />
      <Balloon delay={2.1} left="22%" color={BALLOON_COLORS[4]} />
      <Balloon delay={1.3} left="88%" color={BALLOON_COLORS[5]} />
    </div>
  );
};
