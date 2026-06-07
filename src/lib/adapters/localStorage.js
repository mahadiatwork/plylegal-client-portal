/**
 * LocalStorage Database Adapter
 * 
 * Implements the BaseAdapter interface using browser localStorage.
 * This preserves the current working implementation.
 */

import { BaseAdapter } from './base';

// Storage keys (match current implementation)
const SESSION_KEY = "ply_session";
const USER_KEY = "ply_user";
const USER_PROFILE_KEY = "ply_user_profile";
const DRAFT_KEY = "intake_draft";
const PREFILL_KEY = "intake_prefill";
const APPLICATIONS_KEY = "ply:applications";

const getAppDataKey = (appId, dataType) => `ply:app:${appId}:${dataType}`;
const getDraftKey = (appId) => (appId ? getAppDataKey(appId, "draft") : DRAFT_KEY);
const getCompletionKey = (appId) => getAppDataKey(appId, "completion");

const DEFAULT_PROFILE = {
  email: "",
  profileCompleted: true,
  needsPasswordChange: false,
  portalAccess: true,
  role: "user",
  zohoContactId: null,
};

export class LocalStorageAdapter extends BaseAdapter {
  constructor() {
    super();
    this.isClient = typeof window !== "undefined";
  }
  
  /**
   * AUTH METHODS
   */
  
  async login(credentials) {
    // Dummy validation - matches current implementation
    if (credentials.email === "user@example.com" && credentials.password === "password123") {
      const user = {
        email: credentials.email,
        name: "Demo User",
        id: "demo-user-1",
      };
      
      if (this.isClient) {
        localStorage.setItem(SESSION_KEY, "true");
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      
      return { success: true, user };
    }
    return { success: false, user: null };
  }
  
  async logout() {
    if (this.isClient) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return { success: true };
  }
  
  async checkSession() {
    if (!this.isClient) return { isAuthenticated: false };
    
    try {
      const isAuthenticated = localStorage.getItem(SESSION_KEY) === "true";
      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const user = await this.getUser();
      return {
        isAuthenticated: true,
        user,
        profile: await this.getUserProfile(user?.id),
      };
    } catch {
      return { isAuthenticated: false };
    }
  }
  
  async getUser() {
    if (!this.isClient) return null;
    
    try {
      const userJson = localStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  async getUserProfile(userId) {
    if (!this.isClient) return { ...DEFAULT_PROFILE };

    try {
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      const profile = stored ? JSON.parse(stored) : {};
      const user = await this.getUser();
      return {
        ...DEFAULT_PROFILE,
        email: profile.email || user?.email || "",
        userId: userId || user?.id || profile.userId || null,
        ...profile,
      };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  async updateUserProfile(userId, profileData) {
    if (!this.isClient) return { success: false };

    try {
      const currentProfile = await this.getUserProfile(userId);
      const updatedProfile = {
        ...currentProfile,
        ...profileData,
        userId: userId || currentProfile.userId || null,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));
      return { success: true, profile: updatedProfile };
    } catch (error) {
      console.error("Error updating user profile:", error);
      return { success: false, error: error.message };
    }
  }

  async markProfileComplete(userId) {
    return this.updateUserProfile(userId, { profileCompleted: true });
  }
  
  /**
   * DRAFT METHODS
   */
  
  async saveDraft(data, applicationId = null) {
    if (!this.isClient) return { success: false };
    
    try {
      const draftKey = getDraftKey(applicationId);
      // Load current draft
      const currentDraft = await this.loadDraft(applicationId);
      
      // Merge with new data
      const updatedDraft = { ...currentDraft, ...data };
      
      // Save to localStorage
      localStorage.setItem(draftKey, JSON.stringify(updatedDraft));
      
      return { success: true, draft: updatedDraft };
    } catch (error) {
      console.error("Error saving draft:", error);
      return { success: false, error: error.message };
    }
  }
  
  async loadDraft(applicationId = null) {
    if (!this.isClient) return {};
    
    try {
      const stored = localStorage.getItem(getDraftKey(applicationId));
      if (!stored && applicationId) {
        const legacyStored = localStorage.getItem(DRAFT_KEY);
        return legacyStored ? JSON.parse(legacyStored) : {};
      }
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading draft:", error);
      return {};
    }
  }
  
  async clearDraft(applicationId = null) {
    if (!this.isClient) return { success: false };
    
    try {
      localStorage.removeItem(getDraftKey(applicationId));
      return { success: true };
    } catch (error) {
      console.error("Error clearing draft:", error);
      return { success: false, error: error.message };
    }
  }

  async saveCompletionStatus(completionStatus, applicationId) {
    if (!this.isClient) return { success: false };

    try {
      if (!applicationId) {
        return { success: false, error: "Application ID required" };
      }

      const nextCompletionStatus = completionStatus || {};
      localStorage.setItem(getCompletionKey(applicationId), JSON.stringify(nextCompletionStatus));

      if (typeof nextCompletionStatus.completionPercentage === "number") {
        const currentDraft = await this.loadDraft(applicationId);
        const nextDraft = {
          ...currentDraft,
          completionPercentage: nextCompletionStatus.completionPercentage,
        };
        localStorage.setItem(getDraftKey(applicationId), JSON.stringify(nextDraft));
      }

      return { success: true, completionStatus: nextCompletionStatus };
    } catch (error) {
      console.error("Error saving completion status:", error);
      return { success: false, error: error.message };
    }
  }

  async loadCompletionStatus(applicationId) {
    if (!this.isClient || !applicationId) return {};

    try {
      const stored = localStorage.getItem(getCompletionKey(applicationId));
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading completion status:", error);
      return {};
    }
  }
  
  async setPrefill(value) {
    if (!this.isClient) return { success: false };
    
    try {
      if (value) {
        localStorage.setItem(PREFILL_KEY, "true");
      } else {
        localStorage.removeItem(PREFILL_KEY);
      }
      return { success: true };
    } catch (error) {
      console.error("Error setting prefill:", error);
      return { success: false, error: error.message };
    }
  }
  
  async getPrefill() {
    if (!this.isClient) return false;
    
    try {
      return localStorage.getItem(PREFILL_KEY) === "true";
    } catch {
      return false;
    }
  }
  
  /**
   * APPLICATIONS METHODS
   */
  
  async loadApplications(userId) {
    if (!this.isClient) return [];
    
    try {
      const stored = localStorage.getItem(APPLICATIONS_KEY);
      const allApps = stored ? JSON.parse(stored) : [];
      
      // Filter by userId if provided (for multi-user support in future)
      if (userId) {
        return allApps.filter(app => app.userId === userId);
      }
      
      return allApps;
    } catch (error) {
      console.error("Error loading applications:", error);
      return [];
    }
  }
  
  async getApplication(id) {
    const applications = await this.loadApplications();
    return applications.find(app => app.id === id) || null;
  }
  
  async createApplication(app) {
    if (!this.isClient) return { success: false };
    
    try {
      const applications = await this.loadApplications();
      const newApp = {
        ...app,
        createdAt: app.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedApps = [...applications, newApp];
      localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updatedApps));
      
      return { success: true, application: newApp };
    } catch (error) {
      console.error("Error creating application:", error);
      return { success: false, error: error.message };
    }
  }
  
  async updateApplication(id, updates) {
    if (!this.isClient) return { success: false };
    
    try {
      const applications = await this.loadApplications();
      const updatedApps = applications.map(app =>
        app.id === id
          ? { ...app, ...updates, updatedAt: new Date().toISOString() }
          : app
      );
      
      localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updatedApps));
      
      const updatedApp = updatedApps.find(app => app.id === id);
      return { success: true, application: updatedApp };
    } catch (error) {
      console.error("Error updating application:", error);
      return { success: false, error: error.message };
    }
  }
  
  async deleteApplication(id) {
    if (!this.isClient) return { success: false };
    
    try {
      const applications = await this.loadApplications();
      const updatedApps = applications.filter(app => app.id !== id);
      
      localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updatedApps));
      
      // Also clear app data
      await this.clearAppData(id);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting application:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * APP DATA METHODS
   */
  
  async loadAppData(appId, dataType) {
    if (!this.isClient) return [];
    
    try {
      const key = getAppDataKey(appId, dataType);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error loading ${dataType} for app ${appId}:`, error);
      return [];
    }
  }
  
  async saveAppData(appId, dataType, data) {
    if (!this.isClient) return { success: false };
    
    try {
      const key = getAppDataKey(appId, dataType);
      localStorage.setItem(key, JSON.stringify(data));
      
      return { success: true, data };
    } catch (error) {
      console.error(`Error saving ${dataType} for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  async clearAppData(appId) {
    if (!this.isClient) return { success: false };
    
    try {
      const types = ['uploads', 'docs', 'tasks', 'deliverables', 'messages', 'draft', 'completion'];
      types.forEach(type => {
        const key = getAppDataKey(appId, type);
        localStorage.removeItem(key);
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Error clearing data for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * REAL-TIME LISTENERS
   * 
   * localStorage doesn't support real-time updates, so these are no-ops
   * They're here to satisfy the interface for compatibility with Firebase
   */
  
  async subscribeToAuth(callback) {
    // For localStorage, just call callback with current state once
    const user = await this.getUser();
    const isAuthenticated = await this.checkSession();
    callback({ user, isAuthenticated });
    
    // Return empty unsubscribe function
    return () => {};
  }
  
  async subscribeToDraft(callback) {
    // For localStorage, just call callback with current state once
    const draft = await this.loadDraft();
    callback(draft);
    
    // Return empty unsubscribe function
    return () => {};
  }
  
  async subscribeToApplications(userId, callback) {
    // For localStorage, just call callback with current state once
    const applications = await this.loadApplications(userId);
    callback(applications);
    
    // Return empty unsubscribe function
    return () => {};
  }
  
  async subscribeToAppData(appId, dataType, callback) {
    // For localStorage, just call callback with current state once
    const data = await this.loadAppData(appId, dataType);
    callback(data);
    
    // Return empty unsubscribe function
    return () => {};
  }
}
