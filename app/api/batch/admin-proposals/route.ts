import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { SetupError, listProposalsForCr, respondProposal } from '@/lib/server/campusSetup';

export const dynamic = 'force-dynamic';

// Updates the campus admin sent to this CR's batch, waiting for the CR's OK.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in' }, { status: 401, headers: NO_STORE });
    return NextResponse.json({ success: true, proposals: await listProposalsForCr(user.uid) }, { headers: NO_STORE });
  } catch (err) {
    logServerError('admin-proposals GET', err);
    return NextResponse.json({ success: false, error: 'Could not load requests' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in' }, { status: 401, headers: NO_STORE });
    const b = await req.json().catch(() => null);
    if (!b || (b.answer !== 'approve' && b.answer !== 'reject')) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    await respondProposal(user.uid, b.id, b.answer === 'approve');
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof SetupError) return NextResponse.json({ success: false, error: err.message }, { status: err.status, headers: NO_STORE });
    logServerError('admin-proposals POST', err);
    return NextResponse.json({ success: false, error: 'Something went wrong. Try again.' }, { status: 500, headers: NO_STORE });
  }
}
