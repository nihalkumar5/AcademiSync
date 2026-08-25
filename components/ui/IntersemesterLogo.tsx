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
  size = 28,
  className = '',
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={clsx(
        'border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs font-mono select-none shrink-0',
        className
      )}
    >
      is
    </div>
  );
};

export const IntersemesterLogo: React.FC<IntersemesterLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = true,
  className = '',
  taglineText = 'Student Edition',
}) => {
  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  };

  return (
    <div className={clsx('flex flex-col text-left select-none', className)}>
      <div
        className={clsx(
          'tracking-tighter leading-none text-black dark:text-white flex items-center font-sans',
          textSizes[size]
        )}
      >
        <span className="font-extrabold">inter</span>
        <span className="font-normal opacity-70">semester</span>
      </div>

      {showTagline && (
        <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-black/50 dark:text-white/50 mt-1">
          {taglineText}
        </span>
      )}
    </div>
  );
};
