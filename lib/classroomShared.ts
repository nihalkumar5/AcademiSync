// Shared between the app and the server: Google Classroom bridge constants and status shapes.

/** The Web OAuth client (also the Android serverClientId). Override with NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '941128003754-5oalodujnbtlr19jsf9t4unqq4762hsm.apps.googleusercontent.com';

/** Read-only and as narrow as possible: the pilot's classes and their coursework. */
export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
];

export type CourseHow = 'auto' | 'ai' | 'manual' | 'off' | 'none';

export interface BridgeCourse {
  id: string;
  name: string;
  section: string;
  link: string;
  subjectId: string | null;
  subjectName: string | null;
  how: CourseHow;
}

export interface BridgePending {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  due: string | null;
  link: string;
  reason: 'subject' | 'review';
  subjectId: string | null;
  suggestions: { id: string; name: string }[];
}

export interface BridgeShared {
  id: string;
  title: string;
  subjectName: string;
  due: string | null;
  link: string;
  sharedAt: string;
}

export interface BridgeStatus {
  configured: boolean;
  isPilot: boolean;
  pilotError: string | null;
  connected: boolean;
  email: string | null;
  status: 'active' | 'reconnect' | 'paused' | null;
  lastError: string | null;
  autoShare: boolean;
  lastSyncAt: string | null;
  totals: { shared: number; pending: number };
  courses: BridgeCourse[];
  pending: BridgePending[];
  recent: BridgeShared[];
  subjects: { id: string; name: string; code: string; isLab: boolean }[];
}

/** Proposal ids for Classroom work are deterministic, so two pilots (or two syncs) never duplicate one. */
export const classroomProposalId = (courseId: string, courseWorkId: string) => `gc_${courseId}_${courseWorkId}`;
