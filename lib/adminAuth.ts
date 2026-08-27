import { StudentProfile } from './types';

// List of Super Admin email addresses
// Any email listed here or having profile.role === 'super_admin' will get full access
export const SUPER_ADMIN_EMAILS = [
  'nihalkumar',
  'admin@academisync.app',
  'nihalkumar5@gmail.com',
  'nihal@iiitnr.edu.in',
  // You can also add dynamic environment variable admin emails
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [])
];

export function isUserSuperAdmin(profile?: Partial<StudentProfile> | null, email?: string | null): boolean {
  if (profile?.role === 'super_admin') return true;

  const checkEmail = (email || profile?.email || '').trim().toLowerCase();
  if (!checkEmail) return false;

  // Check direct email match or username match
  return SUPER_ADMIN_EMAILS.some(adminEmail => {
    const admin = adminEmail.trim().toLowerCase();
    return checkEmail === admin || checkEmail.startsWith(admin + '@') || checkEmail.includes(admin);
  });
}

export function isUserClassRepresentative(profile?: Partial<StudentProfile> | null): boolean {
  if (profile?.role === 'super_admin' || profile?.role === 'cr') return true;
  return false;
}
