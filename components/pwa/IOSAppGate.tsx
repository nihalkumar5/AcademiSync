'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, Smartphone, ArrowDown, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { IntersemesterLogo } from '@/components/ui/IntersemesterLogo';

export const IOSAppGate: React.FC = () => {
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if device is iOS (iPhone/iPad/iPod)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !/Macintosh/i.test(navigator.userAgent);
    
    // Check if running as Standalone PWA or native app
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches ||
      Capacitor.isNativePlatform();

    // Check if temporarily bypassed in current session
    const isTempBypassed = sessionStorage.getItem('ios_gate_bypassed') === 'true';

    if (isIOS && !isStandalone && !isTempBypassed) {
      setIsIOSBrowser(true);
    }
  }, []);

  if (!isIOSBrowser || dismissed) return null;

  const handleBypass = () => {
    try {
      sessionStorage.setItem('ios_gate_bypassed', 'true');
    } catch (_) {}
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-[#FAFAF8] dark:bg-[#111110] text-[#111111] dark:text-[#FFFFFF] flex flex-col justify-between p-6 sm:p-8 overflow-y-auto"
        style={{ minHeight: '100dvh' }}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black font-black text-sm">
              IS
            </div>
            <span className="text-[13px] font-bold tracking-[1.5px] uppercase">
              Intersemester
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10">
            iOS App
          </span>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center text-center my-auto py-8 max-w-md mx-auto w-full">
          {/* App Icon Glow */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#2A2A2A] to-[#111111] dark:from-[#FFFFFF] dark:to-[#E5E5E5] p-0.5 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#181818] dark:bg-[#FFFFFF] flex items-center justify-center">
                <IntersemesterLogo className="w-10 h-10 text-white dark:text-black" />
              </div>
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-xl -z-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/5 dark:bg-white/10 rounded-full text-[11px] font-bold text-[#6F6F6F] dark:text-[#A0A0A0] uppercase tracking-wider mb-3">
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone App Installation</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-3">
            Install Intersemester on your iPhone
          </h1>

          <p className="text-[13.5px] sm:text-[14px] text-[#6F6F6F] dark:text-[#999999] leading-relaxed mb-8 max-w-sm">
            To get live class alerts, widget syncing, and the full-screen experience, install the app directly to your Home Screen.
          </p>

          {/* Step by Step Visual Guide */}
          <div className="w-full flex flex-col gap-3 text-left">
            {/* Step 1 */}
            <div className="p-4 bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#2C2C2C] flex items-center gap-4 shadow-sm">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Share className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Step 1</span>
                <span className="text-[13px] font-bold leading-snug">
                  Tap the <span className="text-blue-600 dark:text-blue-400 font-black">Share</span> icon in Safari bottom bar
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#2C2C2C] flex items-center gap-4 shadow-sm">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <PlusSquare className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Step 2</span>
                <span className="text-[13px] font-bold leading-snug">
                  Scroll down & select <span className="font-black">&quot;Add to Home Screen&quot;</span>
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-white dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#2C2C2C] flex items-center gap-4 shadow-sm">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Step 3</span>
                <span className="text-[13px] font-bold leading-snug">
                  Tap <span className="font-black">&quot;Add&quot;</span> and launch from your Home Screen!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Prompt & Arrow */}
        <div className="flex flex-col items-center gap-4 pb-2 pt-4">
          <div className="flex items-center gap-2 text-xs text-[#6F6F6F] animate-bounce">
            <ArrowDown className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Tap Share button at the bottom of your screen</span>
          </div>

          <button
            type="button"
            onClick={handleBypass}
            className="text-[11px] font-bold uppercase tracking-wider text-[#888888] hover:text-[#111111] dark:hover:text-[#FFFFFF] underline underline-offset-4 cursor-pointer transition-colors py-1"
          >
            Continue in browser for this session
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
