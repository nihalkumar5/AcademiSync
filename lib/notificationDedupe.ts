import { AppNotification } from './types';

// Older versions saved the same alert twice on one day (e.g. "Campus Holiday: X" and "Today is a Holiday: X",
// or the same "Exam Today" from the calendar and the datesheet). Keep the first of each per day.
export function dedupeNotifications<T extends Pick<AppNotification, 'title' | 'timestamp'>>(list: T[]): T[] {
  const seen = new Set<string>();
  return (list || []).filter((n) => {
    const day = (n.timestamp || '').slice(0, 10);
    const key = `${day}|${(n.title || '')
      .replace(/today is a holiday:/i, 'campus holiday:')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
