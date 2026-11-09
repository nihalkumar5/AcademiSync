'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// One button for the whole app. Classes live in app/globals.css (.btn*), so raw
// <button className="btn btn-secondary btn-sm"> and <Button variant="secondary" size="sm"> look identical.
//   size  md = 44px (default) · sm = 36px (compact rows, toolbars) · lg = 52px (one hero CTA per screen)
//   variant primary = ink fill · secondary = outlined · ghost = text only · danger = red fill · danger-quiet = red outline
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-quiet' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variantCls: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  accent: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'danger-quiet': 'btn-danger-quiet',
};
const sizeCls: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
  'icon-sm': 'btn-sm btn-icon',
};

export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  twMerge(clsx('btn', variantCls[variant], sizeCls[size], className));

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={props.type || 'button'}
      disabled={disabled || isLoading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : null}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
