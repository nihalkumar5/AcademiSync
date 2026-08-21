import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Add simple authentication to prevent public triggering (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
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

    const messages = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const fcmToken = data.fcmToken;
      const timetable = data.timetable || [];
      const settings = data.settings;

      // Skip if no token
      if (!fcmToken) return;

      // 1. Check for Upcoming Classes
      const classAlertMinutes = settings?.classAlertMinutes || 15;
      
      const todayClasses = timetable.filter((c: any) => c.day === todayStr);
      for (const session of todayClasses) {
        // Parse "09:30 AM" to total minutes
        const [time, modifier] = session.startTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        
        const sessionTimeMinutes = hours * 60 + minutes;
        
        // If class is exactly 'classAlertMinutes' away
        if (sessionTimeMinutes - currentTimeMinutes === classAlertMinutes) {
          messages.push({
            token: fcmToken,
            notification: {
              title: \`Class in \${classAlertMinutes} mins: \${session.subject}\`,
              body: \`\${session.type} at \${session.room}\`
            }
          });
        }
      }

      // 2. Check for Evening Bag Pack (8 PM)
      const bagCheckTime = settings?.eveningBagCheckTime || "20:00"; // 20:00
      const [bagHour, bagMin] = bagCheckTime.split(':').map(Number);
      if (currentHour === bagHour && currentMinute === bagMin) {
        messages.push({
          token: fcmToken,
          notification: {
            title: "Pack your bag for tomorrow! 🎒",
            body: "Check AcademiSync to see tomorrow's classes and what to carry."
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
