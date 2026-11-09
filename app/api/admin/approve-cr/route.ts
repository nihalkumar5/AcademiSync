import { NextResponse } from 'next/server';
import { approveCrRequest } from '@/lib/server/crApproval';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser, isSuperAdminUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Only a signed-in Super Admin may approve CR requests
    const caller = await getVerifiedUser(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!(await isSuperAdminUser(caller))) {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can approve CR requests' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { requestId } = body;
    const adminId = caller.uid;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'requestId is required' },
        { status: 400 }
      );
    }

    const result = await approveCrRequest(String(requestId), adminId);
    if (!result) {
      return NextResponse.json({ success: false, error: 'CR request not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logServerError('ApproveCRAPI', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve CR request' },
      { status: 500 }
    );
  }
}
