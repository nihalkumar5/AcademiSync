'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, ArrowDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export const IOSAppGate: React.FC = () => {
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS devices (iPhone, iPad, iPod)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !/Macintosh/i.test(navigator.userAgent);
    
    // Detect standalone PWA mode or native Capacitor app
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches ||
      Capacitor.isNativePlatform();

    // Session bypass check
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

  const steps = [
    {
      num: '01',
      icon: Share,
      title: 'Tap the Share button',
      detail: 'Located in Safari’s bottom toolbar (the square with an arrow pointing up).',
    },
    {
      num: '02',
      icon: PlusSquare,
      title: 'Select "Add to Home Screen"',
      detail: 'Scroll down the action sheet menu and tap Add to Home Screen.',
    },
    {
      num: '03',
      icon: CheckCircle2,
      title: 'Tap "Add" & launch',
      detail: 'Tap Add in the top-right corner, then open Intersemester from your home screen.',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-[#FAFAF8] dark:bg-[#111110] text-[#111111] dark:text-[#FFFFFF] flex flex-col justify-between px-6 py-6 sm:px-10 sm:py-8 overflow-y-auto font-sans"
        style={{ minHeight: '100dvh' }}
      >
        {/* Top Header */}
        <div 
          className="w-full flex items-center justify-between shrink-0 border-b border-[#EBEBE8] dark:border-[#222222] pb-4"
          style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px)), 8px)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-black/10 dark:border-white/15 shadow-sm shrink-0">
              <img 
                src="/logo51.png" 
                alt="Intersemester Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold tracking-tight uppercase leading-none">
                Intersemester
              </span>
              <span className="text-[9.5px] font-mono tracking-widest text-[#888888] uppercase mt-0.5">
                iOS Edition
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.05] text-[10px] font-mono font-bold uppercase tracking-wider text-[#666666] dark:text-[#AAAAAA]">
            <Sparkles className="w-3 h-3 text-[#111111] dark:text-[#FFFFFF]" />
            <span>PWA Experience</span>
          </div>
        </div>

        {/* Center Hero Section */}
        <div className="flex flex-col items-center text-center my-auto py-6 max-w-md mx-auto w-full">
          {/* iOS Icon Preview Card */}
          <div className="relative mb-6">
            <div className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] rounded-[22px] overflow-hidden border border-black/15 dark:border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)] bg-[#111111] dark:bg-[#181818] p-0.5">
              <img 
                src="/logo51.png" 
                alt="Intersemester App Icon" 
                className="w-full h-full object-cover rounded-[20px]"
              />
            </div>
            {/* Subtle backlight ring */}
            <div className="absolute -inset-2 bg-gradient-to-b from-black/5 to-black/10 dark:from-white/10 dark:to-transparent rounded-[28px] blur-lg -z-10" />
          </div>

          {/* Typography */}
          <div className="text-[11px] font-mono font-bold tracking-[2px] text-[#888888] uppercase mb-2">
            Home Screen Installation
          </div>

          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-[1.15] mb-3 text-[#111111] dark:text-[#FFFFFF]">
            Install Intersemester<br />on your iPhone
          </h1>

          <p className="text-[13px] sm:text-[14px] text-[#666666] dark:text-[#9E9E9E] font-medium leading-relaxed mb-7 max-w-sm">
            Enjoy full-screen schedules, zero browser bars, instant alerts, and seamless batch synchronization.
          </p>

          {/* Minimalist Brutalist Steps */}
          <div className="w-full flex flex-col gap-2.5 text-left">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div 
                  key={step.num}
                  className="p-3.5 bg-white dark:bg-[#181818] border border-[#D9D9D6] dark:border-[#2C2C2C] flex items-start gap-3.5 shadow-none transition-all"
                >
                  <div className="w-7 h-7 shrink-0 bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] flex items-center justify-center font-mono font-bold text-[11px]">
                    {step.num}
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                      <span>{step.title}</span>
                      <Icon className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                    </div>
                    <p className="text-[12px] text-[#666666] dark:text-[#999999] leading-snug mt-0.5">
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar Indicator & Bypass */}
        <div 
          className="flex flex-col items-center gap-3 pt-4 shrink-0"
          style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px)), 8px)' }}
        >
          <div className="flex items-center gap-2 text-xs text-[#555555] dark:text-[#AAAAAA] font-medium animate-bounce">
            <ArrowDown className="w-4 h-4 text-[#111111] dark:text-[#FFFFFF]" />
            <span>Tap the Share button at the bottom of Safari</span>
          </div>

          <button
            type="button"
            onClick={handleBypass}
            className="text-[11px] font-mono uppercase tracking-wider text-[#888888] hover:text-[#111111] dark:hover:text-[#FFFFFF] underline underline-offset-4 cursor-pointer transition-colors py-1"
          >
            Continue in browser for this session ➜
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
