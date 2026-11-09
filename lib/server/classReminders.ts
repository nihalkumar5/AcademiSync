import { adminDb } from '@/lib/firebase-admin';
import { formatTime12Hour, isGenericExamTitle } from '@/lib/timetableUtils';
import { sendPush, tokensFromUserDoc } from './push';

// Server-side class reminders for web / iPhone PWA users. The native app schedules these on the phone
// (lib/localNotifications.ts); a PWA can't, so a cron calls this every few minutes and we push instead.
// Same rules as the app: reminder N minutes before (settings.classReminderMinutes, default 10),
// skip holidays and real exam days, skip cancelled classes, use rescheduled times, include extra classes.
// Also sends the holiday alerts (evening before + morning of), like the app does on Android.
// Times are India time (IST), which is where the app's colleges are.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Send a reminder if it falls inside this window around "now" (cron runs every 5 minutes). */
const WINDOW_BEFORE_MS = 5 * 60 * 1000;
const WINDOW_AFTER_MS = 30 * 1000;

const keysOf = (v: any): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string') : v && typeof v === 'object' ? Object.keys(v).filter((k) => v[k] !== false) : [];

/** "09:30" or "9:30 AM" → minutes after midnight, or null. */
function minutesOf(time?: string): number | null {
  if (!time) return null;
  const [hm, mod] = time.trim().split(' ');
  const [hS, mS] = hm.split(':');
  let h = parseInt(hS, 10);
  const m = parseInt(mS || '0', 10);
  if (isNaN(h) || isNaN(m)) return null;
  if (mod) {
    const M = mod.toUpperCase();
    if (M === 'PM' && h < 12) h += 12;
    if (M === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
}

/** UTC epoch ms for an IST wall-clock date + minutes. */
const istToUtc = (dateStr: string, minutes: number) => Date.parse(`${dateStr}T00:00:00Z`) + minutes * 60000 - IST_OFFSET_MS;

type Reminder = { key: string; title: string; body: string; type?: string };

function remindersFor(userData: any, batchData: any, nowMs: number): Reminder[] {
  const settings = userData.settings || {};
  if (settings.notificationsEnabled === false) return [];
  const lead = Number(settings.classReminderMinutes ?? 10) || 10;

  const timetable: any[] = Array.isArray(userData.timetable) && userData.timetable.length ? userData.timetable : batchData?.timetable || [];
  const subjects: any[] = [...(userData.subjects || []), ...(batchData?.subjects || [])];
  const subjectById = new Map(subjects.filter((s) => s?.id).map((s) => [s.id, s]));

  const cancelled = new Set([...keysOf(userData.cancelledSessions), ...keysOf(batchData?.cancelledSessions)]);
  const rescheduled: Record<string, any> = { ...(batchData?.rescheduledSessions || {}), ...(userData.rescheduledSessions || {}) };
  const extras: any[] = [...Object.values(batchData?.extraSessions || {}), ...Object.values(userData.extraSessions || {})];

  const skipDates = new Set<string>();
  // Holidays by date (user's calendar + their batch's calendar), for skipping classes and for holiday alerts
  const holidays = new Map<string, any>();
  for (const ev of [...(userData.events || []), ...(batchData?.events || [])]) {
    if (!ev?.date) continue;
    const d = String(ev.date).slice(0, 10);
    if (ev.type === 'holiday') {
      skipDates.add(d);
      if (!holidays.has(d)) holidays.set(d, ev);
    } else if (ev.type === 'exam' && !isGenericExamTitle(ev.title)) {
      skipDates.add(d);
    }
  }
  for (const ex of userData.exams || []) {
    if (ex?.date && !isGenericExamTitle(ex.subjectName)) skipDates.add(String(ex.date).slice(0, 10));
  }

  // The class start we're looking for is roughly now + lead minutes (today or just after midnight)
  const out: Reminder[] = [];
  const inWindow = (remindAt: number) => remindAt > nowMs - WINDOW_BEFORE_MS && remindAt <= nowMs + WINDOW_AFTER_MS;
  const istNow = new Date(nowMs + IST_OFFSET_MS);
  const dates = [0, 1].map((d) => {
    const x = new Date(istNow.getTime() + d * 86400000);
    return { dateStr: x.toISOString().slice(0, 10), day: DAYS[x.getUTCDay()] };
  });

  for (const { dateStr, day } of dates) {
    if (skipDates.has(dateStr)) continue;
    for (const s of timetable) {
      if (!s?.id || s.day !== day) continue;
      if (cancelled.has(`${dateStr}_${s.id}`)) continue;
      const r = rescheduled[`${dateStr}_${s.id}`];
      const startStr = r?.startTime || s.startTime;
      const start = minutesOf(startStr);
      if (start === null) continue;
      const remindAt = istToUtc(dateStr, start - lead);
      if (!inWindow(remindAt)) continue;
      const sub = subjectById.get(s.subjectId);
      const name = sub?.name || s.subjectName || 'Class';
      out.push({
        key: `${dateStr}_${s.id}`,
        title: `⏰ Class in ${lead} mins: ${name}${r ? ' (Rescheduled)' : ''}`,
        body: `${s.isLab || sub?.isLab ? 'Lab' : 'Lecture'} at ${r?.room || s.room || 'Classroom'} starts at ${formatTime12Hour(startStr)}`,
      });
    }
  }
  // Holiday alerts, same as the app: the evening before (at bag time) and 7:30 AM on the day
  const bagMins = minutesOf(settings.eveningCarryReminderTime || '20:00') ?? 20 * 60;
  for (const { dateStr } of dates) {
    const hol = holidays.get(dateStr);
    if (!hol) continue;
    if (inWindow(istToUtc(dateStr, 7 * 60 + 30))) {
      out.push({
        key: `holiday_${dateStr}`,
        type: 'holiday_alert',
        title: `🌴 Campus Holiday: ${hol.title || 'Holiday'}`,
        body: hol.description || 'Today is an official campus holiday. All classes and practicals are suspended!',
      });
    }
    if (inWindow(istToUtc(dateStr, bagMins - 24 * 60))) {
      out.push({
        key: `holiday_eve_${dateStr}`,
        type: 'holiday_alert',
        title: `🌴 Tomorrow is a Holiday: ${hol.title || 'Holiday'}`,
        body: 'All lectures and labs are suspended tomorrow. Enjoy your break!',
      });
    }
  }

  for (const e of extras) {
    if (!e?.date || !e?.startTime) continue;
    const start = minutesOf(e.startTime);
    if (start === null) continue;
    const remindAt = istToUtc(String(e.date).slice(0, 10), start - lead);
    if (!inWindow(remindAt)) continue;
    const sub = subjectById.get(e.subjectId);
    out.push({
      key: `extra_${e.id || e.subjectId}_${e.date}`,
      title: `➕ Extra Class in ${lead} mins: ${sub?.name || e.subjectName || 'Extra Class'}`,
      body: `Scheduled at ${e.room || 'Classroom'} from ${formatTime12Hour(e.startTime)}`,
    });
  }
  return out;
}

export async function sendDueClassReminders(nowMs = Date.now()) {
  // Only web/PWA devices need this; the native app reminds itself
  const snap = await adminDb.collection('users').where('webPushUpdatedAt', '>=', '').get();
  const batchCache = new Map<string, any>();
  let users = 0;
  let reminders = 0;
  let sent = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const web = tokensFromUserDoc(docSnap.id, data).filter((t) => t.web);
    if (web.length === 0) continue;
    users++;

    const batchKey = data.profile?.isBatchSynced ? data.profile?.batchKey : null;
    let batchData: any = null;
    if (typeof batchKey === 'string' && batchKey && !batchKey.includes('/')) {
      if (!batchCache.has(batchKey)) {
        const b = await adminDb.collection('shared_timetables').doc(batchKey).get();
        batchCache.set(batchKey, b.exists ? b.data() : null);
      }
      batchData = batchCache.get(batchKey);
    }

    for (const r of remindersFor(data, batchData, nowMs)) {
      // create() fails if it already exists, so each reminder goes out once even if cron runs overlap
      const logRef = adminDb.collection('push_reminder_log').doc(`${docSnap.id}_${r.key}`.replace(/\//g, '-'));
      try {
        await logRef.create({ uid: docSnap.id, key: r.key, sentAt: nowMs });
      } catch {
        continue;
      }
      reminders++;
      const res = await sendPush(web, { title: r.title, body: r.body, data: { type: r.type || 'class_reminder' }, link: '/' });
      sent += res.sent;
    }
  }
  return { users, reminders, sent };
}
