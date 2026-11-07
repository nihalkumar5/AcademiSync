import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser, isVerifiedAdminEmail } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

// Only these profile fields are returned for classmates. Everything else in a user doc
// (FCM token, homework, notifications, settings...) stays private to its owner.
const PUBLIC_PROFILE_FIELDS = [
  'name',
  'email',
  'rollNumber',
  'role',
  'avatarUrl',
  'batchKey',
  'isBatchSynced',
  'college',
  'programme',
  'branch',
  'semester',
  'section',
] as const;

const toIdList = (value: any): string[] =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];

export async function GET(req: Request) {
  try {
    const caller = await getVerifiedUser(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const batchKey = new URL(req.url).searchParams.get('batchKey')?.trim() || '';
    if (!batchKey || batchKey.includes('/')) {
      return NextResponse.json(
        { success: false, error: 'batchKey is required' },
        { status: 400 }
      );
    }

    const [callerDoc, batchDoc] = await Promise.all([
      adminDb.collection('users').doc(caller.uid).get(),
      adminDb.collection('shared_timetables').doc(batchKey).get(),
    ]);
    const callerProfile = (callerDoc.exists ? callerDoc.data()?.profile : null) || {};
    const batchData = batchDoc.exists ? batchDoc.data() || {} : {};
    const verifiedEmail = caller.emailVerified && caller.email ? caller.email : '';

    const isMember = callerProfile.batchKey === batchKey;
    const isPilot =
      batchData.creatorId === caller.uid ||
      toIdList(batchData.crUserIds).includes(caller.uid) ||
      (!!verifiedEmail && toIdList(batchData.crEmails).map((e) => e.toLowerCase()).includes(verifiedEmail));
    const isLinkedFaculty =
      callerProfile.role === 'faculty' &&
      Array.isArray(callerProfile.facultyLinkedBatches) &&
      callerProfile.facultyLinkedBatches.some((b: any) => b?.batchKey === batchKey);
    const isSuperAdmin = callerProfile.role === 'super_admin' || isVerifiedAdminEmail(caller);

    if (!isMember && !isPilot && !isLinkedFaculty && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this batch' },
        { status: 403 }
      );
    }

    const snapshot = await adminDb.collection('users')
      .where('profile.batchKey', '==', batchKey)
      .where('profile.isBatchSynced', '==', true)
      .get();

    const members: any[] = [];
    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data() || {};
      const profile = data.profile || {};
      const publicProfile: Record<string, any> = {};
      for (const field of PUBLIC_PROFILE_FIELDS) {
        if (profile[field] !== undefined) publicProfile[field] = profile[field];
      }
      members.push({
        id: docSnap.id,
        profile: publicProfile,
        lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : 0,
      });
    });

    return NextResponse.json({ success: true, members });
  } catch (error) {
    logServerError('BatchMembersAPI', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load batch members' },
      { status: 500 }
    );
  }
}
