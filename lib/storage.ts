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
import { autoAssignHarmonicColorsToSubjects } from './cardColors';

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
  CANCELLED_SESSIONS_META: 'iiitnr_cancelled_sessions_meta_v1',
  RESCHEDULED_SESSIONS: 'iiitnr_rescheduled_sessions_v1',
  EXTRA_SESSIONS: 'iiitnr_extra_sessions_v1',
  DISMISSED_PROPOSALS: 'iiitnr_dismissed_proposals_v1',
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
    return autoAssignHarmonicColorsToSubjects(rawSubjects);
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

  getCancelledSessions: (): string[] => {
    const val = getStoredItem<any>(STORAGE_KEYS.CANCELLED_SESSIONS, []);
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return Object.keys(val);
    return [];
  },
  setCancelledSessions: (cancelled: string[]) => {
    const safe = Array.isArray(cancelled) ? cancelled : (cancelled && typeof cancelled === 'object' ? Object.keys(cancelled) : []);
    setStoredItem(STORAGE_KEYS.CANCELLED_SESSIONS, safe);
  },

  getCancelledSessionsMeta: (): Record<string, { by: string; role?: string; timestamp?: string }> => getStoredItem(STORAGE_KEYS.CANCELLED_SESSIONS_META, {}),
  setCancelledSessionsMeta: (meta: Record<string, { by: string; role?: string; timestamp?: string }>) => setStoredItem(STORAGE_KEYS.CANCELLED_SESSIONS_META, meta),

  getRescheduledSessions: (): Record<string, { startTime: string; endTime: string; room?: string; subjectId?: string; by?: string; role?: string; timestamp?: string }> => getStoredItem(STORAGE_KEYS.RESCHEDULED_SESSIONS, {}),
  setRescheduledSessions: (rescheduled: Record<string, { startTime: string; endTime: string; room?: string; subjectId?: string; by?: string; role?: string; timestamp?: string }>) => setStoredItem(STORAGE_KEYS.RESCHEDULED_SESSIONS, rescheduled),

  getExtraSessions: (): Record<string, any> => getStoredItem(STORAGE_KEYS.EXTRA_SESSIONS, {}),
  setExtraSessions: (extra: Record<string, any>) => setStoredItem(STORAGE_KEYS.EXTRA_SESSIONS, extra),

  getDismissedProposals: (): string[] => {
    const val = getStoredItem<any>(STORAGE_KEYS.DISMISSED_PROPOSALS, []);
    return Array.isArray(val) ? val : [];
  },
  setDismissedProposals: (ids: string[]) => {
    const safe = Array.isArray(ids) ? ids : [];
    setStoredItem(STORAGE_KEYS.DISMISSED_PROPOSALS, safe);
  },

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
