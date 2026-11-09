'use client';

import React from 'react';
import { Search, X, ChevronRight } from '@/components/ui/icons';

// Control Center design primitives. One vocabulary for every tab:
// sentence-case labels, 13/21/34px rhythm, one primary action per view, colour only for status.

// Built on the app-wide .btn classes in app/globals.css (44px default, 36px compact).
export const btn = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost btn-sm px-2.5 font-medium',
  danger: 'btn btn-danger-quiet',
  icon: 'btn btn-ghost btn-sm btn-icon',
};

export const surface = 'border border-line bg-surface';
export const divider = 'divide-y divide-line-soft';
export const muted = 'text-muted';
export const strong = 'text-fg';
export const inputCls = 'field';

export const PageTitle: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-f3">
    <div className="min-w-0">
      <h2 className={`text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight ${strong}`}>{title}</h2>
      {description && <p className={`mt-1 text-[14px] leading-relaxed max-w-xl ${muted}`}>{description}</p>}
    </div>
    {action && <div className="shrink-0 flex gap-2">{action}</div>}
  </div>
);

export const SectionHead: React.FC<{ title: string; meta?: React.ReactNode; action?: React.ReactNode }> = ({ title, meta, action }) => (
  <div className="flex items-baseline justify-between gap-3 mb-f3">
    <h3 className={`text-[17px] font-semibold tracking-tight ${strong}`}>{title}</h3>
    <div className="flex items-center gap-3">
      {meta && <span className={`text-[13px] ${muted}`}>{meta}</span>}
      {action}
    </div>
  </div>
);

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'violet';
const toneCls: Record<Tone, string> = {
  neutral: 'text-[#555555] dark:text-[#C4C4CC] border-line',
  green: 'text-emerald-700 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10',
  amber: 'text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10',
  red: 'text-rose-700 dark:text-rose-300 border-rose-300/70 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10',
  blue: 'text-sky-700 dark:text-sky-300 border-sky-300/70 dark:border-sky-500/30 bg-sky-50/70 dark:bg-sky-500/10',
  violet: 'text-violet-700 dark:text-violet-300 border-violet-300/70 dark:border-violet-500/30 bg-violet-50/70 dark:bg-violet-500/10',
};
export const Badge: React.FC<{ tone?: Tone; dot?: boolean; children: React.ReactNode }> = ({ tone = 'neutral', dot, children }) => (
  <span className={`inline-flex items-center gap-1.5 h-6 px-2 border text-[12px] font-medium whitespace-nowrap ${toneCls[tone]}`}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
    {children}
  </span>
);

export const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  onClick?: () => void;
}> = ({ label, value, hint, onClick }) => {
  const inner = (
    <>
      <span className={`text-[13px] ${muted}`}>{label}</span>
      <span className={`mt-1 text-[30px] sm:text-[34px] font-semibold tabular-nums leading-none tracking-tight ${strong}`}>{value}</span>
      {hint && <span className={`mt-2 text-[12px] ${muted}`}>{hint}</span>}
    </>
  );
  const cls = `${surface} flex flex-col items-start text-left p-f4 min-h-[118px]`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:border-line-strong transition-colors cursor-pointer`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

export const Segmented = <T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; count?: number }[];
  ariaLabel: string;
}) => (
  <div role="tablist" aria-label={ariaLabel} className="inline-flex max-w-full overflow-x-auto no-scrollbar border border-line p-0.5">
    {options.map((o) => {
      const on = value === o.id;
      return (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={on}
          onClick={() => onChange(o.id)}
          className={`shrink-0 h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
            on ? 'bg-ink text-on-ink' : `${muted} hover:text-fg`
          }`}
        >
          {o.label}
          {typeof o.count === 'number' && <span className={`tabular-nums ${on ? 'opacity-70' : 'opacity-60'}`}>{o.count}</span>}
        </button>
      );
    })}
  </div>
);

export const SearchField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; className?: string }> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${inputCls} pl-10 pr-9`}
    />
    {value && (
      <button type="button" onClick={() => onChange('')} aria-label="Clear search" className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${btn.icon} w-9 h-9`}>
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export const Empty: React.FC<{ icon: React.ElementType; title: string; body?: string; action?: React.ReactNode }> = ({ icon: Icon, title, body, action }) => (
  <div className="flex flex-col items-center text-center px-f4 py-f6 border border-dashed border-line">
    <span className={`w-12 h-12 flex items-center justify-center border border-line-soft ${strong}`}>
      <Icon className="w-5 h-5" strokeWidth={1.75} />
    </span>
    <p className={`mt-f3 text-[16px] font-semibold ${strong}`}>{title}</p>
    {body && <p className={`mt-1 text-[14px] max-w-sm ${muted}`}>{body}</p>}
    {action && <div className="mt-f4">{action}</div>}
  </div>
);

export const AttentionRow: React.FC<{
  icon: React.ElementType;
  tone: 'amber' | 'blue' | 'red' | 'neutral';
  title: string;
  hint?: string;
  onClick: () => void;
}> = ({ icon: Icon, tone, title, hint, onClick }) => {
  const iconTone = {
    amber: 'text-amber-600 dark:text-amber-400 border-amber-300/60 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10',
    blue: 'text-sky-600 dark:text-sky-400 border-sky-300/60 dark:border-sky-500/25 bg-sky-50 dark:bg-sky-500/10',
    red: 'text-rose-600 dark:text-rose-400 border-rose-300/60 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10',
    neutral: `${strong} border-line-soft`,
  }[tone];
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-f3 px-f4 py-f3 min-h-[64px] text-left hover:bg-surface-2 transition-colors cursor-pointer">
      <span className={`w-9 h-9 shrink-0 flex items-center justify-center border ${iconTone}`}>
        <Icon className="w-4 h-4" strokeWidth={1.9} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[15px] font-medium ${strong}`}>{title}</span>
        {hint && <span className={`block mt-0.5 text-[13px] truncate ${muted}`}>{hint}</span>}
      </span>
      <ChevronRight className="w-4 h-4 text-faint" />
    </button>
  );
};

export const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};
