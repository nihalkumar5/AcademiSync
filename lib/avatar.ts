// Character avatars (DiceBear "notionists"). The stored value is either a curated preset id
// like "h41-Aanya-g" (hairstyle 41, face seed "Aanya", with glasses) or a legacy plain seed ("Felix").

// Someone who hasn't picked an avatar gets one of these friendly, smiling presets (instead of a random
// DiceBear face). The pick is stable per account, so classmates still look different in batch lists.
const DEFAULT_STUDENT_AVATARS = [
  'h33-Rohan', 'h41-Aanya', 'h05-Vihaan', 'h45-Riya', 'h01-Arjun', 'h28-Sana', 'h35-Vivaan', 'h47-Isha',
];
const DEFAULT_FACULTY_AVATARS = [
  'f-h05-b20-g3-Arun', 'f-h23-b13-Priya', 'f-h15-b06-g3-Nair', 'f-h39-b14-g3-Meena',
];

const hashString = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const getDefaultAvatarSeed = (id?: string | null, role?: string | null) => {
  const pool = role === 'faculty' ? DEFAULT_FACULTY_AVATARS : DEFAULT_STUDENT_AVATARS;
  return pool[hashString(id || 'default') % pool.length];
};

export const getAvatarSeed = (profile?: { avatarUrl?: string; id?: string; role?: string } | null) =>
  profile?.avatarUrl || getDefaultAvatarSeed(profile?.id, profile?.role);

const PRESET = /^h(\d{2})-([A-Za-z]+)(-g)?$/;
// Faculty presets: f-h<hair>-b<body>[-g<glasses>][-bd<beard>]-<face>, always without hand gestures
const FACULTY_PRESET = /^f-h(\d{2})-b(\d{2})(?:-g(\d{1,2}))?(?:-bd(\d{1,2}))?-([A-Za-z]+)$/;
const v = (n: string) => `variant${n.padStart(2, '0')}`;

export const getAvatarSrc = (seed: string) => {
  const base = 'https://api.dicebear.com/7.x/notionists/svg?backgroundColor=transparent';
  const f = FACULTY_PRESET.exec(seed);
  if (f) {
    const [, hair, body, glasses, beard, face] = f;
    return (
      `${base}&seed=${face}&hair=${v(hair)}&body=${v(body)}&gestureProbability=0` +
      (glasses ? `&glasses=${v(glasses)}&glassesProbability=100` : '&glassesProbability=0') +
      (beard ? `&beard=${v(beard)}&beardProbability=100` : '&beardProbability=0')
    );
  }
  const m = PRESET.exec(seed);
  if (!m) return `${base}&seed=${encodeURIComponent(seed)}`;
  const [, hair, face, glasses] = m;
  return (
    `${base}&seed=${face}&hair=variant${hair}&beardProbability=0` +
    `&glassesProbability=${glasses ? 100 : 0}`
  );
};

// Hairstyles picked by eye from notionists' 1–49 (higher numbers are not all valid)
const GIRLS = [
  'h41-Aanya', 'h23-Diya-g', 'h47-Isha', 'h36-Meera', 'h45-Riya', 'h10-Kavya-g',
  'h28-Sana', 'h39-Tara', 'h46-Zoya', 'h08-Nisha', 'h37-Anika-g', 'h48-Pari',
  'h02-Myra', 'h04-Ira-g', 'h41-Siya-g', 'h23-Neha',
];
const BOYS = [
  'h01-Arjun', 'h20-Kabir-g', 'h33-Rohan', 'h05-Vihaan', 'h44-Aditya', 'h17-Dev-g',
  'h29-Ishaan', 'h40-Kian', 'h22-Reyansh-g', 'h06-Aarav', 'h35-Vivaan', 'h13-Yash',
  'h25-Laksh-g', 'h43-Om', 'h09-Shaurya', 'h52-Neel',
];
// Earlier picks, kept so anyone who chose one still sees it selected
const CLASSIC = [
  'Felix', 'Oliver', 'Jack', 'Leo', 'Max', 'Sam', 'Tom', 'Alex', 'Ryan', 'David',
  'Mia', 'Lily', 'Zoe', 'Ava', 'Emma', 'Ruby', 'Sara', 'Maya', 'Luna', 'Cleo',
];

export const AVATAR_GROUPS: { label: string; seeds: string[] }[] = [
  { label: 'Girls', seeds: GIRLS },
  { label: 'Boys', seeds: BOYS },
  { label: 'Classic', seeds: CLASSIC },
];

// Faculty: formal wear (shirt and tie, blazer, collar, dupatta-style scarf), clear glasses,
// beards and moustaches, some grey hair, and no hand gestures.
const FACULTY_WOMEN = [
  'f-h48-b19-g3-Anita', 'f-h23-b13-Priya', 'f-h36-b05-g8-Sunita', 'f-h41-b19-Kavita',
  'f-h39-b14-g3-Meena', 'f-h28-b16-Lata', 'f-h10-b11-g8-Rekha', 'f-h48-b13-Usha',
  'f-h46-b09-g3-Neelam', 'f-h23-b19-g8-Asha', 'f-h36-b14-Shalini', 'f-h47-b16-g3-Pooja',
];
const FACULTY_MEN = [
  'f-h05-b20-g3-Arun', 'f-h42-b16-g8-bd3-Rao', 'f-h07-b13-Mehta', 'f-h13-b05-g3-bd10-Iyer',
  'f-h16-b14-bd2-Khan', 'f-h22-b09-g8-Verma', 'f-h25-b20-bd4-Singh', 'f-h15-b06-g3-Nair',
  'f-h07-b16-bd7-Gupta', 'f-h42-b13-g3-Sharma', 'f-h21-b14-g8-bd3-Das', 'f-h05-b05-bd10-Reddy',
];

export const FACULTY_AVATAR_GROUPS: { label: string; seeds: string[] }[] = [
  { label: 'Women', seeds: FACULTY_WOMEN },
  { label: 'Men', seeds: FACULTY_MEN },
  { label: 'Classic', seeds: CLASSIC },
];

export const AVATAR_SEEDS = AVATAR_GROUPS.flatMap((g) => g.seeds);
