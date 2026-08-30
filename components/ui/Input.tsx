'use client';

import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border rounded-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#111111] dark:focus:ring-[#FFFFFF] focus:border-[#111111] dark:focus:border-[#FFFFFF]',
              error ? 'border-rose-500 dark:border-rose-500' : 'border-[#D8D8D8] dark:border-zinc-700/80',
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{helperText}</p>
        )}
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border rounded-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#111111] dark:focus:ring-[#FFFFFF] focus:border-[#111111] dark:focus:border-[#FFFFFF] min-h-[80px]',
              error ? 'border-rose-500 dark:border-rose-500' : 'border-[#D8D8D8] dark:border-zinc-700/80',
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{helperText}</p>
        )}
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, id, children, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 text-base bg-white dark:bg-zinc-900 border rounded-none transition-colors text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#111111] dark:focus:ring-[#FFFFFF] focus:border-[#111111] dark:focus:border-[#FFFFFF] cursor-pointer',
              error ? 'border-rose-500 dark:border-rose-500' : 'border-[#D8D8D8] dark:border-zinc-700/80',
              className
            )
          )}
          {...props}
        >
          {children}
        </select>
        {helperText && !error && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{helperText}</p>
        )}
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
