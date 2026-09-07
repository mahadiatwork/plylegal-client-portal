/**
 * Firebase Admin SDK Configuration
 * 
 * Server-side Firebase initialization for admin operations like:
 * - Creating users with custom passwords
 * - Managing user accounts
 * - Server-side Firestore operations
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { parseFirebaseServiceAccount } from './firebaseServiceAccount.js';

let adminApp = null;
let adminAuth = null;
let db = null;
let isInitialized = false;
let initError = null;

function initializeAdminSDK() {
  if (isInitialized) return { success: !!db, error: initError };

  isInitialized = true;

  try {
    // Check if already initialized
    if (!admin.apps.some((app) => app.name === '[DEFAULT]')) {
      console.log('🔧 Initializing Firebase Admin SDK...');

      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required for Admin SDK');
      }

      // Try to use service account JSON if available
      let serviceAccount = null;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        try {
          serviceAccount = parseFirebaseServiceAccount(serviceAccountKey);
          console.log('✅ Found Firebase service account credentials');
        } catch (parseError) {
          console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
        }
      }

      // Initialize with service account credentials (REQUIRED for Firestore operations)
      if (serviceAccount) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
        console.log('✅ Firebase Admin SDK initialized with service account');

        // Get services only if we have proper credentials
        adminAuth = getAuth(adminApp);
        db = getFirestore(adminApp);
      } else {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY is required for server-side Firestore operations');
        console.error('💡 To get a service account key:');
        console.error('   1. Go to Firebase Console → Project Settings → Service Accounts');
        console.error('   2. Click "Generate New Private Key"');
        console.error('   3. Add the JSON content to your .env file as FIREBASE_SERVICE_ACCOUNT_KEY');
        initError = 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable';
        return { success: false, error: initError };
      }
    } else {
      adminApp = admin.app();
      adminAuth = getAuth(adminApp);
      db = getFirestore(adminApp);
      console.log('✅ Using existing Firebase Admin app');
    }

    return { success: true, error: null };
  } catch (error) {
    initError = 'Firebase Admin initialization failed. Check the server service-account configuration.';
    console.error(initError);
    return { success: false, error: initError };
  }
}

// Initialize on module load
const initResult = initializeAdminSDK();

/**
 * Safely get the Firestore db instance.
 * Returns { ok: true, db } or { ok: false, error: string }
 * so API routes can return a clean JSON 500 instead of crashing.
 */
export function getDb() {
  if (db) return { ok: true, db };
  return {
    ok: false,
    error: initResult.error || 'Firebase Admin SDK Firestore not initialized. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set.',
  };
}

/**
 * Safely get the Firebase Admin Auth instance.
 */
export function getAdminAuth() {
  if (adminAuth) return { ok: true, adminAuth };
  return {
    ok: false,
    error: initResult.error || 'Firebase Admin SDK Auth not initialized. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set.',
  };
}

export { adminApp, adminAuth, db, initResult };
export default admin;
