'use client';

import React, { useMemo } from 'react';
import { Check, ArrowRight } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { ROUTINE_CATEGORIES, RoutineTemplate, formatRoutineTime } from '@/lib/routines';
import { Icon3D, iconForRoutine } from './Icon3D';
import { PhosphorCategoryIcon } from './PhosphorCategoryIcon';

// Group headings use Phosphor line icons (quiet labels); the 3D icons are kept for the cards themselves.

// Template picker, designed to be scanned in seconds:
// - Grouped by purpose (proximity) instead of a filter row you have to operate first.
// - One card per template: a colourful 3D icon on a soft tile of its category colour, then the name and a
//   short schedule. The whole card is the button.
// - Details (duration, reminder) live in the editor that opens next, so cards stay one idea each.
// - Spacing on the golden scale (8 / 13 / 21 / 34).

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Daily", "Weekdays", "Sun–Thu", "Mon, Wed, Fri", "Sat" — never more than a few words. */
const shortSchedule = (t: RoutineTemplate) => {
  if (t.repeat === 'daily') return 'Daily';
  if (t.repeat === 'weekdays') return 'Weekdays';
  if (t.repeat === 'once') return 'Once';
  const days = [...(t.days || [])].sort((a, b) => a - b);
  if (days.length === 7) return 'Daily';
  if (days.length === 0) return 'Custom';
  // A consecutive run (e.g. Sun→Thu as 0..4) reads best as a range
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (days.length >= 3 && consecutive) return `${DAY[days[0]]}–${DAY[days[days.length - 1]]}`;
  if (days.length <= 3) return days.map((d) => DAY[d]).join(', ');
  return `${days.length} days a week`;
};

export const TemplatePicker: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  templates: RoutineTemplate[];
  existingTitles: Set<string>;
  onPick: (t: RoutineTemplate) => void;
  onBlank: () => void;
}> = ({ isOpen, onClose, templates, existingTitles, onPick, onBlank }) => {
  const groups = useMemo(
    () => ROUTINE_CATEGORIES.map((c) => ({ c, items: templates.filter((t) => t.category === c.id) })).filter((g) => g.items.length > 0),
    [templates]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start from a template" description="Tap one. You can change the time before saving." maxWidth="lg">
      <div className="flex flex-col gap-f5">
        {groups.map(({ c, items }) => (
          <section key={c.id} aria-labelledby={`tpl-${c.id}`}>
            <h4 id={`tpl-${c.id}`} className="flex items-center gap-f2 mb-f3 text-[13px] font-semibold text-muted">
              <PhosphorCategoryIcon category={c.id} className="w-[18px] h-[18px] text-muted" />
              {c.label}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-f2">
              {items.map((t) => {
                const added = existingTitles.has(t.title.trim().toLowerCase());
                return (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => onPick(t)}
                    className={`group relative flex items-center gap-f3 sm:min-h-[89px] py-f3 pl-f3 pr-f5 text-left border transition-colors cursor-pointer ${
                      added
                        ? 'border-line-soft bg-[#FAFAF9] dark:bg-white/[0.02]'
                        : 'border-[#E2E2DF] dark:border-white/[0.08] bg-surface hover:border-line-strong'
                    }`}
                  >
                    <span
                      className={`w-12 h-12 shrink-0 flex items-center justify-center ${added ? 'opacity-50 grayscale' : ''}`}
                      style={{ backgroundColor: `${c.color}14`, boxShadow: `inset 0 0 0 1px ${c.color}1F` }}
                    >
                      <Icon3D name={iconForRoutine(t.title, t.category)} size={30} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[15px] font-semibold leading-snug ${added ? 'text-faint' : 'text-fg'}`}>{t.title}</span>
                      <span className="mt-f1 block text-[13px] tabular-nums text-muted">
                        {added ? 'Already added' : `${shortSchedule(t)} · ${formatRoutineTime(t.time).replace(' ', '\u00a0')}`}
                      </span>
                    </span>
                    {added ? (
                      <Check className="absolute top-1/2 -translate-y-1/2 sm:translate-y-0 sm:top-f3 right-f3 w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-label="Added" />
                    ) : (
                      <ArrowRight className="absolute top-1/2 -translate-y-1/2 sm:translate-y-0 sm:top-f3 right-f3 w-4 h-4 text-[#C4C4C0] dark:text-[#52525B] group-hover:text-fg transition-colors" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div className="pt-f4 border-t border-line-soft">
          <button
            type="button"
            onClick={onBlank}
            className="btn btn-secondary w-full"
          >
            Start from scratch
          </button>
        </div>
      </div>
    </Modal>
  );
};
