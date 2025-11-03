/**
 * Firebase Configuration and Initialization
 * 
 * Initializes Firebase app with credentials from Replit Secrets.
 * Provides access to Firebase Auth and Firestore.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully');
  console.log(`📦 Project ID: ${firebaseConfig.projectId}`);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Export Firebase services
export { app, auth, db };

// Export configuration for debugging (safe values only)
export const config = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
};
