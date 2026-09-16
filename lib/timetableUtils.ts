import { DayOfWeek, ClassSession, Subject, CarryItem, Homework, ExtractedClassSession, AcademicEvent, HomeworkStatus, UserSettings } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  return getLocalDateString(tomorrow);
};

export const getTodayDateString = (): string => {
  return getLocalDateString(new Date());
};

/**
 * Sanitizes an academic class time to strict 24-hour "HH:MM".
 * In college timetables, classes operate ONLY between 08:00 AM and 07:00 PM.
 * If an hour is 1 to 7 without a 24-hour offset, it is automatically converted to PM (13:00 - 19:00).
 */
export const sanitizeAcademicTime = (
  timeStr?: string, 
  fallback = '09:00', 
  isEndTime = false, 
  relativeStartTime?: string
): string => {
  if (!timeStr || typeof timeStr !== 'string') return fallback;
  const full = timeStr.trim();
  let single = full;
  if (single.includes('-')) {
    single = isEndTime ? single.split('-')[1].trim() : single.split('-')[0].trim();
  } else if (single.toLowerCase().includes(' to ')) {
    single = isEndTime ? single.toLowerCase().split(' to ')[1].trim() : single.toLowerCase().split(' to ')[0].trim();
  }

  const hasPM = /pm/i.test(single) || /pm/i.test(full) || (isEndTime && relativeStartTime && /pm/i.test(relativeStartTime));
  const hasAM = /am/i.test(single) || (/am/i.test(full) && !hasPM);

  const match = single.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);

    if (hasPM && h < 12) {
      h += 12;
    } else if (hasAM && h === 12) {
      h = 0;
    } else if (!hasAM && h >= 1 && h <= 7) {
      // 1:00 - 7:00 in college timetables is strictly PM (13:00 - 19:00)
      h += 12;
    } else if (isEndTime && relativeStartTime) {
      const startH = parseInt(relativeStartTime.split(':')[0], 10);
      if (startH >= 12 && h < 12) {
        h += 12;
      }
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const hourOnly = single.match(/(\d{1,2})/);
  if (hourOnly) {
    let h = parseInt(hourOnly[1], 10);
    if (hasPM && h < 12) h += 12;
    else if (hasAM && h === 12) h = 0;
    else if (!hasAM && h >= 1 && h <= 7) h += 12;
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  return fallback;
};

/**
 * Auto-sanitizes a class session's startTime and endTime into proper 24-hour format.
 */
export const sanitizeClassSessionTimes = <T extends { startTime: string; endTime: string }>(session: T): T => {
  const cleanStart = sanitizeAcademicTime(session.startTime, '09:00', false);
  const cleanEnd = sanitizeAcademicTime(session.endTime, '10:00', true, cleanStart);
  if (cleanStart === session.startTime && cleanEnd === session.endTime) {
    return session;
  }
  return {
    ...session,
    startTime: cleanStart,
    endTime: cleanEnd,
  };
};

export const formatTime12Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  const [hStr, mStr] = trimmed.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;

  // Auto-correct hours 1 to 7 without 24-hour offset to PM
  if (h >= 1 && h <= 7) {
    h += 12;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${m} ${ampm}`;
};

/**
 * Formats a college name for compact, aesthetic badge display (e.g. "IIIT Allahabad", "IIT Bombay")
 */
export const formatCollegeBadge = (collegeStr?: string): string => {
  if (!collegeStr || !collegeStr.trim()) return 'Your College';
  const trimmed = collegeStr.trim();

  // Pattern: "Full Name (ACRONYM) Location" -> "ACRONYM Location"
  const match = trimmed.match(/\(([^)]+)\)\s*(.*)/);
  if (match) {
    const acronym = match[1].trim();
    const rest = match[2].trim();
    return rest ? `${acronym} ${rest}` : acronym;
  }

  if (trimmed.length <= 22) return trimmed;

  return trimmed
    .replace(/International Institute of Information Technology/gi, 'IIIT')
    .replace(/Indian Institute of Information Technology/gi, 'IIIT')
    .replace(/Indian Institute of Technology/gi, 'IIT')
    .replace(/National Institute of Technology/gi, 'NIT')
    .replace(/Birla Institute of Technology and Science/gi, 'BITS')
    .replace(/College of Engineering/gi, 'COE')
    .replace(/University of/gi, 'Univ.')
    .trim();
};

export const timeToMinutes = (time24: string): number => {
  if (!time24) return 0;
  const [hRaw, mRaw] = time24.split(':').map(Number);
  let h = hRaw || 0;
  const m = mRaw || 0;
  // If hour is 1 to 7 without 24-hour prefix in an academic timetable, it's PM
  if (h >= 1 && h <= 7) {
    h += 12;
  }
  return h * 60 + m;
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
  timetable: ClassSession[] = [],
  subjects: Subject[] = [],
  day: DayOfWeek = getCurrentDayOfWeek(),
  dateStr: string = getTodayDateString(),
  rescheduledSessions: Record<string, { startTime: string; endTime: string; room?: string; subjectId?: string }> = {},
  extraSessions: Record<string, any> = {},
  isCancelledFn?: (sessionId: string, dateStr?: string) => boolean
): LiveClassStatus => {
  const safeTimetable = Array.isArray(timetable) ? timetable : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeRescheduled = (rescheduledSessions && typeof rescheduledSessions === 'object') ? rescheduledSessions : {};
  const safeExtra = (extraSessions && typeof extraSessions === 'object') ? extraSessions : {};

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const regularSessions = safeTimetable
    .filter((s) => s && s.day === day && (!isCancelledFn || !isCancelledFn(s.id, dateStr)))
    .map((s) => {
      const rescheduleKey = `${dateStr}_${s.id}`;
      let reschedule = safeRescheduled[rescheduleKey];
      if (!reschedule) {
        for (const [k, r] of Object.entries(safeRescheduled)) {
          if (k.startsWith(`${dateStr}_`)) {
            const candId = k.split('_').slice(1).join('_');
            const candSess = safeTimetable.find((cand) => cand.id === candId);
            if (
              candSess &&
              candSess.day === s.day &&
              candSess.startTime === s.startTime &&
              (candSess.subjectId === s.subjectId || candSess.faculty === s.faculty)
            ) {
              reschedule = r;
              break;
            }
          }
        }
      }
      if (reschedule) {
        return {
          ...s,
          startTime: reschedule.startTime,
          endTime: reschedule.endTime,
          room: reschedule.room || s.room,
          subjectId: reschedule.subjectId || s.subjectId,
        };
      }
      return s;
    });

  const extraList = Object.values(safeExtra)
    .filter((ex: any) => ex && ex.date === dateStr && (!isCancelledFn || !isCancelledFn(ex.id, dateStr)))
    .map((ex: any) => ({
      id: ex.id,
      subjectId: ex.subjectId,
      day: ex.day || day,
      startTime: ex.startTime,
      endTime: ex.endTime,
      room: ex.room || '',
      faculty: ex.faculty,
      isLab: ex.isLab,
      isExtra: true,
      notes: ex.notes,
    }));

  const daySessions = [...regularSessions, ...extraList]
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (daySessions.length === 0) {
    return { currentClass: null, nextClass: null, allDoneToday: true };
  }

  const subjectMap = new Map(safeSubjects.map((s) => [s.id, s]));

  const resolveSubject = (sess: ClassSession): Subject | undefined => {
    if (sess.subjectId && subjectMap.has(sess.subjectId)) return subjectMap.get(sess.subjectId);
    const subName = (sess as any).subjectName?.toLowerCase();
    const subCode = (sess as any).subjectCode?.toLowerCase();
    if (subCode) {
      const match = safeSubjects.find(s => s.code && s.code.toLowerCase() === subCode);
      if (match) return match;
    }
    if (subName) {
      const match = safeSubjects.find(s => s.name && s.name.toLowerCase() === subName);
      if (match) return match;
    }
    if (sess.faculty) {
      const f = sess.faculty.toLowerCase().trim();
      const match = safeSubjects.find(s => s.facultyName && (s.facultyName.toLowerCase().includes(f) || f.includes(s.facultyName.toLowerCase())));
      if (match) return match;
    }
    return undefined;
  };

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
        subject: resolveSubject(session),
        remainingMinutes: remaining,
        progressPercentage: Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))),
      };
    } else if (currentMinutes < start && !nextClass) {
      nextClass = {
        session,
        subject: resolveSubject(session),
        minutesUntilStart: start - currentMinutes,
      };
    }
  }

  return {
    currentClass,
    nextClass,
    allDoneToday: !currentClass && !nextClass && daySessions.length > 0,
  };
};

/**
 * Deterministic generation of the "What to Carry" bag list for tomorrow
 */
export const calculateTomorrowCarryItems = (
  timetable: ClassSession[] = [],
  subjects: Subject[] = [],
  existingCarryItems: CarryItem[] = [],
  targetDateStr?: string,
  targetDay?: DayOfWeek,
  events: AcademicEvent[] = [],
  settings?: UserSettings,
  extraSessions: Record<string, any> = {}
): CarryItem[] => {
  const safeTimetable = Array.isArray(timetable) ? timetable : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeExistingCarry = Array.isArray(existingCarryItems) ? existingCarryItems : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const safeExtra = (extraSessions && typeof extraSessions === 'object') ? extraSessions : {};

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  let limitMinutes = 18 * 60; // Default 6 PM (1080 mins)
  if (settings?.eveningCarryReminderTime) {
    const parts = settings.eveningCarryReminderTime.trim().split(' ');
    const timeParts = parts[0].split(':');
    let h = parseInt(timeParts[0], 10);
    const m = parseInt(timeParts[1] || '0', 10);
    if (parts[1]) {
      const modifier = parts[1].toUpperCase();
      if (modifier === 'PM' && h < 12) h += 12;
      if (modifier === 'AM' && h === 12) h = 0;
    }
    if (!isNaN(h) && !isNaN(m)) {
      limitMinutes = h * 60 + m;
    }
  }

  let defaultDateStr = '';
  let defaultDay: DayOfWeek = 'Monday';

  if (currentMinutes >= limitMinutes) {
    // Configured evening carry check time or later: show tomorrow's classes
    defaultDateStr = getTomorrowDateString();
    defaultDay = getTomorrowDayOfWeek();
  } else {
    // Before configured time: show today's classes
    defaultDateStr = getTodayDateString();
    defaultDay = getCurrentDayOfWeek();
  }

  const resolvedDateStr = targetDateStr || defaultDateStr;
  const resolvedDay = targetDay || defaultDay;

  try {
    // Check if target date is an academic holiday
    const isHoliday = safeEvents.some(
      (e) => e && e.date === resolvedDateStr && e.type === 'holiday'
    );

    // If holiday, there are no subject bag requirements needed!
    if (isHoliday) {
      return safeExistingCarry.filter(
        (i) => i && i.date === resolvedDateStr && i.source === 'custom'
      );
    }

    const subjectMap = new Map(safeSubjects.map((s) => [s.id, s]));
    const tomorrowRegularClasses = safeTimetable.filter((s) => s && s.day === resolvedDay);
    const extraForTarget = Object.values(safeExtra).filter(
      (ex: any) => ex && ex.date === resolvedDateStr
    );
    const tomorrowClasses = [...tomorrowRegularClasses, ...extraForTarget];

    // Collect items required from tomorrow's subjects
    const requiredMap = new Map<string, { subjectId: string; subjectName: string }>();

    tomorrowClasses.forEach((session) => {
      if (!session) return;
      const subject = subjectMap.get(session.subjectId);
      if (!subject) return;

      // Add subject's configured carry requirements
      if (Array.isArray(subject.carryRequirements)) {
        subject.carryRequirements.forEach((req) => {
          if (typeof req === 'string') {
            const trimmed = req.trim();
            if (trimmed && !requiredMap.has(trimmed.toLowerCase())) {
              requiredMap.set(trimmed.toLowerCase(), {
                subjectId: subject.id,
                subjectName: subject.name,
              });
            }
          }
        });
      }
    });

    // Map of existing items for the date to preserve packed state
    const existingMap = new Map(
      safeExistingCarry
        .filter((i) => i && i.date === resolvedDateStr)
        .map((i) => [i.title ? i.title.toLowerCase() : '', i])
    );

    const result: CarryItem[] = [];

    // Add all subject required items
    requiredMap.forEach((meta, titleLower) => {
      const existing = existingMap.get(titleLower);
      // Find original case
      const originalTitle =
        existing?.title ||
        safeSubjects
          .flatMap((s) => (Array.isArray(s?.carryRequirements) ? s.carryRequirements : []))
          .find((r) => typeof r === 'string' && r.toLowerCase() === titleLower) ||
        titleLower;

      result.push({
        id: existing?.id || `carry_auto_${meta.subjectId}_${Math.random().toString(36).substring(2, 7)}`,
        title: originalTitle,
        source: 'subject',
        subjectId: meta.subjectId,
        subjectName: meta.subjectName,
        isPacked: existing?.isPacked ?? false,
        isHidden: existing?.isHidden ?? false,
        date: resolvedDateStr,
      });
    });

    // Also include custom items added by user for this date
    safeExistingCarry
      .filter((i) => i && i.date === resolvedDateStr && i.source === 'custom')
      .forEach((customItem) => {
        result.push(customItem);
      });

    return result;
  } catch (err) {
    console.error('Error calculating carry items:', err);
    return safeExistingCarry;
  }
};

/**
 * Deterministic calculation of Today's Focus priority list
 */
export const calculateTodayFocus = (
  homework: Homework[] = [],
  timetable: ClassSession[] = [],
  subjects: Subject[] = [],
  warningDays: number = 3
): {
  id: string;
  title: string;
  type: 'homework' | 'lab' | 'exam' | 'prep';
  urgency: 'high' | 'medium' | 'low';
  tag: string;
  deadlineText?: string;
  completed: boolean;
  status?: HomeworkStatus;
  originalPriority?: 'Low' | 'Medium' | 'High';
}[] => {
  const items: {
    id: string;
    title: string;
    type: 'homework' | 'lab' | 'exam' | 'prep';
    urgency: 'high' | 'medium' | 'low';
    tag: string;
    deadlineText?: string;
    completed: boolean;
    status?: HomeworkStatus;
    originalPriority?: 'Low' | 'Medium' | 'High';
  }[] = [];

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeHomework = Array.isArray(homework) ? homework : [];
  const safeTimetable = Array.isArray(timetable) ? timetable : [];

  const subjectMap = new Map(safeSubjects.map((s) => [s.id, s]));
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  // 1. Incomplete homework sorted by deadline & priority
  const incompleteHw = safeHomework.filter((h) => h && h.status !== 'Completed');

  incompleteHw.forEach((hw) => {
    const subject = subjectMap.get(hw.subjectId);
    const deadlineDate = new Date(hw.deadline);
    
    const timeDiff = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Only show tasks that are within the user's warning days threshold,
    // or if they are already overdue (diffDays < 0).
    if (diffDays > warningDays) {
      return;
    }

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
      status: hw.status,
      originalPriority: hw.priority,
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

    // Deduplicate exact or duplicate signatures (prevent redundant repeated classes from multi-section scans)
    const seenSignatures = new Set<string>();
    const uniqueDaySessions: ExtractedClassSession[] = [];

    for (const sess of daySessions) {
      if (!sess.startTime || !sess.endTime || !sess.subjectName) continue;
      const cleanSubj = sess.subjectName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanCode = (sess.subjectCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const sig = `${sess.day}_${sess.startTime}_${sess.endTime}_${cleanCode || cleanSubj}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        uniqueDaySessions.push(sess);
      }
    }

    // Sort by start time
    uniqueDaySessions.sort((a, b) => toMins(a.startTime) - toMins(b.startTime));

    const mergedDaySessions: ExtractedClassSession[] = [];

    uniqueDaySessions.forEach((current) => {
      if (mergedDaySessions.length === 0) {
        mergedDaySessions.push({ ...current });
        return;
      }

      const last = mergedDaySessions[mergedDaySessions.length - 1];

      // Check if they are the same subject
      const sameSubject =
        last.subjectName.trim().toLowerCase() === current.subjectName.trim().toLowerCase() ||
        (!!last.subjectCode && !!current.subjectCode && last.subjectCode.trim().toLowerCase() === current.subjectCode.trim().toLowerCase());

      const lastStart = toMins(last.startTime);
      const lastEnd = toMins(last.endTime);
      const currStart = toMins(current.startTime);
      const currEnd = toMins(current.endTime);

      // Exact or inner overlap of same subject: merge
      if (sameSubject && currStart >= lastStart && currStart < lastEnd) {
        const maxEndMins = Math.max(lastEnd, currEnd);
        last.endTime = toTimeStr(maxEndMins);
        if (!last.faculty && current.faculty) last.faculty = current.faculty;
        if (!last.room && current.room) last.room = current.room;
        if (current.isLab) last.isLab = true;
        if (current.isElective) last.isElective = true;
        return;
      }

      // Consecutive slots (gap <= 15 mins) or partial overlap of same subject
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
        if (current.isElective) last.isElective = true;
      } else {
        mergedDaySessions.push({ ...current });
      }
    });

    mergedSessions.push(...mergedDaySessions);
  });

  return mergedSessions;
};

export const getSubjectThemeStyle = (hexColor?: string, theme: 'light' | 'dark' | 'system' = 'light') => {
  const baseColor = hexColor || '#7C897A';
  // Ensure it starts with #
  const hex = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;
  
  let isDark = theme === 'dark';
  if (theme === 'system' && typeof window !== 'undefined') {
    isDark = document.documentElement.classList.contains('dark') || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  if (isDark) {
    return {
      backgroundColor: `${hex}20`, // 12.5% opacity for dark mode bg
      borderColor: `${hex}50`, // 31% opacity for dark mode border
    };
  } else {
    return {
      backgroundColor: `${hex}0F`, // 6% opacity for light mode bg
      borderColor: `${hex}40`, // 25% opacity for light mode border
    };
  }
};

export const getShortCollegeName = (name: string): string => {
  if (!name) return 'COLLEGE';

  // Normalize: remove punctuation, brackets, multiple spaces
  const clean = name.toLowerCase().replace(/[.\-_,]/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  
  // 1. Specific top landmark institute aliases
  if (
    clean.includes('naya raipur') || 
    clean.includes('atal nagar') || 
    clean.includes('shyama prasad') || 
    clean.includes('iiitnr') || 
    clean.includes('iiit nr') || 
    clean.includes('dspm') || 
    (clean.includes('iiit') && (clean.includes('raipur') || clean.includes('nr')))
  ) {
    return 'IIIT NAYA RAIPUR';
  }
  if (clean.includes('iiit') && (clean.includes('hyderabad') || clean.includes(' hyd') || clean === 'iiith' || clean === 'iiit h')) {
    return 'IIIT HYDERABAD';
  }
  if (clean.includes('iiit') && (clean.includes('bangalore') || clean.includes('blr') || clean === 'iiitb' || clean === 'iiit b')) {
    return 'IIIT BANGALORE';
  }
  if (clean.includes('iiit') && (clean.includes('delhi') || clean === 'iiitd' || clean === 'iiit d')) {
    return 'IIIT DELHI';
  }
  if (clean.includes('iiit') && (clean.includes('allahabad') || clean.includes('prayagraj') || clean === 'iiita' || clean === 'iiit a')) {
    return 'IIIT ALLAHABAD';
  }
  if (clean.includes('iit') && (clean.includes('bombay') || clean.includes('mumbai') || clean === 'iitb' || clean === 'iit b')) {
    return 'IIT BOMBAY';
  }
  if (clean.includes('iit') && (clean.includes('delhi') || clean === 'iitd' || clean === 'iit d')) {
    return 'IIT DELHI';
  }
  if (clean.includes('iit') && (clean.includes('madras') || clean.includes('chennai') || clean === 'iitm' || clean === 'iit m')) {
    return 'IIT MADRAS';
  }
  if (clean.includes('iit') && (clean.includes('kanpur') || clean === 'iitk' || clean === 'iit k')) {
    return 'IIT KANPUR';
  }
  if (clean.includes('iit') && (clean.includes('kharagpur') || clean.includes('kgp') || clean === 'iitkgp' || clean === 'iit kgp')) {
    return 'IIT KHARAGPUR';
  }
  if (clean.includes('iit') && (clean.includes('roorkee') || clean === 'iitr' || clean === 'iit r')) {
    return 'IIT ROORKEE';
  }
  if (clean.includes('iit') && (clean.includes('guwahati') || clean === 'iitg' || clean === 'iit g')) {
    return 'IIT GUWAHATI';
  }
  if (clean.includes('nit') && (clean.includes('trichy') || clean.includes('tiruchirappalli') || clean === 'nitt' || clean === 'nit t')) {
    return 'NIT TRICHY';
  }
  if (clean.includes('nit') && (clean.includes('surathkal') || clean.includes('karnataka') || clean === 'nitk' || clean === 'nit k')) {
    return 'NIT SURATHKAL';
  }
  if (clean.includes('nit') && (clean.includes('warangal') || clean === 'nitw' || clean === 'nit w')) {
    return 'NIT WARANGAL';
  }
  if (clean.includes('nit') && (clean.includes('calicut') || clean === 'nitc' || clean === 'nit c')) {
    return 'NIT CALICUT';
  }
  if (clean.includes('nit') && (clean.includes('rourkela') || clean === 'nitrkl' || clean === 'nit rkl')) {
    return 'NIT ROURKELA';
  }
  if (clean.includes('nit') && (clean.includes('raipur') || clean === 'nitrr') && !clean.includes('naya')) {
    return 'NIT RAIPUR';
  }
  if (clean.includes('bits') && (clean.includes('pilani') || clean.includes('rajasthan'))) {
    return 'BITS PILANI';
  }
  if (clean.includes('vellore institute') || clean === 'vit' || clean.includes('vit vellore')) {
    return 'VIT VELLORE';
  }
  if (clean.includes('manipal') || clean.includes('mit manipal')) {
    return 'MANIPAL';
  }
  if (clean.includes('delhi technological') || clean === 'dtu') {
    return 'DTU';
  }
  if (clean.includes('netaji subhas') || clean === 'nsut') {
    return 'NSUT';
  }

  // 2. Generic institute prefix handling
  if (clean.includes('institute of technology') || clean.includes('institute of information technology') || clean.includes('university')) {
    const words = clean.split(/\s+/).filter(Boolean);
    let prefix = '';
    
    // Check IIIT first before IIT or NIT
    if (clean.includes('international institute of information technology') || clean.includes('indian institute of information technology') || clean.includes('iiit')) {
      prefix = 'IIIT';
    } else if (clean.includes('indian institute of technology') || (/\biit\b/.test(clean) && !clean.includes('iiit'))) {
      prefix = 'IIT';
    } else if (/\bnational institute of technology\b/.test(clean) || (/\bnit\b/.test(clean) && !clean.includes('unit'))) {
      prefix = 'NIT';
    } else if (clean.includes('indian institute')) {
      prefix = 'II';
    }
    
    if (prefix) {
      const meaningfulWords = words.filter(w => !['of', 'and', '&', 'for', 'in', 'the', 'institute', 'technology', 'university', 'science', 'engineering', 'national', 'indian', 'international', 'dr', 'dr.', 'shyama', 'prasad', 'mukherjee'].includes(w));
      const loc = meaningfulWords.slice(-2).join(' ').trim();
      return `${prefix} ${loc ? loc.toUpperCase() : 'CAMPUS'}`;
    }
  }

  // 3. Fallback: Acronym generator
  const stopWords = ['of', 'and', '&', 'for', 'in', 'the', 'dr', 'dr.'];
  const words = clean.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 0);
  if (words.length >= 3) {
    const initials = words.slice(0, -1).map(w => w[0]).join('').toUpperCase();
    const lastWord = words[words.length - 1].toUpperCase();
    if (initials.length <= 4) {
      return `${initials} ${lastWord}`;
    }
  }

  return clean.toUpperCase();
};

export const normalizeProgrammeName = (programme: string): string => {
  if (!programme) return 'btech';
  const clean = programme.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('mtech') || clean.includes('masteroftechnology')) return 'mtech';
  if (clean.includes('btech') || clean.includes('bacheloroftechnology')) return 'btech';
  if (clean.includes('be') || clean.includes('bachelorofengineering')) return 'be';
  if (clean.includes('mca') || clean.includes('masterofcomputerapplications')) return 'mca';
  if (clean.includes('bca') || clean.includes('bachelorofcomputerapplications')) return 'bca';
  if (clean.includes('mba') || clean.includes('masterofbusinessadministration')) return 'mba';
  if (clean.includes('bba') || clean.includes('bachelorofbusinessadministration')) return 'bba';
  if (clean.includes('msc') || clean.includes('masterofscience')) return 'msc';
  if (clean.includes('bsc') || clean.includes('bachelorofscience')) return 'bsc';
  if (clean.includes('mpharm')) return 'mpharm';
  if (clean.includes('bpharm')) return 'bpharm';
  return clean || 'btech';
};

export const normalizeBranchName = (branch: string): string => {
  if (!branch) return 'cse';
  const str = branch.toLowerCase().trim();
  
  // Data Science & AI variants
  if (
    (str.includes('data') && (str.includes('science') || str.includes('ai') || str.includes('intelligence'))) ||
    str === 'dsai' || str.includes('ds & ai') || str.includes('ai & ds') || str.includes('ds/ai') || str.includes('ai/ds')
  ) {
    return 'dsai';
  }
  
  // AI & ML variants
  if (
    (str.includes('artificial') && str.includes('machine')) ||
    str === 'aiml' || str.includes('ai & ml') || str.includes('ai/ml')
  ) {
    return 'aiml';
  }

  // Computer Science / CSE variants
  if (
    str.includes('computer') || str === 'cse' || str === 'cs' || str.includes('comp sci') || str.includes('software')
  ) {
    return 'cse';
  }

  // Electronics & Communication / ECE variants
  if (
    str.includes('electronics') || str === 'ece' || str.includes('comm')
  ) {
    return 'ece';
  }

  // Electrical & Electronics / EEE variants
  if (
    str.includes('electrical') && str.includes('electronics') || str === 'eee'
  ) {
    return 'eee';
  }

  // Electrical / EE variants
  if (
    str.includes('electrical') || str === 'ee'
  ) {
    return 'ee';
  }

  // Information Technology / IT variants
  if (
    str.includes('information') || str === 'it'
  ) {
    return 'it';
  }

  // Mechanical / ME variants
  if (
    str.includes('mechanical') || str === 'me'
  ) {
    return 'me';
  }

  // Civil / CE variants
  if (
    str.includes('civil') || str === 'ce'
  ) {
    return 'ce';
  }

  // Chemical / CHE variants
  if (
    str.includes('chemical') || str === 'che'
  ) {
    return 'che';
  }

  // Biotechnology / BT variants
  if (
    str.includes('biotech') || str === 'bt'
  ) {
    return 'bt';
  }

  return str.replace(/[^a-z0-9]/g, '') || 'general';
};

export const isExplicitSection = (section?: string): boolean => {
  if (!section) return false;
  const clean = section.trim().toUpperCase();
  if (
    !clean || 
    clean === 'A' || 
    clean === 'SEC A' || 
    clean === 'SECTION A' || 
    clean === 'NO SECTION' || 
    clean === 'SINGLE BATCH' || 
    clean === 'NONE' || 
    clean.includes('NO SECTION') || 
    clean.includes('SINGLE')
  ) {
    return false;
  }
  return true;
};

export const formatBatchDisplayName = (branch?: string, semester?: number, section?: string): string => {
  const b = branch || 'Class';
  const sem = semester ? `Sem ${semester}` : '';
  const cleanSec = normalizeSection(section);
  const secPart = cleanSec ? `Sec ${cleanSec}` : '';
  const parts = [b, sem, secPart].filter(Boolean);
  return parts.join(' · ');
};

export const normalizeSection = (section?: string): string => {
  if (!section) return '';
  let str = section.trim().toUpperCase();
  // Strip common noisy prefixes: "SECTION A" -> "A", "SEC-A" -> "A", "SEC: A" -> "A", "BATCH 1" -> "1"
  str = str.replace(/^(SECTION|SEC|BATCH)\s*[:.\-]?\s*/i, '');
  // Clean special punctuation except alphanumeric and space/hyphen
  str = str.replace(/[^A-Z0-9\s\-]/g, '').trim();
  // Filter out non-section placeholders
  if (
    !str || 
    str === 'NONE' || 
    str === 'ALL' || 
    str === 'NO SECTION' || 
    str === 'SINGLE' || 
    str === 'SINGLE BATCH' ||
    str === 'GENERAL'
  ) {
    return '';
  }
  return str;
};

export const getCanonicalBatchKey = (
  college: string, 
  programme: string, 
  branch: string, 
  semester: number, 
  _section?: string
): string => {
  const shortCollege = getShortCollegeName(college);
  const cleanCollegeKey = shortCollege.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanProgKey = normalizeProgrammeName(programme);
  const cleanBranchKey = normalizeBranchName(branch);

  // Unified canonical batch key (Branch & Semester container).
  // Section is preserved on student profiles, NOT appended to the batch key,
  // preventing class fragmentation, duplicate batches, and sync isolation.
  return `${cleanCollegeKey}_${cleanProgKey}_${cleanBranchKey}_sem${semester}`;
};

/**
 * Robustly extracts the clean batch invite code or canonical key from any input string:
 * - Direct 6-character code: "65SQ9K" or "65sq9k"
 * - Full URL: "https://academi-sync-chi.vercel.app/?invite=65SQ9K"
 * - URL with multiple params: "https://...?invite=65SQ9K&from=whatsapp"
 * - Whole WhatsApp share message with text and code
 * - Canonical batch key: "iiitnr_btech_cse_sem4_secA"
 */
export const extractCleanInviteCode = (input: string): string => {
  if (!input) return '';
  let str = input.trim();

  // 1. If it contains an HTTP/HTTPS URL
  const urlMatch = str.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    try {
      const parsedUrl = new URL(urlMatch[0]);
      const invite = parsedUrl.searchParams.get('invite') || parsedUrl.searchParams.get('key');
      if (invite) {
        const trimmed = invite.trim();
        return trimmed.length <= 8 && !trimmed.includes('_') ? trimmed.toUpperCase() : trimmed;
      }
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts.includes('join') && pathParts.length > 1) {
        const lastPart = pathParts[pathParts.length - 1].trim();
        return lastPart.length <= 8 && !lastPart.includes('_') ? lastPart.toUpperCase() : lastPart;
      }
    } catch (_) {}
  }

  // 2. If it contains "invite=XYZ"
  const paramMatch = str.match(/invite=([a-zA-Z0-9_-]+)/i);
  if (paramMatch && paramMatch[1]) {
    const val = paramMatch[1].trim();
    return val.length <= 8 && !val.includes('_') ? val.toUpperCase() : val;
  }

  // 3. If it contains "code: XYZ" or "key: XYZ" or "Batch Invite Code: XYZ"
  const codeMatch = str.match(/(?:code|key)\s*[:：\-]\s*([a-zA-Z0-9_-]+)/i);
  if (codeMatch && codeMatch[1]) {
    const val = codeMatch[1].trim();
    return val.length <= 8 && !val.includes('_') ? val.toUpperCase() : val;
  }

  // 4. If tokens contain a 5 to 8 char alphanumeric code or a canonical key
  const cleanTokens = str.split(/\s+/);
  for (const token of cleanTokens) {
    const cleanToken = token.replace(/[^a-zA-Z0-9_-]/g, '');
    if (/^[A-Za-z0-9]{5,8}$/.test(cleanToken)) {
      return cleanToken.toUpperCase();
    }
    if (cleanToken.includes('_sem')) {
      return cleanToken;
    }
  }

  // 5. Fallback: stripped alphanumeric
  const fallback = str.replace(/[^a-zA-Z0-9_-]/g, '');
  if (fallback.length <= 8 && !fallback.includes('_')) {
    return fallback.toUpperCase();
  }
  return fallback || str;
};

/**
 * Normalizes an unknown value (array, corrupted Firestore FieldValue map, or single string)
 * into a clean string array of IDs or emails.
 */
export const normalizeIdList = (input: any): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((x) => (typeof x === 'string' ? x : (x?.stringValue || ''))).filter(Boolean);
  }
  if (typeof input === 'object') {
    if (Array.isArray(input._r)) {
      return input._r.map((x: any) => (typeof x === 'string' ? x : (x?.stringValue || ''))).filter(Boolean);
    }
    if (Array.isArray(input.values)) {
      return input.values.map((x: any) => (typeof x === 'string' ? x : (x?.stringValue || ''))).filter(Boolean);
    }
  }
  return [];
};

/**
 * Validates that an email is a legitimate institute or personal email address,
 * rejecting joke domains, malformed formats, or nonsensical input.
 */
export const isValidProperEmail = (email?: string): boolean => {
  try {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim().toLowerCase();
    const standardRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+([a-zA-Z]{2,})$/;
    if (!standardRegex.test(trimmed)) return false;

    const parts = trimmed.split('@');
    if (parts.length !== 2) return false;
    const [userPart, domainPart] = parts;

    if (userPart.length < 1 || userPart.length > 64) return false;
    if (userPart.startsWith('.') || userPart.endsWith('.') || userPart.includes('..')) return false;

    const domainSegments = domainPart.split('.');
    if (domainSegments.length < 2 || domainSegments.length > 4) return false;

    const tld = domainSegments[domainSegments.length - 1];
    if (!tld || tld.length < 2 || tld.length > 10 || !/^[a-z]+$/.test(tld)) return false;

    const validEndings = [
      'edu.in', 'ac.in', 'res.in', 'ernet.in', 'gov.in', 'co.in', 'net.in', 'org.in',
      'edu', 'ac.uk', 'edu.au', 'com', 'org', 'net', 'in', 'io', 'ai', 'co', 'me', 'app', 'dev'
    ];
    const matchesKnownEnding = validEndings.some((end) => domainPart.endsWith(end));
    if (!matchesKnownEnding) {
      if (domainSegments.length > 3) return false;
      if (!['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'in', 'io', 'co'].includes(tld)) {
        return false;
      }
    }

    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Deduplicates and prunes calendar events:
 * 1. Removes exact duplicates on the same date with identical title.
 * 2. Prunes artificial multi-day spam where single milestone events (e.g., Convocation,
 *    Commencement, Senate meeting, Registration) were improperly expanded into 20-30 days.
 * 3. Safely preserves legitimate exam windows and short vacation breaks.
 */
export const deduplicateAcademicEvents = (
  rawEvents: AcademicEvent[]
): { cleaned: AcademicEvent[]; removedCount: number } => {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return { cleaned: [], removedCount: 0 };
  }

  const milestonePattern = /convocation|commencement|inauguration|orientation|re-opening|foundation|declaration|result|submission|deadline|registration|fee|senate|meeting|alumni/i;
  const examOrBreakPattern = /exam|test|viva|quiz|vacation|recess|break|fest/i;

  // Step 1: Remove exact duplicates on the exact same date
  const exactSeen = new Set<string>();
  const step1: AcademicEvent[] = [];

  for (const ev of rawEvents) {
    if (!ev || !ev.title || !ev.date) continue;
    const normTitle = ev.title.trim().toLowerCase();
    const key = `${ev.date}_${normTitle}_${ev.type || 'event'}`;
    if (!exactSeen.has(key)) {
      exactSeen.add(key);
      step1.push(ev);
    }
  }

  // Step 2: Chronological sort
  step1.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Step 3: Detect and collapse artificial range spam in each month
  const monthTitleMap = new Map<string, AcademicEvent[]>();
  for (const ev of step1) {
    const monthKey = (ev.date || '').substring(0, 7); // "YYYY-MM"
    const normTitle = ev.title.trim().toLowerCase();
    const groupKey = `${monthKey}::${normTitle}`;
    const list = monthTitleMap.get(groupKey) || [];
    list.push(ev);
    monthTitleMap.set(groupKey, list);
  }

  const cleaned: AcademicEvent[] = [];

  monthTitleMap.forEach((groupEvents) => {
    if (groupEvents.length <= 1) {
      cleaned.push(...groupEvents);
      return;
    }

    const firstEv = groupEvents[0];
    const isMilestone = milestonePattern.test(firstEv.title);
    const isExamOrBreak = examOrBreakPattern.test(firstEv.title) || firstEv.type === 'exam';

    // If it is a point milestone repeating > 1 time, or non-exam repeating > 2 times, or any event repeating > 14 times:
    if (isMilestone || (!isExamOrBreak && groupEvents.length > 2) || groupEvents.length > 14) {
      // Keep only the earliest occurrence
      cleaned.push(firstEv);
    } else {
      // Legitimate multi-day exam week or break (<= 14 days)
      cleaned.push(...groupEvents);
    }
  });

  // Final chronological sort
  cleaned.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const removedCount = rawEvents.length - cleaned.length;

  return { cleaned, removedCount };
};
