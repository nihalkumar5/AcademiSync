'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashLoader = () => {
  const [dots, setDots] = useState('');

  // Animated dots for the "Loading" text
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFBF7] dark:bg-[#0D0C0B] overflow-hidden relative select-none">
      {/* Soft warm glowing background spheres */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#8C6B5D]/5 dark:bg-[#8C6B5D]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[200px] h-[200px] bg-[#DFD6CA]/15 dark:bg-[#2C2926]/20 rounded-full blur-[60px] pointer-events-none" />

      <div className="flex flex-col items-center gap-8 relative z-10">
        
        {/* Animated Graduation Hat SVG Container */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Circular Glowing Ring behind the Hat */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute w-28 h-28 rounded-full border border-dashed border-[#8C6B5D]/40 dark:border-[#8C6B5D]/60"
          />

          {/* Floating Outer Circle */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute w-24 h-24 rounded-full border-2 border-[#8C6B5D]/10 dark:border-[#8C6B5D]/20"
          />

          {/* The Graduation Cap SVG */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, -3, 3, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2.5, 
              ease: "easeInOut" 
            }}
            className="relative z-10 w-20 h-20 text-[#8C6B5D]"
          >
            <svg
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-full h-full drop-shadow-[0_4px_12px_rgba(140,107,93,0.25)]"
            >
              {/* Mortarboard Diamond (Cap Top) */}
              <polygon 
                points="50,20 90,40 50,60 10,40" 
                className="fill-[#FAF6F0] dark:fill-[#1C1A18] stroke-[#8C6B5D]"
                strokeWidth="4.5"
              />
              
              {/* Cap Skull/Base */}
              <path 
                d="M26,48 L26,62 C26,72 74,72 74,62 L74,48" 
                className="fill-[#EFEAE2] dark:fill-[#282522] stroke-[#8C6B5D]"
                strokeWidth="4"
              />

              {/* Tassel String */}
              <motion.path 
                d="M50,40 C35,42 32,54 32,64" 
                strokeWidth="3.5"
                animate={{ 
                  d: [
                    "M50,40 C35,42 32,54 32,64",
                    "M50,40 C36,43 35,55 35,64",
                    "M50,40 C35,42 32,54 32,64"
                  ]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2.5, 
                  ease: "easeInOut" 
                }}
              />

              {/* Tassel Fringe/Brush */}
              <motion.circle 
                cx="32" 
                cy="66" 
                r="3.5" 
                className="fill-[#8C6B5D] stroke-[#8C6B5D]" 
                animate={{ 
                  cx: [32, 35, 32],
                  cy: [66, 65, 66]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2.5, 
                  ease: "easeInOut" 
                }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Text Area */}
        <div className="flex flex-col items-center gap-1.5 mt-2">
          {/* Logo Name */}
          <div className="flex items-center text-xl tracking-tight">
            <span className="font-black text-[#1A1918] dark:text-[#F4F1EA]">inter</span>
            <span className="font-normal text-[#8C6B5D] opacity-85">semester</span>
          </div>
          
          {/* Animated Loading Text */}
          <p className="text-[10px] font-bold text-[#8C6B5D] uppercase tracking-[0.25em] h-4">
            Loading Workspace{dots}
          </p>
        </div>

        {/* Premium thin line loading progress indicator */}
        <div className="w-36 h-[2px] bg-[#EFEAE2] dark:bg-[#282522] rounded-full overflow-hidden mt-1">
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
            className="relative w-1/2 h-full bg-[#8C6B5D] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
