'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Card surface: white / #121317, 1px line border, sharp corners, 21px padding.
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { padded?: boolean; quiet?: boolean }> = ({
  padded = true,
  quiet,
  className,
  ...props
}) => <div className={twMerge(clsx(quiet ? 'card-quiet' : 'card', padded && 'card-pad', className))} {...props} />;

// Section header: 17px title, optional muted meta and one action on the right.
export const SectionHeader: React.FC<{ title: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({
  title,
  meta,
  action,
  className,
}) => (
  <div className={twMerge('flex items-center justify-between gap-3 mb-f3', className)}>
    <div className="min-w-0 flex items-baseline gap-2">
      <h3 className="section-title truncate">{title}</h3>
      {meta && <span className="meta shrink-0">{meta}</span>}
    </div>
    {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
  </div>
);

// List row: 56px minimum, divider below. Renders a button when onClick is given.
export const ListRow: React.FC<{
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ leading, title, subtitle, trailing, onClick, className }) => {
  const inner = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-fg truncate">{title}</span>
        {subtitle && <span className="block mt-0.5 text-[13px] text-muted truncate">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 flex items-center gap-2">{trailing}</span>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={twMerge('list-row', className)}>
      {inner}
    </button>
  ) : (
    <div className={twMerge('list-row', className)}>{inner}</div>
  );
};
