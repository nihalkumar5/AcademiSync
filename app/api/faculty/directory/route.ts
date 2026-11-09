import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { getShortCollegeName } from '@/lib/timetableUtils';

export const dynamic = 'force-dynamic';

// Campus faculty directory for a signed-in user. Users docs are owner-only, so this returns
// just the public faculty fields, for faculty of the caller's own college.
// "teachesYou" = the faculty has linked the caller's batch; `subjects` = what they teach it.

export async function GET(req: Request) {
  try {
    const caller = await getVerifiedUser(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Sign in to see faculty', code: 'unauthenticated' }, { status: 401 });

    const me = await adminDb.collection('users').doc(caller.uid).get();
    const myProfile = (me.exists ? me.data()?.profile : null) || {};
    const myCollege = myProfile.college ? getShortCollegeName(String(myProfile.college)) : '';
    const myBatch = typeof myProfile.batchKey === 'string' ? myProfile.batchKey : '';

    const snap = await adminDb.collection('users').where('profile.role', '==', 'faculty').get();
    const seen = new Set<string>();
    const faculty: any[] = [];
    snap.forEach((d: any) => {
      const p = d.data()?.profile || {};
      const linked: any[] = Array.isArray(p.facultyLinkedBatches) ? p.facultyLinkedBatches : [];
      const mine = myBatch ? linked.find((b) => b?.batchKey === myBatch) : null;
      const sameCollege = !!myCollege && !!p.college && getShortCollegeName(String(p.college)) === myCollege;
      if (!mine && !sameCollege) return;
      const email = typeof p.email === 'string' ? p.email.toLowerCase() : '';
      const dedupeKey = email || d.id;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      faculty.push({
        id: d.id,
        name: String(p.name || '').trim() || 'Faculty',
        title: p.facultyTitle || 'Prof.',
        department: p.facultyDepartment || '',
        office: p.facultyOfficeRoom || '',
        email,
        avatarUrl: p.avatarUrl || '',
        teachesYou: !!mine,
        subjects: mine && Array.isArray(mine.selectedSubjectNames) ? mine.selectedSubjectNames.filter((x: unknown) => typeof x === 'string') : [],
      });
    });
    faculty.sort((a, b) => Number(b.teachesYou) - Number(a.teachesYou) || a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, faculty });
  } catch (error) {
    logServerError('faculty directory', error);
    return NextResponse.json({ success: false, error: 'Could not load faculty' }, { status: 500 });
  }
}
