"use client";

import { proxy } from "valtio";
import { getAdapter } from "@/lib/adapters";

// Get database adapter (Firebase or localStorage based on env)
const db = getAdapter();

export const applicationsStore = proxy({
  applications: [],
  currentAppId: null,
  isLoading: false,
  
  // Actions
  async loadApplications(userId) {
    try {
      this.isLoading = true;
      const apps = await db.loadApplications(userId);
      this.applications = apps || [];
      this.isLoading = false;
      return this.applications;
    } catch (error) {
      console.error("Error loading applications:", error);
      this.isLoading = false;
      return [];
    }
  },
  
  getApplication(id) {
    return this.applications.find(app => app.id === id) || null;
  },
  
  async createApplication(appData) {
    try {
      const result = await db.createApplication(appData);
      
      if (result.success) {
        // Add to local state (immutable update)
        this.applications = [...this.applications, result.application];
        return { success: true, application: result.application };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error creating application:", error);
      return { success: false, error: error.message };
    }
  },
  
  async updateApplication(id, updates) {
    try {
      const result = await db.updateApplication(id, updates);
      
      if (result.success) {
        // Update local state (immutable update)
        this.applications = this.applications.map(app =>
          app.id === id ? result.application : app
        );
        return { success: true, application: result.application };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error updating application:", error);
      return { success: false, error: error.message };
    }
  },
  
  async deleteApplication(id) {
    try {
      const result = await db.deleteApplication(id);
      
      if (result.success) {
        // Remove from local state (immutable update)
        this.applications = this.applications.filter(app => app.id !== id);
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error deleting application:", error);
      return { success: false, error: error.message };
    }
  },
  
  setCurrentApp(id) {
    this.currentAppId = id;
  },
  
  getCurrentApp() {
    if (!this.currentAppId) return null;
    return this.getApplication(this.currentAppId);
  },
});
