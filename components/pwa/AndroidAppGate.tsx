'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ExternalLink, Sparkles, Bell, Calendar, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export const AndroidAppGate: React.FC = () => {
  const [isAndroidBrowser, setIsAndroidBrowser] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect Android devices
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // Detect standalone PWA mode or native Capacitor app
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches ||
      Capacitor.isNativePlatform();

    // Detect preview mode (?preview=android in URL)
    const isPreview = new URLSearchParams(window.location.search).get('preview') === 'android';

    if (isPreview) {
      setIsAndroidBrowser(true);
      return;
    }

    // Session bypass check (for admin previews if needed)
    const isTempBypassed = sessionStorage.getItem('android_gate_bypassed') === 'true';

    if (isAndroid && !isStandalone && !isTempBypassed) {
      setIsAndroidBrowser(true);
    }
  }, []);

  if (!isAndroidBrowser || dismissed) return null;

  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.intersemester.app';
  const intentUrl = `intent://open#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-white text-[#111111] flex flex-col font-sans overflow-hidden w-full h-[100dvh]"
      >
        {/* Top Header - Intersemester Minimalist Branding */}
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
          {/* Hero Illustration */}
          <div className="flex-1 min-h-0 w-full flex items-end justify-center overflow-visible bg-white px-4">
            <img 
              src="/onboard-1.png" 
              alt="Intersemester Android App" 
              className="w-full h-full object-contain object-bottom pointer-events-none translate-y-[5%] scale-[1.15] sm:scale-[1.25]"
            />
          </div>

          {/* Bottom Card */}
          <div className="w-full px-7 sm:px-8 flex flex-col gap-2 pb-5 bg-[#F4F4F4] shrink-0 z-10 relative rounded-t-[36px] pt-6 -mt-6">
            <h2 className="text-[26px] sm:text-[28px] leading-[1.1] font-bold text-[#111111]">
              Get the Android App.
            </h2>
            <p className="text-[13px] text-[#111111]/65 font-medium leading-snug mb-1">
              Live timetable sync, class alerts, exam countdowns & mess menu are available in the official mobile app.
            </p>

            {/* 3 Feature Highlights */}
            <div className="flex flex-col gap-1.5 my-1">
              <div className="flex items-center gap-3 py-1.5 border-b border-black/5">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                  <Calendar className="w-3.5 h-3.5 text-[#111111]" />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111111]">
                  <span>Live Timetable:</span>
                  <span className="font-normal text-[#111111]/80">Sync entire class routine & rooms</span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5 border-b border-black/5">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                  <Bell className="w-3.5 h-3.5 text-[#111111]" />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111111]">
                  <span>Instant Alerts:</span>
                  <span className="font-normal text-[#111111]/80">Class cancellations & reschedule notices</span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                  <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111111]">
                  <span>Exams & Mess:</span>
                  <span className="font-normal text-[#111111]/80">Countdown to papers & daily meal dishes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div 
            className="w-full px-6 sm:px-8 pt-3 pb-6 flex flex-col gap-2.5 shrink-0 bg-[#F7F7F5] z-10 relative"
            style={{
              paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)',
            }}
          >
            <a
              href={intentUrl}
              className="w-full py-3.5 bg-[#111111] text-white text-[13px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-sm rounded-none"
            >
              <span>Open in Intersemester App</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-white border-2 border-black text-black text-[12.5px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:bg-black/5 transition-colors cursor-pointer shadow-sm rounded-none"
            >
              <Download className="w-4 h-4" />
              <span>Download on Google Play Store</span>
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
