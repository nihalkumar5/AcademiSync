'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] dark:focus-visible:ring-[#FFFFFF] focus-visible:ring-offset-2';

    const variants = {
      primary:
        'bg-[#111111] text-white hover:bg-black dark:bg-[#FFFFFF] dark:text-[#111111] dark:hover:bg-white/90 shadow-sm border border-[#111111] dark:border-transparent',
      secondary:
        'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/50 dark:border-zinc-700/50',
      outline:
        'bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700',
      ghost:
        'bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800',
      danger:
        'bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-sm',
      accent:
        'bg-[#111111] text-white hover:bg-black dark:bg-[#FFFFFF] dark:text-[#111111] dark:hover:bg-white/90 shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 rounded-lg gap-2 h-9',
      lg: 'text-base px-4 py-2.5 rounded-lg gap-2.5 h-11',
      icon: 'p-2 rounded-lg h-9 w-9 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
