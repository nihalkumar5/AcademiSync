import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { batchKey, title, body: messageBody, type, senderId, senderName } = body;

    if (!batchKey || !title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'batchKey, title, and body are required' },
        { status: 400 }
      );
    }

    // 1. Fetch all members enrolled in this batch
    const usersSnapshot = await adminDb.collection('users')
      .where('profile.batchKey', '==', batchKey)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ success: true, sent: 0, message: 'No members in batch' });
    }

    // 2. Gather unique FCM tokens
    const tokens = new Set<string>();
    usersSnapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      // Skip sender's own device if requested
      if (senderId && docSnap.id === senderId) return;

      if (data.fcmToken && typeof data.fcmToken === 'string' && data.fcmToken.trim().length > 10) {
        tokens.add(data.fcmToken.trim());
      }
    });

    if (tokens.size === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No registered device tokens found' });
    }

    // 3. Build FCM notification payloads
    const tokenList = Array.from(tokens);
    const messages = tokenList.map((token) => ({
      token,
      notification: {
        title,
        body: messageBody,
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'class_alerts_v3',
          icon: 'ic_notification',
          color: '#000000',
          priority: 'max' as const,
          visibility: 'public' as const,
        },
      },
      data: {
        batchKey: String(batchKey),
        type: String(type || 'schedule_update'),
        title: String(title),
        body: String(messageBody),
        senderName: String(senderName || 'Batch Pilot'),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    }));

    // 4. Send all push notifications via Firebase Admin Messaging
    const response = await adminMessaging.sendEach(messages);
    console.log(`[BatchBroadcast] Sent ${response.successCount}/${tokenList.length} notifications for batch ${batchKey}`);

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (error) {
    logServerError('BatchBroadcastAPI', error);
    return NextResponse.json(
      { success: false, error: 'Failed to broadcast batch notification' },
      { status: 500 }
    );
  }
}
