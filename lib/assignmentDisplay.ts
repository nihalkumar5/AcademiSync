// How an assignment looks, decided in one place so the card and the detail sheet agree.
//
// Colour rules
//   • Subject  = identity. The subject's colour (same as its timetable and subject cards) marks the card.
//   • Time     = the only alarm colour. Red when overdue, amber when due today/tomorrow, otherwise neutral.
//   • Done     = green tick and a quieter card. Nothing else turns green.
//   • Priority = shown only when it is High, as a small flag. Medium/Low don't need shouting.
import { Homework, Subject } from '@/lib/types';
import { getSubjectCardTheme } from '@/lib/cardColors';

export type DueTone = 'overdue' | 'soon' | 'normal' | 'done';

export interface DueInfo {
  tone: DueTone;
  /** "Due tomorrow, 11:59 PM", "Overdue by 2 days", "Due Fri 13 Nov" */
  label: string;
  /** "Tomorrow", "2d late", "13 Nov" */
  short: string;
  /** "Friday, 13 November 2026 · 11:59 PM" */
  full: string;
  /** "in 3 days", "today", "2 days ago" */
  relative: string;
  date: Date | null;
}

const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
const dayDiff = (d: Date, now = new Date()) => {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / 86400000);
};

export function dueInfo(hw: Pick<Homework, 'deadline' | 'status' | 'completedAt'>, now = new Date()): DueInfo {
  const d = new Date(hw.deadline);
  if (isNaN(d.getTime())) return { tone: 'normal', label: 'No due date', short: 'No date', full: 'No due date', relative: '', date: null };
  const full = `${d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${time(d)}`;
  const diff = dayDiff(d, now);
  const dateShort = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
  const relative = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday' : diff > 0 ? `in ${diff} days` : `${-diff} days ago`;

  if (hw.status === 'Completed') {
    const c = hw.completedAt ? new Date(hw.completedAt) : null;
    const when = c && !isNaN(c.getTime()) ? c.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : dateShort;
    return { tone: 'done', label: `Done · ${when}`, short: 'Done', full, relative, date: d };
  }
  const late = d.getTime() < now.getTime();
  if (late) {
    const days = Math.max(0, -diff);
    const label = days === 0 ? `Overdue since ${time(d)}` : `Overdue by ${days} day${days === 1 ? '' : 's'}`;
    return { tone: 'overdue', label, short: days === 0 ? 'Late' : `${days}d late`, full, relative, date: d };
  }
  if (diff === 0) return { tone: 'soon', label: `Due today, ${time(d)}`, short: 'Today', full, relative, date: d };
  if (diff === 1) return { tone: 'soon', label: `Due tomorrow, ${time(d)}`, short: 'Tomorrow', full, relative, date: d };
  if (diff <= 6) return { tone: 'normal', label: `Due ${weekday}, ${time(d)}`, short: weekday, full, relative, date: d };
  return { tone: 'normal', label: `Due ${weekday} ${dateShort}`, short: dateShort, full, relative, date: d };
}

/** Tailwind classes per due tone (light + dark). */
export const DUE_TONE: Record<DueTone, string> = {
  overdue: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-400/25',
  soon: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25',
  normal: 'bg-surface-2 text-fg border-line-soft',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25',
};

/** The subject's own colours, exactly as the timetable and subject cards use them. */
export function subjectTone(subject: Subject | undefined, fallbackName?: string) {
  const t = getSubjectCardTheme({
    subjectName: subject?.name || fallbackName,
    subjectCode: subject?.code,
    subjectColor: subject?.color,
    isLab: subject?.isLab,
  });
  return { accent: t.accent, darkAccent: t.darkAccent || t.accent, tint: t.bg, badgeBg: t.badgeBg, badgeText: t.badgeText };
}

/** Short subject label for chips: code when it is meaningful, otherwise the name. */
export const subjectLabel = (subject: Subject | undefined, fallbackName?: string) => {
  const code = (subject?.code || '').trim();
  const name = subject?.name || fallbackName || 'General';
  return { code: code && code.toUpperCase() !== 'UNK' ? code : '', name };
};
