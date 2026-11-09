import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { requireCampusScope } from '@/lib/server/campusAdmin';
import { SetupError, assignCr, batchPeople, createBatches, deleteCalendar, loadBatchTimetable, loadSetup, removeCr, saveCalendar, setTimetable } from '@/lib/server/campusSetup';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Campus setup for campus admins: batches, timetables, year-wise calendars (own college only).
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };
const ok = (b: Record<string, unknown>) => NextResponse.json({ success: true, ...b }, { headers: NO_STORE });
const fail = (err: unknown) => {
  if (err instanceof SetupError) return NextResponse.json({ success: false, error: err.message }, { status: err.status, headers: NO_STORE });
  logServerError('campus-admin setup', err);
  return NextResponse.json({ success: false, error: 'Something went wrong. Try again.' }, { status: 500, headers: NO_STORE });
};

export async function GET(req: Request) {
  const scope = await requireCampusScope(req);
  if (scope instanceof NextResponse) return scope;
  try {
    const people = new URL(req.url).searchParams.get('people');
    if (people) return ok(await batchPeople(scope, people));
    const batch = new URL(req.url).searchParams.get('batch');
    if (batch) {
      if (batch.includes('/')) return NextResponse.json({ success: false, error: 'Invalid batch' }, { status: 400 });
      return ok(await loadBatchTimetable(scope, batch));
    }
    return ok(await loadSetup(scope));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  const scope = await requireCampusScope(req);
  if (scope instanceof NextResponse) return scope;
  try {
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    switch (b.action) {
      case 'createBatches':
        return ok(await createBatches(scope, b));
      case 'setTimetable':
        return ok(await setTimetable(scope, b));
      case 'saveCalendar':
        return ok(await saveCalendar(scope, b));
      case 'assignCr':
        await assignCr(scope, b);
        return ok({});
      case 'removeCr':
        await removeCr(scope, b);
        return ok({});
      case 'deleteCalendar':
        await deleteCalendar(scope, b.id);
        return ok({});
    }
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    return fail(err);
  }
}
