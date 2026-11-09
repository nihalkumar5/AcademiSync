import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { loadMyAttendance } from '@/lib/server/studentAttendance';

export const dynamic = 'force-dynamic';

// A student's own attendance, from the class lists their teachers keep in the app.
// Read-only, own record only (see lib/server/studentAttendance.ts). Never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' };

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Sign in to see your attendance', code: 'unauthenticated' }, { status: 401, headers: NO_STORE });
    }
    const attendance = await loadMyAttendance(adminDb, user.uid);
    return NextResponse.json({ success: true, attendance }, { headers: NO_STORE });
  } catch (err) {
    logServerError('attendance student GET', err);
    return NextResponse.json({ success: false, error: "Couldn't load your attendance. Try again." }, { status: 500, headers: NO_STORE });
  }
}
