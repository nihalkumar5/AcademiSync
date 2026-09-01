'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, Check, ArrowDown } from 'lucide-react';
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

    // Detect preview mode (?preview=ios in URL)
    const isPreview = new URLSearchParams(window.location.search).get('preview') === 'ios';

    if (isPreview) {
      setIsIOSBrowser(true);
      return;
    }

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-white text-[#111111] flex flex-col font-sans overflow-hidden w-full h-[100dvh]"
      >
        {/* Top Nav Header - Clean Typography Only (No Icon) */}
        <div 
          className="w-full flex items-center justify-center px-6 pb-3 shrink-0 z-30 border-b border-[#F0F0EE] bg-white"
          style={{
            paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 28px)',
          }}
        >
          <div className="w-full flex flex-col items-center justify-center pt-1">
            <h1 className="text-[24px] font-bold tracking-tighter text-[#111111]">
              inter<span className="font-normal opacity-80">semester</span>
            </h1>
            <div className="w-[24px] h-[1.5px] bg-[#111111] mt-2.5 mb-1.5" />
            <p className="text-[9.5px] tracking-[2.5px] font-mono font-bold text-[#111111]/60 uppercase whitespace-pre-line text-center">
              EVERY ACADEMIC DAY{"\n"}CLEAR & PREDICTABLE.
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full flex flex-col relative overflow-hidden justify-between bg-white">
          {/* Slide Image */}
          <div className="flex-1 min-h-0 w-full flex items-end justify-center overflow-visible bg-white px-4">
            <img 
              src="/heroios.png" 
              alt="Intersemester iOS" 
              className="w-full h-full object-contain object-bottom pointer-events-none translate-y-[5%] scale-[1.22] sm:scale-[1.28]"
            />
          </div>

          {/* Text Card */}
          <div className="w-full px-8 flex flex-col gap-2 pb-5 bg-[#F4F4F4] shrink-0 z-10 relative rounded-t-[40px] pt-6 -mt-6">
            <h2 className="text-[26px] sm:text-[28px] leading-[1.1] font-bold text-[#111111]">
              Install on your iPhone.
            </h2>
            <p className="text-[13px] text-[#111111]/60 font-medium leading-snug mb-1">
              Add Intersemester to your Home Screen for live schedule alerts, widgets, and full-screen experience.
            </p>

            {/* 3 Step List in Intersemester Minimalist Style */}
            <div className="flex flex-col gap-1.5 my-1">
              <div className="flex items-center gap-3 py-1.5 border-b border-black/5">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                  <Share className="w-3.5 h-3.5 text-[#111111]" />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111111]">
                  <span>Step 1:</span>
                  <span className="font-normal text-[#111111]/80">Tap <span className="font-semibold text-blue-600">Share</span> in Safari bottom bar</span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5 border-b border-black/5">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                  <PlusSquare className="w-3.5 h-3.5 text-[#111111]" />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111111]">
                  <span>Step 2:</span>
                  <span className="font-normal text-[#111111]/80">Select <span className="font-semibold">&quot;Add to Home Screen&quot;</span></span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                  <Check className="w-3.5 h-3.5 text-[#111111]" />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111111]">
                  <span>Step 3:</span>
                  <span className="font-normal text-[#111111]/80">Tap <span className="font-semibold">&quot;Add&quot;</span> and launch from Home Screen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div 
            className="w-full px-6 sm:px-8 pt-2 pb-6 flex items-center justify-center shrink-0 bg-[#F7F7F5] z-10 relative"
            style={{
              paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)',
            }}
          >
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#111111]/80 animate-bounce">
              <ArrowDown className="w-4 h-4 text-blue-600" />
              <span>Tap the <strong className="text-blue-600">Share</strong> button at the bottom of Safari</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
