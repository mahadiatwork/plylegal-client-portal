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

if (missingKeys.length > 0) {
  console.error(
    `Firebase configuration missing required keys: ${missingKeys.join(', ')}`
  );
  throw new Error(
    `Firebase configuration incomplete. Please add the missing environment variables: ${missingKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`).join(', ')}`
  );
}

// Initialize Firebase (no Auth needed for public access)
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully for Review & PDF app');
  console.log(`📦 Project ID: ${firebaseConfig.projectId}`);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Export Firestore only (no Auth)
export { db };

// Export configuration for debugging (safe values only)
export const config = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
};

