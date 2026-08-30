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
  BatchProposedTask,
  HomeworkPriority,
  AdminRole,
} from '@/lib/types';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/lib/initialData';
import { storage } from '@/lib/storage';
import { 
  calculateTomorrowCarryItems, 
  getCanonicalBatchKey,
  getShortCollegeName,
  normalizeProgrammeName,
  normalizeBranchName,
  normalizeSection
} from '@/lib/timetableUtils';
import { checkAndGenerateSmartNotifications } from '@/lib/notificationEngine';
import confetti from 'canvas-confetti';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, getDocs, query, where, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { registerPushNotifications } from '@/lib/pushNotifications';
import { triggerLocalNotification, scheduleTimetableLocalNotifications } from '@/lib/localNotifications';
import { isUserSuperAdmin } from '@/lib/adminAuth';

// Helper to remove any undefined fields before writing to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

export type ActiveView =
  | 'home'
  | 'timetable'
  | 'homework'
  | 'carry'
  | 'subjects'
  | 'calendar'
  | 'exams'
  | 'notifications'
  | 'settings'
  | 'mess';

export interface AppContextType {
  isHydrated: boolean;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  profile: StudentProfile;
  isBatchCR: boolean;
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
  addCustomCarryItem: (title: string, subjectId?: string, reminderNote?: string) => void;
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
  messMenu: any | null;
  updateMessMenu: (menu: any) => void;
  showMessOnboarding: boolean;
  setShowMessOnboarding: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  triggerConfetti: () => void;
  cancelledSessions: string[];
  toggleSessionCancelled: (sessionId: string, dateStr?: string) => void;
  isSessionCancelled: (sessionId: string, dateStr?: string) => boolean;
  rescheduledSessions: Record<string, { startTime: string; endTime: string; room?: string }>;
  rescheduleSession: (sessionId: string, details: { startTime: string; endTime: string; room?: string } | null, dateStr?: string) => void;
  currentBatchData: any | null;
  searchBatchTimetable: (college: string, programme: string, branch: string, semester: number, section?: string) => Promise<any | null>;
  fetchCollegeBatches: (college: string) => Promise<any[]>;
  joinBatchTimetable: (batchKey: string, providedCode?: string) => Promise<void>;
  shareTimetableWithBatch: () => Promise<string>;
  disconnectBatchTimetable: () => void;
  shareCalendarWithBatch: () => Promise<string>;
  joinSharedCalendar: (calendarKey: string) => Promise<void>;
  shareExamsWithBatch: () => Promise<string>;
  joinSharedExams: (examsKey: string) => Promise<void>;
  toastMessage: { id: number; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  proposedBatchTasks: BatchProposedTask[];
  proposeBatchTask: (task: {
    title: string;
    description?: string;
    subjectId: string;
    subjectName?: string;
    deadline: string;
    priority: HomeworkPriority;
    attachmentName?: string;
  }) => Promise<string>;
  voteBatchTask: (proposalId: string, vote: 'approve' | 'reject') => Promise<void>;
  showHolidayAnimation: boolean;
  resetAllData: () => Promise<void>;
  user: any;
  isClerkLoaded: boolean;
}


const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [messMenu, setMessMenu] = useState<any | null>(null);
  const [showMessOnboarding, setShowMessOnboarding] = useState(false);
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
  const [proposedBatchTasks, setProposedBatchTasks] = useState<BatchProposedTask[]>([]);
  const [currentBatchData, setCurrentBatchData] = useState<any>(null);

  const [user, setUser] = useState<any>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
          primaryEmailAddress: firebaseUser.email ? { emailAddress: firebaseUser.email } : null,
        });
      } else {
        setUser(null);
      }
      setIsAuthLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const isClerkLoaded = isAuthLoaded;
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const remoteStateString = useRef("");
  const isApplyingRemote = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const scheduleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track alert IDs already shown so we don't re-notify on every snapshot
  const seenBatchAlertIds = useRef<Set<string>>(new Set());
  // True until the very first snapshot fires — used to silently load existing alerts
  const isFirstBatchSnapshot = useRef(true);

  // Authority & CR verification for current batch
  const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
  const isSuperAdmin = isUserSuperAdmin(profile, userEmail);
  const isLegacyBatch = !currentBatchData?.crUserIds && !currentBatchData?.crEmails;
  const isPrimaryCreator = isLegacyBatch && (currentBatchData?.creatorId === user?.id || (currentBatchData?.creatorEmail && currentBatchData?.creatorEmail === userEmail));
  const isCoCR = currentBatchData?.crUserIds?.includes(user?.id) || currentBatchData?.crEmails?.includes(userEmail) || profile.role === 'cr';
  const isBatchCR = !profile.isBatchSynced || isSuperAdmin || isPrimaryCreator || isCoCR;

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
        defaultName = defaultName.split('.').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
        if (data.messMenu !== undefined) { setMessMenu(data.messMenu); if(data.messMenu) { window.localStorage.setItem("intersemester_mess_menu_v1", JSON.stringify(data.messMenu)); } else { window.localStorage.removeItem("intersemester_mess_menu_v1"); } }

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

  // ─── Helper: fire a native-or-web notification for batch events ──────────────
  // Uses Capacitor LocalNotifications on Android/iOS, Web Notification API on browser.
  // Silent no-op if platform doesn't support or user hasn't granted permission.
  const fireBatchNotification = (title: string, body: string) => {
    try {
      // Import is already at top: triggerLocalNotification handles Capacitor check internally
      triggerLocalNotification(title, body).catch(() => {});
    } catch (_) {}
    // Also try Web Notification API (PWA / browser)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'academi-sync-batch-alert',
        } as NotificationOptions);
      } catch (_) { /* Safari private mode or unsupported */ }
    }
  };

  // ─── Request Web Notification permission (called once when user joins a batch) ─
  const requestBatchNotificationPermission = () => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // Small delay so the app is fully loaded before the browser prompt appears
      setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3000);
    }
  };

  // Firestore Live Sync for Batch Timetables (for synced users)
  useEffect(() => {
    if (!profile.isBatchSynced || !profile.batchKey) return;

    // Ask for notification permission once the batch listener starts
    requestBatchNotificationPermission();

    // Reset the first-snapshot flag each time batchKey changes (re-join / switch batch)
    isFirstBatchSnapshot.current = true;

    const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);

    const unsubscribe = onSnapshot(batchDocRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      setCurrentBatchData(data);

      // ── Sync timetable & related data ────────────────────────────────────────
      if (data.subjects) {
        setSubjectsState(data.subjects);
        storage.setSubjects(data.subjects);
      }
      if (data.timetable) {
        setTimetableState(data.timetable);
        storage.setTimetable(data.timetable);
      }
      if (Array.isArray(data.events) && data.events.length > 0) {
        setEventsState(data.events);
        storage.setEvents(data.events);
      }
      if (Array.isArray(data.exams) && data.exams.length > 0) {
        setExamsState(data.exams);
        storage.setExams(data.exams);
      }
      if (Array.isArray(data.cancelledSessions)) {
        setCancelledSessionsState(data.cancelledSessions);
        storage.setCancelledSessions(data.cancelledSessions);
      }
      if (data.rescheduledSessions && typeof data.rescheduledSessions === 'object') {
        setRescheduledSessionsState(data.rescheduledSessions);
        storage.setRescheduledSessions(data.rescheduledSessions);
      }

      // ── Handle batch alerts (CR class cancel / reschedule notifications) ─────
      if (Array.isArray(data.batchAlerts) && data.batchAlerts.length > 0) {
        if (isFirstBatchSnapshot.current) {
          // On very first load: silently mark ALL existing alerts as seen.
          // This prevents bombarding user with old notifications on every app open.
          data.batchAlerts.forEach((alert: { id: string }) => {
            seenBatchAlertIds.current.add(alert.id);
          });
        } else {
          // On subsequent real-time updates: only show truly new alerts
          data.batchAlerts.forEach((alert: { id: string; title: string; body: string; createdAt: string }) => {
            if (seenBatchAlertIds.current.has(alert.id)) return;
            seenBatchAlertIds.current.add(alert.id);
            // Extra guard: ignore if somehow older than 5 minutes (stale)
            const ageMs = Date.now() - new Date(alert.createdAt).getTime();
            if (ageMs > 5 * 60 * 1000) return;
            fireBatchNotification(alert.title, alert.body);
            showToast(alert.title, alert.body, 'info');
          });
        }
      }

      // Mark first snapshot as done
      isFirstBatchSnapshot.current = false;

    }, (err) => {
      console.error('Batch timetable listener error:', err);
    });

    // Listen to Batch Proposed Tasks for Voting & Auto-Sync
    const proposalsRef = collection(db, 'shared_timetables', profile.batchKey, 'proposed_tasks');
    const unsubProposals = onSnapshot(proposalsRef, (snapshot) => {
      const fetched: BatchProposedTask[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as BatchProposedTask);
      });
      setProposedBatchTasks(fetched);

      // Check for approved proposals to auto-insert into local homework
      fetched.forEach((prop) => {
        if (prop.status === 'approved') {
          setHomeworkState((prevHw) => {
            const alreadyExists = prevHw.some(
              (h) => h.proposalId === prop.id || (h.title === prop.title && h.deadline === prop.deadline)
            );
            if (alreadyExists) return prevHw;

            const newHw: Homework = {
              id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              subjectId: prop.subjectId,
              subjectName: prop.subjectName,
              title: prop.title,
              description: prop.description || '',
              deadline: prop.deadline,
              priority: prop.priority,
              status: 'Not Started',
              attachmentName: prop.attachmentName || '',
              createdAt: new Date().toISOString(),
              isBatchShared: true,
              proposalId: prop.id,
            };
            const updated = [newHw, ...prevHw];
            storage.setHomework(updated);
            return updated;
          });
        }
      });
    }, (err) => {
      console.error('Error listening to batch proposals:', err);
    });

    return () => {
      unsubscribe();
      unsubProposals();
    };
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
      messMenu,
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
      const cleanState = sanitizeForFirestore(currentState);
      setDoc(userRef, cleanState, { merge: true })
        .then(() => {
          remoteStateString.current = JSON.stringify(cleanState);
        })
        .catch((e) => console.error('Firebase Sync Error', e));

      if (profile.isBatchSynced && profile.batchKey && isBatchCR) {
        const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);
        const batchPayload = sanitizeForFirestore({
          subjects: subjects,
          timetable: timetable,
          events: events,
          exams: exams,
          updatedAt: new Date().toISOString(),
        });
        setDoc(batchDocRef, batchPayload, { merge: true })
          .catch((e) => console.error('Firebase Batch Sync Error', e));
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [profile, subjects, timetable, homework, carryItems, notifications, events, exams, settings, cancelledSessions, rescheduledSessions, messMenu, user, isClerkLoaded, isHydrated, isCloudSynced, isBatchCR]);

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
    const loadedMessMenuStr = typeof window !== 'undefined' ? window.localStorage.getItem('intersemester_mess_menu_v1') : null;
    let loadedMessMenu = null;
    try {
      if (loadedMessMenuStr) loadedMessMenu = JSON.parse(loadedMessMenuStr);
    } catch(e) {}

    setMessMenu(loadedMessMenu);
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
    }, 2500);
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

  const addCustomCarryItem = (title: string, subjectId?: string, reminderNote?: string) => {
    const now = new Date();
    const currentHour = now.getHours();
    const defaultDate = currentHour >= 18 
      ? new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
      : new Date().toISOString().split('T')[0];                     // Today

    let subjectName;
    if (subjectId) {
      const sub = subjects.find(s => s.id === subjectId);
      if (sub) subjectName = sub.name;
    }

    const newItem: CarryItem = {
      id: `carry_cust_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
      title,
      source: 'custom',
      subjectId,
      subjectName,
      isPacked: false,
      date: defaultDate,
      reminderNote,
    };
    const updated = [...carryItems, newItem];
    setCarryItemsState(updated);
    storage.setCarryItems(updated);
    showToast('Item Added to Bag', title, 'success');
  };

  const deleteCarryItem = (id: string) => {
    const item = carryItems.find(i => i.id === id);
    if (item?.source === 'subject') {
      const updated = carryItems.map(i => i.id === id ? { ...i, isHidden: true } : i);
      setCarryItemsState(updated);
      storage.setCarryItems(updated);
      return;
    }
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
      title: eventData.title || 'Event',
      type: eventData.type || 'event',
      date: eventData.date,
      description: eventData.description || '',
      location: eventData.location || '',
      id: `ev_${Date.now()}`,
    };
    const updated = [...events, newEvent];
    setEventsState(updated);
    storage.setEvents(updated);
    refreshCarryItems(timetable, subjects, updated);
    
    if (user) {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { events: sanitizeForFirestore(updated), lastUpdated: Date.now() }, { merge: true })
        .catch(err => console.error('Error saving events:', err));
    }
    showToast('Event Added', eventData.title, 'success');
  };

  const addEvents = (eventsData: Omit<AcademicEvent, 'id'>[], overwrite = false) => {
    const newEvents: AcademicEvent[] = eventsData.map((ev, index) => ({
      title: ev.title || 'Event',
      type: ev.type || 'event',
      date: ev.date,
      description: ev.description || '',
      location: ev.location || '',
      id: `ev_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
    }));
    const updated = overwrite ? newEvents : [...events, ...newEvents];
    setEventsState(updated);
    storage.setEvents(updated);
    refreshCarryItems(timetable, subjects, updated);

    if (user) {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { events: sanitizeForFirestore(updated), lastUpdated: Date.now() }, { merge: true })
        .catch(err => console.error('Error saving events:', err));

      if (profile.isBatchSynced && profile.batchKey && isBatchCR) {
        const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);
        setDoc(batchDocRef, { events: sanitizeForFirestore(updated), updatedAt: new Date().toISOString() }, { merge: true })
          .catch(err => console.error('Error saving events to batch:', err));
      }
    }

    if (newEvents.length > 0) {
      showToast('Calendar Updated', `${newEvents.length} event${newEvents.length > 1 ? 's' : ''} added to academic calendar`, 'success');
    }
  };

  const addExam = (examData: Omit<Exam, 'id' | 'createdAt'>): Exam => {
    const newExam: Exam = {
      subjectName: examData.subjectName || '',
      date: examData.date,
      syllabus: examData.syllabus || '',
      room: examData.room || '',
      durationMinutes: examData.durationMinutes || undefined,
      id: `exam_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...exams, newExam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExamsState(updated);
    storage.setExams(updated);

    if (user) {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { exams: sanitizeForFirestore(updated), lastUpdated: Date.now() }, { merge: true })
        .catch(err => console.error('Error saving exams:', err));
    }
    showToast('Exam Added', examData.subjectName, 'success');
    return newExam;
  };

  const deleteExam = (id: string) => {
    const updated = exams.filter((e) => e.id !== id);
    setExamsState(updated);
    storage.setExams(updated);

    if (user) {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { exams: sanitizeForFirestore(updated), lastUpdated: Date.now() }, { merge: true })
        .catch(err => console.error('Error saving exams on delete:', err));
    }
    showToast('Exam Deleted', 'Exam removed', 'info');
  };

  const setFullExams = (newExams: Exam[]) => {
    const cleanExams: Exam[] = newExams.map(ex => ({
      id: ex.id || `exam_${Date.now()}`,
      subjectName: ex.subjectName || '',
      date: ex.date,
      syllabus: ex.syllabus || '',
      room: ex.room || '',
      durationMinutes: ex.durationMinutes || undefined,
      createdAt: ex.createdAt || new Date().toISOString(),
    }));
    const updated = [...cleanExams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExamsState(updated);
    storage.setExams(updated);

    if (user) {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { exams: sanitizeForFirestore(updated), lastUpdated: Date.now() }, { merge: true })
        .catch(err => console.error('Error saving exams on full set:', err));

      if (profile.isBatchSynced && profile.batchKey && isBatchCR) {
        const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);
        setDoc(batchDocRef, { exams: sanitizeForFirestore(updated), updatedAt: new Date().toISOString() }, { merge: true })
          .catch(err => console.error('Error saving exams to batch:', err));
      }
    }
    showToast('Exams Updated', `${updated.length} exams loaded`, 'success');
  };

  const deleteEvent = (id: string) => {
    const target = events.find((e) => e.id === id);
    const updated = events.filter((e) => e.id !== id);
    setEventsState(updated);
    storage.setEvents(updated);
    refreshCarryItems(timetable, subjects, updated);

    if (user) {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { events: sanitizeForFirestore(updated), lastUpdated: Date.now() }, { merge: true })
        .catch(err => console.error('Error saving events on delete:', err));
    }
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

  const toggleSessionCancelled = async (sessionId: string, dateStr?: string) => {
    // Non-CR batch users cannot cancel/restore — personal users always free
    if (profile.isBatchSynced && profile.batchKey && !isBatchCR) {
      showToast('CR Access Required', 'Only the CR can cancel or restore classes for the batch.', 'error');
      return;
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${targetDate}_${sessionId}`;
    const isAlreadyCancelled = cancelledSessions.includes(key);
    const updated = isAlreadyCancelled
      ? cancelledSessions.filter((k) => k !== key)
      : [...cancelledSessions, key];

    setCancelledSessionsState(updated);
    storage.setCancelledSessions(updated);

    const crName = profile.name || 'CR';
    if (!isAlreadyCancelled) {
      showToast('Class Cancelled', 'Session marked as cancelled for today.', 'info');
    } else {
      showToast('Class Restored', 'Session restored to regular schedule.', 'success');
    }

    // Sync to Firestore + push batch alert if in a batch
    if (profile.isBatchSynced && profile.batchKey) {
      try {
        const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);

        // Find subject name from timetable
        const session = timetable.find((s) => s.id === sessionId);
        const subject = session ? subjects.find((sub) => sub.id === session.subjectId) : null;
        const subjectLabel = subject?.name || subject?.shortName || 'Class';

        const alertPayload = !isAlreadyCancelled ? {
          id: `cancel_${sessionId}_${targetDate}_${Date.now()}`,
          title: '🚫 Class Cancelled',
          body: `${subjectLabel} cancelled for today by ${crName} (CR)`,
          type: 'cancel',
          sessionId,
          date: targetDate,
          createdAt: new Date().toISOString(),
        } : {
          id: `restore_${sessionId}_${targetDate}_${Date.now()}`,
          title: '✅ Class Restored',
          body: `${subjectLabel} is back on schedule — update from ${crName} (CR)`,
          type: 'restore',
          sessionId,
          date: targetDate,
          createdAt: new Date().toISOString(),
        };

        // Keep only last 20 alerts to prevent unbounded growth
        const existingAlerts: any[] = currentBatchData?.batchAlerts || [];
        const trimmedAlerts = [...existingAlerts.slice(-19), alertPayload];

        await updateDoc(batchDocRef, {
          cancelledSessions: updated,
          batchAlerts: trimmedAlerts,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error syncing cancelled session to batch:', e);
      }
    }
  };

  const isSessionCancelled = (sessionId: string, dateStr?: string) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${targetDate}_${sessionId}`;
    return cancelledSessions.includes(key);
  };

  const rescheduleSession = async (
    sessionId: string,
    details: { startTime: string; endTime: string; room?: string } | null,
    dateStr?: string
  ) => {
    // Non-CR batch users cannot reschedule — personal users always free
    if (profile.isBatchSynced && profile.batchKey && !isBatchCR) {
      showToast('CR Access Required', 'Only the CR can reschedule classes for the batch.', 'error');
      return;
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${targetDate}_${sessionId}`;
    const updated = { ...rescheduledSessions };
    const crName = profile.name || 'CR';

    if (details === null) {
      delete updated[key];
      showToast('Reschedule Reverted', 'Class reverted to original time.', 'success');
    } else {
      updated[key] = details;
      showToast('Class Rescheduled', `Class moved to ${details.startTime}–${details.endTime}.`, 'success');
    }

    setRescheduledSessionsState(updated);
    storage.setRescheduledSessions(updated);

    // Sync to Firestore + push batch alert if in a batch
    if (profile.isBatchSynced && profile.batchKey) {
      try {
        const batchDocRef = doc(db, 'shared_timetables', profile.batchKey);

        const session = timetable.find((s) => s.id === sessionId);
        const subject = session ? subjects.find((sub) => sub.id === session.subjectId) : null;
        const subjectLabel = subject?.name || subject?.shortName || 'Class';

        let alertPayload: object | null = null;
        if (details !== null) {
          alertPayload = {
            id: `reschedule_${sessionId}_${targetDate}_${Date.now()}`,
            title: '⏰ Class Rescheduled',
            body: `${subjectLabel} moved to ${details.startTime}–${details.endTime}${details.room ? ` in ${details.room}` : ''} by ${crName} (CR)`,
            type: 'reschedule',
            sessionId,
            date: targetDate,
            createdAt: new Date().toISOString(),
          };
        }

        const existingAlerts: any[] = currentBatchData?.batchAlerts || [];
        const trimmedAlerts = alertPayload
          ? [...existingAlerts.slice(-19), alertPayload]
          : existingAlerts;

        await updateDoc(batchDocRef, {
          rescheduledSessions: updated,
          batchAlerts: trimmedAlerts,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error syncing rescheduled session to batch:', e);
      }
    }
  };

  const searchBatchTimetable = async (
    college: string,
    programme: string,
    branch: string,
    semester: number,
    section: string = 'A'
  ) => {
    try {
      // 1. Direct canonical key lookup (with section)
      const canonicalKey = getCanonicalBatchKey(college, programme, branch, semester, section);
      const docRef = doc(db, 'shared_timetables', canonicalKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: canonicalKey };
      }

      // 1b. Legacy key lookup (without section)
      const legacyShortCollege = getShortCollegeName(college);
      const cleanCol = legacyShortCollege.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanProg = normalizeProgrammeName(programme);
      const cleanBr = normalizeBranchName(branch);
      const legacyKey = `${cleanCol}_${cleanProg}_${cleanBr}_sem${semester}`;
      const legacyRef = doc(db, 'shared_timetables', legacyKey);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        return { ...legacySnap.data(), id: legacyKey };
      }

      // 2. Resilient Firestore search by semester & normalized matching
      const q = query(collection(db, 'shared_timetables'), where('semester', '==', Number(semester)));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const cleanInputCollege = cleanCol;
        const cleanInputProg = cleanProg;
        const cleanInputBranch = cleanBr;
        const cleanInputSec = normalizeSection(section);

        for (const d of querySnap.docs) {
          const data = d.data();
          const docCollege = (data.college || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const shortDocCol = getShortCollegeName(data.college || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const docProg = normalizeProgrammeName(data.programme || '');
          const docBranch = normalizeBranchName(data.branch || '');
          const docSection = normalizeSection(data.section || 'A');

          const progMatch = !cleanInputProg || docProg === cleanInputProg || docProg.includes(cleanInputProg) || cleanInputProg.includes(docProg);
          const branchMatch = !cleanInputBranch || docBranch === cleanInputBranch;
          const sectionMatch = !data.section || docSection === cleanInputSec;
          const collegeMatch = 
            shortDocCol === cleanInputCollege ||
            docCollege.includes(cleanInputCollege) || 
            cleanInputCollege.includes(docCollege) ||
            (cleanInputCollege.includes('iiit') && docCollege.includes('iiit') && (cleanInputCollege.includes('raipur') || cleanInputCollege.includes('nr')));

          if (progMatch && collegeMatch && branchMatch && sectionMatch) {
            return { ...data, id: d.id };
          }
        }
      }

      return null;
    } catch (e) {
      console.error('Error searching for batch timetable:', e);
      return null;
    }
  };

  const fetchCollegeBatches = async (college: string): Promise<any[]> => {
    if (!college || !college.trim()) return [];
    try {
      const shortCollege = getShortCollegeName(college);
      const cleanKey = shortCollege.toLowerCase().replace(/[^a-z0-9]/g, '');
      const querySnap = await getDocs(collection(db, 'shared_timetables'));
      
      const batches: any[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const docCollege = (data.college || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const shortDocCollege = getShortCollegeName(data.college || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const isMatch = docId.startsWith(cleanKey) || 
                        docCollege.includes(cleanKey) || 
                        cleanKey.includes(docCollege) ||
                        shortDocCollege === cleanKey ||
                        (cleanKey.includes('iiit') && docCollege.includes('iiit') && (cleanKey.includes('raipur') || cleanKey.includes('nr')));

        if (isMatch) {
          batches.push({
            id: docId,
            ...data,
            subjectsCount: data.subjects?.length || 0,
            studentCount: data.studentCount || (data.crEmails?.length || 1),
          });
        }
      });

      // Sort by student count descending (most active batches first)
      batches.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
      return batches;
    } catch (e) {
      console.error('Error fetching college batches:', e);
      return [];
    }
  };

  const joinBatchTimetable = async (batchKeyOrCode: string, providedCode?: string) => {
    try {
      let docRef = doc(db, 'shared_timetables', batchKeyOrCode);
      let docSnap = await getDoc(docRef);
      let batchKey = batchKeyOrCode;

      // If not found directly by document ID, look up by inviteCode
      if (!docSnap.exists()) {
        const q = query(collection(db, 'shared_timetables'), where('inviteCode', '==', batchKeyOrCode.trim().toUpperCase()));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          docSnap = querySnap.docs[0];
          batchKey = docSnap.id;
          docRef = doc(db, 'shared_timetables', batchKey);
        }
      }

      if (!docSnap.exists()) {
        showToast('Batch Not Found', 'Could not locate batch with that code or identifier.', 'error');
        throw new Error('Batch not found');
      }

      const data = docSnap.data();
      const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
      const isCRorCreator = data.creatorId === user?.id || data.crUserIds?.includes(user?.id) || data.crEmails?.includes(userEmail);
      const isDirectCodeMatch = batchKeyOrCode.trim().toUpperCase() === data.inviteCode?.toUpperCase();

      // Enforce Batch Passcode / Unique Code Verification
      if (data.inviteCode && !isCRorCreator && !isDirectCodeMatch) {
        if (!providedCode || providedCode.trim().toUpperCase() !== data.inviteCode.toUpperCase()) {
          showToast('Invalid Batch Code', 'Please enter the official Batch Code given by your CR to join.', 'error');
          throw new Error('Invalid batch passcode');
        }
      }

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

      // Fix: A user is only the first person if there are NO existing CRs AND student count is 0
      const isFirstPerson = ((data.studentCount || 0) <= 0) && (!data.crUserIds?.length && !data.crEmails?.length);

      const assignedRole: AdminRole = isFirstPerson 
        ? 'cr' 
        : (data.crUserIds?.includes(user?.id) || data.crEmails?.includes(userEmail) ? 'cr' : (profile.role === 'super_admin' ? 'super_admin' : 'student'));

      // Update profile fields to show it's synced
      const updatedProfile: StudentProfile = {
        ...profile,
        college: data.college || profile.college,
        programme: data.programme || profile.programme,
        branch: data.branch || profile.branch,
        semester: data.semester || profile.semester,
        section: data.section || profile.section || 'A',
        batchKey: batchKey,
        isBatchSynced: true,
        role: assignedRole,
      };

      setProfileState(updatedProfile);
      storage.setProfile(updatedProfile);

      // Increment batch student counter in Firestore (and set creator / CR if first person)
      const updatePayload: any = {
        studentCount: increment(1),
      };
      if (isFirstPerson) {
        updatePayload.creatorId = user?.id || 'anonymous';
        updatePayload.creatorName = profile.name || user?.fullName || 'Batch Representative';
        updatePayload.creatorEmail = userEmail;
        updatePayload.crUserIds = [user?.id].filter(Boolean);
        updatePayload.crEmails = [userEmail].filter(Boolean);
      }
      await updateDoc(docRef, updatePayload);

      if (isFirstPerson) {
        showToast('Batch Initialized as CR', `You are the first member and have been assigned as Class Representative (CR)!`, 'success');
      } else {
        showToast('Synced with Batch', `Successfully joined ${data.college} - Sem ${data.semester}.`, 'success');
      }
    } catch (e: any) {
      console.error('Error joining batch timetable:', e);
      if (!e?.message?.includes('Invalid batch passcode')) {
        showToast('Join Failed', 'Failed to connect to batch timetable.', 'error');
      }
      throw e;
    }
  };

  const shareTimetableWithBatch = async (): Promise<string> => {
    // If student is already synced to a batch, return the batch key so they can share it freely!
    if (profile.isBatchSynced && profile.batchKey) {
      // If student is CR or Super Admin, also push latest changes to Firestore
      if (isBatchCR) {
        try {
          const docRef = doc(db, 'shared_timetables', profile.batchKey);
          const payload = sanitizeForFirestore({
            subjects,
            timetable,
            events,
            exams,
            updatedAt: new Date().toISOString(),
          });
          await updateDoc(docRef, payload);
        } catch (e) {
          console.error('Error updating batch timetable:', e);
        }
      }
      return profile.batchKey;
    }

    try {
      const canonicalKey = getCanonicalBatchKey(profile.college, profile.programme, profile.branch, profile.semester, profile.section || 'A');
      const docRef = doc(db, 'shared_timetables', canonicalKey);
      
      const userEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';
      const newInviteCode = generateInviteCode();

      const payload = sanitizeForFirestore({
        id: canonicalKey,
        college: profile.college,
        programme: profile.programme,
        branch: profile.branch,
        semester: profile.semester,
        section: profile.section || 'A',
        creatorId: user?.id || 'anonymous',
        creatorName: profile.name || 'Anonymous Student',
        creatorEmail: userEmail,
        crUserIds: [user?.id].filter(Boolean),
        crEmails: [userEmail].filter(Boolean),
        inviteCode: newInviteCode,
        subjects: subjects,
        timetable: timetable,
        events: events,
        exams: exams,
        studentCount: currentBatchData?.studentCount || 1,
        createdAt: currentBatchData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(docRef, payload, { merge: true });

      const updatedProfile: StudentProfile = {
        ...profile,
        batchKey: canonicalKey,
        isBatchSynced: true,
        role: (profile.role === 'super_admin' ? 'super_admin' : 'cr') as AdminRole,
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

  const updateMessMenu = (menu: any) => {
    setMessMenu(menu);
    if (menu) { localStorage.setItem('intersemester_mess_menu_v1', JSON.stringify(menu)); } else { localStorage.removeItem('intersemester_mess_menu_v1'); }
  };

  const resetAllData = async () => {
    const userEmail = user?.primaryEmailAddress?.emailAddress || '';
    let defaultName = user?.fullName || user?.firstName || '';
    if (!defaultName && userEmail) {
      defaultName = userEmail.split('@')[0];
      defaultName = defaultName.split('.').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    const cleanProfile: StudentProfile = {
      ...DEFAULT_PROFILE,
      id: user?.id || 'guest',
      name: defaultName || 'Student',
      email: userEmail,
      college: '',
      programme: '',
      branch: '',
      semester: 1,
      year: 1,
      rollNumber: '',
      isBatchSynced: false,
      batchKey: undefined,
      onboardingCompleted: false,
    };

    // 1. Clear local storage completely
    storage.clearUserSession();
    storage.setProfile(cleanProfile);
    storage.setSettings(DEFAULT_SETTINGS);

    // 2. Reset React state to clean empty defaults
    setProfileState(cleanProfile);
    setSubjectsState([]);
    setTimetableState([]);
    setHomeworkState([]);
    setCarryItemsState([]);
    setNotificationsState([]);
    setEventsState([]);
    setExamsState([]);
    setCancelledSessionsState([]);
    setRescheduledSessionsState({});
    setSettingsState(DEFAULT_SETTINGS);
    remoteStateString.current = "";

    // 3. Overwrite Firestore record completely with clean blank slate
    if (isClerkLoaded && user) {
      try {
        const userRef = doc(db, 'users', user.id);
        const blankCloudDoc = sanitizeForFirestore({
          profile: cleanProfile,
          subjects: [],
          timetable: [],
          homework: [],
          carryItems: [],
          notifications: [],
          events: [],
          exams: [],
          settings: DEFAULT_SETTINGS,
          cancelledSessions: [],
          rescheduledSessions: {},
          lastUpdated: Date.now(),
        });
        await setDoc(userRef, blankCloudDoc, { merge: false });
      } catch (e) {
        console.error('Failed to clear Firestore document during reset:', e);
      }
    }
  };

  const shareCalendarWithBatch = async (): Promise<string> => {
    try {
      const canonicalKey = getCanonicalBatchKey(profile.college, profile.programme, profile.branch, profile.semester);
      const docRef = doc(db, 'shared_calendars', canonicalKey);
      
      const payload = sanitizeForFirestore({
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
      });

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
      
      const payload = sanitizeForFirestore({
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
      });

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

  const proposeBatchTask = async (taskData: {
    title: string;
    description?: string;
    subjectId: string;
    subjectName?: string;
    deadline: string;
    priority: HomeworkPriority;
    attachmentName?: string;
  }): Promise<string> => {
    if (!profile.isBatchSynced || !profile.batchKey) {
      throw new Error('Not connected to any batch');
    }

    let memberCount = 1;
    try {
      const batchSnap = await getDoc(doc(db, 'shared_timetables', profile.batchKey));
      if (batchSnap.exists()) {
        memberCount = batchSnap.data().studentCount || 1;
      }
    } catch (e) {}

    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const proposalDocRef = doc(db, 'shared_timetables', profile.batchKey, 'proposed_tasks', proposalId);

    const creatorId = user?.id || 'anon';
    const creatorName = profile.name || user?.fullName || 'Classmate';
    const creatorEmail = user?.primaryEmailAddress?.emailAddress || profile.email || '';

    const initialVotes: Record<string, 'approve' | 'reject'> = {
      [creatorId]: 'approve',
    };

    const newProposal: BatchProposedTask = {
      id: proposalId,
      batchKey: profile.batchKey,
      title: taskData.title,
      description: taskData.description || '',
      subjectId: taskData.subjectId,
      subjectName: taskData.subjectName || '',
      deadline: taskData.deadline,
      priority: taskData.priority,
      attachmentName: taskData.attachmentName || '',
      creatorId,
      creatorName,
      creatorEmail,
      votes: initialVotes,
      approvalsCount: 1,
      rejectionsCount: 0,
      status: (memberCount <= 1 || isBatchCR) ? 'approved' : 'voting',
      totalEligibleMembers: Math.max(memberCount, 1),
      approvedAt: (memberCount <= 1 || isBatchCR) ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    await setDoc(proposalDocRef, sanitizeForFirestore(newProposal));

    // Also add to creator's local tasks immediately
    addHomework({
      subjectId: taskData.subjectId,
      subjectName: taskData.subjectName,
      title: taskData.title,
      description: taskData.description,
      deadline: taskData.deadline,
      priority: taskData.priority,
      status: 'Not Started',
      attachmentName: taskData.attachmentName,
      isBatchShared: true,
      proposalId: proposalId,
    });

    if (memberCount <= 1 || isBatchCR) {
      showToast('Assignment Added', 'Task added and shared with batch automatically.', 'success');
    } else {
      showToast('Proposal Submitted', 'Batchmates will now vote to add this assignment.', 'success');
    }
    
    return proposalId;
  };

  const voteBatchTask = async (proposalId: string, vote: 'approve' | 'reject'): Promise<void> => {
    if (!profile.isBatchSynced || !profile.batchKey || !user) {
      showToast('Sign In Required', 'You must be signed in and connected to a batch to vote.', 'error');
      return;
    }

    try {
      const proposalDocRef = doc(db, 'shared_timetables', profile.batchKey, 'proposed_tasks', proposalId);
      const propSnap = await getDoc(proposalDocRef);
      if (!propSnap.exists()) {
        showToast('Not Found', 'Proposal no longer exists.', 'error');
        return;
      }

      const data = propSnap.data() as BatchProposedTask;
      const currentVotes = { ...(data.votes || {}) };
      currentVotes[user.id] = vote;

      const approvals = Object.values(currentVotes).filter((v) => v === 'approve').length;
      const rejections = Object.values(currentVotes).filter((v) => v === 'reject').length;

      const totalMembers = Math.max(data.totalEligibleMembers || 1, 1);
      const threshold = Math.max(Math.ceil(totalMembers * 0.3), 1);

      let newStatus: 'voting' | 'approved' | 'rejected' = data.status;
      let approvedAt = data.approvedAt;

      if (approvals >= threshold) {
        newStatus = 'approved';
        approvedAt = new Date().toISOString();
      } else if (rejections > totalMembers - threshold) {
        newStatus = 'rejected';
      }

      await updateDoc(proposalDocRef, {
        votes: currentVotes,
        approvalsCount: approvals,
        rejectionsCount: rejections,
        status: newStatus,
        approvedAt: approvedAt || null,
      });

      if (newStatus === 'approved') {
        showToast('Assignment Approved!', '30% consensus reached! Assignment added to batch.', 'success');
      } else {
        showToast('Vote Recorded', `You voted ${vote === 'approve' ? '👍 Approve' : '👎 Reject'}.`, 'info');
      }
    } catch (e) {
      console.error('Error voting on batch task:', e);
      showToast('Vote Failed', 'Could not submit your vote.', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        shareCalendarWithBatch,
        joinSharedCalendar,
        shareExamsWithBatch,
        joinSharedExams,
        proposedBatchTasks,
        proposeBatchTask,
        voteBatchTask,
        isHydrated,
        activeView,
        setActiveView,
        profile,
        isBatchCR,
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
        currentBatchData,
        searchBatchTimetable,
        fetchCollegeBatches,
        joinBatchTimetable,
        shareTimetableWithBatch,
        disconnectBatchTimetable,
        toastMessage,
        showToast,
        showHolidayAnimation,
        resetAllData,
        messMenu,
        updateMessMenu,
        showMessOnboarding,
        setShowMessOnboarding,
        user,
        isClerkLoaded
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
