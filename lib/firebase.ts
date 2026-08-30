import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD5H_kryH_ujdm0e3lZgaDLPjQ8kvr_VDs",
  authDomain: "academisync-c1a37.firebaseapp.com",
  projectId: "academisync-c1a37",
  storageBucket: "academisync-c1a37.firebasestorage.app",
  messagingSenderId: "941128003754",
  appId: "1:941128003754:web:5c5b6c40eb6985afafe0d3",
  measurementId: "G-B13ZRNQ4XT"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Could not set auth persistence to local:', err);
  });
}

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
