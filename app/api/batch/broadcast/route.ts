import { NextResponse } from 'next/server';
import { adminDb, adminMessaging, adminAuth } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_EMAILS = [
  'nihalkumar@iiitnr.edu.in',
  'nihalkumar538@gmail.com',
  'nihal88758@gmail.com',
  'nihal26302@iiitnr.edu.in',
  'kumarnihal829@gmail.com',
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { batchKey, title, body: messageBody, type, senderId, senderName } = body;

    if (!batchKey || !title || !messageBody || !senderId) {
      return NextResponse.json(
        { success: false, error: 'batchKey, title, body, and senderId are required' },
        { status: 400 }
      );
    }

    // Optional Bearer token verification if provided
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded.uid !== senderId) {
          return NextResponse.json(
            { success: false, error: 'Security token mismatch' },
            { status: 403 }
          );
        }
      } catch (tokenErr) {
        console.warn('[BatchBroadcast] Invalid auth token supplied:', tokenErr);
        return NextResponse.json(
          { success: false, error: 'Invalid or expired authentication session' },
          { status: 401 }
        );
      }
    }

    // Verify sender identity and permission in Firestore
    const [senderDoc, batchDoc] = await Promise.all([
      adminDb.collection('users').doc(senderId).get(),
      adminDb.collection('shared_timetables').doc(batchKey).get(),
    ]);

    if (!senderDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Sender user record does not exist' },
        { status: 403 }
      );
    }

    const senderData = senderDoc.data() || {};
    const batchData = batchDoc.exists ? batchDoc.data() : null;
    const userEmail = (senderData.profile?.email || '').toLowerCase().trim();

    const isSuperAdmin = senderData.profile?.role === 'super_admin' || SUPER_ADMIN_EMAILS.includes(userEmail);
    const isBatchCreator = batchData && (
      batchData.creatorId === senderId ||
      (userEmail && (batchData.creatorEmail || '').toLowerCase().trim() === userEmail)
    );
    const isBatchPilotInDoc = batchData && (
      (Array.isArray(batchData.crUserIds) && batchData.crUserIds.includes(senderId)) ||
      (Array.isArray(batchData.crEmails) && userEmail && batchData.crEmails.map((e: string) => (e || '').toLowerCase().trim()).includes(userEmail))
    );
    const isBatchPilotInProfile = senderData.profile?.role === 'cr' && senderData.profile?.batchKey === batchKey;

    if (!isSuperAdmin && !isBatchCreator && !isBatchPilotInDoc && !isBatchPilotInProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only verified Batch Pilots or Admins can broadcast notifications to this batch' },
        { status: 403 }
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
