'use client';

import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'neutral' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
}) => {
  const base =
    'inline-flex items-center font-medium select-none tracking-tight transition-colors';

  const sizes = {
    sm: 'text-[12px] h-5 px-1.5 rounded-none gap-1',
    md: 'text-[12px] h-6 px-2 rounded-none gap-1.5',
  };

  const variants = {
    default:'bg-surface-2 text-fg-2 border border-line',
    neutral:'bg-transparent text-muted border border-line',
    blue: 'bg-ink text-on-ink border border-ink',
    emerald:
      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
    amber:
      'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
    rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60',
    purple:
      'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60',
  };

  const dotColors = {
    default: 'bg-zinc-400',
    neutral: 'bg-zinc-400',
    blue: 'bg-ink text-on-ink border border-ink',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
  };

  return (
    <span className={twMerge(clsx(base, sizes[size], variants[variant], className))}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};
