'use client';

import React from 'react';
import { motion } from 'framer-motion';

/** Full-screen frame shared by the Android and iOS "get the app" gates. */
export const GateShell: React.FC<{ label: string; art: React.ReactNode; children: React.ReactNode }> = ({ label, art, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 z-[99999] bg-canvas text-fg flex flex-col font-sans overflow-hidden w-full h-[100dvh]"
    role="dialog"
    aria-modal="true"
    aria-label={label}
  >
    <header
      className="shrink-0 flex items-center justify-center pb-2"
      style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 10px), 22px)' }}
    >
      <span className="text-[22px] leading-none tracking-tighter" aria-label="intersemester">
        <span className="font-extrabold">inter</span>
        <span className="font-normal opacity-80">semester</span>
      </span>
    </header>

    <div className="relative flex-1 min-h-0 flex items-center justify-center px-6 pt-3 pb-6 overflow-hidden">
      <div className="h-full max-h-[430px] w-full">{art}</div>
    </div>

    <div
      className="shrink-0"
      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 16px), 22px)' }}
    >
      <div className="w-full max-w-[440px] mx-auto px-6">{children}</div>
    </div>
  </motion.div>
);
