"use client";

import { proxy } from "valtio";
import { getAdapter } from "@/lib/adapters";

// Get database adapter (Firebase or localStorage based on env)
const db = getAdapter();
const SESSION_EXPIRY_KEY = "ply_session_expires_at";
const SESSION_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

function setSessionExpiry() {
  if (typeof window === "undefined") return;
  const expiry = Date.now() + SESSION_MAX_AGE_MS;
  localStorage.setItem(SESSION_EXPIRY_KEY, String(expiry));
}

function clearSessionExpiry() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_EXPIRY_KEY);
}

function isSessionExpired() {
  if (typeof window === "undefined") return false;
  const rawExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (!rawExpiry) return false;
  const expiry = Number(rawExpiry);
  if (!Number.isFinite(expiry)) return true;
  return Date.now() > expiry;
}

export const authStore = proxy({
  isAuthenticated: false,
  user: null,
  userProfile: null, // Full profile with name, phone, address
  
  // Actions
  async login(credentials) {
    try {
      const result = await db.login(credentials);
      
      if (result.success) {
        // Set user from Firebase Auth
        this.user = result.user;
        this.isAuthenticated = true;
        
        // Load user profile from Firestore
        const profile = await db.getUserProfile(result.user.id);
        this.userProfile = profile;
        setSessionExpiry();
        
        return { success: true };
      }
      
      // Return the full result object for error handling
      return result;
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  },
  
  async logout() {
    try {
      await db.logout();
      // Set to null (immutable update)
      this.user = null;
      this.userProfile = null;
      this.isAuthenticated = false;
      clearSessionExpiry();
    } catch (error) {
      console.error("Logout error:", error);
    }
  },
  
  async checkSession() {
    try {
      if (isSessionExpired()) {
        await this.logout();
        return false;
      }

      // Firebase adapter now returns { isAuthenticated, user, profile }
      const session = await db.checkSession();
      
      if (session.isAuthenticated && session.user) {
        this.user = session.user;
        this.userProfile = session.profile;
        this.isAuthenticated = true;
        setSessionExpiry();
        return true;
      }
      
      // No valid session
      this.user = null;
      this.userProfile = null;
      this.isAuthenticated = false;
      clearSessionExpiry();
      return false;
    } catch (error) {
      console.error("Session check error:", error);
      this.user = null;
      this.userProfile = null;
      this.isAuthenticated = false;
      clearSessionExpiry();
      return false;
    }
  },
  
  async loadUserProfile() {
    try {
      if (this.user) {
        const profile = await db.getUserProfile(this.user.id);
        this.userProfile = profile;
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  },
  
  async updateProfile(profileData) {
    try {
      if (this.user) {
        const result = await db.updateUserProfile(this.user.id, profileData);
        if (result.success) {
          // Reload profile
          await this.loadUserProfile();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  },
  
  async markProfileComplete() {
    try {
      if (this.user) {
        const result = await db.markProfileComplete(this.user.id);
        if (result.success) {
          // Reload profile
          await this.loadUserProfile();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error marking profile complete:", error);
      return false;
    }
  },
});
