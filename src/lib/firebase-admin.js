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
    if (!admin.apps.length) {
      console.log('🔧 Initializing Firebase Admin SDK...');

      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required for Admin SDK');
      }

      // Try to use service account JSON if available
      let serviceAccount = null;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        console.log('🔑 Raw service account key length:', serviceAccountKey.length);
        console.log('🔑 Raw service account key starts with:', serviceAccountKey.substring(0, 50));
        try {
          serviceAccount = JSON.parse(serviceAccountKey);
          // Fix for escaped newlines in private key
          if (serviceAccount && serviceAccount.private_key) {
            let key = serviceAccount.private_key;
            
            // 1. Replace literal \n string with actual newline
            key = key.replace(/\\n/g, '\n');
            
            // 2. If it's still missing newlines in the body, add them (every 64 chars)
            // But first, normalize by removing existing internal newlines if any
            const header = '-----BEGIN PRIVATE KEY-----';
            const footer = '-----END PRIVATE KEY-----';
            
            if (key.includes(header) && key.includes(footer)) {
              let body = key.split(header)[1].split(footer)[0].replace(/\s+/g, '');
              let formattedBody = '';
              for (let i = 0; i < body.length; i += 64) {
                formattedBody += body.substring(i, i + 64) + '\n';
              }
              key = `${header}\n${formattedBody}${footer}\n`;
            }
            
            serviceAccount.private_key = key;
            console.log('🔑 Fixed private key length:', serviceAccount.private_key.length);
          }
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
    console.error('❌ Firebase Admin initialization failed:', error.message);
    initError = error.message;
    return { success: false, error: error.message };
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
