import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { NoteError, addMine, addShared, deleteMine, deleteShared, listMine, listShared, whoIs } from '@/lib/server/classNotes';

export const dynamic = 'force-dynamic';

// Class-linked notes. My notes are owner-only; class notes are scoped to the caller's batch.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const ok = (b: Record<string, unknown>) => NextResponse.json({ success: true, ...b }, { headers: NO_STORE });
const fail = (err: unknown, where: string) => {
  if (err instanceof NoteError) return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.status, headers: NO_STORE });
  logServerError(where, err);
  return NextResponse.json({ success: false, error: 'Something went wrong. Try again.' }, { status: 500, headers: NO_STORE });
};

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in to see notes' }, { status: 401, headers: NO_STORE });
    const p = new URL(req.url).searchParams;
    const subjectId = p.get('subjectId') || '';
    const date = p.get('date') || undefined;
    if (!subjectId || subjectId.length > 128 || subjectId.includes('/')) return NextResponse.json({ success: false, error: 'Missing subject' }, { status: 400, headers: NO_STORE });
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400, headers: NO_STORE });
    const who = await whoIs(user.uid);
    const [mine, shared] = await Promise.all([listMine(user.uid, subjectId, date), listShared(who, subjectId, date)]);
    return ok({ mine, shared, hasBatch: !!who.batchKey });
  } catch (err) {
    return fail(err, 'class-notes GET');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in to save notes' }, { status: 401, headers: NO_STORE });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
    switch (body.action) {
      case 'addMine':
        return ok({ note: await addMine(user.uid, body) });
      case 'deleteMine':
        await deleteMine(user.uid, body.id);
        return ok({});
      case 'addShared':
        return ok({ id: await addShared(await whoIs(user.uid), body) });
      case 'deleteShared':
        await deleteShared(await whoIs(user.uid), body.id);
        return ok({});
    }
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  } catch (err) {
    return fail(err, 'class-notes POST');
  }
}
