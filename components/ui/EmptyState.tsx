'use client';

import React, { ReactNode } from 'react';
import { Button } from './Button';
import { Illustration, IllustrationName } from './Illustration';

export interface EmptyStateProps {
  icon?: ReactNode;
  /** Hand-drawn spot illustration; shown instead of the icon box */
  illustration?: IllustrationName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
  /** Short handwritten aside, for warm moments only (e.g. everything done) */
  note?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = "",
  note,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 my-4 border border-dashed border-line ${className}`}>
      {illustration ? (
        <Illustration name={illustration} className="mb-f4 h-[180px] w-auto max-w-[260px]" />
      ) : icon && (
        <div className="mb-4 w-14 h-14 flex items-center justify-center bg-surface-2 border border-line-soft text-fg">
          {icon}
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-fg tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-[14px] text-muted max-w-[300px] leading-relaxed">
        {description}
      </p>
      {note && (
        <p className="mt-3 font-cursive text-[22px] leading-tight font-semibold text-fg -rotate-2">
          {note}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-5">
          {actionIcon}
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

