import { ClassSession, FacultyLinkedBatch, Subject, DayOfWeek } from './types';
import { timeToMinutes, getCurrentDayOfWeek, getTodayDateString } from './timetableUtils';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { broadcastBatchPushNotification } from './pushNotifications';

export interface RescheduleMeta {
  startTime: string;
  endTime: string;
  room?: string;
  by?: string;
  role?: string;
  reason?: string;
  timestamp?: string;
  originalStartTime: string;
  originalEndTime: string;
  originalRoom?: string;
}

export interface AggregatedFacultySession {
  session: ClassSession;
  batch: FacultyLinkedBatch;
  subjectName: string;
  subjectCode: string;
  isCancelled: boolean;
  isRescheduled: boolean;
  rescheduleMeta?: RescheduleMeta;
  isLive: boolean;
  isUpcoming: boolean;
  minutesUntilStart: number;
}

/**
 * Checks whether a given class session belongs to the subjects selected by this faculty in this batch.
 */
export const isFacultySession = (
  session: ClassSession,
  batch: FacultyLinkedBatch,
  subjectsList: Subject[]
): boolean => {
  const selectedIds = Array.isArray(batch.selectedSubjectIds) ? batch.selectedSubjectIds : [];
  const selectedNames = (Array.isArray(batch.selectedSubjectNames) ? batch.selectedSubjectNames : []).map((n) =>
    n.trim().toLowerCase()
  );

  // If no subjects were selected for this batch, strictly return false
  if (selectedIds.length === 0 && selectedNames.length === 0) {
    return false;
  }

  // 1. Direct ID match in selectedIds
  if (session.subjectId && selectedIds.includes(session.subjectId)) {
    return true;
  }

  // 2. Look up the subject definition in this batch's subjects list
  const matchedSub = subjectsList.find((s) => {
    if (session.subjectId && s.id === session.subjectId) return true;
    const sName = (session.subjectName || '').trim().toLowerCase();
    const sCode = (session.subjectCode || '').trim().toLowerCase();
    if (
      sName &&
      ((s.name && s.name.trim().toLowerCase() === sName) ||
        (s.shortName && s.shortName.trim().toLowerCase() === sName))
    ) {
      return true;
    }
    if (sCode && s.code && s.code.trim().toLowerCase() === sCode) {
      return true;
    }
    return false;
  });

  if (matchedSub && selectedIds.includes(matchedSub.id)) {
    return true;
  }

  // 3. Fallback check against selectedSubjectNames (names / codes saved during batch connect)
  const sessName = (session.subjectName || matchedSub?.name || matchedSub?.shortName || '').trim().toLowerCase();
  const sessCode = (session.subjectCode || matchedSub?.code || '').trim().toLowerCase();

  if (selectedNames.length > 0) {
    if (sessName && selectedNames.includes(sessName)) return true;
    if (sessCode && selectedNames.includes(sessCode)) return true;
  }

  return false;
};

/**
 * Extracts normalized subject name and subject code for a faculty session.
 */
export const getFacultySessionDetails = (
  session: ClassSession,
  subjectsList: Subject[]
): { subjectName: string; subjectCode: string } => {
  const sub = subjectsList.find(
    (s) =>
      s.id === session.subjectId ||
      (s.name && session.subjectName && s.name.trim().toLowerCase() === session.subjectName.trim().toLowerCase()) ||
      (s.code && session.subjectCode && s.code.trim().toLowerCase() === session.subjectCode.trim().toLowerCase())
  );

  const subjectName = sub?.name || sub?.shortName || session.subjectName || 'Subject';
  const subjectCode = sub?.code || session.subjectCode || '';

  return { subjectName, subjectCode };
};

/**
 * Aggregates all week sessions across linked batches, filtered strictly to faculty's selected subjects,
 * applying active cancellations and reschedules in real time.
 */
export const aggregateFacultyWeeklyTimetable = (
  linkedBatches: FacultyLinkedBatch[],
  batchesTimetableData: Record<string, any>
): Record<DayOfWeek, AggregatedFacultySession[]> => {
  const currentDay = getCurrentDayOfWeek();
  const todayStr = getTodayDateString();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const allWeekSessions: Record<DayOfWeek, AggregatedFacultySession[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  linkedBatches.forEach((batch) => {
    const bData = batchesTimetableData[batch.batchKey];
    if (!bData) return;

    const timetable: ClassSession[] = Array.isArray(bData.timetable) ? bData.timetable : [];
    const subjectsList: Subject[] = Array.isArray(bData.subjects) ? bData.subjects : [];
    const cancelledList: string[] = Array.isArray(bData.cancelledSessions) ? bData.cancelledSessions : [];
    const rescheduledMap: Record<string, any> =
      bData.rescheduledSessions && typeof bData.rescheduledSessions === 'object'
        ? bData.rescheduledSessions
        : {};

    timetable.forEach((session) => {
      // STRICT FILTER: Only include if this faculty selected this subject in this batch
      if (!isFacultySession(session, batch, subjectsList)) {
        return;
      }

      const { subjectName, subjectCode } = getFacultySessionDetails(session, subjectsList);

      const cancelKey = `${todayStr}_${session.id}`;
      const isCancelled = cancelledList.includes(cancelKey);

      // Check if rescheduled for today
      const reschedKey = `${todayStr}_${session.id}`;
      const resched = session.day === currentDay ? rescheduledMap[reschedKey] : undefined;
      const isRescheduled = Boolean(resched && resched.startTime && resched.endTime);

      const effectiveStartTime = isRescheduled ? resched.startTime : session.startTime;
      const effectiveEndTime = isRescheduled ? resched.endTime : session.endTime;
      const effectiveRoom = isRescheduled && resched.room ? resched.room : session.room;

      const effectiveSession: ClassSession = {
        ...session,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        room: effectiveRoom,
      };

      const rescheduleMeta: RescheduleMeta | undefined = isRescheduled
        ? {
            startTime: resched.startTime,
            endTime: resched.endTime,
            room: resched.room,
            by: resched.by,
            role: resched.role,
            reason: resched.reason,
            timestamp: resched.timestamp,
            originalStartTime: session.startTime,
            originalEndTime: session.endTime,
            originalRoom: session.room,
          }
        : undefined;

      const startMin = timeToMinutes(effectiveStartTime);
      const endMin = timeToMinutes(effectiveEndTime);

      const isLive =
        session.day === currentDay && currentMinutes >= startMin && currentMinutes < endMin && !isCancelled;
      const isUpcoming = session.day === currentDay && currentMinutes < startMin && !isCancelled;
      const minutesUntilStart = startMin - currentMinutes;

      const agg: AggregatedFacultySession = {
        session: effectiveSession,
        batch,
        subjectName,
        subjectCode,
        isCancelled,
        isRescheduled,
        rescheduleMeta,
        isLive,
        isUpcoming,
        minutesUntilStart,
      };

      if (allWeekSessions[session.day]) {
        allWeekSessions[session.day].push(agg);
      }
    });
  });

  // Sort each day chronologically by start time
  ALL_DAYS.forEach((day) => {
    allWeekSessions[day].sort((a, b) => timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime));
  });

  return allWeekSessions;
};

/**
 * Reschedule a faculty lecture for a given batch and notify students.
 */
export const rescheduleFacultyClass = async (params: {
  batchKey: string;
  sessionId: string;
  subjectName: string;
  batchName: string;
  facultyName: string;
  facultyTitle?: string;
  userId?: string;
  dateStr: string;
  newStartTime: string;
  newEndTime: string;
  newRoom?: string;
  reason?: string;
}) => {
  const {
    batchKey,
    sessionId,
    subjectName,
    batchName,
    facultyName,
    facultyTitle = 'Prof.',
    userId,
    dateStr,
    newStartTime,
    newEndTime,
    newRoom,
    reason,
  } = params;

  const bRef = doc(db, 'shared_timetables', batchKey);
  const snap = await getDoc(bRef);
  if (!snap.exists()) throw new Error('Batch timetable not found.');

  const bData = snap.data();
  const currentRescheduled = bData.rescheduledSessions || {};
  const currentAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];

  const reschedKey = `${dateStr}_${sessionId}`;
  const teacherLabel = `${facultyTitle} ${facultyName}`.trim();

  const entry: RescheduleMeta = {
    startTime: newStartTime,
    endTime: newEndTime,
    room: newRoom?.trim() || undefined,
    by: teacherLabel,
    role: 'faculty',
    reason: reason?.trim() || undefined,
    timestamp: new Date().toISOString(),
    originalStartTime: '',
    originalEndTime: '',
  };

  const updatedRescheduled = {
    ...currentRescheduled,
    [reschedKey]: entry,
  };

  const alertPayload = {
    id: `fac_reschedule_${sessionId}_${dateStr}_${Date.now()}`,
    title: `⏰ Lecture Rescheduled: ${subjectName}`,
    body: `${subjectName} (${batchName}) moved to ${newStartTime}–${newEndTime}${newRoom ? ` in ${newRoom}` : ''} by ${teacherLabel}.${reason ? ` (${reason})` : ''}`,
    type: 'reschedule',
    sessionId,
    date: dateStr,
    by: teacherLabel,
    createdAt: new Date().toISOString(),
  };

  const trimmedAlerts = [...currentAlerts.slice(-19), alertPayload];

  await setDoc(
    bRef,
    {
      rescheduledSessions: updatedRescheduled,
      batchAlerts: trimmedAlerts,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Broadcast push notification
  try {
    await broadcastBatchPushNotification({
      batchKey,
      title: alertPayload.title,
      body: alertPayload.body,
      type: 'reschedule',
      senderId: userId,
      senderName: teacherLabel,
    });
  } catch (pushErr) {
    console.warn('Push notification error:', pushErr);
  }
};

/**
 * Revert a rescheduled lecture back to its original slot.
 */
export const revertFacultyReschedule = async (params: {
  batchKey: string;
  sessionId: string;
  subjectName: string;
  batchName: string;
  facultyName: string;
  facultyTitle?: string;
  userId?: string;
  dateStr: string;
}) => {
  const { batchKey, sessionId, subjectName, batchName, facultyName, facultyTitle = 'Prof.', userId, dateStr } = params;

  const bRef = doc(db, 'shared_timetables', batchKey);
  const snap = await getDoc(bRef);
  if (!snap.exists()) throw new Error('Batch timetable not found.');

  const bData = snap.data();
  const currentRescheduled = { ...(bData.rescheduledSessions || {}) };
  const currentAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];

  const reschedKey = `${dateStr}_${sessionId}`;
  delete currentRescheduled[reschedKey];

  const teacherLabel = `${facultyTitle} ${facultyName}`.trim();
  const alertPayload = {
    id: `fac_revert_${sessionId}_${dateStr}_${Date.now()}`,
    title: `🔄 Lecture Reverted: ${subjectName}`,
    body: `${subjectName} (${batchName}) schedule restored to original time by ${teacherLabel}.`,
    type: 'reschedule_reverted',
    sessionId,
    date: dateStr,
    by: teacherLabel,
    createdAt: new Date().toISOString(),
  };

  const trimmedAlerts = [...currentAlerts.slice(-19), alertPayload];

  await setDoc(
    bRef,
    {
      rescheduledSessions: currentRescheduled,
      batchAlerts: trimmedAlerts,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  try {
    await broadcastBatchPushNotification({
      batchKey,
      title: alertPayload.title,
      body: alertPayload.body,
      type: 'reschedule_reverted',
      senderId: userId,
      senderName: teacherLabel,
    });
  } catch (pushErr) {
    console.warn('Push notification error:', pushErr);
  }
};

/**
 * Cancel or restore a lecture.
 */
export const cancelOrRestoreFacultyClass = async (params: {
  batchKey: string;
  sessionId: string;
  subjectName: string;
  batchName: string;
  facultyName: string;
  facultyTitle?: string;
  userId?: string;
  dateStr: string;
  action: 'cancel' | 'restore';
  reason?: string;
}) => {
  const {
    batchKey,
    sessionId,
    subjectName,
    batchName,
    facultyName,
    facultyTitle = 'Prof.',
    userId,
    dateStr,
    action,
    reason,
  } = params;

  const bRef = doc(db, 'shared_timetables', batchKey);
  const snap = await getDoc(bRef);
  if (!snap.exists()) throw new Error('Batch timetable not found.');

  const bData = snap.data();
  const currentCancelled: string[] = Array.isArray(bData.cancelledSessions) ? bData.cancelledSessions : [];
  const currentMeta: Record<string, any> = bData.cancelledSessionsMeta || {};
  const currentAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];

  const cancelKey = `${dateStr}_${sessionId}`;
  const teacherLabel = `${facultyTitle} ${facultyName}`.trim();

  let updatedCancelled: string[];
  let updatedMeta = { ...currentMeta };

  if (action === 'cancel') {
    updatedCancelled = Array.from(new Set([...currentCancelled, cancelKey]));
    updatedMeta[cancelKey] = {
      by: teacherLabel,
      role: 'faculty',
      reason: reason?.trim() || 'Class cancelled by Faculty',
      timestamp: new Date().toISOString(),
    };
  } else {
    updatedCancelled = currentCancelled.filter((k) => k !== cancelKey);
    delete updatedMeta[cancelKey];
  }

  const alertPayload = {
    id: `fac_${action}_${sessionId}_${dateStr}_${Date.now()}`,
    title: action === 'cancel' ? `🚫 Lecture Cancelled: ${subjectName}` : `✅ Lecture Restored: ${subjectName}`,
    body: `${subjectName} (${batchName}) is ${action === 'cancel' ? 'CANCELLED' : 'BACK ON SCHEDULE'} today by ${teacherLabel}.${reason ? ` (${reason})` : ''}`,
    type: action,
    sessionId,
    date: dateStr,
    by: teacherLabel,
    createdAt: new Date().toISOString(),
  };

  const trimmedAlerts = [...currentAlerts.slice(-19), alertPayload];

  await setDoc(
    bRef,
    {
      cancelledSessions: updatedCancelled,
      cancelledSessionsMeta: updatedMeta,
      batchAlerts: trimmedAlerts,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  try {
    await broadcastBatchPushNotification({
      batchKey,
      title: alertPayload.title,
      body: alertPayload.body,
      type: action,
      senderId: userId,
      senderName: teacherLabel,
    });
  } catch (pushErr) {
    console.warn('Push notification error:', pushErr);
  }
};
