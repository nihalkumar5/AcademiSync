export interface CardTheme {
  name: string;
  bg: string;
  darkBg: string;
  accent: string;
  darkAccent?: string;
  badgeBg: string;
  badgeText: string;
  border?: string;
}

export const PASTEL_THEMES: Record<string, CardTheme> = {
  mint: {
    name: 'Mint',
    bg: '#E5F4EF',
    darkBg: '#0F241E',
    accent: '#18A889',
    darkAccent: '#34D399',
    badgeBg: '#D2F1E8',
    badgeText: '#18A889',
    border: '#CBEBE0',
  },
  blue: {
    name: 'Periwinkle Blue',
    bg: '#E8EDFF',
    darkBg: '#12182B',
    accent: '#334CC4',
    darkAccent: '#93C5FD',
    badgeBg: '#DCE4FF',
    badgeText: '#334CC4',
    border: '#D3DCFF',
  },
  peach: {
    name: 'Warm Peach',
    bg: '#FFF3EE',
    darkBg: '#241612',
    accent: '#C85F3D',
    darkAccent: '#FB923C',
    badgeBg: '#FCE0D5',
    badgeText: '#C85F3D',
    border: '#F5D8CC',
  },
  lavender: {
    name: 'Lavender',
    bg: '#F0EAFB',
    darkBg: '#1E172B',
    accent: '#8067B5',
    darkAccent: '#C084FC',
    badgeBg: '#E4D8F8',
    badgeText: '#8067B5',
    border: '#E1D3F7',
  },
  yellow: {
    name: 'Amber Yellow',
    bg: '#F8F0D8',
    darkBg: '#262112',
    accent: '#C99A32',
    darkAccent: '#FBBF24',
    badgeBg: '#F5E4B5',
    badgeText: '#C99A32',
    border: '#EDDFAF',
  },
  rose: {
    name: 'Rose Pink',
    bg: '#FCEBED',
    darkBg: '#261216',
    accent: '#C94B5C',
    darkAccent: '#F472B6',
    badgeBg: '#FAD3D9',
    badgeText: '#C94B5C',
    border: '#F5CBD1',
  },
  emerald: {
    name: 'Emerald Green',
    bg: '#E7F7ED',
    darkBg: '#0D2115',
    accent: '#15803D',
    darkAccent: '#4ADE80',
    badgeBg: '#D4F0DF',
    badgeText: '#15803D',
    border: '#C6EAD3',
  },
  cyan: {
    name: 'Ocean Cyan',
    bg: '#E0F2FE',
    darkBg: '#0B1E2E',
    accent: '#0284C7',
    darkAccent: '#38BDF8',
    badgeBg: '#BAE6FD',
    badgeText: '#0284C7',
    border: '#B9E2FC',
  },
  indigo: {
    name: 'Electric Indigo',
    bg: '#EEF2FF',
    darkBg: '#16172E',
    accent: '#4F46E5',
    darkAccent: '#A5B4FC',
    badgeBg: '#E0E7FF',
    badgeText: '#4F46E5',
    border: '#D8DEFC',
  },
  slate: {
    name: 'Slate Charcoal',
    bg: '#F1F5F9',
    darkBg: '#191E24',
    accent: '#475569',
    darkAccent: '#94A3B8',
    badgeBg: '#E2E8F0',
    badgeText: '#475569',
    border: '#CBD5E1',
  },
};

export const THEME_KEYS = [
  'mint',
  'blue',
  'peach',
  'lavender',
  'yellow',
  'rose',
  'emerald',
  'cyan',
  'indigo',
  'slate',
] as const;

/**
 * Deterministically pick a pastel theme based on subject name/code/id
 */
export function getSubjectThemeKey(nameOrCodeOrId: string = ''): typeof THEME_KEYS[number] {
  let hash = 0;
  const str = (nameOrCodeOrId || '').toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % THEME_KEYS.length;
  return THEME_KEYS[index];
}

/**
 * Convert any 3/6-digit hex or color string to an elegant pastel CardTheme
 */
export function generatePastelThemeFromHex(rawColor: string, name: string = 'Custom'): CardTheme {
  const cleanHex = (rawColor || '').trim().toLowerCase();
  if (!cleanHex) return PASTEL_THEMES.blue;

  // 1. Direct match with PASTEL_THEMES keys or accent/bg
  for (const key of Object.keys(PASTEL_THEMES)) {
    const t = PASTEL_THEMES[key];
    if (
      cleanHex === key ||
      cleanHex === t.accent.toLowerCase() ||
      cleanHex === t.bg.toLowerCase() ||
      cleanHex === t.name.toLowerCase()
    ) {
      return t;
    }
  }

  // 2. Known aliases for old hex codes or color names
  if (['#d9795f', '#ea580c', '#f97316', '#ff7849', '#f9e9e3', 'orange', 'peach'].includes(cleanHex)) {
    return PASTEL_THEMES.peach;
  }
  if (['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#3045b8', 'blue', 'periwinkle'].includes(cleanHex)) {
    return PASTEL_THEMES.blue;
  }
  if (['#10b981', '#059669', '#159a78', '#34d399', '#14b8a6', '#0d9488', 'green', 'mint', 'teal'].includes(cleanHex)) {
    return PASTEL_THEMES.mint;
  }
  if (['#8b5cf6', '#7c3aed', '#a855f7', '#9333ea', '#7661c9', 'purple', 'violet', 'lavender'].includes(cleanHex)) {
    return PASTEL_THEMES.lavender;
  }
  if (['#f59e0b', '#d97706', '#eab308', '#ca8a04', 'yellow', 'amber'].includes(cleanHex)) {
    return PASTEL_THEMES.yellow;
  }
  if (['#ef4444', '#dc2626', '#f43f5e', '#e11d48', '#ec4899', '#db2777', 'red', 'pink', 'rose'].includes(cleanHex)) {
    return PASTEL_THEMES.rose;
  }
  if (['#06b6d4', '#0891b2', '#38bdf8', '#0284c7', 'cyan', 'sky'].includes(cleanHex)) {
    return PASTEL_THEMES.cyan;
  }
  if (['#6366f1', '#4f46e5', '#4338ca', 'indigo'].includes(cleanHex)) {
    return PASTEL_THEMES.indigo;
  }
  if (['#64748b', '#475569', '#334155', '#71717a', '#7c897a', '#78716c', 'slate', 'gray', 'grey'].includes(cleanHex)) {
    return PASTEL_THEMES.slate;
  }

  // 3. If hex string, dynamically calculate pastel tint
  const hexOnly = cleanHex.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hexOnly)) {
    const r = parseInt(hexOnly.slice(0, 2), 16);
    const g = parseInt(hexOnly.slice(2, 4), 16);
    const b = parseInt(hexOnly.slice(4, 6), 16);

    return {
      name,
      accent: `#${hexOnly}`,
      bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
      darkBg: `rgba(${r}, ${g}, ${b}, 0.20)`,
      badgeBg: `rgba(${r}, ${g}, ${b}, 0.22)`,
      badgeText: `#${hexOnly}`,
      border: `rgba(${r}, ${g}, ${b}, 0.28)`,
    };
  }

  return PASTEL_THEMES.blue;
}

/**
 * Harmonic sequence of theme keys specifically tuned so that consecutive subjects
 * have maximum pleasant contrast and zero visual clash.
 */
export const HARMONIC_COLOR_SEQUENCE: typeof THEME_KEYS[number][] = [
  'blue',      // Periwinkle Blue (#334CC4)
  'peach',     // Warm Peach (#C85F3D)
  'mint',      // Mint Green (#18A889)
  'lavender',  // Lavender (#8067B5)
  'emerald',   // Emerald Green (#15803D)
  'yellow',    // Amber Yellow (#C99A32)
  'cyan',      // Ocean Cyan (#0284C7)
  'rose',      // Rose Pink (#C94B5C)
  'indigo',    // Electric Indigo (#4F46E5)
  'slate',     // Slate Charcoal (#475569)
];

/**
 * Intelligent color selector for a single subject based on its academic type & attributes
 */
export function getHarmonicColorForSubject(subject: {
  name: string;
  code?: string;
  isLab?: boolean;
}, usedColors: string[] = []): string {
  const nameLower = (subject.name || '').toLowerCase();
  const codeLower = (subject.code || '').toLowerCase();

  // 1. Labs always get Mint or Emerald for crystal-clear practical distinction
  if (subject.isLab || nameLower.includes('lab') || nameLower.includes('practical') || codeLower.includes('lab')) {
    if (!usedColors.includes(PASTEL_THEMES.mint.accent)) {
      return PASTEL_THEMES.mint.accent;
    }
    if (!usedColors.includes(PASTEL_THEMES.emerald.accent)) {
      return PASTEL_THEMES.emerald.accent;
    }
    return PASTEL_THEMES.mint.accent;
  }

  // 2. Electives / Open / Special get Lavender or Indigo
  if (nameLower.includes('elective') || nameLower.includes('special') || nameLower.includes('seminar') || nameLower.includes('minor')) {
    if (!usedColors.includes(PASTEL_THEMES.lavender.accent)) {
      return PASTEL_THEMES.lavender.accent;
    }
    if (!usedColors.includes(PASTEL_THEMES.indigo.accent)) {
      return PASTEL_THEMES.indigo.accent;
    }
  }

  // 3. Mathematical / Statistical / Electronic topics
  if (nameLower.includes('math') || nameLower.includes('stat') || nameLower.includes('signal') || nameLower.includes('circuit') || nameLower.includes('digital')) {
    if (!usedColors.includes(PASTEL_THEMES.peach.accent)) {
      return PASTEL_THEMES.peach.accent;
    }
    if (!usedColors.includes(PASTEL_THEMES.yellow.accent)) {
      return PASTEL_THEMES.yellow.accent;
    }
  }

  // 4. Core Algorithms / Systems / Network / Data
  if (nameLower.includes('data') || nameLower.includes('algorithm') || nameLower.includes('structure') || nameLower.includes('network') || nameLower.includes('os') || nameLower.includes('system') || nameLower.includes('database') || nameLower.includes('dbms')) {
    if (!usedColors.includes(PASTEL_THEMES.blue.accent)) {
      return PASTEL_THEMES.blue.accent;
    }
    if (!usedColors.includes(PASTEL_THEMES.cyan.accent)) {
      return PASTEL_THEMES.cyan.accent;
    }
  }

  // 5. Pick the first unused color from the harmonic sequence
  for (const key of HARMONIC_COLOR_SEQUENCE) {
    const accent = PASTEL_THEMES[key].accent;
    if (!usedColors.includes(accent)) {
      return accent;
    }
  }

  // Fallback to deterministic hash
  const key = getSubjectThemeKey(subject.name || subject.code || '');
  return PASTEL_THEMES[key].accent;
}

/**
 * Assigns harmonic non-colliding colors across an entire array of subjects
 */
export function autoAssignHarmonicColorsToSubjects<T extends { name: string; code?: string; isLab?: boolean; color?: string; isCustomColor?: boolean }>(subjects: T[]): T[] {
  const usedColors: string[] = [];

  return subjects.map((sub) => {
    // If subject was explicitly customized by user, NEVER override it
    if (sub.isCustomColor && sub.color && sub.color.trim()) {
      usedColors.push(sub.color);
      return sub;
    }

    // If subject has a legacy dull default color (e.g. #000000, muddy slate #7c897a, etc.)
    const cleanCol = (sub.color || '').toLowerCase().trim();
    const isLegacyDefault = !cleanCol || ['#000000', '#7c897a', '#7a8b99', '#9c8e80', '#b88b8c', '#c79f6f', '#c08a76', '#71717a'].includes(cleanCol);
    
    let chosenColor = sub.color;
    if (isLegacyDefault || !chosenColor) {
      chosenColor = getHarmonicColorForSubject(sub, usedColors);
    }

    usedColors.push(chosenColor);
    return {
      ...sub,
      color: chosenColor,
    };
  });
}

/**
 * Returns the card theme for any given subject or session.
 */
export function getSubjectCardTheme(options: {
  subjectName?: string;
  subjectCode?: string;
  subjectColor?: string;
  isLab?: boolean;
  isCancelled?: boolean;
  isRescheduled?: boolean;
  isSpecial?: boolean;
}): CardTheme {
  const { subjectName, subjectCode, subjectColor, isLab, isCancelled, isRescheduled, isSpecial } = options;

  if (isCancelled) {
    return PASTEL_THEMES.rose;
  }

  if (isRescheduled) {
    return PASTEL_THEMES.peach;
  }

  // Explicit Subject Color from Subject Directory has highest priority
  if (subjectColor && subjectColor.trim()) {
    return generatePastelThemeFromHex(subjectColor);
  }

  if (isLab) {
    return PASTEL_THEMES.mint;
  }

  if (isSpecial) {
    return PASTEL_THEMES.lavender;
  }

  // Otherwise pick deterministically from name or code so every subject has its unique color
  const key = getSubjectThemeKey(subjectName || subjectCode || '');
  return PASTEL_THEMES[key];
}

export interface TaskTheme {
  bg: string;
  darkBg: string;
  border: string;
  accent: string;
  numberColor: string;
}

export function getTaskCardTheme(options: {
  isDone?: boolean;
  isOverdue?: boolean;
  isInProgress?: boolean;
  priority?: 'High' | 'Medium' | 'Low' | string;
}): TaskTheme {
  const { isDone, isOverdue, isInProgress, priority } = options;

  if (isDone) {
    return {
      bg: '#E5F4EF',
      darkBg: '#0F241E',
      border: '#CBEBE0',
      accent: '#18A889',
      numberColor: '#CEE8DE',
    };
  }

  if (isOverdue) {
    return {
      bg: '#FCEBED',
      darkBg: '#261216',
      border: '#F5CBD1',
      accent: '#C94B5C',
      numberColor: '#F3CCD2',
    };
  }

  if (priority === 'High') {
    return {
      bg: '#FFF0E8',
      darkBg: '#241612',
      border: '#F5D8CC',
      accent: '#C96B45',
      numberColor: '#F3D5C8',
    };
  }

  if (isInProgress) {
    return {
      bg: '#E8EDFF',
      darkBg: '#12182B',
      border: '#D3DCFF',
      accent: '#334CC4',
      numberColor: '#D4DCFA',
    };
  }

  // Normal Task (Default Lavender)
  return {
    bg: '#F3F0FF',
    darkBg: '#1C172B',
    border: '#E5E0F2',
    accent: '#8067B5',
    numberColor: '#D9D4EF',
  };
}

