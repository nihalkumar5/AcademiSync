export type Programme = string;

export type Branch = string;

export type AdminRole = 'super_admin' | 'cr' | 'student' | 'faculty';

export interface FacultyLinkedBatch {
  id: string; // unique link id (e.g. batch_CSE_4A)
  batchKey: string;
  batchCode: string;
  batchName: string; // e.g. "Bennett University · B.Tech CSE (Sem 4, Sec A)"
  college: string;
  programme: string;
  branch: string;
  semester: number;
  section?: string;
  selectedSubjectIds: string[]; // Subject IDs taught in this batch by this faculty
  selectedSubjectNames: string[]; // Names/codes for quick display
  linkedAt: string;
}

export interface AssignmentReadReceipt {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  readAt: string;
}

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
  section?: string;
  onboardingCompleted: boolean;
  avatarUrl?: string;
  createdAt: string;
  batchKey?: string;
  batchCode?: string;
  isBatchSynced?: boolean;
  role?: AdminRole;
  isPro?: boolean;
  isBanned?: boolean;
  enrolledElectiveIds?: string[]; // IDs of electives this student has chosen/enrolled in
  // Faculty specific fields:
  facultyTitle?: string; // e.g. "Dr." | "Prof." | "Asst. Prof."
  facultyDepartment?: string;
  facultyOfficeRoom?: string;
  facultyEmployeeId?: string;
  facultyLinkedBatches?: FacultyLinkedBatch[];
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
  driveLink?: string;
  syllabusLink?: string;
  isCustomColor?: boolean;
  isCustomRoom?: boolean;
  isPersonal?: boolean;
  isElective?: boolean;
  electiveSlot?: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ClassSession {
  id: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  room: string;
  faculty?: string;
  isLab?: boolean;
  notes?: string;
  isExtra?: boolean;
  date?: string;
  by?: string;
  isCustomRoom?: boolean;
  isCustomTime?: boolean;
  isPersonal?: boolean;
  isElective?: boolean;
}

export interface ExtraClassSession {
  id: string;
  date: string; // YYYY-MM-DD
  day: DayOfWeek;
  subjectId: string;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  room: string;
  faculty?: string;
  isLab?: boolean;
  notes?: string;
  by?: string;
  role?: string;
  createdAt?: string;
}

export type HomeworkPriority = 'Low' | 'Medium' | 'High';
export type HomeworkStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Homework {
  id: string;
  subjectId: string;
  subjectName?: string;
  title: string;
  description?: string;
  deadline: string; // ISO string
  priority: HomeworkPriority;
  status: HomeworkStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt: string;
  completedAt?: string;
  isBatchShared?: boolean;
  proposalId?: string;
  updatedAt?: string;
  isFacultyAssignment?: boolean;
  facultyId?: string;
  facultyName?: string;
  facultyTitle?: string;
  batchKey?: string;
  readReceipts?: Record<string, AssignmentReadReceipt>;
}

export interface BatchProposedTask {
  id: string;
  batchKey: string;
  title: string;
  description?: string;
  subjectId: string;
  subjectName?: string;
  deadline: string; // ISO string
  priority: HomeworkPriority;
  attachmentName?: string;
  attachmentUrl?: string;
  creatorId: string;
  creatorName: string;
  creatorEmail?: string;
  creatorRole?: AdminRole;
  isFacultyAssignment?: boolean;
  facultyTitle?: string;
  votes: Record<string, 'approve' | 'reject'>; // userId -> 'approve' | 'reject'
  approvalsCount: number;
  rejectionsCount: number;
  status: 'voting' | 'approved' | 'rejected';
  totalEligibleMembers: number;
  approvedAt?: string;
  createdAt: string;
  readReceipts?: Record<string, AssignmentReadReceipt>;
}

export interface CarryItem {
  id: string;
  title: string;
  source: 'subject' | 'custom';
  subjectId?: string;
  subjectName?: string;
  isPacked: boolean;
  isHidden?: boolean;
  date: string; // YYYY-MM-DD
  reminderNote?: string;
}

export type NotificationCategory = 'classes' | 'events' | 'homework' | 'deadlines' | 'carry' | 'system';

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
  isElective?: boolean;
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

export type CampaignCategory = 'movie' | 'merch' | 'event' | 'deal' | 'general';

export interface PromotionalCampaign {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  imageUrl?: string;
  ctaText: string; // e.g. "Pre-Order Now", "Watch Trailer", "Register Free"
  targetUrl: string;
  category: CampaignCategory;
  badgeText?: string; // e.g. "CAMPUS SPOTLIGHT", "STUDENT PERK", "LIMITED DROP"
  targetAudienceType?: 'all' | 'custom';
  targetColleges?: string[]; // Empty = All Colleges
  targetBranches?: string[]; // Empty = All Branches
  targetSemesters?: number[]; // Empty = All Semesters
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
  expiresAt?: string;
}
