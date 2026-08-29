'use client';

import React from 'react';

export type IllustrationType = 'holiday' | 'no-classes' | 'no-homework' | 'backpack' | 'exam' | 'calendar' | 'teamwork';

interface MonochromeIllustrationProps {
  type: IllustrationType;
  className?: string;
  size?: number;
}

export const MonochromeIllustration: React.FC<MonochromeIllustrationProps> = ({
  type,
  className = "",
  size = 64,
}) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    className: `text-black/80 dark:text-white/80 stroke-[1.25] ${className}`,
  };

  switch (type) {
    case 'holiday':
      return (
        <svg {...props}>
          {/* Sun */}
          <circle cx="16.5" cy="7.5" r="2.5" strokeDasharray="2 1.5" />
          
          {/* Clouds */}
          <path d="M4.5 9.5a1.5 1.5 0 011.5-1.5h.5a2 2 0 013.5-1 2 2 0 012.5 2.5v.5h-8z" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Palm trees */}
          <path d="M7 21c1.5-4.5 4-7.5 7-7.5M11 21c.5-3 2-5 4-5.5" strokeLinecap="round" />
          <path d="M14 13.5c-1-2.5-3.5-3.5-6-3" strokeLinecap="round" />
          <path d="M14 13.5c.5-2.5-1-5-3-6" strokeLinecap="round" />
          <path d="M14 13.5c2.5-1.5 3-4 2.5-6.5" strokeLinecap="round" />
          <path d="M14 13.5c2.5.5 5 0 6.5-1.5" strokeLinecap="round" />
          
          {/* Waves */}
          <path d="M2 20c1-.5 2-.5 3 0s2 .5 3 0 2-.5 3 0 2 .5 3 0 2-.5 3 0 2 .5 3 0" strokeLinecap="round" />
        </svg>
      );

        case 'no-classes':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 128 128"
          fill="none"
          stroke="currentColor"
          className={`text-black/80 dark:text-white/80 ${className}`}
        >
          <rect x="22" y="30" width="84" height="76" rx="4" strokeWidth="5"/>
          <path d="M22 50H106" strokeWidth="5"/>
          <path d="M40 20V38M88 20V38" strokeWidth="7" strokeLinecap="round"/>
          <path d="M47 69C50 64 55 61 61 61C70 61 77 68 77 77C77 86 70 93 61 93C55 93 50 90 47 85" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M54 72V82M67 72V82" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M84 63L96 51M88 51H96V59" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case 'no-homework':
      return (
        <svg {...props}>
          {/* Paper airplane soaring freely */}
          <path d="M3 11l18-7.5-7.5 18-2.5-7.5-8-3z" strokeLinejoin="round" />
          <path d="M21 3.5L11 13.5M11 13.5v5l2.5-3.5" strokeLinejoin="round" />
          {/* Wind loops / loops of achievement */}
          <path d="M3 18.5c1-1 3-1.5 5-.5s4 3 6 2 3.5-2 4.5-3.5" strokeDasharray="3 2" strokeLinecap="round" />
        </svg>
      );

    case 'backpack':
      return (
        <svg {...props}>
          {/* Beautiful sketch backpack */}
          <path d="M7 9.5a5 5 0 0110 0v9a2 2 0 01-2 2H9a2 2 0 01-2-2v-9z" strokeLinejoin="round" />
          <path d="M10 5a2 2 0 014 0v2.5H10V5z" strokeLinejoin="round" />
          <path d="M9 14.5h6v4.5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4.5z" strokeLinejoin="round" />
          <path d="M7 11.5h10M12 7.5v2" strokeLinecap="round" />
        </svg>
      );

    case 'exam':
      return (
        <svg {...props}>
          {/* Calendar Checkboard / Exam schedule */}
          <rect x="5" y="5.5" width="14" height="13.5" rx="1.5" />
          <path d="M5 9.5h14M9 3.5v3M15 3.5v3" strokeLinecap="round" />
          <path d="M9.5 14l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...props}>
          {/* Minimal desk calendar */}
          <path d="M4 7.5a1.5 1.5 0 011.5-1.5h13a1.5 1.5 0 011.5 1.5v11a1.5 1.5 0 01-1.5 1.5h-13a1.5 1.5 0 01-1.5-1.5v-11z" />
          <path d="M4 11.5h16M8 4.5v3M16 4.5v3" strokeLinecap="round" />
          {/* Little calendar grids */}
          <circle cx="8" cy="14.5" r="0.5" fill="currentColor" />
          <circle cx="12" cy="14.5" r="0.5" fill="currentColor" />
          <circle cx="16" cy="14.5" r="0.5" fill="currentColor" />
          <circle cx="8" cy="17.5" r="0.5" fill="currentColor" />
          <circle cx="12" cy="17.5" r="0.5" fill="currentColor" />
        </svg>
      );

    
    case 'teamwork':
      return (
        <svg {...props}>
          {/* Two people high fiving (minimalist) */}
          <circle cx="8" cy="8" r="2.5" />
          <circle cx="16" cy="8" r="2.5" />
          {/* Bodies */}
          <path d="M5 18c0-3 1.5-5 3-5s3 2 3 5" strokeLinecap="round" />
          <path d="M19 18c0-3-1.5-5-3-5s-3 2-3 5" strokeLinecap="round" />
          {/* High five arms */}
          <path d="M9 13l3-4 3 4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Action lines */}
          <path d="M12 6v-1M10.5 7l-1-1M13.5 7l1-1" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
};
