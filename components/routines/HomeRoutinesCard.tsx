'use client';

import { HandwrittenText } from '@/components/ui/HandwrittenText';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Plus, LayoutTemplate } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { Icon3D, iconForRoutine } from './Icon3D';
import { routinesForDay, isDoneOn, dateKey, getRoutineCategory, formatRoutineTime, nextOccurrence, routineTemplatesFor, RoutineTemplate } from '@/lib/routines';
import type { Routine } from '@/lib/types';

// Home → Routines as a focus card: one routine at a time, the one that matters right now.
// The full list lives on the Routines page. Ticking one off brings in the next.
// Hierarchy: the routine (what) → when → one action (done) → a quiet line for what follows.

const DEFAULT_MIN = 30; // window for a routine without a duration

const inLabel = (ms: number) => {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'Starting now';
  if (m < 60) return `In ${m} min`;
  const h = Math.floor(m / 60);
  return `In ${h}h${m % 60 ? ` ${m % 60}m` : ''}`;
};

const startOf = (r: Pick<Routine, 'time'>, now: Date) => {
  const [h, m] = r.time.split(':').map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return t;
};

/** The one routine to show: running now, else the next one, else the latest one you missed. */
const pickFocus = (today: Routine[], now: Date) => {
  const pending = today.filter((r) => !isDoneOn(r, now));
  const live = pending.find((r) => {
    const s = startOf(r, now).getTime();
    return s <= now.getTime() && now.getTime() < s + (r.durationMinutes || DEFAULT_MIN) * 60000;
  });
  if (live) return { r: live, state: 'now' as const };
  const next = pending.find((r) => startOf(r, now) > now);
  if (next) return { r: next, state: 'next' as const };
  const missed = pending[pending.length - 1];
  if (missed) return { r: missed, state: 'missed' as const };
  return null;
};

/** First run: the one starter that fits this time of day best (the next one to come up). */
const pickStarter = (list: RoutineTemplate[], now: Date) => {
  const t = now.getHours() * 60 + now.getMinutes();
  const mins = (x: RoutineTemplate) => {
    const [h, m] = x.time.split(':').map(Number);
    return (h * 60 + m - t + 1440) % 1440;
  };
  return [...list].sort((a, b) => mins(a) - mins(b))[0];
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
  const focus = pickFocus(today, now);
  // What follows the focus routine, as one quiet line
  const then = focus ? today.find((r) => !isDoneOn(r, now) && r.id !== focus.r.id && startOf(r, now) > startOf(focus.r, now)) : undefined;

  // Nothing left today (none planned, or all done): say when the next one is
  const upcoming = routines
    .filter((r) => r.isActive)
    .map((r) => {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return { r, at: nextOccurrence(r, today.length === 0 ? now : tomorrow) };
    })
    .filter((x): x is { r: Routine; at: Date } => !!x.at)
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  const open = (event?: string, detail?: unknown) => {
    setActiveView('routines');
    if (event) setTimeout(() => window.dispatchEvent(new CustomEvent(event, { detail })), 60);
  };

  const isFaculty = profile?.role === 'faculty';
  const starter = pickStarter(routineTemplatesFor(isFaculty), now);

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

      <div className="sheen border border-line bg-surface overflow-hidden">
        {routines.length === 0 ? (
          /* First run: one starting point that fits this time of day */
          <div className="p-f4">
            <p className="text-[15px] font-semibold text-fg">Build a daily rhythm</p>
            <p className="mt-f1 text-[13px] text-muted">Set it once and get reminded every time.</p>
            {starter && (() => {
              const c = getRoutineCategory(starter.category);
              return (
                <button
                  type="button"
                  onClick={() => open('routines:new', { ...starter, isActive: true })}
                  className="mt-f4 w-full flex items-center gap-f3 p-f3 border border-line-soft text-left hover:border-line-strong transition-colors cursor-pointer"
                >
                  <span className="w-f6 h-f6 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
                    <Icon3D name={iconForRoutine(starter.title, starter.category)} size={30} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-fg truncate">{starter.title}</span>
                    <span className="block text-[13px] text-muted tabular-nums">{formatRoutineTime(starter.time)}{starter.durationMinutes ? ` · ${starter.durationMinutes} min` : ''}</span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 h-9 px-f3 bg-ink text-on-ink text-[13px] font-semibold">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </span>
                </button>
              );
            })()}
            <button type="button" onClick={() => open('routines:templates')} className="mt-f2 inline-flex items-center gap-f2 h-10 text-[13px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer">
              <LayoutTemplate className="w-4 h-4" /> More templates
            </button>
          </div>
        ) : !focus ? (
          /* Nothing planned today, or everything done */
          <div className="flex items-center gap-f3 p-f4">
            <div className="flex-1 min-w-0">
              {allDone ? (
                <p className="-rotate-2 origin-left">
                  <HandwrittenText
                    text="All done ✌"
                    playKey={`home-routines-done-${now.toDateString()}`}
                    className="text-[25px] leading-none font-semibold text-emerald-700 dark:text-emerald-400"
                  />
                </p>
              ) : (
                <p className="text-[15px] font-semibold text-fg">Nothing planned today</p>
              )}
              <p className="mt-f2 text-[13px] text-muted truncate">
                {upcoming
                  ? `Next: ${upcoming.r.title} · ${upcoming.at.toLocaleDateString('en-US', { weekday: 'short' })} ${formatRoutineTime(upcoming.r.time)}`
                  : 'Your routines are paused.'}
              </p>
            </div>
            {!allDone && (
              <button type="button" onClick={() => open('routines:new')} className="btn btn-secondary">
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
        ) : (
          <>
            {/* The one routine. Keyed by id so ticking it off slides the next one in. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={focus.r.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-f4"
              >
                {(() => {
                  const r = focus.r;
                  const c = getRoutineCategory(r.category);
                  const at = startOf(r, now);
                  const when =
                    focus.state === 'now' ? 'Now' : focus.state === 'next' ? inLabel(at.getTime() - now.getTime()) : 'Missed';
                  return (
                    <>
                      <p
                        className={`text-[12px] font-semibold leading-none ${
                          focus.state === 'now' ? 'text-emerald-700 dark:text-emerald-400' : focus.state === 'missed' ? 'text-amber-700 dark:text-amber-400' : 'text-muted'
                        }`}
                      >
                        {focus.state === 'now' && <span className="inline-block w-1.5 h-1.5 mr-1.5 mb-px rounded-full bg-emerald-500 align-middle animate-pulse" />}
                        {when}
                      </p>
                      <div className="mt-f3 flex items-center gap-f3">
                        <span className="w-f6 h-f6 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
                          <Icon3D name={iconForRoutine(r.title, r.category)} size={30} />
                        </span>
                        <button type="button" onClick={() => open()} className="flex-1 min-w-0 text-left cursor-pointer">
                          <span className="block text-[19px] leading-[24px] font-semibold text-fg tracking-tight truncate">{r.title}</span>
                          <span className="block mt-f1 text-[13px] text-muted tabular-nums truncate">
                            {formatRoutineTime(r.time)}
                            {r.durationMinutes ? ` · ${r.durationMinutes} min` : ''} · {c.label}
                          </span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRoutineDone(r.id, dateKey(now))}
                        aria-label={`Mark ${r.title} done`}
                        className="mt-f4 w-full h-11 inline-flex items-center justify-center gap-f2 bg-ink text-on-ink text-[14px] font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                      >
                        <Check className="w-4 h-4" strokeWidth={3} /> Mark done
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>

            {/* Context, not a list: progress through today and what comes after */}
            <div className="px-f4 py-f3 border-t border-line-soft flex items-center gap-f3">
              <div className="flex-1 min-w-0 flex gap-[3px]" aria-hidden="true">
                {today.map((r) => (
                  <span key={r.id} className={`h-1 flex-1 rounded-full ${isDoneOn(r, now) ? 'bg-emerald-500' : 'bg-black/[0.08] dark:bg-white/[0.1]'}`} />
                ))}
              </div>
              <span className="shrink-0 text-[12px] text-muted tabular-nums">
                {done}/{today.length} done
              </span>
            </div>
            {then && (
              <button type="button" onClick={() => open()} className="w-full px-f4 pb-f3 -mt-f1 flex items-center gap-1 text-left text-[13px] text-muted cursor-pointer">
                <span className="truncate">
                  Then <span className="font-medium text-fg-2">{then.title}</span> at {formatRoutineTime(then.time)}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
};
