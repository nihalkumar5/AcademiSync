import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

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

    // Register with Apple / Google to receive token
    await PushNotifications.register();

    // On success, save the token to Firebase Firestore under the user's document
    PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', async (token) => {
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
    });

    // Listeners for handling notifications
    PushNotifications.addListener('registrationError', (error: any) => {
      console.warn('Error on push registration: ', error);
    });

    // Android shows no banner for a push while the app is open, so show chat messages ourselves
    // (unless that chat is already on screen).
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      const d: any = notification.data || {};
      if (d.type !== 'chat' || !d.chatId) return;
      if ((window as any).__openChatId === d.chatId) return;
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 2000000000) + 1,
              title: notification.title || d.title || 'New message',
              body: notification.body || d.body || '',
              channelId: 'class_alerts_v3',
              extra: { chatId: d.chatId },
            },
          ],
        });
      } catch (err) {
        console.warn('Could not show chat notification:', err);
      }
    });

    // Tapping a chat notification opens that chat
    const openChat = (chatId?: string) => {
      if (!chatId) return;
      window.location.href = `/?view=friends&chat=${encodeURIComponent(chatId)}`;
    };
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const d: any = action.notification?.data || {};
      if (d.type === 'chat') openChat(d.chatId);
    });
    import('@capacitor/local-notifications')
      .then(({ LocalNotifications }) =>
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          openChat(action.notification?.extra?.chatId);
        })
      )
      .catch(() => {});

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
