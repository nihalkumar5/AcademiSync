import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import {
  AttendanceError,
  consumeQuota,
  deleteSession,
  getAll,
  getAudit,
  getBatch,
  getTrash,
  loadProfile,
  restoreSession,
  saveRoster,
  saveSession,
} from '@/lib/server/attendanceService';

export const dynamic = 'force-dynamic';

// All attendance reads/writes go through here (Admin SDK). The rules in lib/server/attendanceService.ts
// decide who may do what; this file only handles HTTP. Responses are never cached anywhere.
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
    if (!user) return fail(401, 'Sign in to see attendance', 'unauthenticated');
    const caller = { uid: user.uid, email: user.email };
    const p = new URL(req.url).searchParams;

    if (p.get('all') === '1') return ok(await getAll(adminDb, caller));
    if (p.get('trash') === '1') return ok({ items: await getTrash(adminDb, caller) });
    const batchKey = p.get('batchKey')?.trim() || '';
    if (p.get('audit') === '1') return ok({ items: await getAudit(adminDb, caller, batchKey, p.get('sessionId') || undefined) });
    return ok(await getBatch(adminDb, caller, batchKey));
  } catch (err) {
    return handle('attendance GET', err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in to take attendance', 'unauthenticated');
    const caller = { uid: user.uid, email: user.email };
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail(400, 'Invalid request');
    const batchKey = typeof body.batchKey === 'string' ? body.batchKey.trim() : '';

    await consumeQuota(adminDb, caller.uid, 'write');

    switch (body.action) {
      case 'saveRoster': {
        const profile = await loadProfile(adminDb, caller.uid);
        return ok({ roster: await saveRoster(adminDb, caller, profile, batchKey, body.roster, body.baseVersion) });
      }
      case 'saveSession': {
        const profile = await loadProfile(adminDb, caller.uid);
        return ok(await saveSession(adminDb, caller, profile, batchKey, body.session, body.baseVersion));
      }
      case 'deleteSession':
        await deleteSession(adminDb, caller, batchKey, body.id, body.baseVersion);
        return ok({});
      case 'restoreSession':
        return ok({ session: await restoreSession(adminDb, caller, batchKey, body.id) });
      default:
        return fail(400, 'Unknown action');
    }
  } catch (err) {
    return handle('attendance POST', err);
  }
}
