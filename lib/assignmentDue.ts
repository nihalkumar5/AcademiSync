// One meaning for assignment colours everywhere:
//   subject colour = which subject (stripe / dot only)
//   due colour     = how urgent (red overdue, amber today/tomorrow, neutral later, green done)
import type { CSSProperties } from 'react';
import type { CardTheme } from '@/lib/cardColors';

export type DueTone = 'done' | 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later';

const time12 = (d: Date) =>
  d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?am$/i, ' AM')
    .replace(/\s?pm$/i, ' PM');

export function dueInfo(deadline: string, done: boolean, now: Date = new Date()) {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { tone: 'later' as DueTone, label: 'No due date', date: '', time: '', days: 0, relative: '' };
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / 86400000);
  const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
  const time = time12(d);
  const relative =
    days === 0 ? 'today' : days === 1 ? 'tomorrow' : days === -1 ? 'yesterday' : days > 0 ? `in ${days} days` : `${-days} days ago`;
  if (done) return { tone: 'done' as DueTone, label: 'Completed', date, time, days, relative };
  if (d.getTime() < now.getTime()) {
    const late = Math.max(0, -days);
    return { tone: 'overdue' as DueTone, label: late === 0 ? `Overdue · was due ${time}` : `Overdue · ${late} day${late === 1 ? '' : 's'}`, date, time, days, relative };
  }
  if (days === 0) return { tone: 'today' as DueTone, label: `Due today, ${time}`, date, time, days, relative };
  if (days === 1) return { tone: 'tomorrow' as DueTone, label: `Tomorrow, ${time}`, date, time, days, relative };
  if (days <= 6) return { tone: 'soon' as DueTone, label: `${weekday}, ${time} · in ${days} days`, date, time, days, relative };
  return { tone: 'later' as DueTone, label: `${date}, ${time}`, date, time, days, relative };
}

export const DUE_CHIP: Record<DueTone, string> = {
  overdue: 'bg-danger-soft text-danger border-danger/25',
  today: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30',
  tomorrow: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
  soon: 'bg-surface-2 text-fg border-line',
  later: 'bg-surface text-muted border-line-soft',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
};

/** CSS variables so one subject colour works in light and dark: bg-[var(--s)] dark:bg-[var(--sd)] */
export const subjectVars = (t: CardTheme): CSSProperties =>
  ({
    ['--s' as any]: t.accent,
    ['--sd' as any]: t.darkAccent || t.accent,
    ['--sbg' as any]: t.bg,
    ['--sbgd' as any]: t.darkBg,
  }) as CSSProperties;
