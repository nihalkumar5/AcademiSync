'use client';

import { HandwrittenText } from '@/components/ui/HandwrittenText';
import { Illustration } from '@/components/ui/Illustration';
import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useApp } from '@/context/AppContext';
import { Routine } from '@/lib/types';
import {
  ROUTINE_CATEGORIES,
  routineTemplatesFor,
  RoutineTemplate,
  getRoutineCategory,
  routinesForDay,
  isDoneOn,
  dateKey,
  repeatLabel,
  formatRoutineTime,
  routineStreak,
  nextOccurrence,
  scheduleRoutineNotifications,
} from '@/lib/routines';
import { Icon3D, iconForRoutine } from './Icon3D';
import { RoutineSheet, RoutineDraft } from './RoutineSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Check, BellRing, BellOff, Flame, ChevronRight, Share2, Users, LayoutTemplate } from '@/components/ui/icons';
import { TemplatePicker } from './TemplatePicker';
import { ShareRoutineSheet, ShareTarget } from './ShareRoutineSheet';
import { useSharedRoutines, shareRoutineToBatch, unshareRoutine, markSharedRoutineAdded, sharedRoutineId } from '@/lib/sharedRoutines';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { broadcastBatchPushNotification } from '@/lib/pushNotifications';
import { SharedRoutine } from '@/lib/types';

type Permission = 'granted' | 'denied' | 'default' | 'unsupported' | 'checking';

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const inLabel = (ms: number) => {
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  return `in ${h}h${m % 60 ? ` ${m % 60}m` : ''}`;
};

export const RoutinesView: React.FC = () => {
  const { routines, addRoutine, updateRoutine, deleteRoutine, toggleRoutineDone, user, profile, isBatchCR, showToast, setActiveView } = useApp();
  const [shareFor, setShareFor] = useState<Routine | null>(null);

  // ---------- Sharing inside the batch ----------
  const isFaculty = profile.role === 'faculty';
  const shareTargets: ShareTarget[] = isFaculty
    ? (profile.facultyLinkedBatches || []).map((b) => ({ batchKey: b.batchKey, label: [formatFacultyBatchDegreeAndBranch(b).degreeAndBranch, formatFacultyBatchDegreeAndBranch(b).semText].filter(Boolean).join(' · ') }))
    : profile.isBatchSynced && profile.batchKey
    ? [{ batchKey: profile.batchKey, label: [[profile.programme, profile.branch].filter(Boolean).join(' '), profile.semester ? `Sem ${profile.semester}` : '', profile.section ? `Sec ${profile.section}` : ''].filter(Boolean).join(' · ') || 'Your batch' }]
    : [];
  const shareBlocked: 'signin' | 'nobatch' | null = !user ? 'signin' : shareTargets.length === 0 ? 'nobatch' : null;
  const { items: sharedItems } = useSharedRoutines(shareTargets.map((t) => t.batchKey), !!user);
  const sharerRole: SharedRoutine['sharedByRole'] = isFaculty ? 'faculty' : isBatchCR ? 'pilot' : 'student';
  const myName = isFaculty ? `${profile.facultyTitle || 'Prof.'} ${profile.name || ''}`.trim() : profile.name || 'Classmate';

  const sharedToFor = (r: Routine) =>
    new Set(sharedItems.filter((x) => x.sharedBy === user?.id && x.sourceRoutineId === r.id).map((x) => x.batchKey));

  const handleShare = async (r: Routine, batchKeys: string[]) => {
    if (!user) return;
    try {
      for (const bk of batchKeys) {
        await shareRoutineToBatch(r, bk, { uid: user.id, name: myName, role: sharerRole });
        // Faculty and pilots can notify the batch; classmates' shares just appear in the list
        if (sharerRole !== 'student') {
          broadcastBatchPushNotification({
            batchKey: bk,
            title: `📌 ${myName} shared a routine`,
            body: `${r.title} · ${repeatLabel(r)} at ${formatRoutineTime(r.time)}`,
            type: 'routine_share',
            senderId: user.id,
            senderName: myName,
          });
        }
      }
      showToast('Shared with your batch', r.title, 'success');
    } catch (err: any) {
      console.error('Share routine failed:', err);
      showToast("Couldn't share", err?.code === 'permission-denied' ? 'Only people in this batch can share here.' : 'Check your connection and try again.', 'error');
    }
  };

  const handleUnshare = async (r: Routine, batchKey: string) => {
    if (!user) return;
    try {
      await unshareRoutine(batchKey, sharedRoutineId(user.id, r.id));
      showToast('Stopped sharing', r.title, 'info');
    } catch (err) {
      console.error('Unshare failed:', err);
      showToast("Couldn't stop sharing", 'Try again.', 'error');
    }
  };

  const addFromShared = async (x: SharedRoutine) => {
    addRoutine({
      title: x.title,
      category: x.category,
      notes: x.notes,
      time: x.time,
      durationMinutes: x.durationMinutes,
      repeat: x.repeat,
      days: x.days,
      date: x.date,
      remindBefore: x.remindBefore,
      isActive: true,
      sourceSharedId: x.id,
    });
    if (user) markSharedRoutineAdded(x.batchKey, x.id, user.id).catch(() => {});
  };
  const addedSharedIds = new Set(routines.map((r) => r.sourceSharedId).filter(Boolean) as string[]);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | RoutineDraft | null>(null);
  const [toDelete, setToDelete] = useState<Routine | null>(null);
  const [permission, setPermission] = useState<Permission>('checking');
  const [now, setNow] = useState(() => new Date());

  // Keep "next / in 20 min" honest
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Open the sheet when the header's + menu asks
  useEffect(() => {
    // An optional template in the event's detail pre-fills the sheet (e.g. from the Home card)
    const open = (e: Event) => {
      setEditing(((e as CustomEvent).detail as RoutineDraft) || null);
      setSheetOpen(true);
    };
    const openTemplates = () => setTemplatesOpen(true);
    window.addEventListener('routines:new', open);
    window.addEventListener('routines:templates', openTemplates);
    return () => {
      window.removeEventListener('routines:new', open);
      window.removeEventListener('routines:templates', openTemplates);
    };
  }, []);

  // Reminders only work with permission, so check it up front
  useEffect(() => {
    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const p = await LocalNotifications.checkPermissions();
          setPermission(p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'default');
        } else if (typeof window !== 'undefined' && 'Notification' in window) {
          setPermission(Notification.permission as Permission);
        } else setPermission('unsupported');
      } catch {
        setPermission('unsupported');
      }
    })();
  }, []);

  const askPermission = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const p = await LocalNotifications.requestPermissions();
        const next = p.display === 'granted' ? 'granted' : 'denied';
        setPermission(next);
        if (next === 'granted') scheduleRoutineNotifications(routines);
      } else if ('Notification' in window) {
        setPermission((await Notification.requestPermission()) as Permission);
      }
    } catch {
      setPermission('unsupported');
    }
  };

  const selectedDay = addDays(now, selectedOffset);
  const isToday = selectedOffset === 0;
  const dayList = useMemo(() => routinesForDay(routines, selectedDay), [routines, selectedOffset, now.getDate()]);
  const doneCount = dayList.filter((r) => isDoneOn(r, selectedDay)).length;
  const nextUp = isToday
    ? dayList.find((r) => {
        const [h, m] = r.time.split(':').map(Number);
        const t = new Date(now);
        t.setHours(h, m, 0, 0);
        return t > now && !isDoneOn(r, now);
      })
    : undefined;

  const week = Array.from({ length: 7 }, (_, i) => ({ i, d: addDays(now, i) }));
  const templates = routineTemplatesFor(profile?.role === 'faculty');
  const existingTitles = new Set(routines.map((r) => r.title.trim().toLowerCase()));
  const pickTemplate = (t: RoutineTemplate) => {
    setTemplatesOpen(false);
    openNew({ ...t, isActive: true });
  };

  const visibleAll = routines
    .filter((r) => filter === 'all' || r.category === filter)
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.time.localeCompare(b.time));

  const openNew = (template?: RoutineDraft) => {
    setEditing(template || null);
    setSheetOpen(true);
  };

  const onSave = (draft: RoutineDraft) => {
    if (editing && 'id' in editing) updateRoutine({ ...editing, ...draft });
    else addRoutine(draft);
  };

  const dayTitle = isToday ? 'Today' : selectedOffset === 1 ? 'Tomorrow' : selectedDay.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  const sharedSection = sharedItems.length > 0 && (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-f3">
        <h3 className="text-[17px] font-semibold text-fg">Shared with your batch</h3>
        <span className="text-[13px] text-muted">{sharedItems.length}</span>
      </div>
      <ul className="border border-line bg-surface divide-y divide-line-soft">
        {sharedItems.map((x) => {
          const c = getRoutineCategory(x.category);
          const mine = x.sharedBy === user?.id;
          const added = addedSharedIds.has(x.id);
          const addCount = Object.keys(x.addedBy || {}).length;
          const asRoutine = { ...x, id: x.id, isActive: true, completions: [], createdAt: x.createdAt } as Routine;
          const batchLabel = shareTargets.length > 1 ? shareTargets.find((t) => t.batchKey === x.batchKey)?.label : null;
          return (
            <li key={`${x.batchKey}_${x.id}`} className="flex items-center gap-f3 px-f4 py-f3">
              <span className="w-10 h-10 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
                <Icon3D name={iconForRoutine(x.title, x.category)} size={26} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-fg truncate">{x.title}</p>
                <p className="text-[13px] text-muted truncate">
                  {repeatLabel(asRoutine)} · {formatRoutineTime(x.time)}
                </p>
                <p className="text-[12px] text-faint truncate">
                  {mine ? 'Shared by you' : `by ${x.sharedByName}`}
                  {x.sharedByRole !== 'student' && !mine ? (x.sharedByRole === 'faculty' ? ' · Faculty' : ' · Batch pilot') : ''}
                  {addCount ? ` · ${addCount} added` : ''}
                  {batchLabel ? ` · ${batchLabel}` : ''}
                </p>
              </div>
              {mine ? (
                <button
                  type="button"
                  onClick={() => unshareRoutine(x.batchKey, x.id).then(() => showToast('Stopped sharing', x.title, 'info')).catch(() => showToast("Couldn't stop sharing", 'Try again.', 'error'))}
                  className="shrink-0 h-9 px-3 text-[13px] font-semibold text-muted hover:text-rose-600 cursor-pointer"
                >
                  Remove
                </button>
              ) : added ? (
                <span className="shrink-0 inline-flex items-center gap-1 h-9 px-3 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="w-4 h-4" /> Added
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => addFromShared(x)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="flex flex-col gap-f6 text-left max-w-4xl mx-auto w-full pb-f7">
      {/* Header */}
      <div className="flex flex-col gap-f4">
        <div>
          <h2 className="page-title">
            Routines,
            <br />
            Habits,
            <br />
            Reminders
          </h2>
          <div className="flex items-center gap-f3 mt-f4">
            <span className="tag bg-surface">
              {routinesForDay(routines, now).length} today
            </span>
          </div>
          <p className="text-[14px] text-muted leading-[21px] mt-f3 max-w-md">
            Your own to-dos for study, sports, exam prep or anything else. Set it once, get reminded every time.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            onClick={() => openNew()}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> New Routine
          </button>
          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            className="btn btn-secondary"
          >
            <LayoutTemplate className="w-4 h-4" /> Templates
          </button>
        </div>
      </div>

      {/* Reminders need permission; say so plainly */}
      {routines.length > 0 && (permission === 'default' || permission === 'denied') && (
        <div className="flex items-start gap-f3 p-f4 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10">
          <BellOff className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-fg">Reminders are off</p>
            <p className="mt-0.5 text-[14px] text-muted">
              {permission === 'denied'
                ? 'Notifications are blocked. Allow them for Intersemester in your phone or browser settings.'
                : "Allow notifications so we can remind you when it's time."}
            </p>
            {permission === 'default' && (
              <button type="button" onClick={askPermission} className="btn btn-primary mt-f3">
                <BellRing className="w-4 h-4" /> Turn on reminders
              </button>
            )}
          </div>
        </div>
      )}

      {routines.length === 0 ? (
        /* First run: templates make the first routine two taps away */
        <section>
          <div className="flex flex-col items-center text-center px-6 py-10 border border-dashed border-line">
            <Illustration name="routines" className="h-[160px] w-auto" />
            <h3 className="mt-f3 text-[17px] font-semibold text-fg">No routines yet</h3>
            <p className="mt-1.5 text-[14px] text-muted max-w-[300px]">Pick a starting point below or make your own.</p>
            <p className="mt-f3 font-cursive text-[21px] font-semibold text-fg -rotate-2">Small habits, big semester ✌</p>
          </div>
          {sharedSection && <div className="mt-f5">{sharedSection}</div>}
          <h3 className="mt-f5 mb-f3 text-[17px] font-semibold text-fg">Start with a template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-f2">
            {templates.slice(0, 6).map((t) => {
              const c = getRoutineCategory(t.category);
              return (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => openNew({ ...t, isActive: true })}
                  className="flex items-center gap-f3 p-f3 border border-line bg-surface text-left hover:border-line-strong transition-colors cursor-pointer"
                >
                  <span className="w-10 h-10 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
                    <Icon3D name={iconForRoutine(t.title, t.category)} size={26} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-medium text-fg">{t.title}</span>
                    <span className="block text-[13px] text-muted">
                      {repeatLabel({ ...t, id: '', createdAt: '', completions: [], isActive: true })} · {formatRoutineTime(t.time)}
                    </span>
                  </span>
                  <Plus className="w-4 h-4 text-[#8A8A8A]" />
                </button>
              );
            })}
          </div>
          {templates.length > 6 && (
            <button
              type="button"
              onClick={() => setTemplatesOpen(true)}
              className="mt-f3 inline-flex items-center gap-f2 h-11 px-f3 -ml-f3 text-[14px] font-semibold text-fg hover:underline underline-offset-4 cursor-pointer"
            >
              <LayoutTemplate className="w-4 h-4" /> See all {templates.length} templates
            </button>
          )}
        </section>
      ) : (
        <>
          {/* Week strip */}
          <div className="grid grid-cols-7 border border-line divide-x divide-line-soft bg-surface">
            {week.map(({ i, d }) => {
              const on = selectedOffset === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedOffset(i)}
                  aria-pressed={on}
                  aria-label={d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                  className={`flex flex-col items-center gap-f2 py-f3 cursor-pointer transition-colors ${
                    on ? 'bg-ink text-on-ink' : 'text-fg hover:bg-surface-2'
                  }`}
                >
                  <span className={`text-[11px] font-semibold uppercase leading-none ${on ? 'opacity-70' : 'text-muted'}`}>
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-[21px] font-semibold tabular-nums leading-none">{d.getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* The selected day */}
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-f4">
              <h3 className="text-[17px] font-semibold text-fg">{dayTitle}</h3>
              {dayList.length > 0 && (
                <span className="text-[13px] text-muted tabular-nums">
                  {doneCount} of {dayList.length} done
                </span>
              )}
            </div>
            {dayList.length > 0 && (
              <div className="h-1 mb-f4 bg-surface-3">
                <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(doneCount / dayList.length) * 100}%` }} />
              </div>
            )}

            {dayList.length === 0 ? (
              <div className="px-f4 py-f5 text-center border border-dashed border-line">
                <p className="text-[15px] text-muted">Nothing planned for this day.</p>
                <p className="mt-2 font-cursive text-[21px] font-semibold text-fg -rotate-1">A free day is a good day.</p>
              </div>
            ) : (
              <ul className="border border-line bg-surface divide-y divide-line-soft">
                {dayList.map((r) => {
                  const c = getRoutineCategory(r.category);
                  const done = isDoneOn(r, selectedDay);
                  const isNext = nextUp?.id === r.id;
                  const canTick = selectedOffset <= 0;
                  const [h, m] = r.time.split(':').map(Number);
                  const startsAt = new Date(selectedDay);
                  startsAt.setHours(h, m, 0, 0);
                  return (
                    <li key={r.id} className="relative flex items-center gap-f3 pl-f4 pr-f3 py-f4">
                      <button
                        type="button"
                        disabled={!canTick}
                        onClick={() => toggleRoutineDone(r.id, dateKey(selectedDay))}
                        aria-pressed={done}
                        aria-label={done ? `Mark ${r.title} not done` : `Mark ${r.title} done`}
                        className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                          done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#BDBDBD] dark:border-white/30'
                        } ${canTick ? 'cursor-pointer hover:border-emerald-500' : 'opacity-40 cursor-not-allowed'}`}
                      >
                        {done && <Check className="w-4 h-4" strokeWidth={3} />}
                      </button>
                      <button type="button" onClick={() => openNew(r)} className="flex-1 min-w-0 text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span className={`text-[15px] font-medium truncate ${done ? 'line-through text-[#8A8A8A]' : 'text-fg'}`}>{r.title}</span>
                          {isNext && <span className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 bg-ink text-on-ink">Next · {inLabel(startsAt.getTime() - now.getTime())}</span>}
                        </span>
                        <span className="block mt-0.5 text-[13px] text-muted truncate">
                          {c.emoji} {c.label}
                          {r.durationMinutes ? ` · ${r.durationMinutes} min` : ''}
                          {r.notes ? ` · ${r.notes}` : ''}
                        </span>
                      </button>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-fg">{formatRoutineTime(r.time)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {isToday && dayList.length > 0 && doneCount === dayList.length && (
              <p className="mt-f4 -rotate-1">
                <HandwrittenText
                  text="All done for today. Proud of you!"
                  playKey={`routines-done-${new Date().toDateString()}`}
                  className="text-[27px] leading-tight font-semibold text-emerald-700 dark:text-emerald-400"
                />
              </p>
            )}
          </section>

          {sharedSection}

          {/* Every routine */}
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-f4">
              <h3 className="text-[17px] font-semibold text-fg">All routines</h3>
              <span className="text-[13px] text-muted">{routines.length}</span>
            </div>
            <div className="flex gap-f2 overflow-x-auto no-scrollbar mb-f4 -mx-f4 px-f4 sm:mx-0 sm:px-0">
              {[{ id: 'all', label: 'All', emoji: '' }, ...ROUTINE_CATEGORIES].map((c) => {
                const count = c.id === 'all' ? routines.length : routines.filter((r) => r.category === c.id).length;
                if (c.id !== 'all' && !count) return null;
                const on = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilter(c.id)}
                    aria-pressed={on}
                    className={`shrink-0 h-9 px-3 border text-[13px] font-medium cursor-pointer ${
                      on ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg'
                    }`}
                  >
                    {c.emoji ? `${c.emoji} ` : ''}
                    {c.label} <span className="opacity-60 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
            <ul className="border border-line bg-surface divide-y divide-line-soft">
              {visibleAll.map((r) => {
                const c = getRoutineCategory(r.category);
                const streak = routineStreak(r, now);
                const next = nextOccurrence(r, now);
                return (
                  <li key={r.id} className={`flex items-center gap-f3 px-f4 py-f4 ${r.isActive ? '' : 'opacity-55'}`}>
                    <span className="w-10 h-10 shrink-0 flex items-center justify-center" style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }} aria-hidden="true">
                      <Icon3D name={iconForRoutine(r.title, r.category)} size={26} />
                    </span>
                    <button type="button" onClick={() => openNew(r)} className="flex-1 min-w-0 text-left cursor-pointer">
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-fg truncate">{r.title}</span>
                        {streak >= 2 && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[12px] font-semibold text-orange-600 dark:text-orange-400">
                            <Flame className="w-3.5 h-3.5" /> {streak}
                          </span>
                        )}
                      </span>
                      <span className="block mt-0.5 text-[13px] leading-snug text-muted line-clamp-2">
                        {repeatLabel(r)} · {formatRoutineTime(r.time)} · {r.remindBefore ? `🔔 ${r.remindBefore} min before` : '🔔 on time'}
                      </span>
                      {r.isActive && next && selectedOffset === 0 && (
                        <span className="block text-[12px] text-faint">
                          Next {next.toDateString() === now.toDateString() ? inLabel(next.getTime() - now.getTime()) : next.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareFor(r)}
                      aria-label={`Share ${r.title} with your batch`}
                      title="Share with batch"
                      className={`shrink-0 w-9 h-9 flex items-center justify-center cursor-pointer transition-colors hover:bg-surface-2 ${
                        sharedToFor(r).size ? 'text-fg' : 'text-faint'
                      }`}
                    >
                      {sharedToFor(r).size ? <Users className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.isActive}
                      aria-label={`${r.isActive ? 'Pause' : 'Resume'} ${r.title}`}
                      onClick={() => updateRoutine({ ...r, isActive: !r.isActive })}
                      className="shrink-0 p-1 cursor-pointer"
                    >
                      <span className={`relative block w-10 h-6 rounded-full transition-colors ${r.isActive ? 'bg-emerald-500' : 'bg-black/15 dark:bg-white/20'}`}>
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.isActive ? 'translate-x-4' : ''}`} />
                      </span>
                    </button>
                    <ChevronRight className="w-4 h-4 shrink-0 text-faint hidden sm:block" />
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <TemplatePicker
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={templates}
        existingTitles={existingTitles}
        onPick={pickTemplate}
        onBlank={() => {
          setTemplatesOpen(false);
          openNew();
        }}
      />

      <RoutineSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editing}
        onSave={onSave}
        onDelete={editing && 'id' in editing ? () => setToDelete(editing as Routine) : undefined}
      />

      <ShareRoutineSheet
        routine={shareFor}
        onClose={() => setShareFor(null)}
        blockedReason={shareBlocked}
        targets={shareTargets}
        sharedTo={shareFor ? sharedToFor(shareFor) : new Set()}
        notifiesBatch={sharerRole !== 'student'}
        onShare={(keys) => (shareFor ? handleShare(shareFor, keys) : Promise.resolve())}
        onUnshare={(bk) => (shareFor ? handleUnshare(shareFor, bk) : Promise.resolve())}
        onGoToProfile={() => {
          setShareFor(null);
          setActiveView('settings');
        }}
      />

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteRoutine(toDelete.id);
          setToDelete(null);
        }}
        title="Delete this routine?"
        description="Its reminders stop and its streak is lost."
        highlightText={toDelete?.title}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
      />
    </div>
  );
};
