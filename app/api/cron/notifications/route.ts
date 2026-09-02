import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Enforce strict cron authentication (Vercel Cron header or Bearer CRON_SECRET)
  const authHeader = request.headers.get('authorization');
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  const isVercelCron = vercelCronHeader === '1';
  const hasValidSecret = process.env.CRON_SECRET ? authHeader === `Bearer ${process.env.CRON_SECRET}` : false;

  if (process.env.NODE_ENV === 'production' && !isVercelCron && !hasValidSecret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const usersSnapshot = await adminDb.collection('users').get();
    let sentCount = 0;

    // Current Time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Day of week (0 = Sunday, 1 = Monday, etc.)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayStr = dayNames[now.getDay()];

    const messages: any[] = [];

    usersSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const fcmToken = data.fcmToken;
      const timetable = data.timetable || [];
      const subjects = data.subjects || [];
      const settings = data.settings;
      const events = data.events || [];

      // Skip if no token
      if (!fcmToken) return;

      // Check if today is a holiday in the academic calendar
      // Use IST (India Standard Time, UTC+5:30) since dates are stored in local format
      const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in ms
      const istNow = new Date(now.getTime() + istOffset);
      const todayDateStr = istNow.toISOString().split('T')[0]; // "YYYY-MM-DD" in IST
      const isHoliday = events.some((event: any) => {
        if (!event.date) return false;
        // event.date is stored as "YYYY-MM-DD" string
        const eventDate = typeof event.date === 'string'
          ? event.date
          : new Date(event.date.seconds * 1000 + istOffset).toISOString().split('T')[0];
        return eventDate === todayDateStr && event.type === 'holiday';
      });

      // 1. Check for Upcoming Classes (skip on holidays)
      if (!isHoliday) {
        const classAlertMinutes = settings?.classReminderMinutes ?? settings?.classAlertMinutes ?? 10;
        const subjectMap = new Map(subjects.map((s: any) => [s.id, s]));
        
        const todayClasses = timetable.filter((c: any) => c.day === todayStr);
        for (const session of todayClasses) {
          // Parse time robustly supporting both "09:30 AM" and "09:30" (24h format)
          const parts = session.startTime.trim().split(' ');
          const timePart = parts[0];
          const modifier = parts[1];
          
          let [hours, minutes] = timePart.split(':').map(Number);
          if (modifier) {
            const cleanModifier = modifier.toUpperCase();
            if (cleanModifier === 'PM' && hours < 12) hours += 12;
            if (cleanModifier === 'AM' && hours === 12) hours = 0;
          }
          
          const sessionTimeMinutes = hours * 60 + (minutes || 0);
          
          // If class is exactly 'classAlertMinutes' away
          if (sessionTimeMinutes - currentTimeMinutes === classAlertMinutes) {
            const sub = subjectMap.get(session.subjectId) as any;
            const subjectLabel = sub ? (sub.shortName || sub.name) : 'Class';
            const roomLabel = session.room || (sub ? sub.room : 'TBD');
            
            messages.push({
              token: fcmToken,
              notification: {
                title: `Class in ${classAlertMinutes} mins: ${subjectLabel}`,
                body: `${session.isLab ? 'Lab' : 'Lecture'} at ${roomLabel}`
              }
            });
          }
        }
      }

      // 2. Check for Evening Bag Pack (skip on holidays too)
      if (!isHoliday) {
        const bagCheckTime = settings?.eveningCarryReminderTime ?? settings?.eveningBagCheckTime ?? "20:00";
        const [bagHour, bagMin] = bagCheckTime.split(':').map(Number);
        if (currentHour === bagHour && currentMinute === bagMin) {
          messages.push({
            token: fcmToken,
            notification: {
              title: "Pack your bag for tomorrow! 🎒",
              body: "Check Intersemester to see tomorrow's classes and what to carry."
            }
          });
        }
      }
    });

    if (messages.length > 0) {
      // Send all push notifications via Firebase Admin
      const response = await adminMessaging.sendEach(messages);
      console.log('Successfully sent messages:', response.successCount);
      sentCount = response.successCount;
    }

    return NextResponse.json({ success: true, sent: sentCount });

  } catch (error) {
    logServerError('CronNotificationsAPI', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
