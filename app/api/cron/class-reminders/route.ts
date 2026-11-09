import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorUtils';
import { sendDueClassReminders } from '@/lib/server/classReminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Called every 5 minutes by Vercel Cron (vercel.json) or any external scheduler.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await sendDueClassReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logServerError('ClassRemindersCron', error);
    return NextResponse.json({ success: false, error: 'Failed to send reminders' }, { status: 500 });
  }
}
