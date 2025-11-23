/**
 * Firebase Admin SDK Helper Functions
 * 
 * Server-side helper functions for Firestore operations using Admin SDK.
 * These functions bypass security rules and are intended for use in API routes.
 */

import { db, isAdminSDKInitialized } from './firebase-admin';

/**
 * Load all applications for a specific user
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Array>} Array of application objects
 */
export async function loadApplicationsAdmin(userId) {
  try {
    if (!userId) {
      console.log('⚠️ No userId provided for loadApplicationsAdmin');
      return [];
    }

    if (!isAdminSDKInitialized() || !db) {
      const errorMessage = 'Firebase Admin SDK is not properly initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.';
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }

    console.log(`📋 Loading applications from Firebase (Admin SDK) for user: ${userId}`);
    const appsRef = db.collection('applications');
    const snapshot = await appsRef.where('userId', '==', userId).get();

    const applications = [];
    snapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Loaded ${applications.length} applications from Firebase (Admin SDK)`);
    if (applications.length > 0) {
      console.log('📋 Application references:', applications.map(app => app.reference || app.id));
    }

    return applications;
  } catch (error) {
    console.error('❌ Error loading applications (Admin SDK):', error.message || error);
    // Re-throw so API route can handle it
    throw error;
  }
}

/**
 * Create a new application in Firestore
 * @param {Object} appData - Application data object
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object>} Result object with success status and application data
 */
export async function createApplicationAdmin(appData, userId) {
  try {
    if (!isAdminSDKInitialized() || !db) {
      return { 
        success: false, 
        error: 'Firebase Admin SDK is not properly initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.' 
      };
    }

    const uid = userId || appData.userId;
    if (!uid) {
      console.error('❌ No userId provided for createApplicationAdmin');
      return { success: false, error: 'Not authenticated' };
    }

    const appRef = db.collection('applications').doc(appData.id);
    
    const appDataWithTimestamps = {
      ...appData,
      userId: uid,
      createdAt: appData.createdAt || new Date().toISOString(),
      updatedAt: appData.updatedAt || new Date().toISOString()
    };

    console.log(`💾 Creating application in Firestore (Admin SDK) with id: ${appData.id}, userId: ${uid}`);
    await appRef.set(appDataWithTimestamps);
    console.log(`✅ Application ${appData.id} created successfully in Firestore (Admin SDK)`);

    return {
      success: true,
      application: {
        ...appData,
        userId: uid,
        createdAt: appDataWithTimestamps.createdAt,
        updatedAt: appDataWithTimestamps.updatedAt
      }
    };
  } catch (error) {
    console.error('❌ Error creating application (Admin SDK):', error);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing application in Firestore
 * @param {string} appId - Application document ID
 * @param {Object} updates - Fields to update
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object>} Result object with success status and updated application data
 */
export async function updateApplicationAdmin(appId, updates, userId) {
  try {
    if (!isAdminSDKInitialized() || !db) {
      return { 
        success: false, 
        error: 'Firebase Admin SDK is not properly initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.' 
      };
    }

    const uid = userId || updates.userId;
    if (!uid) {
      console.error('❌ No userId provided for updateApplicationAdmin');
      return { success: false, error: 'Not authenticated' };
    }

    console.log(`💾 Updating application ${appId} in Firestore (Admin SDK), userId: ${uid}`);
    const appRef = db.collection('applications').doc(appId);

    // Remove id from updates if present (it's the document ID, not a field)
    const { id: _, ...updateData } = updates;

    // Get existing document to merge with updates
    const existingDoc = await appRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    // Merge existing data with updates
    const mergedData = {
      ...existingData,
      ...updateData,
      userId: uid, // Ensure userId is set
      updatedAt: new Date().toISOString()
    };

    await appRef.set(mergedData, { merge: true });
    console.log(`✅ Application ${appId} updated successfully in Firestore (Admin SDK)`);

    // Get updated application
    const updatedDoc = await appRef.get();
    const updatedApp = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    return { success: true, application: updatedApp };
  } catch (error) {
    console.error('❌ Error updating application (Admin SDK):', error);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an application from Firestore
 * @param {string} appId - Application document ID
 * @returns {Promise<Object>} Result object with success status
 */
export async function deleteApplicationAdmin(appId) {
  try {
    if (!isAdminSDKInitialized() || !db) {
      return { 
        success: false, 
        error: 'Firebase Admin SDK is not properly initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.' 
      };
    }

    console.log(`🗑️ Deleting application ${appId} from Firestore (Admin SDK)`);
    const appRef = db.collection('applications').doc(appId);
    await appRef.delete();
    console.log(`✅ Application ${appId} deleted successfully from Firestore (Admin SDK)`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting application (Admin SDK):', error);
    return { success: false, error: error.message };
  }
}

