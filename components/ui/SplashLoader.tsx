'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
        
        {/* Animated Wordmark Container */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ 
              scale: [1, 1.04, 1],
              filter: [
                'drop-shadow(0 0 0px rgba(140, 107, 93, 0))',
                'drop-shadow(0 0 12px rgba(140, 107, 93, 0.2))',
                'drop-shadow(0 0 0px rgba(140, 107, 93, 0))'
              ]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2, 
              ease: "easeInOut" 
            }}
            className="flex items-center text-4xl tracking-tight"
          >
            <span className="font-black text-[#1A1918] dark:text-[#F4F1EA]">inter</span>
            <span className="font-normal text-[#8C6B5D] opacity-85">semester</span>
          </motion.div>

          {/* Animated Loading Subtitle */}
          <p className="text-[10px] font-bold text-[#8C6B5D] uppercase tracking-[0.25em] h-4 mt-2">
            Loading Workspace{dots}
          </p>
        </div>

        {/* Premium thin line loading progress indicator */}
        <div className="w-40 h-[2.5px] bg-[#EFEAE2] dark:bg-[#282522] rounded-full overflow-hidden mt-2 relative">
          <motion.div
            animate={{ 
              left: ['-100%', '100%']
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
            className="absolute top-0 w-1/2 h-full bg-[#8C6B5D] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
