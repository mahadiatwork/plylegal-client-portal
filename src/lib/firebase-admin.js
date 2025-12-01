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

try {
  // Check if already initialized
  if (!admin.apps.length) {
    console.log('🔧 Initializing Firebase Admin SDK...');
    
    // Initialize with service account or application default credentials
    // For Replit, we can use the Firebase project credentials
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required for Admin SDK');
    }
    
    // Try to use service account JSON if available
    let serviceAccount = null;
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        serviceAccount = JSON.parse(serviceAccountKey);
        console.log('✅ Using Firebase service account credentials');
      }
    } catch (parseError) {
      console.log('⚠️ No service account key found, using default credentials');
    }
    
    // Initialize with service account or default credentials
    if (serviceAccount) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      });
    } else {
      // Use minimal initialization with project ID only
      // This works for some operations but limited functionality
      adminApp = admin.initializeApp({
        projectId: projectId,
      });
      console.log('⚠️ Admin SDK initialized with limited functionality');
      console.log('💡 Add FIREBASE_SERVICE_ACCOUNT_KEY for full admin features');
    }
    
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    adminApp = admin.app();
    console.log('✅ Using existing Firebase Admin app');
  }
  
  // Get services
  adminAuth = getAuth(adminApp);
  db = getFirestore(adminApp);
  
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error('💡 Make sure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set');
  console.error('💡 For full features, add FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)');
  throw error;
}

export { adminApp, adminAuth, db };
export default admin;
