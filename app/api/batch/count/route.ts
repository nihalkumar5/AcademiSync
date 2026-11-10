import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { normalizeProgrammeName } from '@/lib/timetableUtils';

export const dynamic = 'force-dynamic';

// How many students are really in a batch. The stored `studentCount` is a running
// counter (+1 on every join, -1 on leave) and drifts: re-joins count twice and people
// from another programme who synced to the wrong batch are included. This counts the
// actual synced members whose programme matches the batch, and repairs the stored counter.
// Returns only a number, so it is safe before sign-in (the "Find your class" sheet).
export async function GET(req: Request) {
  try {
    const batchKey = new URL(req.url).searchParams.get('batchKey')?.trim() || '';
    if (!batchKey || batchKey.includes('/') || batchKey.length > 200) {
      return NextResponse.json({ success: false, error: 'batchKey is required' }, { status: 400 });
    }

    const batchRef = adminDb.collection('shared_timetables').doc(batchKey);
    const batchDoc = await batchRef.get();
    if (!batchDoc.exists) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    const batch = batchDoc.data() || {};
    const batchProg = batch.programme ? normalizeProgrammeName(String(batch.programme)) : '';

    const snap = await adminDb
      .collection('users')
      .where('profile.batchKey', '==', batchKey)
      .where('profile.isBatchSynced', '==', true)
      .select('profile.programme', 'profile.role')
      .get();

    let count = 0;
    snap.forEach((d: any) => {
      const p = d.get('profile') || {};
      if (p.role === 'faculty') return;
      // A member with no programme on file is kept; one from another programme is not.
      if (batchProg && p.programme && normalizeProgrammeName(String(p.programme)) !== batchProg) return;
      count++;
    });

    if (Number(batch.studentCount) !== count) {
      batchRef.update({ studentCount: count }).catch(() => {});
    }

    return NextResponse.json({ success: true, count }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logServerError('BatchCountAPI', error);
    return NextResponse.json({ success: false, error: 'Could not count members' }, { status: 500 });
  }
}
