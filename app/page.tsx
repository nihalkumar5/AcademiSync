'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Toast } from '@/components/ui/Toast';
import { IntersemesterLogo } from '@/components/ui/IntersemesterLogo';
import { SplashLoader } from '@/components/ui/SplashLoader';

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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen for at least 3 seconds to cover initial webview rendering
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !isHydrated) {
    return <SplashLoader />;
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
