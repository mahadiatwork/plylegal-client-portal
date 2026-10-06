/**
 * Firebase Configuration and Initialization
 * 
 * Initializes Firebase app with credentials from Replit Secrets.
 * Provides access to Firebase Auth and Firestore.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate configuration
const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
const isFirebaseConfigured = missingKeys.length === 0;

// Initialize Firebase
let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Explicitly set persistence to local (IndexedDB) so sessions survive
    // browser/tab closes.
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('⚠️ Could not set auth persistence:', err.message);
    });
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn(
    `⚠️ Firebase configuration incomplete. Missing keys: ${missingKeys.join(', ')}. Set NEXT_PUBLIC_FIREBASE_* variables in .env.local to enable cloud sync.`
  );
}

// Export Firebase services
export { app, auth, db, isFirebaseConfigured };

// Export configuration for debugging (safe values only)
export const config = {
  projectId: firebaseConfig.projectId || null,
  authDomain: firebaseConfig.authDomain || null,
};

