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
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Copy, Download, ExternalLink } from 'lucide-react';

// Views
import { OverviewHeader } from '@/components/dashboard/OverviewHeader';
import { InviteBatchmatesCard } from '@/components/dashboard/InviteBatchmatesCard';
import { LiveClassCard } from '@/components/dashboard/LiveClassCard';
import { HomeMessCard } from '@/components/dashboard/HomeMessCard';
import { TodayTimeline } from '@/components/dashboard/TodayTimeline';
import { SmartFocusList } from '@/components/dashboard/SmartFocusList';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';
import { ExamsView } from '@/components/exams/ExamsView';
import { HomeworkView } from '@/components/homework/HomeworkView';
import { TomorrowCarryView } from '@/components/carry/TomorrowCarryView';
import { SubjectListView } from '@/components/subjects/SubjectListView';
import { AcademicCalendar } from '@/components/calendar/AcademicCalendar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { MessView } from '@/components/mess/MessView';
import { SettingsView } from '@/components/settings/SettingsView';
import { HolidayBalloons } from '@/components/ui/HolidayBalloons';
import { CampusSpotlightCard } from '@/components/ads/CampusSpotlightCard';
import { ProposedBatchTasksVoting } from '@/components/homework/ProposedBatchTasksVoting';
import { IOSAppGate } from '@/components/pwa/IOSAppGate';
import { AndroidAppGate } from '@/components/pwa/AndroidAppGate';

import { motion, AnimatePresence } from 'framer-motion';

export default function AppHome() {
  const router = useRouter();
  const { activeView, setActiveView, isHydrated, showHolidayAnimation, joinBatchTimetable, joinSharedCalendar, joinSharedExams, profile, showToast, user } = useApp();
  const isSignedIn = !!user;
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
  // Deep link handler: when app is opened via link (cold launch or while running)
  useEffect(() => {
    if (!isHydrated || !Capacitor.isNativePlatform()) return;

    const extractParam = (urlStr: string, paramName: string): string | null => {
      try {
        const parsed = new URL(urlStr);
        const val = parsed.searchParams.get(paramName);
        if (val) return val;
        if (paramName === 'invite') {
          const keyVal = parsed.searchParams.get('key');
          if (keyVal) return keyVal;
          if (parsed.pathname.includes('/join/')) {
            const parts = parsed.pathname.split('/join/');
            if (parts[1]) return parts[1].split('/')[0].split('?')[0];
          }
        }
      } catch {
        // Fallback for custom schemes like com.intersemester.app://invite?key=XYZ
        const match = urlStr.match(new RegExp(`[?&](${paramName}|key)=([^&#]+)`));
        if (match && match[2]) return decodeURIComponent(match[2]);
      }
      return null;
    };

    const processUrl = async (url: string) => {
      try {
        const inviteParam = extractParam(url, 'invite');
        const calendarParam = extractParam(url, 'calendar_invite');
        const examsParam = extractParam(url, 'exams_invite');
        const taskParam = extractParam(url, 'task');

        if (taskParam) {
          // If we receive a task intent, switch to homework view and append to URL so HomeworkView picks it up
          setActiveView('homework');
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('task', taskParam);
          window.history.replaceState({}, '', currentUrl);
          
          // Dispatch custom event in case HomeworkView is already mounted
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app_task_intent', { detail: taskParam }));
          }
          return;
        }

        if (inviteParam && inviteParam !== profile.batchKey) {
          if (!isSignedIn) {
            try {
              localStorage.setItem('pending_join_invite', inviteParam);
            } catch (_) {}
            router.push('/sign-in');
            return;
          }

          let snap = await getDoc(doc(db, 'shared_timetables', inviteParam));
          let resolvedKey = inviteParam;
          if (!snap.exists()) {
            const q = query(collection(db, 'shared_timetables'), where('inviteCode', '==', inviteParam.trim().toUpperCase()));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              snap = querySnap.docs[0];
              resolvedKey = snap.id;
            }
          }
          if (snap.exists()) {
            setInviteData(snap.data());
            setInviteKey(resolvedKey);
            setInviteModalOpen(true);
          }
        } else if (calendarParam) {
          const snap = await getDoc(doc(db, 'shared_calendars', calendarParam));
          if (snap.exists()) {
            setCalendarInviteData(snap.data());
            setCalendarInviteKey(calendarParam);
            setCalendarInviteModalOpen(true);
          }
        } else if (examsParam) {
          const snap = await getDoc(doc(db, 'shared_exams', examsParam));
          if (snap.exists()) {
            setExamsInviteData(snap.data());
            setExamsInviteKey(examsParam);
            setExamsInviteModalOpen(true);
          }
        }
      } catch (err) {
        console.warn('Deep link processing error:', err);
      }
    };

    let listenerHandle: any;
    // Dynamic import ensures @capacitor/app is only loaded on native platform (not during SSR/prerender)
    import('@capacitor/app').then(async ({ App: CapApp }) => {
      // 1. Check initial launch URL if app was launched directly from a link
      try {
        const launchUrl = await CapApp.getLaunchUrl();
        if (launchUrl?.url) {
          processUrl(launchUrl.url);
        }
      } catch (e) {
        console.warn('Error reading launch URL:', e);
      }

      // 2. Listen for deep links when app is resumed / opened while running
      CapApp.addListener('appUrlOpen', ({ url }) => {
        processUrl(url);
      }).then((handle) => {
        listenerHandle = handle;
      });
    });

    return () => {
      listenerHandle?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, profile.batchKey, isSignedIn]);

  // Handle Android Hardware Back Button
  const lastBackPressRef = React.useRef<number>(0);

  useEffect(() => {
    if (!isHydrated || !Capacitor.isNativePlatform()) return;

    let backListenerHandle: any;

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => {
        // 1. Check if any Modal / Dialog / Sheet is currently open
        const isModalOpen = typeof document !== 'undefined' && (
          document.body.classList.contains('modal-open') ||
          !!document.querySelector('.modal-open') ||
          inviteModalOpen ||
          calendarInviteModalOpen ||
          examsInviteModalOpen
        );

        if (isModalOpen) {
          // Dispatch escape key event to close open modal components
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
          setInviteModalOpen(false);
          setCalendarInviteModalOpen(false);
          setExamsInviteModalOpen(false);
          return;
        }

        // 2. If user is in a sub-view (timetable, homework, calendar, etc.), navigate back to 'home'
        if (activeView !== 'home') {
          setActiveView('home');
          return;
        }

        // 3. If already on 'home' dashboard and no modal open: Double-tap to exit
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          showToast('Press Back Again', 'Press back again to exit Intersemester', 'info');
        }
      }).then((handle) => {
        backListenerHandle = handle;
      });
    });

    return () => {
      backListenerHandle?.remove();
    };
  }, [isHydrated, activeView, inviteModalOpen, calendarInviteModalOpen, examsInviteModalOpen, showToast, setActiveView]);


  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('invite');
      if (inviteParam && inviteParam !== profile.batchKey) {
        if (Capacitor.isNativePlatform() && !isSignedIn) {
          try {
            localStorage.setItem('pending_join_invite', inviteParam);
          } catch (_) {}
          router.push('/sign-in');
          return;
        }

        const checkInvite = async () => {
          try {
            let snap = await getDoc(doc(db, 'shared_timetables', inviteParam));
            let resolvedKey = inviteParam;
            if (!snap.exists()) {
              const q = query(collection(db, 'shared_timetables'), where('inviteCode', '==', inviteParam.trim().toUpperCase()));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                snap = querySnap.docs[0];
                resolvedKey = snap.id;
              }
            }
            if (snap.exists()) {
              setInviteData(snap.data());
              setInviteKey(resolvedKey);
              setInviteModalOpen(true);
            }
          } catch (e) {
            console.error('Error fetching invite data:', e);
          }
        };
        checkInvite();
      }
    }
  }, [isHydrated, profile.batchKey, isSignedIn, router]);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const calendarInviteParam = params.get('calendar_invite');
      if (calendarInviteParam) {
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
  }, [isHydrated, setActiveView]);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const examsInviteParam = params.get('exams_invite');
      if (examsInviteParam) {
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
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-transparent text-[#181716] dark:text-[#F4F1EA]">
      {/* iOS Standalone PWA Installation Gate */}
      <IOSAppGate />

      {/* Android Official App / Play Store Installation Gate */}
      <AndroidAppGate />

      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 pb-32 md:pb-8">
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
                href={typeof window !== 'undefined' ? `intent://open#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end` : 'https://play.google.com/store/apps/details?id=com.intersemester.app'}
                className="px-4 py-2 bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wider font-bold text-[11px] shrink-0 flex items-center justify-center text-center"
              >
                OPEN APP
              </a>
            </div>
          )}
          <div className="w-full max-w-full min-w-0" key={activeView}>
            {activeView === 'home' && (
              <div className="flex flex-col gap-6">
                <OverviewHeader />
                <LiveClassCard />
                <ProposedBatchTasksVoting />
                <CampusSpotlightCard placement="home" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-2 sm:mt-3">
                  <TodayTimeline />
                  <SmartFocusList />
                </div>
                <div className="mt-1"><InviteBatchmatesCard /></div>
                {/* Thin Live & Upcoming Mess Card */}
                <HomeMessCard />
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
            {activeView === 'mess' && <MessView />}
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
          onClose={() => {
            setInviteModalOpen(false);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
          title={Capacitor.isNativePlatform() ? "Accept Batch Timetable Invite?" : "Open in Intersemester App"}
          description={
            Capacitor.isNativePlatform()
              ? "You have been invited to join a shared academic schedule."
              : "Timetable synchronization is available exclusively in the Intersemester mobile app."
          }
        >
          <div className="flex flex-col gap-4 mt-3 text-left font-sans">
            <div className="p-4 border border-black dark:border-white bg-black/5 dark:bg-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-black dark:text-white">
                  {inviteData.college || 'Academic Batch'}
                </h4>
                {inviteData.section && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider">
                    Sec {inviteData.section}
                  </span>
                )}
              </div>
              <p className="text-xs text-black/75 dark:text-white/75 font-medium">
                {inviteData.programme} - {inviteData.branch} {inviteData.semester ? `(Sem ${inviteData.semester})` : ''}
              </p>
              <div className="h-px bg-black/20 dark:bg-white/20 my-1" />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>Created by: {inviteData.creatorName || 'Batch Pilot'}</span>
                <span>Active: {inviteData.studentCount || 1} students</span>
              </div>
            </div>

            {!Capacitor.isNativePlatform() ? (
              /* Strictly Web View -> Mobile App Gate Only */
              <div className="flex flex-col gap-4">
                {/* Prominent 6-Digit Batch Code */}
                <div className="p-4 bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-70">
                    6-Digit Batch Code
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl font-mono font-black tracking-[4px] select-all">
                      {inviteData.inviteCode || inviteKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const codeToCopy = inviteData.inviteCode || inviteKey;
                        navigator.clipboard.writeText(codeToCopy);
                        showToast('Code Copied', `Batch code copied: ${codeToCopy}`, 'success');
                      }}
                      className="px-3 py-1.5 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-white dark:text-black text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="p-3.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-1.5 text-xs text-black/80 dark:text-white/80">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-black dark:text-white">
                    How to join:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-[12px] opacity-90">
                    <li>Download <strong>Intersemester</strong> from Google Play.</li>
                    <li>Open app &amp; tap <strong>&quot;Connect Batch&quot;</strong> on the dashboard.</li>
                    <li>Enter code <strong className="font-mono">{inviteData.inviteCode || inviteKey}</strong> to sync timetable and alerts.</li>
                  </ol>
                </div>

                {/* CTA Links */}
                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={`intent://invite?key=${inviteData.inviteCode || inviteKey}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.intersemester.app')};end`}
                    className="w-full py-3 bg-[#111111] dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span>Open in Intersemester App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href="https://play.google.com/store/apps/details?id=com.intersemester.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 border border-black dark:border-white text-black dark:text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download on Google Play</span>
                  </a>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteModalOpen(false);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState({}, document.title, window.location.pathname);
                      }
                    }}
                    className="text-xs font-bold uppercase text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              /* Native Mobile App Flow */
              <>
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
                      try {
                        localStorage.setItem('pending_join_invite', inviteKey);
                      } catch (_) {}
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
              </>
            )}
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
          title={Capacitor.isNativePlatform() ? "Import Academic Calendar?" : "Open in Intersemester App"}
          description={
            Capacitor.isNativePlatform()
              ? "You have been invited to import this batch's academic calendar (events, exams, and holidays)."
              : "Calendar synchronization is available exclusively in the Intersemester mobile app."
          }
        >
          <div className="flex flex-col gap-4 mt-3 text-left font-sans">
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

            {!Capacitor.isNativePlatform() ? (
              /* Strictly Web View -> Mobile App Gate Only */
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-70">
                    Calendar Code / ID
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-mono font-black tracking-[2px] truncate select-all">
                      {calendarInviteKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(calendarInviteKey);
                        showToast('Code Copied', `Calendar ID copied to clipboard!`, 'success');
                      }}
                      className="px-3 py-1.5 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-white dark:text-black text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-1.5 text-xs text-black/80 dark:text-white/80">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-black dark:text-white">
                    How to import:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-[12px] opacity-90">
                    <li>Download <strong>Intersemester</strong> from Google Play.</li>
                    <li>Open app &amp; go to the <strong>Calendar</strong> view.</li>
                    <li>Import calendar schedule with code: <strong className="font-mono">{calendarInviteKey}</strong></li>
                  </ol>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={`intent://calendar_invite?key=${calendarInviteKey}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.intersemester.app')};end`}
                    className="w-full py-3 bg-[#111111] dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span>Open in Intersemester App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href="https://play.google.com/store/apps/details?id=com.intersemester.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 border border-black dark:border-white text-black dark:text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download on Google Play</span>
                  </a>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarInviteModalOpen(false);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState({}, document.title, window.location.pathname);
                      }
                    }}
                    className="text-xs font-bold uppercase text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              /* Native Mobile App Flow */
              <>
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
              </>
            )}
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
          title={Capacitor.isNativePlatform() ? "Import Exam Schedule?" : "Open in Intersemester App"}
          description={
            Capacitor.isNativePlatform()
              ? "You have been invited to import this batch's academic exam timetable."
              : "Exam schedule synchronization is available exclusively in the Intersemester mobile app."
          }
        >
          <div className="flex flex-col gap-4 mt-3 text-left font-sans">
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

            {!Capacitor.isNativePlatform() ? (
              /* Strictly Web View -> Mobile App Gate Only */
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-70">
                    Exam Schedule Code / ID
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-mono font-black tracking-[2px] truncate select-all">
                      {examsInviteKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(examsInviteKey);
                        showToast('Code Copied', `Exam schedule ID copied to clipboard!`, 'success');
                      }}
                      className="px-3 py-1.5 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-white dark:text-black text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-1.5 text-xs text-black/80 dark:text-white/80">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-black dark:text-white">
                    How to import:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-[12px] opacity-90">
                    <li>Download <strong>Intersemester</strong> from Google Play.</li>
                    <li>Open app &amp; go to the <strong>Exams</strong> view.</li>
                    <li>Import exam schedule with code: <strong className="font-mono">{examsInviteKey}</strong></li>
                  </ol>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={`intent://exams_invite?key=${examsInviteKey}#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.intersemester.app')};end`}
                    className="w-full py-3 bg-[#111111] dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span>Open in Intersemester App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href="https://play.google.com/store/apps/details?id=com.intersemester.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 border border-black dark:border-white text-black dark:text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download on Google Play</span>
                  </a>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setExamsInviteModalOpen(false);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState({}, document.title, window.location.pathname);
                      }
                    }}
                    className="text-xs font-bold uppercase text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              /* Native Mobile App Flow */
              <>
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
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
