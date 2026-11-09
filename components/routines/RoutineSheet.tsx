'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Routine, RoutineCategory, RoutineRepeat } from '@/lib/types';
import { ROUTINE_CATEGORIES, dateKey } from '@/lib/routines';
import { Icon3D, iconForCategory } from './Icon3D';
import { AlertCircle, Trash2 } from '@/components/ui/icons';

export type RoutineDraft = Omit<Routine, 'id' | 'createdAt' | 'completions'>;

const EMPTY: RoutineDraft = {
  title: '',
  category: 'study',
  notes: '',
  time: '18:00',
  durationMinutes: undefined,
  repeat: 'daily',
  days: [],
  date: undefined,
  remindBefore: 10,
  isActive: true,
};

const DAY_PICK = [
  { d: 1, l: 'M' },
  { d: 2, l: 'T' },
  { d: 3, l: 'W' },
  { d: 4, l: 'T' },
  { d: 5, l: 'F' },
  { d: 6, l: 'S' },
  { d: 0, l: 'S' },
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REMIND = [0, 5, 10, 15, 30, 60];
const DURATIONS = [15, 30, 45, 60, 90, 120];

const label = 'text-[14px] font-medium text-fg';
const input =
  'w-full h-12 px-3.5 bg-surface border border-line text-[15px] text-fg placeholder:text-[#9A9A9A] focus:outline-none focus:border-line-strong';

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; className?: string; ariaLabel?: string }> = ({ on, onClick, children, className = '', ariaLabel }) => (
  <button
    type="button"
    aria-pressed={on}
    aria-label={ariaLabel}
    onClick={onClick}
    className={`h-11 px-3 border text-[14px] font-medium transition-colors cursor-pointer ${
      on
        ? 'bg-ink text-on-ink border-line-strong'
        : 'border-line text-fg hover:border-line-strong'
    } ${className}`}
  >
    {children}
  </button>
);

export const RoutineSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initial?: Routine | RoutineDraft | null;
  onSave: (draft: RoutineDraft) => void;
  onDelete?: () => void;
}> = ({ isOpen, onClose, initial, onSave, onDelete }) => {
  const [form, setForm] = useState<RoutineDraft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const editing = !!(initial && 'id' in initial);

  useEffect(() => {
    if (!isOpen) return;
    setTouched(false);
    if (initial) {
      const { title, category, notes, time, durationMinutes, repeat, days, date, remindBefore, isActive } = initial as RoutineDraft;
      setForm({ title, category, notes: notes || '', time, durationMinutes, repeat, days: days || [], date, remindBefore, isActive });
    } else {
      setForm({ ...EMPTY, date: dateKey(new Date()) });
    }
  }, [isOpen, initial]);

  const set = <K extends keyof RoutineDraft>(k: K, v: RoutineDraft[K]) => setForm((p) => ({ ...p, [k]: v }));
  const today = dateKey(new Date());

  const titleErr = !form.title.trim() ? 'Give it a short name' : '';
  const daysErr = form.repeat === 'custom' && !(form.days || []).length ? 'Pick at least one day' : '';
  const dateErr = form.repeat === 'once' && (!form.date || form.date < today) ? 'Pick today or a later date' : '';
  const valid = !titleErr && !daysErr && !dateErr;

  const save = () => {
    setTouched(true);
    if (!valid) return;
    onSave({
      ...form,
      title: form.title.trim(),
      notes: form.notes?.trim() || undefined,
      days: form.repeat === 'custom' ? [...(form.days || [])].sort() : undefined,
      date: form.repeat === 'once' ? form.date : undefined,
    });
    onClose();
  };

  const Err = ({ msg }: { msg: string }) =>
    touched && msg ? (
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-rose-600 dark:text-rose-400">
        <AlertCircle className="w-3.5 h-3.5" /> {msg}
      </p>
    ) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit routine' : 'New routine'} mobileFullSheet>
      <div className="flex flex-col gap-f4 pb-2">
        <div>
          <label htmlFor="rt-title" className={label}>
            What do you want to do?
          </label>
          <input
            id="rt-title"
            className={`${input} mt-2`}
            maxLength={60}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Study DSA, Gym, Call home…"
            autoFocus={!editing}
          />
          <Err msg={titleErr} />
        </div>

        <div>
          <p className={label}>Category</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROUTINE_CATEGORIES.map((c) => (
              <Chip key={c.id} on={form.category === c.id} onClick={() => set('category', c.id as RoutineCategory)} className="px-1.5 text-[13px] whitespace-nowrap">
                <Icon3D name={iconForCategory(c.id)} size={16} className="mr-1.5" />
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-f3">
          <div>
            <label htmlFor="rt-time" className={label}>
              Time
            </label>
            <input id="rt-time" type="time" className={`${input} mt-2`} value={form.time} onChange={(e) => set('time', e.target.value || '09:00')} />
          </div>
          <div>
            <label htmlFor="rt-dur" className={label}>
              Duration
            </label>
            <select
              id="rt-dur"
              className={`${input} mt-2 cursor-pointer`}
              value={form.durationMinutes || ''}
              onChange={(e) => set('durationMinutes', e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Not set</option>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? 's' : ''}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className={label}>Repeat</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(
              [
                ['once', 'Once'],
                ['daily', 'Daily'],
                ['weekdays', 'Weekdays'],
                ['custom', 'Custom'],
              ] as [RoutineRepeat, string][]
            ).map(([id, l]) => (
              <Chip key={id} on={form.repeat === id} onClick={() => set('repeat', id)} className="px-1 text-[13px]">
                {l}
              </Chip>
            ))}
          </div>
          {form.repeat === 'custom' && (
            <>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {DAY_PICK.map(({ d, l }) => {
                  const on = (form.days || []).includes(d);
                  return (
                    <Chip
                      key={d}
                      on={on}
                      ariaLabel={DAY_NAMES[d]}
                      onClick={() => set('days', on ? (form.days || []).filter((x) => x !== d) : [...(form.days || []), d])}
                      className="px-0"
                    >
                      {l}
                    </Chip>
                  );
                })}
              </div>
              <Err msg={daysErr} />
            </>
          )}
          {form.repeat === 'once' && (
            <>
              <input type="date" min={today} className={`${input} mt-2`} value={form.date || ''} onChange={(e) => set('date', e.target.value)} aria-label="Date" />
              <Err msg={dateErr} />
            </>
          )}
        </div>

        <div>
          <p className={label}>Remind me</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {REMIND.map((m) => (
              <Chip key={m} on={form.remindBefore === m} onClick={() => set('remindBefore', m)} className="text-[13px]">
                {m === 0 ? 'On time' : m === 60 ? '1 hr early' : `${m} min early`}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="rt-notes" className={label}>
            Note <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="rt-notes"
            rows={2}
            maxLength={120}
            className={`${input} mt-2 h-auto py-2.5 resize-none`}
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Chapter 4, carry the shoes, 2 litres…"
          />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            className="h-12 bg-ink text-on-ink text-[15px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {editing ? 'Save changes' : 'Add routine'}
          </button>
          {editing && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="h-12 inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Delete routine
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
