'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Toast } from '@/components/ui/Toast';
import { IntersemesterLogo } from '@/components/ui/IntersemesterLogo';

// Views
import { OverviewHeader } from '@/components/dashboard/OverviewHeader';
import { LiveClassCard } from '@/components/dashboard/LiveClassCard';
import { TodayTimeline } from '@/components/dashboard/TodayTimeline';
import { SmartFocusList } from '@/components/dashboard/SmartFocusList';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';
import { ExamsView } from '@/components/exams/ExamsView';
import { HomeworkView } from '@/components/homework/HomeworkView';
import { TomorrowCarryView } from '@/components/carry/TomorrowCarryView';
import { SubjectListView } from '@/components/subjects/SubjectListView';
import { AcademicCalendar } from '@/components/calendar/AcademicCalendar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { SettingsView } from '@/components/settings/SettingsView';

import { motion, AnimatePresence } from 'framer-motion';

export default function AppHome() {
  const { activeView, isHydrated } = useApp();

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7FA] dark:bg-[#0B0F19] overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#6366F1]/10 rounded-full blur-[64px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 relative z-10"
        >
          {/* Animated Monogram */}
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <IntersemesterLogo size="lg" showTagline={false} />
            </motion.div>
          </div>
          
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-[11px] font-bold text-[#6366F1] uppercase tracking-[0.25em]"
          >
            Loading Workspace
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-transparent text-[#181716] dark:text-[#F4F1EA]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 pb-20 md:pb-8">
        <Header />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full relative">
          <div className="w-full" key={activeView}>
            {activeView === 'home' && (
              <div className="flex flex-col gap-6">
                <OverviewHeader />
                <LiveClassCard />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <TodayTimeline />
                  <SmartFocusList />
                </div>
              </div>
            )}

            {activeView === 'timetable' && <WeeklyTimetable />}
            {activeView === 'homework' && <HomeworkView />}
            {activeView === 'exams' && <ExamsView />}
            {activeView === 'carry' && <TomorrowCarryView />}
            {activeView === 'subjects' && <SubjectListView />}
            {activeView === 'calendar' && <AcademicCalendar />}
            {activeView === 'notifications' && <NotificationCenter />}
            {activeView === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Mobile Navigation Dock */}
      <MobileNav />

      {/* Overlays & Modals */}
      <CommandPalette />
      <OnboardingModal />
      <Toast />
    </div>
  );
}
