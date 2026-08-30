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
    sm: 'text-[10.5px] px-1.5 py-0.5 rounded-md gap-1',
    md: 'text-xs px-2.5 py-0.5 rounded-md gap-1.5',
  };

  const variants = {
    default:
      'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60',
    neutral:
      'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800',
    blue: 'bg-[#111111]/10 dark:bg-[#FFFFFF]/20 text-[#111111] dark:text-[#FFFFFF] border border-[#111111]/25 dark:border-[#FFFFFF]/35',
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
    blue: 'bg-[#111111] dark:bg-[#FFFFFF]',
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
