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
  PROFILE: 'iiitnr_profile_v1',
  SUBJECTS: 'iiitnr_subjects_v1',
  TIMETABLE: 'iiitnr_timetable_v1',
  HOMEWORK: 'iiitnr_homework_v1',
  CARRY_ITEMS: 'iiitnr_carry_items_v1',
  NOTIFICATIONS: 'iiitnr_notifications_v1',
  EVENTS: 'iiitnr_events_v1',
  SETTINGS: 'iiitnr_settings_v1',
  EXAMS: 'iiitnr_exams_v1',
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

  getSubjects: (): Subject[] => getStoredItem(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS),
  setSubjects: (subjects: Subject[]) => setStoredItem(STORAGE_KEYS.SUBJECTS, subjects),

  getTimetable: (): ClassSession[] => getStoredItem(STORAGE_KEYS.TIMETABLE, DEFAULT_TIMETABLE),
  setTimetable: (sessions: ClassSession[]) => setStoredItem(STORAGE_KEYS.TIMETABLE, sessions),

  getHomework: (): Homework[] => getStoredItem(STORAGE_KEYS.HOMEWORK, DEFAULT_HOMEWORK),
  setHomework: (hw: Homework[]) => setStoredItem(STORAGE_KEYS.HOMEWORK, hw),

  getCarryItems: (): CarryItem[] => getStoredItem(STORAGE_KEYS.CARRY_ITEMS, []),
  setCarryItems: (items: CarryItem[]) => setStoredItem(STORAGE_KEYS.CARRY_ITEMS, items),

  getNotifications: (): AppNotification[] => getStoredItem(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS),
  setNotifications: (notifs: AppNotification[]) => setStoredItem(STORAGE_KEYS.NOTIFICATIONS, notifs),

  getEvents: (): AcademicEvent[] => getStoredItem(STORAGE_KEYS.EVENTS, DEFAULT_EVENTS),
  setEvents: (events: AcademicEvent[]) => setStoredItem(STORAGE_KEYS.EVENTS, events),

  getSettings: (): UserSettings => getStoredItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  setSettings: (settings: UserSettings) => setStoredItem(STORAGE_KEYS.SETTINGS, settings),

  getExams: (): Exam[] => getStoredItem(STORAGE_KEYS.EXAMS, []),
  setExams: (exams: Exam[]) => setStoredItem(STORAGE_KEYS.EXAMS, exams),

  resetAll: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
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
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },
};
