import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { guardAiRequest } from '@/lib/aiGuard';
import {
  PaperError,
  listPapers,
  openPaper,
  publishPaper,
  removePaper,
  reportPaper,
  resolveScope,
  restorePaper,
  scanPaper,
} from '@/lib/server/questionPapers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Question papers. Everything is checked in lib/server/questionPapers.ts (college + branch scope).
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const ok = (body: Record<string, unknown>) => NextResponse.json({ success: true, ...body }, { headers: NO_STORE });
const fail = (err: unknown, where: string) => {
  if (err instanceof PaperError) {
    return NextResponse.json({ success: false, error: err.message, ...(err.extra || {}) }, { status: err.status, headers: NO_STORE });
  }
  logServerError(where, err);
  return NextResponse.json({ success: false, error: 'Something went wrong. Try again.' }, { status: 500, headers: NO_STORE });
};
const validId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(v);

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in to see question papers' }, { status: 401, headers: NO_STORE });
    const scope = await resolveScope(user.uid);
    const id = new URL(req.url).searchParams.get('open');
    if (id) {
      if (!validId(id)) return NextResponse.json({ success: false, error: 'Invalid paper' }, { status: 400, headers: NO_STORE });
      return ok(await openPaper(scope, id));
    }
    return ok(await listPapers(scope));
  } catch (err) {
    return fail(err, 'question-papers GET');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in to continue' }, { status: 401, headers: NO_STORE });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
    const scope = await resolveScope(user.uid);

    switch (body.action) {
      case 'scan': {
        // Counts against the person's AI scan quota
        const blocked = await guardAiRequest(req);
        if (blocked) return blocked;
        return ok(await scanPaper(scope, body));
      }
      case 'publish':
        if (!validId(body.draftId)) break;
        return ok({ paper: await publishPaper(scope, body.draftId, body.fields) });
      case 'discard':
        if (!validId(body.id)) break;
        await removePaper(scope, body.id);
        return ok({});
      case 'report':
        if (!validId(body.id)) break;
        return ok(await reportPaper(scope, body.id));
      case 'remove':
        if (!validId(body.id)) break;
        await removePaper(scope, body.id);
        return ok({});
      case 'restore':
        if (!validId(body.id)) break;
        await restorePaper(scope, body.id);
        return ok({});
    }
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  } catch (err) {
    return fail(err, 'question-papers POST');
  }
}
