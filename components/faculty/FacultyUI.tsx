'use client';

import React from 'react';
import { Users, Plus } from '@/components/ui/icons';
import { PageTitle, PageActions } from '@/components/ui/PageActions';

// Faculty page header, the same as every student page: a one-line title with the round primary
// button and the "⋯" menu beside it (PageActions), then a short description.
export const FacultyPageHeader: React.FC<{
  /** Kept for callers; no longer shown (the title already names the page) */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="min-w-0">
    <PageTitle>{title}</PageTitle>
    {action && <PageActions>{action}</PageActions>}
    {description && <p className="mt-2 text-[14px] leading-[20px] text-muted max-w-md">{description}</p>}
  </div>
);

// Shown wherever a screen needs a linked batch before it can show anything.
export const FacultyNoBatches: React.FC<{ onConnect: () => void; title: string; body: string; note?: string }> = ({ onConnect, title, body, note }) => (
  <div className="rounded-card flex flex-col items-center justify-center text-center px-6 py-10 bg-surface shadow-[0_1px_2px_rgba(17,17,17,0.04)] dark:bg-surface-2 dark:shadow-none">
    <div className="rounded-xl mb-4 w-14 h-14 flex items-center justify-center bg-surface-2 border border-line-soft text-fg">
      <Users className="w-6 h-6" />
    </div>
    <h3 className="text-[17px] font-semibold text-fg tracking-tight">{title}</h3>
    <p className="mt-1.5 text-[14px] text-muted max-w-[300px] leading-relaxed">{body}</p>
    <button
      type="button"
      onClick={onConnect}
      className="btn btn-primary mt-5"
    >
      <Plus className="w-4 h-4" /> Connect a batch
    </button>
    {note && <p className="mt-f3 font-cursive text-[21px] leading-tight font-semibold text-fg -rotate-2">{note}</p>}
  </div>
);

export const FacultyStatTile: React.FC<{ value: React.ReactNode; label: string; tint?: string }> = ({ value, label }) => (
  <div className="rounded-card flex flex-col items-center justify-center text-center py-f4 border border-line bg-surface">
    <span className="text-[28px] sm:text-[32px] font-medium text-fg tracking-tighter leading-none mb-1 tabular-nums">{value}</span>
    <span className="text-[12px] sm:text-[13px] font-medium text-muted leading-tight">{label}</span>
  </div>
);
