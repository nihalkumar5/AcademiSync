import { formatTime12Hour, timeToMinutes } from './timetableUtils';

// The evening heads-up for the next day (replaces the old "pack your bag" reminder): how many
// classes, when and where the first one is, and any labs. Built from the timetable, nothing to fill in.
export interface PlanClass {
  name: string;
  startTime: string;
  room?: string;
  isLab?: boolean;
}

export function tomorrowPlanMessage(classes: PlanClass[]): { title: string; body: string } | null {
  const list = classes
    .filter((c) => c && c.startTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  if (list.length === 0) return null;
  const first = list[0];
  const n = list.length;
  const labs = Array.from(new Set(list.filter((c) => c.isLab).map((c) => c.name)));
  const title = `📅 Tomorrow: ${n} ${n === 1 ? 'class' : 'classes'} from ${formatTime12Hour(first.startTime)}`;
  const parts = [`First up: ${first.name}${first.room ? ` in ${first.room}` : ''}.`];
  if (labs.length) parts.push(`${labs.length === 1 ? 'Lab' : 'Labs'}: ${labs.join(', ')}.`);
  return { title, body: parts.join(' ') };
}
