"use client";

import { proxy, subscribe } from "valtio";

// Helper to get storage key for per-app data
const getStorageKey = (appId, dataType) => `ply:app:${appId}:${dataType}`;

// Helper to deep clone to plain objects (breaks proxy identity)
const deepClone = (obj) => {
  if (!obj) return {};
  return JSON.parse(JSON.stringify(obj));
};

// Initialize from localStorage (client-side only)
const getInitialData = (appId, dataType) => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getStorageKey(appId, dataType));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(`Error loading ${dataType} for app ${appId}:`, error);
    return [];
  }
};

export const appDataStore = proxy({
  // Cache of loaded data by app ID
  cache: {},
  
  // Actions for uploads
  loadUploads(appId) {
    if (!this.cache[appId]?.uploads) {
      // Deep clone existing app data to break proxy identity
      const existingAppData = deepClone(this.cache[appId]);
      const uploads = getInitialData(appId, 'uploads');
      
      // Replace entire cache with new object
      this.cache = {
        ...this.cache,
        [appId]: {
          ...existingAppData,
          uploads: uploads
        }
      };
    }
    return this.cache[appId].uploads;
  },
  
  saveUploads(appId, uploads) {
    // Deep clone and replace
    const existingAppData = deepClone(this.cache[appId]);
    this.cache = {
      ...this.cache,
      [appId]: {
        ...existingAppData,
        uploads: [...uploads]
      }
    };
  },
  
  // Actions for documents
  loadDocuments(appId) {
    if (!this.cache[appId]?.docs) {
      const existingAppData = deepClone(this.cache[appId]);
      const docs = getInitialData(appId, 'docs');
      
      this.cache = {
        ...this.cache,
        [appId]: {
          ...existingAppData,
          docs: docs
        }
      };
    }
    return this.cache[appId].docs;
  },
  
  saveDocuments(appId, documents) {
    const existingAppData = deepClone(this.cache[appId]);
    this.cache = {
      ...this.cache,
      [appId]: {
        ...existingAppData,
        docs: [...documents]
      }
    };
  },
  
  // Actions for tasks
  loadTasks(appId) {
    if (!this.cache[appId]?.tasks) {
      const existingAppData = deepClone(this.cache[appId]);
      const tasks = getInitialData(appId, 'tasks');
      
      this.cache = {
        ...this.cache,
        [appId]: {
          ...existingAppData,
          tasks: tasks
        }
      };
    }
    return this.cache[appId].tasks;
  },
  
  saveTasks(appId, tasks) {
    const existingAppData = deepClone(this.cache[appId]);
    this.cache = {
      ...this.cache,
      [appId]: {
        ...existingAppData,
        tasks: [...tasks]
      }
    };
  },
  
  // Actions for deliverables
  loadDeliverables(appId) {
    if (!this.cache[appId]?.deliverables) {
      const existingAppData = deepClone(this.cache[appId]);
      const deliverables = getInitialData(appId, 'deliverables');
      
      this.cache = {
        ...this.cache,
        [appId]: {
          ...existingAppData,
          deliverables: deliverables
        }
      };
    }
    return this.cache[appId].deliverables;
  },
  
  saveDeliverables(appId, deliverables) {
    const existingAppData = deepClone(this.cache[appId]);
    this.cache = {
      ...this.cache,
      [appId]: {
        ...existingAppData,
        deliverables: [...deliverables]
      }
    };
  },
  
  // Actions for messages
  loadMessages(appId) {
    if (!this.cache[appId]?.messages) {
      const existingAppData = deepClone(this.cache[appId]);
      const messages = getInitialData(appId, 'messages');
      
      this.cache = {
        ...this.cache,
        [appId]: {
          ...existingAppData,
          messages: messages
        }
      };
    }
    return this.cache[appId].messages;
  },
  
  saveMessages(appId, messages) {
    const existingAppData = deepClone(this.cache[appId]);
    this.cache = {
      ...this.cache,
      [appId]: {
        ...existingAppData,
        messages: [...messages]
      }
    };
  },
  
  // Clear all data for an app
  clearAppData(appId) {
    // Immutable update - create new cache without this app
    const newCache = { ...this.cache };
    delete newCache[appId];
    this.cache = newCache;
    
    if (typeof window !== "undefined") {
      const types = ['uploads', 'docs', 'tasks', 'deliverables', 'messages'];
      types.forEach(type => {
        localStorage.removeItem(getStorageKey(appId, type));
      });
    }
  },
});

// Helper function to update tasks
export function updateTasks(appId, tasks) {
  appDataStore.saveTasks(appId, tasks);
}

// Helper function to add a message
export function addMessage(appId, message) {
  const currentMessages = appDataStore.cache[appId]?.messages || [];
  const updatedMessages = [...currentMessages, message];
  appDataStore.saveMessages(appId, updatedMessages);
}

// Helper function to update an upload
export function updateUpload(appId, uploadId, updates) {
  const currentUploads = appDataStore.cache[appId]?.uploads || [];
  const updatedUploads = currentUploads.map(upload =>
    upload.id === uploadId ? { ...upload, ...updates } : upload
  );
  appDataStore.saveUploads(appId, updatedUploads);
}

// Initialize app data (dummy data)
export function initializeAppData(appId) {
  // Load existing data or initialize with demo data
  if (!appDataStore.cache[appId]) {
    appDataStore.loadUploads(appId);
    appDataStore.loadTasks(appId);
    appDataStore.loadDeliverables(appId);
    appDataStore.loadMessages(appId);
    
    // If no data exists, create demo data
    const hasData = appDataStore.cache[appId]?.uploads?.length > 0;
    
    if (!hasData) {
      // Demo uploads
      const demoUploads = [
        { id: 'upload-1', name: 'Passport Copy', status: 'Pending', uploadedAt: null },
        { id: 'upload-2', name: 'Birth Certificate', status: 'Pending', uploadedAt: null },
        { id: 'upload-3', name: 'Relationship Evidence', status: 'Pending', uploadedAt: null },
      ];
      appDataStore.saveUploads(appId, demoUploads);
      
      // Demo tasks
      const demoTasks = [
        { id: 'task-1', title: 'Complete questionnaire', done: false },
        { id: 'task-2', title: 'Upload required documents', done: false },
        { id: 'task-3', title: 'Review and submit application', done: false },
      ];
      appDataStore.saveTasks(appId, demoTasks);
      
      // Demo deliverables
      const demoDeliverables = [
        { id: 'del-1', item: 'Application Review', description: 'Comprehensive review of your application', status: 'In Progress' },
        { id: 'del-2', item: 'Document Checklist', description: 'Personalized document requirements', status: 'Pending' },
        { id: 'del-3', item: 'Lodgement Support', description: 'Assistance with final submission', status: 'Pending' },
      ];
      appDataStore.saveDeliverables(appId, demoDeliverables);
      
      // Demo messages
      const demoMessages = [
        { id: 'msg-1', from: 'plylegal', subject: 'Welcome', text: 'Welcome to Ply Legal! We are here to help you with your visa application.', date: new Date().toISOString() },
      ];
      appDataStore.saveMessages(appId, demoMessages);
    }
  }
}

// Subscribe to changes and persist to localStorage
if (typeof window !== "undefined") {
  subscribe(appDataStore, () => {
    try {
      // Persist all cached data to localStorage
      Object.keys(appDataStore.cache).forEach(appId => {
        const appData = appDataStore.cache[appId];
        
        if (appData.uploads) {
          localStorage.setItem(
            getStorageKey(appId, 'uploads'),
            JSON.stringify(appData.uploads)
          );
        }
        if (appData.docs) {
          localStorage.setItem(
            getStorageKey(appId, 'docs'),
            JSON.stringify(appData.docs)
          );
        }
        if (appData.tasks) {
          localStorage.setItem(
            getStorageKey(appId, 'tasks'),
            JSON.stringify(appData.tasks)
          );
        }
        if (appData.deliverables) {
          localStorage.setItem(
            getStorageKey(appId, 'deliverables'),
            JSON.stringify(appData.deliverables)
          );
        }
        if (appData.messages) {
          localStorage.setItem(
            getStorageKey(appId, 'messages'),
            JSON.stringify(appData.messages)
          );
        }
      });
    } catch (error) {
      console.error("Error persisting app data:", error);
    }
  });
}
