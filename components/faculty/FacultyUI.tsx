'use client';

import React from 'react';
import { Users, Plus } from '@/components/ui/icons';

// Faculty page header in the same editorial style as the student pages.
export const FacultyPageHeader: React.FC<{
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-f3">
    <div className="min-w-0">
      <span className="tag bg-surface">
        {eyebrow}
      </span>
      <h2 className="mt-f3 page-title">{title}</h2>
      {description && <p className="mt-2 text-[14px] leading-[20px] text-muted max-w-md">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// Shown wherever a screen needs a linked batch before it can show anything.
export const FacultyNoBatches: React.FC<{ onConnect: () => void; title: string; body: string; note?: string }> = ({ onConnect, title, body, note }) => (
  <div className="flex flex-col items-center justify-center text-center px-6 py-10 border border-dashed border-line">
    <div className="mb-4 w-14 h-14 flex items-center justify-center bg-surface-2 border border-line-soft text-fg">
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
  <div className="flex flex-col items-center justify-center text-center py-f4 border border-line bg-surface">
    <span className="text-[28px] sm:text-[32px] font-medium text-fg tracking-tighter leading-none mb-1 tabular-nums">{value}</span>
    <span className="text-[12px] sm:text-[13px] font-medium text-muted leading-tight">{label}</span>
  </div>
);
