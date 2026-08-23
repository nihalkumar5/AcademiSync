import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Add simple authentication to prevent public triggering (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

      // Skip if no token
      if (!fcmToken) return;

      // 1. Check for Upcoming Classes
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

      // 2. Check for Evening Bag Pack (8 PM)
      const bagCheckTime = settings?.eveningCarryReminderTime ?? settings?.eveningBagCheckTime ?? "20:00"; // 20:00
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
    });

    if (messages.length > 0) {
      // Send all push notifications via Firebase Admin
      const response = await adminMessaging.sendEach(messages);
      console.log('Successfully sent messages:', response.successCount);
      sentCount = response.successCount;
    }

    return NextResponse.json({ success: true, sent: sentCount });

  } catch (error) {
    console.error('Error executing cron:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
