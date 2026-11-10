import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

// Signed-in clients report why turning on web push failed (error code + platform only),
// so the reason shows up in the server logs.
export async function POST(req: Request) {
  const user = await getVerifiedUser(req);
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
  console.warn('[web-push-setup-failed]', JSON.stringify({
    code: clip(b?.code, 80),
    message: clip(b?.message, 300),
    platform: clip(b?.platform, 12),
    standalone: !!b?.standalone,
    vapid: clip(b?.vapid, 10),
  }));
  return NextResponse.json({ success: true });
}
