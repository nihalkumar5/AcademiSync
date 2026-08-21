import { Subject, ClassSession, Homework, UserSettings, AcademicEvent, AppNotification } from './types';

export const DEFAULT_SUBJECTS: Subject[] = [];
export const DEFAULT_TIMETABLE: ClassSession[] = [];
export const DEFAULT_HOMEWORK: Homework[] = [];
export const DEFAULT_EVENTS: AcademicEvent[] = [];
export const DEFAULT_NOTIFICATIONS: AppNotification[] = [];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  classReminderMinutes: 15,
  eveningCarryReminderTime: '20:00',
  homeworkWarningDays: 3,
  notificationsEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
};

export const DEFAULT_PROFILE = {
  id: 'guest',
  name: 'Student',
  rollNumber: '',
  email: '',
  college: 'Demo University',
  programme: 'B.Tech' as const,
  branch: 'CSE' as const,
  year: 1,
  semester: 1,
  onboardingCompleted: false,
  createdAt: new Date().toISOString(),
};
