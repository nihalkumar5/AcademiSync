import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ClassSession, Subject, Homework, Exam, UserSettings } from './types';
import { formatTime12Hour } from './timetableUtils';

// Helper to configure a high-importance native Android channel for lockscreen alerts & sound
const ensureNotificationChannel = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // We use class_alerts_v3 to register a new channel with our custom chime sound.
    await LocalNotifications.createChannel({
      id: 'class_alerts_v3',
      name: 'Class Alerts & Reminders',
      description: 'High priority alarms for upcoming classes, bag packing, and homework with sound and lockscreen display',
      importance: 5,   // 5 = Max/High importance (heads-up banner pop-up + sound)
      visibility: 1,   // 1 = Public (displays content on lock screen)
      sound: 'class_bell', // Custom premium bell chime (res/raw/class_bell.wav)
      vibration: true,
      lights: true,
    });
    console.log('Class Alerts native notification channel configured with custom chime.');
  } catch (error) {
    console.error('Failed to create native notification channel:', error);
  }
};

export const triggerLocalNotification = async (title: string, body: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications are only available on native devices.');
    return;
  }

  try {
    // Request permission to show notifications if not already granted
    const check = await LocalNotifications.checkPermissions();
    if (check.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Ensure the high-importance channel exists
    await ensureNotificationChannel();

    // Schedule the notification immediately
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000) + 1,
          sound: 'class_bell', // Plays the custom chime
          channelId: 'class_alerts_v3', // Directs it to our high priority channel
          attachments: [],
          actionTypeId: '',
          extra: null,
        },
      ],
    });
    console.log('Native local notification scheduled successfully.');
  } catch (error) {
    console.error('Failed to trigger native local notification', error);
  }
};

export const scheduleTestNotification = async (delaySeconds: number = 5) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications are only available on native devices.');
    return;
  }

  try {
    const check = await LocalNotifications.checkPermissions();
    if (check.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    await ensureNotificationChannel();

    const targetTime = new Date(Date.now() + delaySeconds * 1000);
    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🔔 InterSemester Alert Test',
          body: 'Background notifications work! Class & bag reminders will alert you even when the app is closed.',
          id: 99999,
          schedule: {
            at: targetTime,
            allowWhileIdle: true,
          },
          sound: 'class_bell',
          channelId: 'class_alerts_v3',
          extra: null,
        },
      ],
    });
    console.log(`Test notification scheduled for ${delaySeconds}s from now.`);
  } catch (error) {
    console.error('Failed to schedule test notification', error);
  }
};

export const scheduleTimetableLocalNotifications = async (
  timetable: ClassSession[],
  subjects: Subject[],
  homework?: Homework[],
  exams?: Exam[],
  settingsParam?: UserSettings | number
) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications scheduling is skipped (not a native platform).');
    return;
  }

  try {
    // Check/Request permission
    const check = await LocalNotifications.checkPermissions();
    if (check.display !== 'granted') {
      const requestRes = await LocalNotifications.requestPermissions();
      if (requestRes.display !== 'granted') {
        console.warn('Local notification permission was not granted by user.');
        return;
      }
    }

    // Ensure high-importance channel exists
    await ensureNotificationChannel();

    // Cancel all existing scheduled notifications first to prevent duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    const reminderMinutes = typeof settingsParam === 'number' 
      ? settingsParam 
      : (settingsParam?.classReminderMinutes ?? 10);

    const eveningBagTime = typeof settingsParam === 'object' 
      ? (settingsParam?.eveningCarryReminderTime || '20:00')
      : '20:00';

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const dayToWeekdayNum: Record<string, number> = {
      'Sunday': 1,
      'Monday': 2,
      'Tuesday': 3,
      'Wednesday': 4,
      'Thursday': 5,
      'Friday': 6,
      'Saturday': 7,
    };

    const notificationsToSchedule: any[] = [];

    // 1. Schedule Weekly Class Alarms
    for (let i = 0; i < timetable.length; i++) {
      const session = timetable[i];
      const sub = subjectMap.get(session.subjectId);
      if (!sub) continue;

      const dayNum = dayToWeekdayNum[session.day];
      if (!dayNum) continue;

      // Parse session.startTime robustly: "09:00", "09:00 AM", "14:30"
      const cleanTime = session.startTime.trim();
      const parts = cleanTime.split(' ');
      const timeParts = parts[0].split(':');
      let startH = parseInt(timeParts[0], 10);
      let startM = parseInt(timeParts[1] || '0', 10);

      if (parts[1]) {
        const modifier = parts[1].toUpperCase();
        if (modifier === 'PM' && startH < 12) startH += 12;
        if (modifier === 'AM' && startH === 12) startH = 0;
      }

      if (isNaN(startH) || isNaN(startM)) continue;
      
      const totalMinutes = startH * 60 + startM;
      const targetMinutes = totalMinutes - reminderMinutes;

      // Handle negative minutes (e.g. class at 00:05, reminder 10 min before is previous day)
      let targetHour = Math.floor(targetMinutes / 60);
      let targetMin = targetMinutes % 60;
      let targetDayNum = dayNum;

      if (targetMinutes < 0) {
        targetHour = (24 + targetHour) % 24;
        targetMin = (60 + targetMin) % 60;
        targetDayNum = targetDayNum === 1 ? 7 : targetDayNum - 1;
      }

      const notifId = i + 1000;

      // CRITICAL FIX: DO NOT include `every: 'week'`.
      // In Capacitor Android, specifying `every` overrides `on` and ignores weekday/hour/minute.
      // With `on: { weekday, hour, minute }`, Android schedules exact repeating weekly triggers!
      notificationsToSchedule.push({
        title: `⏰ Class in ${reminderMinutes} mins: ${sub.name}`,
        body: `${session.isLab || sub.isLab ? 'Lab' : 'Lecture'} at ${session.room || sub.room || 'Classroom'} starts at ${formatTime12Hour(session.startTime)}`,
        id: notifId,
        schedule: {
          on: {
            weekday: targetDayNum,
            hour: targetHour,
            minute: targetMin,
          },
          allowWhileIdle: true,
        },
        sound: 'class_bell',
        channelId: 'class_alerts_v3',
        extra: null,
      });
    }

    // 2. Schedule Daily Evening Bag Packing Reminder
    const [bagHStr, bagMStr] = eveningBagTime.split(':');
    const bagH = parseInt(bagHStr || '20', 10);
    const bagM = parseInt(bagMStr || '0', 10);
    if (!isNaN(bagH) && !isNaN(bagM)) {
      notificationsToSchedule.push({
        title: '🎒 Pack Your Bag for Tomorrow',
        body: 'Check your carry bag items and timetable for tomorrow\'s classes.',
        id: 5001,
        schedule: {
          on: {
            hour: bagH,
            minute: bagM,
          },
          allowWhileIdle: true,
        },
        sound: 'class_bell',
        channelId: 'class_alerts_v3',
        extra: null,
      });
    }

    // 3. Schedule Homework / Assignment Due Reminders
    if (homework && homework.length > 0) {
      const nowMs = Date.now();
      homework.forEach((hw, idx) => {
        if (hw.status === 'Completed' || !hw.deadline) return;
        const deadlineDate = new Date(hw.deadline);
        const sub = subjectMap.get(hw.subjectId);
        const hwTitle = hw.title;

        // 1 day before
        const oneDayBefore = new Date(deadlineDate.getTime() - 24 * 60 * 60 * 1000);
        if (oneDayBefore.getTime() > nowMs) {
          notificationsToSchedule.push({
            title: `⏳ Due Tomorrow: ${hwTitle}`,
            body: `${sub?.name || 'Assignment'} deadline is tomorrow at ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            id: 6000 + (idx * 2),
            schedule: {
              at: oneDayBefore,
              allowWhileIdle: true,
            },
            sound: 'class_bell',
            channelId: 'class_alerts_v3',
            extra: null,
          });
        }

        // 2 hours before
        const twoHoursBefore = new Date(deadlineDate.getTime() - 2 * 60 * 60 * 1000);
        if (twoHoursBefore.getTime() > nowMs) {
          notificationsToSchedule.push({
            title: `🚨 Due in 2 Hours: ${hwTitle}`,
            body: `${sub?.name || 'Assignment'} is due very soon. Complete and submit now!`,
            id: 6000 + (idx * 2) + 1,
            schedule: {
              at: twoHoursBefore,
              allowWhileIdle: true,
            },
            sound: 'class_bell',
            channelId: 'class_alerts_v3',
            extra: null,
          });
        }
      });
    }

    // 4. Schedule Exam Alerts
    if (exams && exams.length > 0) {
      const nowMs = Date.now();
      exams.forEach((exam, idx) => {
        if (!exam.date) return;
        const examDate = new Date(exam.date);
        // Alert at 07:30 AM on exam day
        const examMorning = new Date(examDate);
        examMorning.setHours(7, 30, 0, 0);

        if (examMorning.getTime() > nowMs) {
          notificationsToSchedule.push({
            title: `📝 Exam Today: ${exam.subjectName}`,
            body: `Examination scheduled for today in ${exam.room || 'Examination Hall'}. All the best!`,
            id: 7000 + idx,
            schedule: {
              at: examMorning,
              allowWhileIdle: true,
            },
            sound: 'class_bell',
            channelId: 'class_alerts_v3',
            extra: null,
          });
        }
      });
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
      console.log(`Successfully scheduled ${notificationsToSchedule.length} native background reminders (classes, bag check, tasks).`);
    } else {
      console.log('No items to schedule for background notifications.');
    }
  } catch (error) {
    console.error('Failed to schedule timetable local notifications', error);
  }
};
