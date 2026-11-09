import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser, isSuperAdminUser } from '@/lib/serverAuth';
import { collegeKeyOf } from '@/lib/server/campusAdmin';

export const dynamic = 'force-dynamic';

// Super admins make someone a campus admin for the college on their profile, or remove it.
export async function POST(req: Request) {
  try {
    const caller = await getVerifiedUser(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    if (!(await isSuperAdminUser(caller))) {
      return NextResponse.json({ success: false, error: 'Only super admins can do this' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId || userId.includes('/')) return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    const ids: string[] = Array.from(
      new Set([userId, ...(Array.isArray(body.linkedDocIds) ? body.linkedDocIds : [])].filter((x) => typeof x === 'string' && x && !x.includes('/')))
    );

    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (!userSnap.exists) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    const p = userSnap.data()?.profile || {};

    if (body.action === 'assign') {
      const college = String(body.college || p.college || '').trim();
      const key = collegeKeyOf(college);
      if (!key) {
        return NextResponse.json({ success: false, error: 'This user has no college on their profile' }, { status: 400 });
      }
      await adminDb.collection('campus_admins').doc(userId).set({
        uid: userId,
        name: p.name || '',
        email: p.email || '',
        college,
        collegeKey: key,
        createdAt: new Date().toISOString(),
        createdBy: caller.uid,
      });
      await Promise.all(ids.map((id) => adminDb.collection('users').doc(id).update({ 'profile.role': 'campus_admin' }).catch(() => {})));
      return NextResponse.json({ success: true, college, collegeKey: key });
    }

    if (body.action === 'revoke') {
      const nextRole = ['student', 'cr', 'faculty'].includes(body.nextRole) ? body.nextRole : 'student';
      await adminDb.collection('campus_admins').doc(userId).delete();
      await Promise.all(ids.map((id) => adminDb.collection('users').doc(id).update({ 'profile.role': nextRole }).catch(() => {})));
      return NextResponse.json({ success: true, role: nextRole });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logServerError('CampusAdminsAPI', error);
    return NextResponse.json({ success: false, error: 'Could not update campus admin' }, { status: 500 });
  }
}
