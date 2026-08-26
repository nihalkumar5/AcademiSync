import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ClassSession, Subject, Homework, Exam, UserSettings, AcademicEvent } from './types';
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
  settingsParam?: UserSettings | number,
  events?: AcademicEvent[]
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

    // Build a Set of holiday date strings (YYYY-MM-DD) from academic calendar
    const holidayDates = new Set<string>();
    if (events && events.length > 0) {
      events.forEach((ev) => {
        if (ev.type === 'holiday' && ev.date) {
          holidayDates.add(ev.date);
        }
      });
    }

    const notificationsToSchedule: any[] = [];

    // Day name -> JS getDay() value (0 = Sunday)
    const dayNameToJsDay: Record<string, number> = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };

    const WEEKS_AHEAD = 8; // Schedule for next 8 weeks

    // 1. Schedule Class Alarms as per-date one-off notifications (holiday-aware)
    for (let i = 0; i < timetable.length; i++) {
      const session = timetable[i];
      const sub = subjectMap.get(session.subjectId);
      if (!sub) continue;

      const jsDay = dayNameToJsDay[session.day];
      if (jsDay === undefined) continue;

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

      // Find the next N occurrences of this weekday and schedule individually
      const now = new Date();
      let occurrenceCount = 0;

      for (let weekOffset = 0; weekOffset < WEEKS_AHEAD * 7 && occurrenceCount < WEEKS_AHEAD; weekOffset++) {
        const candidateDate = new Date(now);
        candidateDate.setDate(now.getDate() + weekOffset);
        candidateDate.setHours(startH, startM, 0, 0);

        // Must be the right weekday and in the future
        if (candidateDate.getDay() !== jsDay) continue;
        if (candidateDate.getTime() <= now.getTime()) continue;

        // Check if this specific date is a holiday — skip if yes
        const dateStr = candidateDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
        if (holidayDates.has(dateStr)) {
          console.log(`Skipping class notification on ${dateStr} — holiday in academic calendar.`);
          occurrenceCount++;
          continue;
        }

        // Schedule reminder 'reminderMinutes' before the class
        const reminderTime = new Date(candidateDate.getTime() - reminderMinutes * 60 * 1000);
        if (reminderTime.getTime() <= now.getTime()) {
          occurrenceCount++;
          continue;
        }

        const notifId = 1000 + (i * WEEKS_AHEAD) + occurrenceCount;

        notificationsToSchedule.push({
          title: `⏰ Class in ${reminderMinutes} mins: ${sub.name}`,
          body: `${session.isLab || sub.isLab ? 'Lab' : 'Lecture'} at ${session.room || sub.room || 'Classroom'} starts at ${formatTime12Hour(session.startTime)}`,
          id: notifId,
          schedule: {
            at: reminderTime,
            allowWhileIdle: true,
          },
          sound: 'class_bell',
          channelId: 'class_alerts_v3',
          extra: null,
        });

        occurrenceCount++;
      }
    }

    // 2. Schedule Daily Evening Bag Packing Reminder
    let bagH = 20;
    let bagM = 0;
    if (eveningBagTime) {
      const cleanBag = eveningBagTime.trim();
      const parts = cleanBag.split(' ');
      const timeParts = parts[0].split(':');
      let h = parseInt(timeParts[0] || '20', 10);
      let m = parseInt(timeParts[1] || '0', 10);

      if (parts[1]) {
        const modifier = parts[1].toUpperCase();
        if (modifier === 'PM' && h < 12) h += 12;
        if (modifier === 'AM' && h === 12) h = 0;
      }
      if (!isNaN(h) && !isNaN(m)) {
        bagH = h;
        bagM = m;
      }
    }

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
