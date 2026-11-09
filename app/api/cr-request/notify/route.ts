import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { SetupError, notifyCampusAdminsOfRequest } from '@/lib/server/campusSetup';

export const dynamic = 'force-dynamic';

// Called right after a student submits a CR request: pushes the campus admins of their college (once).
export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in' }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const sent = await notifyCampusAdminsOfRequest(user.uid, b?.requestId);
    return NextResponse.json({ success: true, sent });
  } catch (err) {
    if (err instanceof SetupError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    logServerError('cr-request notify', err);
    return NextResponse.json({ success: false, error: 'Could not notify' }, { status: 500 });
  }
}
