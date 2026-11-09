import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Routine, RoutineCategory } from './types';

// ---------- Categories ----------
export const ROUTINE_CATEGORIES: { id: RoutineCategory; label: string; emoji: string; color: string }[] = [
  { id: 'study', label: 'Study', emoji: '📚', color: '#6366F1' },
  { id: 'exam', label: 'Exam prep', emoji: '📝', color: '#E11D48' },
  { id: 'sports', label: 'Sports', emoji: '🏃', color: '#16A34A' },
  { id: 'health', label: 'Health', emoji: '💧', color: '#0EA5E9' },
  { id: 'reminder', label: 'Reminder', emoji: '🔔', color: '#F59E0B' },
  { id: 'other', label: 'Other', emoji: '✨', color: '#8B5CF6' },
];
export const getRoutineCategory = (id?: string) => ROUTINE_CATEGORIES.find((c) => c.id === id) || ROUTINE_CATEGORIES[5];

// Ready-made starting points so a routine takes two taps, not a form.
// The first six are the spread shown on an empty screen; the rest live in the Templates picker.
export type RoutineTemplate = Omit<Routine, 'id' | 'createdAt' | 'completions' | 'isActive'>;

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  { title: 'Study session', category: 'study', time: '18:00', durationMinutes: 60, repeat: 'daily', remindBefore: 10 },
  { title: 'Revise for exams', category: 'exam', time: '21:00', durationMinutes: 45, repeat: 'daily', remindBefore: 5 },
  { title: 'Gym / workout', category: 'sports', time: '06:30', durationMinutes: 60, repeat: 'custom', days: [1, 3, 5], remindBefore: 15 },
  { title: 'Morning run', category: 'sports', time: '06:00', durationMinutes: 30, repeat: 'daily', remindBefore: 10 },
  { title: 'Drink water', category: 'health', time: '11:00', repeat: 'daily', remindBefore: 0 },
  { title: 'Sleep on time', category: 'health', time: '23:00', repeat: 'daily', remindBefore: 15 },
  // Study
  { title: 'Read 20 pages', category: 'study', time: '22:00', durationMinutes: 30, repeat: 'daily', remindBefore: 5 },
  { title: 'Weekly revision', category: 'study', time: '10:00', durationMinutes: 90, repeat: 'custom', days: [0], remindBefore: 15 },
  { title: 'Practice coding', category: 'study', time: '20:00', durationMinutes: 60, repeat: 'weekdays', remindBefore: 10 },
  // Exam prep
  { title: 'Solve previous papers', category: 'exam', time: '19:00', durationMinutes: 60, repeat: 'custom', days: [2, 4, 6], remindBefore: 10 },
  { title: 'Mock test', category: 'exam', time: '10:00', durationMinutes: 120, repeat: 'custom', days: [6], remindBefore: 30 },
  // Sports
  { title: 'Evening game', category: 'sports', time: '17:30', durationMinutes: 60, repeat: 'weekdays', remindBefore: 15 },
  { title: 'Yoga / stretching', category: 'sports', time: '07:00', durationMinutes: 20, repeat: 'daily', remindBefore: 5 },
  // Health
  { title: 'Meditate', category: 'health', time: '07:30', durationMinutes: 10, repeat: 'daily', remindBefore: 0 },
  { title: 'Screen-free hour', category: 'health', time: '22:00', durationMinutes: 60, repeat: 'daily', remindBefore: 5 },
  // Reminders
  { title: 'Pack bag for tomorrow', category: 'reminder', time: '21:30', repeat: 'custom', days: [0, 1, 2, 3, 4], remindBefore: 0 },
  { title: 'Check assignments', category: 'reminder', time: '20:00', repeat: 'daily', remindBefore: 0 },
  { title: 'Call home', category: 'reminder', time: '19:00', repeat: 'custom', days: [0], remindBefore: 0 },
];

export const FACULTY_ROUTINE_TEMPLATES: RoutineTemplate[] = [
  { title: "Prepare tomorrow's lecture", category: 'study', time: '20:00', durationMinutes: 45, repeat: 'custom', days: [0, 1, 2, 3, 4], remindBefore: 10 },
  { title: 'Grade assignments', category: 'reminder', time: '16:00', durationMinutes: 60, repeat: 'custom', days: [2, 4], remindBefore: 10 },
  { title: 'Office hours', category: 'reminder', time: '15:00', durationMinutes: 60, repeat: 'custom', days: [1, 3], remindBefore: 10 },
  { title: 'Research & reading', category: 'study', time: '07:00', durationMinutes: 45, repeat: 'daily', remindBefore: 5 },
  { title: 'Morning walk', category: 'sports', time: '06:30', durationMinutes: 30, repeat: 'daily', remindBefore: 10 },
  { title: 'Drink water', category: 'health', time: '11:00', repeat: 'daily', remindBefore: 0 },
  { title: 'Set question paper', category: 'exam', time: '18:00', durationMinutes: 90, repeat: 'custom', days: [6], remindBefore: 15 },
  { title: 'Reply to student mails', category: 'reminder', time: '17:00', durationMinutes: 30, repeat: 'weekdays', remindBefore: 0 },
  { title: 'Plan next week', category: 'other', time: '18:00', durationMinutes: 30, repeat: 'custom', days: [0], remindBefore: 10 },
  { title: 'Sleep on time', category: 'health', time: '23:00', repeat: 'daily', remindBefore: 15 },
];

export const routineTemplatesFor = (isFaculty: boolean) => (isFaculty ? FACULTY_ROUTINE_TEMPLATES : ROUTINE_TEMPLATES);

// ---------- Dates ----------
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const atTime = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const x = new Date(day);
  x.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
  return x;
};

/** Does this routine happen on the given calendar day? */
export const occursOn = (r: Routine, day: Date) => {
  const created = new Date(r.createdAt);
  created.setHours(0, 0, 0, 0);
  const d0 = new Date(day);
  d0.setHours(0, 0, 0, 0);
  if (r.repeat === 'once') return r.date === dateKey(day);
  if (d0 < created) return false;
  const wd = day.getDay();
  if (r.repeat === 'daily') return true;
  if (r.repeat === 'weekdays') return wd >= 1 && wd <= 5;
  return Array.isArray(r.days) && r.days.includes(wd);
};

export const routinesForDay = (routines: Routine[], day: Date) =>
  routines.filter((r) => r.isActive && occursOn(r, day)).sort((a, b) => a.time.localeCompare(b.time));

export const isDoneOn = (r: Routine, day: Date) => r.completions.includes(dateKey(day));

/** Consecutive scheduled days completed, counting back from today (today counts only once done). */
export const routineStreak = (r: Routine, today = new Date()) => {
  if (r.repeat === 'once') return 0;
  let streak = 0;
  let cursor = new Date(today);
  if (!isDoneOn(r, cursor)) cursor = addDays(cursor, -1);
  for (let i = 0; i < 366; i++) {
    if (occursOn(r, cursor)) {
      if (isDoneOn(r, cursor)) streak++;
      else break;
    }
    cursor = addDays(cursor, -1);
    if (cursor < new Date(r.createdAt)) break;
  }
  return streak;
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const repeatLabel = (r: Routine) => {
  if (r.repeat === 'daily') return 'Every day';
  if (r.repeat === 'weekdays') return 'Weekdays';
  if (r.repeat === 'once') {
    if (!r.date) return 'Once';
    const d = new Date(`${r.date}T00:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  const days = [...(r.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (days.length === 7) return 'Every day';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map((d) => DAY_SHORT[d]).join(', ') || 'No days picked';
};

export const formatRoutineTime = (hhmm: string) => {
  const d = atTime(new Date(), hhmm);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/** Next start time from now (searches two weeks ahead). */
export const nextOccurrence = (r: Routine, now = new Date()): Date | null => {
  if (!r.isActive) return null;
  for (let i = 0; i < 15; i++) {
    const day = addDays(now, i);
    if (!occursOn(r, day)) continue;
    const start = atTime(day, r.time);
    if (start > now && !isDoneOn(r, day)) return start;
  }
  return null;
};

export const reminderTitle = (r: Routine) => `${getRoutineCategory(r.category).emoji} ${r.title}`;
export const reminderBody = (r: Routine) => {
  const when = r.remindBefore > 0 ? `Starts in ${r.remindBefore} min at ${formatRoutineTime(r.time)}` : `It's ${formatRoutineTime(r.time)}`;
  const length = r.durationMinutes ? ` · ${r.durationMinutes} min` : '';
  return `${when}${length}${r.notes ? ` — ${r.notes}` : ''}`;
};

// ---------- Native (Android) reminders ----------
// Routines own IDs 20000–29999 so the class scheduler never cancels them (and vice versa).
export const ROUTINE_NOTIF_ID_MIN = 20000;
export const ROUTINE_NOTIF_ID_MAX = 29999;
const DAYS_AHEAD = 14;
const MAX_ROUTINE_ALARMS = 200; // keep well under Android's ~500 pending-alarm cap

export const routineRelatedId = (r: Routine, day: Date) => `routine_${r.id}_${dateKey(day)}`;

export const scheduleRoutineNotifications = async (routines: Routine[]) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return; // the Routines screen asks for permission explicitly

    await LocalNotifications.createChannel({
      id: 'routines_v1',
      name: 'Routines & personal reminders',
      description: 'Your study, sports, exam prep and other personal reminders',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    }).catch(() => {});

    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ROUTINE_NOTIF_ID_MIN && n.id <= ROUTINE_NOTIF_ID_MAX);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

    const now = new Date();
    const items: any[] = [];
    let nextId = ROUTINE_NOTIF_ID_MIN;
    for (let d = 0; d < DAYS_AHEAD && items.length < MAX_ROUTINE_ALARMS; d++) {
      const day = addDays(now, d);
      for (const r of routinesForDay(routines, day)) {
        if (isDoneOn(r, day)) continue;
        const at = new Date(atTime(day, r.time).getTime() - r.remindBefore * 60000);
        if (at <= now) continue;
        items.push({
          id: nextId++,
          title: reminderTitle(r),
          body: reminderBody(r),
          schedule: { at, allowWhileIdle: true },
          channelId: 'routines_v1',
          extra: { relatedId: routineRelatedId(r, day), type: 'routine_reminder', routineId: r.id },
        });
        if (items.length >= MAX_ROUTINE_ALARMS || nextId > ROUTINE_NOTIF_ID_MAX) break;
      }
    }
    if (items.length) await LocalNotifications.schedule({ notifications: items });
  } catch (err) {
    console.warn('Could not schedule routine reminders:', err);
  }
};

// ---------- In-app (web, and the in-app list on Android) ----------
/** Reminders whose time arrived in the last `windowMin` minutes and haven't been delivered yet. */
export const dueRoutineReminders = (routines: Routine[], delivered: Set<string>, now = new Date(), windowMin = 3) => {
  const due: { routine: Routine; relatedId: string }[] = [];
  for (const r of routinesForDay(routines, now)) {
    if (isDoneOn(r, now)) continue;
    const at = atTime(now, r.time).getTime() - r.remindBefore * 60000;
    const diff = now.getTime() - at;
    const relatedId = routineRelatedId(r, now);
    if (diff >= 0 && diff <= windowMin * 60000 && !delivered.has(relatedId)) due.push({ routine: r, relatedId });
  }
  return due;
};
