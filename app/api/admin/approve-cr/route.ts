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
    const { requestId, adminId } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'requestId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch CR Request document
    const reqDoc = await adminDb.collection('cr_requests').doc(requestId).get();
    if (!reqDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'CR request not found' },
        { status: 404 }
      );
    }
    const reqData = reqDoc.data();

    // 2. Determine or generate batch invite code
    const batchRef = adminDb.collection('shared_timetables').doc(reqData.batchKey);
    const batchSnap = await batchRef.get();
    let batchCode: string;

    if (batchSnap.exists) {
      const existingBatch = batchSnap.data();
      batchCode = existingBatch.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase();
      const currentCrUserIds = Array.isArray(existingBatch.crUserIds) ? existingBatch.crUserIds : [];
      const currentCrEmails = Array.isArray(existingBatch.crEmails) ? existingBatch.crEmails : [];

      if (!currentCrUserIds.includes(reqData.userId)) currentCrUserIds.push(reqData.userId);
      if (reqData.email && !currentCrEmails.includes(reqData.email)) currentCrEmails.push(reqData.email);

      await batchRef.update({
        inviteCode: batchCode,
        crUserIds: currentCrUserIds,
        crEmails: currentCrEmails,
        updatedAt: new Date().toISOString(),
      });
    } else {
      batchCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await batchRef.set({
        id: reqData.batchKey,
        college: reqData.college,
        programme: reqData.programme || 'B.Tech',
        branch: reqData.branch,
        semester: reqData.semester,
        creatorId: reqData.userId,
        creatorName: reqData.name,
        creatorEmail: reqData.email,
        crUserIds: [reqData.userId],
        crEmails: reqData.email ? [reqData.email] : [],
        inviteCode: batchCode,
        subjects: [],
        timetable: [],
        studentCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Update cr_requests status & record generated inviteCode
    await adminDb.collection('cr_requests').doc(requestId).update({
      status: 'approved',
      inviteCode: batchCode,
      approvedAt: new Date().toISOString(),
      approvedBy: adminId || 'admin',
    });

    // 4. Update user profile to CR role & bind batch and add in-app notification
    const userRef = adminDb.collection('users').doc(reqData.userId);
    const userSnap = await userRef.get();
    let fcmToken: string | null = null;

    if (userSnap.exists) {
      const uData = userSnap.data();
      fcmToken = uData.fcmToken || null;
      const currentNotifications = Array.isArray(uData.notifications) ? uData.notifications : [];
      const newNotification = {
        id: `approved_${Date.now()}`,
        title: '👑 Batch Pilot Approved!',
        body: `Your batch is approved! Official Batch Code: ${batchCode}. Tap to copy and invite your classmates!`,
        type: 'batch_approved',
        batchCode,
        batchKey: reqData.batchKey,
        createdAt: new Date().toISOString(),
        read: false,
      };

      await userRef.update({
        'profile.role': 'cr',
        'profile.isBatchSynced': true,
        'profile.batchKey': reqData.batchKey,
        'profile.college': reqData.college,
        'profile.branch': reqData.branch,
        'profile.semester': reqData.semester,
        'profile.batchCode': batchCode,
        notifications: [newNotification, ...currentNotifications].slice(0, 50),
        lastUpdated: Date.now(),
      });
    }

    // 5. Send FCM Push Notification to student's phone if token exists
    if (fcmToken && typeof fcmToken === 'string' && fcmToken.length > 10) {
      try {
        await adminMessaging.send({
          token: fcmToken,
          notification: {
            title: '👑 Batch Pilot Approved!',
            body: `Your batch is live! Batch Code: ${batchCode}. Tap to invite your classmates!`,
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'class_alerts_v3',
              icon: 'ic_notification',
              color: '#000000',
              priority: 'max',
              visibility: 'public',
            },
          },
          data: {
            type: 'batch_approved',
            batchKey: String(reqData.batchKey),
            batchCode: String(batchCode),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        });
        console.log(`[ApproveCR] Push notification sent to user ${reqData.userId}`);
      } catch (fcmErr) {
        console.warn(`[ApproveCR] Could not send push notification to user ${reqData.userId}:`, fcmErr);
      }
    }

    return NextResponse.json({
      success: true,
      batchCode,
      batchKey: reqData.batchKey,
      name: reqData.name,
      college: reqData.college,
      branch: reqData.branch,
      semester: reqData.semester,
      phone: reqData.phone,
    });
  } catch (error) {
    logServerError('ApproveCRAPI', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve CR request' },
      { status: 500 }
    );
  }
}
