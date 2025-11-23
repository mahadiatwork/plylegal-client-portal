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

let adminApp;
let adminAuth;
let db;
let isInitialized = false;

try {
  // Check if already initialized
  if (!admin.apps.length) {
    console.log('🔧 Initializing Firebase Admin SDK...');
    
    // Initialize with service account or application default credentials
    // For Replit, we can use the Firebase project credentials
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      console.warn('⚠️ NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. Admin SDK will not be available.');
      isInitialized = false;
    } else {
      // Try to use service account JSON if available
      let serviceAccount = null;
      try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey) {
          serviceAccount = JSON.parse(serviceAccountKey);
          console.log('✅ Using Firebase service account credentials');
        }
      } catch (parseError) {
        console.log('⚠️ No service account key found or invalid JSON');
      }
      
      // Initialize with service account or default credentials
      if (serviceAccount) {
        try {
          adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId,
          });
          isInitialized = true;
          console.log('✅ Firebase Admin SDK initialized with service account');
        } catch (initError) {
          console.error('❌ Failed to initialize Admin SDK with service account:', initError.message);
          isInitialized = false;
        }
      } else {
        // Don't initialize without credentials - it will fail when trying to use Firestore
        console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not set');
        console.warn('💡 Admin SDK will not be initialized - Firestore operations will fail');
        console.warn('💡 To fix: Add FIREBASE_SERVICE_ACCOUNT_KEY environment variable with your service account JSON');
        console.warn('💡 For local development, you can skip Admin SDK operations or provide credentials');
        isInitialized = false;
      }
    }
  } else {
    adminApp = admin.app();
    isInitialized = true;
    console.log('✅ Using existing Firebase Admin app');
  }
  
  // Get services only if initialized
  if (isInitialized && adminApp) {
    try {
      adminAuth = getAuth(adminApp);
      db = getFirestore(adminApp);
    } catch (serviceError) {
      console.error('❌ Failed to get Admin SDK services:', serviceError.message);
      isInitialized = false;
    }
  }
  
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error('💡 Make sure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set');
  console.error('💡 For full features, add FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)');
  isInitialized = false;
}

// Export a function to check if Admin SDK is properly initialized
export function isAdminSDKInitialized() {
  return isInitialized && db !== undefined;
}

export { adminApp, adminAuth, db };
export default admin;
