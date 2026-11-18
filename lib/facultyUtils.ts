import { ClassSession, FacultyLinkedBatch, Subject, DayOfWeek } from './types';
import { timeToMinutes, getCurrentDayOfWeek, getTodayDateString, getDateStringForDayOfWeek, getLocalDateString, formatTime12Hour } from './timetableUtils';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { broadcastBatchPushNotification } from './pushNotifications';

// ── Dates ────────────────────────────────────────────────────────────────────
// Every class change is stored against a calendar date ("2026-11-27"), so a teacher can cancel or
// move any one lecture weeks ahead without touching the weekly timetable.

const WEEKDAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2026-11-27" → a local Date at midnight */
export const parseDateStr = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const dayOfWeekForDate = (dateStr: string): DayOfWeek => WEEKDAYS[parseDateStr(dateStr).getDay()];

export const addDaysToDateStr = (dateStr: string, days: number): string => {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
};

/** "Today", "Tomorrow", or "Thu, 27 Nov" */
export const formatClassDate = (dateStr: string, opts: { relative?: boolean } = { relative: true }): string => {
  if (opts.relative !== false) {
    const today = getTodayDateString();
    if (dateStr === today) return 'Today';
    if (dateStr === addDaysToDateStr(today, 1)) return 'Tomorrow';
  }
  return parseDateStr(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** The six teaching days (Mon–Sat) starting from the Monday of the week that holds `dateStr` */
export const teachingWeekDates = (dateStr: string): Record<DayOfWeek, string> => {
  const d = parseDateStr(dateStr);
  const back = (d.getDay() + 6) % 7; // days since Monday
  const monday = addDaysToDateStr(dateStr, -back);
  const out = {} as Record<DayOfWeek, string>;
  (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as DayOfWeek[]).forEach((day, i) => {
    out[day] = addDaysToDateStr(monday, i);
  });
  return out;
};

/** Where a class moved to (kept on the cancelled original) */
export interface MovedTo {
  date: string;
  startTime: string;
  endTime: string;
  extraId: string;
}

/** Where a one-off class came from (kept on the extra class) */
export interface MovedFrom {
  date: string;
  sessionId: string;
  sessionIds: string[];
  startTime: string;
  endTime: string;
}

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
  /** The calendar date this card is for */
  date: string;
  /** Cancelled because the teacher moved it to another date */
  movedTo?: MovedTo;
  cancelReason?: string;
  /** A one-off class the teacher added (or moved here) on this date */
  isExtra?: boolean;
  extraId?: string;
  movedFrom?: MovedFrom;
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
  batchesTimetableData: Record<string, any>,
  /** The calendar date for each weekday. Without it, each day means its next occurrence. */
  dayDates?: Partial<Record<DayOfWeek, string>>,
  /** The teacher's uid: their own one-off and moved classes are shown on those dates */
  facultyId?: string
): Record<DayOfWeek, AggregatedFacultySession[]> => {
  const currentDay = getCurrentDayOfWeek();
  const todayStr = getTodayDateString();
  const dateFor = (day: DayOfWeek) => dayDates?.[day] || getDateStringForDayOfWeek(day);
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
    const cancelledMeta: Record<string, any> =
      bData.cancelledSessionsMeta && typeof bData.cancelledSessionsMeta === 'object' ? bData.cancelledSessionsMeta : {};

    // The teacher's own one-off classes (including ones moved from another date) on the dates shown
    if (facultyId && bData.extraSessions && typeof bData.extraSessions === 'object') {
      const shown = new Set(Object.values(dayDates || {}));
      Object.values(bData.extraSessions as Record<string, any>).forEach((ex) => {
        if (!ex || ex.facultyId !== facultyId || !ex.date || !ex.startTime || !ex.endTime) return;
        const day = dayOfWeekForDate(ex.date);
        if (dayDates ? !shown.has(ex.date) : ex.date !== dateFor(day)) return;
        const sub = subjectsList.find((s) => s.id === ex.subjectId);
        const session: ClassSession = {
          id: ex.id,
          subjectId: ex.subjectId,
          subjectName: ex.subjectName,
          day,
          startTime: ex.startTime,
          endTime: ex.endTime,
          room: ex.room || '',
          faculty: ex.faculty,
          isLab: ex.isLab,
          isExtra: true,
          date: ex.date,
        };
        const isCancelled = cancelledList.includes(`${ex.date}_${ex.id}`);
        const startMin = timeToMinutes(ex.startTime);
        const endMin = timeToMinutes(ex.endTime);
        const isToday = ex.date === todayStr;
        allWeekSessions[day]?.push({
          session,
          batch,
          subjectName: sub?.name || sub?.shortName || ex.subjectName || 'Subject',
          subjectCode: sub?.code || '',
          isCancelled,
          isRescheduled: false,
          date: ex.date,
          isExtra: true,
          extraId: ex.id,
          movedFrom: ex.movedFrom,
          isLive: isToday && currentMinutes >= startMin && currentMinutes < endMin && !isCancelled,
          isUpcoming: isToday && currentMinutes < startMin && !isCancelled,
          minutesUntilStart: startMin - currentMinutes,
        });
      });
    }

    timetable.forEach((session) => {
      // STRICT FILTER: Only include if this faculty selected this subject in this batch
      if (!isFacultySession(session, batch, subjectsList)) {
        return;
      }

      const { subjectName, subjectCode } = getFacultySessionDetails(session, subjectsList);

      const sessionDateStr = dateFor(session.day);
      const cancelKey = `${sessionDateStr}_${session.id}`;
      const isCancelled = cancelledList.includes(cancelKey);
      const cancelMeta = isCancelled ? cancelledMeta[cancelKey] : undefined;

      const resched = rescheduledMap[`${sessionDateStr}_${session.id}`];
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

      const isToday = sessionDateStr === todayStr && session.day === currentDay;
      const isLive = isToday && currentMinutes >= startMin && currentMinutes < endMin && !isCancelled;
      const isUpcoming = isToday && currentMinutes < startMin && !isCancelled;
      const minutesUntilStart = startMin - currentMinutes;

      const agg: AggregatedFacultySession = {
        session: effectiveSession,
        batch,
        subjectName,
        subjectCode,
        isCancelled,
        isRescheduled,
        rescheduleMeta,
        date: sessionDateStr,
        movedTo: cancelMeta?.movedTo,
        cancelReason: cancelMeta?.reason,
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

        // 2. Same session type (both lab or both lecture), and a one-off class never merges into a regular one
        if (Boolean(existing.session.isLab) !== Boolean(item.session.isLab)) return false;
        if (Boolean(existing.isExtra) !== Boolean(item.isExtra)) return false;

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
          movedTo: existing.movedTo || item.movedTo,
          cancelReason: existing.cancelReason || item.cancelReason,
          movedFrom: existing.movedFrom || item.movedFrom,
        };
      }
    });

    // Sort chronologically by start time
    deduplicatedDaySessions.sort((a, b) => timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime));
    allWeekSessions[day] = deduplicatedDaySessions;
  });

  return allWeekSessions;
};

// ── Faculty class changes ────────────────────────────────────────────────────
// Each change is for one calendar date and lands in the batch's shared timetable doc, where every
// student screen, reminder and widget already reads it. Writes run in a transaction and replace the
// changed fields whole: setDoc with merge deep-merges maps, so a key deleted on undo would stay behind.

interface FacultyChangeBase {
  batchKey: string;
  sessionId: string;
  subjectName: string;
  batchName: string;
  facultyName: string;
  facultyTitle?: string;
  userId?: string;
  /** The date of the class being changed (YYYY-MM-DD) */
  dateStr: string;
  sessionDay?: DayOfWeek;
  originalStartTime?: string;
}

interface BatchAlert {
  id: string;
  title: string;
  body: string;
  type: string;
  sessionId: string;
  date: string;
  by: string;
  createdAt: string;
}

const teacherLabelOf = (p: { facultyName: string; facultyTitle?: string }) =>
  `${p.facultyTitle || 'Prof.'} ${p.facultyName}`.trim();

/** "today", "tomorrow" or "on Thu, 27 Nov" */
const whenLabel = (dateStr: string) => {
  const label = formatClassDate(dateStr);
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : `on ${label}`;
};

const timetableOf = (data: Record<string, any>): ClassSession[] => (Array.isArray(data.timetable) ? data.timetable : []);

/**
 * The ids of one teaching slot: the session itself plus any copy of it on the same day (same subject,
 * within 20 minutes), so a slot that was split or duplicated changes as one.
 */
const slotIdsFor = (
  timetable: ClassSession[],
  sessionId: string,
  subjectName: string,
  day?: DayOfWeek,
  startTime?: string
): string[] => {
  const matching = timetable.filter((s) => {
    if (s.id === sessionId) return true;
    if (day && s.day !== day) return false;
    if (
      subjectName &&
      ((s.subjectName && isCommonSubject(s.subjectName, [subjectName])) ||
        (s.subjectCode && subjectName.toLowerCase().includes(s.subjectCode.toLowerCase())))
    ) {
      return !(startTime && s.startTime && Math.abs(timeToMinutes(s.startTime) - timeToMinutes(startTime)) > 20);
    }
    return false;
  });
  return Array.from(new Set([sessionId, ...matching.map((s) => s.id)])).filter(Boolean);
};

/** Read, change and write one batch doc in a transaction, appending the alert that announces it */
const changeBatchDoc = async (
  batchKey: string,
  change: (data: Record<string, any>) => { fields: Record<string, any>; alert: BatchAlert }
): Promise<BatchAlert> => {
  const ref = doc(db, 'shared_timetables', batchKey);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Batch timetable not found.');
    const data = snap.data();
    const { fields, alert } = change(data);
    const alerts = Array.isArray(data.batchAlerts) ? data.batchAlerts : [];
    tx.update(ref, { ...fields, batchAlerts: [...alerts.slice(-19), alert], updatedAt: new Date().toISOString() });
    return alert;
  });
};

const announce = async (batchKey: string, alert: BatchAlert, userId?: string) => {
  try {
    await broadcastBatchPushNotification({
      batchKey,
      title: alert.title,
      body: alert.body,
      type: alert.type,
      senderId: userId,
      senderName: alert.by,
    });
  } catch (pushErr) {
    console.warn('Push notification error:', pushErr);
  }
};

const makeAlert = (kind: string, p: { sessionId: string; dateStr: string }, by: string, title: string, body: string): BatchAlert => ({
  id: `fac_${kind}_${p.sessionId}_${p.dateStr}_${Date.now()}`,
  title,
  body,
  type: kind,
  sessionId: p.sessionId,
  date: p.dateStr,
  by,
  createdAt: new Date().toISOString(),
});

/** Remove the one-off classes with these ids (a moved class's new slot) */
const withoutExtras = (extras: Record<string, any>, ids: Set<string>) => {
  const out: Record<string, any> = {};
  Object.entries(extras || {}).forEach(([k, v]) => {
    if (!ids.has(v?.id)) out[k] = v;
  });
  return out;
};

/**
 * Change the time or room of one lecture on one date and notify students.
 */
export const rescheduleFacultyClass = async (
  params: FacultyChangeBase & { newStartTime: string; newEndTime: string; newRoom?: string; reason?: string }
) => {
  const { batchKey, sessionId, subjectName, batchName, dateStr, newStartTime, newEndTime, newRoom, reason } = params;
  const by = teacherLabelOf(params);

  const alert = await changeBatchDoc(batchKey, (data) => {
    const timetable = timetableOf(data);
    const target = timetable.find((s) => s.id === sessionId);
    const day = params.sessionDay || target?.day;
    const ids = slotIdsFor(timetable, sessionId, subjectName, day, params.originalStartTime || target?.startTime);

    const entry: RescheduleMeta = {
      startTime: newStartTime,
      endTime: newEndTime,
      room: newRoom?.trim() || undefined,
      by,
      role: 'faculty',
      reason: reason?.trim() || undefined,
      timestamp: new Date().toISOString(),
      originalStartTime: target?.startTime || params.originalStartTime || '',
      originalEndTime: target?.endTime || '',
    };
    const rescheduled = { ...(data.rescheduledSessions || {}) };
    ids.forEach((id) => {
      rescheduled[`${dateStr}_${id}`] = entry;
    });

    const room = newRoom?.trim();
    return {
      fields: { rescheduledSessions: rescheduled },
      alert: makeAlert(
        'reschedule',
        params,
        by,
        `⏰ Lecture Rescheduled: ${subjectName}`,
        `${subjectName} (${batchName}) ${whenLabel(dateStr)} moves to ${formatTime12Hour(newStartTime)}–${formatTime12Hour(newEndTime)}${room ? ` in ${room}` : ''}, by ${by}.${reason?.trim() ? ` (${reason.trim()})` : ''}`
      ),
    };
  });

  await announce(batchKey, alert, params.userId);
};

/**
 * Undo a time change: the lecture is back at its usual time on that date.
 */
export const revertFacultyReschedule = async (params: FacultyChangeBase) => {
  const { batchKey, sessionId, subjectName, batchName, dateStr } = params;
  const by = teacherLabelOf(params);

  const alert = await changeBatchDoc(batchKey, (data) => {
    const timetable = timetableOf(data);
    const target = timetable.find((s) => s.id === sessionId);
    const ids = slotIdsFor(timetable, sessionId, subjectName, params.sessionDay || target?.day, params.originalStartTime || target?.startTime);
    const rescheduled = { ...(data.rescheduledSessions || {}) };
    ids.forEach((id) => {
      delete rescheduled[`${dateStr}_${id}`];
    });
    return {
      fields: { rescheduledSessions: rescheduled },
      alert: makeAlert(
        'reschedule_reverted',
        params,
        by,
        `🔄 Lecture Reverted: ${subjectName}`,
        `${subjectName} (${batchName}) ${whenLabel(dateStr)} is back at its usual time, by ${by}.`
      ),
    };
  });

  await announce(batchKey, alert, params.userId);
};

/**
 * Cancel one lecture on one date, or bring it back. Bringing back a lecture that was moved also
 * removes it from the date it was moved to.
 */
export const cancelOrRestoreFacultyClass = async (
  params: FacultyChangeBase & { action: 'cancel' | 'restore'; reason?: string }
) => {
  const { batchKey, sessionId, subjectName, batchName, dateStr, action, reason } = params;
  const by = teacherLabelOf(params);

  const alert = await changeBatchDoc(batchKey, (data) => {
    const timetable = timetableOf(data);
    const target = timetable.find((s) => s.id === sessionId);
    const ids = slotIdsFor(timetable, sessionId, subjectName, params.sessionDay || target?.day, params.originalStartTime || target?.startTime);
    const keys = ids.map((id) => `${dateStr}_${id}`);

    let cancelled: string[] = Array.isArray(data.cancelledSessions) ? [...data.cancelledSessions] : [];
    const meta: Record<string, any> = { ...(data.cancelledSessionsMeta || {}) };
    const fields: Record<string, any> = {};

    if (action === 'cancel') {
      keys.forEach((k) => {
        if (!cancelled.includes(k)) cancelled.push(k);
        meta[k] = { by, role: 'faculty', reason: reason?.trim() || 'Class cancelled by Faculty', timestamp: new Date().toISOString() };
      });
    } else {
      const movedIds = new Set<string>();
      keys.forEach((k) => {
        if (meta[k]?.movedTo?.extraId) movedIds.add(meta[k].movedTo.extraId);
        delete meta[k];
      });
      cancelled = cancelled.filter((k) => !keys.includes(k));
      if (movedIds.size) fields.extraSessions = withoutExtras(data.extraSessions, movedIds);
    }

    fields.cancelledSessions = cancelled;
    fields.cancelledSessionsMeta = meta;
    const note = reason?.trim() ? ` (${reason.trim()})` : '';
    return {
      fields,
      alert:
        action === 'cancel'
          ? makeAlert('cancel', params, by, `🚫 Lecture Cancelled: ${subjectName}`, `${subjectName} (${batchName}) is CANCELLED ${whenLabel(dateStr)}, by ${by}.${note}`)
          : makeAlert('restore', params, by, `✅ Lecture Restored: ${subjectName}`, `${subjectName} (${batchName}) is BACK ON ${whenLabel(dateStr)}, by ${by}.`),
    };
  });

  await announce(batchKey, alert, params.userId);
};

/**
 * Move one lecture to another date (and time): it is cancelled on its own date and added as a one-off
 * class on the new one. Students see both, and undoing either side undoes the move.
 */
export const moveFacultyClass = async (
  params: FacultyChangeBase & {
    facultyId: string;
    toDate: string;
    newStartTime: string;
    newEndTime: string;
    newRoom?: string;
    reason?: string;
  }
) => {
  const { batchKey, sessionId, subjectName, batchName, dateStr, toDate, newStartTime, newEndTime, reason } = params;
  if (toDate === dateStr) throw new Error('Pick a different date to move the class to.');
  if (toDate < getTodayDateString()) throw new Error('A class can only move to today or a later date.');
  const by = teacherLabelOf(params);
  const extraId = `fmove_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const alert = await changeBatchDoc(batchKey, (data) => {
    const timetable = timetableOf(data);
    const target = timetable.find((s) => s.id === sessionId);
    if (!target) throw new Error('This class is no longer in the batch timetable.');
    const ids = slotIdsFor(timetable, sessionId, subjectName, params.sessionDay || target.day, params.originalStartTime || target.startTime);
    const room = params.newRoom?.trim() || target.room || '';
    const fromLabel = formatClassDate(dateStr, { relative: false });
    const toLabel = formatClassDate(toDate, { relative: false });

    // The original date: cancelled, pointing at where it went
    const cancelled: string[] = Array.isArray(data.cancelledSessions) ? [...data.cancelledSessions] : [];
    const meta: Record<string, any> = { ...(data.cancelledSessionsMeta || {}) };
    const movedTo: MovedTo = { date: toDate, startTime: newStartTime, endTime: newEndTime, extraId };
    const rescheduled = { ...(data.rescheduledSessions || {}) };
    ids.forEach((id) => {
      const k = `${dateStr}_${id}`;
      if (!cancelled.includes(k)) cancelled.push(k);
      meta[k] = { by, role: 'faculty', reason: reason?.trim() || `Moved to ${toLabel}`, timestamp: new Date().toISOString(), movedTo };
      delete rescheduled[k]; // a time change on the old date no longer applies
    });

    // The new date: a one-off class, pointing back at the original
    const movedFrom: MovedFrom = { date: dateStr, sessionId, sessionIds: ids, startTime: target.startTime, endTime: target.endTime };
    const extras = { ...(data.extraSessions || {}) };
    extras[`${toDate}_${extraId}`] = {
      id: extraId,
      date: toDate,
      day: dayOfWeekForDate(toDate),
      subjectId: target.subjectId,
      subjectName,
      startTime: newStartTime,
      endTime: newEndTime,
      room,
      faculty: target.faculty,
      isLab: !!target.isLab,
      notes: reason?.trim() || `Moved from ${fromLabel}`,
      by,
      role: 'faculty',
      facultyId: params.facultyId,
      movedFrom,
      createdAt: new Date().toISOString(),
    };

    return {
      fields: { cancelledSessions: cancelled, cancelledSessionsMeta: meta, rescheduledSessions: rescheduled, extraSessions: extras },
      alert: makeAlert(
        'reschedule',
        params,
        by,
        `📅 Lecture Moved: ${subjectName}`,
        `${subjectName} (${batchName}) moves from ${fromLabel} to ${toLabel}, ${formatTime12Hour(newStartTime)}–${formatTime12Hour(newEndTime)}${room ? ` in ${room}` : ''}, by ${by}.${reason?.trim() ? ` (${reason.trim()})` : ''}`
      ),
    };
  });

  await announce(batchKey, alert, params.userId);
  return extraId;
};

/**
 * Remove a one-off class the teacher added. If it was moved here, the lecture goes back to its own date.
 */
export const undoFacultyExtraClass = async (params: {
  batchKey: string;
  extraId: string;
  subjectName: string;
  batchName: string;
  facultyName: string;
  facultyTitle?: string;
  userId?: string;
}) => {
  const { batchKey, extraId, subjectName, batchName } = params;
  const by = teacherLabelOf(params);

  const alert = await changeBatchDoc(batchKey, (data) => {
    const extras: Record<string, any> = data.extraSessions || {};
    const ex = Object.values(extras).find((v: any) => v?.id === extraId) as any;
    if (!ex) throw new Error('This class was already removed.');
    const fields: Record<string, any> = { extraSessions: withoutExtras(extras, new Set([extraId])) };

    const from: MovedFrom | undefined = ex.movedFrom;
    const dropKeys = new Set([`${ex.date}_${extraId}`]);
    (from?.sessionIds || []).forEach((id) => dropKeys.add(`${from!.date}_${id}`));
    const meta: Record<string, any> = { ...(data.cancelledSessionsMeta || {}) };
    dropKeys.forEach((k) => delete meta[k]);
    fields.cancelledSessions = (Array.isArray(data.cancelledSessions) ? data.cancelledSessions : []).filter((k: string) => !dropKeys.has(k));
    fields.cancelledSessionsMeta = meta;

    const p = { sessionId: from?.sessionId || extraId, dateStr: from?.date || ex.date };
    return {
      fields,
      alert: from
        ? makeAlert('restore', p, by, `↩️ Lecture Back On Its Date: ${subjectName}`, `${subjectName} (${batchName}) is not moving after all. It stays ${whenLabel(from.date)} at ${formatTime12Hour(from.startTime)}, and nothing changes ${whenLabel(ex.date)}. By ${by}.`)
        : makeAlert('cancel', p, by, `🚫 Extra Class Removed: ${subjectName}`, `The ${subjectName} (${batchName}) extra class ${whenLabel(ex.date)} is off, by ${by}.`),
    };
  });

  await announce(batchKey, alert, params.userId);
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

