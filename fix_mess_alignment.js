const fs = require('fs');

// Fix MessOnboarding.tsx
let onboardingCode = fs.readFileSync('components/mess/MessOnboarding.tsx', 'utf8');
onboardingCode = onboardingCode.replace(
  'className="flex flex-col max-w-lg mx-auto w-full pt-4 pb-12 px-4 min-h-[calc(100vh-80px)]"',
  'className="flex flex-col w-full pt-4 pb-12 sm:px-0 min-h-[calc(100vh-80px)] text-left"'
);
onboardingCode = onboardingCode.replace(
  'className="flex flex-col flex-1 max-w-4xl mx-auto w-full pt-2 sm:pt-6 pb-16"',
  'className="flex flex-col flex-1 w-full pt-2 sm:pt-6 pb-16"'
);
fs.writeFileSync('components/mess/MessOnboarding.tsx', onboardingCode);

// Fix MessView.tsx
let viewCode = fs.readFileSync('components/mess/MessView.tsx', 'utf8');
viewCode = viewCode.replace(
  'className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12"',
  'className="flex flex-col gap-6 w-full pb-12 text-left"'
);
fs.writeFileSync('components/mess/MessView.tsx', viewCode);
