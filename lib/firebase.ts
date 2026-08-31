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

const isBrowser = typeof window !== 'undefined';

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
