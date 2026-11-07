import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser, isVerifiedAdminEmail } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 500;

export async function POST(req: Request) {
  try {
    // The sender is whoever owns the verified ID token — never the senderId in the body
    const caller = await getVerifiedUser(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired authentication session' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { batchKey, type, senderName } = body;
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : '';
    const messageBody = typeof body.body === 'string' ? body.body.trim().slice(0, MAX_BODY_LENGTH) : '';
    const senderId = caller.uid;

    if (!batchKey || typeof batchKey !== 'string' || !title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'batchKey, title, and body are required' },
        { status: 400 }
      );
    }

    if (body.senderId && body.senderId !== senderId) {
      return NextResponse.json(
        { success: false, error: 'Security token mismatch' },
        { status: 403 }
      );
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
    // Use the token's verified email: profile.email is user-editable and can't be trusted
    const userEmail = caller.emailVerified && caller.email ? caller.email : '';

    const isSuperAdmin = senderData.profile?.role === 'super_admin' || isVerifiedAdminEmail(caller);
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
