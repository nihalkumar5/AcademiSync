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
import { calculateTomorrowCarryItems } from '@/lib/timetableUtils';
import { checkAndGenerateSmartNotifications } from '@/lib/notificationEngine';
import confetti from 'canvas-confetti';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
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
  toastMessage: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null>(null);

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

  const { user, isLoaded: isClerkLoaded } = useUser();
  const remoteStateString = useRef("");

  // Firebase Realtime Down-Sync
  useEffect(() => {
    if (!isClerkLoaded || !user) return;
    
    // Request Push Notification permissions (Android Native)
    registerPushNotifications(user.id);
    
    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        remoteStateString.current = JSON.stringify(data);
        
        if (data.profile) { setProfileState(data.profile); storage.setProfile(data.profile); }
        if (data.subjects) { setSubjectsState(data.subjects); storage.setSubjects(data.subjects); }
        if (data.timetable) { setTimetableState(data.timetable); storage.setTimetable(data.timetable); }
        if (data.homework) { setHomeworkState(data.homework); storage.setHomework(data.homework); }
        if (data.carryItems) { setCarryItemsState(data.carryItems); storage.setCarryItems(data.carryItems); }
        if (data.notifications) { setNotificationsState(data.notifications); storage.setNotifications(data.notifications); }
        if (data.events) { setEventsState(data.events); storage.setEvents(data.events); }
        if (data.exams) { setExamsState(data.exams); storage.setExams(data.exams); }
        if (data.settings) { setSettingsState(data.settings); storage.setSettings(data.settings); }
      }
    });
    return () => unsubscribe();
  }, [user, isClerkLoaded]);

  // Firebase Realtime Up-Sync
  useEffect(() => {
    if (!isClerkLoaded || !user || !isHydrated) return;
    
    const currentState = {
      profile, subjects, timetable, homework, carryItems, notifications, events, exams, settings
    };
    
    const currentString = JSON.stringify(currentState);
    if (currentString === remoteStateString.current) return;

    const timeout = setTimeout(() => {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, currentState, { merge: true }).catch(e => console.error('Firebase Sync Error', e));
    }, 1500);

    return () => clearTimeout(timeout);
  }, [profile, subjects, timetable, homework, carryItems, notifications, events, exams, settings, user, isClerkLoaded, isHydrated]);

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

    setProfileState(loadedProfile);
    setSubjectsState(loadedSubjects);
    setTimetableState(loadedTimetable);
    setHomeworkState(loadedHomework);
    setNotificationsState(loadedNotifications);
    setEventsState(loadedEvents);
    setSettingsState(loadedSettings);

    // Calculate carry items for tomorrow merging stored states
    const computedCarry = calculateTomorrowCarryItems(loadedTimetable, loadedSubjects, storedCarry);
    setCarryItemsState(computedCarry);
    storage.setCarryItems(computedCarry);

    // Apply theme class to <html>
    if (loadedSettings.theme === 'dark' || (loadedSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!loadedProfile.onboardingCompleted) {
      setShowOnboarding(true);
    }

    setIsHydrated(true);
  }, []);

  // Periodic notification check & sync
  useEffect(() => {
    if (!isHydrated) return;
    const newNotifs = checkAndGenerateSmartNotifications(
      timetable,
      subjects,
      homework,
      settings,
      notifications
    );
    if (newNotifs.length > 0) {
      const updated = [...newNotifs, ...notifications];
      setNotificationsState(updated);
      storage.setNotifications(updated);
      showToast(newNotifs[0].title, newNotifs[0].message, 'info');
    }
  }, [timetable, subjects, homework, settings, isHydrated]);

  // Native Local Notification Scheduler Effect
  useEffect(() => {
    if (!isHydrated) return;
    const scheduleReminders = async () => {
      await scheduleTimetableLocalNotifications(
        timetable,
        subjects,
        settings.classReminderMinutes || 10
      );
    };
    scheduleReminders();
  }, [timetable, subjects, settings.classReminderMinutes, isHydrated]);

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
    setToastMessage({ title, message, type });
    setTimeout(() => {
      setToastMessage((current) => (current?.title === title ? null : current));
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

  const refreshCarryItems = (currentTimetable: ClassSession[], currentSubjects: Subject[]) => {
    const recomputed = calculateTomorrowCarryItems(currentTimetable, currentSubjects, carryItems);
    setCarryItemsState(recomputed);
    storage.setCarryItems(recomputed);
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
      const nextStatus: HomeworkStatus = target.status === 'Completed' ? 'Not Started' : 'Completed';
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
      if (nextStatus === 'Completed') {
        triggerConfetti();
        showToast('Task Completed', `"${target.title}" marked as done!`, 'success');
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
    showToast('Event Added', eventData.title, 'success');
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
    const updated = events.filter((e) => e.id !== id);
    setEventsState(updated);
    storage.setEvents(updated);
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettingsState(updated);
    storage.setSettings(updated);

    if (partial.theme) {
      if (partial.theme === 'dark' || (partial.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    showToast('Preferences Saved', 'Updated application settings', 'success');
  };

  const resetAllData = async () => {
    // 1. Clear local storage
    storage.resetAll();

    // 2. If Clerk user is loaded, delete their Firestore record
    if (isClerkLoaded && user) {
      try {
        const userRef = doc(db, 'users', user.id);
        await deleteDoc(userRef);
      } catch (e) {
        console.error('Failed to delete Firestore document during reset:', e);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
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
        deleteEvent,
        settings,
        updateSettings,
        showOnboarding,
        setShowOnboarding,
        commandPaletteOpen,
        setCommandPaletteOpen,
        triggerConfetti,
        toastMessage,
        showToast,
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
