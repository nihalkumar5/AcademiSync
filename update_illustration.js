const fs = require('fs');
let code = fs.readFileSync('components/ui/MonochromeIllustration.tsx', 'utf8');

const oldNoClassesStart = `case 'no-classes':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 128 128"`;

const oldNoClassesEnd = `</svg>
      );`;

// We need to extract the entire case block to replace it.
const regex = /case 'no-classes':[\s\S]*?<\/svg>\n\s*\);/;

const newNoClasses = `case 'no-classes':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 512 512"
          fill="none"
          className={\`text-black dark:text-white \${className}\`}
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
      );`;

code = code.replace(regex, newNoClasses);

fs.writeFileSync('components/ui/MonochromeIllustration.tsx', code);
