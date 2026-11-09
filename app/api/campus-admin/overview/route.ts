import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { collegeKeyOf, requireCampusScope } from '@/lib/server/campusAdmin';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

// Everything a campus admin sees, filtered to their own college on the server.
export async function GET(req: Request) {
  try {
    const scope = await requireCampusScope(req);
    if (scope instanceof NextResponse) return scope;
    const key = scope.collegeKey;

    const [usersSnap, batchesSnap, requestsSnap, campaignsSnap] = await Promise.all([
      adminDb.collection('users').select('profile', 'lastUpdated', 'fcmToken', 'webPushTokens').get(),
      adminDb
        .collection('shared_timetables')
        .select('college', 'programme', 'branch', 'semester', 'section', 'inviteCode', 'creatorName', 'creatorId', 'crUserIds', 'studentCount', 'createdAt', 'updatedAt')
        .get(),
      adminDb.collection('cr_requests').get(),
      adminDb.collection('promotional_campaigns').where('ownerCollegeKey', '==', key).get(),
    ]);

    const students: any[] = [];
    usersSnap.forEach((d: any) => {
      const data = d.data() || {};
      const p = data.profile || {};
      if (collegeKeyOf(p.college) !== key) return;
      students.push({
        id: d.id,
        name: p.name || '',
        email: p.email || '',
        rollNumber: p.rollNumber || '',
        programme: p.programme || '',
        branch: p.branch || '',
        semester: p.semester || null,
        section: p.section || '',
        role: p.role || 'student',
        batchKey: p.isBatchSynced ? p.batchKey || '' : '',
        avatarUrl: p.avatarUrl || '',
        lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : 0,
        hasPush: !!data.fcmToken || (Array.isArray(data.webPushTokens) && data.webPushTokens.length > 0),
      });
    });

    const batches: any[] = [];
    batchesSnap.forEach((d: any) => {
      const b = d.data() || {};
      if (collegeKeyOf(b.college) !== key) return;
      batches.push({
        id: d.id,
        programme: b.programme || '',
        branch: b.branch || '',
        semester: b.semester || null,
        section: b.section || '',
        inviteCode: b.inviteCode || '',
        creatorName: b.creatorName || '',
        pilotCount: Array.isArray(b.crUserIds) ? b.crUserIds.length : 0,
        members: students.filter((s) => s.batchKey === d.id).length,
        createdAt: b.createdAt || '',
      });
    });

    const requests: any[] = [];
    requestsSnap.forEach((d: any) => {
      const r = d.data() || {};
      if (collegeKeyOf(r.college) !== key) return;
      requests.push({
        id: d.id,
        name: r.name || '',
        email: r.email || '',
        phone: r.phone || '',
        programme: r.programme || '',
        branch: r.branch || '',
        semester: r.semester || null,
        section: r.section || '',
        status: r.status || 'pending',
        createdAt: r.createdAt || '',
        inviteCode: r.inviteCode || '',
        batchKey: r.batchKey || '',
      });
    });
    requests.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const campaigns: any[] = [];
    campaignsSnap.forEach((d: any) => campaigns.push({ id: d.id, ...d.data() }));
    campaigns.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return NextResponse.json(
      { success: true, college: scope.college, collegeKey: key, students, batches, requests, campaigns },
      { headers: NO_STORE }
    );
  } catch (error) {
    logServerError('CampusAdminOverview', error);
    return NextResponse.json({ success: false, error: 'Could not load your campus' }, { status: 500 });
  }
}
