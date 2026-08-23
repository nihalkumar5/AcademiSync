export type Programme = 'B.Tech' | 'M.Tech' | 'CMIT' | 'Mtech- CMIT' | 'Ph.D';

export type Branch = 'CSE' | 'DSAI' | 'ECE' | 'IT';

export interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  college: string;
  programme: Programme;
  branch: Branch;
  year: number;
  semester: number;
  onboardingCompleted: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  facultyName: string;
  facultyEmail?: string;
  room: string;
  credits: number;
  color: string;
  carryRequirements: string[];
  isLab?: boolean;
  labRoom?: string;
  notes?: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ClassSession {
  id: string;
  subjectId: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  room: string;
  faculty?: string;
  isLab?: boolean;
  notes?: string;
}

export type HomeworkPriority = 'Low' | 'Medium' | 'High';
export type HomeworkStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Homework {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  deadline: string; // ISO string
  priority: HomeworkPriority;
  status: HomeworkStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CarryItem {
  id: string;
  title: string;
  source: 'subject' | 'custom';
  subjectId?: string;
  subjectName?: string;
  isPacked: boolean;
  date: string; // YYYY-MM-DD
  reminderNote?: string;
}

export type NotificationCategory = 'classes' | 'homework' | 'deadlines' | 'carry' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: string; // ISO string
  read: boolean;
  relatedId?: string;
  actionUrl?: string;
}

export type CalendarEventType = 'class' | 'homework' | 'exam' | 'holiday' | 'event' | 'assignment';

export interface AcademicEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  type: CalendarEventType;
  subjectId?: string;
  location?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  classReminderMinutes: number; // e.g. 15
  eveningCarryReminderTime: string; // e.g. "20:00"
  homeworkWarningDays: number; // e.g. 3
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface ExtractedClassSession {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode?: string;
  room?: string;
  faculty?: string;
  isLab?: boolean;
}

export interface ExtractedHomework {
  subjectName: string;
  title: string;
  description?: string;
  deadline?: string;
  priority?: HomeworkPriority;
}

export interface Exam {
  id: string;
  subjectName: string;
  date: string; // ISO String for Date/Time
  syllabus?: string;
  room?: string;
  durationMinutes?: number;
  createdAt: string;
}

export interface ExtractedExam {
  subjectName: string;
  date: string; // Date string format
  time: string; // Time string format
  syllabus?: string;
  room?: string;
  durationMinutes?: number;
}
