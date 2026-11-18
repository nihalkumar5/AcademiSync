import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { AttendanceError, consumeQuota } from '@/lib/server/attendanceService';
import { checkIn, openForMe } from '@/lib/server/attendanceLive';

export const dynamic = 'force-dynamic';

// The student's side of QR check-in: scan a code, or ask whether a check-in is open right now.
// All checks live in lib/server/attendanceLive.ts; this file only handles HTTP. Never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' };
const fail = (status: number, error: string, code?: string) => NextResponse.json({ success: false, error, code }, { status, headers: NO_STORE });
const handle = (where: string, err: unknown) => {
  if (err instanceof AttendanceError) return fail(err.status, err.message, err.code);
  logServerError(where, err);
  return fail(500, 'Something went wrong. Try again.', 'error');
};

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in to check in', 'unauthenticated');
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail(400, "This isn't an attendance QR", 'invalid');
    await consumeQuota(adminDb, user.uid, 'checkin');
    const result = await checkIn(adminDb, { uid: user.uid, email: user.email }, body.code, body.device);
    return NextResponse.json({ success: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    return handle('attendance checkin POST', err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in to check in', 'unauthenticated');
    const open = await openForMe(adminDb, { uid: user.uid, email: user.email });
    return NextResponse.json({ success: true, open }, { headers: NO_STORE });
  } catch (err) {
    return handle('attendance checkin GET', err);
  }
}
