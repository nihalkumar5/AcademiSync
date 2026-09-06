'use client';

import React, { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-start justify-center p-6 sm:p-8 text-left border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] rounded-none my-4 relative overflow-hidden group shadow-sm ${className}`}>
      {/* Subtle Aesthetic Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 dark:bg-white/[0.03] blur-3xl pointer-events-none" />
      
      {icon && (
        <div className="mb-4 text-black/40 dark:text-white/40">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-black dark:text-[#F4F4F6] tracking-wider uppercase">
        {title}
      </h3>
      <p className="text-xs text-black/60 dark:text-[#94A3B8] mt-1.5 max-w-sm leading-relaxed font-medium">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={onAction}
            className="rounded-none bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity shadow-sm"
          >
            {actionIcon && <span className="mr-1">{actionIcon}</span>}
            <span className="uppercase font-bold tracking-wider text-[11px]">{actionLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

