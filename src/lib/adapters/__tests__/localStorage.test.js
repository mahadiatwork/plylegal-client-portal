/**
 * LocalStorage Adapter Tests
 * 
 * Verify that the localStorage adapter works identically to the current implementation
 */

import { LocalStorageAdapter } from '../localStorage';

// Mock localStorage for Node environment
const mockLocalStorage = (() => {
  let store = {};
  
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// Set up global localStorage mock
global.localStorage = mockLocalStorage;
global.window = { localStorage: mockLocalStorage };

describe('LocalStorageAdapter', () => {
  let adapter;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Create new adapter instance
    adapter = new LocalStorageAdapter();
  });
  
  describe('Auth Methods', () => {
    test('login with valid credentials', async () => {
      const result = await adapter.login({
        email: 'user@example.com',
        password: 'password123'
      });
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
    });
    
    test('login with invalid credentials', async () => {
      const result = await adapter.login({
        email: 'wrong@example.com',
        password: 'wrong'
      });
      
      expect(result.success).toBe(false);
    });
    
    test('checkSession returns true after login', async () => {
      await adapter.login({
        email: 'user@example.com',
        password: 'password123'
      });
      
      const isValid = await adapter.checkSession();
      expect(isValid).toBe(true);
    });
    
    test('logout clears session', async () => {
      await adapter.login({
        email: 'user@example.com',
        password: 'password123'
      });
      
      await adapter.logout();
      
      const isValid = await adapter.checkSession();
      expect(isValid).toBe(false);
      
      const user = await adapter.getUser();
      expect(user).toBeNull();
    });
  });
  
  describe('Draft Methods', () => {
    test('saveDraft stores data', async () => {
      const draftData = { firstName: 'John', lastName: 'Doe' };
      const result = await adapter.saveDraft(draftData);
      
      expect(result.success).toBe(true);
      expect(result.draft).toEqual(draftData);
    });
    
    test('loadDraft retrieves stored data', async () => {
      const draftData = { firstName: 'John', lastName: 'Doe' };
      await adapter.saveDraft(draftData);
      
      const loaded = await adapter.loadDraft();
      expect(loaded).toEqual(draftData);
    });
    
    test('saveDraft merges with existing data', async () => {
      await adapter.saveDraft({ firstName: 'John' });
      await adapter.saveDraft({ lastName: 'Doe' });
      
      const loaded = await adapter.loadDraft();
      expect(loaded).toEqual({ firstName: 'John', lastName: 'Doe' });
    });
    
    test('clearDraft removes all data', async () => {
      await adapter.saveDraft({ firstName: 'John' });
      await adapter.clearDraft();
      
      const loaded = await adapter.loadDraft();
      expect(loaded).toEqual({});
    });
    
    test('setPrefill and getPrefill work correctly', async () => {
      await adapter.setPrefill(true);
      let prefill = await adapter.getPrefill();
      expect(prefill).toBe(true);
      
      await adapter.setPrefill(false);
      prefill = await adapter.getPrefill();
      expect(prefill).toBe(false);
    });
  });
  
  describe('Applications Methods', () => {
    test('createApplication adds new application', async () => {
      const app = {
        id: 'app-1',
        userId: 'user-1',
        status: 'Draft',
        type: 'Immigration Intake'
      };
      
      const result = await adapter.createApplication(app);
      expect(result.success).toBe(true);
      expect(result.application.id).toBe('app-1');
    });
    
    test('loadApplications retrieves all applications', async () => {
      await adapter.createApplication({ id: 'app-1', userId: 'user-1' });
      await adapter.createApplication({ id: 'app-2', userId: 'user-1' });
      
      const apps = await adapter.loadApplications();
      expect(apps.length).toBe(2);
    });
    
    test('getApplication retrieves single application', async () => {
      await adapter.createApplication({ id: 'app-1', name: 'Test App' });
      
      const app = await adapter.getApplication('app-1');
      expect(app).toBeDefined();
      expect(app.name).toBe('Test App');
    });
    
    test('updateApplication modifies existing application', async () => {
      await adapter.createApplication({ id: 'app-1', status: 'Draft' });
      await adapter.updateApplication('app-1', { status: 'Submitted' });
      
      const app = await adapter.getApplication('app-1');
      expect(app.status).toBe('Submitted');
    });
    
    test('deleteApplication removes application', async () => {
      await adapter.createApplication({ id: 'app-1' });
      await adapter.deleteApplication('app-1');
      
      const app = await adapter.getApplication('app-1');
      expect(app).toBeNull();
    });
  });
  
  describe('App Data Methods', () => {
    test('saveAppData stores data', async () => {
      const tasks = [
        { id: 'task-1', title: 'Complete form', done: false }
      ];
      
      const result = await adapter.saveAppData('app-1', 'tasks', tasks);
      expect(result.success).toBe(true);
    });
    
    test('loadAppData retrieves stored data', async () => {
      const tasks = [{ id: 'task-1', title: 'Complete form' }];
      await adapter.saveAppData('app-1', 'tasks', tasks);
      
      const loaded = await adapter.loadAppData('app-1', 'tasks');
      expect(loaded).toEqual(tasks);
    });
    
    test('clearAppData removes all app data', async () => {
      await adapter.saveAppData('app-1', 'tasks', [{ id: 'task-1' }]);
      await adapter.saveAppData('app-1', 'messages', [{ id: 'msg-1' }]);
      
      await adapter.clearAppData('app-1');
      
      const tasks = await adapter.loadAppData('app-1', 'tasks');
      const messages = await adapter.loadAppData('app-1', 'messages');
      
      expect(tasks).toEqual([]);
      expect(messages).toEqual([]);
    });
  });
});
