import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

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

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });

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
    await fetch('/api/batch/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Failed to call broadcast API:', err);
  }
};
