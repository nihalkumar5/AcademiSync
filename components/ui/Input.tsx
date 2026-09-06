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
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700 dark:text-[#94A3B8]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121317] border rounded-xl transition-all placeholder:text-zinc-400 dark:placeholder:text-[#64748B] text-zinc-900 dark:text-[#F4F4F6] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white/30 shadow-sm',
              error ? 'border-rose-500 dark:border-rose-500' : 'border-[#D8D8D8] dark:border-white/[0.1]',
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-[11px] text-zinc-500 dark:text-[#64748B]">{helperText}</p>
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
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700 dark:text-[#94A3B8]">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121317] border rounded-xl transition-all placeholder:text-zinc-400 dark:placeholder:text-[#64748B] text-zinc-900 dark:text-[#F4F4F6] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white/30 min-h-[80px] shadow-sm',
              error ? 'border-rose-500 dark:border-rose-500' : 'border-[#D8D8D8] dark:border-white/[0.1]',
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-[11px] text-zinc-500 dark:text-[#64748B]">{helperText}</p>
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
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700 dark:text-[#94A3B8]">
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121317] border rounded-xl transition-all text-zinc-900 dark:text-[#F4F4F6] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white/30 cursor-pointer shadow-sm',
              error ? 'border-rose-500 dark:border-rose-500' : 'border-[#D8D8D8] dark:border-white/[0.1]',
              className
            )
          )}
          {...props}
        >
          {children}
        </select>
        {helperText && !error && (
          <p className="text-[11px] text-zinc-500 dark:text-[#64748B]">{helperText}</p>
        )}
        {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
