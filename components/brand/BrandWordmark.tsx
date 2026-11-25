import React from 'react';
import { BRAND } from '@/lib/brand';

// The app's name wherever it appears as a logo. Intersemester builds show the "intersemester"
// wordmark; college builds show the college logo with the product name.

export const BrandLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) =>
  BRAND.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={BRAND.logo} alt="" width={size} height={size} draggable={false} className={`shrink-0 rounded-full bg-white select-none ${className}`} style={{ width: size, height: size }} />
  ) : null;

export const BrandWordmark: React.FC<{
  /** Text size in px; the logo scales with it */
  size?: number;
  /** Muted second half of the Intersemester wordmark */
  softOpacity?: number;
  className?: string;
}> = ({ size = 22, softOpacity = 0.8, className = '' }) => {
  if (BRAND.logo) {
    return (
      <span className={`inline-flex items-center gap-2 leading-none ${className}`} aria-label={BRAND.name}>
        <BrandLogo size={Math.round(size * 1.35)} />
        <span className="font-semibold tracking-[-0.02em]" style={{ fontSize: Math.round(size * 0.82) }}>
          {BRAND.name}
        </span>
      </span>
    );
  }
  return (
    <span className={`leading-none tracking-tighter font-sans ${className}`} style={{ fontSize: size }} aria-label="intersemester">
      <span className="font-extrabold">inter</span>
      <span className="font-normal" style={{ opacity: softOpacity }}>semester</span>
    </span>
  );
};

/** "Powered by Intersemester", only on college builds */
export const PoweredBy: React.FC<{ className?: string }> = ({ className = '' }) =>
  BRAND.poweredBy ? (
    <p className={`text-[12px] text-muted inline-flex items-center gap-1 ${className}`}>
      Powered by
      <span className="text-fg tracking-tighter">
        <span className="font-extrabold">inter</span>
        <span className="opacity-80">semester</span>
      </span>
    </p>
  ) : null;
