"use client";

import { proxy, subscribe } from "valtio";

const SESSION_KEY = "ply_session";
const USER_KEY = "ply_user";

// Initialize from localStorage (client-side only)
const getInitialState = () => {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, user: null };
  }
  
  try {
    const isAuth = localStorage.getItem(SESSION_KEY) === "true";
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;
    
    return {
      isAuthenticated: isAuth,
      user: user,
    };
  } catch {
    return { isAuthenticated: false, user: null };
  }
};

const initialState = getInitialState();

export const authStore = proxy({
  isAuthenticated: initialState.isAuthenticated,
  user: initialState.user,
  
  // Actions
  login(credentials) {
    // Dummy validation - replace with real auth later
    if (credentials.email === "user@example.com" && credentials.password === "password123") {
      // Create new user object (immutable update)
      const newUser = {
        email: credentials.email,
        name: "Demo User",
        id: "demo-user-1",
      };
      
      // Replace user object entirely (triggers Valtio reactivity)
      this.user = newUser;
      this.isAuthenticated = true;
      
      return true;
    }
    return false;
  },
  
  logout() {
    // Set to null (immutable update)
    this.user = null;
    this.isAuthenticated = false;
  },
  
  checkSession() {
    return this.isAuthenticated;
  },
});

// Subscribe to changes and persist to localStorage
if (typeof window !== "undefined") {
  subscribe(authStore, () => {
    try {
      if (authStore.isAuthenticated) {
        localStorage.setItem(SESSION_KEY, "true");
        localStorage.setItem(USER_KEY, JSON.stringify(authStore.user));
      } else {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch (error) {
      console.error("Error persisting auth state:", error);
    }
  });
}
