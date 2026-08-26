'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  const isSuccess = toastMessage?.type === 'success';
  const isWarning = toastMessage?.type === 'warning';

  const accentColor = isSuccess
    ? 'text-emerald-700 dark:text-emerald-400'
    : isWarning
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-sky-700 dark:text-sky-400';

  const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : Info;

  return (
    <div className="fixed inset-x-0 top-8 sm:top-10 z-[200] pointer-events-none flex justify-center px-6">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage.title + toastMessage.message}
            initial={{ opacity: 0, y: -32, scale: 0.92, rotate: -1 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, rotate: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="pointer-events-auto relative w-full max-w-sm select-none"
          >
            {/* Paper card */}
            <div
              className="relative bg-[#FEFCF5] dark:bg-[#1c1a13] border border-black/15 dark:border-white/15 px-5 py-4 text-left overflow-hidden"
              style={{ boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.10)' }}
            >
              {/* Torn top-left corner */}
              <div
                className="absolute top-0 left-0 w-4 h-4 bg-white dark:bg-zinc-950"
                style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
              />

              {/* Icon + Title */}
              <div className={`flex items-center gap-2 mb-0.5 ${accentColor}`}>
                <Icon size={17} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                <span className="font-cursive text-[24px] font-bold leading-tight text-black dark:text-white">
                  {toastMessage.title}
                </span>
              </div>

              {/* Message */}
              {toastMessage.message && (
                <p className="font-cursive text-[18px] text-black/60 dark:text-white/55 leading-snug pl-[25px]">
                  {toastMessage.message}
                </p>
              )}

              {/* Decorative ruled lines */}
              <div className="absolute bottom-2.5 left-5 right-5 flex flex-col gap-[6px] pointer-events-none opacity-[0.06]">
                <div className="h-px bg-black dark:bg-white" />
                <div className="h-px bg-black dark:bg-white" />
                <div className="h-px bg-black dark:bg-white" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

