'use client';

import React, { useMemo } from 'react';
import { qrMatrix } from '@/lib/qr';

/** QR code as crisp SVG (dark modules on white, with the required quiet zone). */
export const QrCode: React.FC<{ value: string; size?: number; className?: string }> = ({ value, size = 220, className }) => {
  const m = useMemo(() => qrMatrix(value), [value]);
  const q = 4;
  const n = m.length + q * 2;
  let d = '';
  m.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x + q} ${y + q}h1v1h-1z`)));
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} className={className} shapeRendering="crispEdges" role="img" aria-label="QR code">
      <rect width={n} height={n} fill="#FFFFFF" />
      <path d={d} fill="#111111" />
    </svg>
  );
};
