import { Capacitor } from '@capacitor/core';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Homework, HomeworkPriority, HomeworkStatus, Subject } from '@/lib/types';

export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
];

export interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  courseState?: string;
  alternateLink?: string;
}

export interface GoogleClassroomDueDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface GoogleClassroomDueTime {
  hours?: number;
  minutes?: number;
  seconds?: number;
  nanos?: number;
}

export interface GoogleClassroomCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state?: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: GoogleClassroomDueDate;
  dueTime?: GoogleClassroomDueTime;
  maxPoints?: number;
}

export interface GoogleClassroomSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  state?: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  late?: boolean;
}

export interface FetchedAssignmentItem {
  courseWork: GoogleClassroomCourseWork;
  courseName: string;
  submissionState?: string;
  isTurnedIn: boolean;
  computedDeadline: string;
  suggestedPriority: HomeworkPriority;
  matchedSubjectId: string;
}

/**
 * Acquire Google OAuth access token with Google Classroom scopes.
 * Supports web popup and Capacitor native GoogleAuth plugin.
 */
export async function getGoogleClassroomToken(): Promise<string> {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    GoogleAuth.initialize({
      clientId: '941128003754-5oalodujnbtlr19jsf9t4unqq4762hsm.apps.googleusercontent.com',
      scopes: [
        'profile',
        'email',
        ...CLASSROOM_SCOPES,
      ],
      grantOfflineAccess: true,
    });

    try {
      await GoogleAuth.signOut();
    } catch {
      // ignore
    }

    const googleUser = await GoogleAuth.signIn();
    const token =
      googleUser?.authentication?.accessToken ||
      (googleUser as any)?.accessToken;

    if (!token) {
      throw new Error('Could not get Google Access Token from native auth.');
    }
    return token;
  }

  // Web fallback using Firebase GoogleAuthProvider popup
  const provider = new GoogleAuthProvider();
  CLASSROOM_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('No Google Access Token returned from OAuth login.');
  }
  return token;
}

/**
 * Fetch list of active Google Classroom courses
 */
export async function fetchActiveCourses(token: string): Promise<GoogleClassroomCourse[]> {
  const res = await fetch(
    'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch courses: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return (data.courses || []) as GoogleClassroomCourse[];
}

/**
 * Fetch coursework (assignments) for a specific course
 */
export async function fetchCourseWork(
  courseId: string,
  token: string
): Promise<GoogleClassroomCourseWork[]> {
  const res = await fetch(
    `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(
      courseId
    )}/courseWork?courseWorkStates=PUBLISHED&pageSize=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    // If course has no access or empty coursework, fail gracefully
    console.warn(`Failed to fetch coursework for course ${courseId}: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return (data.courseWork || []) as GoogleClassroomCourseWork[];
}

/**
 * Fetch user's submission state for an assignment
 */
export async function fetchUserSubmission(
  courseId: string,
  courseWorkId: string,
  token: string
): Promise<GoogleClassroomSubmission | null> {
  try {
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(
        courseId
      )}/courseWork/${encodeURIComponent(
        courseWorkId
      )}/studentSubmissions?userId=me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return (data.studentSubmissions?.[0] || null) as GoogleClassroomSubmission | null;
  } catch {
    return null;
  }
}

/**
 * Convert Classroom due date/time to ISO string
 */
export function parseClassroomDeadline(
  dueDate?: GoogleClassroomDueDate,
  dueTime?: GoogleClassroomDueTime
): string {
  if (!dueDate || !dueDate.year || !dueDate.month || !dueDate.day) {
    // Default to 7 days from now if no due date specified
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    fallback.setHours(23, 59, 0, 0);
    return fallback.toISOString();
  }

  const year = dueDate.year;
  const month = dueDate.month - 1; // JS month 0-indexed
  const day = dueDate.day;
  const hours = dueTime?.hours ?? 23;
  const minutes = dueTime?.minutes ?? 59;
  const seconds = dueTime?.seconds ?? 0;

  const date = new Date(year, month, day, hours, minutes, seconds);
  return date.toISOString();
}

/**
 * Calculate suggested priority based on deadline proximity
 */
export function calculatePriority(deadlineIso: string): HomeworkPriority {
  const diffDays = Math.ceil(
    (new Date(deadlineIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 2) return 'High';
  if (diffDays <= 5) return 'Medium';
  return 'Low';
}

/**
 * Fuzzy match course name to existing app subject
 */
export function matchSubject(
  courseName: string,
  subjects: Subject[]
): { id: string; name: string } {
  if (!subjects.length) {
    return { id: 'other', name: courseName };
  }

  const cleanCourse = courseName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exact or contains match
  const found = subjects.find((s) => {
    const cleanSub = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCode = (s.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      cleanCourse.includes(cleanSub) ||
      cleanSub.includes(cleanCourse) ||
      (cleanCode && cleanCourse.includes(cleanCode))
    );
  });

  if (found) {
    return { id: found.id, name: found.name };
  }

  return { id: subjects[0]?.id || 'other', name: courseName };
}

/**
 * Fetch all assignments across all active courses
 */
export async function syncAllClassroomAssignments(
  token: string,
  subjects: Subject[],
  onProgress?: (msg: string) => void
): Promise<FetchedAssignmentItem[]> {
  onProgress?.('Fetching enrolled courses...');
  const courses = await fetchActiveCourses(token);

  if (!courses.length) {
    return [];
  }

  const items: FetchedAssignmentItem[] = [];

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    onProgress?.(`Loading assignments for ${course.name} (${i + 1}/${courses.length})...`);

    const courseWorks = await fetchCourseWork(course.id, token);

    for (const cw of courseWorks) {
      const submission = await fetchUserSubmission(course.id, cw.id, token);
      const isTurnedIn =
        submission?.state === 'TURNED_IN' || submission?.state === 'RETURNED';
      const computedDeadline = parseClassroomDeadline(cw.dueDate, cw.dueTime);
      const suggestedPriority = calculatePriority(computedDeadline);
      const matched = matchSubject(course.name, subjects);

      items.push({
        courseWork: cw,
        courseName: course.name,
        submissionState: submission?.state,
        isTurnedIn,
        computedDeadline,
        suggestedPriority,
        matchedSubjectId: matched.id,
      });
    }
  }

  return items;
}
