'use client';

import React from 'react';
import { clsx } from 'clsx';

interface IntersemesterLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  taglineText?: string;
}

export const IntersemesterMonogram: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  const uniqueId = React.useId().replace(/:/g, '');
  const ribbonId = `isRibbonGradient-${uniqueId}`;
  const stemId = `isStemGradient-${uniqueId}`;
  const dotId = `isDotGradient-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('shrink-0 drop-shadow-sm', className)}
    >
      <defs>
        {/* Main Brand Ribbon Gradient */}
        <linearGradient id={ribbonId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="30%" stopColor="#6366F1" />
          <stop offset="70%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        {/* Stem Gradient */}
        <linearGradient id={stemId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Dot Gradient */}
        <linearGradient id={dotId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      {/* "i" Dot */}
      <circle cx="44" cy="28" r="12" fill={`url(#${dotId})`} />

      {/* "i" Stem */}
      <rect x="33" y="46" width="22" height="52" rx="11" fill={`url(#${stemId})`} />

      {/* "s" Flowing Ribbon Top Arc */}
      <path
        d="M55 57C55 49.268 61.268 43 69 43H85C92.732 43 99 49.268 99 57C99 64.732 92.732 71 85 71H63C54.1634 71 47 78.1634 47 87C47 95.8366 54.1634 103 63 103H91C95.4183 103 99 99.4183 99 95C99 90.5817 95.4183 87 91 87H65C62.7909 87 61 85.2091 61 83C61 80.7909 62.7909 79 65 79H87C97.4934 79 106 70.4934 106 60C106 49.5066 97.4934 41 87 41H67C55.402 41 46 50.402 46 62C46 63.7 46.2 65.3 46.6 66.9C49.1 60.9 51.8 57 55 57Z"
        fill={`url(#${ribbonId})`}
      />
    </svg>
  );
};

export const IntersemesterLogo: React.FC<IntersemesterLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = true,
  className = '',
  taglineText = 'Your academic life, organized.',
}) => {
  const iconSizes = {
    sm: 26,
    md: 34,
    lg: 44,
    xl: 56,
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl',
  };

  const taglineSizes = {
    sm: 'text-[8.5px]',
    md: 'text-[9.5px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      {/* Monogram Icon */}
      <div className="relative flex items-center justify-center">
        <IntersemesterMonogram size={iconSizes[size]} />
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div
            className={clsx(
              'font-extrabold tracking-tight leading-none text-[#0F172A] dark:text-white flex items-center font-sans',
              textSizes[size]
            )}
          >
            <span>Inter</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              semester
            </span>
          </div>

          {showTagline && (
            <span
              className={clsx(
                'text-[#64748B] dark:text-zinc-400 font-medium tracking-wide mt-1 uppercase tracking-wider font-sans',
                taglineSizes[size]
              )}
            >
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
