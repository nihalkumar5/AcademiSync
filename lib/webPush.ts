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

/** Thrown with a short code so a failure can be shown and reported. */
class PushSetupError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
  }
}

async function saveToken(userId: string) {
  if (!(await isSupported())) throw new PushSetupError('no-sdk-support');
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  } catch (e: any) {
    throw new PushSetupError('sw-register', e?.message);
  }
  let token: string;
  try {
    token = await getToken(getMessaging(app), {
      ...(VAPID_KEY ? { vapidKey: VAPID_KEY } : {}),
      serviceWorkerRegistration: registration,
    });
  } catch (e: any) {
    throw new PushSetupError(e?.code || e?.name || 'get-token', e?.message);
  }
  if (!token) throw new PushSetupError('no-token');
  try {
    await setDoc(
      doc(db, 'users', userId),
      { webPushTokens: arrayUnion(token), webPushUpdatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e: any) {
    throw new PushSetupError(e?.code || 'save-token', e?.message);
  }
  try {
    localStorage.setItem('web_push_token', token);
  } catch {}
  return true;
}

/** Tell the server why setup failed (code + platform only), so it shows up in the logs. */
async function reportPushFailure(code: string, message: string) {
  try {
    const { getAuthHeaders } = await import('./authHeaders');
    await fetch('/api/push-debug', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        code: code.slice(0, 80),
        message: message.slice(0, 300),
        platform: isIOSDevice() ? 'ios' : /Android/i.test(navigator.userAgent) ? 'android' : 'desktop',
        standalone: isStandalonePWA(),
        vapid: VAPID_KEY ? 'custom' : 'default',
      }),
    });
  } catch {}
}

/**
 * Ask for permission and register. Must be called straight from a tap (iOS ignores prompts that
 * don't come from a user gesture), so the permission request happens before any other await.
 */
export type EnablePushResult = 'granted' | 'denied' | 'default' | 'unsupported' | 'error';

export async function enableWebPush(userId: string): Promise<{ result: EnablePushResult; reason?: string }> {
  if (!canUseWebPush()) return { result: 'unsupported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { result: permission };
  try {
    await saveToken(userId);
    return { result: 'granted' };
  } catch (err: any) {
    const code = err instanceof PushSetupError ? err.code : 'unknown';
    console.warn('Web push registration failed:', code, err?.message);
    reportPushFailure(code, String(err?.message || ''));
    return { result: 'error', reason: code };
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
