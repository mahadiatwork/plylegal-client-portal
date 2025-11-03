/**
 * Adapter Factory Tests
 * 
 * Verify that the factory returns the correct adapter based on environment
 */

import { createAdapter, resetAdapter } from '../factory';
import { LocalStorageAdapter } from '../localStorage';

// Mock localStorage
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
global.window = { localStorage: global.localStorage };

describe('Adapter Factory', () => {
  beforeEach(() => {
    // Reset adapter instance before each test
    resetAdapter();
    // Clear environment
    delete process.env.NEXT_PUBLIC_DATABASE_TYPE;
  });
  
  test('creates localStorage adapter by default', () => {
    const adapter = createAdapter();
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);
  });
  
  test('creates localStorage adapter when explicitly set', () => {
    process.env.NEXT_PUBLIC_DATABASE_TYPE = 'localStorage';
    const adapter = createAdapter();
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);
  });
  
  test('falls back to localStorage for invalid type', () => {
    process.env.NEXT_PUBLIC_DATABASE_TYPE = 'invalid';
    
    // Suppress console warnings for this test
    const originalWarn = console.warn;
    console.warn = jest.fn();
    
    const adapter = createAdapter();
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);
    expect(console.warn).toHaveBeenCalled();
    
    console.warn = originalWarn;
  });
  
  test('falls back to localStorage when Firebase fails', () => {
    process.env.NEXT_PUBLIC_DATABASE_TYPE = 'firebase';
    
    // Suppress console errors and warnings
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();
    
    const adapter = createAdapter();
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);
    
    console.error = originalError;
    console.warn = originalWarn;
  });
});
