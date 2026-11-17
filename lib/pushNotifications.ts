import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

type Handle = { remove: () => Promise<void> };
const regHandles: Handle[] = [];
let tapsReady = false;

/** Open a chat from a notification tap: works whether the app was closed, in the background or open. */
export const requestOpenChat = (chatId?: string) => {
  if (!chatId) return;
  try {
    sessionStorage.setItem('pending_chat', chatId);
  } catch {}
  window.dispatchEvent(new CustomEvent('friends:open-chat', { detail: chatId }));
};

export const OPEN_VIEW_EVENT = 'app:open-view';
export const PENDING_VIEW_KEY = 'pending_view';

/** Open a screen from a notification tap (OpenViewHost does the switch). */
export const requestOpenView = (view?: string) => {
  if (!view) return;
  try {
    sessionStorage.setItem(PENDING_VIEW_KEY, view);
  } catch {}
  window.dispatchEvent(new CustomEvent(OPEN_VIEW_EVENT, { detail: view }));
};

/** Where a tapped notification should take you: a chat, else the screen it names. */
const openFromNotification = (d: any) => {
  if (!d) return;
  if (d.chatId) requestOpenChat(d.chatId);
  else if (d.view) requestOpenView(d.view);
};

/**
 * Call once, as early as possible on app start (native only). Android hands the tap that
 * launched the app to the first listener, so these are added before anything else and kept.
 */
export const listenForNotificationTaps = async () => {
  if (tapsReady || !Capacitor.isNativePlatform()) return;
  tapsReady = true;
  try {
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      openFromNotification(action.notification?.data || {});
    });

    // Android shows no banner for a push while the app is open, so show it ourselves: every push,
    // not just chats (unless it's a message in the chat that's already on screen).
    await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      const d: any = notification.data || {};
      if (d.type === 'chat' && (!d.chatId || (window as any).__openChatId === d.chatId)) return;
      const title = notification.title || d.title;
      if (!title) return;
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 2000000000) + 1,
              title,
              body: notification.body || d.body || '',
              channelId: 'class_alerts_v3',
              extra: { chatId: d.chatId || undefined, view: d.view || undefined },
            },
          ],
        });
      } catch (err) {
        console.warn('Could not show notification:', err);
      }
    });

    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      openFromNotification(action.notification?.extra);
    });
  } catch (err) {
    console.warn('Could not listen for notification taps:', err);
  }
};

export const registerPushNotifications = async (userId: string, batchKey?: string) => {
  // Only register if running on a native device (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only available on native devices.');
    return;
  }

  try {
    // Request permission to use push notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permission');
      return;
    }

    // Replace only this function's own earlier listeners (it runs more than once), never the
    // tap listeners from listenForNotificationTaps: those must stay to catch the launching tap.
    await Promise.all(regHandles.splice(0).map((h) => h.remove().catch(() => {})));

    regHandles.push(
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        if (userId && token.value) {
          try {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
              fcmToken: token.value,
              fcmUpdatedAt: new Date().toISOString(),
              ...(batchKey ? { 'profile.batchKey': batchKey } : {})
            }, { merge: true });
          } catch (err) {
            console.warn('Could not save FCM token to Firestore:', err);
          }
        }
      }),
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('Error on push registration: ', error);
      })
    );

    // Register with Apple / Google to receive token
    await PushNotifications.register();
  } catch (error) {
    console.warn('Push Notification Registration failed', error);
  }
};

export const broadcastBatchPushNotification = async (payload: {
  batchKey: string;
  title: string;
  body: string;
  type?: string;
  senderId?: string;
  senderName?: string;
  /** Screen a tap should open, e.g. 'routines' */
  view?: string;
}) => {
  if (!payload.batchKey || !payload.title) return;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth?.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      } catch (tokenErr) {
        console.warn('Could not attach auth token:', tokenErr);
      }
    }
    await fetch('/api/batch/broadcast', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Failed to call broadcast API:', err);
  }
};
