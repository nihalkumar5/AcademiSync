import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

// One place to send push to users: the native app token (fcmToken) and every web/PWA token
// (webPushTokens, incl. iPhone Home Screen apps). Web tokens that FCM reports as dead are pruned.

const APP_URL = 'https://app.intersemester.com';
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

type Target = { token: string; uid: string; web: boolean };

export function tokensFromUserDoc(uid: string, data: any): Target[] {
  const out: Target[] = [];
  if (typeof data?.fcmToken === 'string' && data.fcmToken.trim().length > 10) {
    out.push({ token: data.fcmToken.trim(), uid, web: false });
  }
  if (Array.isArray(data?.webPushTokens)) {
    for (const t of data.webPushTokens) {
      if (typeof t === 'string' && t.trim().length > 10) out.push({ token: t.trim(), uid, web: true });
    }
  }
  return out;
}

export async function sendPush(
  targets: Target[],
  msg: { title: string; body: string; data?: Record<string, string>; link?: string; tag?: string }
): Promise<{ sent: number; failed: number }> {
  const seen = new Set<string>();
  const list = targets.filter((t) => (seen.has(t.token) ? false : (seen.add(t.token), true)));
  if (list.length === 0) return { sent: 0, failed: 0 };

  const link = `${APP_URL}${msg.link || '/'}`;
  const messages = list.map(({ token }) => ({
    token,
    notification: { title: msg.title, body: msg.body },
    data: msg.data || {},
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        channelId: 'class_alerts_v3',
        icon: 'ic_notification',
        color: '#000000',
        priority: 'max' as const,
        visibility: 'public' as const,
        ...(msg.tag ? { tag: msg.tag } : {}),
      },
    },
    // Web + iPhone PWA: icon, urgency and where a tap should open
    webpush: {
      headers: { Urgency: 'high' },
      notification: { icon: `${APP_URL}/logo51.png`, badge: `${APP_URL}/logo51.png`, ...(msg.tag ? { tag: msg.tag, renotify: true } : {}) },
      fcmOptions: { link },
    },
  }));

  let sent = 0;
  let failed = 0;
  const dead: Target[] = [];
  // FCM accepts up to 500 messages per sendEach call
  for (let i = 0; i < messages.length; i += 500) {
    const res = await adminMessaging.sendEach(messages.slice(i, i + 500));
    sent += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((r: any, j: number) => {
      const target = list[i + j];
      if (!r.success && target.web && DEAD_TOKEN_CODES.has(r.error?.code)) dead.push(target);
    });
  }

  await Promise.all(
    dead.map((t) =>
      adminDb
        .collection('users')
        .doc(t.uid)
        .update({ webPushTokens: FieldValue.arrayRemove(t.token) })
        .catch(() => {})
    )
  );
  return { sent, failed };
}
