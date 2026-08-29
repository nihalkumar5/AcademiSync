'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useUser } from '@clerk/nextjs';
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
import { InviteBatchmatesCard } from '@/components/dashboard/InviteBatchmatesCard';
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
import { CampusSpotlightCard } from '@/components/ads/CampusSpotlightCard';
import { ProposedBatchTasksVoting } from '@/components/homework/ProposedBatchTasksVoting';

import { motion, AnimatePresence } from 'framer-motion';

export default function AppHome() {
  const { activeView, setActiveView, isHydrated, showHolidayAnimation, joinBatchTimetable, joinSharedCalendar, joinSharedExams, profile, showToast } = useApp();
  const { isSignedIn } = useUser();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteKey, setInviteKey] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [calendarInviteModalOpen, setCalendarInviteModalOpen] = useState(false);
  const [calendarInviteKey, setCalendarInviteKey] = useState<string | null>(null);
  const [calendarInviteData, setCalendarInviteData] = useState<any>(null);
  const [examsInviteModalOpen, setExamsInviteModalOpen] = useState(false);
  const [examsInviteKey, setExamsInviteKey] = useState<string | null>(null);
  const [examsInviteData, setExamsInviteData] = useState<any>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      setIsAndroid(/Android/i.test(ua));
      setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    }
  }, []);

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
        // If on Android mobile browser, try to launch app natively, fallback to Play Store
        const ua = navigator.userAgent;
        const isAndroidBrowser = /Android/i.test(ua) && !Capacitor.isNativePlatform();
        
        if (isAndroidBrowser) {
          const intentUrl = `intent://invite?key=${inviteParam}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end`;
          window.location.href = intentUrl;
          return;
        }

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

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const calendarInviteParam = params.get('calendar_invite');
      if (calendarInviteParam) {
        const ua = navigator.userAgent;
        const isAndroidBrowser = /Android/i.test(ua) && !Capacitor.isNativePlatform();
        
        if (isAndroidBrowser) {
          const intentUrl = `intent://calendar_invite?key=${calendarInviteParam}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end`;
          window.location.href = intentUrl;
          return;
        }

        const checkCalendarInvite = async () => {
          try {
            const docRef = doc(db, 'shared_calendars', calendarInviteParam);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              setCalendarInviteData(snap.data());
              setCalendarInviteKey(calendarInviteParam);
              setCalendarInviteModalOpen(true);
            }
          } catch (e) {
            console.error('Error fetching calendar invite:', e);
          }
        };
        checkCalendarInvite();
      }

      const taskParam = params.get('task');
      if (taskParam) {
        setActiveView('homework');
      }
    }
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const examsInviteParam = params.get('exams_invite');
      if (examsInviteParam) {
        const ua = navigator.userAgent;
        const isAndroidBrowser = /Android/i.test(ua) && !Capacitor.isNativePlatform();
        
        if (isAndroidBrowser) {
          const intentUrl = `intent://exams_invite?key=${examsInviteParam}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end`;
          window.location.href = intentUrl;
          return;
        }

        const checkExamsInvite = async () => {
          try {
            const docRef = doc(db, 'shared_exams', examsInviteParam);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              setExamsInviteData(snap.data());
              setExamsInviteKey(examsInviteParam);
              setExamsInviteModalOpen(true);
            }
          } catch (e) {
            console.error('Error fetching exams invite:', e);
          }
        };
        checkExamsInvite();
      }
    }
  }, [isHydrated]);

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
          {!Capacitor.isNativePlatform() && isAndroid && isSignedIn && (
            <div className="mb-6 p-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] flex items-center justify-between rounded-none">
              <div className="flex flex-col pr-4">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  Intersemester App
                </span>
                <span className="text-[14px] font-medium leading-snug">
                  Open your schedule in the app.
                </span>
              </div>
              <a
                href="intent://open#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end"
                className="px-4 py-2 bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider font-bold text-[11px] shrink-0 flex items-center justify-center text-center"
              >
                OPEN APP
              </a>
            </div>
          )}
          <div className="w-full" key={activeView}>
            {activeView === 'home' && (
              <div className="flex flex-col gap-6">
                <OverviewHeader />
                <LiveClassCard />
                <ProposedBatchTasksVoting />
                <CampusSpotlightCard placement="home" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <TodayTimeline />
                  <SmartFocusList />
                </div>
                <InviteBatchmatesCard />
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

            {!Capacitor.isNativePlatform() && isAndroid && (
              <div className="flex flex-col gap-2 p-3 bg-[#01875f]/10 border border-[#01875f] text-[#01875f] dark:text-[#00e699]">
                <p className="text-[11px] font-bold leading-normal">
                  Syncing is recommended on the native app for widgets & alarms!
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.intersemester.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-[#01875f] text-white text-[10px] font-black uppercase tracking-wider text-center block hover:bg-[#016f4e] transition-colors cursor-pointer rounded-none"
                  >
                    Download App
                  </a>
                  <a
                    href={`intent://invite?key=${inviteKey}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end`}
                    className="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[10px] font-black uppercase tracking-wider text-center block hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
                  >
                    Open in App
                  </a>
                </div>
              </div>
            )}

            {!Capacitor.isNativePlatform() && isIOS && (
              <div className="flex flex-col gap-2 p-3 bg-indigo-500/10 border border-indigo-500 text-indigo-700 dark:text-indigo-300">
                <p className="text-[11px] font-bold leading-normal">
                  PWA Quick Tip for iPhone Users:
                </p>
                <p className="text-[10px] leading-relaxed opacity-90 font-medium">
                  Tap Safari's <span className="font-bold text-indigo-800 dark:text-indigo-400">Share</span> button (at the bottom) and select <span className="font-bold text-indigo-800 dark:text-indigo-400">"Add to Home Screen"</span> to run AcademiSync as a full-screen app!
                </p>
              </div>
            )}

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
                  if (!isSignedIn) {
                    showToast('Login Required', 'Please log in or sign up to sync with a batch.', 'info');
                    if (typeof window !== 'undefined') {
                      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
                    }
                    return;
                  }
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

      {calendarInviteModalOpen && calendarInviteData && calendarInviteKey && (
        <Modal
          isOpen={calendarInviteModalOpen}
          onClose={() => {
            setCalendarInviteModalOpen(false);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
          title="Import Academic Calendar?"
          description="You have been invited to import this batch's academic calendar (events, exams, and holidays)."
        >
          <div className="flex flex-col gap-4 mt-3 text-left">
            <div className="p-4 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex flex-col gap-2">
              <h4 className="text-sm font-bold text-black dark:text-white">
                {calendarInviteData.college}
              </h4>
              <p className="text-xs text-black/75 dark:text-white/75 font-medium">
                {calendarInviteData.programme} - {calendarInviteData.branch} (Sem {calendarInviteData.semester})
              </p>
              <div className="h-px bg-black/20 dark:bg-white/20 my-1" />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>Created by: {calendarInviteData.creatorName}</span>
                <span>Events: {calendarInviteData.events?.length || 0} | Exams: {calendarInviteData.exams?.length || 0}</span>
              </div>
            </div>

            {!Capacitor.isNativePlatform() && isAndroid && (
              <div className="flex flex-col gap-2 p-3 bg-[#01875f]/10 border border-[#01875f] text-[#01875f] dark:text-[#00e699]">
                <p className="text-[11px] font-bold leading-normal">
                  Syncing is recommended on the native app for widgets & alarms!
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.intersemester.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-[#01875f] text-white text-[10px] font-black uppercase tracking-wider text-center block hover:bg-[#016f4e] transition-colors cursor-pointer rounded-none"
                  >
                    Download App
                  </a>
                  <a
                    href={`intent://calendar_invite?key=${calendarInviteKey}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end`}
                    className="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[10px] font-black uppercase tracking-wider text-center block hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
                  >
                    Open in App
                  </a>
                </div>
              </div>
            )}

            {!Capacitor.isNativePlatform() && isIOS && (
              <div className="flex flex-col gap-2 p-3 bg-indigo-500/10 border border-indigo-500 text-indigo-700 dark:text-indigo-300">
                <p className="text-[11px] font-bold leading-normal">
                  PWA Quick Tip for iPhone Users:
                </p>
                <p className="text-[10px] leading-relaxed opacity-90 font-medium">
                  Tap Safari's <span className="font-bold text-indigo-800 dark:text-indigo-400">Share</span> button (at the bottom) and select <span className="font-bold text-indigo-800 dark:text-indigo-400">"Add to Home Screen"</span> to run AcademiSync as a full-screen app!
                </p>
              </div>
            )}

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              Accepting will download the shared academic calendar events and exams, replacing your current calendar data.
            </p>

            <div className="flex gap-2.5 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setCalendarInviteModalOpen(false);
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
                  if (!isSignedIn) {
                    showToast('Login Required', 'Please log in or sign up to sync with a calendar.', 'info');
                    if (typeof window !== 'undefined') {
                      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
                    }
                    return;
                  }
                  setCalendarInviteModalOpen(false);
                  await joinSharedCalendar(calendarInviteKey);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
              >
                Accept & Import
              </button>
            </div>
          </div>
        </Modal>
      )}

      {examsInviteModalOpen && examsInviteData && examsInviteKey && (
        <Modal
          isOpen={examsInviteModalOpen}
          onClose={() => {
            setExamsInviteModalOpen(false);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
          title="Import Exam Schedule?"
          description="You have been invited to import this batch's academic exam timetable."
        >
          <div className="flex flex-col gap-4 mt-3 text-left">
            <div className="p-4 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex flex-col gap-2">
              <h4 className="text-sm font-bold text-black dark:text-white">
                {examsInviteData.college}
              </h4>
              <p className="text-xs text-black/75 dark:text-white/75 font-medium">
                {examsInviteData.programme} - {examsInviteData.branch} (Sem {examsInviteData.semester})
              </p>
              <div className="h-px bg-black/20 dark:bg-white/20 my-1" />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>Created by: {examsInviteData.creatorName}</span>
                <span>Exams: {examsInviteData.exams?.length || 0} exams scheduled</span>
              </div>
            </div>

            {!Capacitor.isNativePlatform() && isAndroid && (
              <div className="flex flex-col gap-2 p-3 bg-[#01875f]/10 border border-[#01875f] text-[#01875f] dark:text-[#00e699]">
                <p className="text-[11px] font-bold leading-normal">
                  Syncing is recommended on the native app for widgets & alarms!
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.intersemester.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-[#01875f] text-white text-[10px] font-black uppercase tracking-wider text-center block hover:bg-[#016f4e] transition-colors cursor-pointer rounded-none"
                  >
                    Download App
                  </a>
                  <a
                    href={`intent://exams_invite?key=${examsInviteKey}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intersemester.app;end`}
                    className="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[10px] font-black uppercase tracking-wider text-center block hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
                  >
                    Open in App
                  </a>
                </div>
              </div>
            )}

            {!Capacitor.isNativePlatform() && isIOS && (
              <div className="flex flex-col gap-2 p-3 bg-indigo-500/10 border border-indigo-500 text-indigo-700 dark:text-indigo-300">
                <p className="text-[11px] font-bold leading-normal">
                  PWA Quick Tip for iPhone Users:
                </p>
                <p className="text-[10px] leading-relaxed opacity-90 font-medium">
                  Tap Safari's <span className="font-bold text-indigo-800 dark:text-indigo-400">Share</span> button (at the bottom) and select <span className="font-bold text-indigo-800 dark:text-indigo-400">"Add to Home Screen"</span> to run AcademiSync as a full-screen app!
                </p>
              </div>
            )}

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              Accepting will download the shared exam sessions, replacing your current exam calendar data.
            </p>

            <div className="flex gap-2.5 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setExamsInviteModalOpen(false);
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
                  if (!isSignedIn) {
                    showToast('Login Required', 'Please log in or sign up to sync with an exam schedule.', 'info');
                    if (typeof window !== 'undefined') {
                      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
                    }
                    return;
                  }
                  setExamsInviteModalOpen(false);
                  await joinSharedExams(examsInviteKey);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none"
              >
                Accept & Import
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
