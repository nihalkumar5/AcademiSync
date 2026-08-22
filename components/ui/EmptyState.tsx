'use client';

import React, { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-none border-2 border-dashed border-black dark:border-white bg-transparent my-4">
      <div className="w-12 h-12 flex items-center justify-center border-2 border-black dark:border-white mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold uppercase tracking-widest text-black dark:text-white">
        {title}
      </h3>
      <p className="text-xs text-black/70 dark:text-white/70 mt-2 max-w-sm font-bold">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="secondary" size="sm" onClick={onAction} className="rounded-none border-2 border-black dark:border-white shadow-[2px_2px_0_rgba(0,0,0,1)] dark:shadow-[2px_2px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none uppercase font-bold tracking-widest">
            {actionIcon && <span className="mr-2">{actionIcon}</span>}
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
