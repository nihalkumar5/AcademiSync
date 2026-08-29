'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Info, AlertTriangle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  const isSuccess = toastMessage?.type === 'success';
  const isWarning = toastMessage?.type === 'warning';
  const isError = toastMessage?.type === 'error';

  let accentColor = 'text-[#6F6F6F] dark:text-[#A0A0A0]';
  let progressColor = 'bg-[#6F6F6F] dark:bg-[#A0A0A0]';
  let Icon = Info;

  if (isSuccess) {
    accentColor = 'text-[#10B981]'; // Emerald 500
    progressColor = 'bg-[#10B981]';
    Icon = Check;
  } else if (isWarning) {
    accentColor = 'text-[#F59E0B]'; // Amber 500
    progressColor = 'bg-[#F59E0B]';
    Icon = AlertTriangle;
  } else if (isError) {
    accentColor = 'text-[#EF4444]'; // Red 500
    progressColor = 'bg-[#EF4444]';
    Icon = AlertTriangle;
  }

  return (
    <div className="fixed bottom-[10vh] left-0 right-0 z-[9999] pointer-events-none flex justify-center px-4">
      <AnimatePresence mode="wait">
        {toastMessage && (
          <motion.div
            key={toastMessage.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="pointer-events-auto select-none overflow-hidden bg-white dark:bg-[#1A1A1A] shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] rounded-none"
          >
            <div className="flex flex-col">
              <div className="flex items-start gap-3 px-4 py-3.5">
                <Icon size={16} strokeWidth={2.5} className={`shrink-0 mt-[1px] ${accentColor}`} />
                <div className="flex flex-col pr-2">
                  <span className="text-[13px] font-semibold text-[#111111] dark:text-[#FFFFFF] leading-snug">
                    {toastMessage.title}
                  </span>
                  {toastMessage.message && (
                    <span className="text-[11px] text-[#6F6F6F] mt-0.5 leading-relaxed max-w-[240px]">
                      {toastMessage.message}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Animated Progress Line */}
              <div className="h-[2px] w-full bg-transparent">
                <motion.div 
                  className={`h-full origin-left ${progressColor}`}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 2.3, ease: "linear" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
