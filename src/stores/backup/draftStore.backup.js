"use client";

import { proxy, subscribe } from "valtio";

const STORAGE_KEY = "intake_draft";
const PREFILL_KEY = "intake_prefill";

// Initialize from localStorage (client-side only)
const getInitialDraft = () => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error loading draft:", error);
    return {};
  }
};

const getInitialPrefill = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREFILL_KEY) === "true";
  } catch {
    return false;
  }
};

export const draftStore = proxy({
  draft: getInitialDraft(),
  shouldPrefill: getInitialPrefill(),
  lastSaved: null,
  
  // Actions
  saveDraft(data) {
    // Immutable update - create new object
    this.draft = { ...this.draft, ...data };
    this.lastSaved = new Date().toISOString();
  },
  
  loadDraft() {
    return this.draft;
  },
  
  clearDraft() {
    // Immutable update - replace with new empty object
    this.draft = {};
    this.lastSaved = null;
  },
  
  setPrefill(value) {
    this.shouldPrefill = value;
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
    this.lastSaved = new Date().toISOString();
  },
});

// Subscribe to changes and persist to localStorage
if (typeof window !== "undefined") {
  subscribe(draftStore, () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftStore.draft));
      
      if (draftStore.shouldPrefill) {
        localStorage.setItem(PREFILL_KEY, "true");
      } else {
        localStorage.removeItem(PREFILL_KEY);
      }
    } catch (error) {
      console.error("Error persisting draft:", error);
    }
  });
}
