/**
 * EXAMPLE: Auth Store Using Database Adapter
 * 
 * This shows how authStore.js would be updated to use the adapter pattern.
 * This is NOT currently in use - it's an example for future implementation.
 * 
 * To use adapters:
 * 1. Replace src/stores/authStore.js with this implementation
 * 2. Set NEXT_PUBLIC_DATABASE_TYPE in .env.local
 * 3. Test thoroughly before deploying
 */

"use client";

import { proxy, subscribe } from "valtio";
import { getAdapter } from "@/lib/adapters";

// Get database adapter (localStorage, Firebase, or Postgres)
const db = getAdapter();

// Initialize from database
const getInitialState = async () => {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, user: null };
  }
  
  try {
    const isAuth = await db.checkSession();
    const user = await db.getUser();
    
    return {
      isAuthenticated: isAuth,
      user: user,
    };
  } catch (error) {
    console.error("Error loading auth state:", error);
    return { isAuthenticated: false, user: null };
  }
};

// Create initial state
let initialState = { isAuthenticated: false, user: null };

if (typeof window !== "undefined") {
  getInitialState().then(state => {
    authStore.isAuthenticated = state.isAuthenticated;
    authStore.user = state.user;
  });
}

export const authStore = proxy({
  isAuthenticated: initialState.isAuthenticated,
  user: initialState.user,
  
  // Actions
  async login(credentials) {
    const result = await db.login(credentials);
    
    if (result.success) {
      // Update store (triggers reactivity)
      this.user = result.user;
      this.isAuthenticated = true;
      return true;
    }
    
    return false;
  },
  
  async logout() {
    await db.logout();
    
    // Update store (triggers reactivity)
    this.user = null;
    this.isAuthenticated = false;
  },
  
  async checkSession() {
    this.isAuthenticated = await db.checkSession();
    return this.isAuthenticated;
  },
});

// For Firebase: Subscribe to real-time auth changes
if (typeof window !== "undefined") {
  db.subscribeToAuth((authState) => {
    authStore.isAuthenticated = authState.isAuthenticated;
    authStore.user = authState.user;
  });
}

// Note: With adapters, localStorage persistence is handled by the adapter itself
// No need for manual subscribe() calls like before!
