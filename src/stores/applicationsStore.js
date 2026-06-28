"use client";

import { proxy } from "valtio";
import { getAdapter } from "@/lib/adapters";

// Lazy get adapter to avoid circular dependency issues
const getDb = () => {
  try {
    return getAdapter();
  } catch (error) {
    console.error("Error getting adapter:", error);
    // Return a mock adapter to prevent crashes
    return null;
  }
};

export async function syncZohoQuestionnaireStatus(application, status) {
  const zohoId = application?.zohoId;
  if (typeof window === "undefined" || !zohoId) return null;

  try {
    const response = await fetch(`/api/deals/${zohoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.warn("Questionnaire status sync skipped/failed:", result);
      return null;
    }
    return result;
  } catch (error) {
    console.warn("Questionnaire status sync failed:", error.message);
    return null;
  }
}

export const applicationsStore = proxy({
  applications: [],
  currentAppId: null,
  isLoading: false,
  rawDealsData: null, // Store raw deals JSON from Zoho CRM for debugging
  
  // Actions
  async loadApplications(userId) {
    try {
      this.isLoading = true;
      const db = getDb();
      if (!db) {
        console.error("Database adapter not available");
        this.isLoading = false;
        return [];
      }
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
      const db = getDb();
      if (!db) {
        return { success: false, error: "Database adapter not available" };
      }
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
      const db = getDb();
      if (!db) {
        return { success: false, error: "Database adapter not available" };
      }
      const result = await db.updateApplication(id, updates);
      
      if (result.success) {
        if (updates.status === "submitted") {
          await syncZohoQuestionnaireStatus(result.application, "Submitted");
        }

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
      const db = getDb();
      if (!db) {
        return { success: false, error: "Database adapter not available" };
      }
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
  
  // Fetch deals from Zoho CRM and update rawDealsData
  async fetchDealsFromZoho(userId, zohoContactId) {
    try {
      const db = getDb();
      if (!db || !db.fetchDealsFromZoho) {
        console.error("fetchDealsFromZoho not available in database adapter");
        return { success: false, error: "Method not available" };
      }
      
      const result = await db.fetchDealsFromZoho(userId, zohoContactId);
      return { success: true, deals: result };
    } catch (error) {
      console.error("Error fetching deals from Zoho:", error);
      return { success: false, error: error.message };
    }
  },
});
