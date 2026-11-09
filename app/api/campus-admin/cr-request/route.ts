import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { approveCrRequest } from '@/lib/server/crApproval';
import { collegeKeyOf, requireCampusScope } from '@/lib/server/campusAdmin';

export const dynamic = 'force-dynamic';

// Campus admins approve or reject Batch Pilot requests, only for their own college.
export async function POST(req: Request) {
  try {
    const scope = await requireCampusScope(req);
    if (scope instanceof NextResponse) return scope;

    const body = await req.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    const action = body.action;
    if (!requestId || requestId.includes('/') || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const ref = adminDb.collection('cr_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    const r = snap.data() || {};
    if (collegeKeyOf(r.college) !== scope.collegeKey) {
      return NextResponse.json({ success: false, error: 'This request is for another college' }, { status: 403 });
    }

    if (action === 'reject') {
      await ref.update({ status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: scope.uid });
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    const result = await approveCrRequest(requestId, scope.uid);
    if (!result) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    return NextResponse.json({ success: true, status: 'approved', ...result });
  } catch (error) {
    logServerError('CampusAdminCRRequest', error);
    return NextResponse.json({ success: false, error: 'Could not update the request' }, { status: 500 });
  }
}
