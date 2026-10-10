import { ClassSession, FacultyLinkedBatch, Subject, DayOfWeek } from './types';
import { timeToMinutes, getCurrentDayOfWeek, getTodayDateString } from './timetableUtils';

export interface AggregatedFacultySession {
  session: ClassSession;
  batch: FacultyLinkedBatch;
  subjectName: string;
  subjectCode: string;
  isCancelled: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  minutesUntilStart: number;
}

/**
 * Checks whether a given class session belongs to the subjects selected by this faculty in this batch.
 * Strictly checks:
 * 1. session.subjectId matches batch.selectedSubjectIds
 * 2. OR matching subject object in subjectsList has its ID in batch.selectedSubjectIds
 * 3. OR session.subjectName / subjectCode matches batch.selectedSubjectNames
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
 * Aggregates all week sessions across linked batches, filtered strictly to faculty's selected subjects.
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

    timetable.forEach((session) => {
      // STRICT FILTER: Only include if this faculty selected this subject in this batch
      if (!isFacultySession(session, batch, subjectsList)) {
        return;
      }

      const { subjectName, subjectCode } = getFacultySessionDetails(session, subjectsList);

      const cancelKey = `${todayStr}_${session.id}`;
      const isCancelled = cancelledList.includes(cancelKey);

      const startMin = timeToMinutes(session.startTime);
      const endMin = timeToMinutes(session.endTime);

      const isLive =
        session.day === currentDay && currentMinutes >= startMin && currentMinutes < endMin && !isCancelled;
      const isUpcoming = session.day === currentDay && currentMinutes < startMin && !isCancelled;
      const minutesUntilStart = startMin - currentMinutes;

      const agg: AggregatedFacultySession = {
        session,
        batch,
        subjectName,
        subjectCode,
        isCancelled,
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
