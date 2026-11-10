import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import {
  FriendError,
  answerRequest,
  cancelPlan,
  createPlan,
  loadFriends,
  listAcceptedFriends,
  loadRoutineShares,
  markFriendRoutine,
  removeFriend,
  shareRoutineWithFriends,
  requestFriend,
  respondPlan,
  updateSettings,
} from '@/lib/server/friends';

export const dynamic = 'force-dynamic';

// Friends: same-campus only, request/accept, free/busy only. All checks in lib/server/friends.ts.
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const ok = (b: Record<string, unknown>) => NextResponse.json({ success: true, ...b }, { headers: NO_STORE });
const fail = (err: unknown, where: string) => {
  if (err instanceof FriendError) return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.status, headers: NO_STORE });
  logServerError(where, err);
  return NextResponse.json({ success: false, error: 'Something went wrong. Try again.' }, { status: 500, headers: NO_STORE });
};

export async function GET(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in to use Friends' }, { status: 401, headers: NO_STORE });
    return ok({ data: await loadFriends(user.uid) });
  } catch (err) {
    return fail(err, 'friends GET');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Sign in to use Friends' }, { status: 401, headers: NO_STORE });
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
    const uid = user.uid;
    switch (b.action) {
      case 'request':
        return ok(await requestFriend(uid, { code: b.code, uid: b.uid }));
      case 'accept':
        await answerRequest(uid, b.uid, true);
        return ok({});
      case 'decline':
        await answerRequest(uid, b.uid, false);
        return ok({});
      case 'remove':
        await removeFriend(uid, b.uid);
        return ok({});
      case 'settings':
        await updateSettings(uid, b);
        return ok({});
      case 'plan':
        return ok({ id: await createPlan(uid, b) });
      case 'respond':
        await respondPlan(uid, b.id, b.answer);
        return ok({});
      case 'cancelPlan':
        await cancelPlan(uid, b.id);
        return ok({});
      case 'listFriends':
        return ok({ friends: await listAcceptedFriends(uid) });
      case 'routineShares':
        return ok({ data: await loadRoutineShares(uid) });
      case 'shareRoutine':
        return ok(await shareRoutineWithFriends(uid, b));
      case 'markRoutine':
        await markFriendRoutine(uid, b.id, b.answer);
        return ok({});
    }
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  } catch (err) {
    return fail(err, 'friends POST');
  }
}
