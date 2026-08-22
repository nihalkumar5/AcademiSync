import { Subject, ClassSession, Homework, UserSettings, AcademicEvent, AppNotification } from './types';

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub1', code: 'CS101', name: 'Data Structures', shortName: 'DSA', facultyName: 'Dr. Smith', room: 'Room 201', color: '#000000', credits: 4, carryRequirements: ['Laptop', 'Notebook'] },
  { id: 'sub2', code: 'CS102', name: 'Digital Logic', shortName: 'DLD', facultyName: 'Prof. Jones', room: 'Room 105', color: '#000000', credits: 3, carryRequirements: ['Calculator'] },
  { id: 'sub3', code: 'CS103', name: 'DBMS Lab', shortName: 'DBMS Lab', facultyName: 'Mr. White', room: 'Lab 3', color: '#000000', credits: 2, carryRequirements: ['Lab File'], isLab: true },
];

const today = new Date();
const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' }) as any; // Type as DayOfWeek via 'any' hack since we aren't strict here

export const DEFAULT_TIMETABLE: ClassSession[] = [
  { id: 'sess1', subjectId: 'sub1', day: currentDay, startTime: '09:00', endTime: '10:00', room: 'Room 201' },
  { id: 'sess2', subjectId: 'sub2', day: currentDay, startTime: '11:00', endTime: '12:00', room: 'Room 105' },
  { id: 'sess3', subjectId: 'sub3', day: currentDay, startTime: '14:00', endTime: '16:00', room: 'Lab 3', isLab: true },
];

// Tasks due dates for today and tomorrow
const dueToday = new Date();
dueToday.setHours(23, 59, 59, 999);

const dueTomorrow = new Date();
dueTomorrow.setDate(dueTomorrow.getDate() + 1);
dueTomorrow.setHours(23, 59, 59, 999);

export const DEFAULT_HOMEWORK: Homework[] = [
  { id: 'hw1', subjectId: 'sub1', title: 'Implement Binary Search Tree', description: 'Write a program in C++ to implement BST operations.', deadline: dueToday.toISOString(), status: 'Not Started', priority: 'High', createdAt: new Date().toISOString() },
  { id: 'hw2', subjectId: 'sub2', title: 'Boolean Algebra Worksheet', description: 'Solve questions 1 to 15 from Chapter 3.', deadline: dueTomorrow.toISOString(), status: 'In Progress', priority: 'Medium', createdAt: new Date().toISOString() },
];

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
