import { adminDb } from '@/lib/firebase-admin';
import { sendPush, tokensFromUserDoc } from './push';

// Approves a Batch Pilot (CR) request: creates/updates the batch, gives the user the CR role,
// adds an in-app notification and sends a push. Used by super admins (/api/admin/approve-cr)
// and campus admins (/api/campus-admin/cr-request). The caller checks permission first.
export async function approveCrRequest(requestId: string, adminId: string) {
  const reqDoc = await adminDb.collection('cr_requests').doc(requestId).get();
  if (!reqDoc.exists) return null;
  const reqData: any = reqDoc.data();

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
    let targets: ReturnType<typeof tokensFromUserDoc> = [];

    if (userSnap.exists) {
      const uData = userSnap.data();
      targets = tokensFromUserDoc(reqData.userId, uData);
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
    if (targets.length > 0) {
      try {
        await sendPush(targets, {
          title: '👑 Batch Pilot Approved!',
          body: `Your batch is live! Batch Code: ${batchCode}. Tap to invite your classmates!`,
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

  return {
    batchCode,
    batchKey: reqData.batchKey,
    name: reqData.name,
    college: reqData.college,
    branch: reqData.branch,
    semester: reqData.semester,
    phone: reqData.phone,
  };
}
