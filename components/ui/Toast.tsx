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
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage.title + toastMessage.message}
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto select-none"
          >
            <div className="bg-[#FEFCF5] dark:bg-[#1c1a13] border border-black/12 dark:border-white/12 px-5 py-3.5 text-left"
              style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.07)' }}
            >
              {/* Icon + Title */}
              <div className={`flex items-center gap-2 ${accentColor}`}>
                <Icon size={14} strokeWidth={2.5} className="shrink-0" />
                <span className="font-cursive text-[21px] font-bold leading-tight text-black dark:text-white">
                  {toastMessage.title}
                </span>
              </div>

              {/* Message */}
              {toastMessage.message && (
                <p className="font-cursive text-[16px] text-black/55 dark:text-white/50 leading-snug pl-[22px] mt-0.5 max-w-[260px]">
                  {toastMessage.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

