import { auth } from './firebase';

/**
 * Request headers carrying the signed-in user's Firebase ID token, so API routes
 * can verify who is calling. Falls back to plain JSON headers when signed out.
 */
export async function getAuthHeaders(
  extra: Record<string, string> = { 'Content-Type': 'application/json' }
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  try {
    const idToken = await auth?.currentUser?.getIdToken();
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  } catch (err) {
    console.warn('Could not attach auth token:', err);
  }
  return headers;
}
