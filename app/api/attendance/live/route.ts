import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { AttendanceError, consumeQuota, loadProfile } from '@/lib/server/attendanceService';
import { closeLive, openLive, pollLive } from '@/lib/server/attendanceLive';

export const dynamic = 'force-dynamic';

// The teacher's side of QR check-in: open it for a lecture, see who has scanned, close it.
// All checks live in lib/server/attendanceLive.ts; this file only handles HTTP. Never cached.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' };
const ok = (body: Record<string, unknown>) => NextResponse.json({ success: true, ...body }, { headers: NO_STORE });
const fail = (status: number, error: string, code?: string) => NextResponse.json({ success: false, error, code }, { status, headers: NO_STORE });
const handle = (where: string, err: unknown) => {
  if (err instanceof AttendanceError) return fail(err.status, err.message, err.code);
  logServerError(where, err);
  return fail(500, 'Something went wrong. Try again.');
};

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in again to see check-ins', 'unauthenticated');
    const p = new URL(req.url).searchParams;
    const since = Number(p.get('since') || 0);
    return ok(await pollLive(adminDb, { uid: user.uid, email: user.email }, p.get('id'), since));
  } catch (err) {
    return handle('attendance live GET', err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in again to take attendance', 'unauthenticated');
    const caller = { uid: user.uid, email: user.email };
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail(400, 'Invalid request');
    await consumeQuota(adminDb, caller.uid, 'write');

    switch (body.action) {
      case 'open': {
        const profile = await loadProfile(adminDb, caller.uid);
        const batchKey = typeof body.batchKey === 'string' ? body.batchKey.trim() : '';
        return ok(await openLive(adminDb, caller, profile, batchKey, body));
      }
      case 'close':
        return ok(await closeLive(adminDb, caller, body.id));
      default:
        return fail(400, 'Unknown action');
    }
  } catch (err) {
    return handle('attendance live POST', err);
  }
}
