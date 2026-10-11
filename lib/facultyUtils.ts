import { ClassSession, FacultyLinkedBatch, Subject, DayOfWeek } from './types';
import { timeToMinutes, getCurrentDayOfWeek, getTodayDateString, getDateStringForDayOfWeek } from './timetableUtils';
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

export interface BatchSessionRef {
  batch: FacultyLinkedBatch;
  session: ClassSession;
}

export interface AggregatedFacultySession {
  session: ClassSession;
  batch: FacultyLinkedBatch;
  linkedBatches?: FacultyLinkedBatch[];
  batchSessions?: BatchSessionRef[];
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

      const sessionDateStr = getDateStringForDayOfWeek(session.day);
      const isCancelled =
        cancelledList.includes(`${sessionDateStr}_${session.id}`) ||
        cancelledList.includes(`${todayStr}_${session.id}`);

      // Check if rescheduled for this session's upcoming date or today
      const resched =
        rescheduledMap[`${sessionDateStr}_${session.id}`] ||
        (session.day === currentDay ? rescheduledMap[`${todayStr}_${session.id}`] : undefined);
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

  // Deduplicate concurrent sessions of the same subject across linked batches
  ALL_DAYS.forEach((day) => {
    const rawDaySessions = allWeekSessions[day];
    const deduplicatedDaySessions: AggregatedFacultySession[] = [];

    rawDaySessions.forEach((item) => {
      const matchIndex = deduplicatedDaySessions.findIndex((existing) => {
        // 1. Time overlap check: start times within 15 minutes and end times within 15 minutes
        const exStart = timeToMinutes(existing.session.startTime);
        const itStart = timeToMinutes(item.session.startTime);
        const exEnd = timeToMinutes(existing.session.endTime);
        const itEnd = timeToMinutes(item.session.endTime);

        const isSameTime = Math.abs(exStart - itStart) <= 15 && Math.abs(exEnd - itEnd) <= 15;
        if (!isSameTime) return false;

        // 2. Same session type (both lab or both lecture)
        if (Boolean(existing.session.isLab) !== Boolean(item.session.isLab)) return false;

        // 3. Subject match:
        // Fuzzy normalized subject name match or subject code match
        const nameMatch = isCommonSubject(existing.subjectName, [item.subjectName]);
        const codeMatch = Boolean(
          existing.subjectCode &&
          item.subjectCode &&
          existing.subjectCode.trim().toLowerCase() === item.subjectCode.trim().toLowerCase()
        );

        return nameMatch || codeMatch;
      });

      if (matchIndex === -1) {
        deduplicatedDaySessions.push({
          ...item,
          linkedBatches: [item.batch],
          batchSessions: [{ batch: item.batch, session: item.session }],
        });
      } else {
        const existing = deduplicatedDaySessions[matchIndex];
        const alreadyHasBatch = (existing.linkedBatches || []).some(
          (b) => b.batchKey === item.batch.batchKey
        );
        const updatedBatches = alreadyHasBatch
          ? (existing.linkedBatches || [existing.batch])
          : [...(existing.linkedBatches || [existing.batch]), item.batch];

        const updatedBatchSessions = [
          ...(existing.batchSessions || [{ batch: existing.batch, session: existing.session }]),
          { batch: item.batch, session: item.session },
        ];

        // Combine rooms cleanly (e.g. "Room No 319" + "308" -> "Room 319 / 308")
        let mergedRoom = existing.session.room || item.session.room;
        if (existing.session.room && item.session.room) {
          const cleanR = (r: string) => r.replace(/Room\s*(No\.?)?\s*/i, '').trim();
          const r1 = cleanR(existing.session.room);
          const r2 = cleanR(item.session.room);
          if (r1.toLowerCase() === r2.toLowerCase()) {
            mergedRoom = existing.session.room;
          } else {
            mergedRoom = `Room ${r1} / ${r2}`;
          }
        }

        deduplicatedDaySessions[matchIndex] = {
          ...existing,
          session: {
            ...existing.session,
            room: mergedRoom,
          },
          linkedBatches: updatedBatches,
          batchSessions: updatedBatchSessions,
          isCancelled: existing.isCancelled || item.isCancelled,
          isRescheduled: existing.isRescheduled || item.isRescheduled,
          rescheduleMeta: existing.rescheduleMeta || item.rescheduleMeta,
        };
      }
    });

    // Sort chronologically by start time
    deduplicatedDaySessions.sort((a, b) => timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime));
    allWeekSessions[day] = deduplicatedDaySessions;
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
  sessionDay?: DayOfWeek;
  originalStartTime?: string;
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
    sessionDay,
    originalStartTime,
  } = params;

  const bRef = doc(db, 'shared_timetables', batchKey);
  const snap = await getDoc(bRef);
  if (!snap.exists()) throw new Error('Batch timetable not found.');

  const bData = snap.data();
  const currentRescheduled = bData.rescheduledSessions || {};
  const currentAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];
  const bTimetable: ClassSession[] = Array.isArray(bData.timetable) ? bData.timetable : [];

  const targetSession = bTimetable.find((s) => s.id === sessionId);
  const targetDay = sessionDay || targetSession?.day;
  const targetStartTime = originalStartTime || targetSession?.startTime;

  const matchingSessions = bTimetable.filter((s) => {
    if (s.id === sessionId) return true;
    if (targetDay && s.day !== targetDay) return false;
    if (subjectName && (
      (s.subjectName && isCommonSubject(s.subjectName, [subjectName])) ||
      (s.subjectCode && subjectName.toLowerCase().includes(s.subjectCode.toLowerCase()))
    )) {
      if (targetStartTime && s.startTime && Math.abs(timeToMinutes(s.startTime) - timeToMinutes(targetStartTime)) > 20) {
        return false;
      }
      return true;
    }
    return false;
  });

  const idsToReschedule = Array.from(new Set([
    sessionId,
    ...matchingSessions.map((s) => s.id)
  ])).filter(Boolean);

  const teacherLabel = `${facultyTitle} ${facultyName}`.trim();

  const entry: RescheduleMeta = {
    startTime: newStartTime,
    endTime: newEndTime,
    room: newRoom?.trim() || undefined,
    by: teacherLabel,
    role: 'faculty',
    reason: reason?.trim() || undefined,
    timestamp: new Date().toISOString(),
    originalStartTime: targetStartTime || '',
    originalEndTime: targetSession?.endTime || '',
  };

  const updatedRescheduled = {
    ...currentRescheduled,
  };
  idsToReschedule.forEach((id) => {
    updatedRescheduled[`${dateStr}_${id}`] = entry;
  });

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
  sessionDay?: DayOfWeek;
  originalStartTime?: string;
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
    sessionDay,
    originalStartTime,
  } = params;

  const bRef = doc(db, 'shared_timetables', batchKey);
  const snap = await getDoc(bRef);
  if (!snap.exists()) throw new Error('Batch timetable not found.');

  const bData = snap.data();
  const currentRescheduled = { ...(bData.rescheduledSessions || {}) };
  const currentAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];
  const bTimetable: ClassSession[] = Array.isArray(bData.timetable) ? bData.timetable : [];

  const targetSession = bTimetable.find((s) => s.id === sessionId);
  const targetDay = sessionDay || targetSession?.day;
  const targetStartTime = originalStartTime || targetSession?.startTime;

  const matchingSessions = bTimetable.filter((s) => {
    if (s.id === sessionId) return true;
    if (targetDay && s.day !== targetDay) return false;
    if (subjectName && (
      (s.subjectName && isCommonSubject(s.subjectName, [subjectName])) ||
      (s.subjectCode && subjectName.toLowerCase().includes(s.subjectCode.toLowerCase()))
    )) {
      if (targetStartTime && s.startTime && Math.abs(timeToMinutes(s.startTime) - timeToMinutes(targetStartTime)) > 20) {
        return false;
      }
      return true;
    }
    return false;
  });

  const idsToRevert = Array.from(new Set([
    sessionId,
    ...matchingSessions.map((s) => s.id)
  ])).filter(Boolean);

  idsToRevert.forEach((id) => {
    delete currentRescheduled[`${dateStr}_${id}`];
  });

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
  sessionDay?: DayOfWeek;
  originalStartTime?: string;
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
    sessionDay,
    originalStartTime,
  } = params;

  const bRef = doc(db, 'shared_timetables', batchKey);
  const snap = await getDoc(bRef);
  if (!snap.exists()) throw new Error('Batch timetable not found.');

  const bData = snap.data();
  const currentCancelled: string[] = Array.isArray(bData.cancelledSessions) ? bData.cancelledSessions : [];
  const currentMeta: Record<string, any> = bData.cancelledSessionsMeta || {};
  const currentAlerts = Array.isArray(bData.batchAlerts) ? bData.batchAlerts : [];
  const bTimetable: ClassSession[] = Array.isArray(bData.timetable) ? bData.timetable : [];

  const targetSession = bTimetable.find((s) => s.id === sessionId);
  const targetDay = sessionDay || targetSession?.day;
  const targetStartTime = originalStartTime || targetSession?.startTime;

  const matchingSessions = bTimetable.filter((s) => {
    if (s.id === sessionId) return true;
    if (targetDay && s.day !== targetDay) return false;
    if (subjectName && (
      (s.subjectName && isCommonSubject(s.subjectName, [subjectName])) ||
      (s.subjectCode && subjectName.toLowerCase().includes(s.subjectCode.toLowerCase()))
    )) {
      if (targetStartTime && s.startTime && Math.abs(timeToMinutes(s.startTime) - timeToMinutes(targetStartTime)) > 20) {
        return false;
      }
      return true;
    }
    return false;
  });

  const idsToModify = Array.from(new Set([
    sessionId,
    ...matchingSessions.map((s) => s.id)
  ])).filter(Boolean);

  const teacherLabel = `${facultyTitle} ${facultyName}`.trim();

  let updatedCancelled: string[] = [...currentCancelled];
  let updatedMeta = { ...currentMeta };

  if (action === 'cancel') {
    idsToModify.forEach((id) => {
      const cancelKey = `${dateStr}_${id}`;
      if (!updatedCancelled.includes(cancelKey)) {
        updatedCancelled.push(cancelKey);
      }
      updatedMeta[cancelKey] = {
        by: teacherLabel,
        role: 'faculty',
        reason: reason?.trim() || 'Class cancelled by Faculty',
        timestamp: new Date().toISOString(),
      };
    });
  } else {
    const keysToRemove = idsToModify.map((id) => `${dateStr}_${id}`);
    updatedCancelled = updatedCancelled.filter((k) => !keysToRemove.includes(k));
    keysToRemove.forEach((k) => {
      delete updatedMeta[k];
    });
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

/**
 * Returns short representation of degree/programme.
 */
export function getShortProgrammeName(progStr: string): string {
  if (!progStr) return '';
  let str = progStr.trim();
  const lower = str.toLowerCase();
  if (lower.includes('master of technology') || lower.includes('m.tech') || lower === 'mtech') return 'M.TECH';
  if (lower.includes('bachelor of technology') || lower.includes('b.tech') || lower === 'btech') return 'B.TECH';
  if (lower.includes('master of computer') || lower.includes('mca')) return 'MCA';
  if (lower.includes('bachelor of computer') || lower.includes('bca')) return 'BCA';
  if (lower.includes('master of business') || lower.includes('mba')) return 'MBA';
  if (lower.includes('bachelor of business') || lower.includes('bba')) return 'BBA';
  if (lower.includes('b.sc') || lower.includes('bachelor of science')) return 'B.SC';
  if (lower.includes('m.sc') || lower.includes('master of science')) return 'M.SC';
  return str.toUpperCase();
}

export function getShortBranchName(branchStr: string): string {
  if (!branchStr) return 'BATCH';
  let str = branchStr.trim();

  // 1. Check parenthesized acronym, e.g. "Computer Science & Engineering (CSE)" -> "CSE"
  const parenMatch = str.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].trim()) {
    const candidate = parenMatch[1].trim();
    if (!/^(Sem|Sec)/i.test(candidate)) {
      return candidate.toUpperCase();
    }
  }

  // 2. Remove parenthesized text
  str = str.replace(/\([^)]*\)/g, '').trim();

  // 3. Known phrase matches to standard short acronyms
  const lower = str.toLowerCase();
  if (lower.includes('data science') || lower.includes('ds & ai') || lower.includes('ds and ai')) {
    return 'DS & AI';
  }
  if (lower.includes('artificial intelligence') || lower.includes('ai & ml') || lower.includes('ai and ml')) {
    return 'AI & ML';
  }
  if (lower.includes('computer science') || lower.includes('cse')) {
    return 'CSE';
  }
  if (lower.includes('information tech') || lower === 'it') {
    return 'IT';
  }
  if (lower.includes('electronics') && (lower.includes('comm') || lower.includes('telecom') || lower.includes('ece'))) {
    return 'ECE';
  }
  if (lower.includes('electrical') || lower === 'ee') {
    return 'EE';
  }
  if (lower.includes('mechanical') || lower === 'me') {
    return 'ME';
  }
  if (lower.includes('civil') || lower === 'ce') {
    return 'CE';
  }
  if (lower.includes('cyber')) {
    return 'CYBER SEC';
  }

  return str.toUpperCase();
}

export function formatFacultyBatchDegreeAndBranch(batch: {
  programme?: string;
  branch?: string;
  semester?: number;
  section?: string;
  batchName?: string;
  college?: string;
}): { degreeAndBranch: string; semText: string; fullLabel: string } {
  // Aggregate all string sources to reliably extract short degree and branch
  const combinedRaw = [batch.programme, batch.branch, batch.batchName].filter(Boolean).join(' ');
  const lower = combinedRaw.toLowerCase();

  // Extract Degree
  let prog = '';
  if (lower.includes('m.tech') || lower.includes('mtech') || lower.includes('master of technology')) {
    prog = 'M.TECH';
  } else if (lower.includes('b.tech') || lower.includes('btech') || lower.includes('bachelor of technology')) {
    prog = 'B.TECH';
  } else if (lower.includes('mca')) {
    prog = 'MCA';
  } else if (lower.includes('bca')) {
    prog = 'BCA';
  } else if (lower.includes('mba')) {
    prog = 'MBA';
  } else if (lower.includes('bba')) {
    prog = 'BBA';
  } else if (batch.programme) {
    prog = getShortProgrammeName(batch.programme);
  }

  // Extract Branch
  let br = '';
  if (lower.includes('data science') || lower.includes('ds & ai') || lower.includes('ds and ai')) {
    br = 'DS & AI';
  } else if (lower.includes('ai & ml') || lower.includes('ai and ml') || lower.includes('artificial intelligence')) {
    br = 'AI & ML';
  } else if (lower.includes('computer science') || lower.includes('cse')) {
    br = 'CSE';
  } else if (lower.includes('information tech') || lower.includes(' it ')) {
    br = 'IT';
  } else if (lower.includes('electronics') || lower.includes('ece')) {
    br = 'ECE';
  } else if (lower.includes('electrical') || lower.includes(' ee ')) {
    br = 'EE';
  } else if (lower.includes('mechanical') || lower.includes(' me ')) {
    br = 'ME';
  } else if (lower.includes('civil') || lower.includes(' ce ')) {
    br = 'CE';
  } else if (batch.branch) {
    br = getShortBranchName(batch.branch);
  }

  let degreeAndBranch = '';
  if (prog && br && prog !== br) {
    degreeAndBranch = `${prog} · ${br}`;
  } else {
    degreeAndBranch = prog || br || 'BATCH';
  }

  const sem = batch.semester ? `Sem ${batch.semester}` : '';
  const sec = batch.section ? `Sec ${batch.section}` : '';
  const semText = [sem, sec].filter(Boolean).join(' · ');

  const fullLabel = semText ? `${degreeAndBranch} (${semText})` : degreeAndBranch;

  return { degreeAndBranch, semText, fullLabel };
}

/**
 * Checks whether a subject name matches any of the teacher's known taught subjects (fuzzy normalized)
 */
export function isCommonSubject(
  targetSubjectName: string,
  knownTaughtSubjectNames: string[]
): boolean {
  if (!targetSubjectName || !knownTaughtSubjectNames || knownTaughtSubjectNames.length === 0) {
    return false;
  }

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s*\([^)]*\)/g, '') // remove (theory), (lab), etc.
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const targetNorm = normalize(targetSubjectName);
  if (!targetNorm) return false;
  const targetWords = targetNorm.split(' ').filter(Boolean);

  return knownTaughtSubjectNames.some((known) => {
    const knownNorm = normalize(known);
    if (!knownNorm) return false;
    if (targetNorm === knownNorm) return true;

    // Guard against accidental short substring matches (e.g. "it", "os", "ai")
    if (targetNorm.length < 4 || knownNorm.length < 4) {
      const knownWords = knownNorm.split(' ').filter(Boolean);
      return (
        targetWords.some((w) => w === knownNorm) ||
        knownWords.some((w) => w === targetNorm)
      );
    }

    return targetNorm.includes(knownNorm) || knownNorm.includes(targetNorm);
  });
}

/**
 * Formats a single batch or multiple combined batches into clean labels for pills and details.
 */
export function formatFacultyCombinedBatchLabel(
  batches?: FacultyLinkedBatch[],
  fallbackBatch?: FacultyLinkedBatch
): {
  pillLabel: string;
  detailLabel: string;
} {
  const list = batches && batches.length > 0 ? batches : (fallbackBatch ? [fallbackBatch] : []);
  if (list.length === 0) {
    return { pillLabel: 'Batch', detailLabel: 'Batch' };
  }

  if (list.length === 1) {
    const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(list[0]);
    return {
      pillLabel: degreeAndBranch,
      detailLabel: semText ? `${degreeAndBranch} (${semText})` : degreeAndBranch,
    };
  }

  const programmes = Array.from(
    new Set(list.map((b) => getShortProgrammeName(b.programme || '')).filter(Boolean))
  );
  const shortBranches = Array.from(
    new Set(list.map((b) => getShortBranchName(b.branch || b.batchName || '')).filter(Boolean))
  );

  let pillLabel = '';
  if (programmes.length === 1 && shortBranches.length > 0) {
    pillLabel = `${programmes[0]} · ${shortBranches.join(' + ')}`;
  } else if (shortBranches.length > 0) {
    pillLabel = shortBranches.join(' + ');
  } else {
    pillLabel = `${list.length} Batches`;
  }

  const detailParts = list.map((b) => {
    const brShort = getShortBranchName(b.branch || b.batchName || '');
    const sem = b.semester ? `Sem ${b.semester}` : '';
    const sec = b.section ? `Sec ${b.section}` : '';
    const semSec = [sem, sec].filter(Boolean).join(' · ');
    return semSec ? `${brShort} (${semSec})` : brShort;
  });

  const progPrefix = programmes.length === 1 ? `${programmes[0]} · ` : '';
  const detailLabel = `${progPrefix}${detailParts.join(' + ')}`;

  return { pillLabel, detailLabel };
}

