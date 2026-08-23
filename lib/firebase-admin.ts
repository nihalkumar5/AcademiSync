import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

let dbInstance: any = null;
let messagingInstance: any = null;

function initFirebaseAdmin() {
  if (!getApps().length) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        // Safe fallback for build time
        console.warn('Firebase Admin env vars are not fully set. Lazy initialization deferred.');
        return;
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  }
}

// Export proxy wrappers to lazy initialize Firebase Admin only when used at runtime
export const adminDb = {
  get firestore() {
    initFirebaseAdmin();
    if (!dbInstance) {
      try {
        dbInstance = getFirestore();
      } catch (err) {
        console.error('Failed to get Firestore instance:', err);
        throw err;
      }
    }
    return dbInstance;
  },
  collection(path: string) {
    return this.firestore.collection(path);
  },
  doc(path: string) {
    return this.firestore.doc(path);
  },
  runTransaction(updateFunction: any, transactionOptions: any) {
    return this.firestore.runTransaction(updateFunction, transactionOptions);
  },
  batch() {
    return this.firestore.batch();
  }
} as any;

export const adminMessaging = {
  get messaging() {
    initFirebaseAdmin();
    if (!messagingInstance) {
      try {
        messagingInstance = getMessaging();
      } catch (err) {
        console.error('Failed to get Messaging instance:', err);
        throw err;
      }
    }
    return messagingInstance;
  },
  send(message: any, dryRun?: boolean) {
    return this.messaging.send(message, dryRun);
  },
  sendEach(messages: any[], dryRun?: boolean) {
    return this.messaging.sendEach(messages, dryRun);
  },
  sendEachForMulticast(message: any, dryRun?: boolean) {
    return this.messaging.sendEachForMulticast(message, dryRun);
  }
} as any;
