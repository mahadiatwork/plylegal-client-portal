/**
 * Base Database Adapter Interface
 * 
 * All database adapters (localStorage, Firebase, Postgres) must implement these methods.
 * This allows easy switching between database backends with zero code changes.
 */

export class BaseAdapter {
  /**
   * AUTH METHODS
   */
  
  async login(credentials) {
    throw new Error("Method 'login' must be implemented");
  }
  
  async logout() {
    throw new Error("Method 'logout' must be implemented");
  }
  
  async checkSession() {
    throw new Error("Method 'checkSession' must be implemented");
  }
  
  async getUser() {
    throw new Error("Method 'getUser' must be implemented");
  }
  
  /**
   * DRAFT METHODS
   */
  
  async saveDraft(data) {
    throw new Error("Method 'saveDraft' must be implemented");
  }
  
  async loadDraft() {
    throw new Error("Method 'loadDraft' must be implemented");
  }
  
  async clearDraft() {
    throw new Error("Method 'clearDraft' must be implemented");
  }
  
  async setPrefill(value) {
    throw new Error("Method 'setPrefill' must be implemented");
  }
  
  async getPrefill() {
    throw new Error("Method 'getPrefill' must be implemented");
  }
  
  /**
   * APPLICATIONS METHODS
   */
  
  async loadApplications(userId) {
    throw new Error("Method 'loadApplications' must be implemented");
  }
  
  async getApplication(id) {
    throw new Error("Method 'getApplication' must be implemented");
  }
  
  async createApplication(app) {
    throw new Error("Method 'createApplication' must be implemented");
  }
  
  async updateApplication(id, updates) {
    throw new Error("Method 'updateApplication' must be implemented");
  }
  
  async deleteApplication(id) {
    throw new Error("Method 'deleteApplication' must be implemented");
  }
  
  /**
   * APP DATA METHODS (per-application data like tasks, messages, uploads)
   */
  
  async loadAppData(appId, dataType) {
    throw new Error("Method 'loadAppData' must be implemented");
  }
  
  async saveAppData(appId, dataType, data) {
    throw new Error("Method 'saveAppData' must be implemented");
  }
  
  async clearAppData(appId) {
    throw new Error("Method 'clearAppData' must be implemented");
  }
  
  /**
   * REAL-TIME LISTENERS (optional - for Firebase)
   */
  
  async subscribeToAuth(callback) {
    // Optional: Only Firebase needs this
    // localStorage will just return the current state
    return () => {}; // Return unsubscribe function
  }
  
  async subscribeToDraft(callback) {
    // Optional: Only Firebase needs this
    return () => {}; // Return unsubscribe function
  }
  
  async subscribeToApplications(userId, callback) {
    // Optional: Only Firebase needs this
    return () => {}; // Return unsubscribe function
  }
  
  async subscribeToAppData(appId, dataType, callback) {
    // Optional: Only Firebase needs this
    return () => {}; // Return unsubscribe function
  }
}
