/**
 * Firebase Database Adapter
 * 
 * Implements the BaseAdapter interface using Firebase Firestore and Auth.
 * Provides real-time sync, cloud persistence, and authentication.
 */

import { BaseAdapter } from './base';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
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
  serverTimestamp
} from 'firebase/firestore';

export class FirebaseAdapter extends BaseAdapter {
  constructor() {
    super();
    this.auth = auth;
    this.db = db;
    console.log('✅ Firebase adapter initialized');
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
  
  async login(credentials) {
    try {
      console.log('🔐 Attempting Firebase login for:', credentials.email);
      
      // Try to sign in with existing Firebase account
      try {
        const userCredential = await signInWithEmailAndPassword(
          this.auth,
          credentials.email,
          credentials.password
        );
        
        console.log('✅ Sign in successful, user ID:', userCredential.user.uid);
        
        // Ensure user profile document exists in Firestore
        await this.getUserProfile(userCredential.user.uid);
        
        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || userCredential.user.email.split('@')[0],
        };
        
        return { success: true, user };
      } catch (signInError) {
        console.log('❌ Sign in error:', signInError.code);
        
        // If user doesn't exist, auto-create account
        if (signInError.code === 'auth/user-not-found' || 
            signInError.code === 'auth/invalid-credential' ||
            signInError.code === 'auth/configuration-not-found') {
          try {
            console.log('🔐 Creating new account for:', credentials.email);
            const userCredential = await createUserWithEmailAndPassword(
              this.auth,
              credentials.email,
              credentials.password
            );
            
            console.log('✅ User created successfully, ID:', userCredential.user.uid);
            
            // Set display name from email
            const displayName = credentials.email.split('@')[0];
            
            await updateProfile(userCredential.user, {
              displayName
            });
            
            // Create user profile document in Firestore
            await this.getUserProfile(userCredential.user.uid);
            
            const user = {
              id: userCredential.user.uid,
              email: userCredential.user.email,
              name: displayName,
            };
            
            return { success: true, user };
          } catch (createError) {
            console.error('❌ Error creating user:', createError.code, createError.message);
            
            // Handle specific errors
            if (createError.code === 'auth/email-already-in-use') {
              return { 
                success: false, 
                error: 'This email is already registered. Please check your password.',
                errorCode: 'EMAIL_EXISTS'
              };
            }
            
            if (createError.code === 'auth/weak-password') {
              return { 
                success: false, 
                error: 'Password is too weak. Please use at least 6 characters.',
                errorCode: 'WEAK_PASSWORD'
              };
            }
            
            if (createError.code === 'auth/configuration-not-found') {
              return { 
                success: false, 
                error: 'Firebase Email/Password authentication is not enabled. Please enable it in Firebase Console.',
                errorCode: 'CONFIG_NOT_FOUND'
              };
            }
            
            return { success: false, error: createError.message };
          }
        }
        
        // Handle wrong password
        if (signInError.code === 'auth/wrong-password') {
          return { 
            success: false, 
            error: 'Incorrect password. Please try again.',
            errorCode: 'WRONG_PASSWORD'
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
   * ZOHO CRM SYNC METHODS
   */
  
  async syncZohoToFirebase(userId, zohoContact) {
    try {
      console.log('🔄 Syncing Zoho contact to Firebase for user:', userId);
      
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
      
      console.log('✅ Zoho data synced to Firebase successfully');
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
      const draftRef = doc(this.db, 'applications', applicationId, 'data', 'questionnaire');
      const draftSnap = await getDoc(draftRef);
      
      // Merge with existing data
      const currentDraft = draftSnap.exists() ? draftSnap.data() : {};
      const updatedDraft = { ...currentDraft, ...data };
      
      // Clean undefined values (Firestore doesn't accept them)
      const cleanedDraft = this.cleanDataForFirestore(updatedDraft);
      
      // Save to Firestore
      await setDoc(draftRef, {
        ...cleanedDraft,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
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
      
      // Save completion status to application's completion data
      const completionRef = doc(this.db, 'applications', applicationId, 'data', 'completion');
      
      await setDoc(completionRef, {
        ...completionStatus,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
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
      if (!uid) return [];
      
      const appsRef = collection(this.db, 'applications');
      const q = query(appsRef, where('userId', '==', uid));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading applications:', error);
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
  
  async createApplication(app) {
    try {
      const userId = this.auth.currentUser?.uid;
      if (!userId) return { success: false, error: 'Not authenticated' };
      
      const appData = {
        ...app,
        userId: app.userId || userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const appRef = doc(this.db, 'applications', app.id);
      await setDoc(appRef, appData);
      
      return {
        success: true,
        application: {
          ...app,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error creating application:', error);
      return { success: false, error: error.message };
    }
  }
  
  async updateApplication(id, updates) {
    try {
      const appRef = doc(this.db, 'applications', id);
      await updateDoc(appRef, {
        ...updates,
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
      console.error('Error updating application:', error);
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
