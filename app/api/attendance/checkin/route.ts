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

// A student scans once or twice a lecture. Counting that in the database would add a transaction
// to every scan, so each server counts in memory, and only someone sending far more than a person
// can (a script) also hits the durable limit shared by all servers.
const recent = new Map<string, number[]>();
const BURST = { max: 8, windowMs: 60_000 };
const overBurst = (uid: string) => {
  const now = Date.now();
  const list = (recent.get(uid) || []).filter((t) => now - t < BURST.windowMs);
  list.push(now);
  recent.set(uid, list);
  if (recent.size > 5000) recent.delete(recent.keys().next().value as string);
  return list.length > BURST.max;
};

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in to check in', 'unauthenticated');
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail(400, "This isn't an attendance QR", 'invalid');
    if (overBurst(user.uid)) await consumeQuota(adminDb, user.uid, 'checkin');
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
    const open = await openForMe(adminDb, { uid: user.uid, email: user.email }, new URL(req.url).searchParams.get('batchKey'));
    return NextResponse.json({ success: true, open }, { headers: NO_STORE });
  } catch (err) {
    return handle('attendance checkin GET', err);
  }
}
