import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getVerifiedUser, isSuperAdminUser, VerifiedUser } from '@/lib/serverAuth';

// Campus admins manage ONE college. Their college lives in campus_admins/{uid}, written only by the
// server (a super admin assigns it), so a campus admin can't widen their own scope by editing their profile.
// Every campus-admin API checks the caller's record and filters data to that college here on the server.

export type CampusScope = { caller: VerifiedUser; uid: string; college: string; collegeKey: string; name: string };

import { collegeKeyOf } from '@/lib/collegeKey';
export { collegeKeyOf };

export async function getCampusAdminRecord(uid: string) {
  const snap = await adminDb.collection('campus_admins').doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() || {};
  if (!d.collegeKey || !d.college) return null;
  return d as { uid: string; college: string; collegeKey: string; name?: string; email?: string };
}

/**
 * Resolve the caller's campus scope or return an error response.
 * Super admins may preview a campus by passing ?college=<name>.
 */
export async function requireCampusScope(req: Request): Promise<CampusScope | NextResponse> {
  const caller = await getVerifiedUser(req);
  if (!caller) return NextResponse.json({ success: false, error: 'Sign in to continue' }, { status: 401 });

  const record = await getCampusAdminRecord(caller.uid);
  if (record) {
    return { caller, uid: caller.uid, college: record.college, collegeKey: record.collegeKey, name: record.name || '' };
  }

  const preview = new URL(req.url).searchParams.get('college');
  if (preview && (await isSuperAdminUser(caller))) {
    const key = collegeKeyOf(preview);
    if (key) return { caller, uid: caller.uid, college: preview, collegeKey: key, name: 'Super admin' };
  }
  return NextResponse.json({ success: false, error: 'Only campus admins can open this' }, { status: 403 });
}

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const istDate = (ms = Date.now()) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
