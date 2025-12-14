/**
 * Firebase Database Adapter
 * 
 * Implements the BaseAdapter interface using Firebase Firestore and Auth.
 * Provides real-time sync, cloud persistence, and authentication.
 */

import { BaseAdapter } from './base';
import { auth, db } from '@/lib/firebase';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { nanoid } from 'nanoid';
import { applicationsStore } from '@/stores/applicationsStore';
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
        
        // Ensure user profile document exists in Firestore
        await this.getUserProfile(userCredential.user.uid);
        
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
              }),
            })
              .then(async (response) => {
                const result = await response.json();
                if (result.success) {
                  // Store raw deals data in store for JSON display
                  applicationsStore.rawDealsData = result.rawDealsData || [];
                  // Reload applications from Firebase to show the newly saved deals
                  await applicationsStore.loadApplications(userCredential.user.uid);
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
            
            
            // Set display name from email
            const displayName = credentials.email.split('@')[0];
            
            await updateProfile(userCredential.user, {
              displayName
            });
            
            // Create user profile document in Firestore
            await this.getUserProfile(userCredential.user.uid);
            
            // Try to populate profile from Zoho CRM (non-blocking)
            try {
              const populateResult = await this.populateFromZoho(
                userCredential.user.uid,
                userCredential.user.email
              );
              
              if (populateResult.populated) {
                // Reload profile to get updated data
                await this.getUserProfile(userCredential.user.uid);
                
                // Reload applications to get any new deals/applications from Zoho
                try {
                  await applicationsStore.loadApplications(userCredential.user.uid);
                } catch (appError) {
                  console.error('⚠️ Failed to reload applications (non-critical):', appError.message);
                }
              }
            } catch (zohoError) {
              // Log error but don't fail registration
              console.error('⚠️ Failed to populate from Zoho (non-critical):', zohoError.message);
            }
            
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
   * Populate user profile and applications from Zoho CRM after auto-registration
   * @param {string} userId - Firebase user ID
   * @param {string} email - User email address
   * @returns {Promise<{success: boolean, populated: boolean, error?: string}>}
   */
  async populateFromZoho(userId, email) {
    try {
      const zohoClient = new ZohoCRMClient();
      
      // Find contact by email
      const contact = await zohoClient.findContactByEmail(email);
      
      if (!contact) {
        return { success: true, populated: false };
      }
      
      // Map Zoho contact fields to Firebase profile structure
      // Note: Zoho uses exact field names like First_Name, Last_Name, Mailing_State, etc.
      const profileData = {
        // Use exact Zoho field names (with underscores)
        firstName: contact.First_Name || '',
        lastName: contact.Last_Name || '',
        phone: contact.Phone || contact.Mobile || '',
        mobile: contact.Mobile || '',
        streetAddress: contact.Mailing_Street || '',
        suburb: contact.Mailing_Suburb || '',
        // Mailing_State might be null, check Pick_List_1 as fallback (custom field for state)
        state: contact.Mailing_State || contact.Pick_List_1 || '',
        postcode: contact.Mailing_Zip || '',
        country: contact.Mailing_Country || '',
        
        // Zoho-specific fields
        zohoContactId: contact.id,
        zohoAccountName: contact.Account_Name?.name || '',
        zohoAccountId: contact.Account_Name?.id || '',
        zohoOwner: contact.Owner?.name || '',
        zohoOwnerId: contact.Owner?.id || '',
        
        // Additional Zoho fields
        mailingStreet: contact.Mailing_Street || '',
        mailingCity: contact.Mailing_Suburb || '', // Mailing_City might be null, use Mailing_Suburb
        mailingState: contact.Mailing_State || contact.Pick_List_1 || '',
        mailingZip: contact.Mailing_Zip || '',
        mailingCountry: contact.Mailing_Country || '',
        
        // Additional useful fields from Zoho
        dateOfBirth: contact.Date_of_Birth || '',
        fullName: contact.Full_Name || '',
        
        // Metadata
        zohoLastSyncedAt: new Date().toISOString(),
        syncSource: 'zoho', // Prevent sync back to Zoho
      };
      
      console.log('📋 Mapped profile data:', JSON.stringify(profileData, null, 2));

      // Fetch dependencies from Partner_Dependents related list
      try {
        const dependents = await zohoClient.getRelatedRecords('Contacts', contact.id, 'Partner_Dependents');
        
        if (dependents && dependents.length > 0) {
          console.log(`📋 Found ${dependents.length} dependents in Partner_Dependents related list`);
          const dependencies = dependents.map(dep => {
            // Parse Name field to get lastName if Last_Name is not available
            // Name format might be "First Last" or just "Last"
            const fullName = dep.Name || '';
            const nameParts = fullName.split(' ');
            const lastName = dep.Last_Name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '');
            
            return {
              firstName: dep.First_Name || '',
              lastName: lastName,
              relationship: dep.Relationship_to_Applicant || dep.Relationship || dep.relationship || '',
              dateOfBirth: dep.Date_of_Birth || dep.dateOfBirth || '',
              citizenship: dep.Citizenship || dep.citizenship || '',
              gender: dep.Gender || '',
              email: dep.Email || '',
            };
          });
          
          if (dependencies.length > 0) {
            profileData.dependencies = dependencies;
            console.log('✅ Loaded dependencies from Partner_Dependents related list');
          }
        } else {
          console.log('📋 No dependents found in Partner_Dependents related list');
          profileData.dependencies = [];
        }
      } catch (depError) {
        console.error('⚠️ Failed to fetch dependencies from related list:', depError.message);
        profileData.dependencies = [];
      }

      // Check if profile has all required fields to mark as complete
      const hasRequiredFields = profileData.firstName && profileData.lastName && 
                               profileData.phone && profileData.streetAddress && 
                               profileData.suburb && profileData.state && 
                               profileData.postcode && profileData.country;
      
      if (hasRequiredFields) {
        profileData.profileCompleted = true;
        console.log('✅ Profile has all required fields, marking as complete');
      } else {
        console.log('⚠️ Profile missing some required fields:', {
          hasFirstName: !!profileData.firstName,
          hasLastName: !!profileData.lastName,
          hasPhone: !!profileData.phone,
          hasStreetAddress: !!profileData.streetAddress,
          hasSuburb: !!profileData.suburb,
          hasState: !!profileData.state,
          hasPostcode: !!profileData.postcode,
          hasCountry: !!profileData.country,
        });
      }

      // Update Firebase profile
      const updateResult = await this.updateUserProfile(userId, profileData);
      
      if (updateResult.success) {
        // Verify the update by reading the profile back
        const updatedProfile = await this.getUserProfile(userId);
        
        if (!updatedProfile) {
          console.warn('⚠️ Profile update may have failed - could not read profile back');
        }
      } else {
        console.error('❌ Failed to update profile:', updateResult.error);
      }

      // Fetch Deals (Visa Applications) from related list
      // This is non-blocking - if it fails, profile population still succeeds
      try {
        const deals = await zohoClient.getRelatedRecords('Contacts', contact.id, 'Deals');
        
        if (deals && deals.length > 0) {
          for (const deal of deals) {
            
            try {
              // Check if application already exists by zohoId
              const appsRef = collection(this.db, 'applications');
              const appsQuery = query(appsRef, where('zohoId', '==', deal.id));
              const existingApps = await getDocs(appsQuery);
              
              let appId;
              let isNew = false;
              
              if (!existingApps.empty) {
                // Update existing application
                const existingApp = existingApps.docs[0];
                appId = existingApp.id;
                
                // Extract Visa Type from Deal_Name or use Visa_Type field
                const dealName = deal.Deal_Name || deal.DealName || '';
                const visaType = deal.Visa_Type || this.extractVisaTypeFromDealName(dealName) || 'Visa Application';
                
                await updateDoc(doc(this.db, 'applications', appId), {
                  userId: userId,
                  reference: dealName || existingApp.data().reference, // Reference = Deal_Name
                  type: visaType, // type = Visa_Type
                  status: this.mapDealStageToStatus(deal.Stage || deal.Deal_Stage || 'draft'), // status = Stage
                  closingDate: deal.Closing_Date || existingApp.data().closingDate || '', // Closing_Date
                  lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || new Date().toISOString(), // Last updated time
                  updatedAt: serverTimestamp(),
                  zohoId: deal.id, // Reference to deal number
                });
              } else {
                // Create new application
                appId = nanoid(12);
                isNew = true;
                
              const now = new Date();
              
              // Extract Visa Type from Deal_Name or use Visa_Type field
              // Deal_Name format: "Name - Visa Type (Subclass XXX)"
              const dealName = deal.Deal_Name || deal.DealName || '';
              const visaType = deal.Visa_Type || this.extractVisaTypeFromDealName(dealName) || 'Visa Application';
              
              const newApp = {
                id: appId,
                userId: userId,
                reference: dealName || `PLY-${appId.toUpperCase()}`, // Reference = Deal_Name
                type: visaType, // type = Visa_Type (extracted from Deal_Name or field)
                visaTypeCode: this.mapDealToVisaType(deal),
                status: this.mapDealStageToStatus(deal.Stage || deal.Deal_Stage || 'draft'), // status = Stage
                closingDate: deal.Closing_Date || '', // Closing_Date from Zoho
                updated: now.toLocaleDateString('en-AU', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }),
                lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || now.toISOString(), // Last updated time from Zoho
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                zohoId: deal.id, // Reference to deal number in Zoho
              };
                
                await setDoc(doc(this.db, 'applications', appId), newApp);
              }
            } catch (dealError) {
              console.error(`⚠️ Failed to process Deal ${deal.id}:`, dealError.message);
              // Continue with other deals even if one fails
            }
          }
        }
      } catch (dealsError) {
        console.error('⚠️ Failed to fetch deals from related list (non-critical):', dealsError.message);
        // Don't fail profile population if deals fail - user can still complete registration
      }

      return { success: true, populated: true };
    } catch (error) {
      console.error('❌ Error populating from Zoho CRM:', error.message);
      // Return success but indicate no population happened
      // This ensures registration doesn't fail if Zoho check fails
      return { success: true, populated: false, error: error.message };
    }
  }

  /**
   * Fetch deals/applications from Zoho CRM and save to Firebase
   * This is called on login and when manually fetching
   * @param {string} userId - Firebase user ID
   * @param {string} zohoContactId - Zoho contact ID
   */
  async fetchDealsFromZoho(userId, zohoContactId) {
    try {
      const zohoClient = new ZohoCRMClient();
      
      // STEP 1: Fetch Deals directly from Zoho CRM (not from Firebase)
      const deals = await zohoClient.getRelatedRecords('Contacts', zohoContactId, 'Deals');
      
      if (!deals || deals.length === 0) {
        // Still update store with empty array to clear any stale data
        applicationsStore.applications = [];
        applicationsStore.rawDealsData = []; // Store empty array for debugging
        return [];
      }
      
      // STEP 2: Convert Zoho deals to application format and update store immediately
      const applicationsFromZoho = [];
      
      for (const deal of deals) {
        
        try {
          // Extract Visa Type from Deal_Name or use Visa_Type field
          const dealName = deal.Deal_Name || deal.DealName || '';
          const visaType = deal.Visa_Type || this.extractVisaTypeFromDealName(dealName) || 'Visa Application';
          const now = new Date();
          
          // Convert deal to application format
          const applicationData = {
            reference: dealName, // Reference = Deal_Name
            type: visaType, // type = Visa_Type
            visaTypeCode: this.mapDealToVisaType(deal),
            status: this.mapDealStageToStatus(deal.Stage || deal.Deal_Stage || 'draft'), // status = Stage
            closingDate: deal.Closing_Date || '', // Closing_Date
            updated: now.toLocaleDateString('en-AU', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }),
            lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || now.toISOString(), // Last updated time
            zohoId: deal.id, // Reference to deal number in Zoho
            userId: userId,
          };
          
          // STEP 3: Check if application already exists in Firebase by zohoId
          const appsRef = collection(this.db, 'applications');
          const appsQuery = query(appsRef, where('zohoId', '==', deal.id));
          const existingApps = await getDocs(appsQuery);
          
          let appId;
          let isNew = false;
          
          if (!existingApps.empty) {
            // Application exists - keep the existing Firebase id
            const existingApp = existingApps.docs[0];
            appId = existingApp.id;
            const existingAppData = existingApp.data();
            
            // Update with Zoho data (keep existing Firebase id)
            await updateDoc(doc(this.db, 'applications', appId), {
              ...applicationData,
              id: appId, // Keep existing Firebase id
              updatedAt: serverTimestamp(),
            });
            
            // Use existing Firebase id for the application object
            applicationData.id = appId;
            // Preserve existing createdAt timestamp (convert Firestore timestamp to ISO string if needed)
            const existingCreatedAt = existingAppData.createdAt;
            if (existingCreatedAt?.toDate) {
              applicationData.createdAt = existingCreatedAt.toDate().toISOString();
            } else if (existingCreatedAt?.toISOString) {
              applicationData.createdAt = existingCreatedAt.toISOString();
            } else {
              applicationData.createdAt = existingCreatedAt || now.toISOString();
            }
          } else {
            // Application doesn't exist - create new one in Firebase
            appId = nanoid(12);
            isNew = true;
            
            const newApp = {
              id: appId,
              ...applicationData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            
            await setDoc(doc(this.db, 'applications', appId), newApp);
            
            applicationData.id = appId;
            applicationData.createdAt = now.toISOString();
          }
          
          applicationsFromZoho.push(applicationData);
        } catch (dealError) {
          console.error(`⚠️ Failed to process Deal ${deal.id}:`, dealError.message);
          // Continue with other deals even if one fails
        }
      }
      
      // STEP 4: Update applicationsStore immediately with Zoho data (before Firebase sync)
      applicationsStore.applications = applicationsFromZoho;
      applicationsStore.rawDealsData = deals; // Store raw deals JSON for debugging
      
      return applicationsFromZoho;
    } catch (error) {
      console.error('❌ Error fetching deals from Zoho CRM (non-critical):', error.message);
      // Don't throw - return gracefully so login doesn't break
      // The app will work fine without deals, they'll just be fetched later
      return [];
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
    // "Name - Temporary Work Visa (Subclass 482)"
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
    // Check for custom fields that might indicate visa type
    const dealName = (deal.Deal_Name || deal.DealName || '').toLowerCase();
    const visaType = (deal.Visa_Type || deal.visaType || deal.Type || '').toLowerCase();
    
    // Check deal name for visa type keywords
    if (dealName.includes('partner') || visaType.includes('partner')) {
      return 'partner';
    }
    if (dealName.includes('protection') || visaType.includes('protection')) {
      return 'protection';
    }
    if (dealName.includes('work') || dealName.includes('temporary') || visaType.includes('work')) {
      return 'temporary-work';
    }
    
    return 'partner'; // Default to partner visa
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
