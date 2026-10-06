/**
 * Firebase Configuration for Review & PDF App
 * 
 * Initializes Firebase app with credentials from environment variables.
 * No Auth needed since app is public access.
 */

import { initializeApp } from 'firebase/app';
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
const isConfigured = missingKeys.length === 0;

// Initialize Firebase (no Auth needed for public access)
let app = null;
let db = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully for Review & PDF app');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn(
    `⚠️ Review & PDF Firebase configuration incomplete. Missing keys: ${missingKeys.join(', ')}`
  );
}

// Export Firestore only (no Auth)
export { db };

// Export configuration for debugging (safe values only)
export const config = {
  projectId: firebaseConfig.projectId || null,
  authDomain: firebaseConfig.authDomain || null,
};


