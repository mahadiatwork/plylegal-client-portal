/**
 * Firebase Database Adapter
 * 
 * Implements the BaseAdapter interface using Firebase Firestore and Auth.
 * Provides real-time sync, cloud persistence, and authentication.
 */

import { BaseAdapter } from './base';
import { auth, db } from '@/lib/firebase';
import {
  mapZohoDealToVisaTypeCode,
  normalizeSkillsInDemandTypeLabel,
} from '@/lib/visaDisplay';
import { nanoid } from 'nanoid';
import { diffDraftKeys, draftSignatures } from '@/lib/draftSync';
import { applicationsStore } from '@/stores/applicationsStore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

export class FirebaseAdapter extends BaseAdapter {
  constructor() {
    super();
    if (!auth || !db) {
      throw new Error('Firebase is not configured with required credentials.');
    }
    this.auth = auth;
    this.db = db;
    // applicationId -> { topLevelKey: JSON signature } of the last loaded/saved draft
    this._draftBaselines = new Map();
  }
  
  /**
   * AUTH METHODS
   */

  /**
   * Wait for Firebase Auth to initialize and return current user
   * This is critical for session persistence on page refresh
   */
  async waitForAuthReady() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  async verifyPortalAccess(email) {
    try {
      const response = await fetch('/api/auth/verify-zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (!response.ok || !result.success || result.allowed === false) {
        return {
          success: false,
          error: result.error || 'Portal access is not available for this account.',
          errorCode: result.errorCode || 'PORTAL_ACCESS_DENIED',
        };
      }

      return {
        success: true,
        zohoContact: result.zohoContact || null,
        portalAccess: result.portalAccess || 'Active',
        needsPasswordChange: !!result.needsPasswordChange,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to verify portal access right now. Please try again.',
        errorCode: 'ZOHO_VERIFICATION_FAILED',
      };
    }
  }
  
  async login(credentials) {
    try {
      console.log('🔐 Attempting Firebase login for:', credentials.email);
      const verification = await this.verifyPortalAccess(credentials.email);
      if (!verification.success) {
        return verification;
      }
      
      // Try to sign in with existing Firebase account
      try {
        const userCredential = await signInWithEmailAndPassword(
          this.auth,
          credentials.email,
          credentials.password
        );
        
        // Ensure user profile document exists in Firestore
        await this.getUserProfile(userCredential.user.uid);
        await this.updateUserProfile(userCredential.user.uid, {
          portalAccess: true,
          needsPasswordChange: verification.needsPasswordChange,
          zohoContactId: verification.zohoContact?.id || undefined,
          updatedAt: serverTimestamp(),
        });
        
        // Fetch deals/applications from Zoho CRM on login and save to Firebase (non-blocking)
        // This should never break login - if Zoho fails, user can still login
        try {
          const userProfile = await this.getUserProfile(userCredential.user.uid);
          if (userProfile?.zohoContactId) {
            // Get ID token for authenticated Firestore requests
            const idToken = await userCredential.user.getIdToken();
            // Use API route to fetch and save to Firebase (ensures correct field mapping)
            fetch('/api/applications/fetch-zoho-deals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userCredential.user.uid,
                zohoContactId: userProfile.zohoContactId,
                idToken: idToken,
                source: 'login',
              }),
            })
              .then(async (response) => {
                const result = await response.json();
                if (result.success) {
                  // Let the applications page skip its own immediate re-sync
                  try {
                    sessionStorage.setItem(`ply_deals_synced_at:${userCredential.user.uid}`, String(Date.now()));
                  } catch {}
                  // Store raw deals data in store for JSON display
                  applicationsStore.rawDealsData = result.rawDealsData || [];
                  // Reload applications from Firebase to show the newly saved deals
                  await applicationsStore.loadApplications(userCredential.user.uid, { force: true });
                } else {
                  console.error('⚠️ Failed to fetch deals from Zoho:', result.error);
                }
              })
              .catch((dealError) => {
                console.error('⚠️ Failed to fetch deals from Zoho on login (non-critical):', dealError.message);
              });
          }
        } catch (zohoError) {
          // Log but don't fail login
          console.error('⚠️ Error checking Zoho on login (non-critical):', zohoError.message);
        }
        
        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || userCredential.user.email.split('@')[0],
        };
        
        return { success: true, user };
      } catch (signInError) {
        console.log('❌ Sign in error:', signInError.code);

        // Handle invalid credential (wrong password or user not found)
        if (signInError.code === 'auth/invalid-credential' ||
            signInError.code === 'auth/wrong-password') {
          return {
            success: false,
            error: 'Incorrect email or password. Please try again.',
            errorCode: 'INVALID_CREDENTIAL'
          };
        }

        // Handle user not found
        if (signInError.code === 'auth/user-not-found') {
          return {
            success: false,
            error: 'No account found with this email.',
            errorCode: 'USER_NOT_FOUND'
          };
        }

        // Handle invalid email
        if (signInError.code === 'auth/invalid-email') {
          return {
            success: false,
            error: 'Invalid email address format.',
            errorCode: 'INVALID_EMAIL'
          };
        }

        // Handle configuration not found
        if (signInError.code === 'auth/configuration-not-found') {
          return {
            success: false,
            error: 'Firebase Email/Password authentication is not enabled. Please enable it in Firebase Console.',
            errorCode: 'CONFIG_NOT_FOUND'
          };
        }

        // Generic error
        return { success: false, error: signInError.message };
      }
    } catch (error) {
      console.error('❌ Firebase login error:', error.code, error.message);
      return { success: false, error: error.message };
    }
  }
  
  async logout() {
    try {
      await signOut(this.auth);
      this._draftBaselines.clear();
      return { success: true };
    } catch (error) {
      console.error('Firebase logout error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async checkSession() {
    try {
      // Wait for Firebase Auth to initialize (critical for session persistence)
      const user = await this.waitForAuthReady();
      
      if (!user) {
        return { isAuthenticated: false };
      }
      
      // Load user profile from Firestore
      const profile = await this.getUserProfile(user.uid);
      
      return {
        isAuthenticated: true,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email,
        },
        profile, // Include full profile data
      };
    } catch (error) {
      console.error('Error checking session:', error);
      return { isAuthenticated: false };
    }
  }
  
  async getUser() {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    return {
      id: user.uid,
      email: user.email,
      name: user.displayName || user.email,
    };
  }
  
  /**
   * USER PROFILE METHODS
   */
  
  async getUserProfile(userId) {
    try {
      const uid = userId || this.auth.currentUser?.uid;
      if (!uid) {
        console.warn('No user ID provided');
        return null;
      }
      
      const userRef = doc(this.db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create default profile if doesn't exist
        const defaultProfile = {
          email: this.auth.currentUser?.email || '',
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userRef, defaultProfile);
        
        // Re-fetch to get concrete timestamp values (not sentinels)
        const newSnap = await getDoc(userRef);
        return newSnap.data();
      }
      
      return userSnap.data();
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  async updateUserProfile(userId, profileData) {
    try {
      const uid = userId || this.auth.currentUser?.uid;
      if (!uid) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const userRef = doc(this.db, 'users', uid);
      
      // Update profile with new data
      await setDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }
  
  async markProfileComplete(userId) {
    try {
      const uid = userId || this.auth.currentUser?.uid;
      if (!uid) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const userRef = doc(this.db, 'users', uid);
      await updateDoc(userRef, {
        profileCompleted: true,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error marking profile complete:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Extract Visa Type from Deal Name
   * Deal_Name format: "Name - Visa Type (Subclass XXX)"
   * Example: "Mahmudul Hassan - Protection Visa (Subclass 866)"
   * @param {string} dealName - Deal name from Zoho
   * @returns {string|null} Visa type or null if not found
   */
  extractVisaTypeFromDealName(dealName) {
    if (!dealName) return null;
    
    // Try to extract visa type from patterns like:
    // "Name - Protection Visa (Subclass 866)"
    // "Name - Skills in Demand Visa (Subclass 482)" (legacy CRM may still say Temporary Work)
    // "Name - Partner Visa (Subclass 820)"
    const patterns = [
      /-\s*([^-]+?)\s*\(/i, // Match " - Visa Type ("
      /-\s*([^-]+?)$/i,      // Match " - Visa Type" at end
    ];
    
    for (const pattern of patterns) {
      const match = dealName.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Map Zoho Deal stage to application status
   * @param {string} stage - Zoho Deal stage
   * @returns {string} Application status
   */
  mapDealStageToStatus(stage) {
    const stageLower = (stage || '').toLowerCase();
    
    if (stageLower.includes('draft') || stageLower.includes('qualification')) {
      return 'draft';
    }
    if (stageLower.includes('submitted') || stageLower.includes('proposal')) {
      return 'pending';
    }
    if (stageLower.includes('review') || stageLower.includes('negotiation')) {
      return 'under_review';
    }
    if (stageLower.includes('won') || stageLower.includes('approved')) {
      return 'approved';
    }
    if (stageLower.includes('lost') || stageLower.includes('rejected')) {
      return 'rejected';
    }
    
    return 'draft'; // Default
  }

  /**
   * Map Zoho Deal to visa type code
   * @param {Object} deal - Zoho Deal object
   * @returns {string} Visa type code
   */
  mapDealToVisaType(deal) {
    return mapZohoDealToVisaTypeCode(deal);
  }

  /**
   * ZOHO CRM SYNC METHODS
   */
  
  async syncZohoToFirebase(userId, zohoContact) {
    try {
      
      const userRef = doc(this.db, 'users', userId);
      
      // Map Zoho fields to Firebase profile structure
      const profileData = {
        email: zohoContact.Email || '',
        firstName: zohoContact.First_Name || '',
        lastName: zohoContact.Last_Name || '',
        fullName: `${zohoContact.First_Name || ''} ${zohoContact.Last_Name || ''}`.trim(),
        phone: zohoContact.Phone || zohoContact.Mobile || '',
        mobile: zohoContact.Mobile || '',
        
        // Zoho-specific fields
        zohoContactId: zohoContact.id,
        zohoAccountName: zohoContact.Account_Name?.name || '',
        zohoAccountId: zohoContact.Account_Name?.id || '',
        zohoOwner: zohoContact.Owner?.name || '',
        zohoOwnerId: zohoContact.Owner?.id || '',
        
        // Additional Zoho fields
        mailingStreet: zohoContact.Mailing_Street || '',
        mailingCity: zohoContact.Mailing_City || '',
        mailingState: zohoContact.Mailing_State || '',
        mailingZip: zohoContact.Mailing_Zip || '',
        mailingCountry: zohoContact.Mailing_Country || '',
        
        // Metadata
        zohoSyncedAt: serverTimestamp(),
        zohoLastSyncedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };
      
      // Store complete Zoho contact data in a subcollection for reference
      const zohoDataRef = doc(this.db, 'users', userId, 'zoho', 'contact');
      await setDoc(zohoDataRef, {
        ...zohoContact,
        syncedAt: serverTimestamp(),
      });
      
      // Update main profile with mapped data
      await setDoc(userRef, profileData, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error syncing Zoho to Firebase:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * DRAFT METHODS
   * Drafts are now stored per-application: applications/{appId}/data/questionnaire
   */
  
  // Helper: Remove undefined values from object (Firestore doesn't accept undefined)
  cleanDataForFirestore(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.cleanDataForFirestore(item));
    
    const cleaned = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = this.cleanDataForFirestore(value);
      }
    }
    return cleaned;
  }
  
  async saveDraft(data, applicationId) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) {
        console.warn('No authenticated user, cannot save draft');
        return { success: false, error: 'Not authenticated' };
      }
      
      if (!applicationId) {
        console.warn('No application ID provided, cannot save draft');
        return { success: false, error: 'Application ID required' };
      }
      
      // Save draft to application's questionnaire data
      // setDoc({ merge: true }) merges server-side, so no read-before-write is needed.
      const draftRef = doc(this.db, 'applications', applicationId, 'data', 'questionnaire');

      // Clean undefined values (Firestore doesn't accept them)
      const cleanedDraft = this.cleanDataForFirestore({ ...data });

      // Only send top-level keys that differ from the last loaded/saved state.
      // The merge write leaves the other keys untouched on the server, so the
      // result is identical but the payload stays small as the draft grows.
      const baseline = this._draftBaselines.get(applicationId);
      const { changed, signatures: nextSignatures } = diffDraftKeys(cleanedDraft, baseline);

      if (baseline && Object.keys(changed).length === 0) {
        return { success: true, draft: cleanedDraft };
      }

      // Save to Firestore
      await setDoc(draftRef, {
        ...changed,
        updatedAt: serverTimestamp()
      }, { merge: true });

      this._draftBaselines.set(applicationId, { ...(baseline || {}), ...nextSignatures });
      return { success: true, draft: cleanedDraft };
    } catch (error) {
      console.error('Error saving draft:', error);
      return { success: false, error: error.message };
    }
  }
  
  async loadDraft(applicationId) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) return {};
      
      if (!applicationId) {
        console.warn('No application ID provided');
        return {};
      }
      
      const draftRef = doc(this.db, 'applications', applicationId, 'data', 'questionnaire');
      const draftSnap = await getDoc(draftRef);
      
      if (!draftSnap.exists()) return {};
      
      const data = draftSnap.data();
      // Remove Firebase metadata
      const { updatedAt, ...draftData } = data;

      // Remember what is stored so later saves can send only the changed keys
      this._draftBaselines.set(
        applicationId,
        draftSignatures(this.cleanDataForFirestore({ ...draftData }))
      );
      
      return draftData;
    } catch (error) {
      console.error('Error loading draft:', error);
      return {};
    }
  }
  
  async clearDraft(applicationId) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) return { success: false, error: 'Not authenticated' };
      
      if (!applicationId) {
        return { success: false, error: 'Application ID required' };
      }
      
      const draftRef = doc(this.db, 'applications', applicationId, 'data', 'questionnaire');
      await deleteDoc(draftRef);
      this._draftBaselines.delete(applicationId);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing draft:', error);
      return { success: false, error: error.message };
    }
  }
  
  async setPrefill(value) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) return { success: false, error: 'Not authenticated' };
      
      const prefsRef = doc(this.db, 'users', userId, 'preferences', 'settings');
      await setDoc(prefsRef, { prefill: value }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error setting prefill:', error);
      return { success: false, error: error.message };
    }
  }
  
  async saveCompletionStatus(completionStatus, applicationId) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) {
        console.warn('No authenticated user, cannot save completion status');
        return { success: false, error: 'Not authenticated' };
      }
      
      if (!applicationId) {
        console.warn('No application ID provided, cannot save completion status');
        return { success: false, error: 'Application ID required' };
      }
      
      const cleanedCompletionStatus = this.cleanDataForFirestore(completionStatus || {});

      // Save completion status to application's completion data and mirror the
      // derived percentage onto the questionnaire doc for durable reporting.
      const completionRef = doc(this.db, 'applications', applicationId, 'data', 'completion');
      const questionnaireRef = doc(this.db, 'applications', applicationId, 'data', 'questionnaire');
      const batch = writeBatch(this.db);
      
      batch.set(completionRef, {
        ...cleanedCompletionStatus,
        updatedAt: serverTimestamp()
      });

      if (typeof cleanedCompletionStatus.completionPercentage === 'number') {
        batch.set(questionnaireRef, {
          completionPercentage: cleanedCompletionStatus.completionPercentage,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error saving completion status:', error);
      return { success: false, error: error.message };
    }
  }
  
  async loadCompletionStatus(applicationId) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) return {};
      
      if (!applicationId) {
        console.warn('No application ID provided');
        return {};
      }
      
      const completionRef = doc(this.db, 'applications', applicationId, 'data', 'completion');
      const completionSnap = await getDoc(completionRef);
      
      if (!completionSnap.exists()) return {};
      
      const data = completionSnap.data();
      // Remove Firebase metadata
      const { updatedAt, ...completionData } = data;
      
      return completionData;
    } catch (error) {
      console.error('Error loading completion status:', error);
      return {};
    }
  }

  async getPrefill() {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) return false;
      
      const prefsRef = doc(this.db, 'users', userId, 'preferences', 'settings');
      const prefsSnap = await getDoc(prefsRef);
      
      if (!prefsSnap.exists()) return false;
      
      return prefsSnap.data().prefill || false;
    } catch (error) {
      console.error('Error getting prefill:', error);
      return false;
    }
  }
  
  /**
   * APPLICATIONS METHODS
   */
  
  async loadApplications(userId) {
    try {
      const uid = userId || this.auth.currentUser?.uid;
      if (!uid) {
        return [];
      }
      
      const appsRef = collection(this.db, 'applications');
      const q = query(appsRef, where('userId', '==', uid));
      const snapshot = await getDocs(q);
      
      const applications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return applications;
    } catch (error) {
      console.error('❌ Error loading applications:', error);
      return [];
    }
  }
  
  async getApplication(id) {
    try {
      const appRef = doc(this.db, 'applications', id);
      const appSnap = await getDoc(appRef);
      
      if (!appSnap.exists()) return null;
      
      return {
        id: appSnap.id,
        ...appSnap.data()
      };
    } catch (error) {
      console.error('Error getting application:', error);
      return null;
    }
  }
  
  async createApplication(app, userId = null) {
    try {
      // Accept userId as parameter (for server-side API routes) or use current user
      const uid = userId || app.userId || this.auth.currentUser?.uid;
      if (!uid) {
        console.error('❌ No userId provided for createApplication');
        return { success: false, error: 'Not authenticated' };
      }
      
      const appData = {
        ...app,
        userId: uid,
        publicReviewAccess: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const appRef = doc(this.db, 'applications', app.id);
      await setDoc(appRef, appData);
      
      return {
        success: true,
        application: {
          ...app,
          userId: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error creating application:', error);
      console.error('❌ Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }
  
  async updateApplication(id, updates, userId = null) {
    try {
      // Accept userId as parameter (for server-side API routes) or use from updates
      const uid = userId || updates.userId || this.auth.currentUser?.uid;
      if (!uid) {
        console.error('❌ No userId provided for updateApplication');
        return { success: false, error: 'Not authenticated' };
      }
      
      const appRef = doc(this.db, 'applications', id);
      
      // Remove id from updates if present (it's the document ID, not a field)
      const { id: _, ...updateData } = updates;
      
      await updateDoc(appRef, {
        ...updateData,
        userId: uid, // Ensure userId is set
        publicReviewAccess: true,
        updatedAt: serverTimestamp()
      });
      
      // Get updated application
      const appSnap = await getDoc(appRef);
      const updatedApp = {
        id: appSnap.id,
        ...appSnap.data()
      };
      
      return { success: true, application: updatedApp };
    } catch (error) {
      console.error('❌ Error updating application:', error);
      console.error('❌ Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }
  
  async deleteApplication(id) {
    try {
      // Delete application
      const appRef = doc(this.db, 'applications', id);
      await deleteDoc(appRef);
      
      // Also clear app data
      await this.clearAppData(id);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting application:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * APP DATA METHODS
   */
  
  async loadAppData(appId, dataType) {
    try {
      const dataRef = doc(this.db, 'applications', appId, 'data', dataType);
      const dataSnap = await getDoc(dataRef);
      
      if (!dataSnap.exists()) return [];
      
      return dataSnap.data().items || [];
    } catch (error) {
      console.error(`Error loading ${dataType} for app ${appId}:`, error);
      return [];
    }
  }
  
  async saveAppData(appId, dataType, data) {
    try {
      const dataRef = doc(this.db, 'applications', appId, 'data', dataType);
      await setDoc(dataRef, {
        items: data,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, data };
    } catch (error) {
      console.error(`Error saving ${dataType} for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  async clearAppData(appId) {
    try {
      const types = ['uploads', 'docs', 'tasks', 'deliverables', 'messages'];
      
      // Delete all data types for this app
      const promises = types.map(type => {
        const dataRef = doc(this.db, 'applications', appId, 'data', type);
        return deleteDoc(dataRef);
      });
      
      await Promise.all(promises);
      
      return { success: true };
    } catch (error) {
      console.error(`Error clearing data for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * REAL-TIME LISTENERS
   */
  
  async subscribeToAuth(callback) {
    const unsubscribe = onAuthStateChanged(this.auth, (user) => {
      callback({
        user: user ? {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email
        } : null,
        isAuthenticated: !!user
      });
    });
    
    return unsubscribe;
  }
  
  async subscribeToDraft(callback) {
    const userId = this.auth.currentUser?.uid;
    if (!userId) {
      callback({});
      return () => {};
    }
    
    const draftRef = doc(this.db, 'users', userId, 'drafts', 'current');
    const unsubscribe = onSnapshot(draftRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const { updatedAt, ...draftData } = data;
        callback(draftData);
      } else {
        callback({});
      }
    });
    
    return unsubscribe;
  }
  
  async subscribeToApplications(userId, callback) {
    const uid = userId || this.auth.currentUser?.uid;
    if (!uid) {
      callback([]);
      return () => {};
    }
    
    const appsRef = collection(this.db, 'applications');
    const q = query(appsRef, where('userId', '==', uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(apps);
    });
    
    return unsubscribe;
  }
  
  async subscribeToAppData(appId, dataType, callback) {
    const dataRef = doc(this.db, 'applications', appId, 'data', dataType);
    
    const unsubscribe = onSnapshot(dataRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data().items || []);
      } else {
        callback([]);
      }
    });
    
    return unsubscribe;
  }
}
