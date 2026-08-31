import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence 
} from 'firebase/auth';

const isBrowser = typeof window !== 'undefined';

// Use same-origin host when in production browser so college firewalls & privacy shields treat auth as 1st-party
const resolvedAuthDomain = isBrowser && window.location.host && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1')
  ? window.location.host
  : "academisync-c1a37.firebaseapp.com";

const firebaseConfig = {
  apiKey: "AIzaSyD5H_kryH_ujdm0e3lZgaDLPjQ8kvr_VDs",
  authDomain: resolvedAuthDomain,
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

// Robust multi-tier persistence for restricted environments (Private browsing / Campus PCs / Brave Shields)
if (isBrowser) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Fallback to session persistence if local/IndexedDB is blocked
    setPersistence(auth, browserSessionPersistence).catch(() => {
      // Fallback to in-memory persistence if all storage is restricted
      setPersistence(auth, inMemoryPersistence).catch((err) => {
        console.warn('Auth persistence fallback warning:', err);
      });
    });
  });
}

// Messaging is only supported in browser contexts
let messaging: any = null;
if (isBrowser) {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { app, db, messaging, auth };
