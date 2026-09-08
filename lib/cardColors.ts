export interface CardTheme {
  name: string;
  bg: string;
  darkBg: string;
  accent: string;
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
    badgeBg: '#D2F1E8',
    badgeText: '#18A889',
    border: '#CBEBE0',
  },
  blue: {
    name: 'Periwinkle Blue',
    bg: '#E8EDFF',
    darkBg: '#12182B',
    accent: '#334CC4',
    badgeBg: '#DCE4FF',
    badgeText: '#334CC4',
    border: '#D3DCFF',
  },
  peach: {
    name: 'Peach',
    bg: '#F9E9E3',
    darkBg: '#261612',
    accent: '#D9795F',
    badgeBg: '#F8D8CF',
    badgeText: '#D9795F',
    border: '#F4D2C7',
  },
  lavender: {
    name: 'Lavender',
    bg: '#F0EAFB',
    darkBg: '#1E172B',
    accent: '#8067B5',
    badgeBg: '#E4D8F8',
    badgeText: '#8067B5',
    border: '#E1D3F7',
  },
  yellow: {
    name: 'Yellow',
    bg: '#F8F0D8',
    darkBg: '#262112',
    accent: '#C99A32',
    badgeBg: '#F5E4B5',
    badgeText: '#C99A32',
    border: '#EDDFAF',
  },
  rose: {
    name: 'Rose (Cancelled)',
    bg: '#FCEBED',
    darkBg: '#261216',
    accent: '#C94B5C',
    badgeBg: '#FAD3D9',
    badgeText: '#C94B5C',
    border: '#F5CBD1',
  },
};

export const THEME_KEYS = ['mint', 'blue', 'peach', 'lavender', 'yellow'] as const;

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

  if (isLab) {
    return PASTEL_THEMES.mint;
  }

  if (isSpecial) {
    return PASTEL_THEMES.lavender;
  }

  // Check if subjectColor directly matches one of our themes
  if (subjectColor) {
    for (const key of THEME_KEYS) {
      if (
        subjectColor.toLowerCase() === PASTEL_THEMES[key].accent.toLowerCase() ||
        subjectColor.toLowerCase() === PASTEL_THEMES[key].bg.toLowerCase() ||
        subjectColor.toLowerCase() === key
      ) {
        return PASTEL_THEMES[key];
      }
    }
  }

  // Otherwise pick deterministically from name or code so every subject has its unique color
  const key = getSubjectThemeKey(subjectName || subjectCode || '');
  return PASTEL_THEMES[key];
}
