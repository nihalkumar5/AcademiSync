'use client';

import { HandwrittenText } from '@/components/ui/HandwrittenText';
import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, Plus, LayoutTemplate } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { Icon3D, iconForRoutine } from './Icon3D';
import { routinesForDay, isDoneOn, dateKey, getRoutineCategory, formatRoutineTime, nextOccurrence, routineTemplatesFor, RoutineTemplate } from '@/lib/routines';

// Home → today's routines at a glance. One job: let you tick off what's due without leaving Home.
// Hierarchy: progress (how far through the day) → what's next → the list → one way to add more.
const MAX_ROWS = 4;

const inLabel = (ms: number) => {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  return `in ${h}h${m % 60 ? ` ${m % 60}m` : ''}`;
};

export const HomeRoutinesCard: React.FC = () => {
  const { routines, toggleRoutineDone, setActiveView, profile } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const today = routinesForDay(routines, now);
  const done = today.filter((r) => isDoneOn(r, now)).length;
  const allDone = today.length > 0 && done === today.length;
  const nextUp = today.find((r) => {
    const [h, m] = r.time.split(':').map(Number);
    const t = new Date(now);
    t.setHours(h, m, 0, 0);
    return t > now && !isDoneOn(r, now);
  });
  const nextAt = nextUp ? (() => { const [h, m] = nextUp.time.split(':').map(Number); const t = new Date(now); t.setHours(h, m, 0, 0); return t; })() : null;

  // Nothing today: say when the next one is
  const upcoming = today.length === 0
    ? routines
        .filter((r) => r.isActive)
        .map((r) => ({ r, at: nextOccurrence(r, now) }))
        .filter((x): x is { r: typeof x.r; at: Date } => !!x.at)
        .sort((a, b) => a.at.getTime() - b.at.getTime())[0]
    : undefined;

  const open = (event?: string, detail?: unknown) => {
    setActiveView('routines');
    if (event) setTimeout(() => window.dispatchEvent(new CustomEvent(event, { detail })), 60);
  };

  const starters = routineTemplatesFor(profile?.role === 'faculty').slice(0, 3);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-f3">
        <h3 className="text-[17px] font-semibold text-fg">Routines</h3>
        {routines.length > 0 && (
          <button type="button" onClick={() => open()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="sheen border border-line bg-surface">
        {routines.length === 0 ? (
          /* First run: three one-tap starting points */
          <div className="p-f4">
            <p className="text-[15px] font-semibold text-fg">Build a daily rhythm</p>
            <p className="mt-0.5 text-[13px] text-muted">Study, sports, sleep — set it once and get reminded every time.</p>
            <div className="mt-f3 flex flex-col gap-f2">
              {starters.map((t: RoutineTemplate) => {
                const c = getRoutineCategory(t.category);
                return (
                  <button key={t.title} type="button" onClick={() => open('routines:new', { ...t, isActive: true })} className="flex items-center gap-f3 px-f3 py-f2 border border-line-soft text-left hover:border-line-strong transition-colors cursor-pointer">
                    <span className="w-f5 h-f5 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
                      <Icon3D name={iconForRoutine(t.title, t.category)} size={22} />
                    </span>
                    <span className="flex-1 min-w-0 text-[14px] font-medium text-fg truncate">{t.title}</span>
                    <span className="text-[12px] text-muted tabular-nums">{formatRoutineTime(t.time)}</span>
                    <Plus className="w-4 h-4 text-[#8A8A8A]" />
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => open('routines:templates')} className="mt-f3 inline-flex items-center gap-f2 h-10 text-[13px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer">
              <LayoutTemplate className="w-4 h-4" /> More templates
            </button>
          </div>
        ) : today.length === 0 ? (
          <div className="flex items-center gap-f3 p-f4">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-fg">Nothing planned today</p>
              <p className="mt-0.5 text-[13px] text-muted truncate">
                {upcoming
                  ? `Next: ${upcoming.r.title} · ${upcoming.at.toLocaleDateString('en-US', { weekday: 'short' })} ${formatRoutineTime(upcoming.r.time)}`
                  : 'Your routines are paused.'}
              </p>
            </div>
            <button type="button" onClick={() => open('routines:new')} className="btn btn-secondary">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        ) : (
          <>
            {/* Progress: one segment per routine, so "2 of 4" reads at a glance */}
            <div className="px-f4 pt-f4 pb-f3">
              <div className="flex items-end justify-between gap-f3">
                <p className="leading-none">
                  <span className="text-[34px] font-semibold tabular-nums text-fg">{done}</span>
                  <span className="text-[17px] font-medium tabular-nums text-faint">/{today.length} done</span>
                </p>
                {allDone ? (
                  <p className="-rotate-2">
                    <HandwrittenText
                      text="All done ✌"
                      playKey={`home-routines-done-${new Date().toDateString()}`}
                      className="text-[25px] leading-none font-semibold text-emerald-700 dark:text-emerald-400"
                    />
                  </p>
                ) : nextUp && nextAt ? (
                  <p className="text-[13px] text-muted text-right">
                    Next <span className="font-semibold text-fg">{inLabel(nextAt.getTime() - now.getTime())}</span>
                  </p>
                ) : null}
              </div>
              <div className="mt-f3 flex gap-[3px]">
                {today.map((r) => (
                  <span key={r.id} className={`h-1.5 flex-1 ${isDoneOn(r, now) ? 'bg-emerald-500' : 'bg-black/[0.08] dark:bg-white/[0.1]'}`} />
                ))}
              </div>
            </div>

            <ul className="border-t border-line-soft divide-y divide-line-soft">
              {today.slice(0, MAX_ROWS).map((r) => {
                const c = getRoutineCategory(r.category);
                const isDone = isDoneOn(r, now);
                const isNext = nextUp?.id === r.id;
                return (
                  <li key={r.id} className="flex items-center gap-f3 px-f4 py-f3">
                    <button
                      type="button"
                      onClick={() => toggleRoutineDone(r.id, dateKey(now))}
                      aria-pressed={isDone}
                      aria-label={isDone ? `Mark ${r.title} not done` : `Mark ${r.title} done`}
                      className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#BDBDBD] dark:border-white/30 hover:border-emerald-500'}`}
                    >
                      {isDone && <Check className="w-4 h-4" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => open()} className="flex-1 min-w-0 text-left cursor-pointer">
                      <span className={`block text-[15px] font-medium truncate ${isDone ? 'line-through text-[#8A8A8A]' : 'text-fg'}`}>{r.title}</span>
                      <span className="block text-[13px] text-muted truncate">
                        {c.emoji} {c.label}
                        {r.durationMinutes ? ` · ${r.durationMinutes} min` : ''}
                      </span>
                    </button>
                    <span className="shrink-0 text-right">
                      <span className={`block text-[14px] font-semibold tabular-nums ${isDone ? 'text-[#8A8A8A]' : 'text-fg'}`}>{formatRoutineTime(r.time)}</span>
                      {isNext && <span className="block text-[12px] font-semibold text-fg">Next</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {today.length > MAX_ROWS && (
              <button type="button" onClick={() => open()} className="w-full h-11 border-t border-line-soft text-[14px] font-semibold text-fg hover:bg-surface-2 cursor-pointer">
                +{today.length - MAX_ROWS} more today
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
};
