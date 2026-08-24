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
  const dateTodayStr = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // 1. Daily Morning Schedule Summary (Generates once per day)
  const todayClasses = timetable
    .filter((s) => s.day === todayDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const dailySummaryKey = `daily_summary_${dateTodayStr}`;
  if (todayClasses.length > 0 && !existingIds.has(dailySummaryKey)) {
    const firstClass = todayClasses[0];
    const sub = subjectMap.get(firstClass.subjectId);
    newNotifications.push({
      id: `notif_${Date.now()}_ds`,
      title: `📅 Today's Schedule (${todayClasses.length} ${todayClasses.length === 1 ? 'class' : 'classes'})`,
      message: `Your first class is ${sub?.name || 'Class'} at ${formatTime12Hour(firstClass.startTime)} in ${firstClass.room}.`,
      category: 'classes',
      timestamp: new Date().toISOString(),
      read: false,
      relatedId: dailySummaryKey,
    });
  }

  // 2. Class reminders (Up to 30 mins before & Starting Now)
  const maxReminderMins = settings.classReminderMinutes || 30;
  todayClasses.forEach((session) => {
    const startMinutes = timeToMinutes(session.startTime);
    const diff = startMinutes - currentMinutes;
    const sub = subjectMap.get(session.subjectId);

    // Reminder 5-30 mins before
    const remindKey = `class_remind_${session.id}_${dateTodayStr}`;
    if (diff > 0 && diff <= maxReminderMins && !existingIds.has(remindKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_cr_${session.id}`,
        title: `⏰ ${sub?.shortName || sub?.name || 'Class'} in ${diff} mins`,
        message: `${sub?.name || 'Lecture'} starts at ${formatTime12Hour(session.startTime)} in ${session.room}${session.faculty ? ` with ${session.faculty}` : ''}.`,
        category: 'classes',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: remindKey,
      });
    }

    // Starting Now alert
    const startingNowKey = `class_now_${session.id}_${dateTodayStr}`;
    if (diff <= 0 && diff >= -5 && !existingIds.has(startingNowKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_cn_${session.id}`,
        title: `🔔 Class Starting Now: ${sub?.name || 'Lecture'}`,
        message: `Class in ${session.room}${session.faculty ? ` with ${session.faculty}` : ''} has begun.`,
        category: 'classes',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: startingNowKey,
      });
    }
  });

  // 3. Evening Carry Bag Check (Fires after 6 PM / 18:00 for tomorrow)
  if (now.getHours() >= 18) {
    const carryCheckKey = `carry_evening_${dateTodayStr}`;
    if (!existingIds.has(carryCheckKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_carry`,
        title: `🎒 Pack Your Bag for Tomorrow`,
        message: `Check your carry bag items and lab requirements for tomorrow's classes.`,
        category: 'carry',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: carryCheckKey,
      });
    }
  }

  // 4. Homework & Assignment Deadline Alerts
  const incompleteHw = homework.filter((h) => h.status !== 'Completed');
  incompleteHw.forEach((hw) => {
    const sub = subjectMap.get(hw.subjectId);
    const deadlineDate = new Date(hw.deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const relatedKey = `hw_remind_${hw.id}_${diffDays}d`;

    if (diffDays === 0 && !existingIds.has(relatedKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_hw0_${hw.id}`,
        title: `🚨 Due Today: ${hw.title}`,
        message: `${sub?.name || 'Assignment'} is due today at ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        category: 'deadlines',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: relatedKey,
      });
    } else if (diffDays === 1 && !existingIds.has(relatedKey)) {
      newNotifications.push({
        id: `notif_${Date.now()}_hw1_${hw.id}`,
        title: `⏳ Due Tomorrow: ${hw.title}`,
        message: `${sub?.name || 'Assignment'} deadline is tomorrow.`,
        category: 'homework',
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: relatedKey,
      });
    }
  });

  return newNotifications;
};
