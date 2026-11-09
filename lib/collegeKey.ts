import { getShortCollegeName } from './timetableUtils';

/** Stable key for a college name, so "IIIT Naya Raipur" and the full official name match. '' if unknown. */
export const collegeKeyOf = (name?: string | null): string => {
  const n = (name || '').trim();
  if (!n) return '';
  const key = getShortCollegeName(n).trim().toUpperCase();
  return key === 'COLLEGE' ? '' : key;
};
