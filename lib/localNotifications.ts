import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ClassSession, Subject } from './types';

// Helper to configure a high-importance native Android channel for lockscreen alerts & sound
const ensureNotificationChannel = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // We use class_alerts_v3 to register a new channel with our custom chime sound.
    await LocalNotifications.createChannel({
      id: 'class_alerts_v3',
      name: 'Class Alerts (High Priority)',
      description: 'High priority alarms for upcoming classes with sound and lockscreen display',
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

export const scheduleTimetableLocalNotifications = async (
  timetable: ClassSession[],
  subjects: Subject[],
  reminderMinutes: number = 10
) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications scheduling is skipped (not a native platform).');
    return;
  }

  try {
    // Check/Request permission
    const check = await LocalNotifications.checkPermissions();
    if (check.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Ensure high-importance channel exists
    await ensureNotificationChannel();

    // Cancel all existing scheduled notifications first to prevent duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

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

    const notificationsToSchedule = [];

    for (let i = 0; i < timetable.length; i++) {
      const session = timetable[i];
      const sub = subjectMap.get(session.subjectId);
      if (!sub) continue;

      const dayNum = dayToWeekdayNum[session.day];
      if (!dayNum) continue;

      // Calculate time: e.g. "09:00"
      const [hStr, mStr] = session.startTime.split(':');
      const startH = parseInt(hStr, 10);
      const startM = parseInt(mStr, 10);
      
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

      // Generate unique notification ID
      const notifId = i + 1000; // Offset to separate from demo/test notifications

      notificationsToSchedule.push({
        title: `Class in ${reminderMinutes} mins: ${sub.name}`,
        body: `${session.isLab || sub.isLab ? 'Lab' : 'Lecture'} at ${session.room || sub.room} starts at ${session.startTime}`,
        id: notifId,
        schedule: {
          every: 'week' as const,
          on: {
            weekday: targetDayNum,
            hour: targetHour,
            minute: targetMin,
          },
          allowWhileIdle: true,
        },
        sound: 'class_bell', // Plays the custom chime
        channelId: 'class_alerts_v3', // Enforces sound/banner on Android
        extra: null,
      });
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
      console.log(`Successfully scheduled ${notificationsToSchedule.length} weekly class reminders.`);
    } else {
      console.log('No classes found to schedule reminders.');
    }
  } catch (error) {
    console.error('Failed to schedule timetable local notifications', error);
  }
};
