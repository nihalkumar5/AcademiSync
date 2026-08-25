'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  return (
    <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-black/70 backdrop-blur-2xl text-white shadow-[0_14px_36px_rgba(0,0,0,0.25)] border border-white/20 rounded-full max-w-[92vw] sm:max-w-lg select-none ring-1 ring-white/10"
          >
            {/* Status Indicator Icon */}
            <div className="shrink-0 flex items-center justify-center">
              {toastMessage.type === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              ) : toastMessage.type === 'warning' ? (
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 dark:text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 dark:text-cyan-600 flex items-center justify-center">
                  <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )}
            </div>

            {/* Text Content */}
            <div className="flex items-center gap-2 min-w-0 pr-1 text-left">
              <span className="text-xs font-bold tracking-tight font-sans whitespace-nowrap">
                {toastMessage.title}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/30 dark:bg-black/30 shrink-0" />
              <span className="text-[11.5px] opacity-75 truncate max-w-[200px] sm:max-w-[320px] font-normal">
                {toastMessage.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
