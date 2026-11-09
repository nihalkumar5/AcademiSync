import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import {
  BridgeError,
  bridgeStatus,
  connectBridge,
  disconnectBridge,
  setAutoShare,
  setCourseSubject,
  shareItems,
  skipItems,
  syncBridge,
  unshareItem,
} from '@/lib/server/classroomBridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Google Classroom bridge for Batch Pilots. Every call is for the signed-in user only.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const fail = (err: unknown, where: string) => {
  if (err instanceof BridgeError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.status, headers: NO_STORE });
  }
  logServerError(where, err);
  return NextResponse.json({ success: false, error: 'Something went wrong. Try again.' }, { status: 500, headers: NO_STORE });
};
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[0-9A-Za-z_-]{1,120}$/.test(x)) : []);

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in first' }, { status: 401, headers: NO_STORE });
    const email = user.emailVerified ? user.email : null;
    return NextResponse.json({ success: true, ...(await bridgeStatus(user.uid, email)) }, { headers: NO_STORE });
  } catch (err) {
    return fail(err, 'classroom GET');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in first' }, { status: 401, headers: NO_STORE });
    const email = user.emailVerified ? user.email : null;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
    let note: Record<string, unknown> = {};
    switch (body.action) {
      case 'connect':
        await connectBridge(user.uid, String(body.code || ''), body.platform === 'web' ? 'web' : 'native', email);
        break;
      case 'disconnect':
        await disconnectBridge(user.uid);
        break;
      case 'sync':
        note = { result: await syncBridge(user.uid, { manual: true, verifiedEmail: email }) };
        break;
      case 'autoShare':
        await setAutoShare(user.uid, !!body.on, email);
        break;
      case 'course':
        await setCourseSubject(user.uid, String(body.courseId || ''), String(body.subjectId || ''), email);
        break;
      case 'share':
        await shareItems(user.uid, ids(body.ids), typeof body.subjectId === 'string' && body.subjectId ? body.subjectId : null, email);
        break;
      case 'skip':
        await skipItems(user.uid, ids(body.ids));
        break;
      case 'unshare':
        await unshareItem(user.uid, String(body.id || ''), email);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ success: true, ...note, ...(await bridgeStatus(user.uid, email)) }, { headers: NO_STORE });
  } catch (err) {
    return fail(err, 'classroom POST');
  }
}
