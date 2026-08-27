import { StudentProfile } from './types';

// List of Super Admin email addresses
// Only specific authorized emails or users with profile.role === 'super_admin' will get full access
export const SUPER_ADMIN_EMAILS = [
  'nihal88758@gmail.com',
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [])
];

export function isUserSuperAdmin(profile?: Partial<StudentProfile> | null, email?: string | null): boolean {
  if (profile?.role === 'super_admin') return true;

  const checkEmail = (email || profile?.email || '').trim().toLowerCase();
  if (!checkEmail) return false;

  return SUPER_ADMIN_EMAILS.some(adminEmail => checkEmail === adminEmail.trim().toLowerCase());
}

export function isUserClassRepresentative(profile?: Partial<StudentProfile> | null): boolean {
  if (profile?.role === 'super_admin' || profile?.role === 'cr') return true;
  return false;
}
