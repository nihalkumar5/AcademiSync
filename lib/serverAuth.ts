import { adminAuth, adminDb } from './firebase-admin';
import { SUPER_ADMIN_EMAILS } from './adminAuth';

export interface VerifiedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>`.
 * Returns null when the header is missing or the token is invalid/expired.
 * Never trust a userId from the request body or headers — use this instead.
 */
export async function getVerifiedUser(req: Request): Promise<VerifiedUser | null> {
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;

  const token = header.substring(7).trim();
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ? String(decoded.email).trim().toLowerCase() : null,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}

/** Email-based super admin check. Only counts emails that Firebase has verified. */
export function isVerifiedAdminEmail(user: VerifiedUser | null): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.trim().toLowerCase() === user.email);
}

/**
 * Super admin = verified admin email OR profile.role === 'super_admin' in Firestore
 * (role changes to super_admin are locked down by firestore.rules).
 */
export async function isSuperAdminUser(user: VerifiedUser | null): Promise<boolean> {
  if (!user) return false;
  if (isVerifiedAdminEmail(user)) return true;

  try {
    const snap = await adminDb.collection('users').doc(user.uid).get();
    return snap.exists && snap.data()?.profile?.role === 'super_admin';
  } catch {
    return false;
  }
}
