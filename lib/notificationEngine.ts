import { AppNotification, ClassSession, Homework, Subject, UserSettings } from './types';
import { getCurrentDayOfWeek, timeToMinutes, formatTime12Hour } from './timetableUtils';

export const checkAndGenerateSmartNotifications = (
  timetable: ClassSession[],
  subjects: Subject[],
  homework: Homework[],
  settings: UserSettings,
  existingNotifications: AppNotification[]
): AppNotification[] => {
  const newNotifications: AppNotification[] = [];
  const existingIds = new Set(existingNotifications.map((n) => n.relatedId || n.id));
  const now = new Date();
  const todayDay = getCurrentDayOfWeek();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // 1. Class reminders (e.g., 15 minutes before)
  const todayClasses = timetable.filter((s) => s.day === todayDay);
  todayClasses.forEach((session) => {
    const startMinutes = timeToMinutes(session.startTime);
    const diff = startMinutes - currentMinutes;
    const relatedKey = `class_remind_${session.id}_${todayDay}_${session.startTime}`;

    if (diff > 0 && diff <= (settings.classReminderMinutes || 15) && !existingIds.has(relatedKey)) {
      const sub = subjectMap.get(session.subjectId);
      newNotifications.push({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `${sub?.shortName || 'Class'} in ${diff} minutes`,
        message: `${sub?.name || 'Class'} begins at ${formatTime12Hour(session.startTime)} in ${session.room}${session.faculty ? ` with ${session.faculty}` : ''}.`,
        category: 'classes',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: relatedKey,
      });
    }
  });

  // 2. Homework deadline reminders (Today, Tomorrow, 3 days)
  const incompleteHw = homework.filter((h) => h.status !== 'Completed');
  incompleteHw.forEach((hw) => {
    const sub = subjectMap.get(hw.subjectId);
    const deadlineDate = new Date(hw.deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const relatedKey = `hw_remind_${hw.id}_${diffDays}d`;

    if (diffDays === 0 && !existingIds.has(relatedKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `🚨 Deadline Today: ${hw.title}`,
        message: `Your ${sub?.shortName || 'course'} assignment is due today at ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        category: 'deadlines',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: relatedKey,
      });
    } else if (diffDays === 1 && !existingIds.has(relatedKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Due Tomorrow: ${hw.title}`,
        message: `${sub?.name || 'Subject'} assignment submission deadline is tomorrow.`,
        category: 'homework',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: relatedKey,
      });
    }
  });

  return newNotifications;
};
