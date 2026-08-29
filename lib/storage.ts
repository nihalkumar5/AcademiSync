'use client';

import {
  StudentProfile,
  Subject,
  ClassSession,
  Homework,
  CarryItem,
  AppNotification,
  AcademicEvent,
  Exam,
  UserSettings,
} from './types';
import {
  DEFAULT_PROFILE,
  DEFAULT_SUBJECTS,
  DEFAULT_TIMETABLE,
  DEFAULT_HOMEWORK,
  DEFAULT_SETTINGS,
  DEFAULT_EVENTS,
  DEFAULT_NOTIFICATIONS,
} from './initialData';

const STORAGE_KEYS = {
  PROFILE: 'iiitnr_profile_v2',
  SUBJECTS: 'iiitnr_subjects_v2',
  TIMETABLE: 'iiitnr_timetable_v2',
  HOMEWORK: 'iiitnr_homework_v2',
  CARRY_ITEMS: 'iiitnr_carry_items_v2',
  NOTIFICATIONS: 'iiitnr_notifications_v2',
  EVENTS: 'iiitnr_events_v2',
  SETTINGS: 'iiitnr_settings_v2',
  EXAMS: 'iiitnr_exams_v2',


  CANCELLED_SESSIONS: 'iiitnr_cancelled_sessions_v1',
  RESCHEDULED_SESSIONS: 'iiitnr_rescheduled_sessions_v1',
};

// Safe LocalStorage helpers
export const getStoredItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading key ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setStoredItem = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('iiitnr-storage-updated'));
  } catch (error) {
    console.error(`Error writing key ${key} to localStorage:`, error);
  }
};

// Individual entity accessors
export const storage = {
  getProfile: (): StudentProfile => getStoredItem(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE),
  setProfile: (profile: StudentProfile) => setStoredItem(STORAGE_KEYS.PROFILE, profile),

  getSubjects: (): Subject[] => {
    const rawSubjects = getStoredItem<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
    const colorMap: Record<string, string> = {
      '#3b82f6': '#7A8B99', // Blue -> Cozy Slate
      '#3B82F6': '#7A8B99',
      '#8b5cf6': '#9C8E80', // Purple -> Cocoa
      '#8B5CF6': '#9C8E80',
      '#ec4899': '#B88B8C', // Pink -> Muted Rose
      '#EC4899': '#B88B8C',
      '#f59e0b': '#C79F6F', // Amber -> Ochre
      '#F59E0B': '#C79F6F',
      '#10b981': '#7C897A', // Emerald -> Sage
      '#10B981': '#7C897A',
      '#6366f1': '#7A8B99', // Indigo -> Slate
      '#6366F1': '#7A8B99',
      '#06b6d4': '#7C897A', // Cyan -> Sage
      '#06B6D4': '#7C897A',
      '#14b8a6': '#7C897A', // Teal -> Sage
      '#14B8A6': '#7C897A',
    };

    let migrated = false;
    const migratedSubjects = rawSubjects.map((sub) => {
      if (colorMap[sub.color]) {
        migrated = true;
        return { ...sub, color: colorMap[sub.color] };
      }
      return sub;
    });

    if (migrated) {
      setStoredItem(STORAGE_KEYS.SUBJECTS, migratedSubjects);
    }
    return migratedSubjects;
  },
  setSubjects: (subjects: Subject[]) => setStoredItem(STORAGE_KEYS.SUBJECTS, subjects),

  getTimetable: (): ClassSession[] => getStoredItem(STORAGE_KEYS.TIMETABLE, []),
  setTimetable: (sessions: ClassSession[]) => setStoredItem(STORAGE_KEYS.TIMETABLE, sessions),

  getHomework: (): Homework[] => getStoredItem(STORAGE_KEYS.HOMEWORK, []),
  setHomework: (hw: Homework[]) => setStoredItem(STORAGE_KEYS.HOMEWORK, hw),

  getCarryItems: (): CarryItem[] => getStoredItem(STORAGE_KEYS.CARRY_ITEMS, []),
  setCarryItems: (items: CarryItem[]) => setStoredItem(STORAGE_KEYS.CARRY_ITEMS, items),

  getNotifications: (): AppNotification[] => getStoredItem(STORAGE_KEYS.NOTIFICATIONS, []),
  setNotifications: (notifs: AppNotification[]) => setStoredItem(STORAGE_KEYS.NOTIFICATIONS, notifs),

  getEvents: (): AcademicEvent[] => getStoredItem(STORAGE_KEYS.EVENTS, []),
  setEvents: (events: AcademicEvent[]) => setStoredItem(STORAGE_KEYS.EVENTS, events),

  getSettings: (): UserSettings => getStoredItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  setSettings: (settings: UserSettings) => setStoredItem(STORAGE_KEYS.SETTINGS, settings),

  getExams: (): Exam[] => getStoredItem(STORAGE_KEYS.EXAMS, []),
  setExams: (exams: Exam[]) => setStoredItem(STORAGE_KEYS.EXAMS, exams),

  getCancelledSessions: (): string[] => getStoredItem(STORAGE_KEYS.CANCELLED_SESSIONS, []),
  setCancelledSessions: (cancelled: string[]) => setStoredItem(STORAGE_KEYS.CANCELLED_SESSIONS, cancelled),

  getRescheduledSessions: (): Record<string, { startTime: string; endTime: string; room?: string }> => getStoredItem(STORAGE_KEYS.RESCHEDULED_SESSIONS, {}),
  setRescheduledSessions: (rescheduled: Record<string, { startTime: string; endTime: string; room?: string }>) => setStoredItem(STORAGE_KEYS.RESCHEDULED_SESSIONS, rescheduled),

  resetAll: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });
    window.localStorage.removeItem('iiitnr_last_updated');
    window.dispatchEvent(new Event('iiitnr-storage-updated'));
  },

  clearUserSession: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });
    window.localStorage.removeItem('iiitnr_last_updated');
    window.dispatchEvent(new Event('iiitnr-storage-updated'));
  },

  exportBackup: () => {
    return JSON.stringify({
      profile: storage.getProfile(),
      subjects: storage.getSubjects(),
      timetable: storage.getTimetable(),
      homework: storage.getHomework(),
      carryItems: storage.getCarryItems(),
      settings: storage.getSettings(),
      events: storage.getEvents(),
      exams: storage.getExams(),
      cancelledSessions: storage.getCancelledSessions(),
      rescheduledSessions: storage.getRescheduledSessions(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },

  importBackup: (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.profile) storage.setProfile(data.profile);
      if (data.subjects) storage.setSubjects(data.subjects);
      if (data.timetable) storage.setTimetable(data.timetable);
      if (data.homework) storage.setHomework(data.homework);
      if (data.carryItems) storage.setCarryItems(data.carryItems);
      if (data.settings) storage.setSettings(data.settings);
      if (data.events) storage.setEvents(data.events);
      if (data.exams) storage.setExams(data.exams);
      if (data.cancelledSessions) storage.setCancelledSessions(data.cancelledSessions);
      if (data.rescheduledSessions) storage.setRescheduledSessions(data.rescheduledSessions);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },
};
