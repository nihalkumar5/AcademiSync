import { DayOfWeek, ClassSession, Subject, CarryItem, Homework, ExtractedClassSession } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon...
  const map: Record<number, DayOfWeek> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return map[dayIndex] || 'Monday';
};

export const getTomorrowDayOfWeek = (): DayOfWeek => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayIndex = tomorrow.getDay();
  const map: Record<number, DayOfWeek> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return map[dayIndex] || 'Tuesday';
};

export const getTomorrowDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const formatTime12Hour = (time24: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${ampm}`;
};

export const timeToMinutes = (time24: string): number => {
  const [h, m] = time24.split(':').map(Number);
  return h * 60 + (m || 0);
};

export interface LiveClassStatus {
  currentClass: {
    session: ClassSession;
    subject?: Subject;
    remainingMinutes: number;
    progressPercentage: number;
  } | null;
  nextClass: {
    session: ClassSession;
    subject?: Subject;
    minutesUntilStart: number;
  } | null;
  allDoneToday: boolean;
}

export const getLiveClassStatus = (
  timetable: ClassSession[],
  subjects: Subject[],
  day: DayOfWeek = getCurrentDayOfWeek()
): LiveClassStatus => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const daySessions = timetable
    .filter((s) => s.day === day)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (daySessions.length === 0) {
    return { currentClass: null, nextClass: null, allDoneToday: true };
  }

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  let currentClass: LiveClassStatus['currentClass'] = null;
  let nextClass: LiveClassStatus['nextClass'] = null;

  for (const session of daySessions) {
    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);

    if (currentMinutes >= start && currentMinutes < end) {
      const totalDuration = end - start;
      const elapsed = currentMinutes - start;
      const remaining = end - currentMinutes;
      currentClass = {
        session,
        subject: subjectMap.get(session.subjectId),
        remainingMinutes: remaining,
        progressPercentage: Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))),
      };
    } else if (currentMinutes < start && !nextClass) {
      nextClass = {
        session,
        subject: subjectMap.get(session.subjectId),
        minutesUntilStart: start - currentMinutes,
      };
    }
  }

  const lastSession = daySessions[daySessions.length - 1];
  const allDoneToday = !currentClass && currentMinutes >= timeToMinutes(lastSession.endTime);

  return { currentClass, nextClass, allDoneToday };
};

/**
 * Deterministic generation of the "What to Carry" bag list for tomorrow
 */
export const calculateTomorrowCarryItems = (
  timetable: ClassSession[],
  subjects: Subject[],
  existingCarryItems: CarryItem[],
  targetDateStr?: string,
  targetDay?: DayOfWeek
): CarryItem[] => {
  const now = new Date();
  const currentHour = now.getHours();

  let defaultDateStr = '';
  let defaultDay: DayOfWeek = 'Monday';

  if (currentHour >= 18) {
    // 6 PM or later: show tomorrow's classes
    defaultDateStr = getTomorrowDateString();
    defaultDay = getTomorrowDayOfWeek();
  } else {
    // Before 6 PM: show today's classes
    defaultDateStr = getTodayDateString();
    defaultDay = getCurrentDayOfWeek();
  }

  const resolvedDateStr = targetDateStr || defaultDateStr;
  const resolvedDay = targetDay || defaultDay;

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const tomorrowClasses = timetable.filter((s) => s.day === resolvedDay);

  // Collect items required from tomorrow's subjects
  const requiredMap = new Map<string, { subjectId: string; subjectName: string }>();

  tomorrowClasses.forEach((session) => {
    const subject = subjectMap.get(session.subjectId);
    if (!subject) return;

    // Add subject's configured carry requirements
    if (Array.isArray(subject.carryRequirements)) {
      subject.carryRequirements.forEach((req) => {
        const trimmed = req.trim();
        if (trimmed && !requiredMap.has(trimmed.toLowerCase())) {
          requiredMap.set(trimmed.toLowerCase(), {
            subjectId: subject.id,
            subjectName: subject.name,
          });
        }
      });
    }
  });

  // Map of existing items for the date to preserve packed state
  const existingMap = new Map(
    existingCarryItems
      .filter((i) => i.date === resolvedDateStr)
      .map((i) => [i.title.toLowerCase(), i])
  );

  const result: CarryItem[] = [];

  // Add all subject required items
  requiredMap.forEach((meta, titleLower) => {
    const existing = existingMap.get(titleLower);
    // Find original case
    const originalTitle =
      existing?.title ||
      subjects
        .flatMap((s) => s.carryRequirements)
        .find((r) => r.toLowerCase() === titleLower) ||
      titleLower;

    result.push({
      id: existing?.id || `carry_auto_${meta.subjectId}_${Math.random().toString(36).substring(2, 7)}`,
      title: originalTitle,
      source: 'subject',
      subjectId: meta.subjectId,
      subjectName: meta.subjectName,
      isPacked: existing?.isPacked ?? false,
      date: resolvedDateStr,
    });
  });

  // Also include custom items added by user for this date
  existingCarryItems
    .filter((i) => i.date === resolvedDateStr && i.source === 'custom')
    .forEach((customItem) => {
      result.push(customItem);
    });

  return result;
};

/**
 * Deterministic calculation of Today's Focus priority list
 */
export const calculateTodayFocus = (
  homework: Homework[],
  timetable: ClassSession[],
  subjects: Subject[]
): {
  id: string;
  title: string;
  type: 'homework' | 'lab' | 'exam' | 'prep';
  urgency: 'high' | 'medium' | 'low';
  tag: string;
  deadlineText?: string;
  completed: boolean;
}[] => {
  const items: {
    id: string;
    title: string;
    type: 'homework' | 'lab' | 'exam' | 'prep';
    urgency: 'high' | 'medium' | 'low';
    tag: string;
    deadlineText?: string;
    completed: boolean;
  }[] = [];

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  // 1. Incomplete homework sorted by deadline & priority
  const incompleteHw = homework.filter((h) => h.status !== 'Completed');

  incompleteHw.forEach((hw) => {
    const subject = subjectMap.get(hw.subjectId);
    const deadlineDate = new Date(hw.deadline);
    const isDueToday = deadlineDate.toDateString() === today.toDateString();
    const isDueTomorrow = deadlineDate.toDateString() === tomorrow.toDateString();

    let urgency: 'high' | 'medium' | 'low' = 'medium';
    let deadlineText = '';

    if (isDueToday) {
      urgency = 'high';
      deadlineText = 'Due Today';
    } else if (isDueTomorrow) {
      urgency = 'high';
      deadlineText = 'Due Tomorrow';
    } else if (hw.priority === 'High') {
      urgency = 'high';
      deadlineText = `Due ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      urgency = hw.priority === 'Medium' ? 'medium' : 'low';
      deadlineText = `Due ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    items.push({
      id: hw.id,
      title: hw.title,
      type: 'homework',
      urgency,
      tag: subject?.name || 'Homework',
      deadlineText,
      completed: false,
    });
  });

  // 2. Check if today has a lab session that requires prep
  const todayDay = getCurrentDayOfWeek();
  const todayLabs = timetable.filter((s) => s.day === todayDay && s.isLab);

  todayLabs.forEach((lab) => {
    const sub = subjectMap.get(lab.subjectId);
    items.push({
      id: `prep_${lab.id}`,
      title: `Prepare practicals for ${sub?.name || 'Lab'} (${lab.room})`,
      type: 'lab',
      urgency: 'medium',
      tag: 'Lab Prep',
      completed: false,
    });
  });

  return items;
};

/**
 * Automatically merges consecutive extracted class sessions of the same subject on the same day.
 */
export const mergeConsecutiveSessions = (
  sessions: ExtractedClassSession[]
): ExtractedClassSession[] => {
  if (!sessions || sessions.length <= 1) return sessions;

  // Group sessions by day
  const sessionsByDay: Record<string, ExtractedClassSession[]> = {};
  sessions.forEach((s) => {
    if (!sessionsByDay[s.day]) {
      sessionsByDay[s.day] = [];
    }
    sessionsByDay[s.day].push(s);
  });

  const mergedSessions: ExtractedClassSession[] = [];

  // Helper to convert HH:MM to minutes
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  // Helper to format minutes to HH:MM
  const toTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  Object.keys(sessionsByDay).forEach((day) => {
    const daySessions = sessionsByDay[day];

    // Sort by start time
    daySessions.sort((a, b) => toMins(a.startTime) - toMins(b.startTime));

    const mergedDaySessions: ExtractedClassSession[] = [];

    daySessions.forEach((current) => {
      if (mergedDaySessions.length === 0) {
        mergedDaySessions.push({ ...current });
        return;
      }

      const last = mergedDaySessions[mergedDaySessions.length - 1];

      // Check if they are the same subject
      const sameSubject =
        last.subjectName.trim().toLowerCase() === current.subjectName.trim().toLowerCase();

      // Check if they are consecutive or overlap
      const lastEnd = toMins(last.endTime);
      const currStart = toMins(current.startTime);
      const currEnd = toMins(current.endTime);

      // We allow up to 15 minutes of gap or exact overlap
      const isConsecutive = currStart >= lastEnd && (currStart - lastEnd) <= 15;
      const isOverlap = currStart < lastEnd && currEnd > lastEnd;

      if (sameSubject && (isConsecutive || isOverlap)) {
        // Merge them!
        const maxEndMins = Math.max(lastEnd, currEnd);
        last.endTime = toTimeStr(maxEndMins);

        // Merge faculty and room if one is missing
        if (!last.faculty && current.faculty) last.faculty = current.faculty;
        if (!last.room && current.room) last.room = current.room;
        if (current.isLab) last.isLab = true;
      } else {
        mergedDaySessions.push({ ...current });
      }
    });

    mergedSessions.push(...mergedDaySessions);
  });

  return mergedSessions;
};
