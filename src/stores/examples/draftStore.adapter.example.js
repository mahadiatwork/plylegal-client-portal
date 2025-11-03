/**
 * EXAMPLE: Draft Store Using Database Adapter
 * 
 * This shows how draftStore.js would be updated to use the adapter pattern.
 * This is NOT currently in use - it's an example for future implementation.
 * 
 * Benefits of adapter version:
 * - Works with localStorage, Firebase, or Postgres with zero code changes
 * - Firebase version gets real-time sync across devices
 * - Postgres version gets proper database transactions
 */

"use client";

import { proxy } from "valtio";
import { getAdapter } from "@/lib/adapters";

const db = getAdapter();

// Initialize from database
const getInitialDraft = async () => {
  if (typeof window === "undefined") return {};
  try {
    return await db.loadDraft();
  } catch (error) {
    console.error("Error loading draft:", error);
    return {};
  }
};

const getInitialPrefill = async () => {
  if (typeof window === "undefined") return false;
  try {
    return await db.getPrefill();
  } catch (error) {
    console.error("Error loading prefill:", error);
    return false;
  }
};

// Create initial state
let initialDraft = {};
let initialPrefill = false;

if (typeof window !== "undefined") {
  getInitialDraft().then(draft => {
    draftStore.draft = draft;
  });
  
  getInitialPrefill().then(prefill => {
    draftStore.shouldPrefill = prefill;
  });
}

export const draftStore = proxy({
  draft: initialDraft,
  shouldPrefill: initialPrefill,
  lastSaved: null,
  
  // Actions
  async saveDraft(data) {
    const result = await db.saveDraft(data);
    
    if (result.success) {
      // Update store (triggers reactivity)
      this.draft = { ...this.draft, ...data };
      this.lastSaved = new Date().toISOString();
    }
  },
  
  async loadDraft() {
    const draft = await db.loadDraft();
    this.draft = draft;
    return draft;
  },
  
  async clearDraft() {
    await db.clearDraft();
    
    // Update store (triggers reactivity)
    this.draft = {};
    this.lastSaved = null;
  },
  
  async setPrefill(value) {
    await db.setPrefill(value);
    this.shouldPrefill = value;
  },
  
  async updateField(path, value) {
    // Create a deep copy
    const newDraft = JSON.parse(JSON.stringify(this.draft));
    
    // Update nested field
    const keys = path.split('.');
    let obj = newDraft;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    
    // Save to database
    await this.saveDraft(newDraft);
  },
});

// For Firebase: Subscribe to real-time draft changes
if (typeof window !== "undefined") {
  db.subscribeToDraft((draft) => {
    draftStore.draft = draft;
  });
}
