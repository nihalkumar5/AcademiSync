import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';

const sanitizeConfigValue = (val: string | undefined) => {
  if (!val) return val;
  return val.replace(/^["']|["']$/g, '');
};

const firebaseConfig = {
  apiKey: sanitizeConfigValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: sanitizeConfigValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeConfigValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeConfigValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeConfigValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeConfigValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Messaging is only supported in browser contexts
let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { app, db, messaging, auth };
