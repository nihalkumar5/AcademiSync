'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  return (
    <div className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl border border-zinc-800 dark:border-zinc-200 max-w-sm text-left"
          >
            <div className="shrink-0 mt-0.5">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              ) : toastMessage.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 dark:text-blue-600" />
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-semibold tracking-tight leading-none">
                {toastMessage.title}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1 leading-snug">
                {toastMessage.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
