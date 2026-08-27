'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import {
  StudentProfile,
  Subject,
  ClassSession,
  Homework,
  HomeworkStatus,
  CarryItem,
  AppNotification,
  AcademicEvent,
  Exam,
  UserSettings,
  NotificationCategory,
} from '@/lib/types';
import { storage } from '@/lib/storage';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/lib/initialData';
import { calculateTomorrowCarryItems, getCanonicalBatchKey } from '@/lib/timetableUtils';
import { checkAndGenerateSmartNotifications } from '@/lib/notificationEngine';
import confetti from 'canvas-confetti';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot, setDoc, deleteDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { registerPushNotifications } from '@/lib/pushNotifications';
import { triggerLocalNotification, scheduleTimetableLocalNotifications } from '@/lib/localNotifications';

export type ActiveView =
  | 'home'
  | 'timetable'
  | 'homework'
  | 'carry'
  | 'subjects'
  | 'calendar'
  | 'exams'
  | 'notifications'
  | 'settings';

interface AppContextType {
  isHydrated: boolean;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  profile: StudentProfile;
  updateProfile: (profile: Partial<StudentProfile>) => void;
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => Subject;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  timetable: ClassSession[];
  addClassSession: (session: Omit<ClassSession, 'id'>) => void;
  updateClassSession: (id: string, session: Partial<ClassSession>) => void;
  deleteClassSession: (id: string) => void;
  setFullTimetable: (sessions: ClassSession[]) => void;
  setFullSubjectsAndTimetable: (newSubjects: Subject[], sessions: ClassSession[]) => void;
  homework: Homework[];
  addHomework: (hw: Omit<Homework, 'id' | 'createdAt'>) => Homework;
  updateHomework: (id: string, hw: Partial<Homework>) => void;
  deleteHomework: (id: string) => void;
  toggleHomeworkStatus: (id: string) => void;
  carryItems: CarryItem[];
  toggleCarryItemPacked: (id: string) => void;
  addCustomCarryItem: (title: string, dateStr?: string, reminderNote?: string) => void;
  deleteCarryItem: (id: string) => void;
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  triggerSimulatedAlert: (category: NotificationCategory) => void;
  events: AcademicEvent[];
  addEvent: (event: Omit<AcademicEvent, 'id'>) => void;
  addEvents: (events: Omit<AcademicEvent, 'id'>[], overwrite?: boolean) => void;
  deleteEvent: (id: string) => void;
  exams: Exam[];
  addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => Exam;
  deleteExam: (id: string) => void;
  setFullExams: (exams: Exam[]) => void;
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  triggerConfetti: () => void;
  cancelledSessions: string[];
  toggleSessionCancelled: (sessionId: string, dateStr?: string) => void;
  isSessionCancelled: (sessionId: string, dateStr?: string) => boolean;
  rescheduledSessions: Record<string, { startTime: string; endTime: string; room?: string }>;
  rescheduleSession: (sessionId: string, details: { startTime: string; endTime: string; room?: string } | null, dateStr?: string) => void;
  searchBatchTimetable: (college: string, programme: string, branch: string, semester: number) => Promise<any | null>;
  joinBatchTimetable: (batchKey: string) => Promise<void>;
  shareTimetableWithBatch: () => Promise<string>;
  disconnectBatchTimetable: () => void;
  shareCalendarWithBatch: () => Promise<string>;
  joinSharedCalendar: (calendarKey: string) => Promise<void>;
  shareExamsWithBatch: () => Promise<string>;
  joinSharedExams: (examsKey: string) => Promise<void>;
  toastMessage: { id: number; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showHolidayAnimation: boolean;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ id: number; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const toastIdRef = useRef(0);

  // Core state
  const [profile, setProfileState] = useState<StudentProfile>(storage.getProfile());
  const [subjects, setSubjectsState] = useState<Subject[]>(storage.getSubjects());
  const [timetable, setTimetableState] = useState<ClassSession[]>(storage.getTimetable());
  const [homework, setHomeworkState] = useState<Homework[]>(storage.getHomework());
  const [carryItems, setCarryItemsState] = useState<CarryItem[]>(storage.getCarryItems());
  const [notifications, setNotificationsState] = useState<AppNotification[]>(storage.getNotifications());
  const [events, setEventsState] = useState<AcademicEvent[]>(storage.getEvents());
  const [exams, setExamsState] = useState<Exam[]>(storage.getExams());
  const [settings, setSettingsState] = useState<UserSettings>(storage.getSettings());
  const [cancelledSessions, setCancelledSessionsState] = useState<string[]>(storage.getCancelledSessions());
  const [rescheduledSessions, setRescheduledSessionsState] = useState<Record<string, { startTime: string; endTime: string; room?: string }>>(storage.getRescheduledSessions());
  const [showHolidayAnimation, setShowHolidayAnimation] = useState(false);

  const { user, isLoaded: isClerkLoaded } = useUser();
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const remoteStateString = useRef("");
  const isApplyingRemote = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const scheduleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle User Logout / Switch Account Cleanup
  useEffect(() => {
    if (!isClerkLoaded) return;

    if (prevUserIdRef.current && !user) {
      // User just logged out! Wipe local state & storage cleanly
      console.log('User logged out. Wiping local session data.');
      storage.clearUserSession();

      setProfileState(DEFAULT_PROFILE);
      setSubjectsState([]);
      setTimetableState([]);
      setHomeworkState([]);
      setCarryItemsState([]);
      setNotificationsState([]);
      setEventsState([]);
      setExamsState([]);
      setSettingsState(DEFAULT_SETTINGS);
      setCancelledSessionsState([]);
      setRescheduledSessionsState({});
      remoteStateString.current = "";
      setIsCloudSynced(false);
      prevUserIdRef.current = null;
    } else if (user) {
      if (prevUserIdRef.current && prevUserIdRef.current !== user.id) {
        // Switched to a different user account
        console.log('Switched user account. Resetting sync state.');
        storage.clearUserSession();
        setIsCloudSynced(false);
        remoteStateString.current = "";
      }
      prevUserIdRef.current = user.id;

      // Auto-populate name and email from Clerk if not already set in profile
      const userEmail = user.primaryEmailAddress?.emailAddress || '';
      let defaultName = user.fullName || user.firstName || '';
      if (!defaultName && userEmail) {
        defaultName = userEmail.split('@')[0];
        defaultName = defaultName.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }

      if (!profile.name || !profile.email) {
        const updated = {
          ...profile,
          name: profile.name || defaultName,
          email: profile.email || userEmail,
        };
        setProfileState(updated);
        storage.setProfile(updated);
      }
    }
  }, [user, isClerkLoaded, profile]);

  // Firebase Realtime Down-Sync (Runs on Login / Cloud Data Change)
  useEffect(() => {
    if (!isClerkLoaded || !user) return;
    
    // Request Push Notification permissions (Android Native)
    registerPushNotifications(user.id);
    
    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dataStr = JSON.stringify(data);
        
        // If this is identical to what we already have, do nothing
        if (dataStr === remoteStateString.current) {
          setIsCloudSynced(true);
          return;
        }

        // If cloud data is OLDER than our local last-updated timestamp,
        // it means we just uploaded a change that echoed back — skip override.
        const localLastUpdated = typeof window !== 'undefined'
          ? parseInt(window.localStorage.getItem('iiitnr_last_updated') || '0', 10)
          : 0;
        const cloudLastUpdated = data.lastUpdated ?? 0;
        if (localLastUpdated > 0 && cloudLastUpdated < localLastUpdated) {
          // Cloud is behind our local state — just mark synced and wait for upload
          remoteStateString.current = dataStr;
          setIsCloudSynced(true);
          return;
        }

        remoteStateString.current = dataStr;
        isApplyingRemote.current = true;
        
        if (data.profile) { setProfileState(data.profile); storage.setProfile(data.profile); }
        if (data.subjects) { setSubjectsState(data.subjects); storage.setSubjects(data.subjects); }
        if (data.timetable) { setTimetableState(data.timetable); storage.setTimetable(data.timetable); }
        if (data.homework) { setHomeworkState(data.homework); storage.setHomework(data.homework); }
        if (data.carryItems) { setCarryItemsState(data.carryItems); storage.setCarryItems(data.carryItems); }
        if (data.notifications) { setNotificationsState(data.notifications); storage.setNotifications(data.notifications); }
        if (data.events) { setEventsState(data.events); storage.setEvents(data.events); }
        if (data.exams) { setExamsState(data.exams); storage.setExams(data.exams); }
        if (data.settings) { setSettingsState(data.settings); storage.setSettings(data.settings); }
        if (data.cancelledSessions) { setCancelledSessionsState(data.cancelledSessions); storage.setCancelledSessions(data.cancelledSessions); }
        if (data.rescheduledSessions) { setRescheduledSessionsState(data.rescheduledSessions); storage.setRescheduledSessions(data.rescheduledSessions); }

        if (typeof window !== 'undefined' && data.lastUpdated) {
          window.localStorage.setItem('iiitnr_last_updated', data.lastUpdated.toString());
        }

        setIsCloudSynced(true);
        setTimeout(() => {
          isApplyingRemote.current = false;
        }, 300);
      } else {
        // Document does not exist yet (brand new account)
        // Mark as synced so current local state can be saved as initial account state
        setIsCloudSynced(true);
      }
    }, (error) => {
      console.error('Firebase snapshot listener error:', error);
      setIsCloudSynced(true); // Don't block app if network fails
    });

    return () => unsubscribe();
  }, [user, isClerkLoaded]);

  // Firestore Live Sync for Batch Timetables (for synced users)
  useEffect(() => {
    if (!profile.isBatchSynced || !profile.batchKey) return;

    console.log(`Setting up real-time listener for batch: ${profile.batchKey}`);
    const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);
    
    const unsubscribe = onSnapshot(batchDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('Real-time batch update received:', data);
        
        if (data.subjects) {
          setSubjectsState(data.subjects);
          storage.setSubjects(data.subjects);
        }
        if (data.timetable) {
          setTimetableState(data.timetable);
          storage.setTimetable(data.timetable);
        }
      }
    }, (err) => {
      console.error('Error listening to batch timetable updates:', err);
    });

    return () => unsubscribe();
  }, [profile.isBatchSynced, profile.batchKey]);

  // Firebase Realtime Up-Sync (Saves edits to cloud for logged-in user)
  useEffect(() => {
    if (!isClerkLoaded || !user || !isHydrated || !isCloudSynced || isApplyingRemote.current) return;
    
    const now = Date.now();
    const currentState = {
      profile,
      subjects,
      timetable,
      homework,
      carryItems,
      notifications,
      events,
      exams,
      settings,
      cancelledSessions,
      rescheduledSessions,
      lastUpdated: now,
    };
    
    // Avoid re-uploading if data matches what came from cloud
    if (remoteStateString.current) {
      try {
        const parsedRemote = JSON.parse(remoteStateString.current);
        const { lastUpdated: _remoteTs, ...remoteWithoutTs } = parsedRemote;
        const { lastUpdated: _currentTs, ...currentWithoutTs } = currentState;
        if (JSON.stringify(remoteWithoutTs) === JSON.stringify(currentWithoutTs)) {
          return;
        }
      } catch (e) {}
    }

    // Update timestamp IMMEDIATELY so that if user refreshes before the 1s
    // debounce fires, onSnapshot still sees local as newer and won't overwrite.
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('iiitnr_last_updated', now.toString());
    }

    const timeout = setTimeout(() => {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, currentState, { merge: true })
        .then(() => {
          remoteStateString.current = JSON.stringify(currentState);
        })
        .catch((e) => console.error('Firebase Sync Error', e));
    }, 100);

    return () => clearTimeout(timeout);
  }, [profile, subjects, timetable, homework, carryItems, notifications, events, exams, settings, cancelledSessions, rescheduledSessions, user, isClerkLoaded, isHydrated, isCloudSynced]);

  // Hydration effect
  useEffect(() => {
    const loadedProfile = storage.getProfile();
    const loadedSubjects = storage.getSubjects();
    const loadedTimetable = storage.getTimetable();
    const loadedHomework = storage.getHomework();
    const storedCarry = storage.getCarryItems();
    const loadedNotifications = storage.getNotifications();
    const loadedEvents = storage.getEvents();
    const loadedSettings = storage.getSettings();
    const loadedCancelled = storage.getCancelledSessions();
    const loadedRescheduled = storage.getRescheduledSessions();
    const loadedExams = storage.getExams();

    setProfileState(loadedProfile);
    setSubjectsState(loadedSubjects);
    setTimetableState(loadedTimetable);
    setHomeworkState(loadedHomework);
    setNotificationsState(loadedNotifications);
    setEventsState(loadedEvents);
    setExamsState(loadedExams);
    setSettingsState(loadedSettings);
    // Prune cancelled session keys older than 30 days to prevent unbounded growth
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const prunedCancelled = loadedCancelled.filter((key) => {
      const datePart = key.split('_')[0]; // "YYYY-MM-DD_sessId" format
      const keyDate = new Date(datePart);
      return !isNaN(keyDate.getTime()) && keyDate >= thirtyDaysAgo;
    });
    if (prunedCancelled.length !== loadedCancelled.length) {
      storage.setCancelledSessions(prunedCancelled);
    }
    setCancelledSessionsState(prunedCancelled);

    // Prune rescheduled session keys older than 30 days to prevent unbounded growth
    const prunedRescheduled: Record<string, { startTime: string; endTime: string; room?: string }> = {};
    let prunedRescheduledChanged = false;
    Object.entries(loadedRescheduled).forEach(([key, val]) => {
      const datePart = key.split('_')[0]; // "YYYY-MM-DD_sessId" format
      const keyDate = new Date(datePart);
      if (!isNaN(keyDate.getTime()) && keyDate >= thirtyDaysAgo) {
        prunedRescheduled[key] = val;
      } else {
        prunedRescheduledChanged = true;
      }
    });
    if (prunedRescheduledChanged) {
      storage.setRescheduledSessions(prunedRescheduled);
    }
    setRescheduledSessionsState(prunedRescheduled);

    // Calculate carry items for tomorrow merging stored states & academic events/holidays
    const computedCarry = calculateTomorrowCarryItems(loadedTimetable, loadedSubjects, storedCarry, undefined, undefined, loadedEvents, loadedSettings);
    setCarryItemsState(computedCarry);
    storage.setCarryItems(computedCarry);

    // Apply theme class to <html>
    if (loadedSettings.theme === 'dark' || (loadedSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check for holiday to trigger balloons animation once per session
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateTodayStr = `${year}-${month}-${day}`;
    
    const todayHoliday = loadedEvents.find((e) => e.date === dateTodayStr && e.type === 'holiday');
    if (todayHoliday && typeof window !== 'undefined' && !window.sessionStorage.getItem('holiday_anim_shown')) {
      setShowHolidayAnimation(true);
      window.sessionStorage.setItem('holiday_anim_shown', 'true');
    }

    if (!loadedProfile.onboardingCompleted) {
      setShowOnboarding(true);
    }

    setIsHydrated(true);
  }, []);

  // Periodic notification check & sync
  useEffect(() => {
    if (!isHydrated) return;

    const runCheck = () => {
      refreshCarryItems(timetable, subjects, events, settings);

      setNotificationsState((prevNotifications) => {
        const nowMs = Date.now();
        const prunedNotifications = prevNotifications.filter(n => {
          return nowMs - new Date(n.timestamp).getTime() < 24 * 60 * 60 * 1000;
        });

        const newNotifs = checkAndGenerateSmartNotifications(
          timetable,
          subjects,
          homework,
          events,
          settings,
          prunedNotifications,
          cancelledSessions,
          rescheduledSessions
        );
        
        if (newNotifs.length > 0 || prunedNotifications.length !== prevNotifications.length) {
          const updated = [...newNotifs, ...prunedNotifications];
          storage.setNotifications(updated);
          
          if (newNotifs.length > 0) {
            showToast(newNotifs[0].title, newNotifs[0].message, 'info');
            newNotifs.forEach((n) => {
              triggerLocalNotification(n.title, n.message);
            });
          }
          return updated;
        }
        return prevNotifications;
      });
    };

    // Run once on load/change
    runCheck();

    // Check every 60 seconds for time-based triggers
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, [timetable, subjects, homework, events, settings, carryItems, cancelledSessions, rescheduledSessions, isHydrated]);

  // Native Local Notification Scheduler Effect (debounced 500ms to avoid race conditions)
  useEffect(() => {
    if (!isHydrated) return;

    // Clear any pending reschedule triggered by a previous rapid state change
    if (scheduleDebounceRef.current) clearTimeout(scheduleDebounceRef.current);

    scheduleDebounceRef.current = setTimeout(async () => {
      await scheduleTimetableLocalNotifications(
        timetable,
        subjects,
        homework,
        exams,
        settings,
        events,
        cancelledSessions,
        rescheduledSessions
      );
    }, 500);

    return () => {
      if (scheduleDebounceRef.current) clearTimeout(scheduleDebounceRef.current);
    };
  }, [timetable, subjects, homework, exams, settings, events, cancelledSessions, rescheduledSessions, isHydrated]);



  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = ++toastIdRef.current;
    setToastMessage({ id, title, message, type });
    setTimeout(() => {
      setToastMessage((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  const triggerConfetti = () => {
    if (typeof window !== 'undefined') {
      try {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 9999,
        };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };

        // Multi-stage celebratory explosion
        fire(0.25, {
          spread: 30,
          startVelocity: 55,
          colors: ['#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'],
        });
        fire(0.2, {
          spread: 60,
          colors: ['#FBBF24', '#34D399', '#60A5FA', '#F472B6'],
        });
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8,
          colors: ['#FFD700', '#FF69B4', '#00FFFF', '#7B68EE', '#32CD32'],
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
          shapes: ['star', 'circle'],
          colors: ['#FFE600', '#FF007F', '#00F0FF'],
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
          colors: ['#F59E0B', '#10B981', '#6366F1'],
        });

        // Secondary side cannons for full-screen festive feel
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 65,
            origin: { x: 0.05, y: 0.75 },
            colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#FFD700'],
            zIndex: 9999,
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 65,
            origin: { x: 0.95, y: 0.75 },
            colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#FFD700'],
            zIndex: 9999,
          });
        }, 120);
      } catch (e) {
        // Fallback gracefully
      }
    }
  };

  // State mutation actions
  const updateProfile = (partial: Partial<StudentProfile>) => {
    const updated = { ...profile, ...partial };
    setProfileState(updated);
    storage.setProfile(updated);
  };

  const addSubject = (subjectData: Omit<Subject, 'id'>): Subject => {
    const newSub: Subject = {
      ...subjectData,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...subjects, newSub];
    setSubjectsState(updated);
    storage.setSubjects(updated);
    refreshCarryItems(timetable, updated);
    return newSub;
  };

  const updateSubject = (id: string, partial: Partial<Subject>) => {
    const updated = subjects.map((s) => (s.id === id ? { ...s, ...partial } : s));
    setSubjectsState(updated);
    storage.setSubjects(updated);
    refreshCarryItems(timetable, updated);
  };

  const deleteSubject = (id: string) => {
    const updatedSubs = subjects.filter((s) => s.id !== id);
    const updatedTimetable = timetable.filter((t) => t.subjectId !== id);
    setSubjectsState(updatedSubs);
    setTimetableState(updatedTimetable);
    storage.setSubjects(updatedSubs);
    storage.setTimetable(updatedTimetable);
    refreshCarryItems(updatedTimetable, updatedSubs);
  };

  const refreshCarryItems = (
    currentTimetable: ClassSession[],
    currentSubjects: Subject[],
    currentEvents: AcademicEvent[] = events,
    currentSettings: UserSettings = settings
  ) => {
    const recomputed = calculateTomorrowCarryItems(
      currentTimetable,
      currentSubjects,
      carryItems,
      undefined,
      undefined,
      currentEvents,
      currentSettings
    );
    
    // Only update state if items actually changed to prevent unnecessary re-renders
    const isSame = carryItems.length === recomputed.length &&
      carryItems.every((item, idx) => 
        item.id === recomputed[idx].id && 
        item.isPacked === recomputed[idx].isPacked &&
        item.title === recomputed[idx].title &&
        item.date === recomputed[idx].date
      );
      
    if (!isSame) {
      setCarryItemsState(recomputed);
      storage.setCarryItems(recomputed);
    }
  };

  const addClassSession = (sessionData: Omit<ClassSession, 'id'>) => {
    const newSession: ClassSession = {
      ...sessionData,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...timetable, newSession];
    setTimetableState(updated);
    storage.setTimetable(updated);
    refreshCarryItems(updated, subjects);
    showToast('Class Added', `${sessionData.startTime} - ${sessionData.endTime} scheduled`, 'success');
  };

  const updateClassSession = (id: string, partial: Partial<ClassSession>) => {
    const updated = timetable.map((s) => (s.id === id ? { ...s, ...partial } : s));
    setTimetableState(updated);
    storage.setTimetable(updated);
    refreshCarryItems(updated, subjects);
    showToast('Class Updated', 'Session details saved', 'success');
  };

  const deleteClassSession = (id: string) => {
    const updated = timetable.filter((s) => s.id !== id);
    setTimetableState(updated);
    storage.setTimetable(updated);
    refreshCarryItems(updated, subjects);
    showToast('Class Removed', 'Session deleted from schedule', 'info');
  };

  const setFullTimetable = (sessions: ClassSession[]) => {
    setTimetableState(sessions);
    storage.setTimetable(sessions);
    refreshCarryItems(sessions, subjects);
    showToast('Timetable Updated', `${sessions.length} class slots loaded`, 'success');
  };

  const setFullSubjectsAndTimetable = (newSubjects: Subject[], sessions: ClassSession[]) => {
    setSubjectsState(newSubjects);
    storage.setSubjects(newSubjects);
    setTimetableState(sessions);
    storage.setTimetable(sessions);
    refreshCarryItems(sessions, newSubjects);
    showToast('Timetable Imported', `${sessions.length} class slots loaded`, 'success');
  };

  const addHomework = (hwData: Omit<Homework, 'id' | 'createdAt'>): Homework => {
    const newHw: Homework = {
      ...hwData,
      id: `hw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setHomeworkState(prev => {
      const updated = [newHw, ...prev];
      storage.setHomework(updated);
      return updated;
    });
    showToast('Task Created', hwData.title, 'success');
    return newHw;
  };

  const updateHomework = (id: string, partial: Partial<Homework>) => {
    setHomeworkState(prev => {
      const updated = prev.map((h) => (h.id === id ? { ...h, ...partial } : h));
      storage.setHomework(updated);
      return updated;
    });
  };

  const deleteHomework = (id: string) => {
    setHomeworkState(prev => {
      const updated = prev.filter((h) => h.id !== id);
      storage.setHomework(updated);
      return updated;
    });
    showToast('Task Deleted', 'Assignment removed from list', 'info');
  };

  const toggleHomeworkStatus = (id: string) => {
    setHomeworkState(prev => {
      const target = prev.find((h) => h.id === id);
      if (!target) return prev;

      // 3-Stage Progress Lifecycle for Assignments: Not Started -> In Progress -> Completed -> Not Started
      let nextStatus: HomeworkStatus = 'In Progress';
      if (target.status === 'Not Started') {
        nextStatus = 'In Progress';
      } else if (target.status === 'In Progress') {
        nextStatus = 'Completed';
      } else {
        nextStatus = 'Not Started';
      }

      const updated = prev.map((h) =>
        h.id === id
          ? {
              ...h,
              status: nextStatus,
              completedAt: nextStatus === 'Completed' ? new Date().toISOString() : undefined,
            }
          : h
      );
      storage.setHomework(updated);

      if (nextStatus === 'In Progress') {
        showToast('In Progress', `"${target.title}" marked as in progress ⏳`, 'info');
      } else if (nextStatus === 'Completed') {
        triggerConfetti();
        showToast('Assignment Completed', `"${target.title}" completed! 🎉`, 'success');
      } else {
        showToast('Assignment Reset', `"${target.title}" reset to not started`, 'info');
      }

      return updated;
    });
  };

  const toggleCarryItemPacked = (id: string) => {
    const updated = carryItems.map((item) => {
      if (item.id === id) {
        const nextState = !item.isPacked;
        return { ...item, isPacked: nextState };
      }
      return item;
    });
    setCarryItemsState(updated);
    storage.setCarryItems(updated);

    const packedCount = updated.filter((i) => i.isPacked).length;
    if (packedCount === updated.length && updated.length > 0) {
      triggerConfetti();
      showToast('Bag Ready! 🎒', 'All required items are packed.', 'success');
    }
  };

  const addCustomCarryItem = (title: string, dateStr?: string, reminderNote?: string) => {
    const now = new Date();
    const currentHour = now.getHours();
    const defaultDate = currentHour >= 18 
      ? new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
      : new Date().toISOString().split('T')[0];                     // Today

    const targetDate = dateStr || defaultDate;
    const newItem: CarryItem = {
      id: `carry_cust_${Date.now()}`,
      title,
      source: 'custom',
      isPacked: false,
      date: targetDate,
      reminderNote,
    };
    const updated = [...carryItems, newItem];
    setCarryItemsState(updated);
    storage.setCarryItems(updated);
    showToast('Item Added to Bag', title, 'success');
  };

  const deleteCarryItem = (id: string) => {
    const updated = carryItems.filter((i) => i.id !== id);
    setCarryItemsState(updated);
    storage.setCarryItems(updated);
  };

  const markNotificationAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotificationsState(updated);
    storage.setNotifications(updated);
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotificationsState(updated);
    storage.setNotifications(updated);
    showToast('Inbox Cleared', 'All notifications marked as read', 'info');
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotificationsState(updated);
    storage.setNotifications(updated);
  };

  const triggerSimulatedAlert = (category: NotificationCategory) => {
    let title = '';
    let message = '';
    if (category === 'classes') {
      title = 'Class Alert: Machine Learning in 10 mins';
      message = 'Dr. Debanjan Sadhukhan · LT-1 (09:00 AM)';
    } else if (category === 'carry') {
      title = '🎒 Evening Bag Check (8:00 PM)';
      message = 'Tomorrow requires: Laptop (Charged), ML Lab Record, and Calculator.';
    } else if (category === 'deadlines') {
      title = '⚠️ Submission Due Today';
      message = 'PySpark Distributed ETL Pipeline due at 11:59 PM.';
    } else {
      title = 'Campus Notice: IIIT-NR Library Timing';
      message = 'Central Library reading hall will remain open until 2:00 AM for Mid-Semesters.';
    }

    const newNotif: AppNotification = {
      id: `notif_sim_${Date.now()}`,
      title,
      message,
      category,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [newNotif, ...notifications];
    setNotificationsState(updated);
    storage.setNotifications(updated);
    showToast(title, message, 'info');
    
    // Also trigger native OS push/local notification
    triggerLocalNotification(title, message);
  };

  const addEvent = (eventData: Omit<AcademicEvent, 'id'>) => {
    const newEvent: AcademicEvent = {
      ...eventData,
      id: `ev_${Date.now()}`,
    };
    const updated = [...events, newEvent];
    setEventsState(updated);
    storage.setEvents(updated);
    refreshCarryItems(timetable, subjects, updated);
    showToast('Event Added', eventData.title, 'success');
  };

  const addEvents = (eventsData: Omit<AcademicEvent, 'id'>[], overwrite = false) => {
    const newEvents = eventsData.map((ev, index) => ({
      ...ev,
      id: `ev_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
    }));
    const updated = overwrite ? newEvents : [...events, ...newEvents];
    setEventsState(updated);
    storage.setEvents(updated);
    refreshCarryItems(timetable, subjects, updated);
    if (newEvents.length > 0) {
      showToast('Calendar Updated', `${newEvents.length} event${newEvents.length > 1 ? 's' : ''} added to academic calendar`, 'success');
    }
  };

  const addExam = (examData: Omit<Exam, 'id' | 'createdAt'>): Exam => {
    const newExam: Exam = {
      ...examData,
      id: `exam_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...exams, newExam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExamsState(updated);
    storage.setExams(updated);
    showToast('Exam Added', examData.subjectName, 'success');
    return newExam;
  };

  const deleteExam = (id: string) => {
    const updated = exams.filter((e) => e.id !== id);
    setExamsState(updated);
    storage.setExams(updated);
    showToast('Exam Deleted', 'Exam removed', 'info');
  };

  const setFullExams = (newExams: Exam[]) => {
    const updated = [...newExams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExamsState(updated);
    storage.setExams(updated);
    showToast('Exams Updated', `${updated.length} exams loaded`, 'success');
  };

  const deleteEvent = (id: string) => {
    const target = events.find((e) => e.id === id);
    const updated = events.filter((e) => e.id !== id);
    setEventsState(updated);
    storage.setEvents(updated);
    refreshCarryItems(timetable, subjects, updated);
    showToast('Event Removed', target?.title || 'Calendar event deleted', 'info');
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettingsState(updated);
    storage.setSettings(updated);
    refreshCarryItems(timetable, subjects, events, updated);

    if (partial.theme) {
      if (partial.theme === 'dark' || (partial.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    showToast('Preferences Saved', 'Updated application settings', 'success');
  };

  const toggleSessionCancelled = (sessionId: string, dateStr?: string) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${targetDate}_${sessionId}`;
    
    setCancelledSessionsState((prev) => {
      const isAlreadyCancelled = prev.includes(key);
      const updated = isAlreadyCancelled ? prev.filter((k) => k !== key) : [...prev, key];
      storage.setCancelledSessions(updated);
      
      if (!isAlreadyCancelled) {
        showToast('Class Marked Cancelled', 'Session marked as cancelled for today.', 'info');
      } else {
        showToast('Class Restored', 'Session restored to regular schedule.', 'success');
      }
      return updated;
    });
  };

  const isSessionCancelled = (sessionId: string, dateStr?: string) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${targetDate}_${sessionId}`;
    return cancelledSessions.includes(key);
  };

  const rescheduleSession = (
    sessionId: string,
    details: { startTime: string; endTime: string; room?: string } | null,
    dateStr?: string
  ) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${targetDate}_${sessionId}`;

    setRescheduledSessionsState((prev) => {
      const updated = { ...prev };
      if (details === null) {
        delete updated[key];
        showToast('Reschedule Reverted', 'Class reverted to original scheduled time.', 'success');
      } else {
        updated[key] = details;
        showToast('Class Rescheduled', `Class time updated to ${details.startTime} - ${details.endTime}.`, 'success');
      }
      storage.setRescheduledSessions(updated);
      return updated;
    });
  };

  const searchBatchTimetable = async (
    college: string,
    programme: string,
    branch: string,
    semester: number
  ) => {
    try {
      const canonicalKey = getCanonicalBatchKey(college, programme, branch, semester);
      const docRef = doc(db, 'shared_timetables', canonicalKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (e) {
      console.error('Error searching for batch timetable:', e);
      return null;
    }
  };

  const joinBatchTimetable = async (batchKey: string) => {
    try {
      const docRef = doc(db, 'shared_timetables', batchKey);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        showToast('Batch Not Found', 'Could not locate batch timetable in database.', 'error');
        return;
      }
      const data = docSnap.data();

      // Update local storage and React state
      if (data.subjects) {
        setSubjectsState(data.subjects);
        storage.setSubjects(data.subjects);
      }
      if (data.timetable) {
        setTimetableState(data.timetable);
        storage.setTimetable(data.timetable);
      }
      if (data.events) {
        setEventsState(data.events);
        storage.setEvents(data.events);
      }
      if (data.exams) {
        setExamsState(data.exams);
        storage.setExams(data.exams);
      }

      // Update profile fields to show it's synced
      const updatedProfile = {
        ...profile,
        college: data.college || profile.college,
        programme: data.programme || profile.programme,
        branch: data.branch || profile.branch,
        semester: data.semester || profile.semester,
        batchKey: batchKey,
        isBatchSynced: true,
      };

      setProfileState(updatedProfile);
      storage.setProfile(updatedProfile);

      // Increment batch student counter in Firestore
      await updateDoc(docRef, {
        studentCount: increment(1),
      });

      showToast('Synced with Batch', `Successfully joined ${data.college} - Sem ${data.semester}.`, 'success');
    } catch (e) {
      console.error('Error joining batch timetable:', e);
      showToast('Join Failed', 'Failed to connect to batch timetable.', 'error');
    }
  };

  const shareTimetableWithBatch = async (): Promise<string> => {
    try {
      const canonicalKey = getCanonicalBatchKey(profile.college, profile.programme, profile.branch, profile.semester);
      const docRef = doc(db, 'shared_timetables', canonicalKey);
      
      const payload = {
        id: canonicalKey,
        college: profile.college,
        programme: profile.programme,
        branch: profile.branch,
        semester: profile.semester,
        creatorId: user?.id || 'anonymous',
        creatorName: profile.name || 'Anonymous Student',
        subjects: subjects,
        timetable: timetable,
        events: events,
        exams: exams,
        studentCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });

      const updatedProfile = {
        ...profile,
        batchKey: canonicalKey,
        isBatchSynced: true,
      };
      setProfileState(updatedProfile);
      storage.setProfile(updatedProfile);

      showToast('Timetable Shared', 'Your class schedule is now live for your batchmates!', 'success');
      return canonicalKey;
    } catch (e) {
      console.error('Error sharing timetable:', e);
      showToast('Share Failed', 'Failed to publish timetable to batch.', 'error');
      throw e;
    }
  };

  const disconnectBatchTimetable = () => {
    const updatedProfile = {
      ...profile,
      isBatchSynced: false,
    };
    setProfileState(updatedProfile);
    storage.setProfile(updatedProfile);
    showToast('Batch Disconnected', 'You can now customize your schedule locally.', 'info');
  };

  const resetAllData = async () => {
    // 1. Clear local storage (except profile, handled inside storage.ts)
    storage.resetAll();
    
    // 2. Reset React state to empty/defaults for everything except profile
    setSubjectsState([]);
    setTimetableState([]);
    setHomeworkState([]);
    setCarryItemsState([]);
    setNotificationsState([]);
    setEventsState([]);
    setExamsState([]);
    setCancelledSessionsState([]);
    setRescheduledSessionsState({});
    // Settings could optionally be kept, but keeping with clear-all except profile:
    // (If you want to keep settings, remove the next line and add settings to the Firestore save)
    
    // 3. Overwrite Firestore record to ONLY contain the profile, erasing everything else
    if (isClerkLoaded && user) {
      try {
        const userRef = doc(db, 'users', user.id);
        // Using setDoc without merge overwrites the document completely
        await setDoc(userRef, { profile }, { merge: false });
      } catch (e) {
        console.error('Failed to clear Firestore document during reset:', e);
      }
    }
  };

  const shareCalendarWithBatch = async (): Promise<string> => {
    try {
      const canonicalKey = getCanonicalBatchKey(profile.college, profile.programme, profile.branch, profile.semester);
      const docRef = doc(db, 'shared_calendars', canonicalKey);
      
      const payload = {
        id: canonicalKey,
        college: profile.college,
        programme: profile.programme,
        branch: profile.branch,
        semester: profile.semester,
        creatorId: user?.id || 'anonymous',
        creatorName: profile.name || 'Anonymous Student',
        events: events,
        exams: exams,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      showToast('Calendar Shared', 'Your academic calendar is now live for your batchmates!', 'success');
      return canonicalKey;
    } catch (e) {
      console.error('Error sharing academic calendar:', e);
      showToast('Share Failed', 'Failed to publish calendar to batch.', 'error');
      throw e;
    }
  };

  const joinSharedCalendar = async (calendarKey: string) => {
    try {
      const docRef = doc(db, 'shared_calendars', calendarKey);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        showToast('Calendar Not Found', 'Could not locate shared calendar in database.', 'error');
        return;
      }
      const data = docSnap.data();

      if (data.events) {
        setEventsState(data.events);
        storage.setEvents(data.events);
      }
      if (data.exams) {
        setExamsState(data.exams);
        storage.setExams(data.exams);
      }

      showToast('Calendar Synced', `Successfully imported shared calendar events.`, 'success');
    } catch (e) {
      console.error('Error joining shared calendar:', e);
      showToast('Sync Failed', 'Failed to connect to shared calendar.', 'error');
    }
  };

  const shareExamsWithBatch = async (): Promise<string> => {
    try {
      const canonicalKey = getCanonicalBatchKey(profile.college, profile.programme, profile.branch, profile.semester);
      const docRef = doc(db, 'shared_exams', canonicalKey);
      
      const payload = {
        id: canonicalKey,
        college: profile.college,
        programme: profile.programme,
        branch: profile.branch,
        semester: profile.semester,
        creatorId: user?.id || 'anonymous',
        creatorName: profile.name || 'Anonymous Student',
        exams: exams,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      showToast('Exams Shared', 'Your exam schedule is now live for your batchmates!', 'success');
      return canonicalKey;
    } catch (e) {
      console.error('Error sharing exam schedule:', e);
      showToast('Share Failed', 'Failed to publish exams to batch.', 'error');
      throw e;
    }
  };

  const joinSharedExams = async (examsKey: string) => {
    try {
      const docRef = doc(db, 'shared_exams', examsKey);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        showToast('Exams Not Found', 'Could not locate shared exams in database.', 'error');
        return;
      }
      const data = docSnap.data();

      if (data.exams) {
        setExamsState(data.exams);
        storage.setExams(data.exams);
      }

      showToast('Exams Synced', `Successfully imported shared exam schedule.`, 'success');
    } catch (e) {
      console.error('Error joining shared exams:', e);
      showToast('Sync Failed', 'Failed to connect to shared exams.', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        shareCalendarWithBatch,
        joinSharedCalendar,
        shareExamsWithBatch,
        joinSharedExams,
        isHydrated,
        activeView,
        setActiveView,
        profile,
        updateProfile,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        timetable,
        addClassSession,
        updateClassSession,
        deleteClassSession,
        setFullTimetable,
        setFullSubjectsAndTimetable,
        homework,
        addHomework,
        updateHomework,
        deleteHomework,
        toggleHomeworkStatus,
        carryItems,
        toggleCarryItemPacked,
        addCustomCarryItem,
        deleteCarryItem,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        triggerSimulatedAlert,
        exams,
        addExam,
        deleteExam,
        setFullExams,
        events,
        addEvent,
        addEvents,
        deleteEvent,
        settings,
        updateSettings,
        showOnboarding,
        setShowOnboarding,
        commandPaletteOpen,
        setCommandPaletteOpen,
        triggerConfetti,
        cancelledSessions,
        toggleSessionCancelled,
        isSessionCancelled,
        rescheduledSessions,
        rescheduleSession,
        searchBatchTimetable,
        joinBatchTimetable,
        shareTimetableWithBatch,
        disconnectBatchTimetable,
        toastMessage,
        showToast,
        showHolidayAnimation,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
