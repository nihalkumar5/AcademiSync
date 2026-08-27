'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Toast } from '@/components/ui/Toast';
import { IntersemesterLogo } from '@/components/ui/IntersemesterLogo';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { Modal } from '@/components/ui/Modal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
import { HolidayBalloons } from '@/components/ui/HolidayBalloons';

import { motion, AnimatePresence } from 'framer-motion';

export default function AppHome() {
  const { activeView, isHydrated, showHolidayAnimation, joinBatchTimetable, profile, showToast } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteKey, setInviteKey] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    if (isHydrated && Capacitor.isNativePlatform()) {
      // Programmatically hide native splash only when app state is hydrated/ready
      SplashScreen.hide().catch((err) => console.error('Splash hide error:', err));
    }
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('invite');
      if (inviteParam && inviteParam !== profile.batchKey) {
        const checkInvite = async () => {
          try {
            const docRef = doc(db, 'shared_timetables', inviteParam);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              setInviteData(snap.data());
              setInviteKey(inviteParam);
              setInviteModalOpen(true);
            }
          } catch (e) {
            console.error('Error fetching invite data:', e);
          }
        };
        checkInvite();
      }
    }
  }, [isHydrated, profile.batchKey]);

  if (!isHydrated) {
    return null; // Return empty space while native splash covers it
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
      {showHolidayAnimation && <HolidayBalloons />}

      {/* Batch Invite Modal */}
      {inviteModalOpen && inviteData && inviteKey && (
        <Modal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          title="Accept Batch Timetable Invite?"
          description="You have been invited to join a shared academic schedule."
        >
          <div className="flex flex-col gap-4 mt-3 text-left">
            <div className="p-4 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex flex-col gap-2">
              <h4 className="text-sm font-bold text-black dark:text-white">
                {inviteData.college}
              </h4>
              <p className="text-xs text-black/75 dark:text-white/75 font-medium">
                {inviteData.programme} - {inviteData.branch} (Sem {inviteData.semester})
              </p>
              <div className="h-px bg-black/20 dark:bg-white/20 my-1" />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>Created by: {inviteData.creatorName}</span>
                <span>Active: {inviteData.studentCount || 1} students</span>
              </div>
            </div>

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              Accepting will download the batch subjects and classes, replacing your current timetable. You will stay synced in real-time.
            </p>

            <div className="flex gap-2.5 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setInviteModalOpen(false);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="px-4 py-2 border border-black dark:border-white text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={async () => {
                  setInviteModalOpen(false);
                  await joinBatchTimetable(inviteKey);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
              >
                Accept & Sync
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
