"use client";

import { proxy } from "valtio";
import { getAdapter } from "@/lib/adapters";
import { getIntakeRoutes } from "@/lib/routes";

// Get database adapter (Firebase or localStorage based on env)
const db = getAdapter();

export const draftStore = proxy({
  draft: {},
  completionStatus: {}, // Track which pages are completed: { "start": true, "main-applicant/details": true, ... }
  currentApplicationId: null, // Track which application this draft belongs to
  shouldPrefill: false,
  lastSaved: null,
  isLoading: false,
  isSaving: false,

  // Set the current application context
  setApplicationId(appId) {
    this.currentApplicationId = appId;
  },

  // Actions
  async saveDraft(data, applicationId) {
    try {
      this.isSaving = true;

      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for draft save');
        this.isSaving = false;
        return { success: false, error: 'Application ID required' };
      }

      // Merge with existing draft
      this.draft = { ...this.draft, ...data };

      // Save to Firebase immediately (no debouncing per user request)
      const result = await db.saveDraft(this.draft, appId);

      if (result.success) {
        this.lastSaved = new Date().toISOString();
        this.isSaving = false;
        return { success: true };
      }

      this.isSaving = false;
      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error saving draft to Firebase:", error);
      this.isSaving = false;
      return { success: false, error: error.message };
    }
  },

  async loadDraft(applicationId) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'draftStore.js:57',message:'loadDraft entry',data:{applicationId,currentAppId:this.currentApplicationId,currentDraftKeys:Object.keys(this.draft||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      this.isLoading = true;

      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for draft load');
        this.isLoading = false;
        return {};
      }

      const data = await db.loadDraft(appId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'draftStore.js:68',message:'After db.loadDraft',data:{hasData:!!data,dataKeys:Object.keys(data||{}),hasTemporaryWorkDetails:!!data?.temporary_work_details,temporaryWorkDetailsKeys:Object.keys(data?.temporary_work_details||{}),birth_day:data?.temporary_work_details?.birth_day,marital_status:data?.temporary_work_details?.marital_status},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      this.draft = data || {};
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'draftStore.js:69',message:'After setting this.draft',data:{draftKeys:Object.keys(this.draft||{}),hasTemporaryWorkDetails:!!this.draft?.temporary_work_details,birth_day:this.draft?.temporary_work_details?.birth_day,marital_status:this.draft?.temporary_work_details?.marital_status},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Load completion status
      const completionData = await db.loadCompletionStatus(appId);

      // If there is no draft data, clear any stale completion status
      if (!this.draft || Object.keys(this.draft).length === 0) {
        this.completionStatus = {};
        // Persist the cleared status so the UI does not show completed steps
        await db.saveCompletionStatus({}, appId);
      } else {
        this.completionStatus = completionData || {};
      }

      // Load prefill setting
      const prefill = await db.getPrefill();
      this.shouldPrefill = prefill;

      this.isLoading = false;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'draftStore.js:88',message:'loadDraft exit',data:{returnDraftKeys:Object.keys(this.draft||{}),hasTemporaryWorkDetails:!!this.draft?.temporary_work_details,birth_day:this.draft?.temporary_work_details?.birth_day,marital_status:this.draft?.temporary_work_details?.marital_status},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return this.draft;
    } catch (error) {
      console.error("Error loading draft:", error);
      this.isLoading = false;
      return {};
    }
  },

  async clearDraft(applicationId) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for draft clear');
        return { success: false, error: 'Application ID required' };
      }

      await db.clearDraft(appId);
      // Immutable update - replace with new empty object
      this.draft = {};
      this.lastSaved = null;
      return { success: true };
    } catch (error) {
      console.error("Error clearing draft:", error);
      return { success: false, error: error.message };
    }
  },

  async setPrefill(value) {
    try {
      await db.setPrefill(value);
      this.shouldPrefill = value;
    } catch (error) {
      console.error("Error setting prefill:", error);
    }
  },

  updateField(path, value) {
    // Create a deep copy to avoid in-place mutation
    const newDraft = JSON.parse(JSON.stringify(this.draft));

    // Update nested field using path notation (e.g., "details.firstName")
    const keys = path.split('.');
    let obj = newDraft;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;

    // Replace draft object entirely (triggers Valtio reactivity)
    this.draft = newDraft;
  },

  // Helper: Set nested value using dot notation path
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  },

  // Helper: Get nested value using dot notation path
  getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }

    return current;
  },

  // Save data to a specific section (e.g., 'mainApplicant.details')
  async saveSectionData(section, data, applicationId) {
    try {
      this.isSaving = true;

      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for section save');
        this.isSaving = false;
        return { success: false, error: 'Application ID required' };
      }

      // Create a deep copy of current draft
      const newDraft = JSON.parse(JSON.stringify(this.draft));

      // Set the section data using nested path
      this.setNestedValue(newDraft, section, data);

      // Update local draft
      this.draft = newDraft;

      // Save entire draft to Firebase
      const result = await db.saveDraft(this.draft, appId);

      if (result.success) {
        this.lastSaved = new Date().toISOString();
        this.isSaving = false;
        return { success: true };
      }

      this.isSaving = false;
      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error saving section data:", error);
      this.isSaving = false;
      return { success: false, error: error.message };
    }
  },

  // Get data from a specific section
  getSectionData(section) {
    return this.getNestedValue(this.draft, section) || {};
  },

  // Mark a page as complete
  async markPageComplete(pageKey, applicationId, sectionKeyToCheck = null) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for marking page complete');
        return { success: false };
      }

      // Validation: Check if section has meaningful data
      // If a specific section key is provided, use it. Otherwise try to guess.
      if (sectionKeyToCheck !== false) {
        const sectionKey = sectionKeyToCheck || this.getSectionKeyFromPageKey(pageKey);
        const sectionData = this.getSectionData(sectionKey);

        // Check if section has meaningful data
        const hasData = Object.values(sectionData).some(value => {
          if (typeof value === 'string') return value.trim() !== '';
          if (typeof value === 'boolean') return true;
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
          return value !== null && value !== undefined;
        });

        if (!hasData) {
          console.warn(`Cannot mark ${pageKey} as complete - no data inside section (${sectionKey})`);
          return { success: false, error: 'No data to save' };
        }
      }

      // Update completion status
      this.completionStatus = { ...this.completionStatus, [pageKey]: true };

      // Save to Firebase
      await db.saveCompletionStatus(this.completionStatus, appId);

      return { success: true };
    } catch (error) {
      console.error("Error marking page complete:", error);
      return { success: false, error: error.message };
    }
  },

  // Helper to map page key to section key
  getSectionKeyFromPageKey(pageKey) {
    // Map completion keys to section keys
    // e.g., "temporary-work/main-applicant/details" -> "temporary_work_details"
    const parts = pageKey.split('/');
    return parts.join('_').replace(/-/g, '_');
  },

  // Clear all completion status
  async clearCompletionStatus(applicationId) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for clearing completion status');
        return { success: false };
      }

      this.completionStatus = {};
      await db.saveCompletionStatus({}, appId);

      return { success: true };
    } catch (error) {
      console.error("Error clearing completion status:", error);
      return { success: false, error: error.message };
    }
  },

  // Mark a page as incomplete
  async markPageIncomplete(pageKey, applicationId) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for marking page incomplete');
        return { success: false };
      }

      // Update completion status
      this.completionStatus = { ...this.completionStatus, [pageKey]: false };

      // Save to Firebase
      await db.saveCompletionStatus(this.completionStatus, appId);

      return { success: true };
    } catch (error) {
      console.error("Error marking page incomplete:", error);
      return { success: false, error: error.message };
    }
  },

  // Check if a page is complete
  isPageComplete(pageKey) {
    return this.completionStatus[pageKey] === true;
  },

  // Get completion percentage
  getCompletionPercentage() {
    // Auto-detect visa type from existing completion keys
    let visaType = null;
    const completionKeys = Object.keys(this.completionStatus);

    if (completionKeys.length > 0) {
      // Check for visa type prefix in existing keys
      const firstKey = completionKeys[0];
      if (firstKey.startsWith('temporary-work/')) {
        visaType = 'temporary-work';
      } else if (firstKey.startsWith('partner/')) {
        visaType = 'partner';
      } else if (firstKey.startsWith('protection/')) {
        visaType = 'protection';
      }
    }

    // If no visa type detected, return empty
    if (!visaType) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    // Get routes for the detected visa type
    const routes = getIntakeRoutes(visaType);

    // Extract all page paths from routes (excluding submit page)
    const allPagePaths = [];
    routes.forEach((route) => {
      // Skip submit page
      if (route.href.includes('/submit')) {
        return;
      }

      if (route.subpages) {
        // Add all subpages
        route.subpages.forEach((sub) => {
          allPagePaths.push(sub.href);
        });
      } else {
        // Add main route
        allPagePaths.push(route.href);
      }
    });

    // Convert paths to completion keys format
    // e.g., "/intake/protection/main-applicant/details" -> "protection/main-applicant/details"
    const allPages = allPagePaths.map(path => {
      // Remove "/intake/" prefix and visa type prefix
      const pathWithoutPrefix = path.replace(`/intake/${visaType}/`, '');
      return `${visaType}/${pathWithoutPrefix}`;
    });

    // Count completed pages
    const completedCount = allPages.filter(page => this.isPageComplete(page)).length;
    const totalPages = allPages.length;

    return {
      completed: completedCount,
      total: totalPages,
      percentage: totalPages > 0 ? Math.round((completedCount / totalPages) * 100) : 0
    };
  },
});
