"use client";

import { proxy, subscribe } from "valtio";

const APPLICATIONS_KEY = "ply:applications";

// Initialize from localStorage (client-side only)
const getInitialApplications = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(APPLICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading applications:", error);
    return [];
  }
};

export const applicationsStore = proxy({
  applications: getInitialApplications(),
  currentAppId: null,
  
  // Actions
  loadApplications() {
    return this.applications;
  },
  
  getApplication(id) {
    return this.applications.find(app => app.id === id) || null;
  },
  
  createApplication(app) {
    // Immutable update - create new array
    this.applications = [...this.applications, app];
  },
  
  updateApplication(id, updates) {
    // Immutable update - map to new array
    this.applications = this.applications.map(app =>
      app.id === id
        ? { ...app, ...updates, updatedAt: new Date().toISOString() }
        : app
    );
  },
  
  deleteApplication(id) {
    // Immutable update - filter to new array
    this.applications = this.applications.filter(app => app.id !== id);
  },
  
  setCurrentApp(id) {
    this.currentAppId = id;
  },
  
  getCurrentApp() {
    if (!this.currentAppId) return null;
    return this.getApplication(this.currentAppId);
  },
});

// Subscribe to changes and persist to localStorage
if (typeof window !== "undefined") {
  subscribe(applicationsStore, () => {
    try {
      localStorage.setItem(
        APPLICATIONS_KEY, 
        JSON.stringify(applicationsStore.applications)
      );
    } catch (error) {
      console.error("Error persisting applications:", error);
    }
  });
}
