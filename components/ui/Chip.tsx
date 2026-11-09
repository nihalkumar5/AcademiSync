'use client';

import React, { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Chip: a 32px filter / choice. Active = ink fill. Sentence case, never caps.
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({ active, count, className, children, ...props }) => (
  <button
    type="button"
    aria-pressed={active}
    className={twMerge(clsx('chip', active && 'chip-active', className))}
    {...props}
  >
    {children}
    {typeof count === 'number' && <span className="tabular-nums opacity-60">{count}</span>}
  </button>
);

// Tag: a 24px static label. Tone only for meaning.
export const Tag: React.FC<{ tone?: 'neutral' | 'danger' | 'ok'; className?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  className,
  children,
}) => <span className={twMerge(clsx('tag', tone === 'danger' && 'tag-danger', tone === 'ok' && 'tag-ok', className))}>{children}</span>;
