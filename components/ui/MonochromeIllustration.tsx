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
          viewBox="0 0 512 512"
          fill="none"
          className={`text-black dark:text-white ${className}`}
          role="img"
        >
          {/* Calendar */}
          <g transform="translate(96 48)">
            <rect x="34" y="28" width="252" height="205" rx="12" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M34 82H286" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>

            {/* Binding rings */}
            <path d="M88 48V12C88 5 93 0 100 0s12 5 12 12v36" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M208 48V12C208 5 213 0 220 0s12 5 12 12v36" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>

            {/* Calendar marks */}
            <path d="M78 116h34M143 116h34M208 116h34" className="text-black/50 dark:text-white/50" stroke="currentColor" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M78 151h34M143 151h34M208 151h34" className="text-black/50 dark:text-white/50" stroke="currentColor" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M78 186h34M143 186h34M208 186h34" className="text-black/50 dark:text-white/50" stroke="currentColor" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>

            {/* crossed-out class / schedule */}
            <path d="M137 104l58 62M195 104l-58 62" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
          </g>

          {/* Small relaxed coffee cup / break cue */}
          <g transform="translate(82 278)">
            <path d="M12 22h82l-7 62c-2 17-16 28-34 28H53c-18 0-32-11-34-28z" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M94 36h21c17 0 25 11 22 25-3 14-14 21-30 21h-9" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M31 7c0-10 8-16 8-24M55 7c0-10 8-16 8-24M79 7c0-10 8-16 8-24" className="text-black/50 dark:text-white/50" stroke="currentColor" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>
          </g>

          {/* Tiny sparkle */}
          <g transform="translate(358 306)" stroke="currentColor" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M0-20v40M-20 0h40"/>
            <path d="M-11-11l22 22M11-11L-11 11" opacity=".35"/>
          </g>

          {/* Decorative dots */}
          <circle cx="398" cy="394" r="5" fill="currentColor"/>
          <circle cx="118" cy="401" r="4" fill="currentColor"/>
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
