import { Capacitor } from '@capacitor/core';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from './firebase';

// Web Push for the browser and the installed PWA (incl. iPhone, iOS 16.4+ from the Home Screen).
// The native Android/iOS app keeps using Capacitor (lib/pushNotifications.ts); web tokens are stored
// separately in users/{uid}.webPushTokens so one device never overwrites another.
//
// Optional: set NEXT_PUBLIC_FIREBASE_VAPID_KEY to the key pair from Firebase Console →
// Project settings → Cloud Messaging → Web Push certificates. Without it Firebase's default key is used.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;

export const isIOSDevice = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

export const isStandalonePWA = () =>
  typeof window !== 'undefined' &&
  ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);

/** Web Push can work here (not the native app, browser has the APIs; on iOS only from the Home Screen). */
export const canUseWebPush = () => {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  if (isIOSDevice() && !isStandalonePWA()) return false;
  return true;
};

export const webPushPermission = (): NotificationPermission | 'unsupported' =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

async function saveToken(userId: string) {
  if (!(await isSupported())) return false;
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), {
    ...(VAPID_KEY ? { vapidKey: VAPID_KEY } : {}),
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;
  await setDoc(
    doc(db, 'users', userId),
    { webPushTokens: arrayUnion(token), webPushUpdatedAt: new Date().toISOString() },
    { merge: true }
  );
  try {
    localStorage.setItem('web_push_token', token);
  } catch {}
  return true;
}

/**
 * Ask for permission and register. Must be called straight from a tap (iOS ignores prompts that
 * don't come from a user gesture), so the permission request happens before any other await.
 */
export async function enableWebPush(userId: string): Promise<'granted' | 'denied' | 'default' | 'unsupported' | 'error'> {
  if (!canUseWebPush()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  try {
    return (await saveToken(userId)) ? 'granted' : 'error';
  } catch (err) {
    console.warn('Web push registration failed:', err);
    return 'error';
  }
}

/** On app start: if notifications are already allowed, quietly refresh this device's token. */
export async function syncWebPushToken(userId: string) {
  if (!canUseWebPush() || Notification.permission !== 'granted') return;
  try {
    await saveToken(userId);
  } catch (err) {
    console.warn('Web push token refresh failed:', err);
  }
}
